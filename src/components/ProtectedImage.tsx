import React, { useState } from 'react';
import { createDiagonalWatermarkSvg, showProtectionToast } from '../utils/imageProtection';

interface ProtectedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  watermarkText?: string;
  watermarkOpacity?: number; // 0.15 to 0.25
  showWatermark?: boolean;
  showCenterSeal?: boolean;
  wrapperClassName?: string;
  enableShield?: boolean;
}

export const ProtectedImage: React.FC<ProtectedImageProps> = ({
  src,
  alt = 'Porshibari.shop Product Image',
  watermarkText = 'Porshibari.shop',
  watermarkOpacity = 0.20,
  showWatermark = true,
  showCenterSeal = true,
  wrapperClassName = '',
  className = '',
  enableShield = true,
  loading = 'lazy',
  ...restProps
}) => {
  const [isLoaded, setIsLoaded] = useState(false);

  // Generate SVG diagonal watermark background URI
  const watermarkSvgUrl = createDiagonalWatermarkSvg(watermarkText, watermarkOpacity);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    showProtectionToast(`⚠️ এই ছবিটি ${watermarkText} এর স্বত্বাধিকার সংরক্ষিত`);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.preventDefault();
    return false;
  };

  return (
    <div
      className={`relative overflow-hidden select-none pb-protected-container ${wrapperClassName}`}
      onContextMenu={handleContextMenu}
      style={{ WebkitUserSelect: 'none', userSelect: 'none' }}
    >
      {/* Underlying original image (100% original quality preserved) */}
      <img
        src={src}
        alt={alt}
        loading={loading}
        draggable={false}
        onDragStart={handleDragStart}
        onContextMenu={handleContextMenu}
        onLoad={() => setIsLoaded(true)}
        className={`block transition-all duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-90'
        } ${className}`}
        style={
          {
            WebkitUserDrag: 'none',
            userSelect: 'none',
            pointerEvents: 'auto',
          } as React.CSSProperties
        }
        {...restProps}
      />

      {/* Repeating Diagonal Watermark Grid (15-25% opacity) */}
      {showWatermark && (
        <div
          className="absolute inset-0 z-20 pointer-events-none pb-watermark-overlay"
          aria-hidden="true"
          style={{
            backgroundImage: `url("${watermarkSvgUrl}")`,
            backgroundRepeat: 'repeat',
            backgroundSize: '280px 180px',
            opacity: 1,
          }}
        />
      )}

      {/* Subtle Central/Corner Brand Badge for extra screenshot protection */}
      {showWatermark && showCenterSeal && (
        <div
          className="absolute bottom-2.5 right-2.5 z-25 pointer-events-none flex items-center gap-1 px-2 py-0.5 rounded bg-black/40 backdrop-blur-xs border border-white/20 shadow-sm"
          style={{ opacity: Math.min(0.75, watermarkOpacity * 2.8) }}
          aria-hidden="true"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#ff146b] animate-pulse" />
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/95 drop-shadow-sm font-sans">
            {watermarkText}
          </span>
        </div>
      )}

      {/* Transparent Protective Shield Layer */}
      {enableShield && (
        <div
          className="absolute inset-0 z-15 bg-transparent pointer-events-none pb-image-shield"
          aria-hidden="true"
          onContextMenu={handleContextMenu}
          onDragStart={handleDragStart}
        />
      )}
    </div>
  );
};
