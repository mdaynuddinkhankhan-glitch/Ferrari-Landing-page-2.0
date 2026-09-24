import React from 'react';
import { WHATSAPP_NUMBER, DISPLAY_PHONE } from '../data/products';
import { ShieldCheck, MessageCircle } from 'lucide-react';

interface FooterProps {
  whatsappNumber?: string;
  displayPhone?: string;
  tagline?: string;
  brandName?: string;
  trustText?: string;
  copyrightText?: string;
}

export const Footer: React.FC<FooterProps> = ({
  whatsappNumber = WHATSAPP_NUMBER,
  displayPhone = DISPLAY_PHONE,
  tagline = 'সরাসরি Ferrari Jacket অর্ডার করতে হোয়াটসঅ্যাপে মেসেজ করুন',
  brandName = 'Ferrari Racing House',
  trustText = '১০০% অথেনটিক Ferrari Jacket নিশ্চয়তা',
  copyrightText = 'সর্বস্বত্ব সংরক্ষিত।',
}) => {
  return (
    <footer className="bg-gradient-to-b from-[#f51b58] to-[#ed1a56] text-white py-2.5 sm:py-3 px-3 sm:px-5 text-center border-t border-pink-400/40">
      <h2 className="text-sm sm:text-base font-bold leading-tight mb-2 font-['Baloo_Da_2']">
        {tagline}
      </h2>

      {/* WhatsApp Button with genuine WhatsApp messaging icon */}
      <div className="max-w-xs mx-auto">
        <a
          href={`https://wa.me/${whatsappNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 w-full py-2 px-4 rounded-xl bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white text-sm sm:text-base font-extrabold shadow-[0_4px_12px_rgba(37,211,102,0.35)] hover:brightness-105 active:scale-[0.98] transition-all duration-150"
        >
          {/* Official WhatsApp Chat Bubble Icon from Lucide */}
          <MessageCircle className="w-5 h-5 fill-white text-[#128C7E] shrink-0" />
          <span>WhatsApp {displayPhone}</span>
        </a>
      </div>

      {/* Trust & Copyright - Ultra compact row */}
      <div className="mt-2 pt-1.5 border-t border-white/20 text-[10px] sm:text-[11px] text-pink-100 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5">
        <div className="inline-flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-emerald-300 shrink-0" />
          <span>{trustText}</span>
        </div>
        <span className="hidden sm:inline opacity-70">•</span>
        <span>{brandName} © 2026. {copyrightText}</span>
      </div>
    </footer>
  );
};

