const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 1. Read .env.local or .env
let envPath = path.join(__dirname, '.env.local');
if (!fs.existsSync(envPath)) {
  envPath = path.join(__dirname, '.env');
}
if (!fs.existsSync(envPath)) {
  console.error('❌ ERROR: .env.local or .env file not found in the root directory!');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    }
    envVars[key] = value.trim();
  }
});

// We use DIRECT_URL for migrations as it uses session-mode pooler
const dbUrl = envVars.DIRECT_URL || envVars.DATABASE_URL;

if (!dbUrl) {
  console.error('❌ ERROR: DIRECT_URL or DATABASE_URL was not found in your .env.local file!');
  process.exit(1);
}

if (dbUrl.includes('[YOUR-PASSWORD]')) {
  console.error('\n❌ CONFIGURATION ERROR:');
  console.error('--------------------------------------------------');
  console.error('Please open your .env.local file and replace the');
  console.error('"[YOUR-PASSWORD]" placeholder inside DIRECT_URL and');
  console.error('DATABASE_URL with your actual Supabase DB password.');
  console.error('--------------------------------------------------\n');
  process.exit(1);
}

// 2. Install 'pg' package if not present
try {
  require.resolve('pg');
} catch (e) {
  console.log('Installing "pg" database client driver locally...');
  execSync('npm install pg --no-save', { stdio: 'inherit' });
}

const { Client } = require('pg');

// 3. Read database.sql
const sqlPath = path.join(__dirname, 'supabase', 'database.sql');
if (!fs.existsSync(sqlPath)) {
  console.error(`❌ ERROR: SQL file not found at ${sqlPath}`);
  process.exit(1);
}

const sqlContent = fs.readFileSync(sqlPath, 'utf8');

async function runMigration() {
  console.log('Connecting to Supabase PostgreSQL database...');
  // Configure SSL as required by Supabase hosting
  const client = new Client({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected successfully!');
    console.log('Running database setup (database.sql)...');
    
    // Run the SQL script
    await client.query(sqlContent);
    
    console.log('\n==================================================');
    console.log('✅ SUCCESS: Database migration completed successfully!');
    console.log('All tables, constraints, security policies, and');
    console.log('default hotel seed data are now live on Supabase.');
    console.log('==================================================\n');
  } catch (err) {
    console.error('\n❌ DATABASE MIGRATION FAILED:', err.message);
    if (err.message.includes('password authentication failed')) {
      console.error('Detail: Please double-check that your database password in .env.local is correct.');
    }
  } finally {
    await client.end();
  }
}

runMigration();
