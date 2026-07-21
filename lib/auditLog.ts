// ========================================================
// StayDesk CRM / HotelFlow CRM Audit Log Writer
// Location: lib/auditLog.ts
// ========================================================

/**
 * Writes structured audit log entries to the public.audit_logs table.
 * Uses direct Supabase service-role client for privileged writes from API routes.
 * All writes are non-blocking — failure to audit must never block business operations.
 */

export type AuditAction =
  | 'hotel.created'
  | 'hotel.deleted'
  | 'hotel.suspended'
  | 'hotel.activated'
  | 'password.reset'
  | 'guest.exported'
  | 'checkin.created'
  | 'checkout.completed'
  | 'room.created'
  | 'room.deleted'
  | 'user.login'
  | 'user.logout';

export interface AuditEntry {
  action: AuditAction;
  actor_id?: string;
  actor_email?: string;
  hotel_id?: string;
  target_type?: string;
  target_id?: string;
  metadata?: Record<string, any>;
  ip?: string;
}

/**
 * Write an audit log entry — fire-and-forget.
 * Never throws. Errors are logged to console only.
 */
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceRoleKey || !supabaseUrl) {
    console.warn('[AuditLog] Missing Supabase credentials — skipping audit write.');
    return;
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { error } = await adminClient.from('audit_logs').insert({
      action: entry.action,
      actor_id: entry.actor_id || null,
      actor_email: entry.actor_email || null,
      hotel_id: entry.hotel_id || null,
      target_type: entry.target_type || null,
      target_id: entry.target_id || null,
      metadata: entry.metadata || null,
      ip: entry.ip || null,
      created_at: new Date().toISOString(),
    });

    if (error) {
      // Table may not exist on older deployments — log but don't throw
      console.warn('[AuditLog] Failed to write audit log:', error.message);
    }
  } catch (err) {
    console.warn('[AuditLog] Unexpected error writing audit log:', err);
  }
}
