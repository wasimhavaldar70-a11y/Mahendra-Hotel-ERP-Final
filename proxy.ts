import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from './lib/supabase/middleware';
import { logger } from './lib/logger';

export async function proxy(request: NextRequest) {
  const startTime = Date.now();
  // Edge runtime supports crypto.randomUUID()
  const requestId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
  const { pathname } = request.nextUrl;
  const method = request.method;
  
  // Client metadata
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
  const userAgent = request.headers.get('user-agent') || '';
  const country = request.headers.get('x-vercel-ip-country') || 'Unknown';

  let finalResponse: NextResponse;
  let user: any = null;
  let role = 'anonymous';
  let userId: string | undefined = undefined;
  let hotelId: string | undefined = undefined;

  try {
    // 1. Passthrough for next assets, public files, and authentication API calls
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
      finalResponse = NextResponse.next();
    } else {
      // 2. Refresh session cookies and retrieve the updated session and user
      const sessionResult = await updateSession(request);
      const response = sessionResult.response;
      user = sessionResult.user;
      finalResponse = response;

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
        finalResponse = loginRedirect;
      } else {
        role = user.app_metadata?.role || 'hotel_owner';
        userId = user.id;
        hotelId = user.app_metadata?.hotel_id;

        // Prevent receptionists from accessing settings screens
        if (pathname.startsWith('/settings') && role === 'receptionist') {
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
          finalResponse = dashboardRedirect;
        }
        // Role-based routing restrictions
        else if (pathname.startsWith('/super-admin') && role !== 'superadmin') {
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
          finalResponse = dashboardRedirect;
        }
        else if (
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
          finalResponse = superadminRedirect;
        }
      }
    }
  } catch (err: any) {
    logger.error('Application', `Middleware request handling failed for ${pathname}`, err, {
      requestId,
      ip,
      endpoint: pathname,
      method
    });
    finalResponse = NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }

  // 3. Log request metrics before responding
  const duration = Date.now() - startTime;
  const statusCode = finalResponse.status;

  logger.info('Application', `HTTP ${method} ${pathname} -> ${statusCode} (${duration}ms)`, {
    requestId,
    userId,
    hotelId,
    role,
    duration,
    endpoint: pathname,
    method,
    statusCode,
    ip,
    browser: userAgent,
    device: userAgent.includes('Mobile') ? 'Mobile' : 'Desktop',
    country
  });

  // 4. Set secure browser headers
  finalResponse.headers.set('X-Frame-Options', 'DENY');
  finalResponse.headers.set('X-Content-Type-Options', 'nosniff');
  finalResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  finalResponse.headers.set('X-XSS-Protection', '1; mode=block');
  finalResponse.headers.set('Content-Security-Policy', "default-src 'self' https: data: 'unsafe-inline' 'unsafe-eval' ws: http:; img-src 'self' data: https: http:; frame-ancestors 'none';");

  return finalResponse;
}

export default proxy;

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
