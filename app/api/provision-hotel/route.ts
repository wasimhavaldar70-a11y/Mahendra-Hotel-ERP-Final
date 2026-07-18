import { NextResponse } from 'next/server';
// @ts-ignore
import { PoolClient } from 'pg';
import { pool } from '../../../lib/db';
import { isRequestAllowed } from '../../../lib/rateLimit';
import { getAuthenticatedUser } from '../../../lib/supabase/server';
import { logger } from '../../../lib/logger';

export async function POST(request: Request) {
  // Apply rate limiter (10 requests per minute)
  const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
  if (!isRequestAllowed(clientIp, 10, 60000)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  let pgClient: PoolClient | null = null;
  let hotelNameForLog = 'unknown';
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Invalid session or token' }, { status: 401 });
    }
    const adminUserId = user.id;

    const body = await request.json();
    const { hotel_name, owner_name, phone, email, subscription_plan, password } = body;
    hotelNameForLog = hotel_name || 'unknown';

    if (!hotel_name || !owner_name || !email || !phone || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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

    logger.info('Provision', `Initiating transactional customer onboarding for hotel: ${hotel_name}`, {
      metadata: { hotel_name, owner_name, email, phone, subscription_plan }
    });

    let hotel: any = null;

    // A. Create Hotel record first to generate hotel.id (Issue 8) with default CMS and config structures
    await pgClient.query('BEGIN;');

    const defaultCmsData = {
      tagline: 'Experience Absolute Luxury',
      aboutTitle: `About ${hotel_name}`,
      aboutText: 'We provide premier hospitality services and premium rooms configured for business and leisure travellers.',
      aboutOwnerMessage: `Welcome to ${hotel_name}. We ensure clean rooms and high quality guest satisfaction.`,
      addressVal: 'Calangute, Goa, India',
      whatsappVal: phone,
      googleMapsUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3844.2014022416045!2d73.75338167590861!3d15.524584285078712!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bbfc1d560c5c363%3A0xc07cfb19cd7579bb!2sCalangute%20Beach!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin',
      instagram: 'https://instagram.com',
      facebook: 'https://facebook.com',
      twitter: 'https://twitter.com',
      faqs: [
        { question: 'What are the check-in and check-out timings?', answer: 'Our standard check-in time is 2:00 PM and check-out time is 11:00 AM.' },
        { question: 'Do you offer airport transfers?', answer: 'Yes, we provide private airport transfers at a nominal fee. Coordinate with reception.' },
        { question: 'Is breakfast included?', answer: 'A buffet breakfast is complimentary with all stays from 7:30 AM to 10:30 AM.' }
      ],
      gallery: [
        'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80'
      ],
      rooms: {
        'Deluxe Room': {
          price: 2500,
          description: 'A spacious room featuring a queen-size bed, high-speed Wi-Fi, and a beautiful pool view.',
          image: 'https://images.unsplash.com/photo-1611891487122-2075b962442f?auto=format&fit=crop&w=800&q=80',
          images: [
            'https://images.unsplash.com/photo-1611891487122-2075b962442f?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=800&q=80'
          ],
          amenities: ['Free WiFi', 'Air Conditioning', 'Room Service', 'Pool View']
        },
        'Super Deluxe Room': {
          price: 3500,
          description: 'Indulge in extra space and luxury, with a king-size bed, private balcony, and spectacular ocean views.',
          image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
          images: [
            'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=800&q=80'
          ],
          amenities: ['Free WiFi', 'Air Conditioning', 'Minibar', 'Balcony', 'Ocean View']
        }
      },
      invoice_settings: {
        prefix: 'INV-',
        nextNumber: 1001,
        terms: 'Thank you for choosing StayDesk!'
      },
      tax_settings: [
        { name: 'GST 12%', rate: 0.12, active: true },
        { name: 'GST 18%', rate: 0.18, active: true }
      ],
      email_templates: {
        welcome: 'Welcome to StayDesk ERP! Your account has been provisioned successfully.',
        checkout: 'Thank you for your stay. Please find your invoice attached.'
      }
    };
    
    const insertHotelRes = await pgClient.query(`
      INSERT INTO public.hotels (hotel_name, owner_name, email, phone, subscription_plan, subscription_status, cms_data)
      VALUES ($1, $2, $3, $4, $5, 'Active', $6::jsonb)
      RETURNING *;
    `, [hotel_name, owner_name, lowercaseEmail, phone, subscription_plan, JSON.stringify(defaultCmsData)]);
    
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

    // Ensure standard storage buckets exist on the storage backend using admin privileges
    try {
      const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
      if (listError) throw listError;

      if (!buckets?.some((b: any) => b.id === 'customer-documents')) {
        const { error: bucketError } = await supabaseAdmin.storage.createBucket('customer-documents', {
          public: false,
          fileSizeLimit: 5242880 // 5MB
        });
        if (bucketError) throw bucketError;
      }
      if (!buckets?.some((b: any) => b.id === 'hotel-assets')) {
        const { error: bucketError } = await supabaseAdmin.storage.createBucket('hotel-assets', {
          public: true,
          fileSizeLimit: 5242880 // 5MB
        });
        if (bucketError) throw bucketError;
      }
    } catch (err: any) {
      logger.warn('Provision', 'Non-blocking storage bucket initialization check failed: ' + (err.message || err));
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

    // E. Provision Initial Default Rooms inside the transaction
    await pgClient.query(`
      INSERT INTO public.rooms (hotel_id, room_number, room_type, price, floor, capacity, status)
      VALUES 
        ($1, '101', 'Deluxe Room', 2500, 'Ground Floor', 2, 'Ready'),
        ($1, '102', 'Deluxe Room', 2500, 'Ground Floor', 2, 'Ready'),
        ($1, '201', 'Super Deluxe Room', 3500, 'First Floor', 3, 'Ready');
    `, [hotel.id]);

    await pgClient.query('COMMIT;');

    logger.info('Provision', `Successfully onboarded hotel: ${hotel_name} with user: ${lowercaseEmail}`, {
      userId: authData.user.id,
      hotelId: hotel.id,
      role: 'hotel_owner'
    });

    return NextResponse.json({ success: true, hotel });

  } catch (err: any) {
    if (pgClient) {
      try {
        await pgClient.query('ROLLBACK;');
      } catch (rollbackErr) {
        logger.error('Provision', 'Rollback failed during provisioning failure', rollbackErr as Error);
      }
    }
    logger.error('Provision', `Hotel onboarding provisioning failed for: ${hotelNameForLog}`, err);
    return NextResponse.json({ error: err.message || 'Failed to provision hotel account' }, { status: 500 });
  } finally {
    if (pgClient) {
      pgClient.release();
    }
  }
}
