/**
 * Standalone ready-to-use HTML, CSS, and JavaScript snippets
 * for Porshibari.shop image protection and diagonal watermarking.
 */

export const STANDALONE_PROTECTION_HTML = `<!-- 
  ==========================================================================
  Porshibari.shop Image Protection & Watermark Snippet
  Place this in your website's <head> or before </body>
  ==========================================================================
-->

<!-- 1. Include Protection CSS in <head> or Theme Customizer -->
<style id="porshibari-protection-css">
  /* Protected container */
  .pb-protected-container {
    position: relative !important;
    overflow: hidden !important;
    user-select: none !important;
    -webkit-user-select: none !important;
    -webkit-touch-callout: none !important;
  }

  /* Protected Image rules */
  .pb-protected-container img,
  img.pb-protected-image {
    -webkit-user-drag: none !important;
    user-select: none !important;
    pointer-events: auto !important;
  }

  /* Watermark Overlay - Diagonal Repeat */
  .pb-watermark-overlay {
    position: absolute !important;
    inset: 0 !important;
    pointer-events: none !important;
    z-index: 25 !important;
    background-repeat: repeat !important;
    background-position: center center !important;
    background-size: 280px 180px !important;
  }

  /* Top Transparent Shield */
  .pb-image-shield {
    position: absolute !important;
    inset: 0 !important;
    z-index: 20 !important;
    background: transparent !important;
    pointer-events: none !important;
  }

  /* Anti-theft warning toast */
  .pb-protection-toast {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%) translateY(100px);
    background: rgba(18, 18, 18, 0.95);
    border: 1px solid rgba(255, 20, 107, 0.5);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    padding: 10px 18px;
    border-radius: 9999px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6), 0 0 15px rgba(255, 20, 107, 0.3);
    z-index: 999999;
    opacity: 0;
    pointer-events: none;
    transition: transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }

  .pb-protection-toast.show {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }

  @media print {
    .pb-watermark-overlay {
      opacity: 0.35 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
</style>

<!-- 2. Include Protection JavaScript before </body> -->
<script id="porshibari-protection-js">
(function() {
  // Configuration
  var CONFIG = {
    watermarkText: 'Porshibari.shop',
    opacity: 0.20, // 20% opacity (15% - 25% recommended)
    preventRightClick: true,
    preventDrag: true,
    minImageSize: 40 // ignore small decorative icons
  };

  // Generate lightweight SVG pattern for diagonal watermark
  function getWatermarkSvg(text, opacity) {
    var safe = (text || 'Porshibari.shop').replace(/[<>&"]/g, '');
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="340" height="220" viewBox="0 0 340 220">' +
      '<defs>' +
        '<filter id="sh" x="-20%" y="-20%" width="140%" height="140%">' +
          '<feDropShadow dx="0" dy="1" stdDeviation="1.2" flood-color="#000000" flood-opacity="0.85" />' +
        '</filter>' +
      '</defs>' +
      '<g transform="rotate(-28 170 110)" opacity="' + opacity + '">' +
        '<text x="50%" y="45%" text-anchor="middle" dominant-baseline="middle" ' +
              'fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, Roboto, sans-serif" ' +
              'font-weight="800" font-size="20" letter-spacing="2.5" filter="url(#sh)" ' +
              'stroke="#000000" stroke-width="0.5" stroke-opacity="0.6">' + safe + '</text>' +
        '<text x="50%" y="62%" text-anchor="middle" dominant-baseline="middle" ' +
              'fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, Roboto, sans-serif" ' +
              'font-weight="700" font-size="10.5" letter-spacing="3.5" filter="url(#sh)" opacity="0.9">' +
              'ORIGINAL VERIFIED</text>' +
      '</g>' +
    '</svg>';
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  // Toast notification
  var toastTimer = null;
  function showToast(msg) {
    var toast = document.getElementById('pb-protection-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'pb-protection-toast';
      toast.className = 'pb-protection-toast';
      document.body.appendChild(toast);
    }
    toast.innerHTML = '<span style="color:#ff146b;font-weight:bold;margin-right:6px;">🔒</span>' +
      '<span style="color:#ffffff;font-size:13px;font-weight:600;">' + (msg || 'এই ছবিটি Porshibari.shop এর স্বত্বাধিকার সংরক্ষিত') + '</span>';
    toast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function() {
      toast.classList.remove('show');
    }, 2500);
  }

  // Protect single image
  function applyProtection(img) {
    if (!img || img.dataset.pbProtected === 'true') return;
    img.dataset.pbProtected = 'true';
    img.setAttribute('draggable', 'false');
    img.classList.add('pb-protected-image');

    var parent = img.parentElement;
    if (!parent) return;

    // Avoid duplicate overlays
    if (parent.querySelector('.pb-watermark-overlay')) return;

    var style = window.getComputedStyle(parent);
    if (style.position === 'static') {
      parent.style.position = 'relative';
    }
    parent.classList.add('pb-protected-container');

    // Create watermark overlay
    var overlay = document.createElement('div');
    overlay.className = 'pb-watermark-overlay';
    overlay.style.backgroundImage = 'url("' + getWatermarkSvg(CONFIG.watermarkText, CONFIG.opacity) + '")';
    parent.appendChild(overlay);
  }

  // Scan all product & visual images
  function scanImages() {
    var imgs = document.querySelectorAll('img:not([data-pb-ignore="true"])');
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      if (img.width > CONFIG.minImageSize || img.height > CONFIG.minImageSize || !img.complete) {
        applyProtection(img);
      }
    }
  }

  // Context menu prevention
  document.addEventListener('contextmenu', function(e) {
    var target = e.target;
    if (!target) return;
    if (target.tagName === 'IMG' || target.closest('.pb-protected-container')) {
      if (CONFIG.preventRightClick) {
        e.preventDefault();
        showToast();
      }
    }
  }, true);

  // Drag prevention
  document.addEventListener('dragstart', function(e) {
    var target = e.target;
    if (!target) return;
    if (target.tagName === 'IMG' || target.closest('.pb-protected-container')) {
      if (CONFIG.preventDrag) {
        e.preventDefault();
        return false;
      }
    }
  }, true);

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scanImages);
  } else {
    scanImages();
  }

  // MutationObserver for dynamic Ajax / product slider / modal loads
  if (window.MutationObserver) {
    var observer = new MutationObserver(function() {
      scanImages();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
</script>
`;
