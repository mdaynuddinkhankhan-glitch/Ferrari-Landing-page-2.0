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
 * Optimizes an image File into a high-definition, ultra-compact WebP image
 * and uploads it to the central server so all devices access the exact same URL.
 */
export async function uploadImageFileToCloud(
  file: File,
  folder: 'banners' | 'products' | 'sizechart' | 'general' = 'general'
): Promise<string> {
  const isBanner = folder === 'banners';
  const isSizeChart = folder === 'sizechart';
  const maxDim = isBanner ? 1920 : isSizeChart ? 1600 : 1600;
  const quality = 0.94;

  try {
    // 1. Compress image locally to ultra high-definition crisp WebP
    const compressedDataUrl = await compressImageFile(file, maxDim, quality);

    // 2. Persist to central server /api/upload endpoint
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl: compressedDataUrl, folder }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.url) {
          return data.url;
        }
      }
    } catch (uploadErr) {
      console.warn('Central server image upload failed, falling back to WebP data URL:', uploadErr);
    }

    return compressedDataUrl;
  } catch (err) {
    console.error('Failed to process image file:', err);
    throw err;
  }
}

/**
 * Optimizes a base64 Data URL and uploads to central server or returns clean URL.
 */
export async function uploadDataUrlToCloud(
  dataUrl: string,
  folder: 'banners' | 'products' | 'sizechart' | 'general' = 'general'
): Promise<string> {
  if (!dataUrl) return '';

  // If already a hosted URL, append cache-busting timestamp if it's an uploaded asset
  if (!dataUrl.startsWith('data:image/')) {
    if (dataUrl.startsWith('/uploads/') && !dataUrl.includes('?v=')) {
      return `${dataUrl}?v=${Date.now()}`;
    }
    return dataUrl;
  }

  const isBanner = folder === 'banners';
  const isSizeChart = folder === 'sizechart';
  const maxDim = isBanner ? 1920 : isSizeChart ? 1600 : 1600;
  const quality = 0.94;

  try {
    const compressed = await compressDataUrl(dataUrl, maxDim, quality, true);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl: compressed, folder }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.url) {
          return data.url;
        }
      }
    } catch {
      // fallback to compressed dataUrl
    }

    return compressed;
  } catch (err) {
    console.warn('DataURL optimization note:', err);
    return dataUrl;
  }
}


