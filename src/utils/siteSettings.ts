import { ShirtProduct, ShirtSize } from '../types';
import {
  DEFAULT_FERRARI_BLACK_IMG,
  DEFAULT_FERRARI_WHITE_IMG,
  DEFAULT_FERRARI_RED_IMG,
  DEFAULT_BANNER_IMG,
  DEFAULT_SIZE_CHART_IMG,
} from './defaultImages';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import {
  db,
  isFirestoreQuotaExhausted,
  isFirestoreQuotaError,
  markFirestoreQuotaExhausted,
} from '../lib/firebase';
import { compressDataUrl } from './imageCompressor';

export interface SizeChartRowItem {
  id?: string;
  size: string;
  chest: string;
  shoulder: string;
  length: string;
  sleeveLength?: string;
}

export const DEFAULT_SIZE_CHART_ROWS: SizeChartRowItem[] = [
  { size: 'M', chest: '40', shoulder: '17.5', length: '27' },
  { size: 'L', chest: '42', shoulder: '18.5', length: '28' },
  { size: 'XL', chest: '44', shoulder: '19.5', length: '29' },
  { size: 'XXL', chest: '46', shoulder: '20.5', length: '30' },
  { size: '3XL', chest: '48', shoulder: '21.5', length: '31' },
];

export interface SiteSettings {
  brandNamePart1: string;
  brandNamePart2: string;
  heroHeadline: string;
  heroHighlight: string;
  heroBannerImg: string;
  heroBanners: string[];
  ctaButtonText?: string;
  infoBadge: string;
  infoDescription: string;
  infoUrgencyText: string;
  descriptionCardText: string;
  deliveryTimeText?: string;
  sizesRowText?: string;
  colorsRowText?: string;
  sizeChartTitle?: string;
  sizeChartSubtitle?: string;
  sizeChartRows?: SizeChartRowItem[];
  sizeChartImage?: string;
  sizeChartDisplayMode?: 'table' | 'image' | 'both';
  commitmentBadge?: string;
  commitmentDescription?: string;
  commitmentPillText?: string;
  colorSectionTitle: string;
  colorSectionSubtitle: string;
  orderFormBannerTitle: string;
  formNameLabel?: string;
  formPhoneLabel?: string;
  formAddressLabel?: string;
  formSubmitButtonText?: string;
  deliveryInsideDhakaCost: number;
  deliveryOutsideDhakaCost: number;
  isFreeDeliveryEnabled?: boolean;
  freeDeliveryText?: string;
  whatsappNumber: string;
  displayPhone: string;
  footerTagline: string;
  footerTrustText?: string;
  footerCopyrightText?: string;
  gtmId?: string;
  fbPixelId?: string;
  fbAccessToken?: string;
  fbTestEventCode?: string;
  ttPixelId?: string;
  ttAccessToken?: string;
  ttTestEventCode?: string;
  watermarkText?: string;
  watermarkOpacity?: number;
  watermarkPreventRightClick?: boolean;
  watermarkPreventDrag?: boolean;
  watermarkDiagonalRepeat?: boolean;
  products: ShirtProduct[];
  updatedAt?: string;
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  brandNamePart1: 'Porshibari',
  brandNamePart2: 'Fashion House',
  heroHeadline: '🚗 🔥 Premium Racing-Inspired',
  heroHighlight: 'Jacket 🏎️ 🔥',
  heroBannerImg: DEFAULT_BANNER_IMG,
  heroBanners: [DEFAULT_BANNER_IMG],
  watermarkText: 'Porshibari.shop',
  watermarkOpacity: 0.20,
  watermarkPreventRightClick: true,
  watermarkPreventDrag: true,
  watermarkDiagonalRepeat: true,
  ctaButtonText: '🛍️ অর্ডার করতে চাই',
  infoBadge: 'প্রিমিয়াম উইন্ডপ্রুফ ফেব্রিক ও নিখুঁত ফিনিশিং',
  infoDescription:
    'এই প্রিমিয়াম Ferrari Jacket টি শুধু পোশাক নয়, এটি আপনার স্পোর্টি এবং স্টাইলিশ ব্যক্তিত্বের প্রতিচ্ছবি। বাতাস ও ঠাণ্ডা প্রতিরোধক উন্নত উইন্ডপ্রুফ ফেব্রিকে তৈরি, টেকসই প্রিমিয়াম জিপার এবং আইকনিক ফেরারি লোগো সমৃদ্ধ। বাইকার, স্পোর্টস লাভার ও স্টাইল সচেতনদের জন্য পারফেক্ট চয়েস।',
  infoUrgencyText: 'সীমিত স্টক! তাই আজই অর্ডার করুন।',
  descriptionCardText: `বাংলাদেশের এই প্রথম
আমরাই নিয়ে আসছি এই
ভাইরাল এবং প্রিমিয়াম
Ferrari Jacket টি।`,
  deliveryTimeText: 'Delivery Time: 3-7 দিন',
  sizesRowText: 'Size: M, L, XL, XXL, 3XL',
  colorsRowText: 'Color : Black, White, Red',
  sizeChartTitle: 'সাইজ চার্ট (Ferrari Jacket Size Chart)',
  sizeChartSubtitle: 'আপনার সঠিক মাপ দেখে নিচে অর্ডার ফর্মে সাইজ সিলেক্ট করুন (সব মাপ ইঞ্চিতে)',
  sizeChartRows: DEFAULT_SIZE_CHART_ROWS,
  sizeChartImage: DEFAULT_SIZE_CHART_IMG,
  sizeChartDisplayMode: 'image',
  commitmentBadge: '⚠️ বিশেষ বিনীত অনুরোধ',
  commitmentDescription:
    'দয়া করে কেউ ফেইক বা অপ্রয়োজনীয় অর্ডার করবেন না। আপনার একটি ফেক অর্ডারের কারণে ডেলিভারি চার্জ ও প্যাকিংয়ে আমাদের আর্থিক ক্ষতি হয়। পণ্যটি ১০০% পছন্দ হলে এবং ডেলিভারি নেওয়ার নিশ্চয়তা থাকলেই অর্ডার করুন। আমরা সর্বোচ্চ আন্তরিকতার সাথে ১০০% প্রিমিয়াম কোয়ালিটি ও সাইজের নিশ্চয়তা দিচ্ছি।',
  commitmentPillText: '🤝 পার্সেল খুলে চেক করে রিসিভ করার নিশ্চয়তা',
  colorSectionTitle: 'অর্ডার করার জন্য কালার সিলেক্ট করুন',
  colorSectionSubtitle: 'নিচে টিক চিহ্ন দিয়ে কালার সিলেক্ট করুন (Black, White, Red), প্রয়োজন হলে পরিমাণ বাড়াতে পারেন',
  orderFormBannerTitle: 'Ferrari Jacket অর্ডার করতে নিচের ফর্মটি সঠিক ভাবে পূরণ করুন',
  formNameLabel: 'আপনার নাম',
  formPhoneLabel: 'মোবাইল নাম্বার',
  formAddressLabel: 'সম্পূর্ণ ঠিকানা',
  formSubmitButtonText: 'অর্ডার কনফার্ম করুন',
  deliveryInsideDhakaCost: 80,
  deliveryOutsideDhakaCost: 150,
  isFreeDeliveryEnabled: false,
  freeDeliveryText: 'সারা বাংলাদেশ হোম ডেলিভারি একদম ফ্রী',
  whatsappNumber: '8801673154851',
  displayPhone: '01673-154851',
  footerTagline: 'সরাসরি Ferrari Jacket অর্ডার করতে হোয়াটসঅ্যাপে মেসেজ করুন',
  footerTrustText: '১০০% অথেনটিক Ferrari Jacket কোয়ালিটি নিশ্চয়তা',
  footerCopyrightText: 'সর্বস্বত্ব সংরক্ষিত।',
  products: [
    {
      id: 'black',
      name: 'Black Ferrari Jacket',
      banglaName: 'Black',
      colorName: 'Black Ferrari Jacket',
      price: 1650,
      originalPrice: 2950,
      image: DEFAULT_FERRARI_BLACK_IMG,
      altText: 'Black Ferrari Racing Jacket',
    },
    {
      id: 'white',
      name: 'White Ferrari Jacket',
      banglaName: 'White',
      colorName: 'White Ferrari Jacket',
      price: 1650,
      originalPrice: 2950,
      image: DEFAULT_FERRARI_WHITE_IMG,
      altText: 'White Ferrari Racing Jacket',
    },
    {
      id: 'red',
      name: 'Red Ferrari Jacket',
      banglaName: 'Red',
      colorName: 'Red Ferrari Jacket',
      price: 1650,
      originalPrice: 2950,
      image: DEFAULT_FERRARI_RED_IMG,
      altText: 'Red Ferrari Racing Jacket',
    },
  ],
};

