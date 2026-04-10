import { NextRequest } from 'next/server';
import { verifyToken } from '@/backend/utils/jwt';
import {
  sendError,
  sendSuccess,
  sendServerError,
} from '@/backend/utils/responseAppRouter';
import { v2 as cloudinary } from 'cloudinary';

/** Configure Cloudinary at request time (not module load) to survive build. */
function configure() {
  const name   = process.env.CLOUDINARY_CLOUD_NAME;
  const key    = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;

  if (!name || !key || !secret) {
    throw new Error(
      'Cloudinary credentials not configured.\n' +
      'Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET ' +
      'in Netlify → Site Settings → Environment Variables.'
    );
  }
  cloudinary.config({ cloud_name: name, api_key: key, api_secret: secret, secure: true });
}

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * POST /api/upload
 * Accepts multipart/form-data with a single `file` field.
 * Requires Bearer token (any authenticated user).
 * Returns { url, publicId, width, height }.
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
    configure();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file)                            return sendError('No file provided', 400);
    if (!ALLOWED_TYPES.has(file.type))    return sendError('Invalid file type. Allowed: JPEG, PNG, WebP, GIF', 400);
    if (file.size > MAX_BYTES)            return sendError('File too large. Maximum size is 5 MB', 400);

    // Web File → Node Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Stream-upload to Cloudinary
    const result = await new Promise<{
      secure_url: string;
      public_id: string;
      width: number;
      height: number;
    }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'clw-marketplace/products',
          resource_type: 'image',
          transformation: [
            { width: 1200, height: 1200, crop: 'limit', quality: 'auto', fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error || !result) reject(error ?? new Error('Upload returned empty result'));
          else resolve(result as { secure_url: string; public_id: string; width: number; height: number });
        }
      );
      stream.end(buffer);
    });

    return sendSuccess(
      {
        url:      result.secure_url,
        publicId: result.public_id,
        width:    result.width,
        height:   result.height,
      },
      'Image uploaded successfully'
    );
  } catch (err: unknown) {
    console.error('[Upload] Error:', err);
    return sendServerError(
      err instanceof Error ? err.message : 'Failed to upload image'
    );
  }
}
