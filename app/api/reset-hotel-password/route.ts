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
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
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

    // Ensure pgcrypto is available for crypt
    await pgClient.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');

    // Update password in auth.users
    const result = await pgClient.query(
      `UPDATE auth.users 
       SET encrypted_password = crypt($1::text, gen_salt('bf', 10)),
           updated_at = now()
       WHERE email = $2::text;`,
      [password, email.toLowerCase().trim()]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'No user account found for this email' }, { status: 404 });
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('Reset Password API Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to reset password' }, { status: 500 });
  } finally {
    if (pgClient) {
      pgClient.release();
    }
  }
}
