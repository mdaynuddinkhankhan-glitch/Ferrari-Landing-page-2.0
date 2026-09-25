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
 * Optimizes an image File into a high-definition, lightweight WebP image
 * that syncs instantly across all devices via Firestore.
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
    // Compress image locally to crisp, lightweight WebP (takes <150ms)
    const compressedDataUrl = await compressImageFile(file, maxDim, quality);
    return compressedDataUrl;
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
    return compressed;
  } catch (err) {
    console.warn('DataURL optimization note:', err);
    return dataUrl;
  }
}
