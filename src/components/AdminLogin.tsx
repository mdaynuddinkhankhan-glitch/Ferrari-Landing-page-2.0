import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, User, AlertCircle } from 'lucide-react';
import { checkAdminCredentials, subscribeToAdminPassword } from '../services/adminAuthService';

interface AdminLoginProps {
  onLoginSuccess: () => void;
  onBackToStore: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onBackToStore }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAdminPassword(() => {
      // synched latest password
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      if (checkAdminCredentials(username, password)) {
        onLoginSuccess();
      } else {
        setError('ভুল ইউজারনেম অথবা পাসওয়ার্ড! অনুগ্রহ করে সঠিক তথ্য দিন।');
      }
    }, 300);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fd] flex flex-col justify-center items-center p-4 selection:bg-[#4f46e5] selection:text-white relative">
      {/* Background soft dots pattern */}
      <div
        className="absolute inset-0 opacity-[0.4] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#c7d2fe 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="w-full max-w-[430px] bg-white rounded-3xl p-7 sm:p-9 shadow-[0_15px_35px_rgba(0,0,0,0.06)] border border-neutral-100 z-10">
        {/* Brand Logo Header */}
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#e11d48] to-[#ff146b] flex items-center justify-center shadow-md text-white font-extrabold text-sm tracking-wider">
            PB
          </div>
          <h1 className="text-2xl font-extrabold text-[#e11d48] tracking-tight">
            Porshi Bari Admin
          </h1>
        </div>

        {/* Welcome greeting */}
        <div className="mb-6 text-left">
          <h2 className="text-xl sm:text-2xl font-bold text-neutral-800 flex items-center gap-2">
            Welcome to Porshi Bari Admin! <span className="text-2xl">👋</span>
          </h2>
          <p className="text-neutral-400 text-sm mt-1 font-medium">
            Please sign in to your admin account
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-600 flex items-center gap-2 text-xs sm:text-sm font-semibold animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
              Username
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-xl text-neutral-800 text-sm outline-none focus:border-[#6366f1] focus:ring-4 focus:ring-[#6366f1]/10 transition-all placeholder:text-neutral-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-xl text-neutral-800 text-sm outline-none focus:border-[#6366f1] focus:ring-4 focus:ring-[#6366f1]/10 transition-all placeholder:text-neutral-400 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors p-1"
                aria-label="Toggle password visibility"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-[#5046e5] to-[#6366f1] hover:from-[#4338ca] hover:to-[#4f46e5] text-white rounded-xl font-bold text-sm sm:text-base shadow-lg shadow-[#4f46e5]/25 transition-all active:scale-[0.98] disabled:opacity-70 cursor-pointer"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-8 text-center">
          <p className="text-xs font-semibold text-neutral-400">
            Porshi Bari Admin Panel
          </p>
          <button
            type="button"
            onClick={onBackToStore}
            className="mt-3 text-xs font-medium text-[#e11d48] hover:underline cursor-pointer"
          >
            ← মূল ওয়েবসাইটে ফিরে যান
          </button>
        </div>
      </div>
    </div>
  );
};
