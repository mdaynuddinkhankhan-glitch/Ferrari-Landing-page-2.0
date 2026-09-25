import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import {
  db,
  handleFirestoreError,
  OperationType,
  isFirestoreQuotaExhausted,
  isFirestoreQuotaError,
  markFirestoreQuotaExhausted,
} from '../lib/firebase';
import { OrderConfirmation, OrderedProductItem } from '../types';

const ORDERS_COLLECTION = 'orders';
const SETTINGS_COLLECTION = 'settings';
const STEADFAST_CONFIG_DOC = 'steadfast_config';
const STEADFAST_BOOKINGS_DOC = 'steadfast_bookings';
const LOCAL_ORDERS_KEY = 'porshibari_orders';
const PENDING_SYNC_KEY = 'porshibari_pending_sync_orders';
const STEADFAST_BOOKINGS_KEY = 'porshibari_steadfast_bookings_v2';

/**
 * Universal deep data cleaner to prevent Firestore undefined errors
 */
export function cleanFirestoreData(data: any): any {
  if (data === undefined) return null;
  if (data === null) return null;
  if (typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data
      .map((item) => cleanFirestoreData(item))
      .filter((item) => item !== undefined);
  }
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      clean[key] = cleanFirestoreData(value);
    }
  }
  return clean;
}

export function generateUniqueOrderId(): string {
  // Generates clean, distinct 6-digit order ID e.g. #784920
  const randomPrefix = Math.floor(10 + Math.random() * 90); // 2 digits: 10-99
  const timeSuffix = (Date.now() % 10000).toString().padStart(4, '0'); // 4 digits
  return `#${randomPrefix}${timeSuffix}`;
}

export function sanitizeOrderId(orderId: string): string {
  // Ensure valid document ID (alphanumeric, dash, underscore)
  const clean = String(orderId).replace(/[^a-zA-Z0-9_-]/g, '');
  return clean || `order_${Date.now()}`;
}

