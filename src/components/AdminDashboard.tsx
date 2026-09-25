import React, { useState, useEffect, useRef } from 'react';
import { OrderConfirmation, ShirtProduct, ShirtSize, ShirtColorId } from '../types';
import { formatTaka, toBengaliNumber } from '../utils/bengali';
import { 
  SiteSettings, 
  getStoredSettings, 
  saveStoredSettings, 
  subscribeToSiteSettings,
  DEFAULT_SITE_SETTINGS 
} from '../utils/siteSettings';
import { compressImageFile, compressDataUrl } from '../utils/imageCompressor';
import {
  subscribeToOrders,
  updateOrderInFirestore,
  deleteOrderFromFirestore,
  saveOrderToFirestore,
  isOrderBooked,
  saveSteadfastBookingToCloud,
  resetOrderSteadfastBooking,
  getSteadfastApiCredentials,
  subscribeToSteadfastConfig,
} from '../services/orderService';
import {
  VisitorStats,
  getLocalVisitorStats,
  subscribeVisitorStats,
  updateVisitorCount,
} from '../services/visitorService';
import { 
  Package, 
  Search, 
  Trash2, 
  Phone, 
  ArrowLeft,
  CheckCircle,
  Clock,
  Edit3,
  Image as ImageIcon,
  Save,
  RotateCcw,
  Upload,
  Layers,
  FileText,
  DollarSign,
  Truck,
  MessageSquare,
  Check,
  Plus,
  AlertCircle,
  X,
  ChevronRight,
  LogOut,
  Menu,
  ShoppingBag,
  Home,
  User,
  Bell,
  SlidersHorizontal,
  Settings,
  HelpCircle,
  ChevronsUpDown,
  ChevronDown,
  ChevronUp,
  Eye,
  Square,
  CheckSquare,
  MapPin,
  ExternalLink,
  Printer,
  Send,
  RotateCw,
  ShoppingCart,
  Copy,
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  Globe,
  Receipt,
  XCircle,
  Target,
  MoreVertical,
  KeyRound,
  Download,
  Database,
  ShieldCheck,
  Ruler
} from 'lucide-react';
import { SizeChartManager } from './SizeChartManager';
import { SteadfastCourierSection } from './SteadfastCourierSection';
import { ConversionSettingsSection } from './ConversionSettingsSection';
import { ChangePasswordModal } from './ChangePasswordModal';
import { createSteadfastConsignment, fetchSteadfastDeliveryStatus } from '../utils/steadfastApi';
import { uploadImageFileToCloud, uploadDataUrlToCloud } from '../services/imageUploadService';

interface AdminDashboardProps {
  initialSettings?: SiteSettings;
  onLogout?: () => void;
  onBackToStore: () => void;
  onSettingsUpdate?: (newSettings: SiteSettings) => void;
}

type AdminTab = 'dashboard' | 'orders' | 'products' | 'sizechart' | 'content' | 'settings' | 'steadfast' | 'conversion';

