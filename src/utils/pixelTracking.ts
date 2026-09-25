/**
 * Real Meta (Facebook) & TikTok Pixel tracking engine
 * Supports client-side JS SDK injection, event dispatching, and Conversions API.
 */
import { SiteSettings, getStoredSettings } from './siteSettings';

declare global {
  interface Window {
    fbq?: any;
    _fbq?: any;
    ttq?: any;
  }
}

// Simple SHA-256 for browser-side hashing (Conversions API compliance)
async function sha256(message: string): Promise<string> {
  try {
    const msgBuffer = new TextEncoder().encode(message.trim().toLowerCase());
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return message;
  }
}

let fbInitializedId: string | null = null;
let ttInitializedId: string | null = null;
let activeFbTestCode: string | null = null;
let activeTtTestCode: string | null = null;

/**
 * Clean & normalize a Facebook Pixel ID
 * Extracts pure digits (handles accidentally pasted "Pixel ID: 123456789012345" or quotes)
 */
export function cleanFacebookPixelId(rawId?: string | null): string {
  if (!rawId) return '';
  const str = String(rawId).trim();
  const digitsOnly = str.replace(/[^0-9]/g, '');
  return digitsOnly.length >= 10 ? digitsOnly : str;
}

/**
 * Clean & normalize a TikTok Pixel ID
 */
export function cleanTikTokPixelId(rawId?: string | null): string {
  if (!rawId) return '';
  return String(rawId).replace(/[^a-zA-Z0-9_-]/g, '').trim();
}

/**
 * Initialize Facebook Pixel on the page with real JS SDK & noscript fallback
 */
export function initFacebookPixel(pixelId: string, testEventCode?: string): void {
  if (!pixelId || typeof window === 'undefined') return;

  const cleanId = cleanFacebookPixelId(pixelId);
  if (!cleanId) return;

  if (testEventCode && testEventCode.trim()) {
    activeFbTestCode = testEventCode.trim();
  }

  try {
    // If already loaded for this pixel ID, just update test event code
    if (window.fbq && fbInitializedId === cleanId) {
      return;
    }

    /* eslint-disable */
    if (!window.fbq) {
      (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
        if (f.fbq) return;
        n = f.fbq = function () {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n;
        n.push = n;
        n.loaded = true;
        n.version = '2.0';
        n.queue = [];
        t = b.createElement(e);
        t.async = true;
        t.src = v;
        s = b.getElementsByTagName(e)[0];
        if (s && s.parentNode) {
          s.parentNode.insertBefore(t, s);
        } else {
          document.head.appendChild(t);
        }
      })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    }
    /* eslint-enable */

    window.fbq('init', cleanId);
    fbInitializedId = cleanId;

    // Attach standard noscript fallback beacon
    try {
      const existingNoscript = document.getElementById('meta-pixel-noscript');
      if (!existingNoscript && document.body) {
        const noscript = document.createElement('noscript');
        noscript.id = 'meta-pixel-noscript';
        const img = document.createElement('img');
        img.height = 1;
        img.width = 1;
        img.style.display = 'none';
        img.src = `https://www.facebook.com/tr?id=${cleanId}&ev=PageView&noscript=1`;
        noscript.appendChild(img);
        document.body.appendChild(noscript);
      }
    } catch {}

    const options = activeFbTestCode ? { test_event_code: activeFbTestCode } : {};
    window.fbq('track', 'PageView', {}, options);
    console.log(`[Pixel] Facebook Pixel initialized successfully: ${cleanId}${activeFbTestCode ? ` (Test Code: ${activeFbTestCode})` : ''}`);
  } catch (err) {
    console.warn('[Pixel] Facebook Pixel initialization warning:', err);
  }
}

/**
 * Initialize TikTok Pixel on the page with real JS script
 */
export function initTikTokPixel(pixelId: string, testEventCode?: string): void {
  if (!pixelId || typeof window === 'undefined') return;

  const cleanId = cleanTikTokPixelId(pixelId);
  if (!cleanId) return;

  if (testEventCode && testEventCode.trim()) {
    activeTtTestCode = testEventCode.trim();
  }

  try {
    if (window.ttq && ttInitializedId === cleanId) {
      return;
    }

    /* eslint-disable */
    (function (w: any, d: any, t: any) {
      w.TiktokAnalyticsObject = t;
      var ttq = (w[t] = w[t] || []);
      ttq.methods = [
        'page',
        'track',
        'identify',
        'instances',
        'debug',
        'on',
        'off',
        'once',
        'ready',
        'alias',
        'group',
        'enableCookie',
        'disableCookie',
        'holdConsent',
        'revokeConsent',
        'grantConsent',
      ];
      ttq.setAndDefer = function (t: any, e: any) {
        t[e] = function () {
          t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
        };
      };
      for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
      ttq.instance = function (t: any) {
        for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]);
        return e;
      };
      ttq.load = function (e: any, n: any) {
        var r = 'https://analytics.tiktok.com/i18n/pixel/events.js',
          o = n && n.partner;
        ttq._i = ttq._i || {};
        ttq._i[e] = [];
        ttq._i[e]._u = r;
        ttq._t = ttq._t || {};
        ttq._t[e] = +new Date();
        ttq._o = ttq._o || {};
        ttq._o[e] = n || {};
        var a = document.createElement('script');
        a.type = 'text/javascript';
        a.async = true;
        a.src = r + '?sdkid=' + e + '&lib=' + t;
        var c = document.getElementsByTagName('script')[0];
        if (c && c.parentNode) {
          c.parentNode.insertBefore(a, c);
        } else {
          document.head.appendChild(a);
        }
      };
      ttq.load(cleanId);
      ttq.page();
    })(window, document, 'ttq');
    /* eslint-enable */

    ttInitializedId = cleanId;
    console.log(`[Pixel] TikTok Pixel initialized successfully: ${cleanId}`);
  } catch (err) {
    console.warn('[Pixel] TikTok Pixel initialization warning:', err);
  }
}

