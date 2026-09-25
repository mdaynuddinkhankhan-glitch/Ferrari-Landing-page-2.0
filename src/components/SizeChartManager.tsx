import React, { useState, useRef } from 'react';
import { Ruler, Plus, Trash2, RotateCcw, Save, Upload, Image as ImageIcon, CheckCircle, AlertCircle, Eye } from 'lucide-react';
import { SiteSettings, SizeChartRowItem, DEFAULT_SIZE_CHART_ROWS } from '../utils/siteSettings';
import { SizeChart } from './SizeChart';
import { compressDataUrl } from '../utils/imageCompressor';
import { uploadImageFileToCloud } from '../services/imageUploadService';
import defaultSizeChartImg from '../assets/images/ferrari_size_chart_1790260219878.jpg';

interface SizeChartManagerProps {
  settings: SiteSettings;
  onUpdateSettings: (newSettings: SiteSettings) => Promise<void> | void;
  showSuccessBanner?: (msg: string) => void;
  showErrorBanner?: (msg: string) => void;
}

export const SizeChartManager: React.FC<SizeChartManagerProps> = ({
  settings,
  onUpdateSettings,
  showSuccessBanner,
  showErrorBanner,
}) => {
  const [rows, setRows] = useState<SizeChartRowItem[]>(() => {
    return settings.sizeChartRows && settings.sizeChartRows.length > 0
      ? settings.sizeChartRows
      : DEFAULT_SIZE_CHART_ROWS;
  });
  const [title, setTitle] = useState(settings.sizeChartTitle || 'সাইজ চার্ট (Ferrari Jacket Size Chart)');
  const [subtitle, setSubtitle] = useState(
    settings.sizeChartSubtitle || 'আপনার সঠিক মাপ দেখে নিচে অর্ডার ফর্মে সাইজ সিলেক্ট করুন (সব মাপ ইঞ্চিতে)'
  );
  const [displayMode, setDisplayMode] = useState<'table' | 'image' | 'both'>(
    settings.sizeChartDisplayMode || 'table'
  );
  const [chartImage, setChartImage] = useState<string>(settings.sizeChartImage || defaultSizeChartImg);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImg, setIsUploadingImg] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync state if settings prop changes externally
  React.useEffect(() => {
    if (settings.sizeChartRows && settings.sizeChartRows.length > 0) {
      setRows(settings.sizeChartRows);
    }
    if (settings.sizeChartTitle) setTitle(settings.sizeChartTitle);
    if (settings.sizeChartSubtitle) setSubtitle(settings.sizeChartSubtitle);
    if (settings.sizeChartDisplayMode) setDisplayMode(settings.sizeChartDisplayMode);
    if (settings.sizeChartImage !== undefined) setChartImage(settings.sizeChartImage);
  }, [settings.sizeChartRows, settings.sizeChartTitle, settings.sizeChartSubtitle, settings.sizeChartDisplayMode, settings.sizeChartImage]);

  const handleRowChange = (index: number, field: keyof SizeChartRowItem, value: string) => {
    const updated = [...rows];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setRows(updated);
  };

  const handleAddRow = () => {
    const newRow: SizeChartRowItem = {
      id: `custom_${Date.now()}`,
      size: '5XL',
      chest: '52',
      shoulder: '23.5',
      length: '33',
    };
    setRows([...rows, newRow]);
  };

  const handleDeleteRow = (index: number) => {
    if (rows.length <= 1) {
      if (showErrorBanner) showErrorBanner('কমপক্ষে একটি সাইজের রো রাখা আবশ্যক!');
      return;
    }
    const updated = rows.filter((_, idx) => idx !== index);
    setRows(updated);
  };

  const handleResetToDefault = () => {
    setRows(DEFAULT_SIZE_CHART_ROWS);
    setTitle('সাইজ চার্ট (Ferrari Jacket Size Chart)');
    setSubtitle('আপনার সঠিক মাপ দেখে নিচে অর্ডার ফর্মে সাইজ সিলেক্ট করুন (সব মাপ ইঞ্চিতে)');
    setDisplayMode('image');
    setChartImage(defaultSizeChartImg);
    if (showSuccessBanner) showSuccessBanner('ডিফল্ট সাইজ চার্ট রিস্টোর করা হয়েছে। সেভ করতে নিচের বাটনে ক্লিক করুন।');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingImg(true);
      if (showSuccessBanner) showSuccessBanner('সাইজ চার্ট ছবি ক্লাউড স্টোরেজে আপলোড হচ্ছে...');
      const cloudUrl = await uploadImageFileToCloud(file, 'sizechart');
      setChartImage(cloudUrl);
      if (displayMode === 'table') {
        setDisplayMode('both');
      }
      if (showSuccessBanner) {
        showSuccessBanner('সাইজ চার্ট ছবি সফলভাবে যোগ হয়েছে! পরিবর্তন সেভ করতে নিচের বাটন চাপুন।');
      }
    } catch (err: any) {
      console.warn('Size chart image upload error:', err);
      if (showErrorBanner) showErrorBanner('ছবি প্রসেসিংয়ে ত্রুটি হয়েছে।');
    } finally {
      setIsUploadingImg(false);
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const cleanedRows = rows.map((r) => ({
        ...r,
        size: r.size ? r.size.trim() : '',
        chest: r.chest ? r.chest.trim() : '',
        shoulder: r.shoulder ? r.shoulder.trim() : '',
        length: r.length ? r.length.trim() : '',
      })).filter((r) => r.size.length > 0);

      const sizeNames = cleanedRows.map((r) => r.size).join(', ');

      const newSettings: SiteSettings = {
        ...settings,
        sizeChartTitle: title,
        sizeChartSubtitle: subtitle,
        sizeChartRows: cleanedRows.length > 0 ? cleanedRows : rows,
        sizesRowText: sizeNames ? `Size: ${sizeNames}` : settings.sizesRowText,
        sizeChartImage: chartImage,
        sizeChartDisplayMode: displayMode,
      };

      await onUpdateSettings(newSettings);
      if (showSuccessBanner) {
        showSuccessBanner('সাইজ চার্ট সফলভাবে সেভ হয়েছে এবং ওয়েবসাইটে লাইভ হয়েছে! 🎉');
      }
    } catch (err: any) {
      if (showErrorBanner) {
        showErrorBanner('সাইজ চার্ট সেভ করতে সমস্যা হয়েছে: ' + (err.message || 'পুনরায় চেষ্টা করুন'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-pink-100 text-[#ff146b] flex items-center justify-center">
              <Ruler className="w-5 h-5" />
            </span>
            <span>সাইজ চার্ট এডিটর (Size Chart Manager)</span>
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            জ্যাকেটের প্রতিটি সাইজের (M, L, XL, XXL ইত্যাদি) বডি, শোল্ডার ও লেন্থ এর মাপ পরিবর্তন করুন অথবা সাইজ চার্টের ছবি আপলোড করুন।
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs sm:text-sm font-semibold rounded-xl border border-neutral-300 flex items-center gap-1.5 transition-all cursor-pointer"
            title="ডিফল্ট মাপ ফিরিয়ে আনুন"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ডিফল্ট রিস্টোর</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-[#ff146b] hover:bg-[#e60055] disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl shadow flex items-center gap-2 transition-all cursor-pointer"
          >
            {isSaving ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>সাইজ চার্ট সেভ করুন</span>
          </button>
        </div>
      </div>

      {/* Card 1: Title, Subtitle, & Display Mode */}
      <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-neutral-800 border-b pb-2">
          ১. শিরোনাম ও ডিসপ্লে সেটিংস
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">
              সাইজ চার্ট শিরোনাম
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="যেমন: সাইজ চার্ট (Ferrari Jacket Size Chart)"
              className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:bg-white focus:border-[#ff146b]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">
              সাইজ চার্ট সাব-টাইটেল / নির্দেশিকা
            </label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="যেমন: আপনার সঠিক মাপ দেখে নিচে অর্ডার ফর্মে সাইজ সিলেক্ট করুন"
              className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:bg-white focus:border-[#ff146b]"
            />
          </div>
        </div>

        {/* Display Mode Selection */}
        <div>
          <label className="block text-xs font-bold text-neutral-700 mb-1.5">
            ওয়েবসাইটে কিভাবে দেখাবেন? (ডিসপ্লে ফরম্যাট)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setDisplayMode('table')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                displayMode === 'table'
                  ? 'border-[#ff146b] bg-pink-50/50 ring-1 ring-[#ff146b]'
                  : 'border-neutral-200 bg-neutral-50 hover:bg-white'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-neutral-900">
                <span>📊 ডিজিটাল টেবিল</span>
                {displayMode === 'table' && <CheckCircle className="w-4 h-4 text-[#ff146b] ml-auto" />}
              </div>
              <p className="text-[11px] text-neutral-500 mt-1 leading-snug">
                ডিজিটাল টেবিল চার্ট (সব ফোনে ১০০% ক্লিয়ার ও ফিট হয়)
              </p>
            </button>

            <button
              type="button"
              onClick={() => setDisplayMode('image')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                displayMode === 'image'
                  ? 'border-[#ff146b] bg-pink-50/50 ring-1 ring-[#ff146b]'
                  : 'border-neutral-200 bg-neutral-50 hover:bg-white'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-neutral-900">
                <span>🖼️ সাইজ চার্ট ছবি</span>
                {displayMode === 'image' && <CheckCircle className="w-4 h-4 text-[#ff146b] ml-auto" />}
              </div>
              <p className="text-[11px] text-neutral-500 mt-1 leading-snug">
                আপনার তৈরি করা সাইজ চার্ট ব্যানার বা গ্রাফিক ফটো
              </p>
            </button>

            <button
              type="button"
              onClick={() => setDisplayMode('both')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                displayMode === 'both'
                  ? 'border-[#ff146b] bg-pink-50/50 ring-1 ring-[#ff146b]'
                  : 'border-neutral-200 bg-neutral-50 hover:bg-white'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-neutral-900">
                <span>📑 টেবিল ও ছবি উভয়ই</span>
                {displayMode === 'both' && <CheckCircle className="w-4 h-4 text-[#ff146b] ml-auto" />}
              </div>
              <p className="text-[11px] text-neutral-500 mt-1 leading-snug">
                কাস্টমার বাটনে ক্লিক করে টেবিল ও ছবি দুটোই দেখতে পারবে
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* Card 2: Interactive Table Editor */}
      <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
          <div>
            <h3 className="text-sm font-bold text-neutral-800 flex items-center gap-2">
              <span>২. সাইজ তালিকা ও মাপ (অর্ডার ফর্ম ও সাইজ চার্ট অপশন)</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-pink-100 text-[#ff146b] border border-pink-200">
                {rows.length} টি সাইজ
              </span>
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              প্রতিটি সাইজের নাম (M, L, XL ইত্যাদি) পরিবর্তন করুন, মাপ বদলান, নতুন সাইজ বাড়ান (+) বা ডিলিট করুন।
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddRow}
            className="px-3.5 py-2 bg-[#ff146b] hover:bg-[#e60055] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto shadow-xs active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>নতুন সাইজ যোগ করুন (+)</span>
          </button>
        </div>

        {/* Sync Alert Box */}
        <div className="bg-amber-50 border border-amber-200/90 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-900">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>অর্ডার ফর্ম সাইজ সিঙ্ক:</strong> আপনি এখানে যেকোনো সাইজের নাম পরিবর্তন (Change), নতুন সাইজ বাড়ানো (Add) বা অপ্রয়োজনীয় সাইজ ডিলিট (Delete) করতে পারেন। সেভ করার সাথে সাথে মূল ওয়েবসাইটের <strong>"কোন সাইজ নিবেন (সিলেক্ট করুন)"</strong> অপশনেও ঠিক সেই সাইজগুলোই চলে আসবে।
          </div>
        </div>

        {/* Responsive Table Form */}
        <div className="overflow-x-auto border border-neutral-200 rounded-xl">
          <table className="w-full text-left border-collapse min-w-[360px] sm:min-w-[480px]">
            <thead>
              <tr className="bg-neutral-900 text-white text-xs uppercase font-bold tracking-tight">
                <th className="py-2.5 px-2 sm:px-3 w-[22%] text-center">সাইজ (Size)</th>
                <th className="py-2.5 px-2 sm:px-3 w-[24%] text-center">চেস্ট (Chest)</th>
                <th className="py-2.5 px-2 sm:px-3 w-[24%] text-center">শোল্ডার (Shoulder)</th>
                <th className="py-2.5 px-2 sm:px-3 w-[20%] text-center">ঝুল/দৈর্ঘ্য (Length)</th>
                <th className="py-2.5 px-1 sm:px-2 w-[10%] text-center">মুছুন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-xs">
              {rows.map((row, idx) => (
                <tr key={row.id || `${row.size}-${idx}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-neutral-50/60'}>
                  {/* Size Name */}
                  <td className="p-1.5 sm:p-2 text-center">
                    <input
                      type="text"
                      value={row.size}
                      onChange={(e) => handleRowChange(idx, 'size', e.target.value)}
                      placeholder="M / L / XL"
                      className="w-full max-w-[80px] sm:max-w-[90px] mx-auto text-center font-extrabold text-xs sm:text-sm py-1 px-1 bg-white border border-neutral-300 rounded-lg outline-none focus:border-[#ff146b] focus:ring-1 focus:ring-[#ff146b]"
                    />
                  </td>

                  {/* Chest */}
                  <td className="p-1.5 sm:p-2 text-center">
                    <input
                      type="text"
                      value={row.chest}
                      onChange={(e) => handleRowChange(idx, 'chest', e.target.value)}
                      placeholder='40"'
                      className="w-full max-w-[80px] sm:max-w-[90px] mx-auto text-center font-bold text-xs sm:text-sm py-1 px-1 bg-white border border-neutral-300 rounded-lg outline-none focus:border-[#ff146b] focus:ring-1 focus:ring-[#ff146b]"
                    />
                  </td>

                  {/* Shoulder */}
                  <td className="p-1.5 sm:p-2 text-center">
                    <input
                      type="text"
                      value={row.shoulder}
                      onChange={(e) => handleRowChange(idx, 'shoulder', e.target.value)}
                      placeholder='17.5"'
                      className="w-full max-w-[80px] sm:max-w-[90px] mx-auto text-center font-bold text-xs sm:text-sm py-1 px-1 bg-white border border-neutral-300 rounded-lg outline-none focus:border-[#ff146b] focus:ring-1 focus:ring-[#ff146b]"
                    />
                  </td>

                  {/* Length */}
                  <td className="p-1.5 sm:p-2 text-center">
                    <input
                      type="text"
                      value={row.length}
                      onChange={(e) => handleRowChange(idx, 'length', e.target.value)}
                      placeholder='27"'
                      className="w-full max-w-[80px] sm:max-w-[90px] mx-auto text-center font-bold text-xs sm:text-sm py-1 px-1 bg-white border border-neutral-300 rounded-lg outline-none focus:border-[#ff146b] focus:ring-1 focus:ring-[#ff146b]"
                    />
                  </td>

                  {/* Delete Action */}
                  <td className="p-1.5 sm:p-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleDeleteRow(idx)}
                      disabled={rows.length <= 1}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-red-50 hover:bg-red-100 disabled:opacity-30 text-red-600 flex items-center justify-center mx-auto transition-colors cursor-pointer"
                      title="এই রো মুছে ফেলুন"
                    >
                      <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-[11px] text-neutral-400">
            * সব মাপ ইঞ্চিতে। আপনি যেকোনো সাইজ (যেমন: S, 5XL, 6XL ইত্যাদি) যোগ বা বাদ দিতে পারেন।
          </p>

          <button
            type="button"
            onClick={handleAddRow}
            className="text-xs font-bold text-[#ff146b] hover:text-[#d00e54] flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>আরো একটি সাইজ যোগ করুন</span>
          </button>
        </div>
      </div>

      {/* Card 3: Custom Size Chart Image Upload */}
      <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-neutral-800 border-b pb-2 flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-[#ff146b]" />
          <span>৩. কাস্টম সাইজ চার্ট ছবি / ব্যানার (ঐচ্ছিক)</span>
        </h3>
        <p className="text-xs text-neutral-500">
          আপনার কাছে যদি গ্রাফিক্স ডিজাইনার দিয়ে বানানো সাইজ চার্টের কোনো ব্যানার ছবি থাকে, সেটি এখানে আপলোড করতে পারেন।
        </p>

        {chartImage ? (
          <div className="flex flex-col sm:flex-row items-start gap-4 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
            <div className="w-full sm:w-48 max-h-48 overflow-hidden rounded-lg bg-neutral-900 flex items-center justify-center border border-neutral-300">
              <img
                src={chartImage}
                alt="Size chart preview"
                className="w-full h-full object-contain max-h-44"
              />
            </div>

            <div className="flex-1 space-y-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>সাইজ চার্ট ছবি সক্রিয় আছে</span>
              </span>
              <p className="text-xs text-neutral-600 leading-relaxed">
                ছবিটি ক্রিস্টাল ক্লিয়ার কোয়ালিটিতে সেভ রয়েছে। কাস্টমাররা এটি জুম করে পরিষ্কার দেখতে পারবে।
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>অন্য ছবি দিন</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setChartImage('');
                    if (displayMode === 'image') setDisplayMode('table');
                  }}
                  className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ছবি ডিলিট করুন</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-neutral-300 hover:border-[#ff146b] bg-neutral-50 hover:bg-pink-50/20 rounded-xl p-6 text-center cursor-pointer transition-all"
          >
            <div className="w-12 h-12 rounded-2xl bg-neutral-200 text-neutral-600 flex items-center justify-center mx-auto mb-2">
              <Upload className="w-6 h-6 text-neutral-700" />
            </div>
            <p className="text-xs sm:text-sm font-bold text-neutral-800">
              সাইজ চার্ট ছবি আপলোড করতে এখানে ক্লিক করুন
            </p>
            <p className="text-[11px] text-neutral-500 mt-1">
              PNG, JPG বা WebP ফরম্যাট (সুপার হাই-কোয়ালিটি সুরক্ষিত থাকবে)
            </p>
          </div>
        )}

        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleImageUpload}
          className="hidden"
        />
      </div>

      {/* Card 4: Live Website Preview */}
      <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="text-sm font-bold text-neutral-800 flex items-center gap-2">
            <Eye className="w-4 h-4 text-[#ff146b]" />
            <span>৪. লাইভ ওয়েবসাইট প্রিভিউ (কাস্টমাররা যেমন দেখবে)</span>
          </h3>
          <span className="text-[11px] text-neutral-500">রিয়েল-টাইম প্রিভিউ</span>
        </div>

        <div className="p-4 bg-[#050B14] rounded-2xl border border-neutral-800">
          <SizeChart
            title={title}
            subtitle={subtitle}
            rows={rows}
            image={chartImage}
            displayMode={displayMode}
          />
        </div>
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="sticky bottom-4 z-20 bg-neutral-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-neutral-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-neutral-300">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>সাইজ চার্ট ও মাপ পরিবর্তন শেষে এই বাটনে ক্লিক করলেই সাথে সাথে সেভ হবে।</span>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="w-full sm:w-auto px-6 py-2.5 bg-[#ff146b] hover:bg-[#e60055] disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          {isSaving ? (
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>পরিবর্তন সেভ করুন (Save Size Chart)</span>
        </button>
      </div>
    </div>
  );
};
