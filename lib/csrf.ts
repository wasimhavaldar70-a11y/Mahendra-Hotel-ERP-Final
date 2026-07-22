// ========================================================
// StayDesk CRM / HotelFlow CRM CSRF Origin Validator
// Location: lib/csrf.ts
// ========================================================

/**
 * Validates the Origin or Referer header of an incoming request to prevent
 * Cross-Site Request Forgery (CSRF) on state-changing API routes.
 *
 * All state-changing API routes already require a valid Supabase JWT, so the
 * risk is low. This adds defence-in-depth by rejecting requests that do not
 * originate from the known application domain.
 */

const ALLOWED_ORIGINS_EXTRA: string[] = [
  // Add any additional trusted origins here if needed (e.g. staging URL)
];

/**
 * Returns `true` if the request origin is trusted, `false` if it looks like
 * a cross-origin request that should be blocked.
 */
export function validateCsrfOrigin(request: Request): boolean {
  const originHeader = request.headers.get('origin');
  const refererHeader = request.headers.get('referer');
  const hostHeader = request.headers.get('host');

  const targetHeader = originHeader || refererHeader;

  // If neither Origin nor Referer is present (e.g. server-to-server calls),
  // allow the request — this handles health checks and internal admin tools.
  if (!targetHeader) {
    return true;
  }

  // 'null' origin can appear from sandboxed iframes or file:// — block it
  if (targetHeader === 'null') {
    return false;
  }

  try {
    const url = new URL(targetHeader);
    const hostname = url.hostname.toLowerCase();

    // 1. Allow any localhost / loopback / local network IP across all ports
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.endsWith('.local')
    ) {
      return true;
    }

    // 2. Same-Origin Check: Match Origin/Referer host with the request's own Host header
    if (hostHeader) {
      const hostWithoutPort = hostHeader.split(':')[0].toLowerCase();
      if (url.host.toLowerCase() === hostHeader.toLowerCase() || hostname === hostWithoutPort) {
        return true;
      }
    }

    // 3. Check NEXT_PUBLIC_APP_URL if defined
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl) {
      try {
        const appParsed = new URL(appUrl);
        if (url.origin.toLowerCase() === appParsed.origin.toLowerCase()) {
          return true;
        }
      } catch {
        // Ignore malformed URL
      }
    }

    // 4. Check extra allowed origins list
    if (ALLOWED_ORIGINS_EXTRA.some(allowed => url.origin.toLowerCase() === allowed.toLowerCase())) {
      return true;
    }

  } catch {
    return false;
  }

  return false;
}
