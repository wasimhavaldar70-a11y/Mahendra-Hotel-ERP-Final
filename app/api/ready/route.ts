import { NextResponse } from 'next/server';
// @ts-ignore
import { Pool } from 'pg';
import '../../../lib/env';

const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

export async function GET() {
  const checks: Record<string, any> = {
    env: 'OK'
  };
  let ready = true;

  // 1. Database Liveness check
  let pool: Pool | null = null;
  try {
    pool = new Pool({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false }
    });
    const client = await pool.connect();
    await client.query('SELECT 1;');
    client.release();
    checks.database = 'OK';
  } catch (err: any) {
    checks.database = `ERROR: ${err.message}`;
    ready = false;
  } finally {
    if (pool) {
      await pool.end();
    }
  }

  // 2. Storage Client check
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { error } = await supabase.storage.listBuckets();
    if (error) throw error;
    checks.storage = 'OK';
  } catch (err: any) {
    checks.storage = `ERROR: ${err.message}`;
    ready = false;
  }

  if (!ready) {
    return NextResponse.json({ status: 'DOWN', checks, timestamp: new Date().toISOString() }, { status: 503 });
  }

  return NextResponse.json({ status: 'READY', checks, timestamp: new Date().toISOString() });
}
