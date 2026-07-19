// ========================================================
// StayDesk CRM / HotelFlow CRM Database-Backed API Rate Limiter
// Location: lib/rateLimit.ts
// ========================================================

import { pool } from './db';

/**
 * Checks if a given IP address has exceeded its rate limit using a central PostgreSQL database table.
 * Failure/Exception defaults to fail-open to preserve API route availability.
 * 
 * @param ip Client IP address
 * @param limit Max allowed requests within the window
 * @param windowMs Time window in milliseconds (default 1 minute)
 * @returns Promise<boolean> true if the request is allowed, false if rate-limited
 */
export async function isRequestAllowed(
  ip: string,
  limit: number = 30,
  windowMs: number = 60000
): Promise<boolean> {
  const now = new Date();
  const resetTime = new Date(Date.now() + windowMs);

    try {
      const client = await pool.connect();
      try {
        // 1. Probabilistic cleanup of expired rate limits (10% chance per call)
        if (Math.random() < 0.1) {
          await client.query('DELETE FROM public.rate_limits WHERE reset_time < NOW();');
        }

      // 3. Atomically upsert rate limit counters
      const res = await client.query(`
        INSERT INTO public.rate_limits (ip, count, reset_time)
        VALUES ($1, 1, $2)
        ON CONFLICT (ip) DO UPDATE
        SET 
          count = CASE 
            WHEN NOW() > public.rate_limits.reset_time THEN 1
            ELSE public.rate_limits.count + 1
          END,
          reset_time = CASE 
            WHEN NOW() > public.rate_limits.reset_time THEN $2
            ELSE public.rate_limits.reset_time
          END
        RETURNING count;
      `, [ip, resetTime]);

      const currentCount = res.rows[0]?.count || 1;
      return currentCount <= limit;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Rate limiting database check failed, defaulting to allowed (fail-open):', err);
    return true; // Fail-open to ensure service availability during database exceptions
  }
}
