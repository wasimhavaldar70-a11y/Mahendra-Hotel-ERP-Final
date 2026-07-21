import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../lib/supabase/server';
import { pool } from '../../../lib/db';
import { isRequestAllowed } from '../../../lib/rateLimit';
import { writeAuditLog } from '../../../lib/auditLog';
import { logger } from '../../../lib/logger';

// ========================================================
// GDPR / Data Export API
// GET /api/export-guest-data
// Returns a downloadable JSON file with all guest data for the hotel.
// Auth-gated: hotel_owner or superadmin only.
// Rate-limited: 1 request per 5 minutes per IP.
// ========================================================

export async function GET(request: Request) {
  const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';

  // Strict rate limit: 1 export per 5 minutes per IP
  if (!await isRequestAllowed(clientIp, 3, 5 * 60 * 1000)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. You can export data at most once every 5 minutes.' },
      { status: 429 }
    );
  }

  let pgClient = null;
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract hotel_id from JWT app_metadata
    const hotelId = user.app_metadata?.hotel_id;
    const role = user.app_metadata?.role;

    // Only hotel_owner and superadmin can export
    if (!['hotel_owner', 'superadmin'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    // hotel_owner must export their own hotel only
    if (role === 'hotel_owner' && !hotelId) {
      return NextResponse.json({ error: 'No hotel associated with this account' }, { status: 400 });
    }

    // superadmin can pass ?hotel_id= query param
    let targetHotelId = hotelId;
    if (role === 'superadmin') {
      const url = new URL(request.url);
      const queryHotelId = url.searchParams.get('hotel_id');
      if (!queryHotelId) {
        return NextResponse.json({ error: 'Superadmin must provide ?hotel_id= query param' }, { status: 400 });
      }
      targetHotelId = queryHotelId;
    }

    pgClient = await pool.connect();

    // Fetch hotel info
    const hotelRes = await pgClient.query(
      'SELECT id, hotel_name, owner_name, email, phone, subscription_plan, created_at FROM public.hotels WHERE id = $1',
      [targetHotelId]
    );

    if (hotelRes.rows.length === 0) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
    }

    const hotel = hotelRes.rows[0];

    // Fetch all customers for this hotel
    const customersRes = await pgClient.query(
      `SELECT 
         c.id, c.full_name, c.phone, c.gender, c.address, c.city, c.state, c.country, 
         c.email, c.nationality, c.vehicle_number, c.emergency_contact, c.created_at,
         (SELECT COUNT(*) FROM public.check_ins ci WHERE ci.primary_customer_id = c.id) as stay_count
       FROM public.customers c
       WHERE c.hotel_id = $1
       ORDER BY c.created_at DESC`,
      [targetHotelId]
    );

    // Fetch customer documents metadata (no raw image blobs — only type and number for privacy)
    const documentsRes = await pgClient.query(
      `SELECT cd.customer_id, cd.document_type, cd.document_number, cd.created_at
       FROM public.customer_documents cd
       JOIN public.customers c ON cd.customer_id = c.id
       WHERE c.hotel_id = $1`,
      [targetHotelId]
    );

    // Fetch check-in history
    const checkInsRes = await pgClient.query(
      `SELECT 
         ci.id, ci.room_id, ci.primary_customer_id, ci.number_of_guests,
         ci.check_in, ci.expected_checkout, ci.status,
         ci.purpose_of_stay, ci.arrival_from, ci.proceeding_to,
         ci.total_nights, ci.grand_total, ci.created_at,
         r.room_number, r.room_type
       FROM public.check_ins ci
       LEFT JOIN public.rooms r ON ci.room_id = r.id
       WHERE ci.hotel_id = $1
       ORDER BY ci.created_at DESC`,
      [targetHotelId]
    );

    // Fetch payments
    const paymentsRes = await pgClient.query(
      `SELECT p.id, p.checkin_id, p.room_price, p.advance, p.pending,
              p.payment_method, p.final_payment_method, p.created_at
       FROM public.payments p
       JOIN public.check_ins ci ON p.checkin_id = ci.id
       WHERE ci.hotel_id = $1
       ORDER BY p.created_at DESC`,
      [targetHotelId]
    );

    const exportPayload = {
      export_metadata: {
        exported_at: new Date().toISOString(),
        exported_by: user.email,
        hotel_id: targetHotelId,
        format_version: '1.0',
        note: 'This export contains personally identifiable information (PII). Handle in compliance with applicable data protection laws (IT Act 2000, GDPR where applicable).'
      },
      hotel,
      statistics: {
        total_customers: customersRes.rows.length,
        total_check_ins: checkInsRes.rows.length,
        total_payments: paymentsRes.rows.length,
      },
      customers: customersRes.rows,
      customer_documents: documentsRes.rows.map((d: any) => ({
        ...d,
        // Mask last digits for export — full number retained for hotel compliance
        document_number: d.document_number
          ? d.document_number.replace(/.(?=.{4})/g, 'X')
          : null
      })),
      check_ins: checkInsRes.rows,
      payments: paymentsRes.rows,
    };

    // Write audit log for the export
    void writeAuditLog({
      action: 'guest.exported',
      actor_id: user.id,
      actor_email: user.email,
      hotel_id: targetHotelId,
      target_type: 'hotel',
      target_id: targetHotelId,
      metadata: {
        customer_count: customersRes.rows.length,
        checkin_count: checkInsRes.rows.length,
      },
      ip: clientIp,
    });

    logger.info('Application', `Guest data exported for hotel: ${hotel.hotel_name}`, {
      userId: user.id,
      hotelId: targetHotelId,
    });

    const filename = `staydesk-export-${hotel.hotel_name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;

    return new NextResponse(JSON.stringify(exportPayload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache',
      },
    });

  } catch (err: any) {
    logger.error('Application', 'Guest data export failed', err);
    return NextResponse.json({ error: 'Export failed. Please try again.' }, { status: 500 });
  } finally {
    if (pgClient) pgClient.release();
  }
}
