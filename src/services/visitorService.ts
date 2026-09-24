import { doc, setDoc, onSnapshot, increment } from 'firebase/firestore';
import {
  db,
  isFirestoreQuotaExhausted,
  isFirestoreQuotaError,
  markFirestoreQuotaExhausted,
} from '../lib/firebase';

const SETTINGS_COLLECTION = 'settings';
const VISITOR_DOC_ID = 'visitor_stats';
const LOCAL_STORAGE_KEY = 'fz_porshibari_real_visitor_stats';

export interface VisitorStats {
  totalVisits: number;
  todayVisits: number;
  lastDate: string; // YYYY-MM-DD
}

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
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
 * Record an actual real website visit when someone visits the store.
 * Counts once per browser session per visitor.
 */
export async function recordWebsiteVisit(): Promise<VisitorStats> {
  const today = getTodayString();

  let isSessionCounted = false;
  try {
    isSessionCounted = sessionStorage.getItem('fz_real_visit_counted') === 'true';
  } catch {
    // ignore
  }

  // If this session has already been counted, do not count again
  if (isSessionCounted) {
    return getLocalVisitorStats();
  }

  try {
    sessionStorage.setItem('fz_real_visit_counted', 'true');
  } catch {
    // ignore
  }

  const current = getLocalVisitorStats();
  const isSameDay = current.lastDate === today;
  const newStats: VisitorStats = {
    totalVisits: (current.totalVisits >= 4500 ? 0 : current.totalVisits) + 1,
    todayVisits: isSameDay ? (current.todayVisits || 0) + 1 : 1,
    lastDate: today,
  };
  saveLocalVisitorStats(newStats);
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
        console.warn('Visitor stats live subscription offline or error:', error.message);
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
