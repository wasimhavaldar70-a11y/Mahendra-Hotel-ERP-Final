const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
let envContent = '';
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
} else {
  envContent = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
}

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

const url = envVars.NEXT_PUBLIC_SUPABASE_URL;
const key = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function testHttp() {
  const endpoint = `${url}/auth/v1/token?grant_type=password`;
  
  console.log('Sending direct HTTP POST request to:', endpoint);
  
  const payload = {
    email: 'sachdesai345@gmail.com',
    password: 'sachdesai345',
    gotrue_meta_security: {}
  };
  
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify(payload)
    });
    
    console.log('\n================ RAW HTTP RESPONSE ================');
    console.log('Status Code:', res.status);
    console.log('Status Text:', res.statusText);
    
    const headers = {};
    res.headers.forEach((val, key) => {
      headers[key] = val;
    });
    console.log('Headers:', headers);
    
    const bodyText = await res.text();
    console.log('Body:', bodyText);
    console.log('====================================================\n');
    
  } catch (err) {
    console.error('Fetch request failed:', err);
  }
}

testHttp();
