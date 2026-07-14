const { Client } = require('pg');

const dbUrl = 'postgresql://postgres.yhqgfaegieemnkyzgarm:suhani@705853@aws-1-ap-south-1.pooler.supabase.com:5432/postgres';

async function inspect() {
  const c = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await c.connect();
    
    const adminRes = await c.query("SELECT * FROM auth.users WHERE email = 'wasimhavaldar70@gmail.com'");
    const ownerRes = await c.query("SELECT * FROM auth.users WHERE email = 'havaldarwasim9@gmail.com'");
    
    if (adminRes.rows.length === 0 || ownerRes.rows.length === 0) {
      console.log('One of the users is missing.');
      return;
    }
    
    const admin = adminRes.rows[0];
    const owner = ownerRes.rows[0];
    
    console.log('\n================ COLUMN COMPARISON ================');
    for (const key of Object.keys(admin)) {
      if (JSON.stringify(admin[key]) !== JSON.stringify(owner[key])) {
        console.log(`Column [${key}]:`);
        console.log(`  Admin:`, admin[key]);
        console.log(`  Owner:`, owner[key]);
      }
    }
    
    const adminIdentities = await c.query("SELECT * FROM auth.identities WHERE user_id = $1", [admin.id]);
    const ownerIdentities = await c.query("SELECT * FROM auth.identities WHERE user_id = $1", [owner.id]);
    
    console.log('\n================ IDENTITIES COMPARISON ================');
    console.log('Admin Identities:');
    console.log(adminIdentities.rows);
    console.log('\nOwner Identities:');
    console.log(ownerIdentities.rows);
    console.log('=======================================================\n');
    
  } catch (err) {
    console.error('Inspection failed:', err);
  } finally {
    await c.end();
  }
}

inspect();
