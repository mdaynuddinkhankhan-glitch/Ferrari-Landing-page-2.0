import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  MessageCircle, 
  Wallet, 
  PieChart, 
  AlertCircle, 
  Save, 
  Send, 
  Check, 
  Truck,
  Copy,
  Info,
  AlertTriangle,
  Eye,
  EyeOff,
  Edit2
} from 'lucide-react';
import { OrderConfirmation } from '../types';
import { formatTaka } from '../utils/bengali';
import { 
  fetchSteadfastBalance, 
  createSteadfastConsignment,
  SteadfastBalanceResult,
  SteadfastOrderResult 
} from '../utils/steadfastApi';
import {
  isOrderBooked,
  saveLocalBooking,
  saveSteadfastBookingToCloud,
  subscribeToSteadfastConfig,
  saveSteadfastConfigToCloud,
} from '../services/orderService';

interface SteadfastCourierSectionProps {
  orders: OrderConfirmation[];
  onUpdateOrderStatus?: (orderId: string, status: string, additionalUpdates?: Partial<OrderConfirmation>) => void;
  onShowMessage: (msg: string) => void;
}

export interface SteadfastApiConfig {
  enabled: boolean;
  notesEnabled: boolean;
  apiKey: string;
  secretKey: string;
  webhookUrl: string;
  webhookSecretToken: string;
  lastSignalReceived: string;
}

export interface BookedConsignmentItem {
  consignmentId: string | number;
  trackingCode: string;
  status: 'in_review' | 'pending' | 'delivered' | 'cancelled' | string;
  bookedAt: string;
  codAmount: number;
}

const STORAGE_KEY_STEADFAST_CONFIG = 'porshibari_steadfast_config_v3';
const STORAGE_KEY_STEADFAST_BOOKINGS = 'porshibari_steadfast_bookings_v2';

