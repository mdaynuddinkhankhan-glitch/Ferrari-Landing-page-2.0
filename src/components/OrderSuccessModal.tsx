import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OrderConfirmation, ShirtProduct } from '../types';
import { PRODUCTS } from '../data/products';
import { formatTaka } from '../utils/bengali';
import { getStoredSettings } from '../utils/siteSettings';
import { CheckCircle2, X, ShieldCheck, Sparkles } from 'lucide-react';
import { CelebrationConfetti } from './CelebrationConfetti';

interface OrderSuccessModalProps {
  order: OrderConfirmation | null;
  products?: ShirtProduct[];
  onClose: () => void;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({ order, products, onClose }) => {
  if (!order) return null;

  const currentProducts = products || getStoredSettings().products || PRODUCTS;

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

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 text-neutral-900 shadow-2xl border-4 border-emerald-500 max-h-[92vh] overflow-y-auto"
        >
          {/* Subtle Celebration Confetti */}
          <CelebrationConfetti />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 p-1.5 rounded-full hover:bg-neutral-100 transition-colors z-20 cursor-pointer"
            title="বন্ধ করুন"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Success Header */}
          <div className="text-center pb-4 border-b border-neutral-200 relative z-10">
            {/* Animated checkmark badge */}
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
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ delay: 0.35, duration: 0.4 }}
                className="absolute -top-1 -right-1 bg-amber-400 text-amber-950 p-1 rounded-full shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
              </motion.div>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl sm:text-3xl font-bold font-['Baloo_Da_2'] text-emerald-800"
            >
              অর্ডার সফল হয়েছে!
            </motion.h2>
            <p className="text-sm sm:text-base text-neutral-600 mt-1 font-medium">
              ধন্যবাদ! আপনার অর্ডারটি আমরা গ্রহণ করেছি। খুব শীঘ্রই আমাদের প্রতিনিধি আপনাকে কল করে নিশ্চিত করবেন।
            </p>

            <div className="inline-block bg-neutral-100 text-neutral-800 px-3.5 py-1 rounded-full text-xs sm:text-sm font-mono font-bold mt-2.5 border border-neutral-300">
              অর্ডার আইডি: <span className="text-[#ff0870] font-extrabold">{order.orderId}</span>
            </div>
          </div>

          {/* Order Details Preview */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className="my-5 bg-neutral-50 rounded-2xl p-4 border border-neutral-200 text-sm sm:text-base space-y-2 relative z-10"
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
              <span className="font-bold bg-neutral-200 px-2 py-0.5 rounded text-xs sm:text-sm">
                {order.size}
              </span>
            </div>
            <div className="border-b border-neutral-200 pb-2">
              <span className="font-semibold block mb-1 text-neutral-800">অর্ডারকৃত আইটেম:</span>
              <ul className="space-y-1 pl-1">
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
            <div className="flex justify-between pt-2 text-base sm:text-lg font-extrabold text-[#075f58] border-t border-neutral-300">
              <span>সর্বমোট প্রদেয়:</span>
              <span>{formatTaka(order.total)}</span>
            </div>
            <div className="text-center text-xs text-neutral-500 pt-1 font-medium">
              (পণ্য হাতে পেয়ে মূল্য পরিশোধ করবেন - ক্যাশ অন ডেলিভারি)
            </div>
          </motion.div>

          {/* Close/Ok button */}
          <div className="mt-4 relative z-10">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm sm:text-base shadow transition-colors cursor-pointer"
            >
              ঠিক আছে, ধন্যবাদ
            </button>
          </div>

          {/* Safety note */}
          <div className="mt-4 pt-3 border-t border-neutral-200 flex items-center justify-center gap-1.5 text-xs text-neutral-500 text-center relative z-10">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Ferrari Jacket কালেকশন অর্ডার করার জন্য ধন্যবাদ!</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
