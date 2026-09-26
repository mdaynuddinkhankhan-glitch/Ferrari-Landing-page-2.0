import React from 'react';
import { Sparkles, Clock } from 'lucide-react';

interface InfoSectionProps {
  badge?: string;
  description?: string;
  urgencyText?: string;
}

export const InfoSection: React.FC<InfoSectionProps> = ({
  badge = 'প্রিমিয়াম উইন্ডপ্রুফ ফেব্রিক ও নিখুঁত ফিনিশিং',
  description = 'এই প্রিমিয়াম Ferrari Jacket টি শুধু পোশাক নয়, এটি আপনার স্পোর্টি এবং স্টাইলিশ ব্যক্তিত্বের প্রতিচ্ছবি। বাতাস ও ঠাণ্ডা প্রতিরোধক উন্নত উইন্ডপ্রুফ ফেব্রিকে তৈরি, টেকসই প্রিমিয়াম জিপার এবং আইকনিক ফেরারি লোগো সমৃদ্ধ।',
  urgencyText = 'সীমিত স্টক! তাই আজই অর্ডার করুন।',
}) => {
  return (
    <section className="mx-3 sm:mx-5 mt-2 sm:mt-3 mb-6 sm:mb-8 p-4 sm:p-7 rounded-xl sm:rounded-2xl bg-gradient-to-b from-[#26000b] via-[#61011d] to-[#ed1957] text-center shadow-lg border border-pink-500/30">
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 text-amber-300 text-xs sm:text-sm font-semibold mb-3">
        <Sparkles className="w-3.5 h-3.5 shrink-0" />
        <span className="leading-tight">{badge}</span>
      </div>

      <p className="text-base sm:text-lg md:text-xl font-semibold leading-relaxed text-white/95 max-w-xl mx-auto">
        {description}
      </p>

      <div className="mt-4 sm:mt-5 inline-flex items-center gap-2 bg-yellow-400 text-black px-3.5 sm:px-4 py-1.5 rounded-full font-bold text-xs sm:text-sm md:text-base shadow">
        <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-bounce shrink-0" />
        <span>{urgencyText}</span>
      </div>
    </section>
  );
};

