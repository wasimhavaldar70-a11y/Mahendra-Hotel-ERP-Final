import { NextResponse } from 'next/server';
// @ts-ignore
import { Client } from 'pg';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  let pgClient: Client | null = null;
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const isRealSupabase = !!(
      supabaseUrl && 
      supabaseAnonKey && 
      !supabaseAnonKey.includes('[YOUR-') && 
      !supabaseUrl.includes('[YOUR-')
    );

    let adminUserId: string | null = null;

    if (isRealSupabase) {
      const authHeader = request.headers.get('Authorization');
      const token = authHeader?.split(' ')[1];

      if (!token) {
        return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
      }

      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

      const { data: { user }, error: userError } = await supabase.auth.getUser(token);

      if (userError || !user) {
        return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
      }
      adminUserId = user.id;
    } else {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get('hf_session')?.value;
      if (!sessionCookie) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      let session: any;
      try {
        session = JSON.parse(decodeURIComponent(sessionCookie));
      } catch (e) {
        return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
      }

      if (session?.user?.role !== 'superadmin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const body = await request.json();
    const { hotel_name, owner_name, phone, email, subscription_plan, password } = body;

    if (!hotel_name || !owner_name || !email || !phone || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

    if (!dbUrl) {
      return NextResponse.json({ error: 'Database URL not configured' }, { status: 500 });
    }

    pgClient = new Client({
      connectionString: dbUrl,
      ssl: {
        rejectUnauthorized: false
      }
    });

    await pgClient.connect();

    if (isRealSupabase && adminUserId) {
      const roleRes = await pgClient.query('SELECT role FROM public.users WHERE id = $1;', [adminUserId]);
      if (roleRes.rows.length === 0 || roleRes.rows[0].role !== 'superadmin') {
        return NextResponse.json({ error: 'Forbidden: Superadmin only' }, { status: 403 });
      }
    }

    // Start database transaction
    await pgClient.query('BEGIN;');

    const lowercaseEmail = email.toLowerCase().trim();

    // A. Clean up any existing records for this email first to prevent duplicates/errors
    await pgClient.query("DELETE FROM public.users WHERE email = $1;", [lowercaseEmail]);
    await pgClient.query("DELETE FROM auth.identities WHERE email = $1;", [lowercaseEmail]);
    await pgClient.query("DELETE FROM auth.users WHERE email = $1;", [lowercaseEmail]);

    // Ensure pgcrypto extension is installed
    await pgClient.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');

    // Generate User UUID in advance so we can use it across both tables
    const uuidRes = await pgClient.query("SELECT gen_random_uuid() as id;");
    const userId = uuidRes.rows[0].id;

    // B. Register the user via direct SQL (Bypassing Supabase Auth API Email Rate Limits)
    // Using gen_salt('bf', 10) to generate the exact $2a$10$ bcrypt format required by GoTrue.
    // Explicitly setting token/change columns to '' instead of NULL to prevent GoTrue Golang scan errors.
    await pgClient.query(`
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, 
        encrypted_password, email_confirmed_at, 
        raw_app_meta_data, raw_user_meta_data, 
        created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change,
        phone_change, phone_change_token, email_change_token_current, reauthentication_token
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        $1::uuid,
        'authenticated',
        'authenticated',
        $2::text,
        crypt($3::text, gen_salt('bf', 10)),
        now(),
        '{"provider":"email","providers":["email"]}',
        json_build_object(
          'sub', $1::text,
          'email', $2::text,
          'email_verified', false,
          'phone_verified', false
        ),
        now(),
        now(),
        '', '', '', '',
        '', '', '', ''
      );
    `, [userId, lowercaseEmail, password]);

    // C. Create a corresponding row in auth.identities to link the user's login identity
    await pgClient.query(`
      INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        $1::uuid,
        $1::text,
        json_build_object(
          'sub', $1::text,
          'email', $2::text,
          'email_verified', false,
          'phone_verified', false
        ),
        'email',
        now(),
        now(),
        now()
      );
    `, [userId, lowercaseEmail]);

    // D. Create the Hotel
    const insertHotelRes = await pgClient.query(`
      INSERT INTO public.hotels (hotel_name, owner_name, email, phone, subscription_plan, subscription_status)
      VALUES ($1, $2, $3, $4, $5, 'Active')
      RETURNING *;
    `, [hotel_name, owner_name, lowercaseEmail, phone, subscription_plan]);
    
    const hotel = insertHotelRes.rows[0];

    // E. Link user to the hotel in public.users as hotel_owner
    await pgClient.query(`
      INSERT INTO public.users (id, email, role, hotel_id)
      VALUES ($1, $2, 'hotel_owner', $3)
      ON CONFLICT (id) DO UPDATE 
      SET role = 'hotel_owner', hotel_id = $3;
    `, [userId, lowercaseEmail, hotel.id]);

    // Commit Transaction
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
      await pgClient.end();
    }
  }
}