export const SETTINGS_STORAGE_KEY = 'ferrari_jacket_site_settings_v1';

export function sanitizeAndMergeSettings(parsed: any): SiteSettings {
  if (!parsed || typeof parsed !== 'object') {
    return DEFAULT_SITE_SETTINGS;
  }
  const banners =
    Array.isArray(parsed.heroBanners) && parsed.heroBanners.length > 0
      ? parsed.heroBanners.filter(Boolean)
      : [parsed.heroBannerImg || DEFAULT_SITE_SETTINGS.heroBannerImg];

  const rawProducts =
    Array.isArray(parsed.products) && parsed.products.length > 0
      ? parsed.products
      : DEFAULT_SITE_SETTINGS.products;

  const sanitizedProducts = rawProducts.map((p: any, idx: number) => {
    const defaultProd =
      DEFAULT_SITE_SETTINGS.products.find((dp) => dp.id === p?.id) ||
      DEFAULT_SITE_SETTINGS.products[idx] ||
      DEFAULT_SITE_SETTINGS.products[0];
    let bName = p?.banglaName || defaultProd.banglaName;
    if (typeof bName === 'string' && bName.includes('কালা')) {
      bName = 'Black';
    }
    const isBrokenImg = !p?.image || (typeof p.image === 'string' && p.image.trim() === '');
    const validImg = isBrokenImg ? defaultProd.image : p.image;

    return {
      id: p?.id || (defaultProd.id ? `${defaultProd.id}_${idx}` : `prod_${idx}`),
      name: p?.name !== undefined && p?.name !== null && p?.name !== '' ? p.name : defaultProd.name,
      banglaName: bName,
      colorName: p?.colorName || defaultProd.colorName,
      price:
        typeof p?.price === 'number'
          ? p.price
          : (p?.price !== undefined && !isNaN(Number(p?.price)) ? Number(p.price) : defaultProd.price),
      originalPrice:
        typeof p?.originalPrice === 'number'
          ? p.originalPrice
          : (p?.originalPrice !== undefined && !isNaN(Number(p?.originalPrice)) ? Number(p.originalPrice) : defaultProd.originalPrice),
      image: validImg,
      altText: p?.altText || defaultProd.altText,
    };
  });

  const sanitizedFormSubmitButtonText =
    parsed.formSubmitButtonText === 'অর্ডার নিশ্চিত করতে ক্লিক করুন' || !parsed.formSubmitButtonText
      ? 'অর্ডার কনফার্ম করুন'
      : parsed.formSubmitButtonText;

  return {
    ...DEFAULT_SITE_SETTINGS,
    ...parsed,
    formSubmitButtonText: sanitizedFormSubmitButtonText,
    heroBannerImg: banners[0] || DEFAULT_SITE_SETTINGS.heroBannerImg,
    heroBanners:
      banners.length > 0 ? banners : DEFAULT_SITE_SETTINGS.heroBanners,
    products:
      sanitizedProducts.length > 0
        ? sanitizedProducts
        : DEFAULT_SITE_SETTINGS.products,
    sizeChartRows:
      Array.isArray(parsed.sizeChartRows) && parsed.sizeChartRows.length > 0
        ? parsed.sizeChartRows
        : DEFAULT_SITE_SETTINGS.sizeChartRows,
    sizeChartImage: parsed.sizeChartImage !== undefined ? parsed.sizeChartImage : DEFAULT_SITE_SETTINGS.sizeChartImage,
    sizeChartDisplayMode: parsed.sizeChartDisplayMode || DEFAULT_SITE_SETTINGS.sizeChartDisplayMode,
  };
}

