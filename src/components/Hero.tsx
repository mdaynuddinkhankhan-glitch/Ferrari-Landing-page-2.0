import React, { useState, useEffect, useRef } from 'react';
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
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);

  // Auto slide every 3.5 seconds: current slides left, next slides in from right
  useEffect(() => {
    if (bannerList.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % bannerList.length);
    }, 3500);

    return () => clearInterval(interval);
  }, [bannerList.length]);

  // Touch Swipe Handlers for mobile gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchEndXRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartXRef.current === null || touchEndXRef.current === null) return;
    const diff = touchStartXRef.current - touchEndXRef.current;
    const swipeThreshold = 45; // Minimum px distance for swipe gesture

    if (diff > swipeThreshold) {
      // Swiped Left -> Next banner (slides from right to left)
      setCurrentIndex((prev) => (prev + 1) % bannerList.length);
    } else if (diff < -swipeThreshold) {
      // Swiped Right -> Previous banner
      setCurrentIndex((prev) => (prev - 1 + bannerList.length) % bannerList.length);
    }

    touchStartXRef.current = null;
    touchEndXRef.current = null;
  };

  return (
    <section className="relative mb-3">
      {/* Top Hero Text Header */}
      <div className="bg-gradient-to-b from-black/90 via-[#990838] to-[#db1250] text-center mt-2.5 pt-3 pb-3.5 px-4 text-white shadow-md">
        <h2 className="text-2xl sm:text-3xl md:text-[32px] font-extrabold leading-snug font-['Baloo_Da_2',sans-serif] tracking-wide">
          {headline} <span className="text-yellow-300 drop-shadow-xs">{highlight}</span>
        </h2>
      </div>

      {/* Hero Showcase Banner / Smooth Horizontal Slider */}
      <div className="px-3 sm:px-4 mt-5 sm:mt-6">
        <div
          onClick={onOrderClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="relative mx-auto w-[94%] max-w-[540px] rounded-[20px] overflow-hidden border-2 border-[#ff146b]/40 shadow-[0_8px_30px_rgba(255,20,107,0.25)] group cursor-pointer bg-neutral-900 select-none"
        >
          {/* Horizontal Slide Track */}
          <div
            className="flex w-full transition-transform duration-700 ease-in-out will-change-transform"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {bannerList.map((bannerUrl, idx) => (
              <div key={idx} className="min-w-full w-full shrink-0">
                <img
                  src={bannerUrl || defaultBannerImg}
                  alt={`Ferrari Jacket Collection Banner ${idx + 1}`}
                  className="w-full h-auto aspect-[4/3] sm:aspect-[16/10] object-cover block"
                  referrerPolicy="no-referrer"
                  loading={idx === 0 ? 'eager' : 'lazy'}
                />
              </div>
            ))}
          </div>
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




