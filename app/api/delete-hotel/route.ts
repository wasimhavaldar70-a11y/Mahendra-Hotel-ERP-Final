import { NextResponse } from 'next/server';
// @ts-ignore
import { PoolClient } from 'pg';
import { pool } from '../../../lib/db';
import { isRequestAllowed } from '../../../lib/rateLimit';
import { getAuthenticatedUser } from '../../../lib/supabase/server';
import { logger } from '../../../lib/logger';
import { validateCsrfOrigin } from '../../../lib/csrf';
import { writeAuditLog } from '../../../lib/auditLog';

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
    const adminUserId = user.id;

    const body = await request.json();
    const { hotel_id } = body;

    if (!hotel_id) {
      return NextResponse.json({ error: 'Missing hotel_id' }, { status: 400 });
    }

    pgClient = await pool.connect();

    // 3. Superadmin-only guard
    if (adminUserId) {
      const roleRes = await pgClient.query('SELECT role FROM public.users WHERE id = $1;', [adminUserId]);
      if (roleRes.rows.length === 0 || roleRes.rows[0].role !== 'superadmin') {
        return NextResponse.json({ error: 'Forbidden: Superadmin only' }, { status: 403 });
      }
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
      userId: adminUserId,
      hotelId: hotel_id,
    });

    // 5. Start transaction
    await pgClient.query('BEGIN;');

    // 6. Delete the user from auth.users (cascades to public.users)
    if (hotelEmail) {
      await pgClient.query('DELETE FROM auth.users WHERE email = $1;', [hotelEmail]);
    }

    // 7. Delete the hotel from public.hotels (cascades to all operational tables)
    await pgClient.query('DELETE FROM public.hotels WHERE id = $1;', [hotel_id]);

    await pgClient.query('COMMIT;');

    logger.info('Application', `Hotel deleted successfully: ${hotel_name} (${hotel_id})`, {
      userId: adminUserId,
      hotelId: hotel_id,
    });

    // 8. Write Audit Log (non-blocking, after commit — hotel_id ref no longer valid in DB)
    void writeAuditLog({
      action: 'hotel.deleted',
      actor_id: adminUserId,
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
    return NextResponse.json({ error: 'Failed to delete hotel. Please try again.' }, { status: 500 });
  } finally {
    if (pgClient) {
      pgClient.release();
    }
  }
}