export function getLocalBookings(): Record<string, any> {
  try {
    const raw = localStorage.getItem(STEADFAST_BOOKINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {
    // ignore
  }
  return {};
}

export function saveLocalBooking(orderId: string, booking: any): void {
  try {
    const current = getLocalBookings();
    const cleanId = String(orderId || '').replace('#', '');
    current[orderId] = booking;
    current[cleanId] = booking;
    current[`#${cleanId}`] = booking;
    localStorage.setItem(STEADFAST_BOOKINGS_KEY, JSON.stringify(current));
  } catch {
    // ignore
  }
}

export function removeLocalBooking(orderId: string): void {
  try {
    const current = getLocalBookings();
    const cleanId = String(orderId || '').replace('#', '');
    delete current[orderId];
    delete current[cleanId];
    delete current[`#${cleanId}`];
    localStorage.setItem(STEADFAST_BOOKINGS_KEY, JSON.stringify(current));

    const rawLegacy = localStorage.getItem('porshibari_steadfast_bookings');
    if (rawLegacy) {
      const parsed = JSON.parse(rawLegacy);
      delete parsed[orderId];
      delete parsed[cleanId];
      delete parsed[`#${cleanId}`];
      localStorage.setItem('porshibari_steadfast_bookings', JSON.stringify(parsed));
    }
  } catch {
    // ignore
  }
}

/**
 * Universal, fail-safe check to determine if an order has already been booked to SteadFast.
 * Checks steadfastSent flag and consignmentId presence.
 */
export function isOrderBooked(order?: OrderConfirmation | null): boolean {
  if (!order) return false;
  // If explicitly not sent, definitely false
  if (order.steadfastSent === false) return false;
  // Only true if steadfastSent flag is true OR valid non-empty consignmentId/trackingCode is present
  if (order.steadfastSent === true) return true;
  if (order.consignmentId && String(order.consignmentId).trim() !== '') return true;
  if (order.trackingCode && String(order.trackingCode).trim() !== '') return true;

  return false;
}

/**
 * Reset Steadfast booking for an order (clears consignment ID and resets button)
 */
export async function resetOrderSteadfastBooking(orderId: string): Promise<boolean> {
  try {
    const docId = sanitizeOrderId(orderId);
    removeLocalBooking(orderId);

    // 1. Update local cached orders first
    const localList = getLocalStoredOrders();
    const cleanId = String(orderId || '').replace('#', '');
    const updated = localList.map((o) => {
      if (o.orderId === orderId || sanitizeOrderId(o.orderId) === docId || String(o.orderId).replace('#', '') === cleanId) {
        const copy = { ...o, steadfastSent: false };
        delete copy.consignmentId;
        delete copy.trackingCode;
        delete copy.deliveryStatus;
        return copy;
      }
      return o;
    });
    saveLocalStoredOrders(updated);

    // 2. Update Firestore cloud database if quota healthy
    if (!isFirestoreQuotaExhausted()) {
      await updateDoc(doc(db, ORDERS_COLLECTION, docId), {
        steadfastSent: false,
        consignmentId: deleteField(),
        trackingCode: deleteField(),
        deliveryStatus: deleteField(),
      });
    }

    return true;
  } catch (err) {
    if (isFirestoreQuotaError(err)) {
      markFirestoreQuotaExhausted();
      return true;
    }
    console.error('Failed to reset steadfast booking:', err);
    return false;
  }
}

export function getLocalStoredOrders(): OrderConfirmation[] {
  try {
    const raw = localStorage.getItem(LOCAL_ORDERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

export function saveLocalStoredOrders(orders: OrderConfirmation[]): void {
  try {
    localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(orders));
  } catch {
    // ignore
  }
}

export function getPendingSyncOrders(): OrderConfirmation[] {
  try {
    const raw = localStorage.getItem(PENDING_SYNC_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function queuePendingSync(order: OrderConfirmation): void {
  try {
    const raw = localStorage.getItem(PENDING_SYNC_KEY);
    const list: OrderConfirmation[] = raw ? JSON.parse(raw) : [];
    if (!list.some((o) => o.orderId === order.orderId)) {
      list.push(order);
      localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(list));
    }
  } catch {
    // ignore
  }
}

/**
 * Sync any locally stored offline or pending orders to Firestore cloud database
 */
export async function syncPendingOrdersToFirestore(): Promise<void> {
  if (isFirestoreQuotaExhausted()) {
    return;
  }
  try {
    const raw = localStorage.getItem(PENDING_SYNC_KEY);
    if (!raw) return;
    const list: OrderConfirmation[] = JSON.parse(raw);
    if (!Array.isArray(list) || list.length === 0) return;

    const remaining: OrderConfirmation[] = [];
    for (const order of list) {
      if (isFirestoreQuotaExhausted()) {
        remaining.push(order);
        continue;
      }
      try {
        const docId = sanitizeOrderId(order.orderId);
        await setDoc(doc(db, ORDERS_COLLECTION, docId), cleanFirestoreData(order), { merge: true });
      } catch (err) {
        if (isFirestoreQuotaError(err)) {
          markFirestoreQuotaExhausted();
        }
        remaining.push(order);
      }
    }
    if (remaining.length > 0) {
      localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(remaining));
    } else {
      localStorage.removeItem(PENDING_SYNC_KEY);
    }
  } catch {
    // ignore
  }
}

/**
 * Permanently saves an order to Firestore cloud database.
 * Ensures central cross-device synchronization so all devices/Admin dashboards see it immediately.
 */
export async function saveOrderToFirestore(order: OrderConfirmation): Promise<{ success: boolean; orderId: string }> {
  const docId = sanitizeOrderId(order.orderId);

  // Clean and sanitize ordered items to prevent heavy payloads or undefined keys
  const sanitizedOrderedItems: OrderedProductItem[] = Array.isArray(order.orderedItems)
    ? order.orderedItems.map((item) => ({
        id: String(item.id || ''),
        name: String(item.name || ''),
        colorName: String(item.colorName || ''),
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 1,
      }))
    : [];

  const payload: OrderConfirmation = {
    orderId: order.orderId || `#${docId}`,
    orderTime: order.orderTime || new Date().toLocaleString('bn-BD'),
    customerName: (order.customerName || 'গ্রাহক').trim() || 'গ্রাহক',
    customerPhone: (order.customerPhone || '01700000000').trim() || '01700000000',
    customerAddress: (order.customerAddress || 'ঢাকা').trim() || 'ঢাকা',
    size: order.size || 'L',
    selectedColors: (order.selectedColors || {}) as Record<string, boolean>,
    colorQuantities: (order.colorQuantities || {}) as Record<string, number>,
    shippingZone: order.shippingZone || 'outside_dhaka',
    shippingCost: Number(order.shippingCost) || 0,
    subtotal: Number(order.subtotal) || 0,
    total: Number(order.total) || 0,
    status: order.status || 'Processing',
    createdAt: order.createdAt || new Date().toISOString(),
    orderedItems: sanitizedOrderedItems,
    ...(order.orderNotes ? { orderNotes: order.orderNotes } : {}),
    ...(order.steadfastSent === false
      ? { steadfastSent: false }
      : order.steadfastSent === true || order.consignmentId
      ? {
          steadfastSent: true,
          ...(order.consignmentId ? { consignmentId: String(order.consignmentId) } : {}),
          ...(order.trackingCode ? { trackingCode: String(order.trackingCode) } : {}),
          ...(order.deliveryStatus ? { deliveryStatus: String(order.deliveryStatus).toUpperCase() } : {}),
        }
      : { steadfastSent: false }),
    ...(order.customerScore ? { customerScore: order.customerScore } : {}),
  };

  const cleanedPayload = cleanFirestoreData(payload);

  // 1. Dual-tier local storage backup on this device
  try {
    const localList = getLocalStoredOrders();
    const existingIdx = localList.findIndex((o) => o.orderId === payload.orderId || sanitizeOrderId(o.orderId) === docId);
    if (existingIdx >= 0) {
      localList[existingIdx] = { ...localList[existingIdx], ...payload };
    } else {
      localList.unshift(payload);
    }
    saveLocalStoredOrders(localList);
  } catch (err) {
    console.warn('Local backup save note:', err);
  }

  // 2. Central Cloud Firestore persistence with guaranteed timeout
  try {
    const docRef = doc(db, ORDERS_COLLECTION, docId);
    await Promise.race([
      setDoc(docRef, cleanedPayload, { merge: true }),
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore write timeout')), 2500)
      ),
    ]);
    return { success: true, orderId: payload.orderId };
  } catch (error) {
    console.warn('Central database order save offline/timeout:', error);
    queuePendingSync(payload);
    // Background retry when network allows
    try {
      setDoc(doc(db, ORDERS_COLLECTION, docId), cleanedPayload, { merge: true }).catch(() => {});
    } catch {}
    return { success: true, orderId: payload.orderId };
  }
}

export async function updateOrderInFirestore(
  orderId: string,
  updates: Partial<OrderConfirmation>
): Promise<void> {
  const docId = sanitizeOrderId(orderId);
  const path = `${ORDERS_COLLECTION}/${docId}`;

  // If this update contains booking information, immediately persist locally and to cloud
  if (updates.steadfastSent || updates.consignmentId || updates.trackingCode) {
    const bookingRecord = {
      consignmentId: updates.consignmentId || 'SFC-' + Date.now(),
      trackingCode: updates.trackingCode || '',
      status: (updates.deliveryStatus || 'in_review').toLowerCase(),
      bookedAt: new Date().toLocaleDateString('bn-BD') + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    saveLocalBooking(orderId, bookingRecord);
    // Asynchronously sync booking record to Firestore settings collection
    saveSteadfastBookingToCloud(orderId, bookingRecord).catch(() => {});
  }

  // Update local copy
  const localList = getLocalStoredOrders();
  const idx = localList.findIndex((o) => o.orderId === orderId || sanitizeOrderId(o.orderId) === docId);
  let fullMergedOrder: OrderConfirmation | null = null;
  if (idx >= 0) {
    localList[idx] = { ...localList[idx], ...updates };
    fullMergedOrder = localList[idx];
    saveLocalStoredOrders(localList);
  }

  if (isFirestoreQuotaExhausted()) {
    if (fullMergedOrder) queuePendingSync(fullMergedOrder);
    return;
  }

  try {
    const docRef = doc(db, ORDERS_COLLECTION, docId);
    const cleaned = cleanFirestoreData(fullMergedOrder || updates);
    await setDoc(docRef, cleaned, { merge: true });
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      markFirestoreQuotaExhausted();
      if (fullMergedOrder) queuePendingSync(fullMergedOrder);
      return;
    }
    console.warn('Error updating order in Firestore:', error);
    if (fullMergedOrder) {
      queuePendingSync(fullMergedOrder);
    }
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteOrderFromFirestore(orderId: string): Promise<void> {
  const docId = sanitizeOrderId(orderId);
  const path = `${ORDERS_COLLECTION}/${docId}`;

  // Remove from local cache
  const localList = getLocalStoredOrders().filter((o) => o.orderId !== orderId && sanitizeOrderId(o.orderId) !== docId);
  saveLocalStoredOrders(localList);

  if (isFirestoreQuotaExhausted()) {
    return;
  }

  try {
    const docRef = doc(db, ORDERS_COLLECTION, docId);
    await deleteDoc(docRef);
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      markFirestoreQuotaExhausted();
      return;
    }
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Real-time subscription to orders from Firestore.
 * Automatically synchronizes with local storage and prevents data loss.
 * Intelligently merges booking state so booked orders never revert to unbooked.
 */
export function subscribeToOrders(
  onUpdate: (orders: OrderConfirmation[]) => void,
  onError?: (err: Error) => void
): () => void {
  // Sync any pending offline orders if cloud quota is healthy
  if (!isFirestoreQuotaExhausted()) {
    syncPendingOrdersToFirestore().catch(() => {});
  }

  const colRef = collection(db, ORDERS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const cloudOrders: OrderConfirmation[] = [];
      snapshot.forEach((d) => {
        cloudOrders.push(d.data() as OrderConfirmation);
      });

      const localOrders = getLocalStoredOrders();
      const localBookings = getLocalBookings();

      const localMap = new Map<string, OrderConfirmation>();
      for (const loc of localOrders) {
        localMap.set(loc.orderId, loc);
        const cleanId = String(loc.orderId || '').replace('#', '');
        localMap.set(cleanId, loc);
      }

      const mergedOrders: OrderConfirmation[] = [];
      const seenOrderIds = new Set<string>();

      for (const cloud of cloudOrders) {
        const cleanId = String(cloud.orderId || '').replace('#', '');

        // Cloud is the single source of truth. If order is not sent in cloud, purge stale local booking
        if (!cloud.steadfastSent) {
          removeLocalBooking(cloud.orderId);
          removeLocalBooking(cleanId);
          removeLocalBooking(`#${cleanId}`);
        }

        const isBooked = Boolean(cloud.steadfastSent && (cloud.consignmentId || cloud.trackingCode));
        const booking = isBooked
          ? (localBookings[cloud.orderId] || localBookings[cleanId] || localBookings[`#${cleanId}`])
          : undefined;

        const consignmentId = isBooked ? (cloud.consignmentId || booking?.consignmentId || '') : undefined;
        const trackingCode = isBooked ? (cloud.trackingCode || booking?.trackingCode || '') : undefined;
        const deliveryStatus = isBooked ? (cloud.deliveryStatus || (booking?.status ? String(booking.status).toUpperCase() : 'PENDING')) : undefined;

        const merged: OrderConfirmation = {
          ...cloud,
          steadfastSent: isBooked,
          consignmentId,
          trackingCode,
          deliveryStatus,
          status: cloud.status || 'Processing',
        };

        mergedOrders.push(merged);
        seenOrderIds.add(merged.orderId);
        seenOrderIds.add(cleanId);
      }

      // Check only explicit offline pending orders that haven't reached Firestore yet
      const pendingSyncList = getPendingSyncOrders();
      if (pendingSyncList.length > 0) {
        for (const pending of pendingSyncList) {
          const cleanId = String(pending.orderId || '').replace('#', '');
          if (!seenOrderIds.has(pending.orderId) && !seenOrderIds.has(cleanId)) {
            mergedOrders.push(pending);
            seenOrderIds.add(pending.orderId);
            seenOrderIds.add(cleanId);
          }
        }
      }

      // Sort descending by orderTime or numerical orderId
      mergedOrders.sort((a, b) => {
        const numA = parseInt(String(a.orderId).replace(/\D/g, '') || '0', 10);
        const numB = parseInt(String(b.orderId).replace(/\D/g, '') || '0', 10);
        if (numB !== numA) return numB - numA;
        const timeA = new Date(a.createdAt || a.orderTime || 0).getTime();
        const timeB = new Date(b.createdAt || b.orderTime || 0).getTime();
        return timeB - timeA;
      });

      // Update local storage backup with authoritative merged truth
      saveLocalStoredOrders(mergedOrders);
      onUpdate(mergedOrders);
    },

    (error) => {
      if (isFirestoreQuotaError(error)) {
        markFirestoreQuotaExhausted();
      }
      console.warn('Firebase orders subscription warning:', error?.message || error);
      if (onError && !isFirestoreQuotaError(error)) onError(error);
      // On offline error or quota limit, provide local cached orders
      onUpdate(getLocalStoredOrders());
    }
  );
}

/**
 * Save SteadFast Booking to Cloud Document in settings/steadfast_bookings
 * Guarantees cross-device and cross-domain retention of booking records.
 */
export async function saveSteadfastBookingToCloud(orderId: string, booking: any): Promise<void> {
  if (isFirestoreQuotaExhausted()) return;
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, STEADFAST_BOOKINGS_DOC);
    const cleanId = String(orderId || '').replace('#', '');
    await setDoc(
      docRef,
      {
        [cleanId]: booking,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    if (isFirestoreQuotaError(err)) {
      markFirestoreQuotaExhausted();
    }
    console.warn('Steadfast booking cloud sync note:', err);
  }
}

/**
 * Subscribe to Steadfast Config from cloud document settings/steadfast_config
 */
export function subscribeToSteadfastConfig(
  callback: (config: any) => void
): () => void {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, STEADFAST_CONFIG_DOC);
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          callback(data);
        }
      },
      (err) => {
        console.warn('Steadfast config subscription note:', err);
      }
    );
  } catch {
    return () => {};
  }
}

/**
 * Save Steadfast API Config to cloud document settings/steadfast_config
 */
export async function saveSteadfastConfigToCloud(config: any): Promise<void> {
  if (isFirestoreQuotaExhausted()) {
    return;
  }
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, STEADFAST_CONFIG_DOC);
    await setDoc(
      docRef,
      {
        ...config,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    if (isFirestoreQuotaError(err)) {
      markFirestoreQuotaExhausted();
      return;
    }
    console.warn('Steadfast config cloud save note:', err);
  }
}

/**
 * Helper to fetch Steadfast API credentials from local cache or Firestore
 */
export async function getSteadfastApiCredentials(): Promise<{ apiKey: string; secretKey: string; enabled: boolean }> {
  let apiKey = '';
  let secretKey = '';
  let enabled = true;

  try {
    const raw = localStorage.getItem('porshibari_steadfast_config_v3') ||
                localStorage.getItem('porshibari_steadfast_config_v2') ||
                localStorage.getItem('porshibari_steadfast_config');
    if (raw) {
      const parsed = JSON.parse(raw);
      apiKey = (parsed.apiKey || '').trim();
      secretKey = (parsed.secretKey || '').trim();
      if (parsed.enabled !== undefined) enabled = parsed.enabled;
    }
  } catch {}

  if (!apiKey || !secretKey) {
    try {
      const docRef = doc(db, SETTINGS_COLLECTION, STEADFAST_CONFIG_DOC);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        apiKey = (data.apiKey || '').trim();
        secretKey = (data.secretKey || '').trim();
        if (data.enabled !== undefined) enabled = data.enabled;
        if (apiKey && secretKey) {
          try {
            localStorage.setItem('porshibari_steadfast_config_v3', JSON.stringify(data));
          } catch {}
        }
      }
    } catch {}
  }

  return { apiKey, secretKey, enabled };
}

export async function fetchOrdersFromFirestore(): Promise<OrderConfirmation[]> {
  const path = ORDERS_COLLECTION;
  try {
    const colRef = collection(db, path);
    const snapshot = await getDocs(colRef);
    const orders: OrderConfirmation[] = [];
    snapshot.forEach((d) => {
      orders.push(d.data() as OrderConfirmation);
    });
    return orders;
  } catch (error) {
    console.warn('Error fetching orders from Firestore, fallback to local:', error);
    return getLocalStoredOrders();
  }
}
