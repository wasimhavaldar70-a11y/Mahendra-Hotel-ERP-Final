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
    const adminUserId = user.id;

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
    if (adminUserId) {
      const roleRes = await pgClient.query('SELECT role FROM public.users WHERE id = $1;', [adminUserId]);
      if (roleRes.rows.length === 0 || roleRes.rows[0].role !== 'superadmin') {
        return NextResponse.json({ error: 'Forbidden: Superadmin only' }, { status: 403 });
      }
    }

    // 5. Resolve User ID by email from public.users mapping table
    const lowercaseEmail = email.toLowerCase().trim();
    const userRes = await pgClient.query(
      `SELECT u.id, u.hotel_id, h.hotel_name, h.owner_name
       FROM public.users u
       LEFT JOIN public.hotels h ON u.hotel_id = h.id
       WHERE LOWER(u.email) = LOWER($1);`,
      [lowercaseEmail]
    );
    
    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: 'No user account found for this email' }, { status: 404 });
    }

    const targetUser = userRes.rows[0];
    const targetUserId = targetUser.id;

    // 6. Validate config
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey || serviceRoleKey.includes('[YOUR-')) {
      return NextResponse.json({ error: 'Configuration Error: SUPABASE_SERVICE_ROLE_KEY is not configured.' }, { status: 500 });
    }

    // 7. Securely update password using GoTrue Admin Client (singleton)
    const supabaseAdmin = getSupabaseAdmin();
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
      password: password
    });

    if (authError) {
      logger.error('Application', 'Password reset via GoTrue Admin API failed', authError as unknown as Error, {
        userId: adminUserId,
      });
      return NextResponse.json({ error: 'Failed to update password. Please try again.' }, { status: 500 });
    }

    logger.info('Application', `Password reset successful for ${lowercaseEmail}`, {
      userId: adminUserId,
      hotelId: targetUser.hotel_id,
    });

    // 8. Write Audit Log (non-blocking)
    void writeAuditLog({
      action: 'password.reset',
      actor_id: adminUserId,
      actor_email: user.email,
      hotel_id: targetUser.hotel_id,
      target_type: 'user',
      target_id: targetUserId,
      metadata: { target_email: lowercaseEmail, hotel_name: targetUser.hotel_name },
      ip: clientIp,
    });

    // 9. Send password reset notification email (non-blocking)
    if (targetUser.hotel_name && targetUser.owner_name) {
      void sendPasswordResetEmail({
        to: lowercaseEmail,
        hotelName: targetUser.hotel_name,
        ownerName: targetUser.owner_name,
        newPassword: password,
      });
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    logger.error('Application', 'Reset Password API Error', err);
    return NextResponse.json({ error: 'Failed to reset password. Please try again.' }, { status: 500 });
  } finally {
    if (pgClient) {
      pgClient.release();
    }
  }
}
