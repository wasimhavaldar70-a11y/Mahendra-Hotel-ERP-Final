import { NextResponse } from 'next/server';
// @ts-ignore
import { Pool, PoolClient } from 'pg';
import { isRequestAllowed } from '../../../lib/rateLimit';
import { getAuthenticatedUser } from '../../../lib/supabase/server';

const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
const pool = new Pool({
  connectionString: dbUrl,
  ssl: {
    rejectUnauthorized: false
  }
});

export async function POST(request: Request) {
  // Apply rate limiter (10 requests per minute)
  const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
  if (!isRequestAllowed(clientIp, 10, 60000)) {
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
    const { hotel_name, owner_name, phone, email, subscription_plan, password } = body;

    if (!hotel_name || !owner_name || !email || !phone || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!dbUrl) {
      return NextResponse.json({ error: 'Database URL not configured' }, { status: 500 });
    }

    pgClient = await pool.connect();

    if (adminUserId) {
      const roleRes = await pgClient.query('SELECT role FROM public.users WHERE id = $1;', [adminUserId]);
      if (roleRes.rows.length === 0 || roleRes.rows[0].role !== 'superadmin') {
        return NextResponse.json({ error: 'Forbidden: Superadmin only' }, { status: 403 });
      }
    }

    const lowercaseEmail = email.toLowerCase().trim();

    // 1. Email validation step (prevent silent deletes of other hotel users - Issue 11)
    const emailCheck = await pgClient.query('SELECT id FROM public.users WHERE LOWER(email) = LOWER($1);', [lowercaseEmail]);
    if (emailCheck.rows.length > 0) {
      return NextResponse.json({ error: 'Email address is already in use' }, { status: 400 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey || serviceRoleKey.includes('[YOUR-')) {
      return NextResponse.json({ error: 'Configuration Error: SUPABASE_SERVICE_ROLE_KEY is not configured on the server.' }, { status: 500 });
    }

    let hotel: any = null;

    // A. Create Hotel record first to generate hotel.id (Issue 8)
    await pgClient.query('BEGIN;');
    
    const insertHotelRes = await pgClient.query(`
      INSERT INTO public.hotels (hotel_name, owner_name, email, phone, subscription_plan, subscription_status)
      VALUES ($1, $2, $3, $4, $5, 'Active')
      RETURNING *;
    `, [hotel_name, owner_name, lowercaseEmail, phone, subscription_plan]);
    
    hotel = insertHotelRes.rows[0];

    // B. Provision account via official Supabase admin client (Issue 7)
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAdmin = createClient(supabaseUrl!, serviceRoleKey!);

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: lowercaseEmail,
      password: password,
      email_confirm: true,
      app_metadata: {
        role: 'hotel_owner',
        hotel_id: hotel.id
      }
    });

    if (authError || !authData.user) {
      throw new Error(authError?.message || 'Failed to create user account via Supabase Admin API');
    }

    // C. Ensure matching role and reference mapping in public schemas
    await pgClient.query(`
      INSERT INTO public.users (id, email, role, hotel_id)
      VALUES ($1, $2, 'hotel_owner', $3)
      ON CONFLICT (id) DO UPDATE 
      SET role = 'hotel_owner', hotel_id = $3;
    `, [authData.user.id, lowercaseEmail, hotel.id]);

    // D. Explicitly update auth.users metadata to ensure JWT claims are populated (Issue 7/8)
    await pgClient.query(`
      UPDATE auth.users 
      SET raw_app_meta_data = jsonb_set(
        jsonb_set(
          coalesce(raw_app_meta_data, '{}'::jsonb),
          '{hotel_id}',
          to_jsonb($1::uuid)
        ),
        '{role}',
        '"hotel_owner"'::jsonb
      )
      WHERE id = $2::uuid;
    `, [hotel.id, authData.user.id]);

    await pgClient.query('COMMIT;');

    return NextResponse.json({ success: true, hotel });

  } catch (err: any) {
    if (pgClient) {
      try {
        await pgClient.query('ROLLBACK;');
      } catch (rollbackErr) {
        console.error('Rollback failed:', rollbackErr);
      }
    }
    console.error('Provisioning API Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to provision hotel account' }, { status: 500 });
  } finally {
    if (pgClient) {
      pgClient.release();
    }
  }
}
