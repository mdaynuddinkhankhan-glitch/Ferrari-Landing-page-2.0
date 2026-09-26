import React, { useRef, useState, useEffect } from 'react';

interface AnimatedCtaButtonProps {
  onClick: () => void;
  label?: string;
  icon?: React.ReactNode;
  className?: string;
  id?: string;
  size?: 'normal' | 'large';
}

export const AnimatedCtaButton: React.FC<AnimatedCtaButtonProps> = ({
  onClick,
  label = '🛍️ অর্ডার করতে চাই',
  icon,
  className = '',
  id,
  size = 'large',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        }
      },
      { threshold: 0.12 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  const sizeClasses =
    size === 'large'
      ? 'w-auto max-w-full px-6 sm:px-8 py-2.5 sm:py-3 text-base sm:text-lg md:text-xl font-bold'
      : 'w-auto max-w-full px-5 sm:px-7 py-2 sm:py-2.5 text-sm sm:text-base md:text-lg font-bold';

  return (
    <div
      ref={containerRef}
      className={`transition-all duration-700 ease-out px-2 ${
        isInView ? 'order-submit-entrance' : 'opacity-0 translate-y-6 scale-95'
      } ${className}`}
    >
      <button
        id={id}
        type="button"
        onClick={onClick}
        className={`group relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-full border-2 sm:border-[3px] border-dotted border-white bg-gradient-to-b from-[#ff176d] to-[#e60055] text-white shadow-[0_4px_20px_rgba(230,0,85,0.4)] cta-order-pulse hover:brightness-110 hover:scale-[1.02] active:scale-95 transition-all duration-200 cursor-pointer min-h-[44px] ${sizeClasses}`}
      >
        {/* Glossy shimmer sweep effect identical to Order Confirm button */}
        <span className="order-submit-shimmer" aria-hidden="true" />

        <span className="relative z-10 flex items-center justify-center gap-2 drop-shadow-sm font-['Baloo_Da_2',sans-serif]">
          {icon ? icon : null}
          <span>{label}</span>
        </span>
      </button>
    </div>
  );
};
