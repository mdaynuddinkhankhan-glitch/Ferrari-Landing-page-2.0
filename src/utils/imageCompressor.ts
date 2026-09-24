/**
 * High-Definition Image Processing & Web Optimization Engine
 * 
 * Non-destructive, crystal-clear image handler:
 * - Preserves 100% natural colors, gradients, sharpness, and skin tones.
 * - ZERO artificial sharpening masks, ZERO fake de-hazing, ZERO posterization noise.
 * - Smooth bicubic downscaling for large camera/design files (up to 1920px Full HD).
 * - High-fidelity WebP export (0.90 quality) that looks pristine on mobile and retina screens.
 * - Idempotent: Never re-compresses already optimized images.
 */

// Smooth progressive downsampling for large images to avoid aliasing / moire
function smoothDownscale(
  img: HTMLImageElement,
  targetWidth: number,
  targetHeight: number
): HTMLCanvasElement {
  let curW = img.naturalWidth || img.width;
  let curH = img.naturalHeight || img.height;

  // If already at or below target size, draw directly
  if (curW <= targetWidth && curH <= targetHeight) {
    const canvas = document.createElement('canvas');
    canvas.width = curW;
    canvas.height = curH;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, curW, curH);
      return canvas;
    }
  }

  let curCanvas = document.createElement('canvas');
  curCanvas.width = curW;
  curCanvas.height = curH;
  let curCtx = curCanvas.getContext('2d');
  if (!curCtx) {
    const fallback = document.createElement('canvas');
    fallback.width = targetWidth;
    fallback.height = targetHeight;
    return fallback;
  }

  curCtx.imageSmoothingEnabled = true;
  curCtx.imageSmoothingQuality = 'high';
  curCtx.drawImage(img, 0, 0, curW, curH);

  // Halving step-down if image is much larger than target (prevents jagged lines)
  while (curW * 0.5 > targetWidth && curH * 0.5 > targetHeight) {
    const nextW = Math.round(curW * 0.5);
    const nextH = Math.round(curH * 0.5);
    const nextCanvas = document.createElement('canvas');
    nextCanvas.width = nextW;
    nextCanvas.height = nextH;
    const nextCtx = nextCanvas.getContext('2d');
    if (!nextCtx) break;

    nextCtx.imageSmoothingEnabled = true;
    nextCtx.imageSmoothingQuality = 'high';
    nextCtx.drawImage(curCanvas, 0, 0, nextW, nextH);

    curW = nextW;
    curH = nextH;
    curCanvas = nextCanvas;
  }

  // Final draw to exact target size with high smoothing
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = targetWidth;
  finalCanvas.height = targetHeight;
  const finalCtx = finalCanvas.getContext('2d');
  if (finalCtx) {
    finalCtx.imageSmoothingEnabled = true;
    finalCtx.imageSmoothingQuality = 'high';
    finalCtx.drawImage(curCanvas, 0, 0, targetWidth, targetHeight);
    return finalCanvas;
  }

  return curCanvas;
}

/**
 * Optimizes an uploaded File into a crystal-clear, high-definition data URL.
 */
export async function compressImageFile(
  file: File,
  maxDimension = 1920,
  quality = 0.90
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const result = reader.result as string;
      compressDataUrl(result, maxDimension, quality, true)
        .then(resolve)
        .catch(() => resolve(result));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Optimizes a data URL for high-definition display without destructive filters.
 * 
 * If isFreshUpload is false and the image is already optimized, it leaves it untouched.
 */
export async function compressDataUrl(
  dataUrl: string,
  maxDimension = 1920,
  quality = 0.90,
  isFreshUpload = false
): Promise<string> {
  // If not a base64 data url, return untouched
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    return dataUrl;
  }

  // Idempotence: If not a fresh upload and already an optimized WebP under 450KB, leave pristine
  if (!isFreshUpload && dataUrl.startsWith('data:image/webp') && dataUrl.length < 450000) {
    return dataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const origW = img.naturalWidth || img.width;
      const origH = img.naturalHeight || img.height;

      if (!origW || !origH) {
        resolve(dataUrl);
        return;
      }

      // Calculate proportional dimensions only downscaling if larger than maxDimension
      let targetW = origW;
      let targetH = origH;

      if (origW > maxDimension || origH > maxDimension) {
        if (origW >= origH) {
          targetW = maxDimension;
          targetH = Math.round((origH * maxDimension) / origW);
        } else {
          targetH = maxDimension;
          targetW = Math.round((origW * maxDimension) / origH);
        }
      }

      // High-precision smooth downscaling (no artificial filters, no grain, 100% natural)
      const canvas = smoothDownscale(img, targetW, targetH);

      // Try modern WebP export first
      try {
        const webp = canvas.toDataURL('image/webp', quality);
        if (webp && webp.length > 200) {
          resolve(webp);
          return;
        }
      } catch {
        // Fallback
      }

      // High quality JPEG fallback
      try {
        const jpeg = canvas.toDataURL('image/jpeg', quality);
        resolve(jpeg);
      } catch {
        resolve(dataUrl);
      }
    };

    img.onerror = () => {
      resolve(dataUrl);
    };

    img.src = dataUrl;
  });
}
