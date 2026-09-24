import React, { useState } from 'react';
import { SiteSettings } from '../utils/siteSettings';
import { Shield, Copy, Check, Eye, Lock, Sparkles, RefreshCw, Layers, ExternalLink, Info } from 'lucide-react';
import { STANDALONE_PROTECTION_HTML } from '../utils/standaloneProtectionCode';
import { createDiagonalWatermarkSvg, showProtectionToast } from '../utils/imageProtection';

interface WatermarkSettingsSectionProps {
  settings: SiteSettings;
  onSaveSettings: (newSettings: SiteSettings) => void;
  onBackToDashboard?: () => void;
  onShowSuccess?: (msg: string) => void;
}

export const WatermarkSettingsSection: React.FC<WatermarkSettingsSectionProps> = ({
  settings,
  onSaveSettings,
  onBackToDashboard,
  onShowSuccess,
}) => {
  const [watermarkText, setWatermarkText] = useState(settings.watermarkText || 'Porshibari.shop');
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(settings.watermarkOpacity ?? 0.20);
  const [preventRightClick, setPreventRightClick] = useState<boolean>(settings.watermarkPreventRightClick ?? true);
  const [preventDrag, setPreventDrag] = useState<boolean>(settings.watermarkPreventDrag ?? true);
  const [diagonalRepeat, setDiagonalRepeat] = useState<boolean>(settings.watermarkDiagonalRepeat ?? true);

  const [copiedCode, setCopiedCode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Live preview image (uses first product or banner image)
  const sampleImage = settings.products?.[0]?.image || settings.heroBannerImg;
  const sampleSvg = createDiagonalWatermarkSvg(watermarkText, watermarkOpacity);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(STANDALONE_PROTECTION_HTML);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 3000);
      if (onShowSuccess) {
        onShowSuccess('প্রোটেকশন কোড কপি করা হয়েছে!');
      }
    } catch {
      // fallback
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 3000);
    }
  };

  const handleSave = () => {
    setIsSaving(true);
    const updated: SiteSettings = {
      ...settings,
      watermarkText: watermarkText.trim() || 'Porshibari.shop',
      watermarkOpacity: Number(watermarkOpacity) || 0.20,
      watermarkPreventRightClick: preventRightClick,
      watermarkPreventDrag: preventDrag,
      watermarkDiagonalRepeat: diagonalRepeat,
    };

    onSaveSettings(updated);
    setTimeout(() => {
      setIsSaving(false);
      if (onShowSuccess) {
        onShowSuccess('ওয়াটারমার্ক ও ইমেজ সুরক্ষা সেটিংস সেভ হয়েছে!');
      }
    }, 400);
  };

  const handleTestToast = () => {
    showProtectionToast(`⚠️ এই ছবিটি ${watermarkText} এর স্বত্বাধিকার সংরক্ষিত`);
  };

  return (
    <div className="space-y-6 animate-fadeIn text-neutral-800">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-950 to-black text-white p-5 sm:p-6 rounded-2xl border border-neutral-800 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-[#ff146b] shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold font-['Baloo_Da_2'] flex items-center gap-2">
              <span>ইমেজ সুরক্ষা ও ওয়াটারমার্ক সিস্টেম</span>
              <span className="text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                Active & Live
              </span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              ওয়েবসাইটের সকল প্রোডাক্ট ছবি, ব্যানার ও ভিজ্যুয়ালের ওপর ডায়াগোনাল ওয়াটারমার্ক ও কপি প্রতিরোধ সুরক্ষা।
            </p>
          </div>
        </div>

        {onBackToDashboard && (
          <button
            type="button"
            onClick={onBackToDashboard}
            className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer"
          >
            ← ড্যাশবোর্ডে ফিরুন
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Settings Configuration Form */}
        <div className="lg:col-span-7 space-y-5">
          {/* Main Controls Card */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-neutral-200/90 shadow-xs space-y-5">
            <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2 pb-3 border-b border-neutral-100">
              <Layers className="w-4 h-4 text-[#ff146b]" />
              <span>ওয়াটারমার্ক কাস্টমাইজেশন</span>
            </h3>

            {/* Watermark Text */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                ওয়াটারমার্ক টেক্সট (Watermark Text)
              </label>
              <input
                type="text"
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
                placeholder="Porshibari.shop"
                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-sm font-bold text-neutral-900 focus:bg-white focus:border-[#ff146b] focus:ring-2 focus:ring-[#ff146b]/20 outline-none transition-all"
              />
              <p className="text-[11px] text-neutral-500 mt-1">
                ছবির ওপর কোন ব্র্যান্ড নাম ডায়াগোনালি প্রদর্শিত হবে তা নির্ধারণ করুন (ডিফল্ট: <strong>Porshibari.shop</strong>)।
              </p>
            </div>

            {/* Opacity Slider */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-neutral-700">
                  ওয়াটারমার্ক দৃশ্যমানতা (Opacity)
                </label>
                <span className="text-xs font-extrabold text-[#ff146b] bg-pink-50 px-2 py-0.5 rounded-md border border-pink-100">
                  {Math.round(watermarkOpacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.40"
                step="0.01"
                value={watermarkOpacity}
                onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-[#ff146b]"
              />
              <div className="flex justify-between text-[10px] text-neutral-400 mt-1">
                <span>10% (খুব হালকা)</span>
                <span className="text-[#ff146b] font-bold">20% (প্রস্তাবিত পারফেক্ট)</span>
                <span>40% (বেশি স্পষ্ট)</span>
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-3 pt-2">
              {/* Right Click Prevention */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                <div>
                  <div className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-neutral-600" />
                    <span>রাইট-ক্লিক দিয়ে ছবি সেভ করা বন্ধ রাখুন</span>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    ভিজিটর রাইট-ক্লিক করে Save Image দিলে কপিরাইট নোটিশ প্রদর্শিত হবে।
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={preventRightClick}
                    onChange={(e) => setPreventRightClick(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ff146b]"></div>
                </label>
              </div>

              {/* Drag and Drop Prevention */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                <div>
                  <div className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-neutral-600" />
                    <span>ড্র্যাগ অ্যান্ড ড্রপ (Drag & Drop) ডাউনলোড বন্ধ রাখুন</span>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    ছবি মাউস দিয়ে টেনে নতুন ট্যাবে বা ফোল্ডারে সেভ করা প্রতিহত করে।
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={preventDrag}
                    onChange={(e) => setPreventDrag(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ff146b]"></div>
                </label>
              </div>

              {/* Diagonal Repeat */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                <div>
                  <div className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-neutral-600" />
                    <span>ডায়াগোনাল রিপিট প্যাটার্ন (Diagonal Repeat)</span>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    পুরো ছবিজুড়ে কোনাকুনিভাবে ওয়াটারমার্ক রিপিট হবে, যাতে ক্রপ করে সরাতে না পারে।
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={diagonalRepeat}
                    onChange={(e) => setDiagonalRepeat(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ff146b]"></div>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-neutral-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleTestToast}
                className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <span>🔔 টেস্ট কপিরাইট নোটিশ</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2.5 bg-[#ff146b] hover:bg-[#e60055] disabled:opacity-60 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-md cursor-pointer transition-all active:scale-95"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>সেভ হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>সেটিংস সেভ করুন</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Technical Disclosure Notice */}
          <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-4 text-xs text-amber-900 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-amber-800">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>প্রফেশনাল সিকিউরিটি নোট ও স্ক্রিনশট পলিসি:</span>
            </div>
            <p className="leading-relaxed text-[11.5px]">
              ব্রাউজারের টেকনিক্যাল সীমাবদ্ধতার কারণে অপারেটিং সিস্টেমের স্ক্রিনশট (যেমনঃ PrintScreen/Snipping Tool) শতভাগ ব্লক করা সম্ভব নয়। তাই এই সিস্টেমের মাধ্যমে প্রতিটি ছবির উপরে <strong>{watermarkText}</strong> এর স্পষ্ট ডায়াগোনাল ওয়াটারমার্ক লেয়ার যুক্ত থাকে—যাতে কেউ স্ক্রিনশট নিলেও ওয়াটারমার্কটি ছবির সাথে স্থায়ীভাবে থেকে যায় এবং ব্র্যান্ড সুরক্ষিত থাকে।
            </p>
          </div>
        </div>

        {/* Right Column: Live Visual Simulator & Code Snippet Box */}
        <div className="lg:col-span-5 space-y-5">
          {/* Live Simulator Preview */}
          <div className="bg-white rounded-2xl p-5 border border-neutral-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <h3 className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-emerald-600" />
                <span>লাইভ ওয়াটারমার্ক প্রিভিউ</span>
              </h3>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                Real-time Rendering
              </span>
            </div>

            {/* Simulated protected image box */}
            <div className="relative rounded-xl overflow-hidden border-2 border-neutral-200 bg-neutral-900 select-none aspect-[4/3] flex items-center justify-center">
              <img
                src={sampleImage}
                alt="Watermark Simulator"
                className="w-full h-full object-cover"
                draggable={false}
              />

              {/* Watermark Overlay */}
              {diagonalRepeat && (
                <div
                  className="absolute inset-0 pointer-events-none pb-watermark-overlay z-10"
                  style={{
                    backgroundImage: `url("${sampleSvg}")`,
                    backgroundRepeat: 'repeat',
                    backgroundSize: '240px 150px',
                  }}
                />
              )}

              {/* Verified Corner Badge */}
              <div
                className="absolute bottom-2 right-2 z-20 pointer-events-none flex items-center gap-1 px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs border border-white/20"
                style={{ opacity: Math.min(0.85, watermarkOpacity * 3) }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff146b] animate-ping" />
                <span className="text-[9px] font-extrabold tracking-wider text-white font-sans">
                  {watermarkText}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-neutral-500 text-center">
              ওয়েবসাইটের সকল ব্যানারে, প্রোডাক্ট কার্ডে ও সাইজ চার্টে এই ওয়াটারমার্ক স্বয়ংক্রিয়ভাবে দৃশ্যমান হবে।
            </p>
          </div>

          {/* Copy Standalone Code Card */}
          <div className="bg-gradient-to-b from-neutral-900 to-neutral-950 text-white rounded-2xl p-5 border border-neutral-800 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Copy className="w-4 h-4 text-pink-400" />
                <span>রেডি-টু-ইউজ কোড (HTML/CSS/JS)</span>
              </h3>
              <span className="text-[10px] text-pink-400 bg-pink-500/20 px-2 py-0.5 rounded font-mono">
                WordPress / Shopify / HTML
              </span>
            </div>

            <p className="text-[11px] text-neutral-400 leading-relaxed">
              আপনি যদি এই সুরক্ষাব্যবস্থা অন্য কোনো ওয়ার্ডপ্রেস/শপিফাই বা কাস্টম ওয়েবসাইটে ব্যবহার করতে চান, তাহলে নিচের সম্পূর্ণ রেডি কোডটি কপি করে সাইটের <code>&lt;head&gt;</code> বা <code>&lt;/body&gt;</code> এর আগে বসিয়ে দিন।
            </p>

            <div className="relative">
              <pre className="bg-black/80 border border-neutral-800 rounded-xl p-3 text-[10.5px] font-mono text-neutral-300 max-h-36 overflow-y-auto leading-relaxed select-all">
                {STANDALONE_PROTECTION_HTML}
              </pre>
            </div>

            <button
              type="button"
              onClick={handleCopyCode}
              className="w-full py-2.5 bg-white/10 hover:bg-white/20 active:scale-98 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border border-white/20 shadow"
            >
              {copiedCode ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">কোড সফলভাবে কপি হয়েছে!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-pink-400" />
                  <span>সম্পূর্ণ কোড কপি করুন (Click to Copy)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
