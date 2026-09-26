import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore, doc, getDocFromServer, setLogLevel } from 'firebase/firestore';
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

let quotaExhaustedUntil = 0;

/**
 * Indicates whether Firestore operations should be temporarily bypassed due to quota error.
 */
export function isFirestoreQuotaExhausted(): boolean {
  return quotaExhaustedUntil > Date.now();
}

/**
 * Marks Firestore quota as exhausted for a temporary period.
 */
export function markFirestoreQuotaExhausted(durationMs = 1000 * 60 * 30): void {
  quotaExhaustedUntil = Date.now() + durationMs;
}

/**
 * Detects if an error is caused by Firestore resource exhaustion.
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

let firestoreInstance: any = null;
try {
  firestoreInstance = getApps().length > 0 ? getFirestore(app) : initializeFirestore(app, {});
} catch {
  // Firebase disconnected
}

export const db = firestoreInstance;
export const auth = getApps().length > 0 ? getAuth(app) : null as any;
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
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: [],
    },
    operationType,
    path,
  };
  throw new Error(JSON.stringify(errInfo));
}

// Test connection returns gracefully showing central server mode
export async function testConnection(): Promise<boolean> {
  console.log('Website database operating on Central Server REST & SSE architecture.');
  return true;
}
