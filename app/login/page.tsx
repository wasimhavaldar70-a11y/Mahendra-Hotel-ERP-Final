'use client';

// ========================================================
// StayDesk CRM / HotelFlow CRM Login Screen
// Location: app/login/page.tsx
// ========================================================

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, setSessionUser, getSessionUser } from '../../lib/supabase/client';
import { KeyRound, Mail } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if already logged in
    const session = getSessionUser();
    if (session) {
      if (session.user.role === 'superadmin') {
        router.push('/super-admin');
      } else {
        router.push('/dashboard');
      }
    }
  }, [router]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await db.login(email, password);
      if (res) {
        setSessionUser(res);
        if (res.user.role === 'superadmin') {
          router.push('/super-admin');
        } else {
          router.push('/dashboard');
        }
      } else {
        setError('Invalid credentials');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FCFBF7] px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#0F4C45]/5 blur-[120px] opacity-70"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#D4AF37]/5 blur-[120px] opacity-70"></div>

      <div className="w-full max-w-md space-y-8 z-10">
        <div className="text-center">
          <img 
            src="/logo.jpg" 
            alt="StayDesk Logo" 
            className="w-16 h-16 rounded-2xl mx-auto mb-4 shadow-md object-cover border border-slate-100"
          />
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 font-serif">
            StayDesk
          </h2>
          <p className="mt-2 text-sm text-slate-500 font-medium">
            India's simplest Hotel Management Platform
          </p>
        </div>

        <div className="bg-white p-8 rounded-[24px] shadow-xl border border-[#E2E8F0]/40">
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 text-xs font-semibold text-red-600 border border-red-100">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border border-[#E2E8F0]/80 bg-slate-50/50 py-3 pl-10 pr-3 text-sm placeholder-slate-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-200"
                  placeholder="name@hotel.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <KeyRound className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border border-[#E2E8F0]/80 bg-slate-50/50 py-3 pl-10 pr-3 text-sm placeholder-slate-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-200"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center items-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all duration-200 disabled:opacity-50"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-solid border-white border-t-transparent"></div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Powered by Humble Goats */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              Powered by
            </span>
            <span className="text-xs font-black text-slate-700 mt-1 block tracking-wider hover:text-primary transition-colors cursor-default">
              Humble Goats
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
