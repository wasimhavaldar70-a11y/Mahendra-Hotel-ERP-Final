// ========================================================
// StayDesk CRM / HotelFlow CRM Next.js Middleware
// Location: middleware.ts
// ========================================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Passthrough for next assets, public files, and authentication API calls
  if (
    pathname.startsWith('/_next') || 
    pathname.startsWith('/static') || 
    pathname.startsWith('/favicon.ico') || 
    pathname.startsWith('/api') || 
    pathname === '/login'
  ) {
    return NextResponse.next();
  }

  // Note: For real Supabase deployments, you would retrieve the session cookie here:
  // const session = request.cookies.get('sb-access-token');
  // if (!session) {
  //   return NextResponse.redirect(new URL('/login', request.url));
  // }

  return NextResponse.next();
}

// Config to target all page routes
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
