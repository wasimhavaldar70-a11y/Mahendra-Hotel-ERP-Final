import { NextResponse } from 'next/server';
// @ts-ignore
import { PoolClient } from 'pg';
import { pool } from '../../../lib/db';
import { isRequestAllowed } from '../../../lib/rateLimit';
import { getAuthenticatedUser } from '../../../lib/supabase/server';
import { logger } from '../../../lib/logger';
import { validateCsrfOrigin } from '../../../lib/csrf';
import { writeAuditLog } from '../../../lib/auditLog';
import { passwordValidationMessage } from '../../../lib/passwordStrength';
import { sendPasswordResetEmail } from '../../../lib/email';
import { createClient } from '@supabase/supabase-js';
import { isSuperAdminUser } from '../../../lib/authGuard';

// Singleton Supabase Admin Client
let _supabaseAdmin: ReturnType<typeof createClient> | null = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabaseAdmin;
}

export async function POST(request: Request) {
  // 1. CSRF Origin validation
  if (!validateCsrfOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden: Invalid request origin' }, { status: 403 });
  }

  // 2. Rate limiter — strict: 10 requests per minute for password reset
  const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
  if (!await isRequestAllowed(clientIp, 10, 60000)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  let pgClient: PoolClient | null = null;
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Invalid session or token' }, { status: 401 });
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    }

    // 3. Password strength validation (8+ chars, uppercase + number)
    const pwdError = passwordValidationMessage(password);
    if (pwdError) {
      return NextResponse.json({ error: pwdError }, { status: 400 });
    }

    pgClient = await pool.connect();

    // 4. Superadmin-only guard
    const isSuperAdmin = await isSuperAdminUser(user, pgClient);
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden: Superadmin only' }, { status: 403 });
    }

    // 5. Resolve User ID by email from public.users or auth.users
    const lowercaseEmail = email.toLowerCase().trim();
    let targetUserId: string | null = null;
    let targetHotelId: string | null = null;
    let targetHotelName: string | null = null;
    let targetOwnerName: string | null = null;

    const userRes = await pgClient.query(
      `SELECT u.id, u.hotel_id, h.hotel_name, h.owner_name
       FROM public.users u
       LEFT JOIN public.hotels h ON u.hotel_id = h.id
       WHERE LOWER(u.email) = LOWER($1);`,
      [lowercaseEmail]
    );
    
    if (userRes.rows.length > 0) {
      const targetUser = userRes.rows[0];
      targetUserId = targetUser.id;
      targetHotelId = targetUser.hotel_id;
      targetHotelName = targetUser.hotel_name;
      targetOwnerName = targetUser.owner_name;
    } else {
      // Fallback: check auth.users and public.hotels directly
      const authRes = await pgClient.query('SELECT id FROM auth.users WHERE LOWER(email) = LOWER($1);', [lowercaseEmail]);
      const hotelRes = await pgClient.query('SELECT id, hotel_name, owner_name FROM public.hotels WHERE LOWER(email) = LOWER($1);', [lowercaseEmail]);

      if (authRes.rows.length > 0) {
        targetUserId = authRes.rows[0].id;
        if (hotelRes.rows.length > 0) {
          targetHotelId = hotelRes.rows[0].id;
          targetHotelName = hotelRes.rows[0].hotel_name;
          targetOwnerName = hotelRes.rows[0].owner_name;
        }
      }
    }

    if (!targetUserId) {
      return NextResponse.json({ error: 'No user account found for this email' }, { status: 404 });
    }

    // 6. Securely update password using GoTrue Admin Client or direct PostgreSQL fallback
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const hasServiceKey = serviceRoleKey && !serviceRoleKey.includes('[YOUR-');

    if (hasServiceKey) {
      const supabaseAdmin = getSupabaseAdmin();
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        password: password
      });

      if (authError) {
        logger.error('Application', 'Password reset via GoTrue Admin API failed', authError as unknown as Error, {
          userId: user.id,
        });
        return NextResponse.json({ error: authError.message || 'Failed to update password. Please try again.' }, { status: 500 });
      }
    }

    // Direct Postgres fallback / update sync
    await pgClient.query(
      `UPDATE auth.users SET encrypted_password = crypt($1, gen_salt('bf')), updated_at = NOW() WHERE id = $2::uuid;`,
      [password, targetUserId]
    );

    logger.info('Application', `Password reset successful for ${lowercaseEmail}`, {
      userId: user.id,
      hotelId: targetHotelId || undefined,
    });

    // 8. Write Audit Log (non-blocking)
    void writeAuditLog({
      action: 'password.reset',
      actor_id: user.id,
      actor_email: user.email,
      hotel_id: targetHotelId || undefined,
      target_type: 'user',
      target_id: targetUserId,
      metadata: { target_email: lowercaseEmail, hotel_name: targetHotelName },
      ip: clientIp,
    });

    // 9. Send password reset notification email (non-blocking)
    if (targetHotelName && targetOwnerName) {
      void sendPasswordResetEmail({
        to: lowercaseEmail,
        hotelName: targetHotelName,
        ownerName: targetOwnerName,
        newPassword: password,
      });
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    logger.error('Application', 'Reset Password API Error', err);
    return NextResponse.json({ error: err.message || 'Failed to reset password. Please try again.' }, { status: 500 });
  } finally {
    if (pgClient) {
      pgClient.release();
    }
  }
}
