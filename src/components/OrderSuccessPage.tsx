import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { OrderConfirmation, ShirtProduct } from '../types';
import { PRODUCTS } from '../data/products';
import { formatTaka } from '../utils/bengali';
import { getStoredSettings } from '../utils/siteSettings';
import { CheckCircle2, ShieldCheck, ShoppingBag, Sparkles } from 'lucide-react';
import { CelebrationConfetti } from './CelebrationConfetti';

interface OrderSuccessPageProps {
  order: OrderConfirmation;
  products?: ShirtProduct[];
  onBackToHome: () => void;
}

export const OrderSuccessPage: React.FC<OrderSuccessPageProps> = ({ order, products, onBackToHome }) => {
  const currentProducts = products || getStoredSettings().products || PRODUCTS;

  // Resolve items: 
  // 1. If order has orderedItems, use them
  // 2. Otherwise match from current dynamic products from siteSettings
  // 3. If single item order with existing subtotal, calculate item price directly from subtotal
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

  useEffect(() => {
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      window.scrollTo(0, 0);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col justify-between p-3 sm:p-5 relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg mx-auto bg-white rounded-3xl p-5 sm:p-8 text-neutral-900 shadow-2xl border-4 border-emerald-500 my-2 relative overflow-hidden"
      >
        {/* Subtle Confetti Celebration Animation using Framer Motion */}
        <CelebrationConfetti />

        {/* Success Header */}
        <div className="text-center pb-4 border-b border-neutral-200 relative z-10">
          {/* Animated Success Badge with framer-motion */}
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: 'spring',
              stiffness: 260,
              damping: 14,
              delay: 0.1,
            }}
            className="relative w-20 h-20 mx-auto mb-3"
          >
            <div className="w-full h-full bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-full flex items-center justify-center text-white shadow-[0_8px_25px_rgba(16,185,129,0.35)]">
              <CheckCircle2 className="w-11 h-11" strokeWidth={2.5} />
            </div>

            {/* Subtle sparkling star */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.2, 1], opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="absolute -top-1 -right-1 bg-amber-400 text-amber-950 p-1 rounded-full shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </motion.div>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="text-2xl sm:text-3xl font-bold font-['Baloo_Da_2'] text-emerald-800 flex items-center justify-center gap-1.5"
          >
            <span>🎉 অর্ডার সফল হয়েছে!</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="text-sm sm:text-base text-neutral-600 mt-1 font-medium"
          >
            ধন্যবাদ! আপনার অর্ডারটি আমরা গ্রহণ করেছি। খুব শীঘ্রই আমাদের প্রতিনিধি আপনাকে কল করে নিশ্চিত করবেন।
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.35 }}
            className="inline-block bg-neutral-100 text-neutral-800 px-4 py-1.5 rounded-full text-xs sm:text-sm font-mono font-bold mt-3 border border-neutral-300 shadow-2xs"
          >
            অর্ডার আইডি: <span className="text-[#ff0870] font-extrabold">{order.orderId}</span>
          </motion.div>
        </div>

        {/* Order Details Preview */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.45 }}
          className="my-5 bg-neutral-50 rounded-2xl p-4 sm:p-5 border border-neutral-200 text-sm sm:text-base space-y-2.5 relative z-10"
        >
          <div className="flex justify-between border-b border-neutral-200 pb-2 font-bold text-neutral-800">
            <span>কাস্টমার নাম:</span>
            <span>{order.customerName}</span>
          </div>
          <div className="flex justify-between border-b border-neutral-200 pb-2 text-neutral-700">
            <span>মোবাইল:</span>
            <span className="font-mono font-bold">{order.customerPhone}</span>
          </div>
          <div className="border-b border-neutral-200 pb-2 text-neutral-700">
            <span className="font-semibold block mb-0.5">ঠিকানা:</span>
            <span className="text-neutral-800 break-words">{order.customerAddress}</span>
          </div>
          <div className="flex justify-between border-b border-neutral-200 pb-2 text-neutral-700">
            <span>সাইজ:</span>
            <span className="font-bold bg-neutral-200 px-2.5 py-0.5 rounded text-xs sm:text-sm">
              {order.size}
            </span>
          </div>
          <div className="border-b border-neutral-200 pb-2">
            <span className="font-semibold block mb-1.5 text-neutral-800">অর্ডারকৃত আইটেম:</span>
            <ul className="space-y-1.5 pl-1">
              {displayItems.map((item) => (
                <li key={item.id} className="text-xs sm:text-sm flex justify-between text-neutral-700">
                  <span>• {item.colorName || item.name} ({item.quantity} টি)</span>
                  <span className="font-semibold text-neutral-900">
                    {formatTaka(item.price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex justify-between items-center text-neutral-700 text-sm gap-2">
            <span className="shrink-0">ডেলিভারি এলাকা:</span>
            <span className={`text-right font-medium ${order.shippingCost === 0 ? 'text-emerald-700 font-bold' : ''}`}>
              {order.shippingCost === 0
                ? 'সারা বাংলাদেশ হোম ডেলিভারি একদম ফ্রী (০৳)'
                : order.shippingZone === 'inside_dhaka'
                ? `ঢাকার ভিতরে (${order.shippingCost || 80}৳)`
                : `ঢাকার বাইরে (${order.shippingCost || 150}৳)`}
            </span>
          </div>
          <div className="flex justify-between pt-2 text-lg sm:text-xl font-extrabold text-[#075f58] border-t-2 border-neutral-300">
            <span>সর্বমোট প্রদেয়:</span>
            <span>{formatTaka(order.total)}</span>
          </div>
          <div className="text-center text-xs text-neutral-500 pt-1 font-medium">
            (পণ্য হাতে পেয়ে মূল্য পরিশোধ করবেন - ক্যাশ অন ডেলিভারি)
          </div>
        </motion.div>

        {/* Back button */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.4 }}
          className="mt-4 relative z-10"
        >
          <button
            type="button"
            onClick={onBackToHome}
            className="w-full py-3 px-4 bg-[#075f58] hover:bg-[#064e48] text-white rounded-xl font-bold text-base shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
          >
            <ShoppingBag className="w-5 h-5" />
            <span>আরো কেনাকাটা করুন / পেজে ফিরে যান</span>
          </button>
        </motion.div>

        {/* Safety note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65, duration: 0.4 }}
          className="mt-4 pt-3 border-t border-neutral-200 flex items-center justify-center gap-1.5 text-xs text-neutral-500 text-center relative z-10"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Ferrari Jacket কালেকশন অর্ডার করার জন্য ধন্যবাদ!</span>
        </motion.div>
      </motion.div>
    </div>
  );
};
