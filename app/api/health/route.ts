import { NextResponse } from 'next/server';
// @ts-ignore
import { Pool } from 'pg';
import '../../../lib/env';

const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

export async function GET() {
  const startTime = Date.now();
  const checks: Record<string, any> = {
    env: 'OK'
  };
  let healthy = true;

  // 1. Database Check
  let pool: Pool | null = null;
  try {
    pool = new Pool({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false }
    });
    const client = await pool.connect();
    const startDb = Date.now();
    await client.query('SELECT 1;');
    checks.database_latency_ms = Date.now() - startDb;
    client.release();
    checks.database = 'HEALTHY';
  } catch (err: any) {
    checks.database = `UNHEALTHY: ${err.message}`;
    healthy = false;
  } finally {
    if (pool) {
      await pool.end();
    }
  }

  // 2. Storage Check
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const startStorage = Date.now();
    const { error } = await supabase.storage.listBuckets();
    if (error) throw error;
    checks.storage_latency_ms = Date.now() - startStorage;
    checks.storage = 'HEALTHY';
  } catch (err: any) {
    checks.storage = `UNHEALTHY: ${err.message}`;
    healthy = false;
  }

  // 3. System Metrics
  const memoryUsage = process.memoryUsage ? process.memoryUsage() : null;
  const systemMetrics = {
    uptime_seconds: process.uptime ? process.uptime() : 0,
    memory: memoryUsage ? {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
    } : 'unavailable'
  };

  const responsePayload = {
    status: healthy ? 'HEALTHY' : 'UNHEALTHY',
    timestamp: new Date().toISOString(),
    total_latency_ms: Date.now() - startTime,
    checks,
    system: systemMetrics
  };

  if (!healthy) {
    return NextResponse.json(responsePayload, { status: 500 });
  }

  return NextResponse.json(responsePayload);
}
