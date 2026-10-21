import { getAuthToken } from './auth';

/**
 * Client-side image pre-compression:
 * Compresses oversized images (>2.5MB, e.g. from iPhone cameras) down to a maximum
 * dimension of 1920px at 88% JPEG quality before uploading.
 * This prevents timeouts, saves bandwidth, and ensures ultra-fast uploads even
 * on mobile data connections.
 */
async function compressImageIfNeeded(file: File): Promise<File> {
  const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(file.name);
  if (!isImage || file.type === 'image/gif') return file;
  if (file.size <= 2.5 * 1024 * 1024 || typeof window === 'undefined') return file;

  try {
    let sourceWidth = 0;
    let sourceHeight = 0;
    let sourceCanvasOrImage: CanvasImageSource | null = null;

    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(file);
      sourceWidth = bitmap.width;
      sourceHeight = bitmap.height;
      sourceCanvasOrImage = bitmap;
    } else {
      sourceCanvasOrImage = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
      });
      sourceWidth = (sourceCanvasOrImage as HTMLImageElement).naturalWidth;
      sourceHeight = (sourceCanvasOrImage as HTMLImageElement).naturalHeight;
    }

    if (!sourceCanvasOrImage || sourceWidth === 0 || sourceHeight === 0) return file;

    const maxDim = 1920;
    let targetWidth = sourceWidth;
    let targetHeight = sourceHeight;

    if (targetWidth > maxDim || targetHeight > maxDim) {
      if (targetWidth > targetHeight) {
        targetHeight = Math.round((targetHeight * maxDim) / targetWidth);
        targetWidth = maxDim;
      } else {
        targetWidth = Math.round((targetWidth * maxDim) / targetHeight);
        targetHeight = maxDim;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.drawImage(sourceCanvasOrImage, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.88);
    });

    if (blob && blob.size < file.size) {
      const newName = file.name.replace(/\.[^.]+$/, '.jpg');
      return new File([blob], newName, { type: 'image/jpeg' });
    }
  } catch (err) {
    console.warn('[compressImageIfNeeded] Compression bypassed, using original file:', err);
  }

  return file;
}

async function uploadViaServerApi(file: File, folder: string, token: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);
  formData.append('type', file.type.startsWith('video/') ? 'video' : 'image');

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) {
      if (res.status === 413) {
        throw new Error('File exceeds the server upload limit. Please select a smaller file (under 6MB) or try again.');
      }
      throw new Error(json.message || json.error || `Upload failed with status ${res.status}`);
    }
    return json.data.url as string;
  } catch (err) {
    if (err instanceof TypeError && (err.message === 'Load failed' || err.message === 'Failed to fetch')) {
      throw new Error('Upload connection failed. If uploading a large video or image, please ensure you have a stable network connection.');
    }
    throw err;
  }
}

export async function uploadFileDirect(inputFile: File, folder: string = 'products'): Promise<string> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');

  // Pre-compress large photos if applicable
  const file = await compressImageIfNeeded(inputFile);

  const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm|ogg|m4v)$/i.test(file.name);
  const resourceType = isVideo ? 'video' : 'image';
  const mimeType = file.type || (isVideo ? 'video/mp4' : 'image/jpeg');

  try {
    // 1. Fetch direct upload signature / configuration from server
    const signRes = await fetch('/api/upload/sign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        filename: file.name,
        mimeType,
        folder,
        resourceType,
      }),
    });

    if (!signRes.ok) {
      throw new Error(`Signature endpoint returned status ${signRes.status}`);
    }

    const signJson = await signRes.json().catch(() => null);
    if (!signJson || !signJson.success || !signJson.data) {
      throw new Error(signJson?.message || 'Failed to get upload configuration');
    }

    const config = signJson.data;

    // 2. Perform direct upload based on provider
    if (config.provider === 'cloudinary') {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', config.apiKey);
      formData.append('timestamp', String(config.timestamp));
      formData.append('signature', config.signature);
      formData.append('folder', config.folder);

      const uploadRes = await fetch(config.uploadUrl, {
        method: 'POST',
        body: formData,
      });

      const uploadJson = await uploadRes.json().catch(() => null);
      if (!uploadRes.ok || !uploadJson || uploadJson.error) {
        throw new Error(uploadJson?.error?.message || 'Cloudinary upload failed');
      }

      return uploadJson.secure_url as string;
    } else {
      // Firebase / GCS direct PUT upload attempt
      const uploadRes = await fetch(config.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': config.mimeType || mimeType,
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error(`Direct GCS PUT upload failed (${uploadRes.status})`);
      }

      return config.publicUrl as string;
    }
  } catch (err) {
    console.warn('[uploadFileDirect] Direct signed upload failed, falling back to server API upload:', err);
    return await uploadViaServerApi(file, folder, token);
  }
}
