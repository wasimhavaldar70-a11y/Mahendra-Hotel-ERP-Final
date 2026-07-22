import { NextResponse } from 'next/server';
// @ts-ignore
import { PoolClient } from 'pg';
import { pool } from '../../../lib/db';
import { isRequestAllowed } from '../../../lib/rateLimit';
import { getAuthenticatedUser } from '../../../lib/supabase/server';
import { logger } from '../../../lib/logger';
import { validateCsrfOrigin } from '../../../lib/csrf';
import { writeAuditLog } from '../../../lib/auditLog';
import { isSuperAdminUser } from '../../../lib/authGuard';

export async function POST(request: Request) {
  // 1. CSRF Origin validation
  if (!validateCsrfOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden: Invalid request origin' }, { status: 403 });
  }

  // 2. Rate limiter (5 requests per minute)
  const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
  if (!await isRequestAllowed(clientIp, 5, 60000)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  let pgClient: PoolClient | null = null;
  let deletedHotelName = 'unknown';
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Invalid session or token' }, { status: 401 });
    }

    const body = await request.json();
    const { hotel_id } = body;

    if (!hotel_id) {
      return NextResponse.json({ error: 'Missing hotel_id' }, { status: 400 });
    }

    pgClient = await pool.connect();

    // 3. Superadmin-only guard
    const isSuperAdmin = await isSuperAdminUser(user, pgClient);
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden: Superadmin only' }, { status: 403 });
    }

    // 4. Fetch hotel info for audit log before deletion
    const hotelRes = await pgClient.query(
      'SELECT email, hotel_name FROM public.hotels WHERE id = $1;',
      [hotel_id]
    );
    
    if (hotelRes.rows.length === 0) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
    }

    const { email: hotelEmail, hotel_name } = hotelRes.rows[0];
    deletedHotelName = hotel_name;

    logger.info('Application', `Initiating deletion of hotel: ${hotel_name} (${hotel_id})`, {
      userId: user.id,
      hotelId: hotel_id,
    });

    // 5. Start transaction
    await pgClient.query('BEGIN;');

    // 6. Delete all auth.users associated with this hotel (by hotel_id claim or matching email)
    if (hotelEmail) {
      await pgClient.query(`
        DELETE FROM auth.users 
        WHERE id IN (
          SELECT id FROM public.users WHERE hotel_id = $1
        ) OR LOWER(email) = LOWER($2);
      `, [hotel_id, hotelEmail]);

      await pgClient.query('DELETE FROM public.users WHERE hotel_id = $1 OR LOWER(email) = LOWER($2);', [hotel_id, hotelEmail]);
    } else {
      await pgClient.query('DELETE FROM auth.users WHERE id IN (SELECT id FROM public.users WHERE hotel_id = $1);', [hotel_id]);
      await pgClient.query('DELETE FROM public.users WHERE hotel_id = $1;', [hotel_id]);
    }

    // 7. Delete the hotel from public.hotels (cascades to all operational tables)
    await pgClient.query('DELETE FROM public.hotels WHERE id = $1;', [hotel_id]);

    await pgClient.query('COMMIT;');

    logger.info('Application', `Hotel deleted successfully: ${hotel_name} (${hotel_id})`, {
      userId: user.id,
      hotelId: hotel_id,
    });

    // 8. Write Audit Log (non-blocking, after commit — hotel_id ref no longer valid in DB)
    void writeAuditLog({
      action: 'hotel.deleted',
      actor_id: user.id,
      actor_email: user.email,
      hotel_id: undefined, // hotel is deleted — don't reference it
      target_type: 'hotel',
      target_id: hotel_id,
      metadata: { hotel_name, hotel_email: hotelEmail },
      ip: clientIp,
    });

    return NextResponse.json({ success: true });

  } catch (err: any) {
    if (pgClient) {
      try {
        await pgClient.query('ROLLBACK;');
      } catch (rollbackErr) {
        logger.error('Application', 'Rollback failed during hotel deletion', rollbackErr as Error);
      }
    }
    logger.error('Application', `Delete Hotel API Error for hotel: ${deletedHotelName}`, err);
    return NextResponse.json({ error: err.message || 'Failed to delete hotel. Please try again.' }, { status: 500 });
  } finally {
    if (pgClient) {
      pgClient.release();
    }
  }
}
