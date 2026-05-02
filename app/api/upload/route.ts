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

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
]);

const ALLOWED_VIDEO_TYPES = new Set([
  'video/mp4', 'video/webm', 'video/quicktime', 'video/ogg',
  'video/x-msvideo', 'video/mpeg',
]);

const MAX_IMAGE_BYTES = 5  * 1024 * 1024;  //   5 MB
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB

/**
 * POST /api/upload
 * Accepts multipart/form-data with a single `file` field.
 * Supports images (≤5 MB) and videos (≤100 MB).
 * Requires Bearer token (any authenticated user).
 * Returns { url, publicId, mediaType, width?, height?, duration? }.
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
    if (!file) return sendError('No file provided', 400);

    const isImage = ALLOWED_IMAGE_TYPES.has(file.type);
    const isVideo = ALLOWED_VIDEO_TYPES.has(file.type);

    if (!isImage && !isVideo) {
      return sendError(
        'Unsupported file type. Images: JPEG, PNG, WebP, GIF. Videos: MP4, WebM, MOV, OGG, AVI.',
        400
      );
    }

    const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (file.size > maxBytes) {
      return sendError(
        `File too large. Maximum size: ${isVideo ? '100 MB for videos' : '5 MB for images'}.`,
        400
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Stream-upload to Cloudinary
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
          folder:        'clw-marketplace/products',
          resource_type: isVideo ? 'video' : 'image',
          ...(isImage && {
            transformation: [
              { width: 1200, height: 1200, crop: 'limit', quality: 'auto', fetch_format: 'auto' },
            ],
          }),
          ...(isVideo && {
            eager: [{ format: 'mp4', quality: 'auto' }],
            eager_async: true,
          }),
        },
        (error, res) => {
          if (error || !res) reject(error ?? new Error('Upload returned empty result'));
          else resolve(res as typeof result extends Promise<infer T> ? T : never);
        }
      );
      stream.end(buffer);
    });

    return sendSuccess(
      {
        url:       result.secure_url,
        publicId:  result.public_id,
        mediaType: isVideo ? 'video' : 'image',
        ...(result.width    !== undefined && { width:    result.width }),
        ...(result.height   !== undefined && { height:   result.height }),
        ...(result.duration !== undefined && { duration: result.duration }),
      },
      `${isVideo ? 'Video' : 'Image'} uploaded successfully`
    );
  } catch (err: unknown) {
    console.error('[Upload] Error:', err);
    return sendServerError(
      err instanceof Error ? err.message : 'Upload failed'
    );
  }
}
