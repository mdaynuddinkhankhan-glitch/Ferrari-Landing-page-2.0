import { doc, getDoc, setDoc, onSnapshot, increment } from 'firebase/firestore';
import {
  db,
  isFirestoreQuotaExhausted,
  isFirestoreQuotaError,
  markFirestoreQuotaExhausted,
} from '../lib/firebase';

const SETTINGS_COLLECTION = 'settings';
const VISITOR_DOC_ID = 'visitor_stats';
const LOCAL_STORAGE_KEY = 'fz_porshibari_real_visitor_stats';

// Persistent storage keys for strict 1 Phone = 1 Unique Visitor counting
const DEVICE_ID_KEY = 'porshibari_unique_device_uuid';
const DEVICE_COUNTED_ALLTIME_KEY = 'porshibari_device_counted_alltime';
const DEVICE_LAST_VISIT_DATE_KEY = 'porshibari_device_last_visit_date';

export interface VisitorStats {
  totalVisits: number;
  todayVisits: number;
  lastDate: string; // YYYY-MM-DD
}

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

// Cookie helpers to ensure device persistence across private tabs or localStorage resets
function getCookie(name: string): string | null {
  try {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  } catch {
    return null;
  }
}

function setCookie(name: string, value: string, days = 365 * 5): void {
  try {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  } catch {
    // ignore
  }
}

/**
 * Get or create a persistent Unique Device ID for this phone/device
 */
export function getOrCreateDeviceId(): string {
  try {
    let devId = localStorage.getItem(DEVICE_ID_KEY) || getCookie(DEVICE_ID_KEY);
    if (!devId) {
      devId = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem(DEVICE_ID_KEY, devId);
      setCookie(DEVICE_ID_KEY, devId);
    }
    return devId;
  } catch {
    return 'dev_' + Date.now().toString(36);
  }
}

export function getLocalVisitorStats(): VisitorStats {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.totalVisits === 'number' && parsed.totalVisits < 4500) {
        const today = getTodayString();
        return {
          totalVisits: Math.max(0, parsed.totalVisits),
          todayVisits: parsed.lastDate === today ? Math.max(0, parsed.todayVisits || 0) : 0,
          lastDate: today,
        };
      }
    }
  } catch {
    // ignore
  }
  return {
    totalVisits: 0,
    todayVisits: 0,
    lastDate: getTodayString(),
  };
}

export function saveLocalVisitorStats(stats: VisitorStats): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // ignore
  }
}

/**
 * Record an actual real website visit from a unique phone/device.
 * Strict Rule: One phone/device is counted only ONCE for Total Visits,
 * and only ONCE per day for Today's Visits (no increments on refresh/revisit).
 */
