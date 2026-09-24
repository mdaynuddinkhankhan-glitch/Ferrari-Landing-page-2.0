import React, { useRef } from 'react';

interface HeaderProps {
  brandNamePart1?: string;
  brandNamePart2?: string;
  onAdminTrigger?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  brandNamePart1 = 'Porshibari', 
  brandNamePart2 = 'Fashion House', 
  onAdminTrigger 
}) => {
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleNameClick = () => {
    clickCountRef.current += 1;

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }

    if (clickCountRef.current >= 10) {
      clickCountRef.current = 0;
      if (onAdminTrigger) {
        onAdminTrigger();
      } else {
        try {
          window.history.pushState({}, '', '/admin');
          window.dispatchEvent(new PopStateEvent('popstate'));
        } catch {
          window.location.hash = '#/admin';
        }
      }
      return;
    }

    // Reset counter if no click within 4 seconds
    clickTimerRef.current = setTimeout(() => {
      clickCountRef.current = 0;
    }, 4000);
  };

  return (
    <header className="text-center pt-2 pb-0.5 px-4 bg-black select-none">
      <div
        onClick={handleNameClick}
        className="inline-block cursor-pointer active:opacity-90 transition-opacity"
        title={`${brandNamePart1} ${brandNamePart2}`}
      >
        <h1 className="text-[#ff146b] font-sans text-2xl sm:text-[28px] font-bold tracking-normal leading-none">
          {brandNamePart1}
          <span className="block text-2xl sm:text-[28px] text-[#ff146b] font-bold tracking-normal leading-none mt-0.5">
            {brandNamePart2}
          </span>
        </h1>
      </div>
    </header>
  );
};
