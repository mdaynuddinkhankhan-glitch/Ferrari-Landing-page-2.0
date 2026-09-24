import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { OrderConfirmation, ShirtProduct } from '../types';
import { PRODUCTS } from '../data/products';
import { formatTaka } from '../utils/bengali';
import { getStoredSettings } from '../utils/siteSettings';
import { Check, ShoppingBag, ShieldCheck, Phone, MapPin, Package } from 'lucide-react';
import { CelebrationConfetti } from './CelebrationConfetti';

interface OrderSuccessPageProps {
  order: OrderConfirmation;
  products?: ShirtProduct[];
  onBackToHome: () => void;
}

export const OrderSuccessPage: React.FC<OrderSuccessPageProps> = ({ order, products, onBackToHome }) => {
  const currentProducts = products || getStoredSettings().products || PRODUCTS;

  // Resolve items: 
  const displayItems = (order.orderedItems && order.orderedItems.length > 0)
    ? order.orderedItems
    : currentProducts
        .filter((p) => order?.selectedColors?.[p.id])
        .map((p) => {
          const qty = order?.colorQuantities?.[p.id] || 1;
          const activeColorCount = Object.values(order?.selectedColors || {}).filter(Boolean).length;
          const itemPrice = (order.subtotal && activeColorCount === 1)
            ? Math.round(order.subtotal / qty)
            : p.price;
          return {
            id: p.id,
            name: p.name,
            colorName: p.colorName,
            price: itemPrice,
            quantity: qty,
          };
        });

  // Format date like: "September 25, 2026"
  const formattedDate = (() => {
    try {
      const d = order.createdAt ? new Date(order.createdAt) : new Date();
      return d.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }
  })();

  const cleanOrderNum = String(order.orderId || '').replace('#', '');

  useEffect(() => {
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      window.scrollTo(0, 0);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#072d24] flex flex-col justify-between relative overflow-hidden">
      {/* Subtle celebration confetti */}
      <CelebrationConfetti />

      {/* Top Section: Deep Forest Green with Large Bold Title matching screenshot */}
      <div className="pt-10 pb-16 px-4 text-center relative z-10">
        {/* White circular check badge */}
        <motion.div
          initial={{ scale: 0, rotate: -25 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 18, delay: 0.1 }}
          className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full flex items-center justify-center mx-auto shadow-2xl mb-6"
        >
          <Check className="w-9 h-9 sm:w-11 h-11 text-[#07362a] stroke-[3.5]" />
        </motion.div>

        {/* Big Bold Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2 }}
          className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-wide font-['Baloo_Da_2'] max-w-lg mx-auto"
        >
          অর্ডার করার জন্য ধন্যবাদ
        </motion.h1>

        {/* Subtitle paragraph in Bengali */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.3 }}
          className="text-base sm:text-lg md:text-xl text-white/95 mt-4 sm:mt-5 max-w-md mx-auto leading-relaxed font-normal px-2 font-['Baloo_Da_2']"
        >
          আমাদের একজন প্রতিনিধি খুব শীঘ্রই আপনার সাথে যোগাযোগ করে অর্ডারটি কনফার্ম করবেন।
        </motion.p>
      </div>

      {/* Lower Receipt Section: Clean White Card overlapping the dark green */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35 }}
        className="w-full max-w-xl mx-auto bg-white rounded-t-[32px] sm:rounded-t-[38px] p-5 sm:p-8 text-neutral-800 shadow-2xl relative z-10 flex-1 flex flex-col justify-between"
      >
        <div>
          {/* Sub Header */}
          <h2 className="text-base sm:text-lg font-bold text-neutral-800 mb-5 font-['Baloo_Da_2',sans-serif]">
            Thank you. Your order has been received.
          </h2>

          {/* Structured Receipt Box with Dotted/Dashed Dividers */}
          <div className="bg-[#f8f9fa] rounded-2xl p-4 sm:p-6 border border-neutral-200/90 shadow-2xs space-y-4 font-['Baloo_Da_2',sans-serif]">
            {/* Order number */}
            <div className="border-b border-dashed border-neutral-300 pb-3.5">
              <span className="text-xs sm:text-sm text-neutral-500 font-semibold block mb-0.5">
                Order number:
              </span>
              <span className="text-base sm:text-lg font-bold font-mono text-neutral-900">
                {cleanOrderNum}
              </span>
            </div>

            {/* Date */}
            <div className="border-b border-dashed border-neutral-300 pb-3.5">
              <span className="text-xs sm:text-sm text-neutral-500 font-semibold block mb-0.5">
                Date:
              </span>
              <span className="text-sm sm:text-base font-bold text-neutral-900">
                {formattedDate}
              </span>
            </div>

            {/* Total */}
            <div className="border-b border-dashed border-neutral-300 pb-3.5">
              <span className="text-xs sm:text-sm text-neutral-500 font-semibold block mb-0.5">
                Total:
              </span>
              <span className="text-base sm:text-lg font-extrabold text-neutral-900">
                {order.total.toLocaleString('en-US')}.00৳
              </span>
            </div>

            {/* Payment method */}
            <div>
              <span className="text-xs sm:text-sm text-neutral-500 font-semibold block mb-0.5">
                Payment method:
              </span>
              <span className="text-sm sm:text-base font-bold text-neutral-900">
                ক্যাশ অন ডেলিভারি (হোম ডেলিভারি)
              </span>
            </div>
          </div>

          {/* Customer & Items Brief Summary */}
          <div className="mt-5 bg-neutral-50 rounded-2xl p-4 border border-neutral-200 text-xs sm:text-sm text-neutral-700 space-y-2">
            <div className="flex items-center gap-2 text-neutral-800 font-semibold">
              <Phone className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>মোবাইল: <span className="font-mono font-bold text-neutral-900">{order.customerPhone}</span></span>
            </div>
            <div className="flex items-start gap-2 text-neutral-800">
              <MapPin className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <span>ঠিকানা: <span className="font-medium text-neutral-900">{order.customerAddress}</span></span>
            </div>
            <div className="flex items-center gap-2 text-neutral-800">
              <Package className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>সাইজ: <span className="font-bold bg-neutral-200 px-2 py-0.5 rounded text-xs">{order.size}</span></span>
            </div>
            {displayItems.length > 0 && (
              <div className="pt-2 border-t border-neutral-200">
                <span className="font-semibold block mb-1">অর্ডারকৃত আইটেম:</span>
                <ul className="space-y-1 pl-1 text-xs">
                  {displayItems.map((item) => (
                    <li key={item.id} className="flex justify-between text-neutral-600">
                      <span>• {item.colorName || item.name} ({item.quantity} টি)</span>
                      <span className="font-semibold text-neutral-900">{formatTaka(item.price * item.quantity)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Back to Home Button */}
        <div className="mt-6 pt-2">
          <button
            type="button"
            onClick={onBackToHome}
            className="w-full py-3.5 px-5 bg-[#07362a] hover:bg-[#05281f] text-white rounded-xl font-bold text-base shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
          >
            <ShoppingBag className="w-5 h-5 text-emerald-400" />
            <span>আরো কেনাকাটা করুন / পেজে ফিরে যান</span>
          </button>

          <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-neutral-500 text-center">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Ferrari Jacket কালেকশন অর্ডার করার জন্য ধন্যবাদ!</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
