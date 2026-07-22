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

  // 2. Rate limiter (20 requests per minute)
  const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
  if (!await isRequestAllowed(clientIp, 20, 60000)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  let pgClient: PoolClient | null = null;
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Invalid session or token' }, { status: 401 });
    }

    const body = await request.json();
    const { hotel_id, status } = body;

    if (!hotel_id || !status || !['Active', 'Expired', 'Suspended'].includes(status)) {
      return NextResponse.json({ error: 'Invalid parameters. Status must be Active, Expired, or Suspended.' }, { status: 400 });
    }

    pgClient = await pool.connect();

    // 3. Superadmin-only guard
    const isSuperAdmin = await isSuperAdminUser(user, pgClient);
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden: Superadmin only' }, { status: 403 });
    }

    // 4. Update hotel status in PostgreSQL
    const updateRes = await pgClient.query(
      `UPDATE public.hotels SET subscription_status = $1 WHERE id = $2 RETURNING *;`,
      [status, hotel_id]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
    }

    const updatedHotel = updateRes.rows[0];

    logger.info('Application', `Hotel status updated to ${status} for hotel: ${updatedHotel.hotel_name} (${hotel_id})`, {
      userId: user.id,
      hotelId: hotel_id,
    });

    // 5. Write Audit Log (non-blocking)
    void writeAuditLog({
      action: status === 'Suspended' ? 'hotel.suspended' : 'hotel.activated',
      actor_id: user.id,
      actor_email: user.email,
      hotel_id: hotel_id,
      target_type: 'hotel',
      target_id: hotel_id,
      metadata: { hotel_name: updatedHotel.hotel_name, new_status: status },
      ip: clientIp,
    });

    return NextResponse.json({ success: true, hotel: updatedHotel });

  } catch (err: any) {
    logger.error('Application', 'Update Hotel Status API Error', err);
    return NextResponse.json({ error: err.message || 'Failed to update hotel status. Please try again.' }, { status: 500 });
  } finally {
    if (pgClient) {
      pgClient.release();
    }
  }
}
