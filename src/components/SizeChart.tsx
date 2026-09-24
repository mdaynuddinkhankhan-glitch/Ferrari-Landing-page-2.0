import React, { useState } from 'react';
import { Ruler, X } from 'lucide-react';
import defaultSizeChartImg from '../assets/images/ferrari_size_chart_1790260219878.jpg';

interface SizeChartProps {
  title?: string;
  subtitle?: string;
  image?: string;
  displayMode?: string;
  rows?: any[];
}

export const SizeChart: React.FC<SizeChartProps> = ({
  title = 'সাইজ চার্ট (Ferrari Jacket Size Chart)',
  subtitle = 'আপনার সঠিক মাপ দেখে নিচে অর্ডার ফর্মে সাইজ সিলেক্ট করুন (সব মাপ ইঞ্চিতে)',
  image,
}) => {
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const displayImage = image && image.trim() ? image : defaultSizeChartImg;

  return (
    <section className="mx-2 sm:mx-4 mb-6">
      {/* Title Header */}
      <div className="flex items-center justify-center gap-1.5 mb-1 text-center">
        <Ruler className="w-4 h-4 text-pink-400" />
        <h3 className="font-['Baloo_Da_2'] text-xl sm:text-2xl font-bold text-white">
          {title}
        </h3>
      </div>
      {subtitle && (
        <p className="text-center text-neutral-400 text-[11px] sm:text-xs mb-3">
          {subtitle}
        </p>
      )}

      {/* Pure Size Chart Image Display */}
      <div className="relative bg-neutral-900 rounded-xl sm:rounded-2xl overflow-hidden border border-neutral-700 shadow-xl max-w-2xl mx-auto group">
        <img
          src={displayImage}
          alt="Ferrari Jacket Size Chart"
          className="w-full h-auto object-contain cursor-zoom-in max-h-[520px] mx-auto transition-transform duration-200 group-hover:scale-[1.01]"
          onClick={() => setIsZoomOpen(true)}
          loading="lazy"
        />
      </div>

      {/* Lightbox / Zoom Modal */}
      {isZoomOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setIsZoomOpen(false)}
        >
          <div 
            className="relative max-w-4xl max-h-[95vh] w-full flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsZoomOpen(false)}
              className="absolute -top-11 right-0 sm:top-2 sm:right-2 w-10 h-10 bg-neutral-800/90 hover:bg-[#ff146b] text-white rounded-full flex items-center justify-center border border-white/20 transition-all cursor-pointer shadow-xl z-20 active:scale-90"
              title="বন্ধ করুন"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Enlarged Image */}
            <div className="overflow-auto max-h-[88vh] rounded-xl border border-neutral-700 shadow-2xl bg-neutral-900">
              <img
                src={displayImage}
                alt="Ferrari Jacket Size Chart Enlarged"
                className="max-h-[85vh] w-auto max-w-full object-contain mx-auto"
              />
            </div>

            <p className="text-neutral-400 text-xs mt-2 text-center">
              ট্যাপ করে বা বাইরে ক্লিক করে বন্ধ করুন
            </p>
          </div>
        </div>
      )}
    </section>
  );
};
