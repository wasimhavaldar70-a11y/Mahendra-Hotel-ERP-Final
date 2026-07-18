import { NextResponse } from 'next/server';
// @ts-ignore
import { PoolClient } from 'pg';
import { pool } from '../../../lib/db';
import { isRequestAllowed } from '../../../lib/rateLimit';
import { getAuthenticatedUser } from '../../../lib/supabase/server';

export async function POST(request: Request) {
  // Apply rate limiter (5 requests per minute)
  const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
  if (!await isRequestAllowed(clientIp, 5, 60000)) {
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
    const { hotel_id } = body;

    if (!hotel_id) {
      return NextResponse.json({ error: 'Missing hotel_id' }, { status: 400 });
    }

    pgClient = await pool.connect();

    if (adminUserId) {
      const roleRes = await pgClient.query('SELECT role FROM public.users WHERE id = $1;', [adminUserId]);
      if (roleRes.rows.length === 0 || roleRes.rows[0].role !== 'superadmin') {
        return NextResponse.json({ error: 'Forbidden: Superadmin only' }, { status: 403 });
      }
    }

    // Start transaction
    await pgClient.query('BEGIN;');

    // 1. Get the email of the hotel owner to clean up auth.users
    const hotelRes = await pgClient.query('SELECT email FROM public.hotels WHERE id = $1;', [hotel_id]);
    
    if (hotelRes.rows.length > 0) {
      const email = hotelRes.rows[0].email;
      
      // 2. Delete the user from auth.users (cascades to public.users)
      await pgClient.query('DELETE FROM auth.users WHERE email = $1;', [email]);
    }

    // 3. Delete the hotel from public.hotels (cascades to all operational tables)
    await pgClient.query('DELETE FROM public.hotels WHERE id = $1;', [hotel_id]);

    // Commit Transaction
    await pgClient.query('COMMIT;');

    return NextResponse.json({ success: true });

  } catch (err: any) {
    if (pgClient) {
      try {
        await pgClient.query('ROLLBACK;');
      } catch (rollbackErr) {
        console.error('Rollback failed:', rollbackErr);
      }
    }
    console.error('Delete Hotel API Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete hotel' }, { status: 500 });
  } finally {
    if (pgClient) {
      pgClient.release();
    }
  }
}