/**
 * Ensure pixels are active based on stored or provided settings
 */
function ensurePixelsActive(): void {
  try {
    if (!fbInitializedId || !ttInitializedId) {
      const stored = getStoredSettings();
      if (!fbInitializedId && stored.fbPixelId) {
        initFacebookPixel(stored.fbPixelId, stored.fbTestEventCode);
      }
      if (!ttInitializedId && stored.ttPixelId) {
        initTikTokPixel(stored.ttPixelId, stored.ttTestEventCode);
      }
    }
  } catch {}
}

/**
 * Sync pixels from SiteSettings
 */
export function syncPixelsFromSettings(settings: SiteSettings): void {
  if (settings.fbPixelId) {
    initFacebookPixel(settings.fbPixelId, settings.fbTestEventCode);
  }
  if (settings.ttPixelId) {
    initTikTokPixel(settings.ttPixelId, settings.ttTestEventCode);
  }
}

/**
 * Track PageView event
 */
export function trackPageView(): void {
  ensurePixelsActive();
  try {
    if (typeof window !== 'undefined') {
      const options = activeFbTestCode ? { test_event_code: activeFbTestCode } : {};
      if (window.fbq) {
        window.fbq('track', 'PageView', {}, options);
      }
      if (window.ttq) {
        window.ttq.page();
      }
    }
  } catch (err) {
    console.warn('[Pixel] PageView tracking warning:', err);
  }
}

/**
 * Track ViewContent event
 */
export function trackViewContent(productName: string, price: number): void {
  ensurePixelsActive();
  try {
    if (typeof window !== 'undefined') {
      const options = activeFbTestCode ? { test_event_code: activeFbTestCode } : {};
      if (window.fbq) {
        window.fbq(
          'track',
          'ViewContent',
          {
            content_name: productName,
            content_type: 'product',
            content_category: 'Apparel & Accessories > Clothing > Jackets & Coats',
            value: price,
            currency: 'BDT',
          },
          options
        );
      }
      if (window.ttq) {
        window.ttq.track('ViewContent', {
          content_name: productName,
          content_category: 'Jackets & Coats',
          value: price,
          currency: 'BDT',
        });
      }
    }
  } catch (err) {
    console.warn('[Pixel] ViewContent tracking warning:', err);
  }
}

/**
 * Track AddToCart event
 */
export function trackAddToCart(productName: string, price: number, quantity = 1): void {
  ensurePixelsActive();
  try {
    if (typeof window !== 'undefined') {
      const options = activeFbTestCode ? { test_event_code: activeFbTestCode } : {};
      if (window.fbq) {
        window.fbq(
          'track',
          'AddToCart',
          {
            content_name: productName,
            content_type: 'product',
            value: price * quantity,
            currency: 'BDT',
            quantity,
          },
          options
        );
      }
      if (window.ttq) {
        window.ttq.track('AddToCart', {
          content_name: productName,
          value: price * quantity,
          currency: 'BDT',
          quantity,
        });
      }
    }
  } catch (err) {
    console.warn('[Pixel] AddToCart tracking warning:', err);
  }
}

/**
 * Track InitiateCheckout event
 */
export function trackInitiateCheckout(total: number, numItems = 1): void {
  ensurePixelsActive();
  try {
    if (typeof window !== 'undefined') {
      const options = activeFbTestCode ? { test_event_code: activeFbTestCode } : {};
      if (window.fbq) {
        window.fbq(
          'track',
          'InitiateCheckout',
          {
            content_name: 'Ferrari Racing Jacket',
            value: total,
            currency: 'BDT',
            num_items: numItems,
          },
          options
        );
      }
      if (window.ttq) {
        window.ttq.track('InitiateCheckout', {
          value: total,
          currency: 'BDT',
          quantity: numItems,
        });
      }
    }
  } catch (err) {
    console.warn('[Pixel] InitiateCheckout tracking warning:', err);
  }
}

/**
 * Track Purchase & CompletePayment event
 */
