/**
 * Diagnostic script — checks whether user/product data still exists in Firestore.
 * Run: node --env-file=.env.local scripts/check-firestore.mjs
 */
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const projectId   = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('❌ Missing Firebase env vars');
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

const db = getFirestore();

async function countCollection(name) {
  const snap = await db.collection(name).count().get();
  return snap.data().count;
}

async function sampleDocs(name, limit = 3) {
  const snap = await db.collection(name).limit(limit).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

console.log('\n🔍 Firestore Data Diagnostic\n' + '='.repeat(40));

const collections = ['users', 'products', 'orders', 'transactions', 'referralCodes'];

for (const col of collections) {
  try {
    const count = await countCollection(col);
    console.log(`\n📁 ${col}: ${count} documents`);
    if (count > 0) {
      const samples = await sampleDocs(col, 2);
      samples.forEach(d => {
        const preview = Object.entries(d)
          .filter(([k]) => ['id','name','email','role','status','firstName','lastName'].includes(k))
          .map(([k,v]) => `${k}=${v}`)
          .join(', ');
        console.log(`   ↳ ${preview}`);
      });
    }
  } catch (err) {
    console.log(`\n⚠️  ${col}: ERROR — ${err.message}`);
  }
}

console.log('\n' + '='.repeat(40));
console.log('✅ Diagnostic complete\n');
