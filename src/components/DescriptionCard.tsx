import React from 'react';
import { Check } from 'lucide-react';
import { AnimatedCtaButton } from './AnimatedCtaButton';

interface DescriptionCardProps {
  deliveryTime?: string;
  sizes?: string;
  colors?: string;
  highlightHeadline?: string;
  ctaButtonText?: string;
  onOrderClick?: () => void;
}

export const DescriptionCard: React.FC<DescriptionCardProps> = ({
  deliveryTime = 'Delivery Time: 3-7 দিন',
  sizes = 'Size: M, L, XL, XXL, 3XL, 4XL',
  colors = 'Color : Black, White, Red',
  highlightHeadline = `বাংলাদেশের এই প্রথম
আমরাই নিয়ে আসছি এই
ভাইরাল এবং প্রিমিয়াম
Ferrari Jacket টি।`,
  ctaButtonText = '🛍️ অর্ডার করতে চাই',
  onOrderClick,
}) => {
  return (
    <section className="mx-4 sm:mx-5 mb-8">
      {/* Maroon / Crimson Feature Card */}
      <div className="p-5 sm:p-7 bg-gradient-to-b from-[#59021a] via-[#730424] to-[#8c052d] border-2 border-white/70 rounded-2xl sm:rounded-[22px] shadow-2xl">
        <div className="space-y-4">
          {/* Row 1: Delivery Time */}
          <div className="flex items-center gap-3.5">
            <div className="w-6 h-6 rounded-md bg-[#8ee000] flex items-center justify-center shrink-0 shadow-xs">
              <Check className="w-4 h-4 text-black stroke-[3.5]" />
            </div>
            <span className="text-white text-lg sm:text-xl font-bold font-['Baloo_Da_2',sans-serif] tracking-wide">
              {deliveryTime}
            </span>
          </div>

          <div className="border-t border-white/30" />

          {/* Row 2: Size */}
          <div className="flex items-center gap-3.5">
            <div className="w-6 h-6 rounded-md bg-[#8ee000] flex items-center justify-center shrink-0 shadow-xs">
              <Check className="w-4 h-4 text-black stroke-[3.5]" />
            </div>
            <span className="text-white text-lg sm:text-xl font-bold font-['Baloo_Da_2',sans-serif] tracking-wide">
              {sizes}
            </span>
          </div>

          <div className="border-t border-white/30" />

          {/* Row 3: Color */}
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-6 h-6 rounded-md bg-[#8ee000] flex items-center justify-center shrink-0 mt-1 sm:mt-0 shadow-xs">
              <Check className="w-4 h-4 text-black stroke-[3.5]" />
            </div>
            <span className="text-white text-base sm:text-lg font-bold font-['Baloo_Da_2',sans-serif] tracking-wide leading-relaxed">
              {colors}
            </span>
          </div>

          <div className="border-t border-white/30" />

          {/* Row 4: Viral & Trending Headline */}
          <div className="flex items-start gap-3.5 pt-1">
            <div className="w-6 h-6 rounded-md bg-[#8ee000] flex items-center justify-center shrink-0 mt-1.5 shadow-xs">
              <Check className="w-4 h-4 text-black stroke-[3.5]" />
            </div>
            <div className="text-white font-extrabold text-xl sm:text-2xl leading-snug sm:leading-relaxed font-['Baloo_Da_2',sans-serif] whitespace-pre-line tracking-wide">
              {highlightHeadline}
            </div>
          </div>
        </div>
      </div>

      {/* Dotted Animated Order Button Below Card */}
      <div className="text-center mt-5">
        <AnimatedCtaButton
          onClick={onOrderClick || (() => {})}
          label={ctaButtonText || "🛍️ অর্ডার করতে চাই"}
          size="large"
        />
      </div>
    </section>
  );
};
