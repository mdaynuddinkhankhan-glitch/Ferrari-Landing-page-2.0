import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getSafeStorage } from '../lib/firebase';
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
 * Uploads an image File to Firebase Cloud Storage if available,
 * or returns an optimized, ultra-compact WebP data URL synced through Firestore.
 */
export async function uploadImageFileToCloud(
  file: File,
  folder: 'banners' | 'products' | 'sizechart' | 'general' = 'general'
): Promise<string> {
  const isBanner = folder === 'banners';
  const maxDim = isBanner ? 1200 : 800;
  const quality = isBanner ? 0.85 : 0.80;

  try {
    // 1. First compress the image locally to crisp, lightweight WebP
    const compressedDataUrl = await compressImageFile(file, maxDim, quality);

    // 2. Attempt upload to Firebase Storage if available
    const storageInst = getSafeStorage();
    if (storageInst) {
      try {
        const blob = dataUrlToBlob(compressedDataUrl);
        const filename = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.webp`;
        const storageRef = ref(storageInst, `uploads/${folder}/${filename}`);

        const uploadResult = await uploadBytes(storageRef, blob, {
          contentType: 'image/webp',
          cacheControl: 'public, max-age=31536000',
        });

        const downloadUrl = await getDownloadURL(uploadResult.ref);
        return `${downloadUrl}?v=${Date.now()}`;
      } catch (storageErr) {
        console.warn('Firebase Storage upload notice, using compact cloud payload fallback:', storageErr);
      }
    }

    return compressedDataUrl;
  } catch (err) {
    console.error('Failed to process image file:', err);
    throw err;
  }
}

/**
 * Uploads a base64 Data URL to Firebase Cloud Storage if available,
 * or returns an optimized WebP string.
 */
export async function uploadDataUrlToCloud(
  dataUrl: string,
  folder: 'banners' | 'products' | 'sizechart' | 'general' = 'general'
): Promise<string> {
  // If already an external HTTPS/HTTP URL or static asset URL, return as is
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    return dataUrl;
  }

  const isBanner = folder === 'banners';
  const maxDim = isBanner ? 1200 : 800;
  const quality = isBanner ? 0.85 : 0.80;

  try {
    const compressed = await compressDataUrl(dataUrl, maxDim, quality, true);

    const storageInst = getSafeStorage();
    if (storageInst) {
      try {
        const blob = dataUrlToBlob(compressed);
        const filename = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.webp`;
        const storageRef = ref(storageInst, `uploads/${folder}/${filename}`);

        const uploadResult = await uploadBytes(storageRef, blob, {
          contentType: 'image/webp',
          cacheControl: 'public, max-age=31536000',
        });

        const downloadUrl = await getDownloadURL(uploadResult.ref);
        return `${downloadUrl}?v=${Date.now()}`;
      } catch (storageErr) {
        console.warn('Firebase Storage upload notice, using compact cloud payload fallback:', storageErr);
      }
    }

    return compressed;
  } catch (err) {
    console.warn('DataURL cloud upload notice:', err);
    return dataUrl;
  }
}
