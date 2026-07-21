// ========================================================
// StayDesk CRM / HotelFlow CRM Official Supabase SSR Server Client
// Location: lib/supabase/server.ts
// ========================================================

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import '../env';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

let cachedRawClient: any = null;
function getCachedRawClient() {
  if (!cachedRawClient) {
    const { createClient: createRawClient } = require('@supabase/supabase-js');
    cachedRawClient = createRawClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return cachedRawClient;
}

export async function getAuthenticatedUser(request: Request) {
  // 1. Check Authorization Bearer header first
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.split(' ')[1];

  if (token) {
    try {
      const tempClient = getCachedRawClient();
      const { data: { user }, error } = await tempClient.auth.getUser(token);
      if (!error && user) {
        return user;
      }
    } catch (e) {
      console.error('Failed to get user from Authorization token:', e);
    }
  }

  // 2. Fallback to SSR cookies
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!error && user) {
      return user;
    }
  } catch (e) {
    console.error('Failed to get user from SSR cookies:', e);
  }

  return null;
}
