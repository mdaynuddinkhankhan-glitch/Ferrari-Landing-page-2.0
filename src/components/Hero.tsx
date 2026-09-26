import React, { useState, useEffect, useRef } from 'react';
import { DEFAULT_BANNER_IMG } from '../utils/defaultImages';
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
  bannerImg = DEFAULT_BANNER_IMG,
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
      <div className="bg-gradient-to-b from-black/90 via-[#990838] to-[#db1250] text-center mt-1 pt-2 pb-2.5 px-3 sm:px-4 text-white shadow-md overflow-hidden">
        <h2 className="text-lg sm:text-2xl md:text-[26px] font-extrabold leading-snug font-['Baloo_Da_2',sans-serif] tracking-wide text-white max-w-xl mx-auto">
          <span>{headline}</span>{' '}
          <span className="text-white drop-shadow-xs inline-block ml-2.5 sm:ml-4 pl-1.5 sm:pl-2 translate-x-1 sm:translate-x-0">
            {highlight}
          </span>
        </h2>
      </div>

      {/* Hero Showcase Banner / Smooth Horizontal Slider */}
      <div className="px-3 sm:px-4 mt-3 sm:mt-4">
        <div
          onClick={onOrderClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="relative mx-auto w-full max-w-[500px] rounded-xl sm:rounded-[20px] overflow-hidden border-2 border-[#ff146b]/40 shadow-[0_6px_25px_rgba(255,20,107,0.25)] group cursor-pointer bg-neutral-900 select-none"
        >
          {/* Horizontal Slide Track */}
          <div
            className="flex w-full transition-transform duration-700 ease-in-out will-change-transform"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {bannerList.map((bannerUrl, idx) => (
              <div key={idx} className="min-w-full w-full shrink-0">
                <img
                  src={bannerUrl || DEFAULT_BANNER_IMG}
                  alt={`Ferrari Jacket Collection Banner ${idx + 1}`}
                  className="w-full h-auto aspect-[16/11] sm:aspect-[16/10] object-cover block"
                  referrerPolicy="no-referrer"
                  loading={idx === 0 ? 'eager' : 'lazy'}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Animated Order Button Below Banner */}
      <div className="text-center my-4 sm:my-5 px-3">
        <AnimatedCtaButton
          onClick={onOrderClick || (() => {})}
          label={ctaButtonText || "🛍️ অর্ডার করতে চাই"}
          size="large"
        />
      </div>
    </section>
  );
};




