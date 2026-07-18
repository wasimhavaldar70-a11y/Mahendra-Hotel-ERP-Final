// ========================================================
// StayDesk CRM / HotelFlow CRM Environment Variables Validation
// Location: lib/env.ts
// ========================================================

const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL',
  'DIRECT_URL'
];

export function validateEnv() {
  const missing: string[] = [];
  const invalid: string[] = [];

  for (const name of REQUIRED_ENV_VARS) {
    const value = process.env[name];
    if (!value) {
      missing.push(name);
    } else if (
      value.includes('[YOUR-') || 
      value.includes('your-') || 
      value.includes('placeholder')
    ) {
      invalid.push(name);
    }
  }

  if (missing.length > 0 || invalid.length > 0) {
    const errorMsg = `Configuration Check Failed!\n` +
      (missing.length > 0 ? `Missing Variables: ${missing.join(', ')}\n` : '') +
      (invalid.length > 0 ? `Placeholder/Invalid Variables: ${invalid.join(', ')}\n` : '') +
      `Please configure environment variables correctly before booting.`;
      
    const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
    
    if (isBuildPhase) {
      console.warn(`[WARNING] Build Phase Env Check: ${errorMsg}`);
    } else {
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
  }
}

// Auto-run validation when this module is imported in Next.js Server Side context
if (typeof window === 'undefined') {
  validateEnv();
}
