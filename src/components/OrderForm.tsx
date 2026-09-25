import React, { useState, useRef, useEffect } from 'react';
import { PRODUCTS, SHIRT_PRICE } from '../data/products';
import { ShirtColorId, ShirtSize, ShirtProduct, OrderConfirmation } from '../types';
import { formatTaka } from '../utils/bengali';
import { CheckCircle, Truck, AlertCircle, ShoppingCart, Loader2 } from 'lucide-react';
import { saveOrderToFirestore, generateUniqueOrderId } from '../services/orderService';
import { trackPurchase, trackInitiateCheckout } from '../utils/pixelTracking';
import { getStoredSettings, SizeChartRowItem } from '../utils/siteSettings';

interface OrderFormProps {
  products?: ShirtProduct[];
  bannerTitle?: string;
  formNameLabel?: string;
  formPhoneLabel?: string;
  formAddressLabel?: string;
  formSubmitButtonText?: string;
  deliveryInsideDhakaCost?: number;
  deliveryOutsideDhakaCost?: number;
  isFreeDeliveryEnabled?: boolean;
  freeDeliveryText?: string;
  sizeChartRows?: SizeChartRowItem[];
  selectedColors: Record<ShirtColorId, boolean>;
  colorQuantities: Record<ShirtColorId, number>;
  selectedSize: ShirtSize;
  onSelectSize: (size: ShirtSize) => void;
  onScrollToColors: () => void;
  onOrderSuccess: (order: OrderConfirmation) => void;
}