export async function trackPurchase(
  order: {
    orderId: string;
    customerName: string;
    customerPhone: string;
    total: number;
    subtotal?: number;
    numItems?: number;
  },
  settings?: SiteSettings
): Promise<void> {
  const { orderId, customerName, customerPhone, total, numItems = 1 } = order;
  const currentSettings = settings || getStoredSettings();

  if (currentSettings.fbPixelId && !fbInitializedId) {
    initFacebookPixel(currentSettings.fbPixelId, currentSettings.fbTestEventCode);
  }
  if (currentSettings.ttPixelId && !ttInitializedId) {
    initTikTokPixel(currentSettings.ttPixelId, currentSettings.ttTestEventCode);
  }

  const effectiveFbTestCode = currentSettings.fbTestEventCode?.trim() || activeFbTestCode || undefined;
  const effectiveTtTestCode = currentSettings.ttTestEventCode?.trim() || activeTtTestCode || undefined;

  // 1. Client-Side Facebook Pixel Purchase
  try {
    if (typeof window !== 'undefined' && window.fbq) {
      const fbOptions: any = {
        eventID: orderId,
      };
      if (effectiveFbTestCode) {
        fbOptions.test_event_code = effectiveFbTestCode;
      }

      window.fbq(
        'track',
        'Purchase',
        {
          value: total,
          currency: 'BDT',
          content_name: 'Ferrari Racing Jacket',
          content_type: 'product',
          order_id: orderId,
          num_items: numItems,
        },
        fbOptions
      );
      console.log(`[Pixel] Facebook Purchase event tracked: ${orderId}, ৳${total}`);
    }
  } catch (err) {
    console.warn('[Pixel] Facebook Purchase event error:', err);
  }

  // 2. Client-Side TikTok Pixel CompletePayment & PlaceAnOrder
  try {
    if (typeof window !== 'undefined' && window.ttq) {
      window.ttq.track(
        'PlaceAnOrder',
        {
          value: total,
          currency: 'BDT',
          order_id: orderId,
          quantity: numItems,
        },
        { event_id: orderId }
      );
      window.ttq.track(
        'CompletePayment',
        {
          value: total,
          currency: 'BDT',
          order_id: orderId,
          quantity: numItems,
        },
        { event_id: orderId }
      );
      console.log(`[Pixel] TikTok CompletePayment event tracked: ${orderId}, ৳${total}`);
    }
  } catch (err) {
    console.warn('[Pixel] TikTok CompletePayment event error:', err);
  }

  // 3. Meta Conversions API (Server-Side direct Graph API call if fbAccessToken is present)
  const cleanFbId = cleanFacebookPixelId(currentSettings.fbPixelId);
  if (cleanFbId && currentSettings.fbAccessToken) {
    try {
      const hashedPhone = await sha256(customerPhone.replace(/\D/g, ''));
      const hashedName = await sha256(customerName);
      const currentTimestamp = Math.floor(Date.now() / 1000);

      const payload: any = {
        data: [
          {
            event_name: 'Purchase',
            event_time: currentTimestamp,
            event_id: orderId,
            action_source: 'website',
            user_data: {
              ph: [hashedPhone],
              fn: [hashedName],
              client_user_agent: navigator.userAgent,
            },
            custom_data: {
              currency: 'BDT',
              value: total,
              order_id: orderId,
            },
          },
        ],
      };

      if (effectiveFbTestCode) {
        payload.test_event_code = effectiveFbTestCode;
      }

      const fbUrl = `https://graph.facebook.com/v21.0/${cleanFbId}/events?access_token=${currentSettings.fbAccessToken.trim()}`;
      fetch(fbUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
        .then(async (res) => {
          const resData = await res.json();
          console.log('[Pixel] Meta Conversions API response:', resData);
        })
        .catch((capiErr) => {
          console.warn('[Pixel] Meta Conversions API note:', capiErr);
        });
    } catch (err) {
      console.warn('[Pixel] CAPI payload note:', err);
    }
  }

  // 4. TikTok Events API (Server-Side direct API call if ttAccessToken is present)
  const cleanTtId = cleanTikTokPixelId(currentSettings.ttPixelId);
  if (cleanTtId && currentSettings.ttAccessToken) {
    try {
      const hashedPhone = await sha256(customerPhone.replace(/\D/g, ''));
      const currentTimestamp = Math.floor(Date.now() / 1000);

      const ttPayload: any = {
        event_source: 'web',
        event_source_id: cleanTtId,
        data: [
          {
            event: 'CompletePayment',
            event_time: currentTimestamp,
            event_id: orderId,
            user: {
              phone_sha256: hashedPhone,
            },
            properties: {
              currency: 'BDT',
              value: total,
            },
          },
        ],
      };

      if (effectiveTtTestCode) {
        ttPayload.test_event_code = effectiveTtTestCode;
      }

      fetch('https://business-api.tiktok.com/open_api/v1.3/event/track/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Access-Token': currentSettings.ttAccessToken.trim(),
        },
        body: JSON.stringify(ttPayload),
      })
        .then(async (res) => {
          const resData = await res.json();
          console.log('[Pixel] TikTok Events API response:', resData);
        })
        .catch((ttErr) => {
          console.warn('[Pixel] TikTok Events API note:', ttErr);
        });
    } catch (err) {
      console.warn('[Pixel] TikTok Events API note:', err);
    }
  }
}
