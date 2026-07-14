// ========================================================
// StayDesk CRM / HotelFlow CRM Unified Client Router
// Location: lib/supabase/client.ts
// ========================================================

import { createClient } from '@supabase/supabase-js';
import { mockDb } from './mockDb';
import { supabaseDb } from './supabaseDb';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Real connection is active if credentials exist and are not placeholders
export const isRealSupabase = !!(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseAnonKey.includes('[YOUR-') && 
  !supabaseUrl.includes('[YOUR-')
);

export const supabase = isRealSupabase
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

// Unified database operations client
export const db = isRealSupabase ? supabaseDb : mockDb;

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
  } else {
    localStorage.removeItem('hf_session');
  }
};
