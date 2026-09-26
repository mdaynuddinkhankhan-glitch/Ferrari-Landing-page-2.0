import React from 'react';
import { Check } from 'lucide-react';

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
  sizes = 'Size: M, L, XL, XXL, 3XL',
  colors = 'Color : Black, White, Red',
  highlightHeadline = `বাংলাদেশের এই প্রথম
আমরাই নিয়ে আসছি এই
ভাইরাল এবং প্রিমিয়াম
Ferrari Jacket টি।`,
}) => {
  return (
    <section className="mx-auto w-full max-w-[380px] sm:max-w-[440px] px-3 sm:px-0 mb-5 sm:mb-6">
      {/* Maroon / Crimson Feature Card */}
      <div className="p-4 sm:p-6 bg-gradient-to-b from-[#59021a] via-[#730424] to-[#8c052d] border-2 border-white/70 rounded-xl sm:rounded-[22px] shadow-2xl">
        <div className="space-y-3 sm:space-y-3.5">
          {/* Row 1: Delivery Time */}
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-[#8ee000] flex items-center justify-center shrink-0 shadow-xs">
              <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black stroke-[3.5]" />
            </div>
            <span className="text-white text-base sm:text-lg md:text-xl font-bold font-['Baloo_Da_2',sans-serif] tracking-wide">
              {deliveryTime}
            </span>
          </div>

          <div className="border-t border-white/30" />

          {/* Row 2: Size */}
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-[#8ee000] flex items-center justify-center shrink-0 shadow-xs">
              <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black stroke-[3.5]" />
            </div>
            <span className="text-white text-base sm:text-lg md:text-xl font-bold font-['Baloo_Da_2',sans-serif] tracking-wide">
              {sizes}
            </span>
          </div>

          <div className="border-t border-white/30" />

          {/* Row 3: Color */}
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-[#8ee000] flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 shadow-xs">
              <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black stroke-[3.5]" />
            </div>
            <span className="text-white text-sm sm:text-base md:text-lg font-bold font-['Baloo_Da_2',sans-serif] tracking-wide leading-relaxed">
              {colors}
            </span>
          </div>

          <div className="border-t border-white/30" />

          {/* Row 4: Viral & Trending Headline */}
          <div className="flex items-start gap-3 pt-0.5">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-[#8ee000] flex items-center justify-center shrink-0 mt-1 shadow-xs">
              <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black stroke-[3.5]" />
            </div>
            <div className="text-white font-extrabold text-lg sm:text-xl md:text-2xl leading-snug sm:leading-relaxed font-['Baloo_Da_2',sans-serif] whitespace-pre-line tracking-wide">
              {highlightHeadline}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