export async function recordWebsiteVisit(): Promise<VisitorStats> {
  const today = getTodayString();

  // Ensure persistent device ID is set
  getOrCreateDeviceId();

  // Check if this phone/device has ever been counted for Total Visits
  const hasCountedAlltime = 
    localStorage.getItem(DEVICE_COUNTED_ALLTIME_KEY) === 'true' || 
    getCookie(DEVICE_COUNTED_ALLTIME_KEY) === 'true';

  // Check if this phone/device has already been counted today
  const lastVisitDate = 
    localStorage.getItem(DEVICE_LAST_VISIT_DATE_KEY) || 
    getCookie(DEVICE_LAST_VISIT_DATE_KEY);

  const hasCountedToday = lastVisitDate === today;

  // If this phone is already counted for today AND all-time, do NOT count again
  if (hasCountedAlltime && hasCountedToday) {
    return getLocalVisitorStats();
  }

  // Determine what needs to be incremented
  const shouldIncrementTotal = !hasCountedAlltime;
  const shouldIncrementToday = !hasCountedToday;

  // Immediately mark this phone/device in local storage and cookies so subsequent reloads never re-count
  try {
    localStorage.setItem(DEVICE_COUNTED_ALLTIME_KEY, 'true');
    localStorage.setItem(DEVICE_LAST_VISIT_DATE_KEY, today);
    setCookie(DEVICE_COUNTED_ALLTIME_KEY, 'true');
    setCookie(DEVICE_LAST_VISIT_DATE_KEY, today);
  } catch {
    // ignore
  }

  // Update local stats cache for fast UI
  const current = getLocalVisitorStats();
  const isSameDay = current.lastDate === today;
  const newStats: VisitorStats = {
    totalVisits: (current.totalVisits >= 4500 ? 0 : current.totalVisits) + (shouldIncrementTotal ? 1 : 0),
    todayVisits: isSameDay
      ? (current.todayVisits || 0) + (shouldIncrementToday ? 1 : 0)
      : 1,
    lastDate: today,
  };
  saveLocalVisitorStats(newStats);

  // Sync atomic update with Firestore cloud database
  if (!isFirestoreQuotaExhausted()) {
    try {
      const docRef = doc(db, SETTINGS_COLLECTION, VISITOR_DOC_ID);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const cloudData = docSnap.data();
        const cloudLastDate = cloudData.lastDate || today;
        const isCloudSameDay = cloudLastDate === today;

        const updatePayload: Record<string, any> = {
          lastDate: today,
          updatedAt: new Date().toISOString(),
        };

        if (shouldIncrementTotal) {
          updatePayload.totalVisits = increment(1);
        }

        if (isCloudSameDay) {
          if (shouldIncrementToday) {
            updatePayload.todayVisits = increment(1);
          }
        } else {
          // Date rolled over to new day
          updatePayload.todayVisits = 1;
        }

        await setDoc(docRef, updatePayload, { merge: true });
      } else {
        // Initial Firestore document creation
        await setDoc(
          docRef,
          {
            totalVisits: 1,
            todayVisits: 1,
            lastDate: today,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }
    } catch (error) {
      if (isFirestoreQuotaError(error)) {
        markFirestoreQuotaExhausted();
      } else {
        console.warn('Visitor tracking cloud sync note:', error);
      }
    }
  }

  return newStats;
}

/**
 * Subscribe to real-time visitor stats updates from Firestore
 */
export function subscribeVisitorStats(callback: (stats: VisitorStats) => void): () => void {
  // Always emit local data immediately
  callback(getLocalVisitorStats());

  try {
    const docRef = doc(db, SETTINGS_COLLECTION, VISITOR_DOC_ID);
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const today = getTodayString();
          let total = typeof data.totalVisits === 'number' ? data.totalVisits : 0;
          
          if (total >= 4500) {
            total = 1;
          }

          const stats: VisitorStats = {
            totalVisits: Math.max(0, total),
            todayVisits:
              data.lastDate === today && typeof data.todayVisits === 'number'
                ? Math.max(0, data.todayVisits)
                : 1,
            lastDate: data.lastDate || today,
          };
          saveLocalVisitorStats(stats);
          callback(stats);
        } else {
          // Initialize local baseline without firing external write loop
          const initial = {
            totalVisits: 1,
            todayVisits: 1,
            lastDate: getTodayString(),
            updatedAt: new Date().toISOString(),
          };
          saveLocalVisitorStats(initial);
          callback(initial);
        }
      },
      (error) => {
        if (isFirestoreQuotaError(error)) {
          markFirestoreQuotaExhausted();
        }
        console.warn('Visitor stats live subscription offline or error:', error);
      }
    );
    return unsubscribe;
  } catch {
    return () => {};
  }
}

/**
 * Allows the admin to adjust or reset the visitor count
 */
export async function updateVisitorCount(newTotal: number): Promise<void> {
  const current = getLocalVisitorStats();
  const updated: VisitorStats = {
    ...current,
    totalVisits: Math.max(0, newTotal),
  };
  saveLocalVisitorStats(updated);

  if (isFirestoreQuotaExhausted()) {
    return;
  }

  try {
    const docRef = doc(db, SETTINGS_COLLECTION, VISITOR_DOC_ID);
    await setDoc(
      docRef,
      {
        totalVisits: updated.totalVisits,
        todayVisits: updated.todayVisits,
        lastDate: updated.lastDate,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      markFirestoreQuotaExhausted();
      return;
    }
    console.warn('Update visitor count note:', error);
  }
}
