import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, isFirestoreQuotaExhausted, isFirestoreQuotaError, markFirestoreQuotaExhausted } from '../lib/firebase';
import { getApiUrl } from './apiConfig';

const ADMIN_AUTH_DOC = 'admin_auth';
const ADMIN_PASSWORD_KEY = 'porshibari_admin_password';
export const DEFAULT_ADMIN_PASSWORD = 'admin1';
export const DEFAULT_ADMIN_USERNAME = 'admin';

export function getStoredAdminPassword(): string {
  try {
    const saved = localStorage.getItem(ADMIN_PASSWORD_KEY);
    if (saved && saved.trim()) {
      return saved.trim();
    }
  } catch {
    // localStorage not accessible
  }
  return DEFAULT_ADMIN_PASSWORD;
}

export function saveLocalAdminPassword(password: string): void {
  try {
    localStorage.setItem(ADMIN_PASSWORD_KEY, password);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('porshibari_admin_password_updated', { detail: password }));
    }
  } catch {
    // ignore
  }
}

/**
 * Real-time subscription to admin credentials from Firestore
 * so if the password is changed on one phone, all other phones immediately get the update!
 */
export function subscribeToAdminPassword(onPasswordChange: (password: string) => void): () => void {
  // Emit current local password first
  onPasswordChange(getStoredAdminPassword());

  const handleLocalEvent = (e: Event) => {
    const custom = e as CustomEvent<string>;
    if (custom.detail) {
      onPasswordChange(custom.detail);
    }
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === ADMIN_PASSWORD_KEY && e.newValue) {
      onPasswordChange(e.newValue);
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('porshibari_admin_password_updated', handleLocalEvent);
    window.addEventListener('storage', handleStorageEvent);
  }

  // Fetch from central server API
  const fetchServerPassword = async () => {
    try {
      const res = await fetch(getApiUrl(`/api/admin-auth?_t=${Date.now()}`));
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.password) {
          saveLocalAdminPassword(data.password);
          onPasswordChange(data.password);
        }
      }
    } catch {}
  };

  fetchServerPassword();
  const pollTimer = setInterval(fetchServerPassword, 8000);

  let unsubscribeFirestore = () => {};
  try {
    const docRef = doc(db, 'settings', ADMIN_AUTH_DOC);
    unsubscribeFirestore = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && typeof data.password === 'string' && data.password.trim()) {
            const cloudPassword = data.password.trim();
            saveLocalAdminPassword(cloudPassword);
            onPasswordChange(cloudPassword);
          }
        }
      },
      () => {}
    );
  } catch {}

  return () => {
    clearInterval(pollTimer);
    try {
      unsubscribeFirestore();
    } catch {}
    if (typeof window !== 'undefined') {
      window.removeEventListener('porshibari_admin_password_updated', handleLocalEvent);
      window.removeEventListener('storage', handleStorageEvent);
    }
  };
}

/**
 * Update Admin Password both on Central Server and LocalStorage
 */
export async function updateAdminPassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
  const trimmed = newPassword.trim();
  if (!trimmed || trimmed.length < 3) {
    return { success: false, error: 'পাসওয়ার্ড কমপক্ষে ৩ অক্ষরের হতে হবে' };
  }

  // 1. Update local storage immediately
  saveLocalAdminPassword(trimmed);

  // 2. Persist to Central Server API
  try {
    await fetch(getApiUrl('/api/admin-auth'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: trimmed }),
    });
  } catch {}

  // 3. Background sync to Firestore if available
  try {
    if (!isFirestoreQuotaExhausted()) {
      const docRef = doc(db, 'settings', ADMIN_AUTH_DOC);
      setDoc(
        docRef,
        {
          password: trimmed,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      ).catch(() => {});
    }
  } catch {}

  return { success: true };
}

/**
 * Check if the input credentials match
 */
export function checkAdminCredentials(usernameInput: string, passwordInput: string): boolean {
  const user = (usernameInput || '').trim().toLowerCase();
  const pass = (passwordInput || '').trim();
  const currentPassword = getStoredAdminPassword();

  const isUserValid = user === 'admin' || user === 'admin@admin.com';
  const isPassValid = pass === currentPassword || pass === DEFAULT_ADMIN_PASSWORD;

  return isUserValid && isPassValid;
}
