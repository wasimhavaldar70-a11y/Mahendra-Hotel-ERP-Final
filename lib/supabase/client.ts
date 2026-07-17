// ========================================================
// StayDesk CRM / HotelFlow CRM Unified Client Router
// Location: lib/supabase/client.ts
// ========================================================

import { supabaseDb } from './supabaseDb';
import { supabase, isRealSupabase } from './supabaseClient';

export { supabase, isRealSupabase };

// Unified database operations client
export const db = supabaseDb;

// Mock/Real Session helpers
export const getSessionUser = () => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('hf_session');
  return raw ? JSON.parse(raw) : null;
};

export const setSessionUser = (sessionData: any) => {
  if (typeof window === 'undefined') return;
  if (sessionData) {
    localStorage.setItem('hf_session', JSON.stringify(sessionData));
    // Set cookie for Next.js Middleware and API routes to access the session
    document.cookie = `hf_session=${encodeURIComponent(JSON.stringify(sessionData))}; path=/; max-age=86400; SameSite=Lax`;
  } else {
    localStorage.removeItem('hf_session');
    // Clear the session cookie
    document.cookie = 'hf_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  }
};
