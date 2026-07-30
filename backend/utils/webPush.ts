import webpush from 'web-push';

let publicKey = '';
let privateKey = '';
let isVapidInitialized = false;

async function ensureVapidDetails() {
  if (isVapidInitialized) return;

  // Try process environment variables first
  let pubKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
  let privKey = process.env.VAPID_PRIVATE_KEY || '';

  // Fallback to Firestore persistent settings collection to ensure serverless persistence
  if (!pubKey || !privKey) {
    try {
      const { db } = require('@/backend/config/firebase');
      const docRef = db.collection('settings').doc('vapid_keys');
      const doc = await docRef.get();

      if (doc.exists) {
        const data = doc.data();
        pubKey = data.publicKey;
        privKey = data.privateKey;
      } else {
        // Generate new keys once and store persistently
        const keys = webpush.generateVAPIDKeys();
        pubKey = keys.publicKey;
        privKey = keys.privateKey;
        await docRef.set({
          publicKey: pubKey,
          privateKey: privKey,
          createdAt: new Date(),
        });
        console.log('✅ Persistent VAPID keys created in Firestore settings/vapid_keys');
      }
    } catch (err) {
      console.error('⚠️ Failed to resolve VAPID keys from Firestore:', err);
    }
  }

  if (pubKey && privKey) {
    publicKey = pubKey;
    privateKey = privKey;
    const contactEmail = 'mailto:admin@certifiedluxuryworld.com';
    webpush.setVapidDetails(contactEmail, publicKey, privateKey);
    isVapidInitialized = true;
  }
}

export async function getVapidPublicKey() {
  await ensureVapidDetails();
  return publicKey;
}

export async function sendWebPush(subscription: any, payload: { title: string; body: string; url?: string; icon?: string; image?: string }) {
  await ensureVapidDetails();
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (err: any) {
    // 410 Gone or 404 Not Found indicates subscription expired or invalid
    if (err.statusCode === 410 || err.statusCode === 404) {
      console.log('🗑️ Push subscription expired or invalid, cleaning up:', subscription.endpoint);
      return false; // Signal for removal
    }
    console.error('Failed to send push notification:', err);
    return true;
  }
}
