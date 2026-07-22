// ========================================================
// StayDesk CRM / HotelFlow CRM Unified Client Router
// Location: lib/supabase/client.ts
// ========================================================

import { supabaseDb } from './supabaseDb';
import { supabase, isRealSupabase } from './supabaseClient';

export { supabase, isRealSupabase };

// Unified database operations client
export const db = supabaseDb;

// Mock/Real Session helpers (Syncing local storage read-only cache for layout/UI)
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
  // Clear any legacy custom hf_session cookie to ensure no collision with official Supabase cookies
  document.cookie = 'hf_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
};

// Subscribe to auth state changes to auto-sync localStorage cache when token refreshes
if (typeof window !== 'undefined' && supabase) {
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log(`[Supabase Auth Event] ${event}`);
    
    if (session) {
      const currentSession = getSessionUser();
      
      // Keep existing hotel and role metadata from current session if missing in JWT
      const userRole = session.user.app_metadata?.role || currentSession?.user?.role || 'hotel_owner';
      const hotelId = session.user.app_metadata?.hotel_id || currentSession?.user?.hotel_id || null;
      
      let hotel = currentSession?.hotel || null;
      
      // Lazily resolve hotel details if missing
      if (hotelId && (!hotel || hotel.id !== hotelId)) {
        try {
          const { data } = await supabase
            .from('hotels')
            .select('*')
            .eq('id', hotelId)
            .maybeSingle();
          if (data) {
            hotel = data;
          }
        } catch (err) {
          console.error('Failed to fetch hotel details in client auth listener:', err);
        }
      }
      
      // If user is not superadmin and has no hotel assigned, do not store session in local cache
      if (userRole !== 'superadmin' && !hotel && !hotelId) {
        setSessionUser(null);
        return;
      }

      setSessionUser({
        user: {
          id: session.user.id,
          email: session.user.email || '',
          role: userRole,
          hotel_id: hotelId,
          created_at: session.user.created_at
        },
        hotel: hotel,
        access_token: session.access_token
      });
    } else if (event === 'SIGNED_OUT') {
      setSessionUser(null);
    }
  });
}