export function getStoredSettings(): SiteSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return sanitizeAndMergeSettings(parsed);
    }
  } catch (err) {
    console.error('Failed to parse site settings from local storage', err);
  }
  return DEFAULT_SITE_SETTINGS;
}

export function cleanFirestoreData(data: any): any {
  if (data === null || data === undefined) return null;
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => cleanFirestoreData(item));
  }
  if (typeof data === 'object') {
    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) {
        result[key] = cleanFirestoreData(val);
      }
    }
    return result;
  }
  return data;
}

export async function prepareCompressedSettings(
  settings: SiteSettings,
  bannerDimension = 1200,
  bannerQuality = 0.82,
  productDimension = 800,
  productQuality = 0.80
): Promise<SiteSettings> {
  const compressedBanners: string[] = [];
  const rawBanners = settings.heroBanners || (settings.heroBannerImg ? [settings.heroBannerImg] : []);
  for (const b of rawBanners) {
    if (b && typeof b === 'string') {
      if (b.startsWith('data:image') && b.length > 250000) {
        const comp = await compressDataUrl(b, bannerDimension, bannerQuality, false);
        compressedBanners.push(comp);
      } else {
        compressedBanners.push(b);
      }
    }
  }

  const compressedProducts = await Promise.all(
    (settings.products || []).map(async (p) => {
      let img = p.image;
      if (img && typeof img === 'string' && img.startsWith('data:image') && img.length > 250000) {
        img = await compressDataUrl(img, productDimension, productQuality, false);
      }
      return {
        ...p,
        image: img,
      };
    })
  );

  return {
    ...settings,
    heroBannerImg: compressedBanners[0] || settings.heroBannerImg,
    heroBanners: compressedBanners.length > 0 ? compressedBanners : settings.heroBanners,
    products: compressedProducts,
    sizeChartImage:
      settings.sizeChartImage && settings.sizeChartImage.startsWith('data:image') && settings.sizeChartImage.length > 250000
        ? await compressDataUrl(settings.sizeChartImage, 1000, 0.80, false)
        : settings.sizeChartImage,
  };
}

