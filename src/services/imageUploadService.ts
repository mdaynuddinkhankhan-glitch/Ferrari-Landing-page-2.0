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
 * Uploads a base64 image data URL to ImgBB free cloud host (works on Vercel/Netlify/Static)
 */
async function uploadToImgBB(dataUrl: string): Promise<string | null> {
  try {
    const base64Content = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
    if (!base64Content) return null;

    const formData = new FormData();
    formData.append('image', base64Content);

    // Free public API key for ImgBB cloud storage
    const apiKey = '6d02734184d7692db08d39530d321a00';
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
    console.warn('ImgBB cloud upload fallback notice:', err);
  }
  return null;
}

/**
 * Optimizes an image File into a high-definition, ultra-compact WebP image
 * and uploads it to central server or ImgBB Cloud (for Vercel) or returns ultra-compact WebP.
 */
export async function uploadImageFileToCloud(
  file: File,
  folder: 'banners' | 'products' | 'sizechart' | 'general' = 'general'
): Promise<string> {
  const isBanner = folder === 'banners';
  const isSizeChart = folder === 'sizechart';
  const maxDim = isBanner ? 1200 : isSizeChart ? 1200 : 800;
  const quality = isBanner ? 0.82 : 0.78;

  try {
    // 1. Compress image locally to crisp, ultra-compact WebP
    const compressedDataUrl = await compressImageFile(file, maxDim, quality);

    // 2. Try primary local Express server /api/upload endpoint
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
    } catch {
      // Local server API unreachable (e.g. Vercel deployment)
    }

    // 3. Try ImgBB Cloud Upload (works 100% on Vercel without local server)
    const cloudUrl = await uploadToImgBB(compressedDataUrl);
    if (cloudUrl) {
      return cloudUrl;
    }

    // 4. Fallback: Ultra-compact WebP Data URL (~20KB) that easily fits in Firestore & localStorage
    return compressedDataUrl;
  } catch (err) {
    console.error('Failed to process image file:', err);
    throw err;
  }
}

/**
 * Optimizes a base64 Data URL and uploads to central server, ImgBB Cloud, or returns compact URL.
 */
export async function uploadDataUrlToCloud(
  dataUrl: string,
  folder: 'banners' | 'products' | 'sizechart' | 'general' = 'general'
): Promise<string> {
  if (!dataUrl) return '';

  // If already a hosted URL (http/https), return immediately
  if (!dataUrl.startsWith('data:image/')) {
    if (dataUrl.startsWith('/uploads/') && !dataUrl.includes('?v=')) {
      return `${dataUrl}?v=${Date.now()}`;
    }
    return dataUrl;
  }

  const isBanner = folder === 'banners';
  const isSizeChart = folder === 'sizechart';
  const maxDim = isBanner ? 1200 : isSizeChart ? 1200 : 800;
  const quality = isBanner ? 0.82 : 0.78;

  try {
    const compressed = await compressDataUrl(dataUrl, maxDim, quality, true);

    // 1. Try local server /api/upload endpoint
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
      // Unreachable server API (Vercel)
    }

    // 2. Try ImgBB Cloud Upload (for Vercel)
    const cloudUrl = await uploadToImgBB(compressed);
    if (cloudUrl) {
      return cloudUrl;
    }

    // 3. Return ultra-compact WebP Data URL
    return compressed;
  } catch (err) {
    console.warn('DataURL optimization note:', err);
    return dataUrl;
  }
}



