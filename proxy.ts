// ========================================================
// StayDesk / HotelFlow Next.js Request Proxy
// Location: proxy.ts
// ========================================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
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

  const session = request.cookies.get('hf_session');
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

// Export as default as well to comply with both conventions
export default proxy;

// Config to target all page routes
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
