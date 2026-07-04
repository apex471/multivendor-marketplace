/**
 * One-time script: clear all collections to get the website ready for launch.
 * Run with: node scripts/clear-db.mjs
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local
const envPath = resolve(__dirname, '../.env.local');
const envRaw = readFileSync(envPath, 'utf8');
for (const line of envRaw.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  let val = trimmed.slice(eqIdx + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  process.env[key] = val;
}

const projectId   = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('❌  Missing Firebase env vars');
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}
const db = getFirestore();

// List of all collections to clear completely
const collectionsToClear = [
  'users',
  'products',
  'orders',
  'comments',
  'posts',
  'stories',
  'tickets',
  'wishlist',
  'notifications',
  'messages',
  'logistics'
];

async function deleteCollection(collectionPath, batchSize = 100) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, batchSize, resolve, reject);
  });
}

async function deleteQueryBatch(query, batchSize, resolve, reject) {
  try {
    const snapshot = await query.get();

    // When there are no documents left, we are done
    if (snapshot.size === 0) {
      resolve();
      return;
    }

    // Delete documents in a batch
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    // Recurse on the next batch
    process.nextTick(() => {
      deleteQueryBatch(query, batchSize, resolve, reject);
    });
  } catch (error) {
    reject(error);
  }
}

async function main() {
  console.log('\n🧹  Starting Database Cleanup for Launch...');
  
  for (const collection of collectionsToClear) {
    console.log(`⏳  Clearing collection: ${collection}...`);
    try {
      await deleteCollection(collection);
      console.log(`✅  Cleared: ${collection}`);
    } catch (err) {
      console.error(`❌  Failed to clear ${collection}:`, err.message);
    }
  }

  console.log('\n✨  Database cleanup completed!');
}

main().catch(err => { console.error('❌ Global error:', err); process.exit(1); });
