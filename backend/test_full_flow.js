const http = require('http');

function request(path, method, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const headers = { 'Content-Type': 'application/json' };
    if (body) headers['Content-Length'] = data.length;
    if (token) headers['Authorization'] = 'Bearer ' + token;
    
    const options = { hostname: 'localhost', port: 5000, path, method, headers };
    
    const req = http.request(options, res => {
      let resBody = '';
      res.on('data', d => { resBody += d; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(resBody) });
        } catch (e) {
          resolve({ status: res.statusCode, body: resBody });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(data);
    req.end();
  });
}

(async () => {
  try {
    const email = 'test_flow_' + Date.now() + '@company.com';
    console.log("1. Registering", email);
    let res = await request('/api/v1/auth/register', 'POST', {
      email, password: 'Password123!', firstName: 'Test', lastName: 'Flow', role: 'ADMIN'
    });
    console.log("Register Res:", res.status, res.body);
    
    // We need to verify the email!
    // But we don't have the token. So let's mock it by updating the DB directly.
    const { Client } = require('pg');
    require('dotenv').config();
    const client = new Client({
      host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER,
      password: process.env.DB_PASSWORD, database: process.env.DB_NAME, ssl: { rejectUnauthorized: false }
    });
    await client.connect();
    await client.query('UPDATE users SET email_verified = true WHERE email = $1', [email]);
    await client.end();
    console.log("2. Verified email in DB");

    console.log("3. Logging in");
    res = await request('/api/v1/auth/login', 'POST', { email, password: 'Password123!' });
    console.log("Login Res:", res.status, res.body);
    
    const accessToken = res.body?.data?.tokens?.accessToken;
    console.log("AccessToken:", accessToken);
    
    if (accessToken) {
      console.log("4. Fetching /auth/me");
      res = await request('/api/v1/auth/me', 'GET', null, accessToken);
      console.log("Me Res:", res.status, res.body);
    }
  } catch (err) {
    console.error(err);
  }
})();
