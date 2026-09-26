import React from 'react';
import { ShirtProduct } from '../types';
import { toBengaliNumber } from '../utils/bengali';
import { Star } from 'lucide-react';
import { AnimatedCtaButton } from './AnimatedCtaButton';

interface ProductCardProps {
  product: ShirtProduct;
  onSelectColor: (colorId: ShirtProduct['id']) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelectColor }) => {
  const badgeText = product.banglaName?.includes('কালা')
    ? 'Black'
    : (product.banglaName || product.name);

  return (
    <article className="pt-4 pb-8 sm:pt-6 sm:pb-10 px-4 sm:px-6 text-center border-b border-neutral-900 last:border-b-0">
      {/* Product Image */}
      <div className="relative mx-auto w-full max-w-[380px] sm:max-w-[440px] group">
        <div className="overflow-hidden rounded-xl sm:rounded-[22px] border-2 sm:border-4 border-white shadow-[0_8px_25px_rgba(0,0,0,0.8)] bg-neutral-900">
          <img
            src={product.image}
            alt={product.altText}
            className="w-full h-auto object-cover object-top transition-transform duration-500 group-hover:scale-105"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
        </div>

        {/* Color Badge */}
        <div className="absolute top-3 left-3 sm:top-4 sm:left-4 bg-black/75 backdrop-blur-md text-white text-xs sm:text-sm font-semibold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border border-white/20 flex items-center gap-1.5 shadow-md">
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span>{badgeText}</span>
        </div>
      </div>

      {/* Product Name */}
      <h3 className="font-['Baloo_Da_2'] text-2xl sm:text-3xl font-bold mt-4 sm:mt-5 text-white tracking-wide">
        {product.name}
      </h3>

      {/* Old Price */}
      <div className="text-base sm:text-xl font-semibold text-neutral-300 mt-1.5 sm:mt-2">
        পূর্বের মূল্য <s className="text-red-400 font-bold decoration-red-500 decoration-2">{toBengaliNumber(product.originalPrice ?? 0)}/-</s> টাকা
      </div>

      {/* Offer Price */}
      <div className="text-xl sm:text-2xl md:text-[28px] font-bold text-emerald-400 mt-1 leading-tight">
        <span className="text-white text-base sm:text-xl block font-semibold">আজকের অফার মূল্য মাত্র</span>
        <span className="text-yellow-300 font-extrabold">{toBengaliNumber(product.price ?? 0)}/- টাকা</span>
      </div>

      {/* CTA Order Button with Entrance & Shimmer Animation */}
      <div className="mt-4 sm:mt-5">
        <AnimatedCtaButton
          onClick={() => onSelectColor(product.id)}
          label="🛍️ অর্ডার করতে চাই"
          size="large"
        />
      </div>
    </article>
  );
};

