import React from 'react';
import { AlertCircle, ShieldCheck } from 'lucide-react';

interface CommitmentCardProps {
  badge?: string;
  description?: string;
  pillText?: string;
}

export const CommitmentCard: React.FC<CommitmentCardProps> = ({
  badge = '⚠️ বিশেষ বিনীত অনুরোধ',
  description = 'দয়া করে কেউ ফেইক বা অপ্রয়োজনীয় অর্ডার করবেন না। আপনার একটি ফেক অর্ডারের কারণে ডেলিভারি চার্জ ও প্যাকিংয়ে আমাদের আর্থিক ক্ষতি হয়। পণ্যটি ১০০% পছন্দ হলে এবং ডেলিভারি নেওয়ার নিশ্চয়তা থাকলেই অর্ডার করুন। আমরা সর্বোচ্চ আন্তরিকতার সাথে ১০০% কোয়ালিটি পণ্য পৌঁছে দেওয়ার প্রতিশ্রুতি দিচ্ছি।',
  pillText = '🤝 পার্সেল খুলে চেক করে নেওয়ার নিশ্চয়তা',
}) => {
  return (
    <section className="mx-4 sm:mx-5 my-8 p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-[#26000b] via-[#61011d] to-[#ed1957] text-center shadow-2xl border border-pink-500/30">
      {/* Top Badge */}
      <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/40 text-amber-300 text-xs sm:text-sm font-semibold mb-4 border border-amber-300/20">
        <AlertCircle className="w-4 h-4 text-amber-300" />
        <span>{badge}</span>
      </div>

      {/* Main Commitment / Notice Description */}
      <p className="text-base sm:text-lg md:text-xl font-bold leading-relaxed sm:leading-loose text-white/95 max-w-xl mx-auto tracking-wide">
        {description}
      </p>

      {/* Bottom Guarantee / Trust Pill */}
      <div className="mt-5 inline-flex items-center gap-2 bg-yellow-400 text-black px-4 sm:px-5 py-2 rounded-full font-bold text-sm sm:text-base shadow-md">
        <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-800" />
        <span>{pillText}</span>
      </div>
    </section>
  );
};
