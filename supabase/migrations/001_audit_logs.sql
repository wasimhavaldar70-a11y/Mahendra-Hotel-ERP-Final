-- ========================================================
-- StayDesk CRM / HotelFlow CRM
-- Migration: Create audit_logs table
-- Location: supabase/migrations/001_audit_logs.sql
-- ========================================================

-- Audit Logs Table — tracks all critical admin and system actions
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id     UUID REFERENCES public.hotels(id) ON DELETE SET NULL,
  actor_id     UUID,                    -- auth.users.id of the person who performed the action
  actor_email  TEXT,                    -- denormalised for legibility (email at time of action)
  action       TEXT NOT NULL,           -- e.g. 'hotel.created', 'password.reset', 'guest.exported'
  target_type  TEXT,                    -- e.g. 'hotel', 'user', 'room', 'guest'
  target_id    TEXT,                    -- UUID or identifier of the affected record
  metadata     JSONB DEFAULT '{}'::jsonb, -- arbitrary context (hotel_name, ip, etc.)
  ip           TEXT,                    -- client IP at time of action
  created_at   TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- RLS: Only superadmins can read audit logs; writes go through the service-role key
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Superadmins can read audit logs" ON public.audit_logs;
CREATE POLICY "Superadmins can read audit logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (is_super_admin());

-- Index for fast date-range queries in the super-admin dashboard
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_hotel_id   ON public.audit_logs(hotel_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action     ON public.audit_logs(action);
