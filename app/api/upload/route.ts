import { NextRequest } from 'next/server';
import { verifyToken } from '@/backend/utils/jwt';
import {
  sendError,
  sendSuccess,
  sendServerError,
} from '@/backend/utils/responseAppRouter';

/** ── Cloudinary lazy-config (only when credentials exist) ───────────────── */
function getCloudinary() {
  const name   = process.env.CLOUDINARY_CLOUD_NAME;
  const key    = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!name || !key || !secret ||
      name === 'your_cloud_name' || key === 'your_api_key') return null;

  const { v2: cloudinary } = require('cloudinary');
  cloudinary.config({ cloud_name: name, api_key: key, api_secret: secret, secure: true });
  return cloudinary;
}

/** ── Firebase Storage fallback ─────────────────────────────────────────── */
async function uploadToFirebaseStorage(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  folder: string
): Promise<string> {
  const { getStorage } = await import('firebase-admin/storage');
  const { getApps, initializeApp, cert } = await import('firebase-admin/app');

  const projectId = process.env.FIREBASE_PROJECT_ID!;

  /**
   * Bucket name resolution (in priority order):
   *   1. FIREBASE_STORAGE_BUCKET env var (explicit override — most reliable)
   *   2. {projectId}.firebasestorage.app  — default for projects created after ~2024
   *   3. {projectId}.appspot.com          — default for older projects
   *
   * Add FIREBASE_STORAGE_BUCKET to .env.local to pin it:
   *   FIREBASE_STORAGE_BUCKET=certifiedluxuryworld-3dcb1.firebasestorage.app
   */
  const bucketName =
    process.env.FIREBASE_STORAGE_BUCKET ||
    `${projectId}.firebasestorage.app`;

  // Reuse or create the Firebase Admin app
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

  // Always pass the explicit bucket name — avoids 'default bucket not set' errors
  // when the Admin app was initialized without storageBucket (e.g. by firebase.ts)
  const bucket = getStorage(app).bucket(bucketName);
  const dest   = `${folder}/${Date.now()}-${filename}`;
  const file   = bucket.file(dest);

  await file.save(buffer, {
    metadata: { contentType: mimeType },
    resumable: false,
  });

  // Make the object publicly readable (required for <img src=...>)
  try {
    await file.makePublic();
  } catch (publicErr) {
    console.warn('[Upload] makePublic failed — file may still be readable via signed URL:', publicErr);
  }

  return `https://storage.googleapis.com/${bucketName}/${dest}`;
}


const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg':  'jpg',
  'image/jpg':   'jpg',
  'image/png':   'png',
  'image/webp':  'webp',
  'image/gif':   'gif',
  // When blob is fetched from object URL, browser may send octet-stream
  'application/octet-stream': 'jpg',
};

const ALLOWED_VIDEO_TYPES: Record<string, string> = {
  'video/mp4':        'mp4',
  'video/webm':       'webm',
  'video/quicktime':  'mov',
  'video/ogg':        'ogv',
  'video/x-msvideo':  'avi',
  'video/mpeg':       'mpeg',
};

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;  //  15 MB (phone photos can be ~12MB)
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB

/**
 * POST /api/upload
 * Accepts multipart/form-data with:
 *   file  — the file blob
 *   type  — optional hint: "image" | "video"  (needed when mime is octet-stream)
 *   folder — optional: "stories" | "products" (default: "products")
 *
 * Upload priority: Cloudinary (if configured) → Firebase Storage (fallback)
 * Returns { url, publicId?, mediaType, width?, height?, duration? }
 */
