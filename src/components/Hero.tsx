import React, { useState, useEffect } from 'react';
import defaultBannerImg from '../assets/images/porshibari_collection_banner_1788721457342.jpg';
import { AnimatedCtaButton } from './AnimatedCtaButton';

interface HeroProps {
  headline?: string;
  highlight?: string;
  bannerImg?: string;
  banners?: string[];
  ctaButtonText?: string;
  onOrderClick?: () => void;
}

export const Hero: React.FC<HeroProps> = ({ 
  headline = 'প্রিমিয়াম লাক্সারি',
  highlight = 'Ferrari Jacket কালেকশন',
  bannerImg = defaultBannerImg,
  banners,
  ctaButtonText = '🛍️ অর্ডার করতে চাই',
  onOrderClick 
}) => {
  // Use banners list or fallback to single banner
  const bannerList = banners && banners.length > 0 ? banners : [bannerImg];
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto slide every 4 seconds if there are multiple banners
  useEffect(() => {
    if (bannerList.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % bannerList.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [bannerList.length]);

  const currentImage = bannerList[currentIndex] || bannerList[0] || defaultBannerImg;

  return (
    <section className="relative mb-3">
      {/* Top Hero Text Header */}
      <div className="bg-gradient-to-b from-black/90 via-[#990838] to-[#db1250] text-center mt-2.5 pt-3 pb-3.5 px-4 text-white shadow-md">
        <h2 className="text-2xl sm:text-3xl md:text-[32px] font-extrabold leading-snug font-['Baloo_Da_2',sans-serif] tracking-wide">
          {headline} <span className="text-yellow-300 drop-shadow-xs">{highlight}</span>
        </h2>
      </div>

      {/* Hero Showcase Banner / Slider */}
      <div className="px-3 sm:px-4 mt-5 sm:mt-6">
        <div
          onClick={onOrderClick}
          className="relative mx-auto w-[94%] max-w-[540px] rounded-[20px] overflow-hidden border-2 border-[#ff146b]/40 shadow-[0_8px_30px_rgba(255,20,107,0.25)] group cursor-pointer bg-neutral-900 select-none"
        >
          {/* Banner Image */}
          <img
            key={currentIndex}
            src={currentImage}
            alt={`Ferrari Jacket Collection Banner ${currentIndex + 1}`}
            className="w-full h-auto aspect-[4/3] sm:aspect-[16/10] object-cover transition-all duration-700 block animate-fadeIn"
            referrerPolicy="no-referrer"
          />

          {/* Dot Indicators if multiple banners */}
          {bannerList.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10 bg-black/50 px-2.5 py-1 rounded-full backdrop-blur-xs border border-white/20">
              {bannerList.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(idx);
                  }}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    currentIndex === idx ? 'w-5 bg-[#ff146b]' : 'w-2 bg-white/60 hover:bg-white'
                  }`}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Animated Order Button Below Banner */}
      <div className="text-center mt-3.5 px-3">
        <AnimatedCtaButton
          onClick={onOrderClick || (() => {})}
          label={ctaButtonText || "🛍️ অর্ডার করতে চাই"}
          size="large"
        />
      </div>
    </section>
  );
};



