/**
 * Optimizes Cloudinary media URLs by injecting f_auto,q_auto formatting.
 * For videos, it also limits resolution to 720p (w_1280,c_limit) for optimal loading times.
 */
export function optimizeMediaUrl(url: string | null | undefined, type: 'image' | 'video' = 'image'): string {
  if (!url) return '';
  if (url.includes('cloudinary.com')) {
    const uploadIndex = url.indexOf('/upload/');
    if (uploadIndex !== -1) {
      const prefix = url.substring(0, uploadIndex + 8);
      const suffix = url.substring(uploadIndex + 8);
      
      // Prevent double optimization
      if (!suffix.startsWith('f_auto') && !suffix.startsWith('q_auto')) {
        if (type === 'video') {
          return `${prefix}f_auto,q_auto,w_1280,c_limit/${suffix}`;
        }
        return `${prefix}f_auto,q_auto/${suffix}`;
      }
    }
  }
  return url;
}