export const SteadfastCourierSection: React.FC<SteadfastCourierSectionProps> = ({
  orders,
  onUpdateOrderStatus,
  onShowMessage
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'api_settings'>('dashboard');
  
  // API settings state exactly matching user's screenshot
  const [config, setConfig] = useState<SteadfastApiConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STEADFAST_CONFIG) ||
                    localStorage.getItem('porshibari_steadfast_config_v2') ||
                    localStorage.getItem('porshibari_steadfast_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            enabled: parsed.enabled ?? true,
            notesEnabled: parsed.notesEnabled ?? true,
            apiKey: String(parsed.apiKey || ''),
            secretKey: String(parsed.secretKey || ''),
            webhookUrl: String(parsed.webhookUrl || 'https://porshibarifashionhouse.shop/wp-json/stdf-api/v1/webhook'),
            webhookSecretToken: String(parsed.webhookSecretToken || 'uOftJCrv2RLtnq3rALOtZKmXF3sX5E6r'),
            lastSignalReceived: String(parsed.lastSignalReceived || 'Never'),
          };
        }
      }
    } catch {
      // fallback
    }
    return {
      enabled: true,
      notesEnabled: true,
      apiKey: '',
      secretKey: '',
      webhookUrl: 'https://porshibarifashionhouse.shop/wp-json/stdf-api/v1/webhook',
      webhookSecretToken: 'uOftJCrv2RLtnq3rALOtZKmXF3sX5E6r',
      lastSignalReceived: 'Never',
    };
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [isEditingWebhookUrl, setIsEditingWebhookUrl] = useState(false);
  const [isEditingToken, setIsEditingToken] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const hasApiCredentials = Boolean((config.apiKey || '').trim() && (config.secretKey || '').trim());

  // Balance checking state
  const [balance, setBalance] = useState<number | null>(null);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [balanceCheckedTime, setBalanceCheckedTime] = useState<string | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [isBookingOrder, setIsBookingOrder] = useState<string | null>(null);

  // Booked consignments
  const [bookedConsignments, setBookedConsignments] = useState<Record<string, BookedConsignmentItem>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STEADFAST_BOOKINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {
      // fallback
    }
    return {};
  });

  // 1. Subscribe to cloud Steadfast config so API keys persist across all browsers & devices
  useEffect(() => {
    const unsub = subscribeToSteadfastConfig((cloudConfig) => {
      if (cloudConfig && typeof cloudConfig === 'object') {
        setConfig((prev) => ({
          ...prev,
          ...cloudConfig,
        }));
        try {
          localStorage.setItem(STORAGE_KEY_STEADFAST_CONFIG, JSON.stringify({ ...config, ...cloudConfig }));
        } catch {}
      }
    });
    return () => unsub();
  }, []);

  // 2. Synchronize and enrich bookedConsignments with any booked orders from Firestore / orders state
  useEffect(() => {
    setBookedConsignments((prev) => {
      const merged = { ...prev };
      let changed = false;
      for (const order of orders) {
        const key = order.orderId;
        const cleanKey = String(order.orderId || '').replace('#', '');
        if (isOrderBooked(order)) {
          if (!merged[key] && !merged[cleanKey]) {
            const item: BookedConsignmentItem = {
              consignmentId: order.consignmentId || 'SFC-' + Date.now(),
              trackingCode: order.trackingCode || String(order.consignmentId || ''),
              status: (order.deliveryStatus || 'in_review').toLowerCase(),
              bookedAt: order.orderTime || new Date().toLocaleDateString('bn-BD'),
              codAmount: order.total || 0,
            };
            merged[key] = item;
            merged[cleanKey] = item;
            changed = true;
          }
        } else {
          if (merged[key] || merged[cleanKey] || merged[`#${cleanKey}`]) {
            delete merged[key];
            delete merged[cleanKey];
            delete merged[`#${cleanKey}`];
            changed = true;
          }
        }
      }
      if (changed) {
        try {
          localStorage.setItem(STORAGE_KEY_STEADFAST_BOOKINGS, JSON.stringify(merged));
        } catch {}
        return merged;
      }
      return prev;
    });
  }, [orders]);

  const handleCopyToClipboard = (text: string, fieldName: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      }
    } catch {
      // ignore clipboard error in restricted iframe
    }
    setCopiedField(fieldName);
    onShowMessage(`${fieldName} কপি করা হয়েছে!`);
    setTimeout(() => setCopiedField(null), 2500);
  };

  // Save config and optionally test
  const handleSaveConfig = async (andTest = false) => {
    try {
      localStorage.setItem(STORAGE_KEY_STEADFAST_CONFIG, JSON.stringify(config));
      saveSteadfastConfigToCloud(config).catch(() => {});
      
      if (!(config.apiKey || '').trim() || !(config.secretKey || '').trim()) {
        onShowMessage('সেটিংস সেভ হয়েছে। ব্যালেন্স দেখতে API Key ও Secret Key প্রদান করুন।');
        setBalance(null);
        return;
      }

      onShowMessage('Steadfast Courier সেটিংস সফলভাবে সেভ করা হয়েছে!');

      if (andTest || hasApiCredentials) {
        await handleCheckBalance(config.apiKey, config.secretKey);
      }
    } catch {
      onShowMessage('সেটিংস সেভ করতে সমস্যা হয়েছে।');
    }
  };

  // Check Balance with SteadFast API
  const handleCheckBalance = async (overrideApiKey?: string, overrideSecretKey?: string) => {
    const keyToUse = (overrideApiKey !== undefined ? overrideApiKey : (config.apiKey || '')).trim();
    const secToUse = (overrideSecretKey !== undefined ? overrideSecretKey : (config.secretKey || '')).trim();

    if (!keyToUse || !secToUse) {
      setBalanceError('Steadfast API Key এবং Secret Key দেওয়া হয়নি।');
      onShowMessage('ব্যালেন্স দেখতে "API Settings" ট্যাবে আপনার আসল API Key ও Secret Key দিন।');
      setActiveSubTab('api_settings');
      return;
    }

    setIsCheckingBalance(true);
    setBalanceError(null);

    const result: SteadfastBalanceResult = await fetchSteadfastBalance(keyToUse, secToUse);
    setIsCheckingBalance(false);

    if (result.success && result.balance !== undefined) {
      setBalance(result.balance);
      const now = new Date();
      const timeStr = `${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      setBalanceCheckedTime(timeStr);
      onShowMessage(`Steadfast লাইভ ব্যালেন্স: ${formatTaka(result.balance)}`);
    } else {
      let friendlyMsg = result.message || 'Steadfast থেকে ব্যালেন্স পাওয়া যায়নি।';
      if (friendlyMsg.includes('invalid API credentials') || friendlyMsg.includes('Unauthorized')) {
        friendlyMsg = 'ভুল API Key বা Secret Key দেওয়া হয়েছে। অনুগ্রহ করে SteadFast মার্চেন্ট প্যানেল থেকে সঠিক কী কপি করে দিন।';
      }
      setBalanceError(friendlyMsg);
      onShowMessage(friendlyMsg);
    }
  };

  // Real Book Order to Steadfast Courier
  const handleBookOrder = async (order: OrderConfirmation) => {
    if (isOrderBooked(order)) {
      onShowMessage(`অর্ডার ${order.orderId} ইতিমধ্যে Steadfast এ বুক করা আছে!`);
      return;
    }

    if (!config.enabled) {
      onShowMessage('SteadFast কুরিয়ার সার্ভিস ডিজেবল করা আছে। "API Settings" থেকে Enable করুন।');
      return;
    }

    if (!hasApiCredentials) {
      onShowMessage('SteadFast API কানেক্টেড নেই! অর্ডার বুক করতে আগে "API Settings" ট্যাবে আপনার আসল API Key ও Secret Key দিন। API ছাড়া এন্ট্রি হবে না।');
      setActiveSubTab('api_settings');
      return;
    }

    setIsBookingOrder(order.orderId);

    const cleanInvoice = String(order.orderId || '').replace('#', '');
    const payload = {
      invoice: cleanInvoice,
      recipient_name: order.customerName || '',
      recipient_phone: order.customerPhone || '',
      recipient_address: order.customerAddress || '',
      cod_amount: order.total || 0,
      note: config.notesEnabled ? `Porshibari - Size: ${order.size || 'M'}` : undefined,
    };

    let assignedConsignmentId = '';
    let assignedTrackingCode = '';
    let assignedStatus = 'PENDING';

    try {
      const res: SteadfastOrderResult = await createSteadfastConsignment(
        config.apiKey,
        config.secretKey,
        payload
      );

      if (res.success && res.consignmentId) {
        assignedConsignmentId = String(res.consignmentId);
        assignedTrackingCode = String(res.trackingCode || 'SFC-' + assignedConsignmentId);
        assignedStatus = (res.status || 'in_review').toUpperCase();
      } else {
        setIsBookingOrder(null);
        onShowMessage(`SteadFast API সমস্যা: ${res.message || 'বুকিং হতে পারেনি। অনুগ্রহ করে API কী অথবা ব্যালেন্স চেক করুন।'}`);
        return;
      }
    } catch (e: any) {
      setIsBookingOrder(null);
      onShowMessage(`SteadFast API সমস্যা: ${e?.message || 'কানেকশন সমস্যা হয়েছে।'}`);
      return;
    }

    setIsBookingOrder(null);

    if (!assignedConsignmentId) {
      onShowMessage('SteadFast থেকে কোনো Consignment ID পাওয়া যায়নি। অর্ডার এন্ট্রি হয়নি।');
      return;
    }

    const bookedTime = new Date().toLocaleDateString('bn-BD') + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const bookingRecord: BookedConsignmentItem = {
      consignmentId: assignedConsignmentId,
      trackingCode: assignedTrackingCode,
      status: assignedStatus.toLowerCase(),
      bookedAt: bookedTime,
      codAmount: order.total,
    };

    const newBookings: Record<string, BookedConsignmentItem> = {
      ...bookedConsignments,
      [order.orderId]: bookingRecord,
      [cleanInvoice]: bookingRecord,
      [`#${cleanInvoice}`]: bookingRecord,
    };

    setBookedConsignments(newBookings);
    try {
      localStorage.setItem(STORAGE_KEY_STEADFAST_BOOKINGS, JSON.stringify(newBookings));
    } catch {
      // ignore
    }

    saveLocalBooking(order.orderId, bookingRecord);
    saveSteadfastBookingToCloud(order.orderId, bookingRecord).catch(() => {});

    if (onUpdateOrderStatus) {
      onUpdateOrderStatus(order.orderId, 'Processing', {
        steadfastSent: true,
        consignmentId: String(assignedConsignmentId),
        trackingCode: assignedTrackingCode,
        deliveryStatus: assignedStatus,
      });
    }

    onShowMessage(`অর্ডার ${order.orderId} Steadfast এ বুক হয়েছে! (Consignment ID: ${assignedConsignmentId})`);
  };

  // Real Analytics calculations based on actual booked consignments (deduplicated by consignment ID)
  const allBooked = Object.values(bookedConsignments) as BookedConsignmentItem[];
  const uniqueConsignmentsMap = new Map<string, BookedConsignmentItem>();
  for (const item of allBooked) {
    if (item && item.consignmentId) {
      uniqueConsignmentsMap.set(String(item.consignmentId), item);
    }
  }
  const bookedList: BookedConsignmentItem[] = Array.from(uniqueConsignmentsMap.values());
  const totalBookedOrders = bookedList.length;
  const deliveredCount = bookedList.filter((b) => b.status === 'delivered').length;
  const pendingCount = bookedList.filter((b) => b.status === 'in_review' || b.status === 'pending').length;
  const cancelledCount = bookedList.filter((b) => b.status === 'cancelled').length;

  const deliveredPercent = totalBookedOrders > 0 ? Math.round((deliveredCount / totalBookedOrders) * 100) : 0;
  const pendingPercent = totalBookedOrders > 0 ? Math.round((pendingCount / totalBookedOrders) * 100) : 0;
  const cancelledPercent = totalBookedOrders > 0 ? Math.round((cancelledCount / totalBookedOrders) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Top Navigation Tabs */}
      <div className="bg-white rounded-t-xl border-b border-neutral-200 px-4 pt-3 flex items-center gap-6 shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveSubTab('dashboard')}
          className={`pb-3 text-sm font-bold transition-all relative cursor-pointer ${
            activeSubTab === 'dashboard'
              ? 'text-emerald-700'
              : 'text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <span>Dashboard</span>
          {activeSubTab === 'dashboard' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-t-full"></span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('api_settings')}
          className={`pb-3 text-sm font-bold transition-all relative cursor-pointer ${
            activeSubTab === 'api_settings'
              ? 'text-emerald-700'
              : 'text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <span>API Settings</span>
          {activeSubTab === 'api_settings' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-t-full"></span>
          )}
        </button>
      </div>

      {/* Main Content Area */}
      {activeSubTab === 'dashboard' ? (
        <div className="bg-white border border-neutral-200 rounded-b-xl rounded-t-none p-5 sm:p-7 shadow-xs space-y-6">
          {/* Header Row: SteadFast Courier Logo & Status Badge */}
          <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-neutral-100">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5">
                <div className="w-8 h-8 rounded-lg bg-[#004d2c] flex items-center justify-center text-white font-black italic shadow-xs">
                  <Send className="w-4 h-4 transform -rotate-45" />
                </div>
                <div>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-xl sm:text-2xl font-black italic tracking-tight text-neutral-800">
                      Stead<span className="text-[#004d2c]">Fast</span>
                    </span>
                  </div>
                  <p className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase -mt-1">
                    COURIER
                  </p>
                </div>
              </div>
            </div>

            {/* Connection Status Badge */}
            <div className="flex items-center gap-2">
              {config.enabled && hasApiCredentials ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>• Connection Active</span>
                </span>
              ) : !config.enabled ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-neutral-100 text-neutral-600 border border-neutral-300">
                  <span className="w-2 h-2 rounded-full bg-neutral-400"></span>
                  <span>• Disabled</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveSubTab('api_settings')}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-colors cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>• API কী দিন (Not Connected)</span>
                </button>
              )}
            </div>
          </div>

          {/* Alert prompt if API is not yet configured */}
          {!hasApiCredentials && (
            <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl flex items-start justify-between gap-3 text-xs">
              <div className="flex items-start gap-2.5 text-amber-900">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">আসল ব্যালেন্স ও রিয়েল-টাইম তথ্য দেখতে API Key প্রয়োজন</p>
                  <p className="text-amber-800/90 mt-0.5">
                    আপনার SteadFast মার্চেন্ট প্যানেল থেকে <strong>API Key</strong> ও <strong>Secret Key</strong> কপি করে <strong>API Settings</strong> ট্যাবে দিন।
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubTab('api_settings')}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shrink-0 cursor-pointer shadow-2xs"
              >
                API দিন
              </button>
            </div>
          )}

          {/* 2-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Check Balance & Facing Issue */}
            <div className="space-y-6">
              {/* Card 1: Check Balance */}
              <div className="bg-[#f2f8f4] border border-emerald-100 rounded-2xl p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-emerald-900 font-bold text-xs sm:text-sm tracking-wider uppercase">
                    <div className="w-6 h-6 rounded-md bg-emerald-200/80 flex items-center justify-center text-emerald-800">
                      <Wallet className="w-3.5 h-3.5" />
                    </div>
                    <span>CHECK BALANCE</span>
                  </div>

                  {balanceCheckedTime && (
                    <span className="text-[11px] text-emerald-700 font-mono bg-emerald-100/70 px-2 py-0.5 rounded-md">
                      {balanceCheckedTime}
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  {balance !== null ? (
                    <div className="bg-white/95 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between">
                      <div>
                        <p className="text-[11px] text-neutral-500 font-medium">উপলব্ধ ব্যালেন্স (Steadfast API)</p>
                        <p className="text-2xl font-black text-emerald-700 tracking-tight">
                          {formatTaka(balance)}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md">
                        লাইভ API
                      </span>
                    </div>
                  ) : (
                    <div className="bg-white/80 border border-dashed border-emerald-200 rounded-xl p-3.5 text-center">
                      <p className="text-xs text-neutral-600 font-medium">
                        {hasApiCredentials 
                          ? 'আসল ব্যালেন্স চেক করতে নিচের বাটনে ক্লিক করুন' 
                          : 'ব্যালেন্স দেখতে API Settings-এ Key ও Secret দিন'}
                      </p>
                    </div>
                  )}

                  {balanceError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                      <span>{balanceError}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleCheckBalance()}
                    disabled={isCheckingBalance}
                    className="px-5 py-2.5 bg-[#004d2c] hover:bg-[#003820] text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-60 active:scale-98"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingBalance ? 'animate-spin' : ''}`} />
                    <span>{isCheckingBalance ? 'ব্যালেন্স চেক হচ্ছে...' : 'Check Balance'}</span>
                  </button>
                </div>
              </div>

              {/* Card 2: Facing An Issue? */}
              <div className="bg-[#f8f9fb] border border-neutral-200/90 rounded-2xl p-5 sm:p-6 space-y-3.5">
                <div className="flex items-center gap-2.5 text-neutral-700 font-bold text-xs sm:text-sm tracking-wider uppercase">
                  <div className="w-6 h-6 rounded-md bg-neutral-200 flex items-center justify-center text-neutral-700">
                    <MessageCircle className="w-3.5 h-3.5" />
                  </div>
                  <span>FACING AN ISSUE? PLEASE LET US KNOW</span>
                </div>

                <div className="space-y-2.5 pt-1">
                  <a
                    href="https://facebook.com/steadfastcourier"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 bg-[#1877f2] hover:bg-[#166fe5] text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-xs"
                  >
                    <span className="font-black text-sm">f</span>
                    <span>Facebook</span>
                  </a>

                  <a
                    href="https://wa.me/8801977783233"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 bg-[#25d366] hover:bg-[#20ba59] text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-xs"
                  >
                    <MessageCircle className="w-4 h-4 fill-white" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Right Column: Steadfast Analytics */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 sm:p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-neutral-700 font-bold text-xs sm:text-sm tracking-wider uppercase">
                  <div className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center text-emerald-800">
                    <PieChart className="w-3.5 h-3.5" />
                  </div>
                  <span>STEADFAST ANALYTICS</span>
                </div>

                <span className="text-[11px] text-neutral-500 font-semibold">
                  আসল বুকিং ডাটা
                </span>
              </div>

              {/* Total Booked Box */}
              <div className="bg-[#eafaf1] border border-emerald-100/90 rounded-2xl p-6 text-center space-y-1">
                <p className="text-3xl sm:text-4xl font-black text-emerald-800 tracking-tight">
                  {totalBookedOrders}
                </p>
                <p className="text-xs font-extrabold text-emerald-700 uppercase tracking-wider">
                  TOTAL BOOKED ORDERS
                </p>
              </div>

              {/* Status List */}
              <div className="space-y-4 pt-1">
                {/* Delivered */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs sm:text-sm font-semibold">
                    <span className="flex items-center gap-2 text-neutral-700">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span>Delivered</span>
                    </span>
                    <span className="text-neutral-800 font-bold font-mono">
                      {deliveredCount} ({deliveredPercent}%)
                    </span>
                  </div>
                </div>

                {/* Pending / In Review */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs sm:text-sm font-semibold">
                    <span className="flex items-center gap-2 text-neutral-700">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      <span>Pending / In Review</span>
                    </span>
                    <span className="text-neutral-800 font-bold font-mono">
                      {pendingCount} ({pendingPercent}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-400 rounded-full transition-all duration-300"
                      style={{ width: `${pendingPercent > 0 ? pendingPercent : (totalBookedOrders === 0 ? 0 : 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Cancelled */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs sm:text-sm font-semibold">
                    <span className="flex items-center gap-2 text-neutral-700">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      <span>Cancelled</span>
                    </span>
                    <span className="text-neutral-800 font-bold font-mono">
                      {cancelledCount} ({cancelledPercent}%)
                    </span>
                  </div>
                </div>
              </div>

              {totalBookedOrders === 0 && (
                <p className="text-[11px] text-neutral-400 text-center italic">
                  * এখনো কোনো পার্সেল বুক করা হয়নি।
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ==================== API SETTINGS TAB (Exact Match to Screenshot) ==================== */
        <div className="bg-white border border-neutral-200 rounded-b-xl rounded-t-none p-5 sm:p-8 shadow-xs space-y-7">
          {/* Header Title */}
          <div>
            <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
              SteadFast Courier Settings
            </h2>
          </div>

          <div className="space-y-6">
            {/* 1. Enable/Disable Toggle */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-neutral-800 cursor-pointer" onClick={() => setConfig({ ...config, enabled: !config.enabled })}>
                Enable/Disable
              </label>

              <button
                type="button"
                role="switch"
                aria-checked={config.enabled}
                onClick={() => setConfig({ ...config, enabled: !config.enabled })}
                className={`w-13 h-7 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                  config.enabled ? 'bg-[#005a36]' : 'bg-neutral-300'
                }`}
              >
                <div
                  className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ${
                    config.enabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 2. Notes Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-semibold text-neutral-800 cursor-pointer" onClick={() => setConfig({ ...config, notesEnabled: !config.notesEnabled })}>
                  Notes
                </label>
                <p className="text-xs text-neutral-400">
                  Please enable this checkbox for send customer notes
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={config.notesEnabled}
                onClick={() => setConfig({ ...config, notesEnabled: !config.notesEnabled })}
                className={`w-13 h-7 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                  config.notesEnabled ? 'bg-[#005a36]' : 'bg-neutral-300'
                }`}
              >
                <div
                  className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ${
                    config.notesEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 3. API Key * */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-neutral-800">
                API Key <span className="text-neutral-500">*</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={config.apiKey}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                  placeholder="•••••••••••••••••••••••••"
                  className="w-full pr-10 pl-3.5 py-3 text-sm bg-white border border-neutral-300 rounded-xl outline-none focus:border-[#005a36] transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 text-neutral-400 hover:text-neutral-700 p-1 cursor-pointer transition-colors"
                  title={showApiKey ? 'Hide API Key' : 'Show API Key'}
                >
                  {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-neutral-400">
                This field is required
              </p>
            </div>

            {/* 4. Secret Key * */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-neutral-800">
                Secret Key <span className="text-neutral-500">*</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type={showSecretKey ? 'text' : 'password'}
                  value={config.secretKey}
                  onChange={(e) => setConfig({ ...config, secretKey: e.target.value })}
                  placeholder="••••••••••••••••••••"
                  className="w-full pr-10 pl-3.5 py-3 text-sm bg-white border border-neutral-300 rounded-xl outline-none focus:border-[#005a36] transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowSecretKey(!showSecretKey)}
                  className="absolute right-3 text-neutral-400 hover:text-neutral-700 p-1 cursor-pointer transition-colors"
                  title={showSecretKey ? 'Hide Secret Key' : 'Show Secret Key'}
                >
                  {showSecretKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-neutral-400">
                This field is required
              </p>
            </div>

            {/* 5. Webhook Callback URL */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-neutral-800">
                  Webhook Callback URL
                </label>
                <button
                  type="button"
                  onClick={() => setIsEditingWebhookUrl(!isEditingWebhookUrl)}
                  className="text-xs font-semibold text-neutral-500 hover:text-[#005a36] flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>{isEditingWebhookUrl ? 'Done' : 'Edit URL'}</span>
                </button>
              </div>

              {isEditingWebhookUrl ? (
                <input
                  type="text"
                  value={config.webhookUrl}
                  onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
                  className="w-full px-3.5 py-3 text-xs sm:text-sm bg-white border border-[#005a36] rounded-xl outline-none font-mono"
                />
              ) : (
                <div className="w-full px-4 py-3.5 bg-[#eef3f7] rounded-xl flex items-center justify-between gap-2 border border-neutral-200/60">
                  <span className="font-mono text-xs sm:text-sm text-neutral-800 break-all select-all font-medium">
                    {config.webhookUrl}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyToClipboard(config.webhookUrl, 'Webhook Callback URL')}
                    className="p-1.5 text-neutral-600 hover:text-[#005a36] hover:bg-white/80 rounded-lg transition-colors cursor-pointer shrink-0"
                    title="Copy URL"
                  >
                    {copiedField === 'Webhook Callback URL' ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              )}

              <div className="space-y-0.5 pt-0.5">
                <p className="text-xs text-neutral-500 flex items-center gap-1.5 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 inline-block"></span>
                  <span>Last signal received: {config.lastSignalReceived}</span>
                </p>
                <p className="text-xs text-neutral-400">
                  Copy and paste this URL into your SteadFast Merchant Dashboard API Webhook section.
                </p>
              </div>
            </div>

            {/* 6. Webhook Secret Token */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-neutral-800">
                  Webhook Secret Token
                </label>
                <button
                  type="button"
                  onClick={() => setIsEditingToken(!isEditingToken)}
                  className="text-xs font-semibold text-neutral-500 hover:text-[#005a36] flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>{isEditingToken ? 'Done' : 'Edit Token'}</span>
                </button>
              </div>

              {isEditingToken ? (
                <input
                  type="text"
                  value={config.webhookSecretToken}
                  onChange={(e) => setConfig({ ...config, webhookSecretToken: e.target.value })}
                  className="w-full px-3.5 py-3 text-xs sm:text-sm bg-white border border-[#005a36] rounded-xl outline-none font-mono"
                />
              ) : (
                <div className="w-full px-4 py-3.5 bg-[#eef3f7] rounded-xl flex items-center justify-between gap-2 border border-neutral-200/60">
                  <span className="font-mono text-xs sm:text-sm text-neutral-800 break-all select-all font-semibold tracking-wide">
                    {config.webhookSecretToken}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyToClipboard(config.webhookSecretToken, 'Webhook Secret Token')}
                    className="p-1.5 text-neutral-600 hover:text-[#005a36] hover:bg-white/80 rounded-lg transition-colors cursor-pointer shrink-0"
                    title="Copy Token"
                  >
                    {copiedField === 'Webhook Secret Token' ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              )}

              <p className="text-xs text-neutral-400 pt-0.5">
                Copy and paste this Token as the Authorization Token in your SteadFast Dashboard.
              </p>
            </div>

            {/* Save & Test Action Buttons */}
            <div className="pt-4 border-t border-neutral-100 flex items-center justify-between flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleSaveConfig(false)}
                className="px-6 py-2.5 bg-[#005a36] hover:bg-[#00472a] text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>সেটিংস সেভ করুন</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveConfig(true)}
                disabled={isCheckingBalance}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingBalance ? 'animate-spin' : ''}`} />
                <span>Test Connection &amp; আসল ব্যালেন্স দেখুন</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
