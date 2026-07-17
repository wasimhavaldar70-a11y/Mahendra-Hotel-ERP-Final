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
  // Apply rate limiter (5 requests per minute)
  const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
  if (!isRequestAllowed(clientIp, 5, 60000)) {
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
    const { hotel_id } = body;

    if (!hotel_id) {
      return NextResponse.json({ error: 'Missing hotel_id' }, { status: 400 });
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