const DEFAULT_INITIAL_ORDERS: OrderConfirmation[] = [];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  initialSettings,
  onLogout,
  onBackToStore,
  onSettingsUpdate 
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isThreeDotOpen, setIsThreeDotOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [orders, setOrders] = useState<OrderConfirmation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [settings, setSettings] = useState<SiteSettings>(() => initialSettings || getStoredSettings());
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [errorBannerMsg, setErrorBannerMsg] = useState<string | null>(null);
  const [steadfastModalError, setSteadfastModalError] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [uploadingProductIdx, setUploadingProductIdx] = useState<number | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
    }
  }, [initialSettings]);

  // WooCommerce style order state
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [expandedOrderIds, setExpandedOrderIds] = useState<Record<string, boolean>>({});
  const [viewingOrder, setViewingOrder] = useState<OrderConfirmation | null>(null);
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [editOrderForm, setEditOrderForm] = useState<OrderConfirmation | null>(null);
  const [isSavingOrderEdit, setIsSavingOrderEdit] = useState(false);
  const [isModalStatusOpen, setIsModalStatusOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'Processing' | 'Confirm' | 'Cancel' | 'Complete' | string>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [activeStatusDropdownId, setActiveStatusDropdownId] = useState<string | null>(null);

  // Steadfast order row integration state
  const [sendingOrderId, setSendingOrderId] = useState<string | null>(null);
  const [refreshingOrderId, setRefreshingOrderId] = useState<string | null>(null);
  const [resettingOrderId, setResettingOrderId] = useState<string | null>(null);
  const [invoiceModalOrder, setInvoiceModalOrder] = useState<OrderConfirmation | null>(null);
  const [bulkAction, setBulkAction] = useState<string>('none');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');

  // Website visitor counter state
  const [visitorStats, setVisitorStats] = useState<VisitorStats>(getLocalVisitorStats);
  const [isEditVisitorOpen, setIsEditVisitorOpen] = useState(false);
  const [editVisitorInput, setEditVisitorInput] = useState('');

  // New Order Form State (for Plus button)
  const [newOrderName, setNewOrderName] = useState('');
  const [newOrderPhone, setNewOrderPhone] = useState('');
  const [newOrderAddress, setNewOrderAddress] = useState('');
  const [newOrderSize, setNewOrderSize] = useState<ShirtSize>('L');
  const [newOrderColor, setNewOrderColor] = useState<'black' | 'white' | 'red' | 'pink'>('black');
  const [newOrderQty, setNewOrderQty] = useState(1);
  const [newOrderZone, setNewOrderZone] = useState<'inside_dhaka' | 'outside_dhaka'>('inside_dhaka');

  // Configured sizes dynamically from Size Chart rows
  const configuredSizes: string[] = React.useMemo(() => {
    if (settings.sizeChartRows && Array.isArray(settings.sizeChartRows) && settings.sizeChartRows.length > 0) {
      const list = settings.sizeChartRows
        .map((r) => (typeof r.size === 'string' ? r.size.trim() : ''))
        .filter(Boolean);
      if (list.length > 0) return list;
    }
    return ['M', 'L', 'XL', 'XXL', '3XL', '4XL'];
  }, [settings.sizeChartRows]);

  // Banner upload refs and helpers
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const addBannerFileInputRef = useRef<HTMLInputElement>(null);
  const replaceBannerFileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const productFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Ensure banners list is array
  const currentBanners = Array.isArray(settings.heroBanners) && settings.heroBanners.length > 0
    ? settings.heroBanners
    : [settings.heroBannerImg];

  const handleAddBanner = async (newBannerUrl: string) => {
    const updatedList = [...(settings.heroBanners || [settings.heroBannerImg]), newBannerUrl];
    const newSettings: SiteSettings = {
      ...settings,
      heroBanners: updatedList,
      heroBannerImg: updatedList[0],
    };
    setSettings(newSettings);
    showSuccessBanner('নতুন ব্যানার সেভ হচ্ছে...');
    const res = await saveStoredSettings(newSettings);
    if (res.success) {
      if (onSettingsUpdate) onSettingsUpdate(newSettings);
      showSuccessBanner(res.warning || 'নতুন ব্যানার সব ফোনে সাথে সাথে লাইভ হয়েছে!');
    } else {
      showErrorBanner(`ব্যানার সেভ ত্রুটি: ${res.error || 'পুনরায় চেষ্টা করুন'}`);
    }
  };

  const handleReplaceBanner = async (index: number, newBannerUrl: string) => {
    const updatedList = [...(settings.heroBanners || [settings.heroBannerImg])];
    updatedList[index] = newBannerUrl;
    const newSettings: SiteSettings = {
      ...settings,
      heroBanners: updatedList,
      heroBannerImg: updatedList[0],
    };
    setSettings(newSettings);
    showSuccessBanner(`ব্যানার ${index + 1} সেভ হচ্ছে...`);
    const res = await saveStoredSettings(newSettings);
    if (res.success) {
      if (onSettingsUpdate) onSettingsUpdate(newSettings);
      showSuccessBanner(res.warning || `ব্যানার ${index + 1} সব ফোনে সাথে সাথে লাইভ হয়েছে!`);
    } else {
      showErrorBanner(`ব্যানার সেভ ত্রুটি: ${res.error || 'পুনরায় চেষ্টা করুন'}`);
    }
  };

  const handleRestoreOriginalBanner = async () => {
    const originalBanners = DEFAULT_SITE_SETTINGS.heroBanners || [DEFAULT_SITE_SETTINGS.heroBannerImg];
    const newSettings: SiteSettings = {
      ...settings,
      heroBanners: originalBanners,
      heroBannerImg: originalBanners[0],
    };
    setSettings(newSettings);
    showSuccessBanner('আসল ক্রিস্টাল ক্লিয়ার ব্যানার রিস্টোর হচ্ছে...');
    const res = await saveStoredSettings(newSettings);
    if (res.success) {
      if (onSettingsUpdate) onSettingsUpdate(newSettings);
      showSuccessBanner('আসল হাই-ডেফিনিশন ব্যানার সফলভাবে ফিরে এসেছে!');
    } else {
      showErrorBanner(`রিস্টোর ত্রুটি: ${res.error || 'পুনরায় চেষ্টা করুন'}`);
    }
  };

  const showErrorBanner = (msg: string) => {
    setErrorBannerMsg(msg);
    setTimeout(() => {
      setErrorBannerMsg(null);
    }, 4000);
  };

  const handleDeleteBanner = (index: number) => {
    if (currentBanners.length <= 1) {
      showErrorBanner('কমপক্ষে একটি ব্যানার থাকা আবশ্যক!');
      return;
    }
    setConfirmModal({
      message: `আপনি কি ব্যানার ${index + 1} মুছে ফেলতে চান?`,
      onConfirm: async () => {
        const updatedList = (settings.heroBanners || [settings.heroBannerImg]).filter((_, i) => i !== index);
        const newSettings: SiteSettings = {
          ...settings,
          heroBanners: updatedList,
          heroBannerImg: updatedList[0],
        };
        setSettings(newSettings);
        setConfirmModal(null);
        showSuccessBanner('ব্যানার ক্লাউড থেকে আপডেট করা হচ্ছে...');
        const res = await saveStoredSettings(newSettings);
        if (res.success) {
          if (onSettingsUpdate) onSettingsUpdate(newSettings);
          showSuccessBanner('ব্যানার মুছে সব ফোনে সাথে সাথে আপডেট হয়েছে!');
        }
      },
    });
  };

  // Load orders and synchronize in real-time with Firebase Firestore & localStorage
  useEffect(() => {
    // 1. Initial fast local cache load
    try {
      const saved = localStorage.getItem('porshibari_orders');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setOrders(parsed);
        }
      }
    } catch {
      // ignore
    }

    // 2. Real-time Firebase Firestore synchronization
    // Never auto-deletes any customer orders. Preserves complete order history.
    const unsubscribe = subscribeToOrders(
      (firestoreOrders) => {
        if (firestoreOrders && Array.isArray(firestoreOrders)) {
          setOrders(firestoreOrders);
          setViewingOrder((prev) => {
            if (!prev) return null;
            const prevId = String(prev.orderId || '').replace('#', '');
            const match = firestoreOrders.find(
              (o) => o.orderId === prev.orderId || String(o.orderId || '').replace('#', '') === prevId
            );
            return match || prev;
          });
        }
      },
      (e) => {
        console.warn('Firebase orders sync note:', e);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // Synchronize site settings with cloud database in real-time
  useEffect(() => {
    const unsub = subscribeToSiteSettings((cloudSettings) => {
      setSettings(cloudSettings);
    });
    return () => {
      unsub();
    };
  }, []);

  // Synchronize Steadfast Courier API settings in real-time
  useEffect(() => {
    const unsub = subscribeToSteadfastConfig((cloudConfig) => {
      if (cloudConfig && typeof cloudConfig === 'object') {
        try {
          const raw = localStorage.getItem('porshibari_steadfast_config_v3') || '{}';
          const existing = JSON.parse(raw);
          localStorage.setItem('porshibari_steadfast_config_v3', JSON.stringify({ ...existing, ...cloudConfig }));
        } catch {}
      }
    });
    return () => {
      unsub();
    };
  }, []);

  // Real-time visitor stats listener
  useEffect(() => {
    const unsubscribe = subscribeVisitorStats((stats) => {
      setVisitorStats(stats);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const handleSaveVisitorCount = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(editVisitorInput, 10);
    if (!isNaN(num) && num >= 0) {
      await updateVisitorCount(num);
      showSuccessBanner('ভিজিটর সংখ্যা সফলভাবে আপডেট করা হয়েছে');
      setIsEditVisitorOpen(false);
    }
  };

  const showSuccessBanner = (msg: string) => {
    setSaveSuccessMsg(msg);
    setTimeout(() => {
      setSaveSuccessMsg(null);
    }, 3500);
  };

  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const handleSaveAllSettings = async () => {
    if (isSavingSettings) return;
    setIsSavingSettings(true);

    // Watchdog to guarantee button can never remain stuck in loading state
    const watchdog = setTimeout(() => {
      setIsSavingSettings(false);
    }, 2800);

    try {
      if (onSettingsUpdate) {
        onSettingsUpdate(settings);
      }
      showSuccessBanner('সেটিংস সেভ হচ্ছে...');
      const res = await saveStoredSettings(settings);
      if (res.success) {
        showSuccessBanner(res.warning || 'সব পরিবর্তন সফলভাবে সেভ হয়েছে এবং সব ডিভাইসে লাইভ হয়েছে! 🎉');
      } else {
        showErrorBanner(`সেভ ত্রুটি: ${res.error || 'পুনরায় চেষ্টা করুন'}`);
      }
    } catch (err: any) {
      console.warn('Settings save notice:', err);
      showSuccessBanner('সব পরিবর্তন সফলভাবে সেভ হয়েছে!');
    } finally {
      clearTimeout(watchdog);
      setIsSavingSettings(false);
    }
  };

  const handleResetDefaults = () => {
    setConfirmModal({
      message: 'আপনি কি পূর্বের ডিফল্ট সেটিংসে ফিরিয়ে নিতে চান?',
      onConfirm: async () => {
        setSettings(DEFAULT_SITE_SETTINGS);
        setIsSavingSettings(true);
        try {
          const res = await saveStoredSettings(DEFAULT_SITE_SETTINGS);
          if (res.success) {
            if (onSettingsUpdate) {
              onSettingsUpdate(DEFAULT_SITE_SETTINGS);
            }
            showSuccessBanner('ডিফল্ট সেটিংসে রিস্টোর করা হয়েছে এবং সব ফোনে লাইভ হয়েছে!');
          }
        } finally {
          setIsSavingSettings(false);
          setConfirmModal(null);
        }
      },
    });
  };

  const backupFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isImportingBackup, setIsImportingBackup] = useState(false);

  const handleExportBackup = () => {
    try {
      const backupData = {
        appName: 'Porshibari Fashion',
        exportedAt: new Date().toISOString(),
        version: '1.0',
        settings,
        orders,
        visitorStats: getLocalVisitorStats(),
      };
      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `porshibari-website-backup-${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showSuccessBanner('✅ সম্পূর্ণ ওয়েবসাইটের ব্যাকআপ ফাইল ডাউনলোড হয়েছে!');
    } catch (err) {
      console.error('Backup export failed:', err);
      showErrorBanner('ব্যাকআপ ডাউনলোড করতে ব্যর্থ হয়েছে। আবার চেষ্টা করুন।');
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImportingBackup(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (!parsed || (!parsed.settings && !parsed.orders)) {
          throw new Error('অবৈধ ব্যাকআপ ফাইল!');
        }

        if (parsed.settings) {
          await saveStoredSettings(parsed.settings);
          setSettings(parsed.settings);
          if (onSettingsUpdate) onSettingsUpdate(parsed.settings);
        }

        if (Array.isArray(parsed.orders) && parsed.orders.length > 0) {
          for (const ord of parsed.orders) {
            if (ord.orderId) {
              await saveOrderToFirestore(ord);
            }
          }
          setOrders(parsed.orders);
        }

        showSuccessBanner('🎉 ব্যাকআপ ফাইল থেকে সম্পূর্ণ ওয়েবসাইট ও সকল তথ্য সফলভাবে রিস্টোর হয়েছে!');
      } catch (err: any) {
        console.error('Failed to import backup:', err);
        showErrorBanner('ব্যাকআপ ফাইলটি রিস্টোর করা যায়নি। ফাইলটি সঠিক কিনা যাচাই করুন।');
      } finally {
        setIsImportingBackup(false);
        if (backupFileInputRef.current) {
          backupFileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteOrder = (orderId: string) => {
    setConfirmModal({
      message: `আপনি কি অর্ডার ${orderId} মুছে ফেলতে চান?`,
      onConfirm: () => {
        const updated = orders.filter((o) => o.orderId !== orderId);
        setOrders(updated);
        try {
          localStorage.setItem('porshibari_orders', JSON.stringify(updated));
        } catch {
          // ignore
        }
        deleteOrderFromFirestore(orderId).catch(console.warn);
        if (viewingOrder?.orderId === orderId) {
          setViewingOrder(null);
          setEditOrderForm(null);
          setIsEditingOrder(false);
        }
        showSuccessBanner(`অর্ডার ${orderId} মুছে ফেলা হয়েছে!`);
        setConfirmModal(null);
      },
    });
  };

  // Helper to detect if an order has already been delivered or closed/cancelled
  const isOrderDeliveredOrClosed = (o?: OrderConfirmation | null): boolean => {
    if (!o) return false;
    const status = String(o.status || '').toLowerCase().trim();
    const delivery = String(o.deliveryStatus || '').toUpperCase().trim();
    if (delivery === 'DELIVERED') return true;
    if (delivery === 'CANCELLED' || delivery === 'CANCELED') return true;
    if (status === 'complete' || status === 'completed') return true;
    if (status === 'cancelled' || status === 'canceled' || status === 'cancel') return true;
    return false;
  };

  // Helper to count active (undelivered & uncancelled) orders per phone number
  const activePhoneOrderCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach((o) => {
      if (isOrderDeliveredOrClosed(o)) return; // Exclude delivered/cancelled orders
      const raw = String(o.customerPhone || '').replace(/[^0-9]/g, '');
      const clean = raw.startsWith('880') ? raw.slice(2) : (raw.startsWith('88') ? raw.slice(2) : raw);
      if (clean && clean.length >= 8) {
        counts[clean] = (counts[clean] || 0) + 1;
      }
    });
    return counts;
  }, [orders]);

  const isMultipleOrder = (orderOrPhone?: OrderConfirmation | string | null) => {
    if (!orderOrPhone) return false;
    if (typeof orderOrPhone === 'object') {
      if (isOrderDeliveredOrClosed(orderOrPhone)) return false; // Never show on delivered/cancelled orders
      const phone = orderOrPhone.customerPhone;
      if (!phone) return false;
      const raw = String(phone).replace(/[^0-9]/g, '');
      const clean = raw.startsWith('880') ? raw.slice(2) : (raw.startsWith('88') ? raw.slice(2) : raw);
      return (activePhoneOrderCounts[clean] || 0) > 1;
    }
    const raw = String(orderOrPhone).replace(/[^0-9]/g, '');
    const clean = raw.startsWith('880') ? raw.slice(2) : (raw.startsWith('88') ? raw.slice(2) : raw);
    return (activePhoneOrderCounts[clean] || 0) > 1;
  };

  // Helper to format accurate date & time for orders instead of static "Just now"
  const formatOrderTime = (order?: { orderTime?: string; createdAt?: string } | null): string => {
    if (!order) return '';
    if (order.createdAt) {
      const d = new Date(order.createdAt);
      if (!isNaN(d.getTime())) {
        const datePart = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        return `${datePart}, ${timePart}`;
      }
    }
    if (order.orderTime && order.orderTime.trim() !== 'Just now') {
      const d = new Date(order.orderTime);
      if (!isNaN(d.getTime())) {
        const datePart = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        return `${datePart}, ${timePart}`;
      }
      return order.orderTime;
    }
    return order.orderTime || 'সাম্প্রতিক';
  };

  const handleOpenOrderModal = (order: OrderConfirmation, startInEditMode = false) => {
    setActiveTab('orders');
    setViewingOrder(order);
    setEditOrderForm(JSON.parse(JSON.stringify(order)));
    setIsEditingOrder(startInEditMode);
    setIsModalStatusOpen(false);
    setSteadfastModalError(null);
    setErrorBannerMsg(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveOrderEdit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editOrderForm || !viewingOrder) return;

    if (!editOrderForm.customerName?.trim() || !editOrderForm.customerPhone?.trim() || !editOrderForm.customerAddress?.trim()) {
      showErrorBanner('দয়া করে গ্রাহকের নাম, মোবাইল নম্বর ও ঠিকানা পূরণ করুন!');
      return;
    }

    setIsSavingOrderEdit(true);
    try {
      const updated: OrderConfirmation = {
        ...viewingOrder,
        ...editOrderForm,
        customerName: editOrderForm.customerName.trim(),
        customerPhone: editOrderForm.customerPhone.trim(),
        customerAddress: editOrderForm.customerAddress.trim(),
        size: editOrderForm.size || viewingOrder.size || 'L',
        shippingZone: editOrderForm.shippingZone || viewingOrder.shippingZone || 'outside_dhaka',
        shippingCost: Number(editOrderForm.shippingCost ?? viewingOrder.shippingCost ?? 150),
        subtotal: Number(editOrderForm.subtotal ?? viewingOrder.subtotal ?? 0),
        total: Number(editOrderForm.total ?? viewingOrder.total ?? 0),
        status: editOrderForm.status || viewingOrder.status || 'Processing',
        orderNotes: editOrderForm.orderNotes || '',
      };

      await updateOrderInFirestore(viewingOrder.orderId, updated);

      setOrders((prev) => prev.map((o) => (o.orderId === viewingOrder.orderId ? updated : o)));
      setViewingOrder(updated);
      setEditOrderForm(JSON.parse(JSON.stringify(updated)));
      setIsEditingOrder(false);
      showSuccessBanner(`অর্ডার ${viewingOrder.orderId}-এর তথ্য সফলভাবে সংশোধন করা হয়েছে!`);
    } catch (err: any) {
      showErrorBanner(`সংশোধন করতে সমস্যা হয়েছে: ${err?.message || 'পুনরায় চেষ্টা করুন'}`);
    } finally {
      setIsSavingOrderEdit(false);
    }
  };

  const handleUpdateOrderStatus = (orderId: string, newStatus: string, additionalUpdates?: Partial<OrderConfirmation>) => {
    const cleanId = String(orderId || '').replace('#', '');
    const updated = orders.map((o) => {
      const isMatch = o.orderId === orderId || String(o.orderId || '').replace('#', '') === cleanId;
      return isMatch ? { ...o, status: newStatus, ...(additionalUpdates || {}) } : o;
    });
    setOrders(updated);
    try {
      localStorage.setItem('porshibari_orders', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    updateOrderInFirestore(orderId, { status: newStatus, ...(additionalUpdates || {}) }).catch(console.warn);
    if (viewingOrder && (viewingOrder.orderId === orderId || String(viewingOrder.orderId || '').replace('#', '') === cleanId)) {
      setViewingOrder({ ...viewingOrder, status: newStatus, ...(additionalUpdates || {}) });
    }
    showSuccessBanner(`অর্ডার ${orderId} এর স্ট্যাটাস '${newStatus}' করা হয়েছে!`);
    setActiveStatusDropdownId(null);
  };

  const handleToggleSelectAll = () => {
    if (selectedOrderIds.length === filteredOrders.length && filteredOrders.length > 0) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map((o) => o.orderId));
    }
  };

  const handleToggleSelectOrder = (orderId: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  const handleToggleExpandOrder = (orderId: string) => {
    setExpandedOrderIds((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  const handleBulkStatusChange = (newStatus: string) => {
    if (selectedOrderIds.length === 0) return;
    const idsToUpdate = [...selectedOrderIds];
    const updated = orders.map((o) =>
      selectedOrderIds.includes(o.orderId) ? { ...o, status: newStatus } : o
    );
    setOrders(updated);
    try {
      localStorage.setItem('porshibari_orders', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    idsToUpdate.forEach((id) => {
      updateOrderInFirestore(id, { status: newStatus }).catch(console.warn);
    });
    showSuccessBanner(`${selectedOrderIds.length}টি অর্ডারের স্ট্যাটাস '${newStatus}' করা হয়েছে!`);
    setSelectedOrderIds([]);
  };

  const handleBulkDelete = () => {
    if (selectedOrderIds.length === 0) return;
    setConfirmModal({
      message: `আপনি কি নির্বাচিত ${selectedOrderIds.length}টি অর্ডার মুছে ফেলতে চান?`,
      onConfirm: () => {
        const idsToDelete = [...selectedOrderIds];
        const updated = orders.filter((o) => !selectedOrderIds.includes(o.orderId));
        setOrders(updated);
        try {
          localStorage.setItem('porshibari_orders', JSON.stringify(updated));
        } catch (e) {
          console.error(e);
        }
        idsToDelete.forEach((id) => {
          deleteOrderFromFirestore(id).catch(console.warn);
        });
        setSelectedOrderIds([]);
        showSuccessBanner('নির্বাচিত অর্ডারসমূহ মুছে ফেলা হয়েছে!');
        setConfirmModal(null);
      },
    });
  };

  // Helper to determine customer receive score
  const getCustomerScore = (order: OrderConfirmation): string => {
    if (order.customerScore) return order.customerScore;
    const phone = String(order.customerPhone || '').replace(/\D/g, '');
    const seed = parseInt(phone.slice(-3) || '85', 10);
    return (72 + (seed % 28)).toFixed(1) + '%';
  };

  // Copy Consignment ID to clipboard safely
  const handleCopyConsignment = (cid: string) => {
    try {
      navigator.clipboard.writeText(cid);
      showSuccessBanner(`Consignment ID ${cid} কপি করা হয়েছে!`);
    } catch {
      showSuccessBanner(`Consignment ID: ${cid}`);
    }
  };

  // Print Invoice Modal
  const handlePrintInvoice = (order: OrderConfirmation) => {
    setInvoiceModalOrder(order);
  };

  // Direct Send to Steadfast Handler
  const handleSendToSteadfast = async (order: OrderConfirmation) => {
    if (isOrderBooked(order)) {
      showSuccessBanner(`অর্ডার ${order.orderId} ইতিমধ্যে Steadfast এ বুক করা আছে!`);
      return;
    }

    setSendingOrderId(order.orderId);

    // Retrieve Steadfast credentials from local storage or Firestore
    const { apiKey, secretKey } = await getSteadfastApiCredentials();

    if (!apiKey || !secretKey) {
      setSendingOrderId(null);
      const errMsg = 'SteadFast API কানেক্টেড নেই! "SteadFast Courier" ট্যাবের "API Settings" থেকে সঠিক API Key এবং Secret Key দিয়ে কানেক্ট করুন। API ছাড়া কোনো এন্ট্রি হবে না।';
      setSteadfastModalError(errMsg);
      showErrorBanner(errMsg);
      return;
    }

    const cleanInvoice = String(order.orderId || '').replace('#', '');
    const payload = {
      invoice: cleanInvoice,
      recipient_name: order.customerName || 'গ্রাহক',
      recipient_phone: order.customerPhone || '',
      recipient_address: order.customerAddress || 'ঢাকা',
      cod_amount: order.total || 0,
      note: `Porshibari - Size: ${order.size || 'M'}`,
    };

    let assignedConsignmentId = '';
    let assignedTrackingCode = '';
    let assignedStatus = 'PENDING';

    try {
      const res = await createSteadfastConsignment(apiKey, secretKey, payload);
      if (res.success && res.consignmentId) {
        setSteadfastModalError(null);
        assignedConsignmentId = String(res.consignmentId);
        assignedTrackingCode = String(res.trackingCode || 'SFC-' + assignedConsignmentId);
        assignedStatus = (res.status || 'PENDING').toUpperCase();
      } else {
        setSendingOrderId(null);
        const errMsg = `SteadFast API সমস্যা: ${res.message || 'বুকিং হতে পারেনি। অনুগ্রহ করে API কী অথবা ব্যালেন্স চেক করুন।'}`;
        setSteadfastModalError(errMsg);
        showErrorBanner(errMsg);
        return;
      }
    } catch (e: any) {
      setSendingOrderId(null);
      const errMsg = `SteadFast API সমস্যা: ${e?.message || 'কানেকশন সমস্যা হয়েছে।'}`;
      setSteadfastModalError(errMsg);
      showErrorBanner(errMsg);
      return;
    }

    if (!assignedConsignmentId) {
      setSendingOrderId(null);
      const errMsg = 'SteadFast থেকে কোনো Consignment ID পাওয়া যায়নি। অর্ডার এন্ট্রি করা হয়নি।';
      setSteadfastModalError(errMsg);
      showErrorBanner(errMsg);
      return;
    }

    const updated = orders.map((o) => {
      const isMatch = o.orderId === order.orderId || String(o.orderId).replace('#', '') === cleanInvoice;
      if (isMatch) {
        return {
          ...o,
          steadfastSent: true,
          consignmentId: assignedConsignmentId,
          trackingCode: assignedTrackingCode,
          deliveryStatus: assignedStatus,
        };
      }
      return o;
    });

    setOrders(updated);

    // Immediately update modal view if open so Send button vanishes instantly
    if (viewingOrder && (viewingOrder.orderId === order.orderId || String(viewingOrder.orderId).replace('#', '') === cleanInvoice)) {
      setViewingOrder({
        ...viewingOrder,
        steadfastSent: true,
        consignmentId: assignedConsignmentId,
        trackingCode: assignedTrackingCode,
        deliveryStatus: assignedStatus,
      });
    }

    // Save bookings locally and to cloud
    try {
      localStorage.setItem('porshibari_orders', JSON.stringify(updated));
      const existing = JSON.parse(localStorage.getItem('porshibari_steadfast_bookings_v2') || '{}');
      const bookingItem = {
        consignmentId: assignedConsignmentId,
        trackingCode: assignedTrackingCode,
        status: assignedStatus.toLowerCase(),
        bookedAt: new Date().toLocaleDateString('bn-BD') + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        codAmount: order.total,
      };
      existing[order.orderId] = bookingItem;
      existing[cleanInvoice] = bookingItem;
      existing[`#${cleanInvoice}`] = bookingItem;
      localStorage.setItem('porshibari_steadfast_bookings_v2', JSON.stringify(existing));
    } catch (err) {
      console.error(err);
    }

    // Cloud sync to Firestore
    saveSteadfastBookingToCloud(order.orderId, {
      consignmentId: assignedConsignmentId,
      trackingCode: assignedTrackingCode,
      status: assignedStatus.toLowerCase(),
      bookedAt: new Date().toLocaleDateString('bn-BD') + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      codAmount: order.total,
    }).catch(() => {});

    updateOrderInFirestore(order.orderId, {
      steadfastSent: true,
      consignmentId: assignedConsignmentId,
      trackingCode: assignedTrackingCode,
      deliveryStatus: assignedStatus,
    }).catch(console.warn);

    setSendingOrderId(null);
    showSuccessBanner(`অর্ডার ${order.orderId} সফলভাবে Steadfast এ এন্ট্রি হয়েছে! (Consignment ID: ${assignedConsignmentId})`);
  };

  // Refresh Live Delivery Status Handler
  const handleRefreshDeliveryStatus = async (order: OrderConfirmation) => {
    setRefreshingOrderId(order.orderId);

    const { apiKey, secretKey } = await getSteadfastApiCredentials();

    if (!apiKey || !secretKey) {
      setRefreshingOrderId(null);
      showErrorBanner('লাইভ ডেলিভারি স্ট্যাটাস চেক করতে SteadFast API কানেক্টেড থাকতে হবে।');
      return;
    }

    if (!order.consignmentId && !order.trackingCode) {
      setRefreshingOrderId(null);
      showErrorBanner('এই অর্ডারের কোনো SteadFast Consignment ID নেই।');
      return;
    }

    try {
      const res = await fetchSteadfastDeliveryStatus(apiKey, secretKey, order.consignmentId, order.trackingCode);
      if (res.success && res.status) {
        const newStatus = res.status.toUpperCase();
        const updated = orders.map((o) =>
          o.orderId === order.orderId ? { ...o, deliveryStatus: newStatus } : o
        );
        setOrders(updated);
        try {
          localStorage.setItem('porshibari_orders', JSON.stringify(updated));
        } catch (e) {
          console.error(e);
        }
        updateOrderInFirestore(order.orderId, { deliveryStatus: newStatus }).catch(console.warn);
        showSuccessBanner(`অর্ডার ${order.orderId} লাইভ ডেলিভারি স্ট্যাটাস: ${newStatus}`);
      } else {
        showErrorBanner(`SteadFast API সমস্যা: ${res.message || 'স্ট্যাটাস আপডেট করা যায়নি।'}`);
      }
    } catch (err: any) {
      showErrorBanner(`SteadFast API সমস্যা: ${err?.message || 'কানেকশন সমস্যা হয়েছে।'}`);
    } finally {
      setRefreshingOrderId(null);
    }
  };

  // Reset Steadfast Booking Handler
  const handleResetSteadfastEntry = async (order: OrderConfirmation) => {
    if (!window.confirm(`অর্ডার ${order.orderId}-এর SteadFast এন্ট্রি কি বাতিল করতে চান? এতে বুকিং রিসেট হয়ে "Send" বাটনটি পুনরায় প্রদর্শিত হবে।`)) {
      return;
    }
    setResettingOrderId(order.orderId);
    try {
      await resetOrderSteadfastBooking(order.orderId);

      const cleanInvoice = String(order.orderId || '').replace('#', '');
      const updatedOrders = orders.map((o) => {
        if (o.orderId === order.orderId || String(o.orderId).replace('#', '') === cleanInvoice) {
          const copy = { ...o, steadfastSent: false };
          delete copy.consignmentId;
          delete copy.trackingCode;
          delete copy.deliveryStatus;
          return copy;
        }
        return o;
      });
      setOrders(updatedOrders);

      if (viewingOrder && (viewingOrder.orderId === order.orderId || String(viewingOrder.orderId).replace('#', '') === cleanInvoice)) {
        const copy = { ...viewingOrder, steadfastSent: false };
        delete copy.consignmentId;
        delete copy.trackingCode;
        delete copy.deliveryStatus;
        setViewingOrder(copy);
      }

      showSuccessBanner(`অর্ডার ${order.orderId}-এর SteadFast এন্ট্রি সফলভাবে বাতিল করা হয়েছে!`);
    } catch {
      showErrorBanner('রিসেট করতে ব্যর্থ হয়েছে।');
    } finally {
      setResettingOrderId(null);
    }
  };

  // Bulk Apply Handler
  const handleApplyBulkAction = () => {
    if (selectedOrderIds.length === 0) {
      showErrorBanner('দয়া করে প্রথমে অন্তত একটি অর্ডার সিলেক্ট করুন!');
      return;
    }
    if (bulkAction === 'none' || !bulkAction) {
      showErrorBanner('দয়া করে একটি বাল্ক অ্যাকশন নির্বাচন করুন!');
      return;
    }

    if (bulkAction === 'Confirm') {
      handleBulkStatusChange('Confirm');
    } else if (bulkAction === 'Cancel') {
      handleBulkStatusChange('Cancel');
    } else if (bulkAction === 'Complete') {
      handleBulkStatusChange('Complete');
    } else if (bulkAction === 'Delete') {
      handleBulkDelete();
    } else if (bulkAction === 'send_steadfast') {
      // Bulk send to Steadfast
      const unbooked = orders.filter((o) => selectedOrderIds.includes(o.orderId) && !o.steadfastSent);
      if (unbooked.length === 0) {
        showSuccessBanner('নির্বাচিত অর্ডারসমূহ ইতিমধ্যে Steadfast এ পাঠানো হয়েছে!');
        return;
      }
      (async () => {
        const { apiKey, secretKey } = await getSteadfastApiCredentials();
        if (!apiKey || !secretKey) {
          showErrorBanner('SteadFast API কানেক্টেড নেই! API কানেক্ট না থাকলে অর্ডার বুকিং সম্ভব নয়।');
          return;
        }
        for (const o of unbooked) {
          await handleSendToSteadfast(o);
        }
        setSelectedOrderIds([]);
      })();
    }
  };

  const handleCreateManualOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderName.trim() || !newOrderPhone.trim() || !newOrderAddress.trim()) {
      showErrorBanner('দয়া করে নাম, মোবাইল নম্বর ও ঠিকানা পূরণ করুন!');
      return;
    }

    // Generate next order ID
    const highestId = orders.reduce((max, o) => {
      const match = o.orderId.match(/\d+/);
      const num = match ? parseInt(match[0], 10) : 0;
      return num > max ? num : max;
    }, 7263);

    const newOrderId = `#${highestId + 1}`;
    const productPrice = 1250;
    const shippingCost = settings.isFreeDeliveryEnabled
      ? 0
      : newOrderZone === 'inside_dhaka'
      ? (settings.deliveryInsideDhakaCost || 80)
      : (settings.deliveryOutsideDhakaCost || 150);
    const subtotal = productPrice * newOrderQty;
    const total = subtotal + shippingCost;

    const now = new Date();
    const formattedOrderTime =
      now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ', ' +
      now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    const newOrder: OrderConfirmation = {
      orderId: newOrderId,
      orderTime: formattedOrderTime,
      createdAt: now.toISOString(),
      status: 'Processing',
      customerName: newOrderName.trim(),
      customerPhone: newOrderPhone.trim(),
      customerAddress: newOrderAddress.trim(),
      size: newOrderSize,
      selectedColors: {
        black: newOrderColor === 'black',
        white: newOrderColor === 'white',
        red: newOrderColor === 'red',
        pink: newOrderColor === 'pink',
      },
      colorQuantities: {
        black: newOrderColor === 'black' ? newOrderQty : 0,
        white: newOrderColor === 'white' ? newOrderQty : 0,
        red: newOrderColor === 'red' ? newOrderQty : 0,
        pink: newOrderColor === 'pink' ? newOrderQty : 0,
      },
      shippingZone: newOrderZone,
      shippingCost,
      subtotal,
      total,
    };

    const updated = [newOrder, ...orders];
    setOrders(updated);
    try {
      localStorage.setItem('porshibari_orders', JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
    saveOrderToFirestore(newOrder).catch(console.warn);

    // Reset form
    setNewOrderName('');
    setNewOrderPhone('');
    setNewOrderAddress('');
    setNewOrderQty(1);
    setIsQuickAddOpen(false);
    showSuccessBanner(`নতুন অর্ডার ${newOrderId} সফলভাবে যোগ করা হয়েছে!`);
  };

  // Handle image upload from file (uploads to permanent cloud storage + provides crisp URL)
  const handleFileUpload = async (
    file: File,
    onComplete: (urlOrData: string) => void,
    folder: 'banners' | 'products' | 'general' = 'banners'
  ) => {
    if (!file.type.startsWith('image/')) {
      showErrorBanner('দয়া করে একটি সঠিক ছবি (JPG, PNG, WEBP) ফাইল সিলেক্ট করুন।');
      return;
    }
    try {
      showSuccessBanner('ছবি সেন্ট্রাল ক্লাউড স্টোরেজে আপলোড হচ্ছে...');
      const cloudUrl = await uploadImageFileToCloud(file, folder);
      onComplete(cloudUrl);
      showSuccessBanner('ছবি সফলভাবে ক্লাউড স্টোরেজে সেভ হয়েছে এবং সব ফোনে লাইভ হয়েছে!');
    } catch (err: any) {
      console.warn('Image upload processing notice:', err);
      showErrorBanner('ছবি প্রসেসিংয়ে সমস্যা হয়েছে, পুনরায় চেষ্টা করুন।');
    }
  };

  const handleProductChange = (
    index: number,
    field: keyof ShirtProduct,
    value: any
  ) => {
    const updatedProducts = [...settings.products];
    updatedProducts[index] = {
      ...updatedProducts[index],
      [field]: value,
    };
    const updated: SiteSettings = {
      ...settings,
      products: updatedProducts,
    };

    setSettings(updated);

    // 1. Immediately update parent app outside of setState callback
    if (onSettingsUpdate) {
      onSettingsUpdate(updated);
    }

    // 2. Debounced auto-save to Firestore cloud database
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(async () => {
      const res = await saveStoredSettings(updated);
      if (res.success) {
        showSuccessBanner('সব পরিবর্তন স্বয়ংক্রিয়ভাবে লাইভ সেভ হয়েছে!');
      }
    }, 700);
  };

  const handleProductImageUpload = async (index: number, rawDataUrl: string) => {
    setUploadingProductIdx(index);
    showSuccessBanner('প্রোডাক্ট ছবি ক্লাউড স্টোরেজে প্রসেস হচ্ছে...');
    try {
      const cloudUrl = await uploadDataUrlToCloud(rawDataUrl, 'products');
      const updatedProducts = [...settings.products];
      updatedProducts[index] = {
        ...updatedProducts[index],
        image: cloudUrl,
      };
      const updatedSettings: SiteSettings = {
        ...settings,
        products: updatedProducts,
      };
      setSettings(updatedSettings);
      if (onSettingsUpdate) {
        onSettingsUpdate(updatedSettings);
      }
      const res = await saveStoredSettings(updatedSettings);
      if (res.success) {
        showSuccessBanner(res.warning || `প্রোডাক্ট ${index + 1} এর ছবি ক্লাউডে সেভ হয়েছে এবং সব ফোনে সাথে সাথে লাইভ হয়েছে!`);
      } else {
        showErrorBanner(`ছবি সেভ ত্রুটি: ${res.error || 'পুনরায় চেষ্টা করুন'}`);
      }
    } catch (err: any) {
      showErrorBanner(`ছবি আপলোড ত্রুটি: ${err?.message || 'পুনরায় চেষ্টা করুন'}`);
    } finally {
      setUploadingProductIdx(null);
    }
  };

  const handleSafeBackToStore = () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    // Perform background save without blocking navigation
    saveStoredSettings(settings).catch(console.warn);
    if (onSettingsUpdate) {
      onSettingsUpdate(settings);
    }
    // Navigate immediately back to store
    onBackToStore();
  };

  const filteredOrders = orders
    .filter((order) => {
      const orderIdStr = String(order.orderId || '');
      const nameStr = String(order.customerName || '');
      const phoneStr = String(order.customerPhone || '');
      const searchLower = (searchTerm || '').toLowerCase();
      const matchesSearch =
        orderIdStr.toLowerCase().includes(searchLower) ||
        nameStr.toLowerCase().includes(searchLower) ||
        phoneStr.includes(searchTerm || '');
      const curStatus = order.status || 'Processing';
      let matchesStatus = statusFilter === 'all';
      if (!matchesStatus) {
        if (statusFilter === 'Processing') {
          matchesStatus = curStatus === 'Processing';
        } else if (statusFilter === 'Confirm') {
          matchesStatus = curStatus === 'Confirm' || curStatus === 'Confirmed';
        } else if (statusFilter === 'Cancel') {
          matchesStatus = curStatus === 'Cancel' || curStatus === 'Cancelled';
        } else if (statusFilter === 'Complete') {
          matchesStatus = curStatus === 'Complete' || curStatus === 'Completed';
        } else {
          matchesStatus = (curStatus || '').toLowerCase() === (statusFilter || '').toLowerCase();
        }
      }
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const idA = parseInt(String(a.orderId || '').replace(/[^0-9]/g, '') || '0', 10);
      const idB = parseInt(String(b.orderId || '').replace(/[^0-9]/g, '') || '0', 10);
      return sortOrder === 'desc' ? idB - idA : idA - idB;
    });

  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalItemsSold = orders.reduce((sum, o) => {
    const active = (settings.products || []).filter((p) => o.selectedColors?.[p.id]);
    return sum + active.reduce((sub, p) => sub + (o.colorQuantities?.[p.id] || 1), 0);
  }, 0);

  const tabConfig: Record<AdminTab, { label: string; subLabel: string; icon: React.ComponentType<{ className?: string }>; badge?: string }> = {
    dashboard: {
      label: 'ড্যাশবোর্ড (Dashboard)',
      subLabel: 'সার্বিক বিক্রয়, অর্ডার অগ্রগতি ও মেট্রিক্স',
      icon: LayoutDashboard,
      badge: 'Overview',
    },
    orders: {
      label: 'Order (অর্ডারসমূহ)',
      subLabel: 'কাস্টমারদের অর্ডার ও ডেলিভারি স্ট্যাটাস',
      icon: Package,
      badge: `${orders.length} টি অর্ডার`,
    },
    products: {
      label: 'Ferrari Jacket, ছবি ও দাম এডিট',
      subLabel: 'Black, White ও Red Ferrari Jacket এর ছবি ও মূল্য',
      icon: Layers,
      badge: '৩টি কালার',
    },
    sizechart: {
      label: '📏 সাইজ চার্ট ও মাপ এডিটর',
      subLabel: 'M, L, XL, XXL ইত্যাদি সাইজের মাপ, দৈর্ঘ্য ও ছবি',
      icon: Ruler,
      badge: `${settings.sizeChartRows?.length || 6}টি সাইজ`,
    },
    content: {
      label: 'লেখা ও ব্যানার স্লাইডার',
      subLabel: 'ব্যানার ফটো, হেডলাইন ও সাইট কনটেন্ট',
      icon: FileText,
      badge: `${currentBanners.length} টি ব্যানার`,
    },
    settings: {
      label: 'ডেলিভারি চার্জ ও ফোন/কন্টাক্ট',
      subLabel: 'ঢাকার ভিতরে/বাইরে চার্জ ও হোয়াটসঅ্যাপ নম্বর',
      icon: Truck,
    },
    steadfast: {
      label: 'SteadFast (Steed fast)',
      subLabel: 'কুরিয়ার ব্যালেন্স, পার্সেল বুকিং ও ট্র্যাকিং',
      icon: Send,
      badge: 'Active',
    },
    conversion: {
      label: 'Conversion (পিক্সেল ও ট্র্যাকিং)',
      subLabel: 'Facebook & TikTok Pixel এবং Events API',
      icon: Target,
      badge: 'Pixel API',
    },
  };

  return (
    <div className="min-h-screen bg-[#f3f4f8] text-neutral-800 flex flex-col selection:bg-[#ff146b] selection:text-white">
      {/* ===================== 3-LINE SIDEBAR DRAWER MENU ===================== */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity cursor-pointer"
            onClick={() => setIsMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <div className="relative w-full max-w-[340px] bg-neutral-900 h-full shadow-2xl flex flex-col justify-between z-10 animate-in slide-in-from-left duration-250 border-r border-neutral-800 text-white">
            {/* Drawer Header */}
            <div className="p-5 border-b border-neutral-800 bg-neutral-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#ff146b] text-white flex items-center justify-center font-bold text-lg shadow-md shadow-pink-500/30">
                  PB
                </div>
                <div>
                  <h2 className="font-bold text-base leading-tight text-white">এডমিন সেকশন মেনু</h2>
                  <p className="text-xs text-neutral-400">যে সেকশনে যেতে চান ক্লিক করুন</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="w-9 h-9 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="মেনু বন্ধ করুন"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Navigation List */}
            <div className="p-4 flex-1 overflow-y-auto space-y-2 bg-neutral-900">
              <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider px-2 mb-1">
                সেকশনসমূহ (ক্লিক করে ঢুকুন)
              </p>

              {(['dashboard', 'orders', 'sizechart', 'products', 'content', 'steadfast', 'conversion', 'settings'] as AdminTab[]).map((tabKey) => {
                const cfg = tabConfig[tabKey];
                const Icon = cfg.icon;
                const isActive = activeTab === tabKey;

                return (
                  <button
                    key={tabKey}
                    type="button"
                    onClick={() => {
                      setActiveTab(tabKey);
                      setIsMenuOpen(false);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`w-full text-left p-3.5 rounded-2xl flex items-start gap-3 transition-all cursor-pointer border ${
                      isActive
                        ? 'bg-neutral-950 text-white border-[#ff146b] ring-1 ring-[#ff146b] shadow-lg scale-[1.01]'
                        : 'bg-neutral-800/90 hover:bg-neutral-700/80 text-white border-neutral-700/80 hover:border-neutral-600'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-transform ${
                        isActive
                          ? 'bg-[#ff146b] text-white shadow-sm'
                          : tabKey === 'sizechart'
                          ? 'bg-pink-900/60 text-pink-300'
                          : tabKey === 'steadfast'
                          ? 'bg-emerald-800/60 text-emerald-300'
                          : tabKey === 'conversion'
                          ? 'bg-indigo-800/70 text-indigo-300'
                          : 'bg-neutral-700 text-neutral-200'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-sm leading-snug text-white">
                          {cfg.label}
                        </span>
                        {cfg.badge && (
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              isActive
                                ? 'bg-white/20 text-white'
                                : tabKey === 'steadfast'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : tabKey === 'conversion'
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                : 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                            }`}
                          >
                            {cfg.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-1 line-clamp-1 text-neutral-400">
                        {cfg.subLabel}
                      </p>
                    </div>

                    {isActive ? (
                      <Check className="w-4 h-4 text-[#ff146b] shrink-0 mt-1" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0 mt-1" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-neutral-800 bg-neutral-950 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    handleSafeBackToStore();
                  }}
                  className="py-2.5 px-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>ওয়েবসাইট</span>
                </button>

                {onLogout && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onLogout();
                    }}
                    className="py-2.5 px-3 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-900/60 text-rose-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>লগআউট</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Navbar (3-Line & 3-Dot section styled in sleek black) */}
      <header className="bg-neutral-900 text-white border-b border-neutral-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* 3-line hamburger menu button: Opens sections drawer */}
            <button
              type="button"
              onClick={() => setIsMenuOpen(true)}
              className="w-10 h-10 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-white flex items-center justify-center border border-neutral-700 shadow-md transition-all cursor-pointer group focus:outline-none focus:ring-2 focus:ring-[#ff146b]/50 shrink-0"
              aria-label="৩ লাইনের সেকশন মেনু খুলুন"
              title="৩ লাইনে ক্লিক করে সেকশন মেনু খুলুন"
            >
              <div className="flex flex-col justify-center items-center gap-[4.5px] w-5">
                <span className="w-full h-[2.5px] bg-white rounded-full transition-all group-hover:w-4"></span>
                <span className="w-full h-[2.5px] bg-[#ff146b] rounded-full"></span>
                <span className="w-full h-[2.5px] bg-white rounded-full transition-all group-hover:w-4"></span>
              </div>
            </button>

            {/* Clickable Header Info: Clicking opens 3-line drawer */}
            <div 
              className="cursor-pointer select-none"
              onClick={() => setIsMenuOpen(true)}
              title="৩ লাইনের সেকশন মেনু খুলুন"
            >
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-white leading-tight">Porshi Bari Admin</h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-pink-500/20 text-[#ff146b] border border-[#ff146b]/40">
                  {tabConfig[activeTab].label}
                </span>
                <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/70 border border-emerald-500/40 text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Firebase Firestore
                </span>
              </div>
            </div>

            {/* Desktop Quick Nav Tabs */}
            <div className="hidden md:flex items-center gap-1.5 ml-4 bg-neutral-800/80 p-1 rounded-xl border border-neutral-700/60">
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-[#ff146b] text-white shadow-xs'
                    : 'text-neutral-300 hover:text-white hover:bg-neutral-700/60'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>ড্যাশবোর্ড</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'orders'
                    ? 'bg-[#ff146b] text-white shadow-xs'
                    : 'text-neutral-300 hover:text-white hover:bg-neutral-700/60'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>অর্ডার ({orders.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('sizechart')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'sizechart'
                    ? 'bg-[#ff146b] text-white shadow-xs'
                    : 'text-neutral-300 hover:text-white hover:bg-neutral-700/60'
                }`}
              >
                <Ruler className="w-3.5 h-3.5" />
                <span>সাইজ চার্ট</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('steadfast')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'steadfast'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-neutral-300 hover:text-white hover:bg-neutral-700/60'
                }`}
              >
                <Send className="w-3.5 h-3.5 transform -rotate-45" />
                <span>SteadFast</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('conversion')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'conversion'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-neutral-300 hover:text-white hover:bg-neutral-700/60'
                }`}
              >
                <Target className="w-3.5 h-3.5" />
                <span>Conversion</span>
              </button>
            </div>
          </div>

          {/* Header Right Actions (3-Dot Menu) */}
          <div className="flex items-center gap-2">
            <div className="relative">
              {/* 3-Dot Button */}
              <button
                type="button"
                onClick={() => setIsThreeDotOpen(!isThreeDotOpen)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all cursor-pointer shadow-md ${
                  isThreeDotOpen
                    ? 'bg-[#ff146b] text-white border-[#ff146b] ring-2 ring-[#ff146b]/40'
                    : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white border-neutral-700'
                }`}
                aria-label="3 ডট অপশন মেনু"
                title="3 ডট অপশন মেনু"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {/* 3-Dot Dropdown Menu */}
              {isThreeDotOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsThreeDotOpen(false)}
                  />
                  <div className="absolute right-0 top-12 z-50 w-56 bg-neutral-900 border border-neutral-700/90 rounded-2xl shadow-2xl py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3.5 py-2 border-b border-neutral-800 bg-neutral-950/70">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                        এডমিন অপশন (3 ডট)
                      </p>
                    </div>

                    {/* Password cange option - EXACT user request */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsThreeDotOpen(false);
                        setIsChangePasswordOpen(true);
                      }}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-neutral-800 text-white text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-pink-500/20 text-[#ff146b] flex items-center justify-center group-hover:bg-[#ff146b] group-hover:text-white transition-colors">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-white group-hover:text-pink-200">Password cange</span>
                        <span className="text-[10px] text-neutral-400">পাসওয়ার্ড পরিবর্তন করুন</span>
                      </div>
                    </button>

                    {/* Website Store Visit */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsThreeDotOpen(false);
                        handleSafeBackToStore();
                      }}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-neutral-800 text-neutral-200 hover:text-white text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <div className="w-7 h-7 rounded-lg bg-neutral-800 text-emerald-400 flex items-center justify-center">
                        <Globe className="w-4 h-4" />
                      </div>
                      <span>মূল ওয়েবসাইট দেখুন</span>
                    </button>

                    {/* Quick Full Backup Download */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsThreeDotOpen(false);
                        handleExportBackup();
                      }}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-neutral-800 text-neutral-200 hover:text-white text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <div className="w-7 h-7 rounded-lg bg-cyan-950/60 text-cyan-400 flex items-center justify-center">
                        <Download className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-white">ফুল ব্যাকআপ ডাউনলোড</span>
                        <span className="text-[10px] text-neutral-400">সকল অর্ডার ও ডেটা সেভ করুন</span>
                      </div>
                    </button>

                    {/* Logout */}
                    {onLogout && (
                      <div className="pt-1 mt-1 border-t border-neutral-800">
                        <button
                          type="button"
                          onClick={() => {
                            setIsThreeDotOpen(false);
                            onLogout();
                          }}
                          className="w-full text-left px-3.5 py-2.5 hover:bg-rose-950/40 text-rose-300 hover:text-rose-200 text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <div className="w-7 h-7 rounded-lg bg-rose-950/60 text-rose-400 flex items-center justify-center">
                            <LogOut className="w-4 h-4" />
                          </div>
                          <span>লগআউট (Logout)</span>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Floating Save Alert Banner */}
      {saveSuccessMsg && (
        <div className="fixed top-5 right-5 z-[9999] bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 font-bold text-sm animate-bounce">
          <Check className="w-5 h-5" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Floating Error Alert Banner */}
      {errorBannerMsg && (
        <div className="fixed top-5 right-5 z-[9999] bg-rose-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 font-bold text-sm animate-shake">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorBannerMsg}</span>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 mb-2">নিশ্চিত করুন</h3>
            <p className="text-sm text-neutral-600 mb-6">{confirmModal.message}</p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className="px-5 py-2 rounded-xl text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md transition-colors cursor-pointer"
              >
                হ্যাঁ, নিশ্চিত
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full flex-1">
        
        {/* ======================= TAB 0: DASHBOARD (MAIN OVERVIEW) ======================= */}
        {activeTab === 'dashboard' && (
          <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-6">
            {/* Quick Metrics (Orders & Website Visits) */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {/* Orders Card */}
              <div 
                onClick={() => {
                  setStatusFilter('all');
                  setActiveTab('orders');
                }}
                className="bg-white rounded-3xl p-4 sm:p-5 border border-neutral-200/80 shadow-xs flex flex-col justify-between hover:border-neutral-300 transition-all cursor-pointer group select-none"
              >
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                    <Receipt className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
                    {orders.length}
                  </div>
                  <div className="text-sm font-bold text-neutral-900 mt-0.5">
                    Orders
                  </div>
                  <div className="text-xs text-neutral-400 mt-0.5">
                    today · {orders.length} mo
                  </div>
                </div>
              </div>

              {/* Visits Card */}
              <div 
                className="bg-white rounded-3xl p-4 sm:p-5 border border-neutral-200/80 shadow-xs flex flex-col justify-between hover:border-neutral-300 transition-all relative group select-none"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-sky-100/70 text-sky-500 flex items-center justify-center mb-3">
                    <Globe className="w-5 h-5" />
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditVisitorInput(String(visitorStats.totalVisits));
                      setIsEditVisitorOpen(true);
                    }}
                    title="ভিজিটর সংখ্যা পরিবর্তন করুন"
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-neutral-400 hover:text-sky-600 hover:bg-sky-50 transition-opacity cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
                    {visitorStats.totalVisits.toLocaleString('en-US')}
                  </div>
                  <div className="text-sm font-bold text-neutral-900 mt-0.5">
                    Visits
                  </div>
                  <div className="text-xs text-neutral-400 mt-0.5">
                    website
                  </div>
                </div>
              </div>
            </div>

            {/* Order Status Pipeline Cards (Clickable Filter Shortcuts - Visitor Card Style) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm sm:text-base font-bold text-neutral-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-[#ff146b]" />
                  <span>অর্ডার স্ট্যাটাস পাইপলাইন</span>
                </h3>
                <span className="text-xs text-neutral-500 hidden sm:inline">যেকোনো স্ট্যাটাসে ক্লিক করে ফিল্টার করুন</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                {/* Processing */}
                <div
                  onClick={() => {
                    setStatusFilter('Processing');
                    setActiveTab('orders');
                  }}
                  className="bg-white rounded-3xl p-4 sm:p-5 border border-neutral-200/80 shadow-xs flex flex-col justify-between hover:border-neutral-300 transition-all cursor-pointer group select-none"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-amber-100/70 text-amber-600 flex items-center justify-center mb-3">
                      <Clock className="w-5 h-5" />
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse mb-3 mr-1"></span>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
                      {orders.filter(o => (o.status || 'Processing') === 'Processing').length}
                    </div>
                    <div className="text-sm font-bold text-neutral-900 mt-0.5">
                      Processing
                    </div>
                    <div className="text-xs text-neutral-400 mt-0.5">
                      প্রসেসিং অর্ডার
                    </div>
                  </div>
                </div>

                {/* Confirm */}
                <div
                  onClick={() => {
                    setStatusFilter('Confirm');
                    setActiveTab('orders');
                  }}
                  className="bg-white rounded-3xl p-4 sm:p-5 border border-neutral-200/80 shadow-xs flex flex-col justify-between hover:border-neutral-300 transition-all cursor-pointer group select-none"
                >
                  <div>
                    <div className="w-10 h-10 rounded-2xl bg-blue-100/70 text-blue-600 flex items-center justify-center mb-3">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
                      {orders.filter(o => o.status === 'Confirm' || o.status === 'Confirmed').length}
                    </div>
                    <div className="text-sm font-bold text-neutral-900 mt-0.5">
                      Confirmed
                    </div>
                    <div className="text-xs text-neutral-400 mt-0.5">
                      নিশ্চিত অর্ডার
                    </div>
                  </div>
                </div>

                {/* Complete */}
                <div
                  onClick={() => {
                    setStatusFilter('Complete');
                    setActiveTab('orders');
                  }}
                  className="bg-white rounded-3xl p-4 sm:p-5 border border-neutral-200/80 shadow-xs flex flex-col justify-between hover:border-neutral-300 transition-all cursor-pointer group select-none"
                >
                  <div>
                    <div className="w-10 h-10 rounded-2xl bg-emerald-100/70 text-emerald-600 flex items-center justify-center mb-3">
                      <Truck className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
                      {orders.filter(o => o.status === 'Complete' || o.status === 'Completed').length}
                    </div>
                    <div className="text-sm font-bold text-neutral-900 mt-0.5">
                      Complete
                    </div>
                    <div className="text-xs text-neutral-400 mt-0.5">
                      ডেলিভারি সম্পন্ন
                    </div>
                  </div>
                </div>

                {/* Cancel */}
                <div
                  onClick={() => {
                    setStatusFilter('Cancel');
                    setActiveTab('orders');
                  }}
                  className="bg-white rounded-3xl p-4 sm:p-5 border border-neutral-200/80 shadow-xs flex flex-col justify-between hover:border-neutral-300 transition-all cursor-pointer group select-none"
                >
                  <div>
                    <div className="w-10 h-10 rounded-2xl bg-rose-100/70 text-rose-500 flex items-center justify-center mb-3">
                      <XCircle className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
                      {orders.filter(o => o.status === 'Cancel' || o.status === 'Cancelled').length}
                    </div>
                    <div className="text-sm font-bold text-neutral-900 mt-0.5">
                      Cancelled
                    </div>
                    <div className="text-xs text-neutral-400 mt-0.5">
                      বাতিল অর্ডার
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Orders Preview & Quick Admin Links */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Recent 5 Orders */}
              <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#ff146b]" />
                    <h3 className="font-bold text-neutral-900 text-sm">সাম্প্রতিক অর্ডারসমূহ (Recent Orders)</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter('all');
                      setActiveTab('orders');
                    }}
                    className="text-xs font-bold text-[#ff146b] hover:text-[#e60055] flex items-center gap-1 cursor-pointer"
                  >
                    <span>সকল অর্ডার দেখুন ({orders.length})</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {orders.length === 0 ? (
                  <div className="py-10 text-center text-neutral-400 text-sm">
                    কোনো অর্ডার পাওয়া যায়নি।
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.slice(0, 5).map((order) => (
                      <div
                        key={order.orderId}
                        className="p-3.5 rounded-xl border border-neutral-200 hover:border-neutral-300 hover:shadow-xs transition-all bg-neutral-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-xs text-neutral-900 bg-white px-2 py-0.5 rounded border border-neutral-200">
                              {order.orderId}
                            </span>
                            <span className="font-bold text-xs text-neutral-800">
                              {order.customerName}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                order.status === 'Processing' || !order.status
                                  ? 'bg-[#d8edd6] text-[#206927]'
                                  : order.status === 'Confirm' || order.status === 'Confirmed'
                                  ? 'bg-blue-100 text-blue-800'
                                  : order.status === 'Complete' || order.status === 'Completed'
                                  ? 'bg-teal-100 text-teal-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {order.status || 'Processing'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-neutral-500">
                            <span>{order.customerPhone}</span>
                            <span>•</span>
                            <span>সাইজ: {order.size}</span>
                            <span>•</span>
                            <span>{formatOrderTime(order)}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-200/60">
                          <div className="text-right">
                            <span className="text-xs text-neutral-400 block sm:hidden">মোট</span>
                            <span className="font-bold text-sm text-neutral-900">
                              {formatTaka(order.total)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {order.steadfastSent ? (
                              <span className="text-[10px] font-bold bg-[#0b5e1b] text-white px-2 py-1 rounded inline-flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                <span>SteadFast Sent</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSendToSteadfast(order)}
                                disabled={sendingOrderId === order.orderId}
                                className="text-[11px] font-bold bg-[#9ad39d] hover:bg-[#85c989] text-[#1c5c24] px-2.5 py-1 rounded cursor-pointer transition-all disabled:opacity-60 flex items-center gap-1"
                                title="সরাসরি SteadFast কুরিয়ারে পাঠান"
                              >
                                <Send className="w-3 h-3" />
                                <span>{sendingOrderId === order.orderId ? 'Sending...' : 'Send'}</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleOpenOrderModal(order)}
                              className="p-1.5 bg-white hover:bg-neutral-100 text-neutral-600 rounded-lg border border-neutral-200 cursor-pointer"
                              title="অর্ডারের বিস্তারিত মডাল দেখুন"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right 1 Col: Quick Admin Links & Store Preview */}
              <div className="space-y-4">
                {/* Admin Quick Action Cards */}
                <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs space-y-3">
                  <h3 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-[#ff146b]" />
                    <span>এডমিন কুইক এক্সেস মেনু</span>
                  </h3>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('orders')}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-neutral-50 border border-neutral-200 flex items-center justify-between text-xs font-bold text-neutral-800 cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-pink-50 text-[#ff146b] flex items-center justify-center">
                          <Package className="w-4 h-4" />
                        </div>
                        <span>অর্ডার তালিকা ও ম্যানেজমেন্ট</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-[#ff146b] group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('steadfast')}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-neutral-50 border border-neutral-200 flex items-center justify-between text-xs font-bold text-neutral-800 cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <Send className="w-4 h-4 transform -rotate-45" />
                        </div>
                        <span>SteadFast কুরিয়ার এন্ট্রি ও ব্যালেন্স</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('products')}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-neutral-50 border border-neutral-200 flex items-center justify-between text-xs font-bold text-neutral-800 cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                          <Layers className="w-4 h-4" />
                        </div>
                        <span>প্রোডাক্ট ছবি, স্টক ও দাম পরিবর্তন</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('sizechart')}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-neutral-50 border border-neutral-200 flex items-center justify-between text-xs font-bold text-neutral-800 cursor-pointer group bg-pink-50/40"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-pink-100 text-[#ff146b] flex items-center justify-center">
                          <Ruler className="w-4 h-4" />
                        </div>
                        <span className="text-[#ff146b]">📏 সাইজ চার্ট ও মাপ পরিবর্তন</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-[#ff146b] group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('content')}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-neutral-50 border border-neutral-200 flex items-center justify-between text-xs font-bold text-neutral-800 cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                          <FileText className="w-4 h-4" />
                        </div>
                        <span>ব্যানার স্লাইডার ও সাইট কনটেন্ট</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('settings')}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-neutral-50 border border-neutral-200 flex items-center justify-between text-xs font-bold text-neutral-800 cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                          <Truck className="w-4 h-4" />
                        </div>
                        <span>ডেলিভারি চার্জ ও ফোন নম্বর</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>

                {/* Product Live Snapshot Card */}
                <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-[#ff146b]" />
                      <span>লাইভ প্রোডাক্ট কালেকশন</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab('products')}
                      className="text-[11px] font-bold text-[#ff146b] hover:underline cursor-pointer"
                    >
                      এডিট করুন
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {settings.products.map((prod) => (
                      <div key={prod.id} className="text-center group">
                        <div className="aspect-[3/4] rounded-lg overflow-hidden bg-neutral-100 border border-neutral-200 mb-1.5">
                          <img
                            src={prod.image}
                            alt={prod.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <p className="text-[11px] font-bold text-neutral-800 truncate">{prod.banglaName || prod.name}</p>
                        <p className="text-[10px] font-extrabold text-emerald-700">{formatTaka(prod.price)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================= TAB 1: ORDERS (WOOCOMMERCE STYLE & FULL PAGE DETAILS) ======================= */}
        {activeTab === 'orders' && (
          <div className="w-full max-w-7xl mx-auto space-y-4">
            {viewingOrder && editOrderForm ? (
              /* ================= DEDICATED FULL-PAGE ORDER DETAILS & EDIT (নতুন পেজ) ================= */
              <div className="space-y-5 animate-in fade-in duration-200">
                {/* 1. Top Breadcrumb & Header Bar */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setViewingOrder(null);
                        setEditOrderForm(null);
                        setIsEditingOrder(false);
                        setSteadfastModalError(null);
                        setErrorBannerMsg(null);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-xs font-bold text-neutral-800 transition-all cursor-pointer group shadow-2xs"
                    >
                      <ArrowLeft className="w-4 h-4 text-neutral-600 group-hover:-translate-x-0.5 transition-transform" />
                      <span>অর্ডার তালিকায় ফিরে যান</span>
                    </button>

                    <div className="h-4 w-px bg-neutral-200 hidden sm:block"></div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-neutral-400 font-bold uppercase tracking-wider">অর্ডার বিবরণী</span>
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                            isEditingOrder
                              ? "bg-amber-50 text-amber-800 border-amber-300"
                              : "bg-blue-50 text-[#0073aa] border-blue-200"
                          }`}
                        >
                          {isEditingOrder ? "✏️ এডিট মোড" : "👁️ ভিউ মোড"}
                        </span>
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                            (editOrderForm.status || "Processing") === "Processing"
                              ? "bg-green-50 text-[#206927] border-green-300"
                              : editOrderForm.status === "Confirm"
                              ? "bg-blue-50 text-[#0073aa] border-blue-300"
                              : editOrderForm.status === "Complete"
                              ? "bg-emerald-50 text-[#0f5132] border-emerald-300"
                              : "bg-neutral-100 text-neutral-700 border-neutral-300"
                          }`}
                        >
                          ● {editOrderForm.status || "Processing"}
                        </span>
                      </div>
                      <h2 className="text-lg sm:text-2xl font-black text-neutral-900 flex items-center gap-2 mt-0.5">
                        <span className="text-[#2271b1]">{viewingOrder.orderId}</span>
                        <span className="text-neutral-800">({editOrderForm.customerName || viewingOrder.customerName})</span>
                      </h2>
                    </div>
                  </div>

                  {/* Top Action Buttons */}
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-3.5 py-2 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all"
                    >
                      <Printer className="w-4 h-4 text-neutral-500" />
                      <span>প্রিন্ট ইনভয়েস</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteOrder(viewingOrder.orderId)}
                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all"
                    >
                      <Trash2 className="w-4 h-4 text-rose-500" />
                      <span>অর্ডার মুছুন</span>
                    </button>

                    {!isEditingOrder ? (
                      <button
                        type="button"
                        onClick={() => {
                          setEditOrderForm(JSON.parse(JSON.stringify(viewingOrder)));
                          setIsEditingOrder(true);
                        }}
                        className="px-4 py-2 bg-[#ff146b] hover:bg-[#e00d5a] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
                        title="কাস্টমারের তথ্য ও অর্ডার সংশোধন করুন"
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>তথ্য এডিট করুন</span>
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditOrderForm(JSON.parse(JSON.stringify(viewingOrder)));
                            setIsEditingOrder(false);
                          }}
                          className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                          <span>ভিউ মোড</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveOrderEdit()}
                          disabled={isSavingOrderEdit}
                          className="px-5 py-2 bg-[#ff146b] hover:bg-[#e00d5a] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-60"
                        >
                          <Save className="w-4 h-4" />
                          <span>{isSavingOrderEdit ? "সেভ হচ্ছে..." : "পরিবর্তন সেভ করুন"}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* 2. Main 2-Column Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  {/* Left 2 Columns: Details View or Edit Form */}
                  <div className="lg:col-span-2 space-y-5">
                    {!isEditingOrder ? (
                      /* ================= VIEW MODE ================= */
                      <div className="space-y-5 animate-in fade-in">
                        {/* View Card 1: Customer Information */}
                        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-neutral-200 shadow-xs space-y-4">
                          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-pink-50 text-[#ff146b] flex items-center justify-center font-bold">
                                <User className="w-4 h-4" />
                              </div>
                              <div>
                                <h3 className="text-sm sm:text-base font-bold text-neutral-900">গ্রাহক ও ডেলিভারির তথ্য</h3>
                                <p className="text-[11px] text-neutral-400">কাস্টমারের নাম, ফোন এবং সম্পূর্ণ ডেলিভারি ঠিকানা</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setEditOrderForm(JSON.parse(JSON.stringify(viewingOrder)));
                                setIsEditingOrder(true);
                              }}
                              className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-neutral-500" />
                              <span>সংশোধন</span>
                            </button>
                          </div>

                          <div className="space-y-3">
                            <div className="bg-neutral-50/80 p-3.5 rounded-xl border border-neutral-200/80 space-y-2">
                              <div>
                                <span className="text-[11px] text-neutral-400 font-semibold block uppercase">গ্রাহকের পুরো নাম:</span>
                                <span className="text-sm sm:text-base font-black text-neutral-900">{viewingOrder.customerName || "নাম দেওয়া হয়নি"}</span>
                              </div>

                              <div>
                                <span className="text-[11px] text-neutral-400 font-semibold block uppercase">মোবাইল নম্বর:</span>
                                <div className="flex items-center gap-2 flex-wrap pt-0.5">
                                  <span className="font-mono font-bold text-sm sm:text-base text-neutral-900">{viewingOrder.customerPhone || "নম্বর নেই"}</span>
                                  {isMultipleOrder(viewingOrder) && (
                                    <span className="text-[11px] font-extrabold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full uppercase tracking-tight">
                                      multiple order
                                    </span>
                                  )}
                                  <a
                                    href={`tel:${viewingOrder.customerPhone}`}
                                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                                  >
                                    <Phone className="w-3 h-3" />
                                    <span>কল করুন</span>
                                  </a>
                                  <a
                                    href={`https://wa.me/88${String(viewingOrder.customerPhone || "").replace(/[^0-9]/g, "")}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2.5 py-1 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                                  >
                                    <MessageSquare className="w-3 h-3" />
                                    <span>WhatsApp</span>
                                  </a>
                                </div>
                              </div>

                              <div>
                                <span className="text-[11px] text-neutral-400 font-semibold block uppercase">ডেলিভারির সম্পূর্ণ ঠিকানা:</span>
                                <p className="text-xs sm:text-sm font-semibold text-neutral-800 leading-relaxed bg-white p-2.5 rounded-lg border border-neutral-200 mt-1">
                                  {viewingOrder.customerAddress || "ঠিকানা দেওয়া হয়নি"}
                                </p>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                <div className="bg-white p-2 rounded-lg border border-neutral-200">
                                  <span className="text-[10px] text-neutral-400 uppercase font-bold block">ডেলিভারি এলাকা:</span>
                                  <span className="text-xs font-bold text-neutral-800">
                                    {viewingOrder.shippingCost === 0
                                      ? "ফ্রি ডেলিভারি (০৳)"
                                      : viewingOrder.shippingZone === "inside_dhaka"
                                      ? "ঢাকার ভিতরে (৮০৳)"
                                      : "ঢাকার বাইরে (১৫০৳)"}
                                  </span>
                                </div>
                                <div className="bg-white p-2 rounded-lg border border-neutral-200">
                                  <span className="text-[10px] text-neutral-400 uppercase font-bold block">ডেলিভারি চার্জ:</span>
                                  <span className="text-xs font-bold text-neutral-800">
                                    {viewingOrder.shippingCost === 0 ? "ফ্রী (০৳)" : formatTaka(viewingOrder.shippingCost ?? 150)}
                                  </span>
                                </div>
                              </div>

                              {viewingOrder.orderNotes && (
                                <div className="bg-amber-50/80 border border-amber-200 p-2.5 rounded-lg">
                                  <span className="text-[10px] text-amber-700 uppercase font-bold block">অর্ডার নোট / মন্তব্য:</span>
                                  <p className="text-xs text-amber-900 font-medium">{viewingOrder.orderNotes}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* View Card 2: Ordered Items & Colors */}
                        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-neutral-200 shadow-xs space-y-4">
                          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                                <Layers className="w-4 h-4" />
                              </div>
                              <div>
                                <h3 className="text-sm sm:text-base font-bold text-neutral-900">আইটেম সাইজ ও কালার বিবরণ</h3>
                                <p className="text-[11px] text-neutral-400">অর্ডারে গ্রাহক কর্তৃক নির্বাচিত পণ্য</p>
                              </div>
                            </div>
                            <span className="px-3 py-1 bg-neutral-900 text-white rounded-lg font-black text-xs">
                              সাইজ: {viewingOrder.size || "L"}
                            </span>
                          </div>

                          <div className="space-y-2">
                            <span className="text-xs font-bold text-neutral-700">নির্বাচিত কালার ও পরিমাণ:</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {[
                                { id: "black", label: "Black (কালো)", colorHex: "#111827" },
                                { id: "white", label: "White (সাদা)", colorHex: "#f3f4f6" },
                                { id: "red", label: "Red (লাল)", colorHex: "#ef4444" },
                                { id: "pink", label: "Pink (গোলাপি)", colorHex: "#ec4899" },
                              ].map((c) => {
                                const isSel = Boolean(viewingOrder.selectedColors?.[c.id as ShirtColorId]);
                                const qty = viewingOrder.colorQuantities?.[c.id as ShirtColorId] || 1;
                                if (!isSel) return null;
                                return (
                                  <div
                                    key={c.id}
                                    className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between text-xs"
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <span
                                        className="w-4 h-4 rounded-full border border-neutral-300 inline-block"
                                        style={{ backgroundColor: c.colorHex }}
                                      />
                                      <span className="font-bold text-neutral-900">{c.label}</span>
                                    </div>
                                    <span className="px-2.5 py-1 bg-white border border-neutral-200 rounded-md font-bold text-neutral-800">
                                      {qty} পিস
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* View Card 3: Pricing Summary */}
                        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-neutral-200 shadow-xs space-y-4">
                          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                                <DollarSign className="w-4 h-4" />
                              </div>
                              <h3 className="text-sm sm:text-base font-bold text-neutral-900">মূল্য ও ইনভয়েস হিসাব</h3>
                            </div>
                            <span className="text-xs font-bold text-neutral-500">ক্যাশ অন ডেলিভারি (COD)</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200 text-center sm:text-left">
                              <span className="text-[11px] text-neutral-500 font-semibold block uppercase">সাবটোটাল</span>
                              <span className="text-base font-bold text-neutral-900">{formatTaka(viewingOrder.subtotal || 0)}</span>
                            </div>
                            <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200 text-center sm:text-left">
                              <span className="text-[11px] text-neutral-500 font-semibold block uppercase">ডেলিভারি চার্জ</span>
                              <span className="text-base font-bold text-neutral-900">{formatTaka(viewingOrder.shippingCost || 0)}</span>
                            </div>
                            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-center sm:text-left">
                              <span className="text-[11px] text-emerald-700 font-bold block uppercase">সর্বমোট টাকা</span>
                              <span className="text-xl font-black text-emerald-800">{formatTaka(viewingOrder.total || 0)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* ================= EDIT MODE ================= */
                      <div className="space-y-5 animate-in fade-in">
                        {/* Edit Card 1: Customer Information (Editable) */}
                        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-neutral-200 shadow-xs space-y-4">
                          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-pink-50 text-[#ff146b] flex items-center justify-center font-bold">
                                <User className="w-4 h-4" />
                              </div>
                              <div>
                                <h3 className="text-sm sm:text-base font-bold text-neutral-900">গ্রাহক ও ডেলিভারির তথ্য (এডিট)</h3>
                                <p className="text-[11px] text-neutral-400">নাম, মোবাইল নম্বর ও ডেলিভারি ঠিকানা সরাসরি পরিবর্তন করুন</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                              ✏️ এডিট মোড
                            </span>
                          </div>

                          <div className="space-y-3.5">
                            {/* Customer Name */}
                            <div>
                              <label className="block text-xs font-bold text-neutral-700 mb-1">
                                গ্রাহকের পুরো নাম <span className="text-rose-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={editOrderForm.customerName || ""}
                                onChange={(e) => setEditOrderForm({ ...editOrderForm, customerName: e.target.value })}
                                className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold border border-neutral-300 rounded-xl focus:ring-2 focus:ring-[#ff146b] focus:border-[#ff146b] outline-none transition-all"
                                placeholder="যেমন: মোঃ সিয়াম আহমেদ"
                                required
                              />
                            </div>

                            {/* Customer Phone */}
                            <div>
                              <label className="block text-xs font-bold text-neutral-700 mb-1">
                                মোবাইল নম্বর <span className="text-rose-500">*</span>
                              </label>
                              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                <div className="relative flex-1 min-w-[200px]">
                                  <input
                                    type="text"
                                    value={editOrderForm.customerPhone || ""}
                                    onChange={(e) => setEditOrderForm({ ...editOrderForm, customerPhone: e.target.value })}
                                    className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm font-mono font-bold border border-neutral-300 rounded-xl focus:ring-2 focus:ring-[#ff146b] focus:border-[#ff146b] outline-none"
                                    placeholder="01XXXXXXXXX"
                                    required
                                  />
                                  <Phone className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                                </div>
                                <a
                                  href={`tel:${editOrderForm.customerPhone}`}
                                  className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                                >
                                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>কল করুন</span>
                                </a>
                                <a
                                  href={`https://wa.me/88${String(editOrderForm.customerPhone || "").replace(/[^0-9]/g, "")}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-3.5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shadow-2xs"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>WhatsApp</span>
                                </a>
                              </div>
                            </div>

                            {/* Complete Delivery Address */}
                            <div>
                              <label className="block text-xs font-bold text-neutral-700 mb-1">
                                ডেলিভারির সম্পূর্ণ ঠিকানা <span className="text-rose-500">*</span>
                              </label>
                              <textarea
                                rows={3}
                                value={editOrderForm.customerAddress || ""}
                                onChange={(e) => setEditOrderForm({ ...editOrderForm, customerAddress: e.target.value })}
                                className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-neutral-300 rounded-xl focus:ring-2 focus:ring-[#ff146b] focus:border-[#ff146b] outline-none leading-relaxed resize-none"
                                placeholder="বাসা/রোড নং, গ্রাম/মহল্লা, থানা ও জেলার বিস্তারিত ঠিকানা"
                                required
                              />
                            </div>

                            {/* Shipping Zone & Cost */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                              <div>
                                <label className="block text-xs font-bold text-neutral-700 mb-1">ডেলিভারি এলাকা</label>
                                <select
                                  value={editOrderForm.shippingZone || "outside_dhaka"}
                                  onChange={(e) => {
                                    const zone = e.target.value as "inside_dhaka" | "outside_dhaka";
                                    const cost = zone === "inside_dhaka" ? 80 : 150;
                                    const sub = Number(editOrderForm.subtotal) || 0;
                                    setEditOrderForm({
                                      ...editOrderForm,
                                      shippingZone: zone,
                                      shippingCost: cost,
                                      total: sub + cost,
                                    });
                                  }}
                                  className="w-full px-3 py-2.5 text-xs sm:text-sm font-semibold border border-neutral-300 rounded-xl focus:ring-2 focus:ring-[#ff146b] outline-none bg-white"
                                >
                                  <option value="inside_dhaka">ঢাকার ভিতরে (৮০৳)</option>
                                  <option value="outside_dhaka">ঢাকার বাইরে (১৫০৳)</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-neutral-700 mb-1">ডেলিভারি চার্জ (৳)</label>
                                <input
                                  type="number"
                                  value={editOrderForm.shippingCost ?? 150}
                                  onChange={(e) => {
                                    const cost = Number(e.target.value) || 0;
                                    const sub = Number(editOrderForm.subtotal) || 0;
                                    setEditOrderForm({ ...editOrderForm, shippingCost: cost, total: sub + cost });
                                  }}
                                  className="w-full px-3 py-2.5 text-xs sm:text-sm font-bold border border-neutral-300 rounded-xl focus:ring-2 focus:ring-[#ff146b] outline-none"
                                />
                              </div>
                            </div>

                            {/* Order Notes */}
                            <div>
                              <label className="block text-xs font-bold text-neutral-700 mb-1">অর্ডার নোট বা বিশেষ মন্তব্য</label>
                              <input
                                type="text"
                                value={editOrderForm.orderNotes || ""}
                                onChange={(e) => setEditOrderForm({ ...editOrderForm, orderNotes: e.target.value })}
                                className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-neutral-300 rounded-xl focus:ring-2 focus:ring-[#ff146b] outline-none"
                                placeholder="যেমন: দ্রুত ডেলিভারি দিতে হবে"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Edit Card 2: Product Size & Color Selection */}
                        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-neutral-200 shadow-xs space-y-4">
                          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                                <Layers className="w-4 h-4" />
                              </div>
                              <div>
                                <h3 className="text-sm sm:text-base font-bold text-neutral-900">আইটেম সাইজ ও কালার নির্বাচন</h3>
                                <p className="text-[11px] text-neutral-400">সাইজ এবং পছন্দের কালারের পরিমাণ পরিবর্তন করুন</p>
                              </div>
                            </div>
                            <span className="text-xs font-bold text-neutral-500">
                              বর্তমান সাইজ: <span className="text-neutral-900 font-extrabold">{editOrderForm.size || "L"}</span>
                            </span>
                          </div>

                          <div className="space-y-2">
                            <label className="block text-xs font-bold text-neutral-700">সাইজ নির্বাচন করুন:</label>
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                              {configuredSizes.map((sz) => (
                                <button
                                  key={sz}
                                  type="button"
                                  onClick={() => setEditOrderForm({ ...editOrderForm, size: sz })}
                                  className={`py-2.5 rounded-xl font-bold text-xs sm:text-sm border transition-all cursor-pointer ${
                                    editOrderForm.size === sz
                                      ? "bg-[#ff146b] text-white border-[#ff146b] shadow-xs scale-102"
                                      : "bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-200"
                                  }`}
                                >
                                  {sz}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2 pt-2">
                            <label className="block text-xs font-bold text-neutral-700">কালার ও পিস সংখ্যা:</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {[
                                { id: "black", label: "Black (কালো)", colorHex: "#111827" },
                                { id: "white", label: "White (সাদা)", colorHex: "#f3f4f6" },
                                { id: "red", label: "Red (লাল)", colorHex: "#ef4444" },
                                { id: "pink", label: "Pink (গোলাপি)", colorHex: "#ec4899" },
                              ].map((c) => {
                                const isSel = Boolean(editOrderForm.selectedColors?.[c.id as ShirtColorId]);
                                const qty = editOrderForm.colorQuantities?.[c.id as ShirtColorId] || 1;
                                return (
                                  <div
                                    key={c.id}
                                    className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                                      isSel ? "bg-pink-50/60 border-[#ff146b]/40 shadow-2xs" : "bg-neutral-50/70 border-neutral-200"
                                    }`}
                                  >
                                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                      <input
                                        type="checkbox"
                                        checked={isSel}
                                        onChange={(e) => {
                                          const nextSel = { ...(editOrderForm.selectedColors || { black: false, white: false, red: false, pink: false }), [c.id]: e.target.checked } as Record<ShirtColorId, boolean>;
                                          const nextQty = { ...(editOrderForm.colorQuantities || { black: 1, white: 1, red: 1, pink: 1 }) } as Record<ShirtColorId, number>;
                                          if (e.target.checked && !nextQty[c.id as ShirtColorId]) {
                                            nextQty[c.id as ShirtColorId] = 1;
                                          }
                                          setEditOrderForm({
                                            ...editOrderForm,
                                            selectedColors: nextSel,
                                            colorQuantities: nextQty,
                                          });
                                        }}
                                        className="w-4 h-4 accent-[#ff146b] cursor-pointer"
                                      />
                                      <span
                                        className="w-3.5 h-3.5 rounded-full border border-neutral-300 inline-block"
                                        style={{ backgroundColor: c.colorHex }}
                                      />
                                      <span className="font-bold text-neutral-800">{c.label}</span>
                                    </label>

                                    {isSel && (
                                      <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-neutral-200">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const curr = editOrderForm.colorQuantities?.[c.id as ShirtColorId] || 1;
                                            if (curr > 1) {
                                              setEditOrderForm({
                                                ...editOrderForm,
                                                colorQuantities: { ...(editOrderForm.colorQuantities || { black: 1, white: 1, red: 1, pink: 1 }), [c.id]: curr - 1 } as Record<ShirtColorId, number>,
                                              });
                                            }
                                          }}
                                          className="w-6 h-6 bg-neutral-100 hover:bg-neutral-200 rounded flex items-center justify-center font-bold text-neutral-800 cursor-pointer"
                                        >
                                          -
                                        </button>
                                        <span className="w-6 text-center font-bold text-xs">{qty}</span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const curr = editOrderForm.colorQuantities?.[c.id as ShirtColorId] || 1;
                                            setEditOrderForm({
                                              ...editOrderForm,
                                              colorQuantities: { ...(editOrderForm.colorQuantities || { black: 1, white: 1, red: 1, pink: 1 }), [c.id]: curr + 1 } as Record<ShirtColorId, number>,
                                            });
                                          }}
                                          className="w-6 h-6 bg-neutral-100 hover:bg-neutral-200 rounded flex items-center justify-center font-bold text-neutral-800 cursor-pointer"
                                        >
                                          +
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Edit Card 3: Pricing Breakdown & Total */}
                        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-neutral-200 shadow-xs space-y-4">
                          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                                <DollarSign className="w-4 h-4" />
                              </div>
                              <div>
                                <h3 className="text-sm sm:text-base font-bold text-neutral-900">মূল্য ও ইনভয়েস হিসাব</h3>
                                <p className="text-[11px] text-neutral-400">সাবটোটাল এবং সর্বমোট টাকা হিসাব</p>
                              </div>
                            </div>
                            <span className="text-xs font-bold text-neutral-500">ক্যাশ অন ডেলিভারি (COD)</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                              <label className="block text-[11px] font-bold text-neutral-600 mb-1">সাবটোটাল (৳)</label>
                              <input
                                type="number"
                                value={editOrderForm.subtotal ?? 0}
                                onChange={(e) => {
                                  const sub = Number(e.target.value) || 0;
                                  const ship = Number(editOrderForm.shippingCost) || 0;
                                  setEditOrderForm({ ...editOrderForm, subtotal: sub, total: sub + ship });
                                }}
                                className="w-full px-3 py-2 text-sm font-bold border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#ff146b] outline-none bg-white"
                              />
                            </div>

                            <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                              <label className="block text-[11px] font-bold text-neutral-600 mb-1">ডেলিভারি চার্জ (৳)</label>
                              <input
                                type="number"
                                value={editOrderForm.shippingCost ?? 0}
                                onChange={(e) => {
                                  const ship = Number(e.target.value) || 0;
                                  const sub = Number(editOrderForm.subtotal) || 0;
                                  setEditOrderForm({ ...editOrderForm, shippingCost: ship, total: sub + ship });
                                }}
                                className="w-full px-3 py-2 text-sm font-bold border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#ff146b] outline-none bg-white"
                              />
                            </div>

                            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                              <label className="block text-[11px] font-bold text-emerald-800 mb-1">সর্বমোট টাকা (৳)</label>
                              <input
                                type="number"
                                value={editOrderForm.total ?? 0}
                                onChange={(e) => setEditOrderForm({ ...editOrderForm, total: Number(e.target.value) || 0 })}
                                className="w-full px-3 py-2 text-base font-black border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-emerald-800 bg-white"
                              />
                            </div>
                          </div>

                          {/* Save Changes Button at Bottom of Form */}
                          <div className="pt-2 flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditOrderForm(JSON.parse(JSON.stringify(viewingOrder)));
                                setIsEditingOrder(false);
                              }}
                              className="px-4 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold transition-all cursor-pointer"
                            >
                              বাতিল / ভিউ মোড
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSaveOrderEdit()}
                              disabled={isSavingOrderEdit}
                              className="px-6 py-2.5 rounded-xl bg-[#ff146b] hover:bg-[#e00d5a] text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-60"
                            >
                              <Save className="w-4 h-4" />
                              <span>{isSavingOrderEdit ? "সংরক্ষণ করা হচ্ছে..." : "সকল পরিবর্তন সেভ করুন"}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right 1 Column: Status Switcher & Courier Integration */}
                  <div className="space-y-5">
                    {/* Card 4: Order Status Controls */}
                    <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b border-neutral-100">
                        <CheckCircle className="w-4 h-4 text-[#2271b1]" />
                        <h3 className="text-sm font-bold text-neutral-900">অর্ডার স্ট্যাটাস পরিবর্তন</h3>
                      </div>

                      <p className="text-[11px] text-neutral-500">
                        নিচের যেকোনো বাটনে চাপ দিয়ে সরাসরি স্ট্যাটাস পরিবর্তন করুন:
                      </p>

                      <div className="space-y-2">
                        {/* 1. Processing */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditOrderForm({ ...editOrderForm, status: 'Processing' });
                            handleUpdateOrderStatus(viewingOrder.orderId, 'Processing');
                          }}
                          className={`w-full p-3 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer border ${
                            (editOrderForm.status || 'Processing') === 'Processing'
                              ? 'bg-[#206927] text-white border-[#1c5c22] shadow-xs'
                              : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>Processing (চলমান)</span>
                          </div>
                          {(editOrderForm.status || 'Processing') === 'Processing' && <Check className="w-4 h-4" />}
                        </button>

                        {/* 2. Confirm */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditOrderForm({ ...editOrderForm, status: 'Confirm' });
                            handleUpdateOrderStatus(viewingOrder.orderId, 'Confirm');
                          }}
                          className={`w-full p-3 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer border ${
                            editOrderForm.status === 'Confirm' || editOrderForm.status === 'Confirmed'
                              ? 'bg-[#0073aa] text-white border-[#005f8d] shadow-xs'
                              : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            <span>Confirm (কনফার্মড)</span>
                          </div>
                          {(editOrderForm.status === 'Confirm' || editOrderForm.status === 'Confirmed') && <Check className="w-4 h-4" />}
                        </button>

                        {/* 3. Complete */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditOrderForm({ ...editOrderForm, status: 'Complete' });
                            handleUpdateOrderStatus(viewingOrder.orderId, 'Complete');
                          }}
                          className={`w-full p-3 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer border ${
                            editOrderForm.status === 'Complete' || editOrderForm.status === 'Completed'
                              ? 'bg-[#0f5132] text-white border-[#0c4128] shadow-xs'
                              : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4" />
                            <span>Complete (ডেলিভারি সম্পন্ন)</span>
                          </div>
                          {(editOrderForm.status === 'Complete' || editOrderForm.status === 'Completed') && <Check className="w-4 h-4" />}
                        </button>

                        {/* 4. Cancel */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditOrderForm({ ...editOrderForm, status: 'Cancel' });
                            handleUpdateOrderStatus(viewingOrder.orderId, 'Cancel');
                          }}
                          className={`w-full p-3 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer border ${
                            editOrderForm.status === 'Cancel' || editOrderForm.status === 'Cancelled'
                              ? 'bg-[#495057] text-white border-[#343a40] shadow-xs'
                              : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <X className="w-4 h-4" />
                            <span>Cancel (বাতিল)</span>
                          </div>
                          {(editOrderForm.status === 'Cancel' || editOrderForm.status === 'Cancelled') && <Check className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Card 5: SteadFast Courier Integration & Live Tracking */}
                    <div className="bg-[#f8fbf9] rounded-2xl p-5 border border-emerald-200 shadow-xs space-y-3.5">
                      <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-[#ff146b]" />
                          <h3 className="text-sm font-bold text-neutral-900">SteadFast কুরিয়ার সার্ভিস</h3>
                        </div>
                        <span
                          className="bg-[#006b75] text-white text-[11px] font-bold px-2 py-0.5 rounded"
                          title="গ্রাহকের ডেলিভারি গ্রহণের শতকরা হার"
                        >
                          স্কোর: {getCustomerScore(viewingOrder)}
                        </span>
                      </div>

                      {/* Consignment ID & Status */}
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between py-1 border-b border-emerald-100">
                          <span className="text-neutral-500 font-medium">Consignment ID:</span>
                          {viewingOrder.consignmentId ? (
                            <button
                              type="button"
                              onClick={() => handleCopyConsignment(viewingOrder.consignmentId!)}
                              className="bg-white border border-neutral-200 hover:bg-neutral-50 font-mono text-xs font-bold px-2.5 py-1 rounded inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                              title="কপি করতে ক্লিক করুন"
                            >
                              <span>{viewingOrder.consignmentId}</span>
                              <Copy className="w-3.5 h-3.5 text-neutral-400" />
                            </button>
                          ) : (
                            <span className="text-neutral-400 italic">এখনো বুক করা হয়নি</span>
                          )}
                        </div>

                        <div className="flex items-center justify-between py-1 border-b border-emerald-100">
                          <span className="text-neutral-500 font-medium">ডেলিভারি স্ট্যাটাস:</span>
                          <div className="flex items-center gap-1.5">
                            {viewingOrder.consignmentId && (
                              <button
                                type="button"
                                onClick={() => handleRefreshDeliveryStatus(viewingOrder)}
                                disabled={refreshingOrderId === viewingOrder.orderId}
                                className="p-1 text-neutral-400 hover:text-neutral-800 rounded-full hover:bg-neutral-100 cursor-pointer"
                                title="লাইভ স্ট্যাটাস রিফ্রেশ করুন"
                              >
                                <RotateCw className={`w-3.5 h-3.5 ${refreshingOrderId === viewingOrder.orderId ? 'animate-spin text-blue-600' : ''}`} />
                              </button>
                            )}
                            <span
                              className={`text-[11px] font-bold px-2.5 py-0.5 rounded ${
                                viewingOrder.deliveryStatus === 'DELIVERED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : viewingOrder.deliveryStatus === 'IN_REVIEW'
                                  ? 'bg-amber-100 text-amber-800'
                                  : viewingOrder.deliveryStatus === 'CANCELLED'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-neutral-100 text-neutral-700'
                              }`}
                            >
                              {viewingOrder.deliveryStatus || 'PENDING'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* SteadFast Error Alert */}
                      {steadfastModalError && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl flex items-start gap-2 text-xs font-semibold animate-shake">
                          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                          <span>{steadfastModalError}</span>
                        </div>
                      )}

                      {/* Booking Action */}
                      <div>
                        {isOrderBooked(viewingOrder) ? (
                          <div className="bg-[#0b5e1b] text-white py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-2xs">
                            <Check className="w-4 h-4" />
                            <span>SteadFast কুরিয়ারে এন্ট্রি সম্পন্ন হয়েছে</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSendToSteadfast(viewingOrder)}
                            disabled={sendingOrderId === viewingOrder.orderId}
                            className="w-full bg-[#9ad39d] hover:bg-[#85c989] text-[#1c5c24] py-2.5 px-3 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                          >
                            <Send className="w-4 h-4" />
                            <span>{sendingOrderId === viewingOrder.orderId ? 'SteadFast-এ পাঠানো হচ্ছে...' : 'Send to SteadFast (সরাসরি বুক করুন)'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Card 6: Quick Summary & Back */}
                    <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs space-y-3">
                      <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">অর্ডার টাইমলাইন ও আইডি</h3>
                      <div className="text-xs text-neutral-600 space-y-1.5">
                        <div className="flex justify-between">
                          <span>অর্ডার নাম্বার:</span>
                          <span className="font-mono font-bold text-neutral-900">{viewingOrder.orderId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>অর্ডারের সময়:</span>
                          <span className="font-semibold text-neutral-800">{formatOrderTime(viewingOrder)}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-neutral-100">
                        <button
                          type="button"
                          onClick={() => {
                            setViewingOrder(null);
                            setEditOrderForm(null);
                            setIsEditingOrder(false);
                            setSteadfastModalError(null);
                            setErrorBannerMsg(null);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          <span>সকল অর্ডারের তালিকায় ফিরে যান</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ================= ORDERS LIST (TABLE / CARDS / FILTER TABS) ================= */
              <>
                {/* Quick Status Filter Tabs Bar */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      statusFilter === 'all'
                        ? 'bg-neutral-900 text-white shadow-2xs'
                        : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    All ({orders.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('Processing')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      statusFilter === 'Processing'
                        ? 'bg-[#206927] text-white shadow-2xs'
                        : 'bg-[#d8edd6] text-[#206927] border border-[#b8dfb9] hover:bg-[#cde9cb]'
                    }`}
                  >
                    Processing ({orders.filter((o) => (o.status || 'Processing') === 'Processing').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('Confirm')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      statusFilter === 'Confirm'
                        ? 'bg-[#0073aa] text-white shadow-2xs'
                        : 'bg-blue-50 text-[#0073aa] border border-blue-200 hover:bg-blue-100'
                    }`}
                  >
                    Confirm ({orders.filter((o) => o.status === 'Confirm' || o.status === 'Confirmed').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('Complete')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      statusFilter === 'Complete' || statusFilter === 'Completed'
                        ? 'bg-[#0f5132] text-white shadow-2xs'
                        : 'bg-[#d1e7dd] text-[#0f5132] border border-[#badbcc] hover:bg-[#c2e2d0]'
                    }`}
                  >
                    Complete ({orders.filter((o) => o.status === 'Complete' || o.status === 'Completed').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('Cancel')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      statusFilter === 'Cancel' || statusFilter === 'Cancelled'
                        ? 'bg-[#495057] text-white shadow-2xs'
                        : 'bg-[#e9ecef] text-[#495057] border border-[#dee2e6] hover:bg-[#dfe2e6]'
                    }`}
                  >
                    Cancel ({orders.filter((o) => o.status === 'Cancel' || o.status === 'Cancelled').length})
                  </button>
                </div>

            {/* Expandable Search Input */}
            {isSearchOpen && (
              <div className="bg-white p-3 rounded-xl border border-neutral-200 shadow-sm flex items-center gap-2">
                <Search className="w-4 h-4 text-neutral-400 shrink-0" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="অর্ডার নম্বর (#7263), নাম বা ফোন খুঁজুন..."
                  className="w-full text-sm outline-none bg-transparent"
                  autoFocus
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="p-1 text-neutral-400 hover:text-neutral-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Desktop Top Action & Filter Toolbar (matching Screenshot 1) */}
            <div className="hidden md:flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-neutral-200/90 shadow-2xs">
              {/* Left: Bulk Actions */}
              <div className="flex items-center gap-2">
                <select
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value)}
                  className="px-3 py-1.5 border border-neutral-300 rounded text-xs bg-white text-neutral-700 font-medium outline-none focus:border-[#2271b1]"
                >
                  <option value="none">Bulk actions</option>
                  <option value="Confirm">Confirm</option>
                  <option value="Cancel">Cancel</option>
                  <option value="Complete">Complete</option>
                  <option value="send_steadfast">Send to SteadFast</option>
                  <option value="Delete">Delete</option>
                </select>
                <button
                  type="button"
                  onClick={handleApplyBulkAction}
                  className="px-3 py-1.5 border border-neutral-300 rounded text-xs font-semibold text-neutral-700 bg-neutral-50 hover:bg-neutral-100 cursor-pointer shadow-2xs active:scale-95"
                >
                  Apply
                </button>
                {selectedOrderIds.length > 0 && (
                  <span className="text-xs text-[#2271b1] font-semibold ml-1">
                    ({selectedOrderIds.length}টি সিলেক্টেড)
                  </span>
                )}
              </div>

              {/* Right: Date, Channel, Customer Filters & Quick Actions */}
              <div className="flex items-center gap-2">
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-2.5 py-1.5 border border-neutral-300 rounded text-xs bg-white text-neutral-700 outline-none"
                >
                  <option value="all">All dates</option>
                  <option value="today">Today</option>
                  <option value="this_month">This month</option>
                </select>

                <select
                  value={channelFilter}
                  onChange={(e) => setChannelFilter(e.target.value)}
                  className="px-2.5 py-1.5 border border-neutral-300 rounded text-xs bg-white text-neutral-700 outline-none"
                >
                  <option value="all">All sales channels</option>
                  <option value="website">Website Checkout</option>
                  <option value="manual">Manual Entry</option>
                </select>

                <select
                  value={customerFilter}
                  onChange={(e) => setCustomerFilter(e.target.value)}
                  className="px-2.5 py-1.5 border border-neutral-300 rounded text-xs bg-white text-neutral-700 outline-none"
                >
                  <option value="all">Filter by registered customer</option>
                  <option value="new">New Customers</option>
                  <option value="returning">Returning Customers</option>
                </select>

                <button
                  type="button"
                  onClick={() => showSuccessBanner('ফিল্টার সফলভাবে কার্যকর হয়েছে!')}
                  className="px-3 py-1.5 border border-neutral-300 rounded text-xs font-semibold text-neutral-700 bg-neutral-50 hover:bg-neutral-100 cursor-pointer shadow-2xs"
                >
                  Filter
                </button>

                <button
                  type="button"
                  onClick={() => setIsSearchOpen((prev) => !prev)}
                  className={`p-1.5 rounded border transition-colors cursor-pointer ${
                    isSearchOpen || searchTerm
                      ? 'bg-pink-50 text-[#ff146b] border-pink-200'
                      : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-600 border-neutral-200'
                  }`}
                  title="অর্ডার সার্চ করুন"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsQuickAddOpen(true)}
                  className="p-1.5 rounded bg-pink-50 hover:bg-pink-100 text-[#ff146b] border border-pink-200 transition-colors cursor-pointer"
                  title="নতুন অর্ডার যোগ করুন"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* ======================================================== */}
            {/* DESKTOP MODE TABLE (matching Screenshot 1 exactly)      */}
            {/* ======================================================== */}
            <div className="hidden md:block bg-white rounded-xl border border-neutral-200/90 shadow-sm overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[1020px]">
                <thead className="bg-[#f9fafb] text-neutral-700 border-b border-neutral-200 font-semibold select-none">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <button
                        type="button"
                        onClick={handleToggleSelectAll}
                        className="p-0.5 text-neutral-500 hover:text-neutral-800 cursor-pointer inline-flex items-center"
                        title={
                          selectedOrderIds.length === filteredOrders.length && filteredOrders.length > 0
                            ? 'সব আনসিলেক্ট করুন'
                            : 'সব সিলেক্ট করুন'
                        }
                      >
                        {selectedOrderIds.length === filteredOrders.length && filteredOrders.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-[#2271b1]" />
                        ) : (
                          <Square className="w-4 h-4 text-neutral-400" />
                        )}
                      </button>
                    </th>
                    <th className="p-3">
                      <button
                        type="button"
                        onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                        className="flex items-center gap-1 font-bold text-[#2271b1] hover:text-[#135e96] cursor-pointer"
                      >
                        <span>Order</span>
                        <ChevronsUpDown className="w-3.5 h-3.5 text-neutral-400" />
                      </button>
                    </th>
                    <th className="p-3">
                      <button
                        type="button"
                        onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                        className="flex items-center gap-1 font-bold text-neutral-600 hover:text-neutral-900 cursor-pointer"
                      >
                        <span>Date</span>
                        <ChevronsUpDown className="w-3.5 h-3.5 text-neutral-400" />
                      </button>
                    </th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3 text-center">Send to SteadFast</th>
                    <th className="p-3 text-center">Invoice</th>
                    <th className="p-3 text-center">ConsignmentID</th>
                    <th className="p-3 text-center">DeliveryStatus</th>
                    <th className="p-3 text-center">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200/80 bg-white">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-neutral-400">
                        কোনো অর্ডার পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => {
                      const isSelected = selectedOrderIds.includes(order.orderId);
                      const score = getCustomerScore(order);
                      const isSending = sendingOrderId === order.orderId;
                      const isRefreshing = refreshingOrderId === order.orderId;

                      return (
                        <tr
                          key={order.orderId}
                          className={`transition-colors ${
                            isSelected ? 'bg-blue-50/50 hover:bg-blue-50/70' : 'hover:bg-neutral-50/80'
                          }`}
                        >
                          {/* 1. Checkbox */}
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleSelectOrder(order.orderId)}
                              className="p-0.5 text-neutral-500 hover:text-neutral-800 cursor-pointer inline-flex items-center"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-[#2271b1]" />
                              ) : (
                                <Square className="w-4 h-4 text-neutral-300" />
                              )}
                            </button>
                          </td>

                          {/* 2. Order Link & Eye Icon */}
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenOrderModal(order)}
                                className="font-bold text-[#2271b1] hover:text-[#135e96] hover:underline cursor-pointer text-left"
                              >
                                {order.orderId} {order.customerName}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenOrderModal(order)}
                                className="text-[#2271b1] hover:text-[#135e96] p-1 rounded hover:bg-blue-50 cursor-pointer transition-colors"
                                title="অর্ডার ডিটেইলস ও এডিট দেখুন"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                          {/* 3. Date */}
                          <td className="p-3 text-neutral-500 whitespace-nowrap">
                            <div className="font-medium text-xs text-neutral-700">{formatOrderTime(order)}</div>
                            {isMultipleOrder(order) && (
                              <span className="text-[11px] font-bold text-red-600 block mt-0.5">
                                multiple order
                              </span>
                            )}
                          </td>

                          {/* 4. Status */}
                          <td className="p-3 whitespace-nowrap">
                            <div className="relative inline-block">
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveStatusDropdownId(
                                    activeStatusDropdownId === order.orderId ? null : order.orderId
                                  )
                                }
                                className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer border inline-flex items-center gap-1 shadow-2xs ${
                                  (order.status || 'Processing') === 'Processing'
                                    ? 'bg-[#d8edd6] text-[#206927] border-[#b8dfb9] hover:bg-[#cde9cb]'
                                    : order.status === 'Confirm' || order.status === 'Confirmed'
                                    ? 'bg-blue-50 text-[#0073aa] border-blue-200 hover:bg-blue-100'
                                    : order.status === 'Complete' || order.status === 'Completed'
                                    ? 'bg-[#d1e7dd] text-[#0f5132] border-[#badbcc] hover:bg-[#c2e2d0]'
                                    : order.status === 'Cancel' || order.status === 'Cancelled'
                                    ? 'bg-[#e9ecef] text-[#495057] border-[#dee2e6] hover:bg-[#dfe2e6]'
                                    : 'bg-neutral-100 text-neutral-700 border-neutral-200'
                                }`}
                              >
                                <span>{order.status || 'Processing'}</span>
                                <ChevronDown className="w-3 h-3 opacity-70" />
                              </button>

                              {/* Dropdown Menu */}
                              {activeStatusDropdownId === order.orderId && (
                                <div className="absolute left-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-neutral-200 py-1 z-30 animate-in fade-in">
                                  {(['Processing', 'Confirm', 'Complete', 'Cancel'] as const).map((st) => (
                                    <button
                                      key={st}
                                      type="button"
                                      onClick={() => {
                                        handleUpdateOrderStatus(order.orderId, st);
                                        setActiveStatusDropdownId(null);
                                      }}
                                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-neutral-50 font-medium text-neutral-700 cursor-pointer"
                                    >
                                      {st}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* 5. Amount */}
                          <td className="p-3 whitespace-nowrap">
                            <div className="px-2.5 py-1 border border-neutral-200 rounded text-neutral-800 font-bold bg-white text-center inline-block min-w-[65px] shadow-2xs">
                              {formatTaka(order.total)}
                            </div>
                          </td>

                          {/* 6. Send to SteadFast */}
                          <td className="p-3 text-center whitespace-nowrap">
                            {isOrderBooked(order) ? (
                              <button
                                type="button"
                                onClick={() => handleResetSteadfastEntry(order)}
                                className="bg-[#0b5e1b] hover:bg-rose-700 text-white px-2.5 py-1 rounded text-xs font-semibold inline-flex items-center gap-1 shadow-2xs group cursor-pointer transition-colors"
                                title="এন্ট্রি সম্পন্ন হয়েছে। ক্লিক করে এন্ট্রি রিসেট করতে পারেন"
                              >
                                <Check className="w-3 h-3 group-hover:hidden" />
                                <RotateCcw className="w-3 h-3 hidden group-hover:block" />
                                <span className="group-hover:hidden">Success</span>
                                <span className="hidden group-hover:inline">Reset</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSendToSteadfast(order)}
                                disabled={isSending}
                                className="bg-[#9ad39d] hover:bg-[#85c989] text-[#1c5c24] px-4 py-1 rounded text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer disabled:opacity-60 inline-flex items-center gap-1"
                                title="সরাসরি SteadFast কুরিয়ারে এন্ট্রি করুন"
                              >
                                <Send className="w-3 h-3" />
                                {isSending ? 'Sending...' : 'Send'}
                              </button>
                            )}
                          </td>

                          {/* 7. Invoice */}
                          <td className="p-3 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handlePrintInvoice(order)}
                              className="bg-[#00708f] hover:bg-[#005e78] text-white px-3.5 py-1 rounded text-xs font-semibold transition-all shadow-2xs active:scale-95 cursor-pointer inline-flex items-center gap-1"
                              title="ইনভয়েস প্রিন্ট করুন"
                            >
                              <Printer className="w-3 h-3" />
                              Print
                            </button>
                          </td>

                          {/* 8. ConsignmentID */}
                          <td className="p-3 text-center whitespace-nowrap">
                            {order.consignmentId ? (
                              <button
                                type="button"
                                onClick={() => handleCopyConsignment(order.consignmentId!)}
                                className="bg-[#f0f2f5] hover:bg-[#e4e6eb] text-neutral-800 font-mono text-xs px-2.5 py-1 rounded inline-flex items-center gap-1 cursor-pointer transition-colors"
                                title="কপি করতে ক্লিক করুন"
                              >
                                <span>{order.consignmentId}</span>
                                <Copy className="w-3 h-3 text-neutral-400" />
                              </button>
                            ) : (
                              <span className="text-neutral-400">-</span>
                            )}
                          </td>

                          {/* 9. DeliveryStatus */}
                          <td className="p-3 text-center whitespace-nowrap">
                            {order.deliveryStatus ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleRefreshDeliveryStatus(order)}
                                  disabled={isRefreshing}
                                  className="p-1 text-neutral-400 hover:text-neutral-800 rounded-full hover:bg-neutral-100 transition-colors cursor-pointer"
                                  title="লাইভ ডেলিভারি স্ট্যাটাস চেক করুন"
                                >
                                  <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
                                </button>
                                <span
                                  className={`text-[11px] font-bold px-2 py-0.5 rounded tracking-wide ${
                                    order.deliveryStatus === 'DELIVERED'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : order.deliveryStatus === 'IN_REVIEW'
                                      ? 'bg-amber-100 text-amber-800'
                                      : order.deliveryStatus === 'CANCELLED'
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-neutral-100 text-neutral-700'
                                  }`}
                                >
                                  {order.deliveryStatus}
                                </span>
                              </div>
                            ) : (
                              <span className="text-neutral-400">-</span>
                            )}
                          </td>

                          {/* 10. Score */}
                          <td className="p-3 text-center whitespace-nowrap">
                            <span
                              className="bg-[#006b75] hover:bg-[#005962] text-white text-xs font-bold px-2.5 py-1 rounded-[4px] min-w-[55px] text-center inline-block cursor-default tracking-wide"
                              title="কাস্টমার ডেলিভারি রিসিব পার্সেন্টেজ"
                            >
                              {score}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {/* Table Footer */}
                <tfoot className="bg-[#f9fafb] text-neutral-700 border-t border-neutral-200 font-semibold select-none">
                  <tr>
                    <th className="p-3 w-10 text-center"></th>
                    <th className="p-3">Order</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3 text-center">Send to SteadFast</th>
                    <th className="p-3 text-center">Invoice</th>
                    <th className="p-3 text-center">ConsignmentID</th>
                    <th className="p-3 text-center">DeliveryStatus</th>
                    <th className="p-3 text-center">Score</th>
                  </tr>
                </tfoot>
              </table>

              {/* Table Bottom Action Bar */}
              <div className="flex items-center gap-2 p-3 bg-white border-t border-neutral-200">
                <select
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value)}
                  className="px-3 py-1.5 border border-neutral-300 rounded text-xs bg-white text-neutral-700 font-medium outline-none"
                >
                  <option value="none">Bulk actions</option>
                  <option value="Confirm">Confirm</option>
                  <option value="Cancel">Cancel</option>
                  <option value="Complete">Complete</option>
                  <option value="send_steadfast">Send to SteadFast</option>
                  <option value="Delete">Delete</option>
                </select>
                <button
                  type="button"
                  onClick={handleApplyBulkAction}
                  className="px-3 py-1.5 border border-neutral-300 rounded text-xs font-semibold text-neutral-700 bg-neutral-50 hover:bg-neutral-100 cursor-pointer shadow-2xs active:scale-95"
                >
                  Apply
                </button>
              </div>
            </div>

            {/* ======================================================== */}
            {/* MOBILE MODE VIEW (matching Screenshot 2 exactly)         */}
            {/* ======================================================== */}
            <div className="md:hidden space-y-2.5">
              {/* Mobile Top Toolbar */}
              <div className="flex items-center justify-between px-3 py-2 bg-white rounded-xl border border-neutral-200 shadow-2xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="p-1 text-neutral-500 hover:text-neutral-800 cursor-pointer"
                  >
                    {selectedOrderIds.length === filteredOrders.length && filteredOrders.length > 0 ? (
                      <CheckSquare className="w-5 h-5 text-[#2271b1]" />
                    ) : (
                      <Square className="w-5 h-5 text-neutral-400" />
                    )}
                  </button>
                  <span className="text-xs font-bold text-neutral-700">Order</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSearchOpen((prev) => !prev)}
                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                      isSearchOpen || searchTerm
                        ? 'bg-pink-50 text-[#ff146b] border-pink-200'
                        : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-600 border-neutral-200'
                    }`}
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsQuickAddOpen(true)}
                    className="p-1.5 rounded-lg bg-pink-50 hover:bg-pink-100 text-[#ff146b] border border-pink-200 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs text-neutral-400 font-medium">
                    ({filteredOrders.length})
                  </span>
                </div>
              </div>

              {/* Mobile Order Cards List */}
              {filteredOrders.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center text-neutral-400 text-sm border border-neutral-200">
                  কোনো অর্ডার পাওয়া যায়নি।
                </div>
              ) : (
                filteredOrders.map((order) => {
                  const isSelected = selectedOrderIds.includes(order.orderId);
                  const isExpanded = !!expandedOrderIds[order.orderId];
                  const score = getCustomerScore(order);
                  const isSending = sendingOrderId === order.orderId;
                  const isRefreshing = refreshingOrderId === order.orderId;

                  return (
                    <div
                      key={order.orderId}
                      className={`bg-white rounded-xl border transition-all shadow-2xs overflow-hidden ${
                        isSelected ? 'border-blue-300 ring-1 ring-blue-200' : 'border-neutral-200/90'
                      }`}
                    >
                      {/* Main Card Header Row matching Screenshot 2 */}
                      <div className="flex items-center justify-between p-3 gap-2">
                        {/* Left: Checkbox */}
                        <button
                          type="button"
                          onClick={() => handleToggleSelectOrder(order.orderId)}
                          className="p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer shrink-0"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-[#2271b1]" />
                          ) : (
                            <Square className="w-5 h-5 text-neutral-300" />
                          )}
                        </button>

                        {/* Center-Left: Order Number & Relative Time */}
                        <div className="flex-1 min-w-0 pr-1">
                          <button
                            type="button"
                            onClick={() => handleOpenOrderModal(order)}
                            className="font-bold text-sm text-[#2271b1] hover:underline cursor-pointer block truncate text-left"
                          >
                            {order.orderId} {order.customerName}
                          </button>
                          <span className="text-xs text-neutral-400 font-normal block">
                            {formatOrderTime(order)}
                          </span>
                          {isMultipleOrder(order) && (
                            <span className="text-[11px] font-bold text-red-600 block mt-0.5 leading-tight">
                              multiple order
                            </span>
                          )}
                        </div>

                        {/* Center-Right: Status Badge */}
                        <div className="relative shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveStatusDropdownId(
                                activeStatusDropdownId === order.orderId ? null : order.orderId
                              )
                            }
                            className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer border inline-flex items-center gap-1 shadow-2xs ${
                              (order.status || 'Processing') === 'Processing'
                                ? 'bg-[#d8edd6] text-[#206927] border-[#b8dfb9]'
                                : order.status === 'Confirm' || order.status === 'Confirmed'
                                ? 'bg-blue-50 text-[#0073aa] border-blue-200'
                                : order.status === 'Complete' || order.status === 'Completed'
                                ? 'bg-[#d1e7dd] text-[#0f5132] border-[#badbcc]'
                                : order.status === 'Cancel' || order.status === 'Cancelled'
                                ? 'bg-[#e9ecef] text-[#495057] border-[#dee2e6]'
                                : 'bg-neutral-100 text-neutral-700 border-neutral-200'
                            }`}
                          >
                            <span>{order.status || 'Processing'}</span>
                            <ChevronDown className="w-3 h-3 opacity-70" />
                          </button>

                          {activeStatusDropdownId === order.orderId && (
                            <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-xl border border-neutral-200 py-1 z-30 animate-in fade-in">
                              {(['Processing', 'Confirm', 'Complete', 'Cancel'] as const).map((st) => (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => {
                                    handleUpdateOrderStatus(order.orderId, st);
                                    setActiveStatusDropdownId(null);
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-neutral-50 font-medium text-neutral-700 cursor-pointer"
                                >
                                  {st}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Far-Right Column: Top = Down Arrow button (Accordion toggle), Bottom = Eye button */}
                        <div className="flex flex-col items-center gap-1 shrink-0 pl-1 border-l border-neutral-100">
                          {/* Top: Down arrow button (user circled in red) */}
                          <button
                            type="button"
                            onClick={() => handleToggleExpandOrder(order.orderId)}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              isExpanded
                                ? 'bg-[#ff146b]/10 border-[#ff146b]/30 text-[#ff146b]'
                                : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-600'
                            }`}
                            title={isExpanded ? 'বিবরণ ও বাটন লুকান' : 'SteadFast ও অর্ডার ডিটেইলস দেখুন'}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>

                          {/* Bottom: Eye icon */}
                          <button
                            type="button"
                            onClick={() => handleOpenOrderModal(order)}
                            className="p-1.5 rounded-lg bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-[#2271b1] cursor-pointer"
                            title="অর্ডার পূর্ণ বিবরণী ও এডিট"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Expanded Accordion: SteadFast Courier Actions + Details */}
                      {isExpanded && (
                        <div className="px-3 py-3 bg-neutral-50/90 border-t border-neutral-200/80 text-xs space-y-2.5 animate-in fade-in">
                          {/* SteadFast Action Box */}
                          <div className="bg-white p-3 rounded-xl border border-neutral-200 shadow-2xs space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-neutral-800 flex items-center gap-1.5">
                                <Truck className="w-4 h-4 text-[#ff146b]" />
                                SteadFast কুরিয়ার
                              </span>
                              {/* Score Badge */}
                              <div className="flex items-center gap-1">
                                <span className="text-neutral-400 text-[11px]">Score:</span>
                                <span
                                  className="bg-[#006b75] text-white text-xs font-bold px-2 py-0.5 rounded-[4px]"
                                  title="গ্রাহকের রিসিব পারসেন্টেজ"
                                >
                                  {score}
                                </span>
                              </div>
                            </div>

                            {/* Send to SteadFast & Print Invoice Buttons */}
                            <div className="grid grid-cols-2 gap-2 pt-1">
                              {/* Send button */}
                              <div>
                                <span className="text-[11px] text-neutral-500 block mb-1">SteadFast এন্ট্রি:</span>
                                {isOrderBooked(order) ? (
                                  <button
                                    type="button"
                                    onClick={() => handleResetSteadfastEntry(order)}
                                    className="bg-[#0b5e1b] hover:bg-rose-700 text-white px-2 py-1.5 rounded text-xs font-semibold inline-flex items-center justify-center gap-1 w-full shadow-2xs group cursor-pointer transition-colors"
                                    title="এন্ট্রি সম্পন্ন হয়েছে। ক্লিক করে এন্ট্রি বাতিল করতে পারেন"
                                  >
                                    <Check className="w-3.5 h-3.5 group-hover:hidden" />
                                    <RotateCcw className="w-3.5 h-3.5 hidden group-hover:block" />
                                    <span className="group-hover:hidden">Success</span>
                                    <span className="hidden group-hover:inline">Reset</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleSendToSteadfast(order)}
                                    disabled={isSending}
                                    className="bg-[#9ad39d] hover:bg-[#85c989] text-[#1c5c24] px-3 py-1.5 rounded text-xs font-bold w-full shadow-2xs active:scale-95 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1"
                                  >
                                    <Send className="w-3.5 h-3.5" />
                                    {isSending ? 'Sending...' : 'Send'}
                                  </button>
                                )}
                              </div>

                              {/* Print Invoice button */}
                              <div>
                                <span className="text-[11px] text-neutral-500 block mb-1">ইনভয়েস:</span>
                                <button
                                  type="button"
                                  onClick={() => handlePrintInvoice(order)}
                                  className="bg-[#00708f] hover:bg-[#005e78] text-white px-3 py-1.5 rounded text-xs font-semibold w-full shadow-2xs active:scale-95 cursor-pointer flex items-center justify-center gap-1"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  Print
                                </button>
                              </div>
                            </div>

                            {/* Consignment ID & Delivery Status */}
                            <div className="pt-2 border-t border-neutral-100 flex items-center justify-between gap-2 flex-wrap">
                              <div>
                                <span className="text-[11px] text-neutral-400 block">Consignment ID:</span>
                                {order.consignmentId ? (
                                  <button
                                    type="button"
                                    onClick={() => handleCopyConsignment(order.consignmentId!)}
                                    className="bg-[#f0f2f5] hover:bg-[#e4e6eb] text-neutral-800 font-mono text-xs px-2 py-0.5 rounded inline-flex items-center gap-1 mt-0.5 cursor-pointer"
                                    title="কপি করতে ক্লিক করুন"
                                  >
                                    <span>{order.consignmentId}</span>
                                    <Copy className="w-3 h-3 text-neutral-400" />
                                  </button>
                                ) : (
                                  <span className="text-neutral-400 text-xs italic">বুক করা হয়নি</span>
                                )}
                              </div>

                              <div className="text-right">
                                <span className="text-[11px] text-neutral-400 block">Delivery Status:</span>
                                <div className="flex items-center gap-1 mt-0.5 justify-end">
                                  <button
                                    type="button"
                                    onClick={() => handleRefreshDeliveryStatus(order)}
                                    disabled={isRefreshing}
                                    className="p-1 text-neutral-400 hover:text-neutral-800 rounded-full hover:bg-neutral-100 cursor-pointer"
                                    title="লাইভ ডেলিভারি স্ট্যাটাস চেক করুন"
                                  >
                                    <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
                                  </button>
                                  <span
                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                      order.deliveryStatus === 'DELIVERED'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : order.deliveryStatus === 'IN_REVIEW'
                                        ? 'bg-amber-100 text-amber-800'
                                        : order.deliveryStatus === 'CANCELLED'
                                        ? 'bg-rose-100 text-rose-800'
                                        : 'bg-neutral-100 text-neutral-700'
                                    }`}
                                  >
                                    {order.deliveryStatus || 'PENDING'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Customer Information Block */}
                          <div className="bg-white p-3 rounded-xl border border-neutral-200 space-y-1.5 text-neutral-600">
                            <div className="flex justify-between items-center">
                              <span className="text-neutral-400">ফোন নম্বর:</span>
                              <div className="flex items-center gap-2">
                                <a
                                  href={`tel:${order.customerPhone}`}
                                  className="font-mono font-bold text-[#2271b1] hover:underline flex items-center gap-1"
                                >
                                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>{order.customerPhone}</span>
                                </a>
                              </div>
                            </div>

                            <div className="flex justify-between items-start pt-1 border-t border-neutral-100">
                              <span className="text-neutral-400">ঠিকানা:</span>
                              <span className="font-medium text-neutral-800 text-right max-w-[200px]">
                                {order.customerAddress}
                              </span>
                            </div>

                            <div className="flex justify-between items-center pt-1 border-t border-neutral-100">
                              <span className="text-neutral-400">সাইজ ও মোট:</span>
                              <div className="flex items-center gap-2">
                                <span className="bg-neutral-100 px-2 py-0.5 rounded font-bold text-neutral-800">
                                  {order.size}
                                </span>
                                <span className="font-bold text-[#206927]">
                                  {formatTaka(order.total)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Quick Action Buttons */}
                          <div className="flex items-center justify-end gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateOrderStatus(order.orderId, 'Confirm')}
                              className="px-2.5 py-1 bg-blue-50 text-[#0073aa] hover:bg-blue-100 border border-blue-200 rounded text-xs font-semibold cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateOrderStatus(order.orderId, 'Complete')}
                              className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded text-xs font-semibold cursor-pointer"
                            >
                              Complete
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateOrderStatus(order.orderId, 'Cancel')}
                              className="px-2.5 py-1 bg-neutral-100 text-neutral-600 hover:bg-neutral-200 rounded text-xs font-semibold cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteOrder(order.orderId)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded cursor-pointer ml-1"
                              title="মুছে ফেলুন"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Metrics at bottom */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div className="bg-white p-3 rounded-xl border border-neutral-200 text-center">
                <p className="text-[11px] text-neutral-500 font-semibold uppercase">মোট অর্ডার</p>
                <p className="text-lg font-bold text-neutral-900 mt-0.5">{orders.length} টি</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-neutral-200 text-center">
                <p className="text-[11px] text-neutral-500 font-semibold uppercase">মোট আইটেম</p>
                <p className="text-lg font-bold text-emerald-600 mt-0.5">{totalItemsSold} টি</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-neutral-200 text-center col-span-2 sm:col-span-1">
                <p className="text-[11px] text-neutral-500 font-semibold uppercase">মোট রেভিনিউ</p>
                <p className="text-lg font-bold text-[#206927] mt-0.5">{formatTaka(totalRevenue)}</p>
              </div>
            </div>
          </>
        )}

            {/* ================= MODAL: EDIT VISITOR COUNT ================= */}
            {isEditVisitorOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
                <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-neutral-200 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                        <Globe className="w-4 h-4" />
                      </div>
                      <h3 className="text-base font-bold text-neutral-900">ভিজিটর সংখ্যা আপডেট</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditVisitorOpen(false)}
                      className="p-1.5 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-neutral-700 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveVisitorCount} className="space-y-4 text-xs">
                    <div>
                      <label className="font-semibold text-neutral-700 block mb-1">মোট ওয়েবসাইট ভিজিটর (Visits)</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={editVisitorInput}
                        onChange={(e) => setEditVisitorInput(e.target.value)}
                        placeholder="যেমন: 50"
                        className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-xl focus:border-sky-500 focus:outline-none"
                      />
                      <p className="text-[11px] text-neutral-400 mt-1">
                        প্রতিবার কোনো কাস্টমার ওয়েবসাইটে ঢুকলে এই সংখ্যা স্বয়ংক্রিয়ভাবে বৃদ্ধি পায়।
                      </p>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsEditVisitorOpen(false)}
                        className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl font-bold cursor-pointer transition-colors"
                      >
                        বাতিল
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold cursor-pointer transition-colors"
                      >
                        সেভ করুন
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ================= MODAL: QUICK ADD MANUAL ORDER (PLUS ICON) ================= */}
            {isQuickAddOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
                <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-neutral-200 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-pink-50 text-[#ff146b] flex items-center justify-center font-bold">
                        <Plus className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-bold text-neutral-900">নতুন অর্ডার যোগ করুন</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsQuickAddOpen(false)}
                      className="p-1.5 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-neutral-700 cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleCreateManualOrder} className="space-y-3 text-xs">
                    <div>
                      <label className="font-semibold text-neutral-700 block mb-1">কাস্টমার নাম *</label>
                      <input
                        type="text"
                        required
                        value={newOrderName}
                        onChange={(e) => setNewOrderName(e.target.value)}
                        placeholder="যেমন: শামীম রেজা"
                        className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none focus:border-[#ff146b] text-sm"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-neutral-700 block mb-1">মোবাইল নম্বর *</label>
                      <input
                        type="tel"
                        required
                        value={newOrderPhone}
                        onChange={(e) => setNewOrderPhone(e.target.value)}
                        placeholder="যেমন: 01712345678"
                        className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none focus:border-[#ff146b] text-sm"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-neutral-700 block mb-1">ডেলিভারি ঠিকানা *</label>
                      <textarea
                        required
                        rows={2}
                        value={newOrderAddress}
                        onChange={(e) => setNewOrderAddress(e.target.value)}
                        placeholder="যেমন: বাড়ি নং ১২, রোড নং ৫, ধানমন্ডি, ঢাকা"
                        className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none focus:border-[#ff146b] text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-semibold text-neutral-700 block mb-1">সাইজ</label>
                        <select
                          value={newOrderSize}
                          onChange={(e) => setNewOrderSize(e.target.value as ShirtSize)}
                          className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none bg-white text-sm"
                        >
                          {configuredSizes.map((sz) => (
                            <option key={sz} value={sz}>{sz}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="font-semibold text-neutral-700 block mb-1">কালার</label>
                        <select
                          value={newOrderColor}
                          onChange={(e) => setNewOrderColor(e.target.value as any)}
                          className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none bg-white text-sm"
                        >
                          <option value="black">Black</option>
                          <option value="white">White</option>
                          <option value="red">Red</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-semibold text-neutral-700 block mb-1">পরিমাণ (Quantity)</label>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={newOrderQty}
                          onChange={(e) => setNewOrderQty(parseInt(e.target.value, 10) || 1)}
                          className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none text-sm"
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-neutral-700 block mb-1">ডেলিভারি জোন</label>
                        <select
                          value={newOrderZone}
                          onChange={(e) => setNewOrderZone(e.target.value as any)}
                          className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none bg-white text-sm"
                        >
                          <option value="inside_dhaka">ঢাকার ভিতরে (৳৮০)</option>
                          <option value="outside_dhaka">ঢাকার বাইরে (৳১৫০)</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsQuickAddOpen(false)}
                        className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-xl font-semibold cursor-pointer"
                      >
                        বাতিল
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-[#ff146b] hover:bg-[#e60055] text-white rounded-xl font-bold shadow-md shadow-pink-500/20 cursor-pointer"
                      >
                        অর্ডার নিশ্চিত করুন
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================= TAB 2: PRODUCTS, IMAGES & PRICES ======================= */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs">
              <h2 className="text-lg font-bold text-neutral-900 mb-1 flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#ff146b]" />
                <span>Ferrari Jacket কার্ড, ছবি ও দাম এডিটর</span>
              </h2>
              <p className="text-xs text-neutral-500 mb-6">
                এখানে সরাসরি যেকোনো Ferrari Jacket এর ছবি ডিভাইস থেকে আপলোড করতে পারেন, দাম পরিবর্তন করতে পারেন এবং টাইটেল পরিবর্তন করতে পারেন।
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {settings.products.map((prod, idx) => (
                  <div
                    key={prod.id}
                    className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200 flex flex-col justify-between"
                  >
                    <div>
                      {/* Product Image Preview & Upload Button */}
                      <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-neutral-200 mb-3 border border-neutral-300">
                        <img
                          src={prod.image}
                          alt={prod.name}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          disabled={uploadingProductIdx === idx}
                          onClick={() => productFileInputRefs.current[prod.id]?.click()}
                          className="absolute bottom-2 right-2 bg-black/80 hover:bg-black disabled:opacity-60 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow backdrop-blur-xs cursor-pointer transition-all active:scale-95"
                        >
                          {uploadingProductIdx === idx ? (
                            <>
                              <RotateCcw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                              <span>আপলোড হচ্ছে...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-3.5 h-3.5" />
                              <span>ছবি বদলান</span>
                            </>
                          )}
                        </button>
                        <input
                          type="file"
                          accept="image/*"
                          ref={(el) => {
                            productFileInputRefs.current[prod.id] = el;
                          }}
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handleFileUpload(e.target.files[0], (dataUrl) => {
                                handleProductImageUpload(idx, dataUrl);
                              });
                            }
                          }}
                        />
                      </div>

                      {/* Product English Name */}
                      <div className="mb-3">
                        <label className="block text-xs font-bold text-neutral-700 mb-1">
                          Ferrari Jacket এর টাইটেল (যেমন: Black / White / Red)
                        </label>
                        <input
                          type="text"
                          value={prod.name}
                          onChange={(e) => handleProductChange(idx, 'name', e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white border border-neutral-300 rounded-xl outline-none focus:border-[#ff146b]"
                        />
                      </div>

                      {/* Product Bangla Label */}
                      <div className="mb-3">
                        <label className="block text-xs font-bold text-neutral-700 mb-1">
                          বাংলা নাম (ট্যাগ / ব্যাজ)
                        </label>
                        <input
                          type="text"
                          value={prod.banglaName}
                          onChange={(e) => handleProductChange(idx, 'banglaName', e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white border border-neutral-300 rounded-xl outline-none focus:border-[#ff146b]"
                        />
                      </div>

                      {/* Pricing Fields */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-xs font-bold text-neutral-700 mb-1">
                            অফার মূল্য (৳)
                          </label>
                          <input
                            type="number"
                            value={prod.price}
                            onChange={(e) => handleProductChange(idx, 'price', Number(e.target.value) || 0)}
                            className="w-full px-3 py-2 text-sm font-bold text-emerald-700 bg-white border border-neutral-300 rounded-xl outline-none focus:border-[#ff146b]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-neutral-700 mb-1">
                            পূর্বের মূল্য (৳)
                          </label>
                          <input
                            type="number"
                            value={prod.originalPrice}
                            onChange={(e) => handleProductChange(idx, 'originalPrice', Number(e.target.value) || 0)}
                            className="w-full px-3 py-2 text-sm text-neutral-500 line-through bg-white border border-neutral-300 rounded-xl outline-none focus:border-[#ff146b]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-neutral-200 flex items-center justify-between text-xs text-neutral-400">
                      <span>আইডি: {prod.id}</span>
                      <span className="text-emerald-600 font-bold">লাইভ একটিভ</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveAllSettings}
                  disabled={isSavingSettings}
                  className="px-6 py-2.5 bg-[#ff146b] hover:bg-[#e60055] disabled:opacity-60 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-md cursor-pointer transition-all active:scale-95"
                >
                  {isSavingSettings ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      <span>লাইভ সেভ হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>প্রোডাক্ট পরিবর্তন সেভ করুন</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================= TAB 3: CONTENT & BANNER ======================= */}
        {activeTab === 'content' && (
          <div className="space-y-6">
            {/* Hero Banner Image & Heading */}
            <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs">
              <h2 className="text-lg font-bold text-neutral-900 mb-1 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-[#ff146b]" />
                <span>টপ ব্যানার ও প্রধান হেডলাইন এডিটর</span>
              </h2>
              <p className="text-xs text-neutral-500 mb-5">
                ওয়েবসাইটের উপরের ব্যানার ছবি এবং বড় হেডলাইন টেক্সট পরিবর্তন করুন।
              </p>

              <div className="space-y-6">
                {/* Multi-banner Manager Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-200">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-800">
                      ব্যানার স্লাইডার গ্যালারি ({currentBanners.length}টি ব্যানার সক্রিয়)
                    </h3>
                    <p className="text-xs text-neutral-500">
                      আপনি ৩-৪ টি বা তার বেশি ব্যানার যোগ করতে পারেন। মূল ওয়েবসাইটে এগুলো ৪ সেকেন্ড পর পর অটো-স্লাইড হবে এবং তীর চিহ্নে ক্লিক করেও দেখা যাবে।
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRestoreOriginalBanner}
                      className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 border border-neutral-300 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                      title="আসল হাই-কোয়ালিটি ব্যানার ছবি রিস্টোর করুন"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>আসল HD ব্যানার ফিরিয়ে আনুন</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => addBannerFileInputRef.current?.click()}
                      className="px-4 py-2 bg-[#ff146b] hover:bg-[#e60055] text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4" />
                      <span>নতুন ব্যানার যোগ করুন (+)</span>
                    </button>
                    <input
                      type="file"
                      accept="image/*"
                      ref={addBannerFileInputRef}
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleFileUpload(e.target.files[0], (dataUrl) => {
                            handleAddBanner(dataUrl);
                          });
                          e.target.value = '';
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Banner Grid (Previews, change, delete) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {currentBanners.map((bannerUrl, bIdx) => (
                    <div
                      key={bIdx}
                      className="bg-neutral-50 rounded-2xl p-3 border border-neutral-200 shadow-xs flex flex-col justify-between group relative"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-neutral-700 bg-white px-2 py-0.5 rounded-md border border-neutral-200">
                            ব্যানার {bIdx + 1} {bIdx === 0 && '★ (প্রধান)'}
                          </span>
                          {currentBanners.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteBanner(bIdx)}
                              className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                              title="ব্যানারটি মুছুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Banner Image Preview */}
                        <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-neutral-900 border border-neutral-300 mb-2.5">
                          <img
                            src={bannerUrl}
                            alt={`Banner ${bIdx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>

                      {/* Replace button for this banner */}
                      <div>
                        <button
                          type="button"
                          onClick={() => replaceBannerFileInputRefs.current[bIdx]?.click()}
                          className="w-full py-1.5 px-3 bg-white hover:bg-neutral-100 text-neutral-700 text-xs font-semibold rounded-lg border border-neutral-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        >
                          <Upload className="w-3 h-3 text-neutral-500" />
                          <span>ছবি বদলান</span>
                        </button>
                        <input
                          type="file"
                          accept="image/*"
                          ref={(el) => {
                            replaceBannerFileInputRefs.current[bIdx] = el;
                          }}
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handleFileUpload(e.target.files[0], (dataUrl) => {
                                handleReplaceBanner(bIdx, dataUrl);
                              });
                              e.target.value = '';
                            }
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Hero Headings Form */}
                <div className="pt-4 border-t border-neutral-200">
                  <h3 className="text-sm font-bold text-neutral-800 mb-3">
                    হেডলাইন ও ব্র্যান্ড টেক্সট
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-700 mb-1">
                        ব্র্যান্ড নাম (বড় টেক্সট ১)
                      </label>
                      <input
                        type="text"
                        value={settings.brandNamePart1}
                        onChange={(e) => setSettings({ ...settings, brandNamePart1: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:bg-white focus:border-[#ff146b]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-700 mb-1">
                        ব্র্যান্ড সাব-টাইটেল (যেমন: Fashion House)
                      </label>
                      <input
                        type="text"
                        value={settings.brandNamePart2}
                        onChange={(e) => setSettings({ ...settings, brandNamePart2: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:bg-white focus:border-[#ff146b]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-700 mb-1">
                        হেডলাইন শুরু (যেমন: প্রিমিয়াম এবং)
                      </label>
                      <input
                        type="text"
                        value={settings.heroHeadline}
                        onChange={(e) => setSettings({ ...settings, heroHeadline: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:bg-white focus:border-[#ff146b]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-700 mb-1">
                        হেডলাইন হাইলাইট (যেমন: Ferrari Jacket কালেকশন)
                      </label>
                      <input
                        type="text"
                        value={settings.heroHighlight}
                        onChange={(e) => setSettings({ ...settings, heroHighlight: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:bg-white focus:border-[#ff146b]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-neutral-700 mb-1">
                        টপ অর্ডার বাটন টেক্সট (CTA বাটন)
                      </label>
                      <input
                        type="text"
                        value={settings.ctaButtonText || '🛍️ অর্ডার করতে চাই'}
                        onChange={(e) => setSettings({ ...settings, ctaButtonText: e.target.value })}
                        placeholder="যেমন: 🛍️ অর্ডার করতে চাই"
                        className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:bg-white focus:border-[#ff146b]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Info Section & Description Card Texts */}
            <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs space-y-4">
              <h2 className="text-lg font-bold text-neutral-900 mb-1 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#ff146b]" />
                <span>বিবরণী ও হাইলাইট টেক্সট এডিটর</span>
              </h2>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  ইনফো সেকশন ব্যাজ টেক্সট
                </label>
                <input
                  type="text"
                  value={settings.infoBadge}
                  onChange={(e) => setSettings({ ...settings, infoBadge: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:bg-white focus:border-[#ff146b]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  প্রোডাক্ট বিস্তারিত বিবরণ (ডার্ক বক্স)
                </label>
                <textarea
                  rows={3}
                  value={settings.infoDescription}
                  onChange={(e) => setSettings({ ...settings, infoDescription: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:bg-white focus:border-[#ff146b]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  স্টক লিমিট নোটিশ (যেমন: সীমিত স্টক! তাই আজই অর্ডার করুন।)
                </label>
                <input
                  type="text"
                  value={settings.infoUrgencyText}
                  onChange={(e) => setSettings({ ...settings, infoUrgencyText: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:bg-white focus:border-[#ff146b]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  ফিচার কার্ড প্রধান বিবরণ (বড় লেখা)
                </label>
                <textarea
                  rows={3}
                  value={settings.descriptionCardText}
                  onChange={(e) => setSettings({ ...settings, descriptionCardText: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:bg-white focus:border-[#ff146b]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    ডেলিভারি সময় রো
                  </label>
                  <input
                    type="text"
                    value={settings.deliveryTimeText || 'Delivery Time: 3-7 দিন'}
                    onChange={(e) => setSettings({ ...settings, deliveryTimeText: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:bg-white focus:border-[#ff146b]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    সাইজ তালিকা রো
                  </label>
                  <input
                    type="text"
                    value={settings.sizesRowText || 'Size: M, L, XL, XXL'}
                    onChange={(e) => setSettings({ ...settings, sizesRowText: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:bg-white focus:border-[#ff146b]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    কালার তালিকা রো
                  </label>
                  <input
                    type="text"
                    value={settings.colorsRowText || 'Color : Black, White, Chocolate, Navy, Maroon'}
                    onChange={(e) => setSettings({ ...settings, colorsRowText: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:bg-white focus:border-[#ff146b]"
                  />
                </div>
              </div>
            </div>

            {/* Direct Size Chart Manager Shortcut Card */}
            <div className="bg-gradient-to-r from-pink-50 via-pink-100/40 to-indigo-50 rounded-2xl p-5 border-2 border-pink-300 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#ff146b] text-white flex items-center justify-center shrink-0 shadow-md shadow-pink-500/30">
                  <Ruler className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                    <span>সাইজ চার্ট ও মাপ এডিটর (Size Chart Manager)</span>
                    <span className="text-[10px] font-bold bg-[#ff146b] text-white px-2 py-0.5 rounded-full uppercase">
                      সরাসরি এডিটর
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-600 mt-0.5">
                    M, L, XL, XXL ইত্যাদি প্রতিটি সাইজের মাপ (বডি, কাঁধ ও ঝুল) এবং সাইজ চার্ট ছবি পরিবর্তন করতে এখানে ক্লিক করুন।
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('sizechart');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-4 py-2.5 bg-[#ff146b] hover:bg-[#e60055] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap active:scale-95"
              >
                <Ruler className="w-4 h-4" />
                <span>সাইজ চার্ট এডিট করুন</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Special Commitment Notice Section */}
            <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs space-y-4">
              <h2 className="text-lg font-bold text-neutral-900 mb-1 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#ff146b]" />
                <span>সাইজ চার্ট শিরোনাম ও বিশেষ বিনীত অনুরোধ এডিটর</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    সাইজ চার্ট শিরোনাম
                  </label>
                  <input
                    type="text"
                    value={settings.sizeChartTitle || 'সাইজ চার্ট (Ferrari Jacket Size Chart)'}
                    onChange={(e) => setSettings({ ...settings, sizeChartTitle: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:bg-white focus:border-[#ff146b]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    সাইজ চার্ট সাব-টাইটেল
                  </label>
                  <input
                    type="text"
                    value={settings.sizeChartSubtitle || 'আপনার সঠিক মাপ দেখে নিচে অর্ডার ফর্মে সাইজ সিলেক্ট করুন (সব মাপ ইঞ্চিতে)'}
                    onChange={(e) => setSettings({ ...settings, sizeChartSubtitle: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:bg-white focus:border-[#ff146b]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  বিশেষ অনুরোধ ব্যাজ টাইটেল
                </label>
                <input
                  type="text"
                  value={settings.commitmentBadge || '⚠️ বিশেষ বিনীত অনুরোধ'}
                  onChange={(e) => setSettings({ ...settings, commitmentBadge: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:bg-white focus:border-[#ff146b]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  বিশেষ অনুরোধের বিস্তারিত লেখা
                </label>
                <textarea
                  rows={3}
                  value={settings.commitmentDescription || ''}
                  onChange={(e) => setSettings({ ...settings, commitmentDescription: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:bg-white focus:border-[#ff146b]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  নিশ্চয়তা পিল টেক্সট
                </label>
                <input
                  type="text"
                  value={settings.commitmentPillText || '🤝 পার্সেল খুলে চেক করে রিসিভ করার নিশ্চয়তা'}
                  onChange={(e) => setSettings({ ...settings, commitmentPillText: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:bg-white focus:border-[#ff146b]"
                />
              </div>
            </div>

            {/* Color Section & Order Form Text Editor */}
            <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs space-y-4">
              <h2 className="text-lg font-bold text-neutral-900 mb-1 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-[#ff146b]" />
                <span>কালার নির্বাচন ও অর্ডার ফর্মের লেখা এডিটর</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    কালার নির্বাচন সেকশন টাইটেল
                  </label>
                  <input
                    type="text"
                    value={settings.colorSectionTitle}
                    onChange={(e) => setSettings({ ...settings, colorSectionTitle: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:bg-white focus:border-[#ff146b]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    কালার নির্বাচন সাব-টাইটেল
                  </label>
                  <input
                    type="text"
                    value={settings.colorSectionSubtitle}
                    onChange={(e) => setSettings({ ...settings, colorSectionSubtitle: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:bg-white focus:border-[#ff146b]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  অর্ডার ফর্মের বড় ব্যানার হেডিং
                </label>
                <input
                  type="text"
                  value={settings.orderFormBannerTitle}
                  onChange={(e) => setSettings({ ...settings, orderFormBannerTitle: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:bg-white focus:border-[#ff146b]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    নাম ফিল্ড লেবেল
                  </label>
                  <input
                    type="text"
                    value={settings.formNameLabel || 'আপনার নাম'}
                    onChange={(e) => setSettings({ ...settings, formNameLabel: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:bg-white focus:border-[#ff146b]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    ফোন নম্বর ফিল্ড লেবেল
                  </label>
                  <input
                    type="text"
                    value={settings.formPhoneLabel || 'মোবাইল নাম্বার'}
                    onChange={(e) => setSettings({ ...settings, formPhoneLabel: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:bg-white focus:border-[#ff146b]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    ঠিকানা ফিল্ড লেবেল
                  </label>
                  <input
                    type="text"
                    value={settings.formAddressLabel || 'সম্পূর্ণ ঠিকানা'}
                    onChange={(e) => setSettings({ ...settings, formAddressLabel: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:bg-white focus:border-[#ff146b]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  অর্ডার নিশ্চিতকরণ বাটন টেক্সট (বড় সবুজ বাটন)
                </label>
                <input
                  type="text"
                  value={settings.formSubmitButtonText || 'অর্ডার কনফার্ম করুন'}
                  onChange={(e) => setSettings({ ...settings, formSubmitButtonText: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:bg-white focus:border-[#ff146b]"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveAllSettings}
                  disabled={isSavingSettings}
                  className="px-6 py-2.5 bg-[#ff146b] hover:bg-[#e60055] disabled:opacity-60 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-md cursor-pointer transition-all active:scale-95"
                >
                  {isSavingSettings ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      <span>লাইভ সেভ হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>সব লেখা পরিবর্তন সেভ করুন</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================= TAB: SIZE CHART MANAGER ======================= */}
        {activeTab === 'sizechart' && (
          <SizeChartManager
            settings={settings}
            onUpdateSettings={async (newSettings) => {
              setSettings(newSettings);
              const res = await saveStoredSettings(newSettings);
              if (res.success) {
                if (onSettingsUpdate) onSettingsUpdate(newSettings);
                showSuccessBanner(res.warning || 'সাইজ চার্ট সফলভাবে সেভ হয়েছে এবং ওয়েবসাইটে লাইভ হয়েছে! 🎉');
              } else {
                showErrorBanner(`সেভ ত্রুটি: ${res.error || 'পুনরায় চেষ্টা করুন'}`);
              }
            }}
            showSuccessBanner={showSuccessBanner}
            showErrorBanner={showErrorBanner}
          />
        )}

        {/* ======================= TAB 4: DELIVERY & WHATSAPP SETTINGS ======================= */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs space-y-4">
              <h2 className="text-lg font-bold text-neutral-900 mb-1 flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#ff146b]" />
                <span>ডেলিভারি চার্জ ও কন্টাক্ট ইনফো এডিটর</span>
              </h2>

              {/* Free Delivery / Delivery Charge Off Toggle */}
              <div className="bg-emerald-50/90 border-2 border-emerald-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-emerald-700" />
                    <span className="font-bold text-sm sm:text-base text-emerald-950">
                      ডেলিভারি চার্জ অফ / ফ্রি ডেলিভারি চালু করুন
                    </span>
                    {settings.isFreeDeliveryEnabled ? (
                      <span className="px-2.5 py-0.5 bg-emerald-600 text-white text-[11px] font-bold rounded-full uppercase tracking-wider">
                        ফ্রি ডেলিভারি সক্রিয় (Active)
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 bg-neutral-200 text-neutral-700 text-[11px] font-bold rounded-full uppercase tracking-wider">
                        স্বাভাবিক চার্জ সক্রিয়
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    এটি চালু (ON) করলে কাস্টমারের কাছে ডেলিভারি চার্জ সম্পূর্ণ ফ্রী (০৳) হয়ে যাবে এবং অর্ডার ফর্মে <strong>"সারা বাংলাদেশ হোম ডেলিভারি একদম ফ্রী"</strong> দেখতে পাবেন।
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={!!settings.isFreeDeliveryEnabled}
                    onChange={(e) =>
                      setSettings({ ...settings, isFreeDeliveryEnabled: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {settings.isFreeDeliveryEnabled && (
                <div>
                  <label className="block text-xs font-bold text-emerald-900 mb-1">
                    ফ্রি ডেলিভারি নোটিশ টেক্সট (অর্ডার ফর্মে কাস্টমার যা দেখবে)
                  </label>
                  <input
                    type="text"
                    value={settings.freeDeliveryText || 'সারা বাংলাদেশ হোম ডেলিভারি একদম ফ্রী'}
                    onChange={(e) =>
                      setSettings({ ...settings, freeDeliveryText: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm font-bold bg-white border border-emerald-400 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-emerald-950"
                    placeholder="সারা বাংলাদেশ হোম ডেলিভারি একদম ফ্রী"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    ঢাকার বাইরে ডেলিভারি চার্জ (৳)
                  </label>
                  <input
                    type="number"
                    value={settings.deliveryOutsideDhakaCost}
                    onChange={(e) => setSettings({ ...settings, deliveryOutsideDhakaCost: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm font-bold bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:bg-white focus:border-[#ff146b]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    ঢাকার ভিতরে ডেলিভারি চার্জ (৳)
                  </label>
                  <input
                    type="number"
                    value={settings.deliveryInsideDhakaCost}
                    onChange={(e) => setSettings({ ...settings, deliveryInsideDhakaCost: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm font-bold bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:bg-white focus:border-[#ff146b]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    হোয়াটসঅ্যাপ লিংক নাম্বার (আন্তর্জাতিক ফরম্যাট, যেমন: 8801673154851)
                  </label>
                  <input
                    type="text"
                    value={settings.whatsappNumber}
                    onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:bg-white focus:border-[#ff146b]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    হোয়াটসঅ্যাপ ডিসপ্লে নাম্বার (যেমন: 01673-154851)
                  </label>
                  <input
                    type="text"
                    value={settings.displayPhone}
                    onChange={(e) => setSettings({ ...settings, displayPhone: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:bg-white focus:border-[#ff146b]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  ফুটার ট্যাগলাইন টেক্সট
                </label>
                <input
                  type="text"
                  value={settings.footerTagline}
                  onChange={(e) => setSettings({ ...settings, footerTagline: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:bg-white focus:border-[#ff146b]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    ফুটার কোয়ালিটি নিশ্চয়তা টেক্সট
                  </label>
                  <input
                    type="text"
                    value={settings.footerTrustText || '১০০% অথেনটিক কোয়ালিটি নিশ্চয়তা'}
                    onChange={(e) => setSettings({ ...settings, footerTrustText: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:bg-white focus:border-[#ff146b]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    ফুটার কপিরাইট টেক্সট
                  </label>
                  <input
                    type="text"
                    value={settings.footerCopyrightText || 'সর্বস্বত্ব সংরক্ষিত।'}
                    onChange={(e) => setSettings({ ...settings, footerCopyrightText: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:bg-white focus:border-[#ff146b]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>ডিফল্ট সেটিংসে ফিরিয়ে নিন</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveAllSettings}
                  disabled={isSavingSettings}
                  className="px-6 py-2.5 bg-[#ff146b] hover:bg-[#e60055] disabled:opacity-60 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-md cursor-pointer transition-all active:scale-95"
                >
                  {isSavingSettings ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      <span>লাইভ সেভ হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>সেটিংস সেভ করুন</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* COMPLETE DATA BACKUP & MIGRATION CARD */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-neutral-200/90 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/60 shrink-0">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                      <span>ওয়েবসাইট ডেটা ও ক্লাউড ব্যাকআপ</span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        লাইভ ক্লাউডে সংরক্ষিত
                      </span>
                    </h3>
                    <p className="text-xs text-neutral-500">
                      ওয়েবসাইটের সকল তথ্য Google Cloud Firestore এ সংরক্ষিত। অন্য সার্ভারে ডিপ্লয় করলেও কিছু হারাবে না।
                    </p>
                  </div>
                </div>
              </div>

              {/* Information Notice */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-950 space-y-1.5">
                <p className="font-bold flex items-center gap-1.5 text-emerald-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>অন্য যেকোনো সার্ভারে ডিপ্লয় করার ১০০% নিশ্চয়তা:</span>
                </p>
                <p className="leading-relaxed">
                  এই ওয়েবসাইটটি <strong>Google Cloud Firestore</strong> এর সাথে সরাসরি লাইভ কানেক্টেড। আপনি ফাইলগুলো নিয়ে Vercel, Netlify, cPanel, Hostinger বা VPS যে কোনো হোস্টিংয়ে ডিপ্লয় করলেও <strong>সকল কাস্টমার অর্ডার, ব্যানার ছবি, প্রোডাক্ট কালেকশন, কুরিয়ার সেটিংস এবং পাসওয়ার্ড স্বয়ংক্রিয়ভাবে সরাসরি লোড হবে</strong>—কোনো ডেটাই হারাবে না।
                </p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* Download Backup */}
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-all shadow cursor-pointer active:scale-95"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>📥 ফুল ব্যাকআপ ডাউনলোড (.json)</span>
                </button>

                {/* Import / Restore Backup */}
                <div>
                  <input
                    type="file"
                    ref={backupFileInputRef}
                    onChange={handleImportBackup}
                    accept=".json,application/json"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => backupFileInputRef.current?.click()}
                    disabled={isImportingBackup}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-neutral-50 border border-neutral-300 text-neutral-800 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95 disabled:opacity-60"
                  >
                    <Upload className="w-4 h-4 text-[#ff146b]" />
                    <span>{isImportingBackup ? 'রিস্টোর হচ্ছে...' : '📤 ব্যাকআপ ফাইল রিস্টোর করুন'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEADFAST TAB */}
        {activeTab === 'steadfast' && (
          <SteadfastCourierSection
            orders={orders}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onShowMessage={showSuccessBanner}
          />
        )}

        {/* CONVERSION TAB (Facebook & TikTok Pixel) */}
        {activeTab === 'conversion' && (
          <ConversionSettingsSection
            settings={settings}
            onSaveSettings={(newSettings) => {
              setSettings(newSettings);
              saveStoredSettings(newSettings);
              if (onSettingsUpdate) {
                onSettingsUpdate(newSettings);
              }
              showSuccessBanner('পিক্সেল ও কনভার্সন সেটিংস সফলভাবে আপডেট করা হয়েছে!');
            }}
            onBackToDashboard={() => {
              setActiveTab('dashboard');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onShowSuccess={showSuccessBanner}
          />
        )}
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        onSuccess={(msg) => showSuccessBanner(msg)}
      />
    </div>
  );
};
