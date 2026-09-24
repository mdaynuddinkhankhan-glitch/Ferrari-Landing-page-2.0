import React, { useState } from 'react';
import { SiteSettings } from '../utils/siteSettings';
import { 
  ArrowLeft, 
  Check, 
  AlertCircle, 
  Sparkles, 
  ExternalLink, 
  Activity, 
  ShieldCheck, 
  Radio, 
  Send,
  HelpCircle,
  CheckCircle2,
  Copy
} from 'lucide-react';
import { 
  initFacebookPixel, 
  initTikTokPixel, 
  trackPageView, 
  trackPurchase 
} from '../utils/pixelTracking';

interface ConversionSettingsSectionProps {
  settings: SiteSettings;
  onSaveSettings: (updatedSettings: SiteSettings) => void;
  onBackToDashboard: () => void;
  onShowSuccess?: (msg: string) => void;
}

export const ConversionSettingsSection: React.FC<ConversionSettingsSectionProps> = ({
  settings,
  onSaveSettings,
  onBackToDashboard,
  onShowSuccess,
}) => {
  // Form states initialized with existing settings
  const [fbPixelId, setFbPixelId] = useState(settings.fbPixelId || '');
  const [fbAccessToken, setFbAccessToken] = useState(settings.fbAccessToken || '');
  const [fbTestEventCode, setFbTestEventCode] = useState(settings.fbTestEventCode || '');

  const [ttPixelId, setTtPixelId] = useState(settings.ttPixelId || '');
  const [ttAccessToken, setTtAccessToken] = useState(settings.ttAccessToken || '');
  const [ttTestEventCode, setTtTestEventCode] = useState(settings.ttTestEventCode || '');

  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ type: 'fb' | 'tt'; message: string } | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, fieldId: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // ignore
    }
  };

  const handleUpdate = () => {
    setIsSaving(true);
    const updated: SiteSettings = {
      ...settings,
      fbPixelId: fbPixelId.trim(),
      fbAccessToken: fbAccessToken.trim(),
      fbTestEventCode: fbTestEventCode.trim(),
      ttPixelId: ttPixelId.trim(),
      ttAccessToken: ttAccessToken.trim(),
      ttTestEventCode: ttTestEventCode.trim(),
    };

    // Initialize in browser immediately
    if (updated.fbPixelId) {
      initFacebookPixel(updated.fbPixelId, updated.fbTestEventCode);
    }
    if (updated.ttPixelId) {
      initTikTokPixel(updated.ttPixelId, updated.ttTestEventCode);
    }

    onSaveSettings(updated);

    setTimeout(() => {
      setIsSaving(false);
      if (onShowSuccess) {
        onShowSuccess('পিক্সেল ও কনভার্সন সেটিংস সফলভাবে আপডেট ও কানেক্ট করা হয়েছে!');
      }
    }, 400);
  };

  const handleTestFacebook = () => {
    if (!fbPixelId.trim()) {
      setTestResult({
        type: 'fb',
        message: 'অনুগ্রহ করে প্রথমে Facebook Pixel ID দিন এবং Update বাটনে ক্লিক করুন।',
      });
      return;
    }
    initFacebookPixel(fbPixelId.trim(), fbTestEventCode.trim());
    trackPageView();
    trackPurchase(
      {
        orderId: '#TEST-' + Math.floor(1000 + Math.random() * 9000),
        customerName: 'Test Customer',
        customerPhone: '01700000000',
        total: 1250,
      },
      {
        ...settings,
        fbPixelId: fbPixelId.trim(),
        fbAccessToken: fbAccessToken.trim(),
        fbTestEventCode: fbTestEventCode.trim(),
      }
    );
    setTestResult({
      type: 'fb',
      message: 'টেস্ট ইভেন্ট (PageView & Purchase) সফলভাবে পাঠানো হয়েছে! আপনার Meta Events Manager-এ টেস্ট ইভেন্ট চেক করুন।',
    });
    setTimeout(() => setTestResult(null), 6000);
  };

  const handleTestTikTok = () => {
    if (!ttPixelId.trim()) {
      setTestResult({
        type: 'tt',
        message: 'অনুগ্রহ করে প্রথমে TikTok Pixel ID দিন এবং Update বাটনে ক্লিক করুন।',
      });
      return;
    }
    initTikTokPixel(ttPixelId.trim(), ttTestEventCode.trim());
    trackPageView();
    trackPurchase(
      {
        orderId: '#TEST-' + Math.floor(1000 + Math.random() * 9000),
        customerName: 'Test Customer',
        customerPhone: '01700000000',
        total: 1250,
      },
      {
        ...settings,
        ttPixelId: ttPixelId.trim(),
        ttAccessToken: ttAccessToken.trim(),
        ttTestEventCode: ttTestEventCode.trim(),
      }
    );
    setTestResult({
      type: 'tt',
      message: 'TikTok টেস্ট ইভেন্ট পাঠানো হয়েছে! আপনার TikTok Ads Manager-এ Events Manager চেক করুন।',
    });
    setTimeout(() => setTestResult(null), 6000);
  };

  const isFbActive = Boolean(fbPixelId.trim());
  const isTtActive = Boolean(ttPixelId.trim());

  return (
    <div className="min-h-screen bg-[#f3f6f9] text-neutral-900 pb-16">
      {/* Header Bar matching screenshot: Arrow + Title */}
      <div className="bg-[#f0f4f8] border-b border-neutral-200/80 sticky top-0 z-20 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToDashboard}
              className="w-10 h-10 rounded-full hover:bg-neutral-200/80 active:scale-95 flex items-center justify-center text-neutral-800 transition-colors cursor-pointer"
              aria-label="ড্যাশবোর্ডে ফিরে যান"
              title="ফিরে যান"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
              SEO & Marketing Integrations
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="px-3 py-1.5 rounded-xl bg-white border border-neutral-300 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
              <span>সহায়িকা</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-5 sm:pt-7">
        {/* Test Result Toast */}
        {testResult && (
          <div className="mb-5 p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-start gap-3 shadow-md animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-sm font-medium flex-1">{testResult.message}</div>
          </div>
        )}

        {/* Setup Guide Accordion */}
        {showGuide && (
          <div className="mb-6 p-5 rounded-2xl bg-indigo-50/80 border border-indigo-200 text-indigo-950 text-sm shadow-sm animate-in fade-in">
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold flex items-center gap-2 text-indigo-900">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>কীভাবে Pixel ID এবং Access Token পাবেন?</span>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="text-xs font-bold text-indigo-700 hover:underline cursor-pointer"
              >
                লুকান
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-white p-3.5 rounded-xl border border-indigo-100 shadow-2xs">
                <div className="font-bold text-neutral-900 mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  Meta (Facebook) Pixel & CAPI:
                </div>
                <ol className="list-decimal list-inside space-y-1 text-xs text-neutral-600 leading-relaxed">
                  <li>Meta Business Suite &gt; <b>Events Manager</b>-এ যান।</li>
                  <li>আপনার Data Source থেকে <b>Pixel ID</b> (১৬ সংখ্যার কোড) কপি করে পেস্ট করুন।</li>
                  <li>Settings &gt; Generate access token থেকে <b>Pixel Access Token</b> তৈরি করুন।</li>
                  <li>Test Events ট্যাব থেকে <b>Test Event Code</b> সংগ্রহ করতে পারেন।</li>
                </ol>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-indigo-100 shadow-2xs">
                <div className="font-bold text-neutral-900 mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-black"></span>
                  TikTok Pixel & Events API:
                </div>
                <ol className="list-decimal list-inside space-y-1 text-xs text-neutral-600 leading-relaxed">
                  <li>TikTok Ads Manager &gt; <b>Assets</b> &gt; <b>Events</b>-এ যান।</li>
                  <li>Web Events সেটআপ করে আপনার <b>TikTok Pixel ID</b> কপি করুন।</li>
                  <li>Settings থেকে Events API-এর <b>Access Token</b> জেনারেট করুন।</li>
                  <li>টেস্ট করার জন্য <b>Test Event Code</b> দিতে পারেন।</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* White Card as in Screenshot */}
        <div className="bg-white rounded-3xl border border-neutral-200/90 shadow-sm p-6 sm:p-8">
          
          {/* ================= SECTION 1: Meta (Facebook) Pixel ================= */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
                Setup Meta (Facebook) Pixel and Conversions API
              </h2>
              {isFbActive ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0 self-start sm:self-auto">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Pixel Active & Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-500 border border-neutral-200 shrink-0 self-start sm:self-auto">
                  Not Configured
                </span>
              )}
            </div>

            <p className="text-sm sm:text-base text-neutral-600 leading-relaxed mb-6">
              Track customer actions and optimize your Facebook advertising campaigns with pixel integration and server-side events.
            </p>

            <div className="space-y-4">
              {/* Facebook Pixel ID */}
              <div>
                <label className="block text-sm font-semibold text-neutral-900 mb-1.5">
                  Facebook Pixel ID
                </label>
                <input
                  type="text"
                  value={fbPixelId}
                  onChange={(e) => setFbPixelId(e.target.value)}
                  placeholder="Facebook Pixel ID"
                  className="w-full px-4 py-3.5 rounded-xl border border-neutral-300 text-neutral-900 text-base placeholder:text-neutral-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>

              {/* Pixel Access Token */}
              <div>
                <label className="block text-sm font-semibold text-neutral-900 mb-1.5">
                  Pixel Access Token
                </label>
                <input
                  type="text"
                  value={fbAccessToken}
                  onChange={(e) => setFbAccessToken(e.target.value)}
                  placeholder="Pixel Access Token"
                  className="w-full px-4 py-3.5 rounded-xl border border-neutral-300 text-neutral-900 text-base placeholder:text-neutral-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all font-mono text-sm"
                />
              </div>

              {/* Pixel Test ID (only for testing) - Outlined styling as shown in screenshot */}
              <div className="relative pt-2">
                <div className="rounded-xl border-2 border-indigo-600/80 p-3.5 bg-indigo-50/20 relative">
                  <span className="absolute -top-2.5 left-4 px-2 bg-white text-xs font-semibold text-indigo-700 rounded">
                    Pixel Test ID (only for testing)
                  </span>
                  <input
                    type="text"
                    value={fbTestEventCode}
                    onChange={(e) => setFbTestEventCode(e.target.value)}
                    placeholder="Pixel Test ID (only for testing)"
                    className="w-full bg-transparent text-neutral-900 text-base placeholder:text-neutral-400 outline-none"
                  />
                </div>
              </div>

              {/* Quick test button for Facebook */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-neutral-500">
                  {isFbActive ? '✅ পেজে ভিজিট ও অর্ডারে ইভেন্ট স্বয়ংক্রিয়ভাবে ট্র্যাকিং হচ্ছে' : 'Pixel ID দিয়ে Update বাটনে ক্লিক করুন'}
                </span>
                <button
                  type="button"
                  onClick={handleTestFacebook}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer"
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>Test Event পাঠান</span>
                </button>
              </div>
            </div>
          </div>

          {/* Clean Divider Line matching screenshot */}
          <div className="border-t border-neutral-200 my-8"></div>

          {/* ================= SECTION 2: TikTok Pixel ================= */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
                Setup TikTok Pixel and Events API
              </h2>
              {isTtActive ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0 self-start sm:self-auto">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Pixel Active & Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-500 border border-neutral-200 shrink-0 self-start sm:self-auto">
                  Not Configured
                </span>
              )}
            </div>

            <p className="text-sm sm:text-base text-neutral-600 leading-relaxed mb-6">
              Track customer actions and optimize your TikTok advertising campaigns with pixel integration and server-side events.
            </p>

            <div className="space-y-4">
              {/* TikTok Pixel ID */}
              <div>
                <label className="block text-sm font-semibold text-neutral-900 mb-1.5">
                  TikTok Pixel ID
                </label>
                <input
                  type="text"
                  value={ttPixelId}
                  onChange={(e) => setTtPixelId(e.target.value)}
                  placeholder="TikTok Pixel ID"
                  className="w-full px-4 py-3.5 rounded-xl border border-neutral-300 text-neutral-900 text-base placeholder:text-neutral-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>

              {/* TikTok Pixel Access Token */}
              <div>
                <label className="block text-sm font-semibold text-neutral-900 mb-1.5">
                  TikTok Pixel Access Token
                </label>
                <input
                  type="text"
                  value={ttAccessToken}
                  onChange={(e) => setTtAccessToken(e.target.value)}
                  placeholder="TikTok Pixel Access Token"
                  className="w-full px-4 py-3.5 rounded-xl border border-neutral-300 text-neutral-900 text-base placeholder:text-neutral-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all font-mono text-sm"
                />
              </div>

              {/* TikTok Pixel Test Event Code */}
              <div>
                <label className="block text-sm font-semibold text-neutral-900 mb-1.5">
                  TikTok Pixel Test Event Code (Optional - for testing. Clear after testing is done)
                </label>
                <input
                  type="text"
                  value={ttTestEventCode}
                  onChange={(e) => setTtTestEventCode(e.target.value)}
                  placeholder="TikTok Pixel Test Event Code"
                  className="w-full px-4 py-3.5 rounded-xl border border-neutral-300 text-neutral-900 text-base placeholder:text-neutral-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>

              {/* Quick test button for TikTok */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-neutral-500">
                  {isTtActive ? '✅ TikTok কনভার্সন ও ইভেন্ট ট্র্যাকিং সক্রিয় রয়েছে' : 'TikTok Pixel ID দিয়ে Update বাটনে ক্লিক করুন'}
                </span>
                <button
                  type="button"
                  onClick={handleTestTikTok}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer"
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>TikTok Test Event পাঠান</span>
                </button>
              </div>
            </div>
          </div>

          {/* ================= Update Button (Purple / Indigo as in screenshot) ================= */}
          <div className="mt-8 pt-4 flex items-center justify-end">
            <button
              type="button"
              onClick={handleUpdate}
              disabled={isSaving}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#5b3df5] hover:bg-[#4d2ee0] active:scale-95 text-white font-bold text-base shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>সংরক্ষণ হচ্ছে...</span>
                </>
              ) : (
                <span>Update</span>
              )}
            </button>
          </div>
        </div>

        {/* Real Events Summary Card */}
        <div className="mt-6 bg-white rounded-3xl border border-neutral-200/90 shadow-2xs p-5 sm:p-6">
          <h3 className="font-bold text-base text-neutral-900 mb-2 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>লাইভ ইভেন্ট ট্র্যাকিং বিবরণ (Live Triggered Events)</span>
          </h3>
          <p className="text-xs text-neutral-500 mb-4">
            পিক্সেল কানেক্ট হওয়ার পর আপনার ল্যান্ডিং পেজে নিচের ইভেন্টগুলো স্বয়ংক্রিয়ভাবে ফায়ার হবে:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
              <div className="font-bold text-neutral-900 mb-1">1. PageView</div>
              <p className="text-neutral-500">ল্যান্ডিং পেজ লোড হওয়ার সাথে সাথে মেটা ও টিকটক উভয় পিক্সেলেই পেজভিউ ফায়ার হয়।</p>
            </div>
            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
              <div className="font-bold text-neutral-900 mb-1">2. ViewContent</div>
              <p className="text-neutral-500">কাস্টমার Ferrari Jacket কালেকশন এবং সাইজ চার্ট দেখার সময় প্রোডাক্ট ভিউ রেকর্ড হয়।</p>
            </div>
            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
              <div className="font-bold text-neutral-900 mb-1">3. AddToCart</div>
              <p className="text-neutral-500">Black, White বা Red Ferrari Jacket সিলেক্ট করা ও কোয়ান্টিটি পরিবর্তনের সময় ফায়ার হয়।</p>
            </div>
            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
              <div className="font-bold text-neutral-900 mb-1">4. InitiateCheckout</div>
              <p className="text-neutral-500">কাস্টমার যখন অর্ডার ফর্মে নাম/ঠিকানা পূরণ শুরু করেন তখন চেকআউট ফায়ার হয়।</p>
            </div>
            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
              <div className="font-bold text-neutral-900 mb-1">5. Purchase / CompletePayment</div>
              <p className="text-neutral-500">অর্ডার সম্পন্ন হলে মোট টাকার পরিমাণ (BDT), অর্ডার আইডি ও আইটেমসহ ট্র্যাকিং হয়।</p>
            </div>
            <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200">
              <div className="font-bold text-indigo-900 mb-1">6. Conversions API (CAPI)</div>
              <p className="text-indigo-700">Access Token দেওয়া থাকলে অ্যাড-ব্লকার থাকলেও সার্ভার-সাইড ট্র্যাকিং সক্রিয় থাকে।</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
