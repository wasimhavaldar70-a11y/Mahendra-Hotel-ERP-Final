// ========================================================
// StayDesk CRM / HotelFlow CRM Shared Supabase Client
// Location: lib/supabase/supabaseClient.ts
// ========================================================

import { createClient } from '@supabase/supabase-js';

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