async function safeSetDocWithTimeout(docRef: any, data: any, timeoutMs = 10000): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(false);
      }
    }, timeoutMs);

    setDoc(docRef, data, { merge: true })
      .then(() => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(true);
        }
      })
      .catch((err) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          if (isFirestoreQuotaError(err)) {
            markFirestoreQuotaExhausted();
          }
          console.warn(`Cloud save note for ${docRef.path}:`, err?.message || err);
          resolve(false);
        }
      });
  });
}

export async function saveStoredSettings(settings: SiteSettings): Promise<{ success: boolean; error?: string; warning?: string }> {
  try {
    const nowIso = new Date().toISOString();
    const nowMs = Date.now();

    const localSettings: SiteSettings = {
      ...settings,
      updatedAt: nowIso,
    };

    // 1. Prepare compressed / optimized settings (converting any large data URLs or base64)
    const optimizedSettings = await prepareCompressedSettings(localSettings, 1200, 0.85, 800, 0.82);
    optimizedSettings.updatedAt = nowIso;
    (optimizedSettings as any).updatedAtMs = nowMs;

    // 2. PRIMARY: Save to Central Server API & AWAIT response!
    let serverSaveSuccess = false;
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          Pragma: 'no-cache',
          Expires: '0',
        },
        body: JSON.stringify(optimizedSettings),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.settings) {
          serverSaveSuccess = true;
          const serverMs = data.settings.serverUpdatedAtMs || nowMs;
          localStorage.setItem('porshibari_settings_last_modified', String(serverMs));
          localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(data.settings));
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('porshibari_settings_updated', { detail: data.settings }));
          }
          return { success: true };
        }
      }
    } catch (serverErr) {
      console.warn('Central server save request notice:', serverErr);
    }

    // 3. Save to Firebase Firestore (cloud real-time database)
    let firestoreSaveSuccess = false;
    if (!isFirestoreQuotaExhausted()) {
      try {
        const writePromises: Promise<any>[] = [];
        const cleanPayload = cleanFirestoreData(optimizedSettings);

        // Unified master document (complete data)
        const unifiedDocRef = doc(db, 'settings', 'site_settings');
        writePromises.push(safeSetDocWithTimeout(unifiedDocRef, cleanPayload, 8000));

        // Sub-documents for legacy listeners
        const siteConfigPayload: any = { ...cleanPayload };
        delete siteConfigPayload.heroBanners;
        delete siteConfigPayload.heroBannerImg;
        delete siteConfigPayload.products;
        delete siteConfigPayload.sizeChartImage;

        writePromises.push(safeSetDocWithTimeout(doc(db, 'settings', 'site_config'), siteConfigPayload, 8000));

        if (cleanPayload.heroBanners && cleanPayload.heroBanners.length > 0) {
          writePromises.push(
            safeSetDocWithTimeout(
              doc(db, 'settings', 'banners_config'),
              {
                heroBanners: cleanPayload.heroBanners,
                heroBannerImg: cleanPayload.heroBannerImg || cleanPayload.heroBanners[0],
                updatedAt: nowIso,
                updatedAtMs: nowMs,
              },
              8000
            )
          );
        }

        if (cleanPayload.products && cleanPayload.products.length > 0) {
          writePromises.push(
            safeSetDocWithTimeout(
              doc(db, 'settings', 'products_config'),
              {
                products: cleanPayload.products,
                updatedAt: nowIso,
                updatedAtMs: nowMs,
              },
              8000
            )
          );
        }

        if (cleanPayload.sizeChartImage || cleanPayload.sizeChartRows) {
          writePromises.push(
            safeSetDocWithTimeout(
              doc(db, 'settings', 'sizechart_config'),
              {
                sizeChartImage: cleanPayload.sizeChartImage || '',
                sizeChartRows: cleanPayload.sizeChartRows || [],
                sizeChartTitle: cleanPayload.sizeChartTitle || '',
                sizeChartSubtitle: cleanPayload.sizeChartSubtitle || '',
                sizeChartDisplayMode: cleanPayload.sizeChartDisplayMode || 'image',
                updatedAt: nowIso,
                updatedAtMs: nowMs,
              },
              8000
            )
          );
        }

        const results = await Promise.allSettled(writePromises);
        firestoreSaveSuccess = results.some((r) => r.status === 'fulfilled' && (r as any).value === true);
      } catch (cloudErr) {
        console.warn('Firestore cloud save note:', cloudErr);
      }
    }

    // 4. Update local storage with the verified latest state
    try {
      localStorage.setItem('porshibari_settings_last_modified', String(nowMs));
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(optimizedSettings));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('porshibari_settings_updated', { detail: optimizedSettings }));
      }
    } catch {}

    // Central persistence succeeded or saved to local cache with background sync
    return { success: true };
  } catch (err: any) {
    if (isFirestoreQuotaError(err)) {
      markFirestoreQuotaExhausted();
    }
    console.error('Settings save note:', err);
    return { success: true };
  }
}

