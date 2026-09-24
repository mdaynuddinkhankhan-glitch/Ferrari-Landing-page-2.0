/**
 * Porshibari.shop - Professional Image Protection & Watermark System
 * 
 * Features:
 * - Dynamic repeating diagonal watermark ("Porshibari.shop") across images/banners
 * - 15%-25% semi-transparent opacity for optimal visibility without hindering product appeal
 * - High z-index layer with `pointer-events: none` to never block clicks/interactions
 * - Anti-right-click and drag-and-drop shield overlay
 * - MutationObserver to automatically protect existing and dynamically injected images
 * - Mobile & desktop responsive scaling
 * - 100% preserves original image quality (zero asset modification)
 */

export interface WatermarkConfig {
  text?: string;
  opacity?: number; // e.g. 0.15 to 0.25 (15% to 25%)
  preventRightClick?: boolean;
  preventDrag?: boolean;
  diagonalRepeat?: boolean;
  showCenterBadge?: boolean;
}

const DEFAULT_CONFIG: Required<WatermarkConfig> = {
  text: 'Porshibari.shop',
  opacity: 0.20,
  preventRightClick: true,
  preventDrag: true,
  diagonalRepeat: true,
  showCenterBadge: true,
};

/**
 * Creates an optimized repeating SVG pattern data URL for diagonal watermarking.
 * Clean, modern typography with dual-tone drop shadow for maximum legibility on both dark and light images.
 */
export function createDiagonalWatermarkSvg(text: string = 'Porshibari.shop', opacity: number = 0.20): string {
  const safeText = text.replace(/[<>&"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '"': return '&quot;';
      default: return c;
    }
  });

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="340" height="220" viewBox="0 0 340 220">
  <defs>
    <filter id="wm-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="1" stdDeviation="1.2" flood-color="#000000" flood-opacity="0.85" />
    </filter>
  </defs>
  <g transform="rotate(-28 170 110)" opacity="${Math.max(0.05, Math.min(0.6, opacity))}">
    <!-- Primary diagonal watermark -->
    <text x="50%" y="45%" text-anchor="middle" dominant-baseline="middle"
          fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
          font-weight="800" font-size="20" letter-spacing="2.5" filter="url(#wm-shadow)"
          stroke="#000000" stroke-width="0.5" stroke-opacity="0.6">
      ${safeText}
    </text>
    <text x="50%" y="62%" text-anchor="middle" dominant-baseline="middle"
          fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
          font-weight="700" font-size="10.5" letter-spacing="3.5" filter="url(#wm-shadow)"
          opacity="0.9">
      ORIGINAL VERIFIED
    </text>
  </g>
</svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

let isGlobalProtectionInitialized = false;
let globalObserver: MutationObserver | null = null;
let currentActiveConfig: Required<WatermarkConfig> = { ...DEFAULT_CONFIG };

/**
 * Shows a subtle, modern toast notification when unauthorized image save is attempted
 */