export async function POST(request: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return sendError('Authentication required', 401);
  }
  const decoded = verifyToken(authHeader.split(' ')[1]);
  if (!decoded) return sendError('Invalid or expired token', 401);

  try {
    const formData = await request.formData();
    const file     = formData.get('file') as File | null;
    const typeHint = (formData.get('type') as string | null)?.toLowerCase();   // "image" or "video"
    const folder   = (formData.get('folder') as string | null) ?? 'products';  // "stories" or "products"

    if (!file) return sendError('No file provided', 400);

    // ── Resolve MIME type — fall back on type hint when browser sends octet-stream ──
    let mimeType = file.type?.toLowerCase() || 'application/octet-stream';

    let isImage = mimeType in ALLOWED_IMAGE_TYPES;
    let isVideo = mimeType in ALLOWED_VIDEO_TYPES;

    // If octet-stream, use the typeHint to determine whether it's an image or video
    if (!isImage && !isVideo && mimeType === 'application/octet-stream') {
      if (typeHint === 'video') {
        isVideo = true;
        mimeType = 'video/mp4';
      } else {
        isImage = true;
        mimeType = 'image/jpeg';
      }
    }

    if (!isImage && !isVideo) {
      return sendError(
        `Unsupported file type "${file.type}". Allowed: JPEG, PNG, WebP, GIF, MP4, WebM, MOV.`,
        400
      );
    }

    const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (file.size > maxBytes) {
      return sendError(
        `File too large. Max: ${isVideo ? '100 MB for videos' : '15 MB for images'}.`,
        400
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext    = isVideo
      ? (ALLOWED_VIDEO_TYPES[mimeType] ?? 'mp4')
      : (ALLOWED_IMAGE_TYPES[mimeType] ?? 'jpg');
    const filename = `upload-${Date.now()}.${ext}`;

    // ── Try Cloudinary first ──────────────────────────────────────────────────
    const cloudinary = getCloudinary();

    if (cloudinary) {
      const result = await new Promise<{
        secure_url: string;
        public_id: string;
        resource_type: string;
        width?: number;
        height?: number;
        duration?: number;
      }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder:        `clw-marketplace/${folder}`,
            resource_type: isVideo ? 'video' : 'image',
            ...(isImage && {
              transformation: [
                { width: 1600, height: 1600, crop: 'limit', quality: 'auto', fetch_format: 'auto' },
              ],
            }),
            ...(isVideo && {
              eager: [{ format: 'mp4', quality: 'auto' }],
              eager_async: true,
            }),
          },
          (error: Error | undefined, res: Record<string, unknown> | undefined) => {
            if (error || !res) reject(error ?? new Error('Cloudinary returned empty result'));
            else resolve(res as any);
          }
        );
        stream.end(buffer);
      });

      return sendSuccess(
        {
          url:       result.secure_url,
          publicId:  result.public_id,
          mediaType: isVideo ? 'video' : 'image',
          provider:  'cloudinary',
          ...(result.width    !== undefined && { width:    result.width }),
          ...(result.height   !== undefined && { height:   result.height }),
          ...(result.duration !== undefined && { duration: result.duration }),
        },
        `${isVideo ? 'Video' : 'Image'} uploaded successfully`
      );
    }

    // ── Firebase Storage fallback (when Cloudinary not configured) ───────────
    console.log('[Upload] Cloudinary not configured — using Firebase Storage fallback');
    const storageFolder = `clw-marketplace/${folder}`;
    const publicUrl = await uploadToFirebaseStorage(buffer, filename, mimeType, storageFolder);

    return sendSuccess(
      {
        url:       publicUrl,
        mediaType: isVideo ? 'video' : 'image',
        provider:  'firebase-storage',
      },
      `${isVideo ? 'Video' : 'Image'} uploaded successfully`
    );

  } catch (err: unknown) {
    console.error('[Upload] Error:', err);
    const msg = err instanceof Error ? err.message : 'Upload failed';

    // Surface Cloudinary-specific config errors clearly
    if (msg.includes('Must supply') || msg.includes('cloud_name')) {
      return sendError(
        'Media upload is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in Netlify environment variables.',
        503
      );
    }

    // Firebase Storage billing error — Spark plan does not support server-side uploads
    if (
      msg.includes('billing') ||
      msg.includes('BILLING') ||
      msg.includes('403') ||
      msg.includes('does not have storage') ||
      msg.includes('Firebase Storage') ||
      msg.includes('bucket') ||
      msg.includes('BillingNotEnabled')
    ) {
      return sendError(
        'Image upload requires Firebase Storage (Blaze plan) or Cloudinary. ' +
        'To fix: either (A) upgrade Firebase to Blaze plan at console.firebase.google.com → your project → Upgrade, ' +
        'or (B) add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET to Netlify env vars (free at cloudinary.com).',
        503
      );
    }

    return sendServerError(msg);
  }
}
