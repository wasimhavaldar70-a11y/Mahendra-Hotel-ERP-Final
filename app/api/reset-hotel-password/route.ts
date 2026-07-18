import { NextResponse } from 'next/server';
// @ts-ignore
import { PoolClient } from 'pg';
import { pool } from '../../../lib/db';
import { isRequestAllowed } from '../../../lib/rateLimit';
import { getAuthenticatedUser } from '../../../lib/supabase/server';

export async function POST(request: Request) {
  // Apply rate limiter (10 requests per minute)
  const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
  if (!await isRequestAllowed(clientIp, 10, 60000)) {
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
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    pgClient = await pool.connect();

    if (adminUserId) {
      const roleRes = await pgClient.query('SELECT role FROM public.users WHERE id = $1;', [adminUserId]);
      if (roleRes.rows.length === 0 || roleRes.rows[0].role !== 'superadmin') {
        return NextResponse.json({ error: 'Forbidden: Superadmin only' }, { status: 403 });
      }
    }

    // Resolve User ID by email from public.users mapping table
    const lowercaseEmail = email.toLowerCase().trim();
    const userRes = await pgClient.query('SELECT id FROM public.users WHERE LOWER(email) = LOWER($1);', [lowercaseEmail]);
    
    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: 'No user account found for this email' }, { status: 404 });
    }
    const targetUserId = userRes.rows[0].id;

    // Securely update password using GoTrue Admin Client
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey || serviceRoleKey.includes('[YOUR-')) {
      return NextResponse.json({ error: 'Configuration Error: SUPABASE_SERVICE_ROLE_KEY is not configured on the server.' }, { status: 500 });
    }

    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAdmin = createClient(supabaseUrl!, serviceRoleKey!);

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
      password: password
    });

    if (authError) {
      return NextResponse.json({ error: authError.message || 'Failed to update user account password via GoTrue Admin API' }, { status: 500 });
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
