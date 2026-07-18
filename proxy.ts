// ========================================================
// StayDesk / HotelFlow Next.js Request Proxy (Middleware)
// Location: proxy.ts
// ========================================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from './lib/supabase/middleware';

export async function proxy(request: NextRequest) {
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

  // Refresh session cookies and retrieve the updated session and user
  const { response, user } = await updateSession(request);

  if (!user) {
    // If no user is logged in, redirect to login page
    const loginRedirect = NextResponse.redirect(new URL('/login', request.url));
    // Propagate cookie clears if any occurred during updateSession
    response.cookies.getAll().forEach(cookie => {
      loginRedirect.cookies.set(cookie.name, cookie.value, {
        path: cookie.path,
        domain: cookie.domain,
        maxAge: cookie.maxAge,
        secure: cookie.secure,
        sameSite: cookie.sameSite,
        httpOnly: cookie.httpOnly,
        expires: cookie.expires
      });
    });
    return loginRedirect;
  }

  const role = user.app_metadata?.role || 'hotel_owner';

  // Role-based routing restrictions
  if (pathname.startsWith('/super-admin') && role !== 'superadmin') {
    const dashboardRedirect = NextResponse.redirect(new URL('/dashboard', request.url));
    // Sync refreshed cookies to the redirect response
    response.cookies.getAll().forEach(cookie => {
      dashboardRedirect.cookies.set(cookie.name, cookie.value, {
        path: cookie.path,
        domain: cookie.domain,
        maxAge: cookie.maxAge,
        secure: cookie.secure,
        sameSite: cookie.sameSite,
        httpOnly: cookie.httpOnly,
        expires: cookie.expires
      });
    });
    return dashboardRedirect;
  }

  if (
    (pathname.startsWith('/dashboard') || 
     pathname.startsWith('/rooms') || 
     pathname.startsWith('/bookings') || 
     pathname.startsWith('/check-in') || 
     pathname.startsWith('/check-out') || 
     pathname.startsWith('/customers') || 
     pathname.startsWith('/payments') || 
     pathname.startsWith('/reports') || 
     pathname.startsWith('/settings')) && 
    role === 'superadmin'
  ) {
    const superadminRedirect = NextResponse.redirect(new URL('/super-admin', request.url));
    // Sync refreshed cookies to the redirect response
    response.cookies.getAll().forEach(cookie => {
      superadminRedirect.cookies.set(cookie.name, cookie.value, {
        path: cookie.path,
        domain: cookie.domain,
        maxAge: cookie.maxAge,
        secure: cookie.secure,
        sameSite: cookie.sameSite,
        httpOnly: cookie.httpOnly,
        expires: cookie.expires
      });
    });
    return superadminRedirect;
  }

  return response;
}

export default proxy;

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
