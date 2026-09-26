import { compressImageFile, compressDataUrl } from '../utils/imageCompressor';

/**
 * Converts a data URL into a Blob
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/webp';
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Uploads a base64 image to free public Cloud CDN hosts (ImgBB / FreeImage)
 * Returning a permanent Full HD direct CDN URL (works 100% on Vercel/Netlify/Static)
 */
async function uploadToCloudCDN(dataUrl: string): Promise<string | null> {
  const base64Content = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  if (!base64Content) return null;

  const apiKeys = [
    '6d02734184d7692db08d39530d321a00',
    '3f4e8b0b8d5a88bf0a0bd0c9d7249a03',
  ];

  // Try ImgBB API keys
  for (const apiKey of apiKeys) {
    try {
      const formData = new FormData();
      formData.append('image', base64Content);

      const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data?.url) {
          return data.data.url;
        }
      }
    } catch (err) {
      console.warn(`ImgBB cloud upload notice (key ${apiKey.slice(0, 6)}...):`, err);
    }
  }

  // Try FreeImage.host API as backup CDN
  try {
    const formData = new FormData();
    formData.append('key', '6d02734184d7692db08d39530d321a00');
    formData.append('action', 'upload');
    formData.append('source', base64Content);
    formData.append('format', 'json');

    const res = await fetch('https://freeimage.host/api/1/upload', {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      if (data.status_code === 200 && data.image?.url) {
        return data.image.url;
      }
    }
  } catch (e) {
    console.warn('FreeImage host upload notice:', e);
  }

  return null;
}

/**
 * Optimizes an image File into a 100% Full HD, ultra-sharp WebP image (1920px / 1600px at 0.92 quality)
 * and uploads it to central server or Cloud CDN (for Vercel) or returns crisp HD WebP data URL.
 */
export async function uploadImageFileToCloud(
  file: File,
  folder: 'banners' | 'products' | 'sizechart' | 'general' = 'general'
): Promise<string> {
  const isBanner = folder === 'banners';
  const isSizeChart = folder === 'sizechart';
  const maxDim = isBanner ? 1920 : isSizeChart ? 1600 : 1600;
  const quality = 0.92;

  try {
    // 1. Compress image locally to crystal-clear 100% Full HD WebP
    const hdDataUrl = await compressImageFile(file, maxDim, quality);

    // 2. Try primary local Express server /api/upload endpoint
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl: hdDataUrl, folder }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.url) {
          return data.url;
        }
      }
    } catch {
      // Server API unreachable (e.g. Vercel static deployment)
    }

    // 3. Try Cloud CDN Upload (ImgBB / FreeImage) for Vercel
    const cdnUrl = await uploadToCloudCDN(hdDataUrl);
    if (cdnUrl) {
      return cdnUrl;
    }

    // 4. Fallback: Crisp HD WebP Data URL
    return hdDataUrl;
  } catch (err) {
    console.error('Failed to process image file:', err);
    throw err;
  }
}

/**
 * Optimizes a base64 Data URL to Full HD and uploads to central server, Cloud CDN, or returns clean URL.
 */
export async function uploadDataUrlToCloud(
  dataUrl: string,
  folder: 'banners' | 'products' | 'sizechart' | 'general' = 'general'
): Promise<string> {
  if (!dataUrl) return '';

  // If already a hosted CDN URL (http/https), return immediately without touching it
  if (!dataUrl.startsWith('data:image/')) {
    if (dataUrl.startsWith('/uploads/') && !dataUrl.includes('?v=')) {
      return `${dataUrl}?v=${Date.now()}`;
    }
    return dataUrl;
  }

  const isBanner = folder === 'banners';
  const isSizeChart = folder === 'sizechart';
  const maxDim = isBanner ? 1920 : isSizeChart ? 1600 : 1600;
  const quality = 0.92;

  try {
    const hdCompressed = await compressDataUrl(dataUrl, maxDim, quality, true);

    // 1. Try local server /api/upload endpoint
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl: hdCompressed, folder }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.url) {
          return data.url;
        }
      }
    } catch {
      // Unreachable server API (Vercel)
    }

    // 2. Try Cloud CDN Upload for Vercel
    const cdnUrl = await uploadToCloudCDN(hdCompressed);
    if (cdnUrl) {
      return cdnUrl;
    }

    // 3. Fallback: Return crisp HD WebP Data URL
    return hdCompressed;
  } catch (err) {
    console.warn('DataURL optimization note:', err);
    return dataUrl;
  }
}




