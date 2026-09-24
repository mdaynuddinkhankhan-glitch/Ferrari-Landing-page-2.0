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
    <article className="pt-6 pb-12 px-4 sm:px-6 text-center border-b border-neutral-900 last:border-b-0">
      {/* Product Image */}
      <div className="relative mx-auto w-[94%] max-w-[540px] group">
        <div className="overflow-hidden rounded-[22px] border-4 border-white shadow-[0_10px_30px_rgba(0,0,0,0.8)] bg-neutral-900">
          <img
            src={product.image}
            alt={product.altText}
            className="w-full h-auto max-h-[620px] object-cover object-top transition-transform duration-500 group-hover:scale-105"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
        </div>

        {/* Color Badge */}
        <div className="absolute top-4 left-4 bg-black/75 backdrop-blur-md text-white text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-full border border-white/20 flex items-center gap-1.5 shadow-md">
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span>{badgeText}</span>
        </div>
      </div>

      {/* Product Name */}
      <h3 className="font-['Baloo_Da_2'] text-3xl sm:text-4xl font-bold mt-5 text-white tracking-wide">
        {product.name}
      </h3>

      {/* Old Price */}
      <div className="text-xl sm:text-2xl font-semibold text-neutral-300 mt-2">
        পূর্বের মূল্য <s className="text-red-400 font-bold decoration-red-500 decoration-2">{toBengaliNumber(product.originalPrice ?? 0)}/-</s> টাকা
      </div>

      {/* Offer Price */}
      <div className="text-2xl sm:text-3xl md:text-[32px] font-bold text-emerald-400 mt-1.5 leading-tight">
        <span className="text-white text-xl sm:text-2xl block font-semibold">আজকের অফার মূল্য মাত্র</span>
        <span className="text-yellow-300 font-extrabold">{toBengaliNumber(product.price ?? 0)}/- টাকা</span>
      </div>

      {/* CTA Order Button with Entrance & Shimmer Animation */}
      <div className="mt-5">
        <AnimatedCtaButton
          onClick={() => onSelectColor(product.id)}
          label="🛍️ অর্ডার করতে চাই"
          size="large"
        />
      </div>
    </article>
  );
};

