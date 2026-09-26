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
 * Uploads a compressed base64 data URL to the server API for permanent centralized storage
 */
async function postImageToServer(dataUrl: string, folder: string): Promise<string> {
  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl, folder }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.url) {
        return data.url;
      }
    }
  } catch (err) {
    console.warn('Server upload fallback to optimized WebP dataUrl:', err);
  }
  return dataUrl;
}

/**
 * Optimizes an image File into a high-definition, lightweight WebP image
 * and uploads it to the central server and cloud storage.
 */
export async function uploadImageFileToCloud(
  file: File,
  folder: 'banners' | 'products' | 'sizechart' | 'general' = 'general'
): Promise<string> {
  const isBanner = folder === 'banners';
  const isSizeChart = folder === 'sizechart';
  const maxDim = isBanner ? 1200 : isSizeChart ? 1000 : 800;
  const quality = isBanner ? 0.85 : 0.82;

  try {
    // 1. Compress image locally to crisp, lightweight WebP
    const compressedDataUrl = await compressImageFile(file, maxDim, quality);

    // 2. Upload to central server storage for permanent universal URL
    const serverUrl = await postImageToServer(compressedDataUrl, folder);
    return serverUrl;
  } catch (err) {
    console.error('Failed to process image file:', err);
    throw err;
  }
}

/**
 * Optimizes a base64 Data URL or returns an external URL directly.
 */
export async function uploadDataUrlToCloud(
  dataUrl: string,
  folder: 'banners' | 'products' | 'sizechart' | 'general' = 'general'
): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    return dataUrl;
  }

  const isBanner = folder === 'banners';
  const isSizeChart = folder === 'sizechart';
  const maxDim = isBanner ? 1200 : isSizeChart ? 1000 : 800;
  const quality = isBanner ? 0.85 : 0.82;

  try {
    const compressed = await compressDataUrl(dataUrl, maxDim, quality, true);
    const serverUrl = await postImageToServer(compressed, folder);
    return serverUrl;
  } catch (err) {
    console.warn('DataURL optimization note:', err);
    return dataUrl;
  }
}

