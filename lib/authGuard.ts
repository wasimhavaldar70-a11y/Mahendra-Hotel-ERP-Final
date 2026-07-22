// ========================================================
// StayDesk CRM / HotelFlow CRM Superadmin Security Guard
// Location: lib/authGuard.ts
// ========================================================

import { User } from '@supabase/supabase-js';
// @ts-ignore
import { PoolClient } from 'pg';

/**
 * Checks whether an authenticated Supabase user is a Superadmin.
 * Evaluates JWT claims, hardcoded superadmin emails, and PostgreSQL public.users role table.
 */
export async function isSuperAdminUser(user: User, pgClient?: PoolClient | null): Promise<boolean> {
  if (!user) return false;

  const email = user.email?.toLowerCase().trim() || '';

  // 1. Check designated Superadmin emails
  const SUPERADMIN_EMAILS = ['wasimhavaldar70@gmail.com', 'admin@staydesk.com'];
  if (SUPERADMIN_EMAILS.includes(email)) {
    return true;
  }

  // 2. Check JWT app_metadata or user_metadata claims
  const roleFromAppMeta = user.app_metadata?.role;
  const roleFromUserMeta = user.user_metadata?.role;
  if (roleFromAppMeta === 'superadmin' || roleFromUserMeta === 'superadmin') {
    return true;
  }

  // 3. Fallback to public.users database table
  if (pgClient && user.id) {
    try {
      const roleRes = await pgClient.query('SELECT role FROM public.users WHERE id = $1;', [user.id]);
      if (roleRes.rows.length > 0 && roleRes.rows[0].role === 'superadmin') {
        return true;
      }
    } catch (err) {
      console.error('Error querying superadmin role from public.users:', err);
    }
  }

  return false;
}
