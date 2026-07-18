// ========================================================
// StayDesk CRM / HotelFlow CRM Shared Supabase Client
// Location: lib/supabase/supabaseClient.ts
// ========================================================

import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('[YOUR-') || supabaseAnonKey.includes('[YOUR-')) {
  throw new Error(
    'CRITICAL ERROR: Supabase environment credentials (NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY) are missing or not configured correctly.'
  );
}

// Real connection is active
export const isRealSupabase = true;

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
