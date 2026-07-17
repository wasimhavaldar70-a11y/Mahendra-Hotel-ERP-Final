// ========================================================
// StayDesk CRM / HotelFlow CRM API Rate Limiter
// Location: lib/rateLimit.ts
// ========================================================

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

/**
 * Checks if a given IP address has exceeded its rate limit.
 * @param ip Client IP address
 * @param limit Max allowed requests within the window
 * @param windowMs Time window in milliseconds (default 1 minute)
 * @returns boolean true if the request is allowed, false if rate-limited
 */
export function isRequestAllowed(ip: string, limit: number = 30, windowMs: number = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count += 1;
  return true;
}