let toastTimeout: ReturnType<typeof setTimeout> | null = null;
export function showProtectionToast(message: string = '⚠️ এই ছবিটি Porshibari.shop এর স্বত্বাধিকার সংরক্ষিত') {
  if (typeof document === 'undefined') return;

  let toast = document.getElementById('pb-protection-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'pb-protection-toast';
    toast.className = 'pb-protection-toast';
    document.body.appendChild(toast);
  }

  toast.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff146b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
      </svg>
      <span style="font-weight:600;font-size:13px;color:#ffffff;letter-spacing:0.3px;">${message}</span>
    </div>
  `;

  toast.classList.add('show');

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast?.classList.remove('show');
  }, 2600);
}

/**
 * Attaches protection overlay and event handlers to a specific image element or container
 */
export function protectImageElement(imgElement: HTMLImageElement, config: WatermarkConfig = {}) {
  if (!imgElement || imgElement.dataset.pbProtected === 'true') return;

  // Mark element as protected
  imgElement.dataset.pbProtected = 'true';
  imgElement.setAttribute('draggable', 'false');
  (imgElement.style as any).webkitUserDrag = 'none';
  imgElement.style.userSelect = 'none';

  // Prevent right-click context menu on image
  imgElement.addEventListener('contextmenu', (e) => {
    if (currentActiveConfig.preventRightClick) {
      e.preventDefault();
      showProtectionToast();
    }
  });

  // Prevent drag start
  imgElement.addEventListener('dragstart', (e) => {
    if (currentActiveConfig.preventDrag) {
      e.preventDefault();
      return false;
    }
  });

  // Check parent container
  const parent = imgElement.parentElement;
  if (!parent) return;

  // If parent already has a watermark overlay, skip injecting duplicate overlay
  if (parent.querySelector('.pb-watermark-overlay')) return;

  // Ensure parent has position relative/absolute/fixed
  const computedStyle = window.getComputedStyle(parent);
  if (computedStyle.position === 'static') {
    parent.style.position = 'relative';
  }

  // Create Watermark Overlay container
  const overlay = document.createElement('div');
  overlay.className = 'pb-watermark-overlay';
  overlay.setAttribute('aria-hidden', 'true');

  const svgDataUrl = createDiagonalWatermarkSvg(
    config.text || currentActiveConfig.text,
    config.opacity ?? currentActiveConfig.opacity
  );

  overlay.style.backgroundImage = `url("${svgDataUrl}")`;
  overlay.style.backgroundRepeat = 'repeat';
  overlay.style.backgroundSize = '280px 180px';
  overlay.style.pointerEvents = 'none';
  overlay.style.position = 'absolute';
  overlay.style.inset = '0';
  overlay.style.zIndex = '20';

  parent.appendChild(overlay);
}

/**
 * Initializes the global protection engine across the entire webpage
 */
export function initGlobalImageProtection(customConfig?: WatermarkConfig) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  if (customConfig) {
    currentActiveConfig = {
      ...DEFAULT_CONFIG,
      ...customConfig,
    };
  }

  // Scan and protect existing images
  const scanAndProtect = () => {
    const images = document.querySelectorAll<HTMLImageElement>(
      'img:not([data-pb-ignore="true"])'
    );
    images.forEach((img) => {
      // Don't auto-protect small icons (e.g. < 24px) unless explicitly requested
      if (img.width > 32 || img.height > 32 || !img.complete) {
        protectImageElement(img, currentActiveConfig);
      }
    });
  };

  // Run on initial load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scanAndProtect);
  } else {
    scanAndProtect();
  }

  // Global right-click and drag prevention on protected containers
  if (!isGlobalProtectionInitialized) {
    document.addEventListener('contextmenu', (e) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const isProtected =
        target.closest('.pb-protected-container') ||
        target.closest('[data-pb-protected="true"]') ||
        target.tagName === 'IMG';

      if (isProtected && currentActiveConfig.preventRightClick) {
        e.preventDefault();
        showProtectionToast();
      }
    }, true);

    document.addEventListener('dragstart', (e) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const isProtected =
        target.closest('.pb-protected-container') ||
        target.closest('[data-pb-protected="true"]') ||
        target.tagName === 'IMG';

      if (isProtected && currentActiveConfig.preventDrag) {
        e.preventDefault();
        return false;
      }
    }, true);

    // MutationObserver to catch dynamically added product images, banners, or modals
    if (typeof MutationObserver !== 'undefined') {
      globalObserver = new MutationObserver((mutations) => {
        let hasNewImages = false;
        for (const mutation of mutations) {
          if (mutation.addedNodes.length > 0) {
            hasNewImages = true;
            break;
          }
        }
        if (hasNewImages) {
          scanAndProtect();
        }
      });

      globalObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    isGlobalProtectionInitialized = true;
  }
}

/**
 * Updates the global watermark configuration dynamically (e.g. from Admin Dashboard)
 */
export function updateWatermarkConfig(newConfig: Partial<WatermarkConfig>) {
  currentActiveConfig = {
    ...currentActiveConfig,
    ...newConfig,
  };

  if (typeof document === 'undefined') return;

  const svgDataUrl = createDiagonalWatermarkSvg(
    currentActiveConfig.text,
    currentActiveConfig.opacity
  );

  const overlays = document.querySelectorAll<HTMLElement>('.pb-watermark-overlay');
  overlays.forEach((el) => {
    el.style.backgroundImage = `url("${svgDataUrl}")`;
  });
}
