const http = require('http');

const data = JSON.stringify({ email: 'admin@company.com', password: 'Password123!' });

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/v1/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', d => { body += d; });
  res.on('end', () => {
    console.log("Login Response:");
    console.log(body);
    const parsed = JSON.parse(body);
    const token = parsed.data?.tokens?.accessToken;
    console.log("Extracted Token:", token);
    
    if (token) {
        const meOptions = {
            hostname: 'localhost',
            port: 5000,
            path: '/api/v1/auth/me',
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + token }
        };
        const meReq = http.request(meOptions, meRes => {
            let meBody = '';
            meRes.on('data', d => { meBody += d; });
            meRes.on('end', () => {
                console.log("Me Response:");
                console.log(meBody);
            });
        });
        meReq.end();
    }
  });
});

req.write(data);
req.end();
