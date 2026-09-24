import React, { useState } from 'react';
import { PRODUCTS } from '../data/products';
import { ShirtColorId, ShirtProduct } from '../types';
import { Check, Plus, Minus } from 'lucide-react';
import { trackAddToCart } from '../utils/pixelTracking';

interface ColorSelectionProps {
  products?: ShirtProduct[];
  title?: string;
  subtitle?: string;
  selectedColors: Record<ShirtColorId, boolean>;
  colorQuantities: Record<ShirtColorId, number>;
  onToggleColor: (colorId: ShirtColorId) => void;
  onUpdateQuantity: (colorId: ShirtColorId, delta: number) => void;
}

export const ColorSelection: React.FC<ColorSelectionProps> = ({
  products = PRODUCTS,
  title = 'অর্ডার করার জন্য কালার সিলেক্ট করুন',
  subtitle = '(নিচে টিক চিহ্ন দিয়ে কালার সিলেক্ট করুন, প্রয়োজন হলে পরিমাণ বাড়াতে পারেন)',
  selectedColors,
  colorQuantities,
  onToggleColor,
  onUpdateQuantity,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleCardClick = (colorId: ShirtColorId) => {
    // Show full-screen blur and rotating white dot spinner like WooCommerce
    setIsUpdating(true);
    onToggleColor(colorId);

    const product = products.find((p) => p.id === colorId);
    if (product) {
      trackAddToCart(product.name, product.price, colorQuantities[colorId] || 1);
    }

    setTimeout(() => {
      setIsUpdating(false);
    }, 450);
  };

  const handleQuantityClick = (e: React.MouseEvent, colorId: ShirtColorId, delta: number) => {
    e.stopPropagation();
    setIsUpdating(true);
    onUpdateQuantity(colorId, delta);

    const product = products.find((p) => p.id === colorId);
    if (product && delta > 0) {
      trackAddToCart(product.name, product.price, delta);
    }

    setTimeout(() => {
      setIsUpdating(false);
    }, 400);
  };

  return (
    <section id="colorSection" className="bg-[#fff8f6] text-[#075f58] py-7 px-3 sm:px-5 scroll-mt-6 relative">
      {/* Full-screen Blur & Rotating White Dot Spinner matching the user's screenshot */}
      {isUpdating && (
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

      <h2 className="text-center font-['Baloo_Da_2'] text-xl sm:text-2xl font-bold mb-1.5">
        {title}
      </h2>
      <p className="text-center text-xs sm:text-sm text-[#075f58]/80 mb-5">
        {subtitle}
      </p>

      <div className="flex flex-col gap-3 max-w-lg mx-auto">
        {products.map((product) => {
          const isSelected = !!selectedColors[product.id];
          const quantity = colorQuantities[product.id] || 1;

          return (
            <div
              key={product.id}
              onClick={() => handleCardClick(product.id)}
              className={`relative bg-white rounded-xl p-3 sm:p-3.5 flex items-center gap-3 sm:gap-3.5 cursor-pointer transition-all duration-150 border select-none shadow-xs ${
                isSelected
                  ? 'border-[#075f58] ring-1 ring-[#075f58]/30 bg-emerald-50/20'
                  : 'border-neutral-200 hover:border-neutral-300'
              }`}
            >
              {/* Checkbox matching the screenshot */}
              <div
                className={`w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors border ${
                  isSelected
                    ? 'bg-[#075f58] border-[#075f58] text-white'
                    : 'bg-white border-neutral-300'
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>

              {/* Thumbnail Image */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-md overflow-hidden shrink-0 border border-neutral-200 bg-neutral-100">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Product Color & Price Info */}
              <div className="flex-1 min-w-0">
                <div className="text-[#075f58] font-bold text-sm sm:text-base leading-tight flex items-center gap-1.5 flex-wrap">
                  <span>{product.colorName}</span>
                  <span className="text-emerald-800 font-semibold text-xs sm:text-sm">
                    × {quantity}
                  </span>
                </div>
                <div className="text-[#075f58] font-semibold text-xs sm:text-sm mt-0.5">
                  {(Number(product.price) || 0).toLocaleString('en-US')}.00৳
                </div>
              </div>

              {/* Quantity Adjuster if selected */}
              {isSelected && (
                <div
                  className="flex items-center gap-1.5 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={(e) => handleQuantityClick(e, product.id, -1)}
                    className="w-6 h-6 rounded-full bg-neutral-200 hover:bg-neutral-300 text-neutral-800 flex items-center justify-center font-bold text-xs cursor-pointer active:scale-95 transition-all"
                    title="কমান"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="font-bold text-sm text-[#075f58] px-1 min-w-4 text-center">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleQuantityClick(e, product.id, 1)}
                    className="w-6 h-6 rounded-full bg-[#075f58] hover:bg-[#064e48] text-white flex items-center justify-center font-bold text-xs cursor-pointer active:scale-95 transition-all"
                    title="বাড়ান"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
