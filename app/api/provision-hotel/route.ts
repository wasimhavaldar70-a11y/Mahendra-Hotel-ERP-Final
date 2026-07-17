import { NextResponse } from 'next/server';
// @ts-ignore
import { Pool, PoolClient } from 'pg';
import { cookies } from 'next/headers';
import { isRequestAllowed } from '../../../lib/rateLimit';

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

    if (!dbUrl) {
      return NextResponse.json({ error: 'Database URL not configured' }, { status: 500 });
    }

    pgClient = await pool.connect();

    if (isRealSupabase && adminUserId) {
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
    const hasServiceKey = !!(serviceRoleKey && !serviceRoleKey.includes('[YOUR-'));

    let hotel: any = null;

    if (hasServiceKey) {
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
    } else {
      // Fallback: Reordered direct SQL provisioning (Hotel first, then User)
      await pgClient.query('BEGIN;');

      // 1. Insert Hotel
      const insertHotelRes = await pgClient.query(`
        INSERT INTO public.hotels (hotel_name, owner_name, email, phone, subscription_plan, subscription_status)
        VALUES ($1, $2, $3, $4, $5, 'Active')
        RETURNING *;
      `, [hotel_name, owner_name, lowercaseEmail, phone, subscription_plan]);
      
      hotel = insertHotelRes.rows[0];

      // Generate User UUID
      const uuidRes = await pgClient.query("SELECT gen_random_uuid() as id;");
      const userId = uuidRes.rows[0].id;

      // Ensure pgcrypto
      await pgClient.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');

      // 2. Insert auth.users with correct app_metadata containing hotel_id
      const appMetadataJson = JSON.stringify({
        provider: 'email',
        providers: ['email'],
        role: 'hotel_owner',
        hotel_id: hotel.id
      });

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
          $4::jsonb,
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
      `, [userId, lowercaseEmail, password, appMetadataJson]);

      // 3. Create auth.identities
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

      // 4. Link user to the hotel in public.users
      await pgClient.query(`
        INSERT INTO public.users (id, email, role, hotel_id)
        VALUES ($1, $2, 'hotel_owner', $3)
        ON CONFLICT (id) DO UPDATE 
        SET role = 'hotel_owner', hotel_id = $3;
      `, [userId, lowercaseEmail, hotel.id]);

      // 5. Explicitly update auth.users metadata to ensure JWT claims are populated (Issue 7/8)
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
      `, [hotel.id, userId]);

      await pgClient.query('COMMIT;');
    }

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
