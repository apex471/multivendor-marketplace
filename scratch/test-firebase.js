const fs = require('fs');
const path = require('path');

// Manually parse .env.local
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const processEnv = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2].trim();
    // remove quotes if present
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    processEnv[key] = value;
  }
});

const { initializeApp, cert } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');

const projectId = processEnv.FIREBASE_PROJECT_ID;
const clientEmail = processEnv.FIREBASE_CLIENT_EMAIL;
let privateKey = processEnv.FIREBASE_PRIVATE_KEY;

if (privateKey) {
  privateKey = privateKey.replace(/\\n/g, '\n');
}

try {
  const app = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
  console.log('Firebase Admin initialized successfully!');
  
  // Try appspot.com
  const bucketName = `${projectId}.appspot.com`;
  const bucket = getStorage(app).bucket(bucketName);
  console.log('Trying bucket name:', bucket.name);
  
  bucket.getFiles({ maxResults: 1 })
    .then(([files]) => {
      console.log('Bucket connection successful! Found files count:', files.length);
      process.exit(0);
    })
    .catch(err => {
      console.error('Failed to list files in bucket:', err.message);
      process.exit(1);
    });

} catch (err) {
  console.error('Initialization / storage error:', err);
  process.exit(1);
}