export const OrderForm: React.FC<OrderFormProps> = ({
  products = PRODUCTS,
  bannerTitle = 'অর্ডার করতে নিচের ফর্মটি সঠিক ভাবে পূরণ করুন',
  formNameLabel = 'আপনার নাম লিখুন',
  formPhoneLabel = 'মোবাইল নাম্বার লিখুন',
  formAddressLabel = 'সম্পূর্ণ ঠিকানা লিখুন',
  formSubmitButtonText = 'অর্ডার কনফার্ম করুন',
  deliveryInsideDhakaCost = 80,
  deliveryOutsideDhakaCost = 150,
  isFreeDeliveryEnabled = false,
  freeDeliveryText = 'সারা বাংলাদেশ হোম ডেলিভারি একদম ফ্রী',
  sizeChartRows,
  selectedColors,
  colorQuantities,
  selectedSize,
  onSelectSize,
  onScrollToColors,
  onOrderSuccess,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [shippingZone, setShippingZone] = useState<'outside_dhaka' | 'inside_dhaka'>('outside_dhaka');
  const [isRecalculatingShipping, setIsRecalculatingShipping] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectShippingZone = (zone: 'outside_dhaka' | 'inside_dhaka') => {
    setIsRecalculatingShipping(true);
    setShippingZone(zone);
    setTimeout(() => {
      setIsRecalculatingShipping(false);
    }, 450);
  };

  // References for smooth scrolling and focusing on error
  const formHeaderRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const addressInputRef = useRef<HTMLTextAreaElement>(null);
  const buttonContainerRef = useRef<HTMLDivElement>(null);
  const [isButtonInView, setIsButtonInView] = useState(false);
  const hasTriggeredInitiateCheckout = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsButtonInView(true);
        }
      },
      { threshold: 0.1 }
    );

    if (buttonContainerRef.current) {
      observer.observe(buttonContainerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  const scrollToErrorNotice = () => {
    setTimeout(() => {
      if (formHeaderRef.current) {
        formHeaderRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  // Dynamically derive available sizes from size chart rows (admin configurable)
  const availableSizes: string[] = React.useMemo(() => {
    if (sizeChartRows && Array.isArray(sizeChartRows) && sizeChartRows.length > 0) {
      const list = sizeChartRows
        .map((r) => (typeof r.size === 'string' ? r.size.trim() : ''))
        .filter(Boolean);
      if (list.length > 0) return list;
    }
    return ['M', 'L', 'XL', 'XXL', '3XL', '4XL'];
  }, [sizeChartRows]);

  // Ensure selectedSize is valid when availableSizes changes
  useEffect(() => {
    if (availableSizes.length > 0 && !availableSizes.includes(selectedSize)) {
      onSelectSize(availableSizes[0]);
    }
  }, [availableSizes, selectedSize, onSelectSize]);

  // Selected products array
  const activeProducts = products.filter((p) => selectedColors[p.id]);
  const totalItemCount = activeProducts.reduce(
    (sum, p) => sum + (colorQuantities[p.id] || 1),
    0
  );

  const subtotal = activeProducts.reduce(
    (sum, p) => sum + p.price * (colorQuantities[p.id] || 1),
    0
  );

  const shippingCost = isFreeDeliveryEnabled
    ? 0
    : shippingZone === 'inside_dhaka'
    ? deliveryInsideDhakaCost
    : deliveryOutsideDhakaCost;
  const grandTotal = totalItemCount > 0 ? subtotal + shippingCost : 0;

  const handleInitiateCheckoutTracking = () => {
    if (!hasTriggeredInitiateCheckout.current) {
      hasTriggeredInitiateCheckout.current = true;
      trackInitiateCheckout(grandTotal, totalItemCount);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (activeProducts.length === 0) {
      setErrorMessage('দয়া করে Black, White অথবা Red থেকে অন্তত একটি কালার সিলেক্ট করুন।');
      onScrollToColors();
      return;
    }

    if (!customerName.trim()) {
      setErrorMessage('দয়া করে আপনার নাম লিখুন।');
      scrollToErrorNotice();
      setTimeout(() => nameInputRef.current?.focus(), 250);
      return;
    }

    // Normalize Bengali digits and strip whitespace
    const normalizeDigits = (str: string) => {
      const bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
      return str
        .split('')
        .map((c) => {
          const idx = bn.indexOf(c);
          return idx !== -1 ? String(idx) : c;
        })
        .join('');
    };

    const cleanPhone = normalizeDigits(customerPhone.trim());
    const digitsOnly = cleanPhone.replace(/[^\d]/g, '');
    const isStartingWith880 = cleanPhone.startsWith('+880') || cleanPhone.startsWith('880');

    if (!cleanPhone) {
      setErrorMessage('দয়া করে আপনার মোবাইল নাম্বার লিখুন।');
      scrollToErrorNotice();
      setTimeout(() => phoneInputRef.current?.focus(), 250);
      return;
    }

    if (isStartingWith880) {
      if (digitsOnly.length > 13) {
        setErrorMessage(`৮৮০ দিয়ে শুরু হলে নাম্বারটি ১৩ ডিজিটের বেশি হতে পারবে না! আপনি ${digitsOnly.length} ডিজিট লিখেছেন।`);
        scrollToErrorNotice();
        setTimeout(() => phoneInputRef.current?.focus(), 250);
        return;
      }
      if (digitsOnly.length < 13) {
        setErrorMessage('৮৮০ দিয়ে শুরু হলে নাম্বারটি ঠিক ১৩ ডিজিটের হতে হবে (যেমন: 8801XXXXXXXXX)!');
        scrollToErrorNotice();
        setTimeout(() => phoneInputRef.current?.focus(), 250);
        return;
      }
    } else {
      if (digitsOnly.length > 11) {
        setErrorMessage(`১১ টির বেশি নাম্বার দিয়ে অর্ডার করা যাবে না! আপনি ${digitsOnly.length} ডিজিট লিখেছেন। সঠিক ১১ ডিজিটের নাম্বার দিন (যেমন: 01XXXXXXXXX)।`);
        scrollToErrorNotice();
        setTimeout(() => phoneInputRef.current?.focus(), 250);
        return;
      }

      if (digitsOnly.length < 11) {
        setErrorMessage(`মোবাইল নাম্বার ঠিক ১১ ডিজিটের হতে হবে (যেমন: 01XXXXXXXXX)! আপনি মাত্র ${digitsOnly.length} ডিজিট লিখেছেন।`);
        scrollToErrorNotice();
        setTimeout(() => phoneInputRef.current?.focus(), 250);
        return;
      }

      if (!digitsOnly.startsWith('01')) {
        setErrorMessage('সঠিক মোবাইল নাম্বার দিন, যা ০১ দিয়ে শুরু হবে (যেমন: 01XXXXXXXXX) অথবা ৮৮০ দিয়ে শুরু হবে!');
        scrollToErrorNotice();
        setTimeout(() => phoneInputRef.current?.focus(), 250);
        return;
      }
    }

    if (!customerAddress.trim()) {
      setErrorMessage('দয়া করে আপনার সম্পূর্ণ ঠিকানা (থানা/জেলা সহ) লিখুন।');
      scrollToErrorNotice();
      setTimeout(() => addressInputRef.current?.focus(), 250);
      return;
    }

    setIsSubmitting(true);

    // Generate guaranteed unique 6-digit order ID for every customer and device
    const orderId = generateUniqueOrderId();
    const now = new Date();
    const formattedOrderTime =
      now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ', ' +
      now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    const orderedItems = activeProducts.map((p) => ({
      id: p.id,
      name: p.name,
      colorName: p.colorName,
      price: p.price,
      quantity: colorQuantities[p.id] || 1,
    }));

    const confirmation: OrderConfirmation = {
      orderId,
      orderTime: formattedOrderTime,
      createdAt: now.toISOString(),
      customerName: customerName.trim(),
      customerPhone: cleanPhone,
      customerAddress: customerAddress.trim(),
      size: selectedSize,
      selectedColors,
      colorQuantities,
      shippingZone,
      shippingCost,
      subtotal,
      total: grandTotal,
      orderedItems,
      status: 'Processing',
    };

    // Track Real Pixel Purchase event (Meta Pixel + TikTok Pixel + CAPI)
    try {
      trackPurchase(
        {
          orderId: confirmation.orderId,
          customerName: confirmation.customerName,
          customerPhone: confirmation.customerPhone,
          total: confirmation.total,
          subtotal: confirmation.subtotal,
          numItems: totalItemCount,
        },
        getStoredSettings()
      );
    } catch (pixelErr) {
      console.warn('Pixel purchase tracking error:', pixelErr);
    }

    // Persist order to central Firebase Firestore cloud database with smooth loading
    const minLoadingTime = new Promise((resolve) => setTimeout(resolve, 1200));

    try {
      await Promise.all([
        saveOrderToFirestore(confirmation),
        minLoadingTime,
      ]);
    } catch (saveErr) {
      console.warn('Order save notice:', saveErr);
    } finally {
      setIsSubmitting(false);
      onOrderSuccess(confirmation);
    }
  };

  return (
    <div id="orderSection" className="scroll-mt-6 relative">
      {/* Full-screen Blur & Rotating White Dot Spinner matching Product/Color Selection */}
      {isRecalculatingShipping && (
        <div className="fixed inset-0 z-50 bg-white/45 backdrop-blur-[2.5px] flex items-center justify-center pointer-events-auto select-none transition-all">
          <div className="w-12 h-12 rounded-full bg-[#374151]/90 shadow-2xl flex items-center justify-center text-white">
            <div className="w-6 h-6 relative animate-[spin_0.75s_linear_infinite]">
              {/* Circular track */}
              <div className="w-6 h-6 rounded-full border border-white/20" />
              {/* Distinct rotating white dot (. টা) */}
              <div className="w-2.5 h-2.5 rounded-full bg-white absolute top-0 left-1/2 -translate-x-1/2 shadow-[0_0_6px_rgba(255,255,255,0.9)]" />
            </div>
          </div>
        </div>
      )}

      {/* Form Title Banner */}
      <div
        ref={formHeaderRef}
        className="mx-4 sm:mx-5 mb-6 py-5 px-4 text-center bg-gradient-to-b from-[#1c0009] to-[#ef1857] border-[5px] border-[#3c7770] rounded-[22px] shadow-xl text-white scroll-mt-2"
      >
        <h2 className="text-2xl sm:text-3xl font-bold font-['Baloo_Da_2']">
          {bannerTitle}
        </h2>
      </div>

      {/* Main Order Form */}
      <section className="bg-[#fff8f6] text-[#075f58] mx-4 sm:mx-5 mb-4 sm:mb-6 p-6 sm:p-8 rounded-[25px] border-4 border-[#096553] shadow-2xl">
        <form onSubmit={handleSubmit} noValidate>
          {errorMessage && (
            <div className="mb-5 p-4 bg-red-50 border-2 border-red-500 rounded-xl text-red-700 flex items-start gap-2.5 text-sm sm:text-base font-semibold animate-shake">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Customer Name */}
          <div className="mb-3.5">
            <label
              htmlFor="customerName"
              className="block text-base sm:text-lg font-bold mb-1.5 text-[#075f58]"
            >
              {formNameLabel} <span className="text-red-500">*</span>
            </label>
            <input
              ref={nameInputRef}
              id="customerName"
              type="text"
              value={customerName}
              onFocus={handleInitiateCheckoutTracking}
              onChange={(e) => {
                setCustomerName(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder={formNameLabel}
              required
              className={`w-full p-3 sm:p-3.5 border-2 rounded-xl text-base outline-none bg-white text-neutral-900 transition-all ${
                errorMessage && !customerName.trim()
                  ? 'border-red-500 ring-2 ring-red-200'
                  : 'border-[#087060] focus:ring-2 focus:ring-[#087060]'
              }`}
            />
          </div>

          {/* Customer Phone */}
          <div className="mb-3.5">
            <label
              htmlFor="customerPhone"
              className="block text-base sm:text-lg font-bold mb-1.5 text-[#075f58]"
            >
              {formPhoneLabel} <span className="text-red-500">*</span>
            </label>
            <input
              ref={phoneInputRef}
              id="customerPhone"
              type="tel"
              value={customerPhone}
              onFocus={handleInitiateCheckoutTracking}
              onChange={(e) => {
                const val = e.target.value;
                const bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
                let normalized = val
                  .split('')
                  .map((c) => {
                    const idx = bn.indexOf(c);
                    return idx !== -1 ? String(idx) : c;
                  })
                  .join('');

                // Keep numbers and plus sign, but DO NOT block or truncate length while typing
                let filtered = normalized.replace(/[^\d+]/g, '');
                if (filtered.includes('+') && !filtered.startsWith('+')) {
                  filtered = filtered.replace(/\+/g, '');
                }
                if (filtered.startsWith('+')) {
                  filtered = '+' + filtered.slice(1).replace(/\+/g, '');
                }

                setCustomerPhone(filtered);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="01XXXXXXXXX বা 8801XXXXXXXXX"
              required
              className={`w-full p-3 sm:p-3.5 border-2 rounded-xl text-base outline-none bg-white text-neutral-900 transition-all ${
                errorMessage && (errorMessage.includes('মোবাইল') || errorMessage.includes('নাম্বার') || errorMessage.includes('ডিজিট'))
                  ? 'border-red-500 ring-2 ring-red-300 bg-red-50/30 text-red-950'
                  : 'border-[#087060] focus:ring-2 focus:ring-[#087060]'
              }`}
            />
            {errorMessage && (errorMessage.includes('মোবাইল') || errorMessage.includes('নাম্বার') || errorMessage.includes('ডিজিট')) && (
              <p className="mt-1.5 text-xs sm:text-sm font-bold text-red-600 flex items-center gap-1.5 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMessage}</span>
              </p>
            )}
          </div>

          {/* Customer Address */}
          <div className="mb-4">
            <label
              htmlFor="customerAddress"
              className="block text-base sm:text-lg font-bold mb-1.5 text-[#075f58]"
            >
              {formAddressLabel} <span className="text-red-500">*</span>
            </label>
            <textarea
              ref={addressInputRef}
              id="customerAddress"
              value={customerAddress}
              onFocus={handleInitiateCheckoutTracking}
              onChange={(e) => {
                setCustomerAddress(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="আপনার সম্পূর্ণ ঠিকানা (বাড়ি নং, রোড নং, থানা, জেলা)"
              required
              rows={2}
              className={`w-full p-3 sm:p-3.5 border-2 rounded-xl text-base outline-none bg-white text-neutral-900 transition-all resize-y ${
                errorMessage && !customerAddress.trim()
                  ? 'border-red-500 ring-2 ring-red-200'
                  : 'border-[#087060] focus:ring-2 focus:ring-[#087060]'
              }`}
            />
          </div>

          {/* Size Options (Vertical layout matching the uploaded screenshot, dynamically linked with Size Chart) */}
          <div className="mb-5">
            <label className="block text-lg sm:text-xl font-bold mb-2.5 text-[#075f58]">
              কোন সাইজ নিবেন (সিলেক্ট করুন)<span className="text-red-500">*</span>
            </label>

            <div className="flex flex-col space-y-1 pl-1">
              {availableSizes.map((size) => {
                const isSelected = selectedSize === size;
                return (
                  <label
                    key={size}
                    onClick={() => onSelectSize(size)}
                    className="flex items-center gap-3 cursor-pointer py-1.5 px-1 rounded-lg group select-none w-full hover:bg-black/[0.03] transition-colors"
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        isSelected
                          ? 'border-[#075f58] bg-white'
                          : 'border-neutral-400 bg-white group-hover:border-neutral-600'
                      }`}
                    >
                      {isSelected && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#075f58]" />
                      )}
                    </div>
                    <input
                      type="radio"
                      name="size"
                      value={size}
                      checked={isSelected}
                      onChange={() => onSelectSize(size)}
                      className="sr-only"
                    />
                    <span className="text-base sm:text-lg font-bold text-[#075f58] flex items-center">
                      {size}
                      <span className="text-red-500 font-bold ml-1">*</span>
                    </span>
                    {/* Full horizontal click area filler */}
                    <div className="flex-1 h-6" />
                  </label>
                );
              })}
            </div>
          </div>

          {/* Shipping Selection Card (Placed above Your Order as in the screenshot) */}
          <div className="mb-6">
            <label className="block text-sm sm:text-base font-bold mb-2 text-[#075f58]">
              Shipping
            </label>
            {isFreeDeliveryEnabled ? (
              <div className="bg-emerald-50/90 border-2 border-emerald-500 rounded-xl p-3.5 sm:p-4 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Truck className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-sm sm:text-base text-emerald-950 leading-snug">
                    {freeDeliveryText || 'সারা বাংলাদেশ হোম ডেলিভারি একদম ফ্রী'}
                  </span>
                </div>
                <span className="px-2.5 py-1 bg-emerald-600 text-white text-xs sm:text-sm font-extrabold rounded-lg shrink-0 shadow-2xs">
                  ফ্রী (0.00৳)
                </span>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-neutral-300 overflow-hidden shadow-xs">
                <label
                  onClick={() => handleSelectShippingZone('outside_dhaka')}
                  className={`flex items-center justify-between px-4 py-3 cursor-pointer border-b border-neutral-200 transition-colors ${
                    shippingZone === 'outside_dhaka' ? 'bg-emerald-50/50 font-medium' : 'hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="shipping"
                      value="150"
                      checked={shippingZone === 'outside_dhaka'}
                      onChange={() => handleSelectShippingZone('outside_dhaka')}
                      className="accent-[#075f58] w-4 h-4 cursor-pointer"
                    />
                    <span className="text-neutral-800 text-sm sm:text-base">ঢাকার বাহিরে:</span>
                  </div>
                  <strong className="text-sm sm:text-base text-neutral-800">{deliveryOutsideDhakaCost}.00৳</strong>
                </label>

                <label
                  onClick={() => handleSelectShippingZone('inside_dhaka')}
                  className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${
                    shippingZone === 'inside_dhaka' ? 'bg-emerald-50/50 font-medium' : 'hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="shipping"
                      value="80"
                      checked={shippingZone === 'inside_dhaka'}
                      onChange={() => handleSelectShippingZone('inside_dhaka')}
                      className="accent-[#075f58] w-4 h-4 cursor-pointer"
                    />
                    <span className="text-neutral-800 text-sm sm:text-base">ঢাকার ভিতরে:</span>
                  </div>
                  <strong className="text-sm sm:text-base text-neutral-800">{deliveryInsideDhakaCost}.00৳</strong>
                </label>
              </div>
            )}
          </div>

          {/* Order Summary (Matching screenshot: compact typography, clean dashed dividers) */}
          <div className="mt-4">

            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg sm:text-xl font-bold text-[#075f58]">
                আপনার অর্ডার
              </h3>
            </div>

            {/* Table Header: Product ......... Subtotal */}
            <div className="flex justify-between items-center text-xs sm:text-sm font-semibold text-neutral-700 pb-2 border-b border-dashed border-neutral-300">
              <span>Product</span>
              <span>Subtotal</span>
            </div>

            {/* Active Products List */}
            {activeProducts.length === 0 ? (
              <div className="py-5 text-center text-neutral-500 font-medium">
                <p className="text-sm text-amber-700 font-semibold mb-1">
                  ⚠️ কোনো কালার সিলেক্ট করা হয়নি
                </p>
                <button
                  type="button"
                  onClick={onScrollToColors}
                  className="text-xs font-bold text-pink-600 underline hover:text-pink-700 cursor-pointer"
                >
                  উপরের কালার সেকশন থেকে সিলেক্ট করুন
                </button>
              </div>
            ) : (
              <div className="divide-y divide-dashed divide-neutral-300">
                {activeProducts.map((p) => {
                  const qty = colorQuantities[p.id] || 1;
                  const itemTotal = p.price * qty;
                  return (
                    <div
                      key={p.id}
                      className="py-2.5 flex items-center justify-between gap-2 text-xs sm:text-sm"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={p.image}
                          alt={p.name}
                          className="w-11 h-11 object-cover rounded-md border border-neutral-200 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <span className="font-medium text-neutral-900 truncate">
                          {p.colorName} <span className="font-bold text-emerald-800">×{qty}</span>
                        </span>
                      </div>
                      <span className="font-semibold text-neutral-900 shrink-0">
                        {itemTotal.toLocaleString('en-US')}.00৳
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Subtotal */}
            <div className="flex justify-between items-center py-2.5 border-t border-b border-dashed border-neutral-300 text-xs sm:text-sm font-medium text-neutral-800">
              <span>Subtotal</span>
              <span className="font-semibold">{subtotal.toLocaleString('en-US')}.00৳</span>
            </div>

            {/* Total */}
            <div className="flex justify-between items-center py-2.5 border-b border-dashed border-neutral-300 text-sm sm:text-base font-bold text-neutral-900">
              <span>Total</span>
              <span className="text-[#075f58] transition-all duration-200">
                {grandTotal.toLocaleString('en-US')}.00৳
              </span>
            </div>
          </div>

          {/* Cash on Delivery assurance matching screenshot */}
          <div className="bg-white text-neutral-800 p-4 sm:p-5 rounded-2xl mt-5 border border-neutral-200 shadow-sm">
            <h4 className="text-sm sm:text-base font-bold mb-2.5 text-neutral-900">
              ক্যাশ অন ডেলিভারি (হোম ডেলিভারি)
            </h4>
            <div className="relative bg-neutral-100 p-3 sm:p-3.5 rounded-lg text-xs sm:text-sm leading-relaxed text-neutral-700">
              {/* Little speech bubble arrow pointing up */}
              <div className="absolute -top-1.5 left-6 w-3 h-3 bg-neutral-100 rotate-45" />
              <p className="relative z-10">
                ১০০% নিশ্চিত হয়ে অর্ডার করুন। পণ্য হাতে পেয়ে ডেলিভারি ম্যানকে পেমেন্ট করতে পারবেন
              </p>
            </div>
          </div>

          {/* Confirm Order Button with entrance and pulse animation */}
          <div
            ref={buttonContainerRef}
            className={`mt-5 transition-all duration-700 ease-out ${
              isButtonInView ? 'order-submit-entrance' : 'opacity-0 translate-y-6 scale-95'
            }`}
          >
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative overflow-hidden w-full py-3.5 sm:py-4 px-6 rounded-xl sm:rounded-2xl border-2 sm:border-3 border-[#00d09c] bg-gradient-to-r from-[#003c2e] via-[#005a44] to-[#003c2e] text-white text-lg sm:text-xl font-bold order-submit-pulse hover:brightness-110 hover:scale-[1.015] active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 shadow-[0_4px_25px_rgba(0,152,117,0.45)]"
            >
              {/* Glossy shimmer sweep effect */}
              <span className="order-submit-shimmer" aria-hidden="true" />

              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>অর্ডার প্রসেস হচ্ছে...</span>
                </span>
              ) : (
                <span className="relative z-10 flex items-center justify-center gap-2 drop-shadow-sm font-['Baloo_Da_2',sans-serif]">
                  <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-[#48f2b8]" />
                  <span>{formSubmitButtonText || 'অর্ডার কনফার্ম করুন'}</span>
                </span>
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
