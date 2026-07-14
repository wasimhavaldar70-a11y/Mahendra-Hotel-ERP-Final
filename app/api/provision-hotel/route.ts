import { NextResponse } from 'next/server';
// @ts-ignore
import { Client } from 'pg';

export async function POST(request: Request) {
  let pgClient: Client | null = null;
  try {
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

    // Seed 6 default rooms for the hotel to make it immediately usable for check-ins
    await pgClient.query(`
      INSERT INTO public.rooms (hotel_id, room_number, room_type, price, status, floor, capacity)
      VALUES 
        ($1, '101', 'Deluxe Room', 1800, 'Ready', 'Ground Floor', 2),
        ($1, '102', 'Deluxe Room', 1800, 'Ready', 'Ground Floor', 2),
        ($1, '201', 'Super Deluxe Room', 2800, 'Ready', 'First Floor', 2),
        ($1, '202', 'Super Deluxe Room', 2800, 'Ready', 'First Floor', 3),
        ($1, '301', 'Family Suite', 4500, 'Ready', 'Second Floor', 4),
        ($1, '302', 'Executive Suite', 6000, 'Ready', 'Second Floor', 2);
    `, [hotel.id]);

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
