// ========================================================
// StayDesk / HotelFlow Next.js Request Middleware Guard
// Location: middleware.ts
// ========================================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const isRealSupabase = !!(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseAnonKey.includes('[YOUR-') && 
  !supabaseUrl.includes('[YOUR-')
);

const supabase = isRealSupabase ? createClient(supabaseUrl!, supabaseAnonKey!) : null;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Passthrough for next assets, public files, and authentication API calls
  if (
    pathname.startsWith('/_next') || 
    pathname.startsWith('/static') || 
    pathname.startsWith('/favicon.ico') || 
    pathname.startsWith('/api') || 
    pathname === '/' ||
    pathname === '/admin' ||
    pathname === '/login' ||
    pathname === '/logo.jpg'
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get('hf_session')?.value;
  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  let session: any;
  try {
    session = JSON.parse(decodeURIComponent(sessionCookie));
  } catch (e) {
    // Clear invalid cookie
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('hf_session');
    return response;
  }

  if (isRealSupabase && supabase) {
    const token = session?.access_token;
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('hf_session');
      return response;
    }
  }

  // Role-based routing restrictions
  if (pathname.startsWith('/super-admin') && session?.user?.role !== 'superadmin') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if ((pathname.startsWith('/dashboard') || pathname.startsWith('/rooms') || pathname.startsWith('/bookings') || pathname.startsWith('/check-in') || pathname.startsWith('/check-out') || pathname.startsWith('/customers') || pathname.startsWith('/payments') || pathname.startsWith('/reports') || pathname.startsWith('/settings')) && session?.user?.role === 'superadmin') {
    return NextResponse.redirect(new URL('/super-admin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
