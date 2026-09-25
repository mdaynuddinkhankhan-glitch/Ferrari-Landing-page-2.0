import { ShirtProduct, ShirtSize } from '../types';
import blackImg from '../assets/images/ferrari_jacket_black_1790107270989.jpg';
import whiteImg from '../assets/images/ferrari_jacket_white_1790107289257.jpg';
import redImg from '../assets/images/ferrari_jacket_red_1790107301729.jpg';
import bannerImg from '../assets/images/ferrari_jacket_banner_1790107323198.jpg';
import sizeChartImg from '../assets/images/ferrari_size_chart_1790260219878.jpg';
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
  { size: '4XL', chest: '50', shoulder: '22.5', length: '32' },
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
  heroBannerImg: bannerImg,
  heroBanners: [bannerImg],
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
  sizesRowText: 'Size: M, L, XL, XXL, 3XL, 4XL',
  colorsRowText: 'Color : Black, White, Red',
  sizeChartTitle: 'সাইজ চার্ট (Ferrari Jacket Size Chart)',
  sizeChartSubtitle: 'আপনার সঠিক মাপ দেখে নিচে অর্ডার ফর্মে সাইজ সিলেক্ট করুন (সব মাপ ইঞ্চিতে)',
  sizeChartRows: DEFAULT_SIZE_CHART_ROWS,
  sizeChartImage: sizeChartImg,
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
      image: blackImg,
      altText: 'Black Ferrari Racing Jacket',
    },
    {
      id: 'white',
      name: 'White Ferrari Jacket',
      banglaName: 'White',
      colorName: 'White Ferrari Jacket',
      price: 1650,
      originalPrice: 2950,
      image: whiteImg,
      altText: 'White Ferrari Racing Jacket',
    },
    {
      id: 'red',
      name: 'Red Ferrari Jacket',
      banglaName: 'Red',
      colorName: 'Red Ferrari Jacket',
      price: 1650,
      originalPrice: 2950,
      image: redImg,
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
    Array.isArray(parsed.heroBanners) && parsed.heroBanners.length > 0 && !parsed.heroBanners[0]?.includes('indonesian') && !parsed.heroBanners[0]?.includes('porshibari_collection_banner')
      ? parsed.heroBanners.filter(Boolean)
      : [DEFAULT_SITE_SETTINGS.heroBannerImg];

  const rawProducts =
    Array.isArray(parsed.products) && parsed.products.length > 0
      ? parsed.products
      : DEFAULT_SITE_SETTINGS.products;

  // Check if products are still old legacy shirts (contains 'pink' or 'indonesian')
  const isOldShirtData =
    rawProducts.some((p: any) => p?.id === 'pink' || p?.name?.toLowerCase()?.includes('indonesian'));

  const sanitizedProducts = isOldShirtData
    ? DEFAULT_SITE_SETTINGS.products
    : rawProducts.map((p: any, idx: number) => {
        const defaultProd =
          DEFAULT_SITE_SETTINGS.products[idx] || DEFAULT_SITE_SETTINGS.products[0];
        let bName = p?.banglaName || defaultProd.banglaName;
        if (typeof bName === 'string' && bName.includes('কালা')) {
          bName = 'Black';
        }
        return {
          id: p?.id || defaultProd.id,
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
          image: p?.image || defaultProd.image,
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

    // 1. FIRST: Instantly save locally to localStorage with zero latency
    const localSettings: SiteSettings = {
      ...settings,
      updatedAt: nowIso,
    };
    try {
      localStorage.setItem('porshibari_settings_last_modified', String(nowMs));
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(localSettings));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('porshibari_settings_updated', { detail: localSettings }));
      }
    } catch (err) {
      console.warn('Failed to save site settings locally', err);
    }

    // 2. Check circuit-breaker: if Firestore quota is currently exhausted, avoid cloud write and return immediately
    if (isFirestoreQuotaExhausted()) {
      return {
        success: true,
        warning: 'দৈনিক ফ্রি ক্লাউড কোটা সাময়িকভাবে পূর্ণ হয়েছে, সেটিংস ডিভাইসে সফলভাবে সংরক্ষিত রয়েছে।',
      };
    }

    // 3. Prepare optimized payload (no redundant canvas loops for plain texts)
    const optimizedSettings = await prepareCompressedSettings(localSettings, 1200, 0.82, 800, 0.80);

    // 4. Concurrently sync documents to Firestore with safe timeout
    const writePromises: Promise<any>[] = [];

    // Main site config document (text, prices, pixels, etc.)
    const siteConfigPayload: any = {
      ...optimizedSettings,
      updatedAt: nowIso,
      updatedAtMs: nowMs,
    };
    delete siteConfigPayload.heroBanners;
    delete siteConfigPayload.heroBannerImg;
    delete siteConfigPayload.products;
    delete siteConfigPayload.sizeChartImage;

    const siteDocRef = doc(db, 'settings', 'site_config');
    writePromises.push(safeSetDocWithTimeout(siteDocRef, cleanFirestoreData(siteConfigPayload), 10000));

    // Dedicated banners document (only write if banners exist)
    if (optimizedSettings.heroBanners && optimizedSettings.heroBanners.length > 0) {
      const bannersDocRef = doc(db, 'settings', 'banners_config');
      writePromises.push(
        safeSetDocWithTimeout(
          bannersDocRef,
          cleanFirestoreData({
            heroBanners: optimizedSettings.heroBanners,
            heroBannerImg: optimizedSettings.heroBannerImg || optimizedSettings.heroBanners[0],
            updatedAt: nowIso,
            updatedAtMs: nowMs,
          }),
          10000
        )
      );
    }

    // Dedicated products document
    if (optimizedSettings.products && optimizedSettings.products.length > 0) {
      const productsDocRef = doc(db, 'settings', 'products_config');
      writePromises.push(
        safeSetDocWithTimeout(
          productsDocRef,
          cleanFirestoreData({
            products: optimizedSettings.products,
            updatedAt: nowIso,
            updatedAtMs: nowMs,
          }),
          10000
        )
      );
    }

    // Dedicated size chart document
    if (optimizedSettings.sizeChartImage || (optimizedSettings.sizeChartRows && optimizedSettings.sizeChartRows.length > 0)) {
      const sizeChartDocRef = doc(db, 'settings', 'sizechart_config');
      writePromises.push(
        safeSetDocWithTimeout(
          sizeChartDocRef,
          cleanFirestoreData({
            sizeChartImage: optimizedSettings.sizeChartImage || '',
            sizeChartRows: optimizedSettings.sizeChartRows || [],
            sizeChartTitle: optimizedSettings.sizeChartTitle || '',
            sizeChartSubtitle: optimizedSettings.sizeChartSubtitle || '',
            sizeChartDisplayMode: optimizedSettings.sizeChartDisplayMode || 'image',
            updatedAt: nowIso,
            updatedAtMs: nowMs,
          }),
          10000
        )
      );
    }

    await Promise.allSettled(writePromises);
    return { success: true };
  } catch (err: any) {
    if (isFirestoreQuotaError(err)) {
      markFirestoreQuotaExhausted();
      return {
        success: true,
        warning: 'দৈনিক ফ্রি ক্লাউড কোটা লিমিট পূর্ণ হয়েছে, তবে সেটিংস ডিভাইসে সংরক্ষিত রয়েছে।',
      };
    }
    console.warn('Firebase settings save error:', err?.message || err);
    return { success: true };
  }
}

