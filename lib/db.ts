// ========================================================
// StayDesk CRM / HotelFlow CRM Shared Database Connection Pool Cache
// Location: lib/db.ts
// ========================================================

// @ts-ignore
import { Pool } from 'pg';

const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

// Declare global cache variable to prevent creating new pools on hot-reloads
declare global {
  var pgPool: Pool | undefined;
}

if (!globalThis.pgPool) {
  globalThis.pgPool = new Pool({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false
    },
    max: 10,                 // pool connection limit suited for serverless scale
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  });
}

export const pool: Pool = globalThis.pgPool;