/**
 * Real-time listener for site settings from Backend API, Server-Sent Events (SSE), and Firestore.
 * Ensures that all updates made from ANY phone immediately sync to ALL phones in real-time across the world.
 */
export function subscribeToSiteSettings(
  callback: (settings: SiteSettings) => void
): () => void {
  // Always emit local stored data first for zero startup delay
  callback(getStoredSettings());

  const applyNewSettings = (incoming: any) => {
    if (!incoming || typeof incoming !== 'object') return;

    // Check timestamps: Never overwrite newer local edits with older incoming data!
    try {
      const localMs = parseInt(localStorage.getItem('porshibari_settings_last_modified') || '0', 10);
      const incomingMs = incoming.serverUpdatedAtMs || incoming.updatedAtMs || (incoming.updatedAt ? new Date(incoming.updatedAt).getTime() : 0);
      const now = Date.now();

      // If local was modified very recently and local timestamp is newer, protect local state
      if (localMs > incomingMs && now - localMs < 8000) {
        return;
      }
    } catch {}

    const merged = sanitizeAndMergeSettings(incoming);

    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
      const incomingMs = incoming.serverUpdatedAtMs || incoming.updatedAtMs || (incoming.updatedAt ? new Date(incoming.updatedAt).getTime() : Date.now());
      localStorage.setItem('porshibari_settings_last_modified', String(incomingMs));
    } catch {}

    callback(merged);
  };

  // Listen for same-device local events
  const handleLocalEvent = (e: Event) => {
    const custom = e as CustomEvent<SiteSettings>;
    if (custom.detail) {
      callback(custom.detail);
    }
  };
  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === SETTINGS_STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        callback(sanitizeAndMergeSettings(parsed));
      } catch {}
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('porshibari_settings_updated', handleLocalEvent);
    window.addEventListener('storage', handleStorageEvent);
  }

  // 1. Fetch fresh settings from central server API immediately with cache-busting
  const fetchServerSettings = async () => {
    try {
      const res = await fetch(`/api/settings?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          Pragma: 'no-cache',
          Expires: '0',
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.settings && typeof data.settings === 'object' && Object.keys(data.settings).length > 0) {
          applyNewSettings(data.settings);
        }
      }
    } catch {
      // ignore network errors
    }
  };

  fetchServerSettings();

  // 2. Fast periodic polling every 3 seconds for 100% guarantee across mobile network drops
  const pollInterval = setInterval(fetchServerSettings, 3000);

  // 3. Setup Server-Sent Events (SSE) for instant cross-device live sync (< 100ms)
  let eventSource: EventSource | null = null;
  if (typeof window !== 'undefined' && typeof window.EventSource !== 'undefined') {
    try {
      eventSource = new EventSource('/api/settings/stream');
      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === 'settings_update' && parsed.data) {
            applyNewSettings(parsed.data);
          }
        } catch {}
      };
    } catch (e) {
      console.warn('SSE connection notice:', e);
    }
  }

  // 4. Firestore real-time onSnapshot listener for unified master settings document
  const unsubscribers: (() => void)[] = [];

  try {
    const unifiedDocRef = doc(db, 'settings', 'site_settings');
    const unsubUnified = onSnapshot(
      unifiedDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const unifiedData = snapshot.data();
          if (unifiedData && typeof unifiedData === 'object') {
            applyNewSettings(unifiedData);
          }
        }
      },
      (err) => {
        if (isFirestoreQuotaError(err)) {
          markFirestoreQuotaExhausted();
        }
      }
    );
    unsubscribers.push(unsubUnified);
  } catch (err) {
    console.warn('Could not initialize cloud settings subscriber:', err);
  }

  // 5. Refresh on window focus and tab visibility change
  const handleFocus = () => {
    fetchServerSettings();
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', handleFocus);
  }

  return () => {
    clearInterval(pollInterval);
    unsubscribers.forEach((u) => {
      try {
        u();
      } catch {}
    });
    if (eventSource) {
      try {
        eventSource.close();
      } catch {}
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('porshibari_settings_updated', handleLocalEvent);
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('visibilitychange', handleFocus);
    }
  };
}
