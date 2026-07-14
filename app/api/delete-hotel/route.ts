import { NextResponse } from 'next/server';
// @ts-ignore
import { Client } from 'pg';

export async function POST(request: Request) {
  let pgClient: Client | null = null;
  try {
    const body = await request.json();
    const { hotel_id } = body;

    if (!hotel_id) {
      return NextResponse.json({ error: 'Missing hotel_id' }, { status: 400 });
    }

    const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
    if (!dbUrl) {
      return NextResponse.json({ error: 'Database URL not configured' }, { status: 500 });
    }

    pgClient = new Client({
      connectionString: dbUrl,
      ssl: {
        rejectUnauthorized: false
      }
    });

    await pgClient.connect();

    // Start transaction
    await pgClient.query('BEGIN;');

    // 1. Get the email of the hotel owner to clean up auth.users
    const hotelRes = await pgClient.query('SELECT email FROM public.hotels WHERE id = $1;', [hotel_id]);
    
    if (hotelRes.rows.length > 0) {
      const email = hotelRes.rows[0].email;
      
      // 2. Delete the user from auth.users (cascades to public.users)
      await pgClient.query('DELETE FROM auth.users WHERE email = $1;', [email]);
    }

    // 3. Delete the hotel from public.hotels (cascades to all operational tables)
    await pgClient.query('DELETE FROM public.hotels WHERE id = $1;', [hotel_id]);

    // Commit Transaction
    await pgClient.query('COMMIT;');

    return NextResponse.json({ success: true });

  } catch (err: any) {
    if (pgClient) {
      try {
        await pgClient.query('ROLLBACK;');
      } catch (rollbackErr) {
        console.error('Rollback failed:', rollbackErr);
      }
    }
    console.error('Delete Hotel API Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete hotel' }, { status: 500 });
  } finally {
    if (pgClient) {
      await pgClient.end();
    }
  }
}
