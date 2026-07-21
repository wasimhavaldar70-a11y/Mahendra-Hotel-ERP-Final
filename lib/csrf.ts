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
 *
 * Set NEXT_PUBLIC_APP_URL in your environment (e.g. https://app.staydesk.in).
 * In development, localhost is always allowed.
 */

const ALLOWED_ORIGINS_EXTRA: string[] = [
  // Add any additional trusted origins here if needed (e.g. staging URL)
];

/**
 * Returns `true` if the request origin is trusted, `false` if it looks like
 * a cross-origin request that should be blocked.
 */
export function validateCsrfOrigin(request: Request): boolean {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  // Build the list of allowed origins
  const allowedOrigins: string[] = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    ...ALLOWED_ORIGINS_EXTRA,
  ];

  if (appUrl) {
    try {
      const parsed = new URL(appUrl);
      allowedOrigins.push(parsed.origin); // e.g. "https://app.staydesk.in"
    } catch {
      // Ignore malformed URL
    }
  }

  // Check Origin header (preferred)
  const originHeader = request.headers.get('origin');
  if (originHeader) {
    // 'null' origin can appear from file:// or sandboxed iframes — block it
    if (originHeader === 'null') return false;
    return allowedOrigins.some(allowed => originHeader === allowed);
  }

  // Fallback: Check Referer header
  const refererHeader = request.headers.get('referer');
  if (refererHeader) {
    try {
      const referer = new URL(refererHeader);
      return allowedOrigins.some(allowed => {
        try {
          const allowedParsed = new URL(allowed);
          return referer.origin === allowedParsed.origin;
        } catch {
          return false;
        }
      });
    } catch {
      return false;
    }
  }

  // If neither Origin nor Referer is present (e.g. server-to-server calls),
  // allow the request — this handles health checks and internal admin tools.
  // The Supabase JWT check still provides authentication protection.
  return true;
}
