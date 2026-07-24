import { NextRequest } from 'next/server';
import { verifyToken } from '@/backend/utils/jwt';
import { sendError, sendSuccess } from '@/backend/utils/responseAppRouter';

function getCloudinaryConfig() {
  const name   = process.env.CLOUDINARY_CLOUD_NAME;
  const key    = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!name || !key || !secret ||
      name === 'your_cloud_name' || key === 'your_api_key') return null;
  return { name, key, secret };
}

async function getFirebaseApp() {
  const { getApps, initializeApp, cert } = await import('firebase-admin/app');
  const projectId = process.env.FIREBASE_PROJECT_ID!;
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`;

  let app = getApps()[0];
  if (!app) {
    app = initializeApp({
      credential: cert({
        projectId,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      storageBucket: bucketName,
    });
  }
  return { app, bucketName };
}

export async function POST(request: NextRequest) {
  // Auth check
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return sendError('Authentication required', 401);
  }
  const decoded = verifyToken(authHeader.split(' ')[1]);
  if (!decoded) return sendError('Invalid or expired token', 401);

  try {
    const { filename, mimeType, folder = 'products', resourceType = 'image' } = await request.json();

    if (!filename || !mimeType) {
      return sendError('Missing required fields: filename, mimeType', 400);
    }

    const cloudConf = getCloudinaryConfig();

    if (cloudConf) {
      const { v2: cloudinary } = require('cloudinary');
      cloudinary.config({
        cloud_name: cloudConf.name,
        api_key:    cloudConf.key,
        api_secret: cloudConf.secret,
        secure:     true,
      });

      const timestamp = Math.round(new Date().getTime() / 1000);
      const folderPath = `clw-marketplace/${folder}`;
      
      const paramsToSign = {
        timestamp,
        folder: folderPath,
      };

      const signature = cloudinary.utils.api_sign_request(paramsToSign, cloudConf.secret);

      return sendSuccess({
        provider: 'cloudinary',
        uploadUrl: `https://api.cloudinary.com/v1_1/${cloudConf.name}/${resourceType}/upload`,
        apiKey: cloudConf.key,
        timestamp,
        signature,
        folder: folderPath,
      });
    }

    // Fallback: Firebase Storage signed URL
    console.log('[UploadSign] Cloudinary not configured — generating GCS signed URL');
    const { app, bucketName } = await getFirebaseApp();
    const { getStorage } = await import('firebase-admin/storage');

    const dest = `clw-marketplace/${folder}/${Date.now()}-${filename}`;
    const bucket = getStorage(app).bucket(bucketName);
    const file = bucket.file(dest);

    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 mins
      contentType: mimeType,
    });

    return sendSuccess({
      provider: 'firebase',
      uploadUrl: signedUrl,
      publicUrl: `https://storage.googleapis.com/${bucketName}/${dest}`,
      mimeType,
    });

  } catch (err: any) {
    console.error('[UploadSign] Error:', err);
    return sendError(err.message || 'Signature generation failed', 500);
  }
}
