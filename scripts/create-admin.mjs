/**
 * One-time script: create or reset the CLW admin account in Firestore.
 * Run with: node scripts/create-admin.mjs
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import bcrypt from 'bcryptjs';
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

// ── Admin credentials ──────────────────────────────────────────────────────────
const ADMIN_EMAIL    = 'admin@certifiedluxuryworld.com';
const ADMIN_PASSWORD = 'CLW@Admin2024!';
const ADMIN_FIRST    = 'CLW';
const ADMIN_LAST     = 'Admin';

async function main() {
  console.log('\n🔐  CLW Admin Account Setup\n');

  const salt   = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(ADMIN_PASSWORD, salt);
  const now    = new Date();

  // Check if admin already exists
  const existing = await db.collection('users')
    .where('email', '==', ADMIN_EMAIL)
    .limit(1)
    .get();

  if (!existing.empty) {
    // Update password + ensure role
    const docId = existing.docs[0].id;
    await db.collection('users').doc(docId).update({
      password:          hashed,
      role:              'admin',
      isEmailVerified:   true,
      isActive:          true,
      applicationStatus: 'approved',
      updatedAt:         now,
    });
    console.log('✅  Admin account updated (password reset)');
    console.log(`    Email:    ${ADMIN_EMAIL}`);
    console.log(`    Password: ${ADMIN_PASSWORD}`);
    console.log(`    Doc ID:   ${docId}\n`);
    return;
  }

  // Create fresh admin
  const ref = await db.collection('users').add({
    firstName:         ADMIN_FIRST,
    lastName:          ADMIN_LAST,
    email:             ADMIN_EMAIL,
    password:          hashed,
    role:              'admin',
    isEmailVerified:   true,
    isPhoneVerified:   false,
    isActive:          true,
    applicationStatus: 'approved',
    createdAt:         now,
    updatedAt:         now,
  });

  console.log('✅  Admin account created');
  console.log(`    Email:    ${ADMIN_EMAIL}`);
  console.log(`    Password: ${ADMIN_PASSWORD}`);
  console.log(`    Doc ID:   ${ref.id}\n`);
  console.log('🔗  Login at: https://certifiedluxuryworld.com/admin/login\n');
}

main().catch(err => { console.error('❌', err); process.exit(1); });
