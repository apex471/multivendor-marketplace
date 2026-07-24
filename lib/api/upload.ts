import { getAuthToken } from './auth';

export async function uploadFileDirect(file: File, folder: string = 'products'): Promise<string> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');

  const resourceType = file.type.startsWith('video/') ? 'video' : 'image';

  // 1. Fetch direct upload signature / configuration from server
  const signRes = await fetch('/api/upload/sign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      filename: file.name,
      mimeType: file.type,
      folder,
      resourceType,
    }),
  });

  let signJson;
  const signClone = signRes.clone();
  try {
    signJson = await signRes.json();
  } catch {
    const errText = await signClone.text().catch(() => '');
    throw new Error(`Signature fetch failed (${signRes.status}): ${errText.slice(0, 100) || 'Unknown error'}`);
  }

  if (!signRes.ok || !signJson.success) {
    throw new Error(signJson.message || signJson.error || 'Failed to get upload signature');
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

    let uploadJson;
    const uploadClone = uploadRes.clone();
    try {
      uploadJson = await uploadRes.json();
    } catch {
      const errText = await uploadClone.text().catch(() => '');
      throw new Error(`Cloudinary upload failed (${uploadRes.status}): ${errText.slice(0, 100) || 'Unknown error'}`);
    }

    if (!uploadRes.ok || uploadJson.error) {
      throw new Error(uploadJson.error?.message || 'Cloudinary upload failed');
    }

    return uploadJson.secure_url as string;
  } else {
    // Firebase / GCS direct PUT upload
    const uploadRes = await fetch(config.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
      },
      body: file,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text().catch(() => '');
      throw new Error(`Firebase upload failed (${uploadRes.status}): ${errText.slice(0, 100) || 'Unknown error'}`);
    }

    return config.publicUrl as string;
  }
}
