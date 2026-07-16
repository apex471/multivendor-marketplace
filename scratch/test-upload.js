const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

// Parse .env.local
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const processEnv = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    processEnv[key] = value;
  }
});

const JWT_SECRET = processEnv.JWT_SECRET || 'dev-only-insecure-secret-replace-before-deploy';
const JWT_EXPIRE = processEnv.JWT_EXPIRE || '7d';

// Generate token
const token = jwt.sign(
  { userId: 'test-user-id', email: 'test@example.com', role: 'user' },
  JWT_SECRET,
  { expiresIn: JWT_EXPIRE }
);

console.log('Generated JWT token:', token);

// Create multi-part form data request using built-in fetch
async function testUpload() {
  const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
  
  // Create a mock small buffer for image
  const fileContent = Buffer.from('fake image content');
  
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\n`),
    Buffer.from(`Content-Disposition: form-data; name="file"; filename="test.jpg"\r\n`),
    Buffer.from(`Content-Type: image/jpeg\r\n\r\n`),
    fileContent,
    Buffer.from(`\r\n--${boundary}\r\n`),
    Buffer.from(`Content-Disposition: form-data; name="type"\r\n\r\nimage\r\n`),
    Buffer.from(`--${boundary}\r\n`),
    Buffer.from(`Content-Disposition: form-data; name="folder"\r\n\r\nstories\r\n`),
    Buffer.from(`--${boundary}--\r\n`)
  ]);

  try {
    const res = await fetch('http://localhost:3000/api/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length
      },
      body: body
    });

    console.log('Response Status:', res.status);
    console.log('Response Headers:', Object.fromEntries(res.headers.entries()));
    const text = await res.text();
    console.log('Response Body:', text);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

testUpload();
