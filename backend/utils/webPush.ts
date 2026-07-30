import webpush from 'web-push';
import fs from 'fs';
import path from 'path';

let publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
let privateKey = process.env.VAPID_PRIVATE_KEY || '';

if (!publicKey || !privateKey) {
  // Generate VAPID keys dynamically if not configured
  const keys = webpush.generateVAPIDKeys();
  publicKey = keys.publicKey;
  privateKey = keys.privateKey;

  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    if (!envContent.includes('NEXT_PUBLIC_VAPID_PUBLIC_KEY')) {
      envContent += `\n# Generated VAPID Keys for Web Push\nNEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKey}\nVAPID_PRIVATE_KEY=${privateKey}\n`;
      fs.writeFileSync(envPath, envContent, 'utf8');
      console.log('✅ Generated VAPID keys and appended to .env.local');
    }
  } catch (err) {
    console.error('⚠️ Failed to persist VAPID keys in .env.local:', err);
  }
  
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = publicKey;
  process.env.VAPID_PRIVATE_KEY = privateKey;
}

// Initialize web-push details
const contactEmail = 'mailto:admin@certifiedluxuryworld.com';
webpush.setVapidDetails(contactEmail, publicKey, privateKey);

export { publicKey };

export async function sendWebPush(subscription: any, payload: { title: string; body: string; url?: string; icon?: string }) {
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
