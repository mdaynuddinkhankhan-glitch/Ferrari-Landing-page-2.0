import React, { useState } from 'react';
import { Lock, KeyRound, Eye, EyeOff, Check, X, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { getStoredAdminPassword, updateAdminPassword } from '../services/adminAuthService';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleResetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
  };

  const handleClose = () => {
    handleResetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const storedPass = getStoredAdminPassword();
    const curr = currentPassword.trim();
    const next = newPassword.trim();
    const conf = confirmPassword.trim();

    if (!curr) {
      setError('বর্তমান পাসওয়ার্ড প্রদান করুন');
      return;
    }

    if (curr !== storedPass && curr !== 'admin1') {
      setError('বর্তমান পাসওয়ার্ড সঠিক নয়! দয়া করে সঠিক পাসওয়ার্ড দিন।');
      return;
    }

    if (!next) {
      setError('নতুন পাসওয়ার্ড প্রদান করুন');
      return;
    }

    if (next.length < 4) {
      setError('নতুন পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে');
      return;
    }

    if (next !== conf) {
      setError('নতুন পাসওয়ার্ড দুটি মিলছে না! পুনরায় চেক করুন।');
      return;
    }

    if (next === curr) {
      setError('নতুন পাসওয়ার্ড ও পূর্বের পাসওয়ার্ড একই! ভিন্ন একটি পাসওয়ার্ড দিন।');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateAdminPassword(next);
      if (res.success) {
        onSuccess('পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে! ক্লাউড ডাটাবেজে লাইভ সেভ হয়েছে।');
        handleClose();
      } else {
        setError(res.error || 'পাসওয়ার্ড পরিবর্তন করতে সমস্যা হয়েছে');
      }
    } catch (err: any) {
      setError(err?.message || 'পাসওয়ার্ড পরিবর্তন করতে সমস্যা হয়েছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-neutral-100 relative text-left animate-in zoom-in-95 duration-150">
        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 hover:text-neutral-800 flex items-center justify-center transition-colors cursor-pointer"
          aria-label="বন্ধ করুন"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-pink-100 text-[#ff146b] flex items-center justify-center shadow-xs">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-neutral-900 leading-tight">
                Password Change
              </h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-pink-50 text-[#ff146b] border border-pink-200">
                Security
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              এডমিন প্যানেলের লগইন পাসওয়ার্ড পরিবর্তন করুন
            </p>
          </div>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1.5">
              বর্তমান পাসওয়ার্ড (Current Password)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="পূর্বের পাসওয়ার্ড দিন (যেমন: admin1)"
                required
                className="w-full pl-10 pr-11 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm text-neutral-900 outline-none focus:bg-white focus:border-[#ff146b] focus:ring-2 focus:ring-[#ff146b]/20 transition-all placeholder:text-neutral-400"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-1 cursor-pointer"
                aria-label="Toggle password"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1.5">
              নতুন পাসওয়ার্ড (New Password)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="কমপক্ষে ৪ অক্ষরের নতুন পাসওয়ার্ড দিন"
                required
                className="w-full pl-10 pr-11 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm text-neutral-900 outline-none focus:bg-white focus:border-[#ff146b] focus:ring-2 focus:ring-[#ff146b]/20 transition-all placeholder:text-neutral-400"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-1 cursor-pointer"
                aria-label="Toggle password"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1.5">
              নতুন পাসওয়ার্ড আবার দিন (Confirm New Password)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="নতুন পাসওয়ার্ডটি আবার লিখুন"
                required
                className="w-full pl-10 pr-11 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm text-neutral-900 outline-none focus:bg-white focus:border-[#ff146b] focus:ring-2 focus:ring-[#ff146b]/20 transition-all placeholder:text-neutral-400"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-1 cursor-pointer"
                aria-label="Toggle password"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Helpful note */}
          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/70 text-[11px] text-neutral-500 leading-relaxed">
            <span className="font-bold text-neutral-700">টিপস:</span> পাসওয়ার্ড পরিবর্তন করলে তা ক্লাউড ডাটাবেজে স্বয়ংক্রিয়ভাবে সেভ হবে এবং আপনার সব ফোনে সাথে সাথে নতুন পাসওয়ার্ড চালু হয়ে যাবে।
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-gradient-to-r from-[#ff146b] to-[#e60055] hover:from-[#e60055] hover:to-[#cc004c] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-pink-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>সেভ হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>পাসওয়ার্ড পরিবর্তন করুন</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