/**
 * Real-time listener for site settings from Firestore cloud database.
 * Ensures that all updates made from ANY phone immediately sync to ALL phones in real-time.
 */
export function subscribeToSiteSettings(
  callback: (settings: SiteSettings) => void
): () => void {
  // Always emit local stored data first for zero startup delay
  callback(getStoredSettings());

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

  // Combined cloud states
  let currentSiteConfig: any = null;
  let currentBannersConfig: any = null;
  let currentProductsConfig: any = null;
  let currentSizeChartConfig: any = null;

  const emitMerged = () => {
    const localStored = getStoredSettings();
    const localLastModified = Number(localStorage.getItem('porshibari_settings_last_modified') || 0);
    const localUpdatedAtMs = localStored.updatedAt ? new Date(localStored.updatedAt).getTime() : 0;
    const effectiveLocalTime = Math.max(localLastModified, localUpdatedAtMs);

    const cloudUpdatedAtRaw = currentSiteConfig?.updatedAtMs || currentSiteConfig?.updatedAt;
    const cloudUpdatedAtMs = cloudUpdatedAtRaw ? (typeof cloudUpdatedAtRaw === 'number' ? cloudUpdatedAtRaw : new Date(cloudUpdatedAtRaw).getTime() || 0) : 0;

    let merged: any;

    // Check timestamp: If local saved data is NEWER than cloud data, DO NOT let older cloud data overwrite local edits!
    if (effectiveLocalTime > 0 && effectiveLocalTime > cloudUpdatedAtMs) {
      merged = {
        ...(currentSiteConfig || {}),
        ...localStored,
      };
      // Quietly push the fresher local version to Firestore in background
      saveStoredSettings(localStored).catch(() => {});
    } else {
      // Cloud is newer or same freshness
      merged = {
        ...localStored,
        ...(currentSiteConfig || {}),
      };
    }

    // Merge banners from banners_config or site_config
    if (
      currentBannersConfig?.heroBanners &&
      Array.isArray(currentBannersConfig.heroBanners) &&
      currentBannersConfig.heroBanners.length > 0
    ) {
      merged.heroBanners = currentBannersConfig.heroBanners;
      merged.heroBannerImg = currentBannersConfig.heroBannerImg || currentBannersConfig.heroBanners[0];
    } else if (
      currentSiteConfig?.heroBanners &&
      Array.isArray(currentSiteConfig.heroBanners) &&
      currentSiteConfig.heroBanners.length > 0
    ) {
      merged.heroBanners = currentSiteConfig.heroBanners;
      merged.heroBannerImg = currentSiteConfig.heroBannerImg || currentSiteConfig.heroBanners[0];
    }

    // Merge products from products_config or site_config
    if (
      currentProductsConfig?.products &&
      Array.isArray(currentProductsConfig.products) &&
      currentProductsConfig.products.length > 0
    ) {
      merged.products = currentProductsConfig.products;
    } else if (
      currentSiteConfig?.products &&
      Array.isArray(currentSiteConfig.products) &&
      currentSiteConfig.products.length > 0
    ) {
      merged.products = currentSiteConfig.products;
    }

    // Merge size chart config
    if (currentSizeChartConfig) {
      if (currentSizeChartConfig.sizeChartImage !== undefined) {
        merged.sizeChartImage = currentSizeChartConfig.sizeChartImage;
      }
      if (currentSizeChartConfig.sizeChartRows && Array.isArray(currentSizeChartConfig.sizeChartRows)) {
        merged.sizeChartRows = currentSizeChartConfig.sizeChartRows;
      }
      if (currentSizeChartConfig.sizeChartTitle) {
        merged.sizeChartTitle = currentSizeChartConfig.sizeChartTitle;
      }
      if (currentSizeChartConfig.sizeChartSubtitle) {
        merged.sizeChartSubtitle = currentSizeChartConfig.sizeChartSubtitle;
      }
      if (currentSizeChartConfig.sizeChartDisplayMode) {
        merged.sizeChartDisplayMode = currentSizeChartConfig.sizeChartDisplayMode;
      }
    }

    const finalSettings = sanitizeAndMergeSettings(merged);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(finalSettings));
    } catch {}
    callback(finalSettings);
  };

  const unsubscribers: (() => void)[] = [];

  try {
    // 1. Listen to site_config
    const siteConfigRef = doc(db, 'settings', 'site_config');
    const unsubSite = onSnapshot(
      siteConfigRef,
      (snapshot) => {
        if (snapshot.exists()) {
          currentSiteConfig = snapshot.data();
          emitMerged();
        }
      },
      (err) => {
        if (isFirestoreQuotaError(err)) {
          markFirestoreQuotaExhausted();
        }
        console.warn('Cloud site_config subscription note:', err?.message || err);
      }
    );
    unsubscribers.push(unsubSite);

    // 2. Listen to banners_config
    const bannersRef = doc(db, 'settings', 'banners_config');
    const unsubBanners = onSnapshot(
      bannersRef,
      (snapshot) => {
        if (snapshot.exists()) {
          currentBannersConfig = snapshot.data();
          emitMerged();
        }
      },
      (err) => {
        if (isFirestoreQuotaError(err)) {
          markFirestoreQuotaExhausted();
        }
        console.warn('Cloud banners_config subscription note:', err?.message || err);
      }
    );
    unsubscribers.push(unsubBanners);

    // 3. Listen to products_config
    const productsRef = doc(db, 'settings', 'products_config');
    const unsubProducts = onSnapshot(
      productsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          currentProductsConfig = snapshot.data();
          emitMerged();
        }
      },
      (err) => {
        if (isFirestoreQuotaError(err)) {
          markFirestoreQuotaExhausted();
        }
        console.warn('Cloud products_config subscription note:', err?.message || err);
      }
    );
    unsubscribers.push(unsubProducts);

    // 4. Listen to sizechart_config
    const sizeChartRef = doc(db, 'settings', 'sizechart_config');
    const unsubSizeChart = onSnapshot(
      sizeChartRef,
      (snapshot) => {
        if (snapshot.exists()) {
          currentSizeChartConfig = snapshot.data();
          emitMerged();
        }
      },
      (err) => {
        if (isFirestoreQuotaError(err)) {
          markFirestoreQuotaExhausted();
        }
        console.warn('Cloud sizechart_config subscription note:', err?.message || err);
      }
    );
    unsubscribers.push(unsubSizeChart);
  } catch (err) {
    console.warn('Could not initialize cloud settings subscriber:', err);
  }

  return () => {
    unsubscribers.forEach((u) => {
      try {
        u();
      } catch {}
    });
    if (typeof window !== 'undefined') {
      window.removeEventListener('porshibari_settings_updated', handleLocalEvent);
      window.removeEventListener('storage', handleStorageEvent);
    }
  };
}
