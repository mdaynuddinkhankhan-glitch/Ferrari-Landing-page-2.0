import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer, setLogLevel } from 'firebase/firestore';
import rawConfig from '../../firebase-applet-config.json';

// Permanent production Firebase configuration for Porshibari Fashion
// Connected to user project: webm-5bf61
export const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || rawConfig?.projectId || 'webm-5bf61',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || rawConfig?.appId || '1:391588890108:web:951a52e4eea725584e1e79',
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || rawConfig?.apiKey || 'AIzaSyA0jpgQdHnrWUPuv5AV0XA7BFoBpvKk-_o',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || rawConfig?.authDomain || 'webm-5bf61.firebaseapp.com',
  databaseURL: rawConfig?.databaseURL || 'https://webm-5bf61-default-rtdb.firebaseio.com',
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || rawConfig?.firestoreDatabaseId || '(default)',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || rawConfig?.storageBucket || 'webm-5bf61.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || rawConfig?.messagingSenderId || '391588890108',
  measurementId: rawConfig?.measurementId || 'G-6QY2XY5WN5',
  oAuthClientId: rawConfig?.oAuthClientId || '',
};

export const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

// Silence internal Firestore SDK retry and backoff logs in console
try {
  setLogLevel('silent');
} catch {
  // ignore
}

// In browser environments (especially sandboxes/iframes), WebChannel stream buffering
// can cause standard streaming connections to drop and log "Connection failed 1 times. Most recent error: FirebaseError: [code=unavailable]".
// Using experimentalForceLongPolling or experimentalAutoDetectLongPolling ensures immediate reliable connectivity.
const isBrowser = typeof window !== 'undefined';

const QUOTA_EXHAUSTED_KEY = 'fz_firestore_quota_exhausted_until';

/**
 * Checks whether Firestore free daily write quota is currently exhausted.
 * This circuit-breaker prevents endless retry loops, backoff delays, and backend overload errors.
 */
export function isFirestoreQuotaExhausted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(QUOTA_EXHAUSTED_KEY);
    if (!raw) return false;
    const expiresAt = parseInt(raw, 10);
    if (Date.now() < expiresAt) {
      return true;
    }
    localStorage.removeItem(QUOTA_EXHAUSTED_KEY);
    return false;
  } catch {
    return false;
  }
}

/**
 * Marks Firestore quota as exhausted, pausing cloud write attempts for a cooldown window
 * so the backend is not overloaded with backoff delay errors.
 */
export function markFirestoreQuotaExhausted(durationMs = 1000 * 60 * 15): void {
  if (typeof window === 'undefined') return;
  try {
    const expiresAt = Date.now() + durationMs;
    localStorage.setItem(QUOTA_EXHAUSTED_KEY, String(expiresAt));
  } catch {
    // ignore
  }
}

/**
 * Detects if an error is caused by Firestore resource exhaustion / daily free quota exceeded.
 */
export function isFirestoreQuotaError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes('resource-exhausted') ||
    msg.includes('Quota limit exceeded') ||
    msg.includes('quota exceeded') ||
    msg.includes('Resource has been exhausted') ||
    msg.includes('Free daily write units')
  );
}

export const db = (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)')
  ? initializeFirestore(app, { ...(isBrowser ? { experimentalForceLongPolling: true } : {}) }, firebaseConfig.firestoreDatabaseId)
  : initializeFirestore(app, { ...(isBrowser ? { experimentalForceLongPolling: true } : {}) });

export const auth = getAuth(app);
export const storage = null;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  if (isFirestoreQuotaError(error)) {
    markFirestoreQuotaExhausted();
  }
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Operation Notice: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection to Firestore on initial boot
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('the client is offline') ||
        error.message.includes('unavailable') ||
        error.message.includes('Could not reach Cloud Firestore backend'))
    ) {
      console.warn('Firebase client is currently operating in offline-first mode.');
    } else {
      console.log('Firebase connection initialized.');
    }
    return false;
  }
}
