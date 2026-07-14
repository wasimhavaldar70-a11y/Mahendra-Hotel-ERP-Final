'use client';

// ========================================================
// StayDesk CRM / HotelFlow CRM Login Screen
// Location: app/login/page.tsx
// ========================================================

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, setSessionUser, getSessionUser } from '../../lib/supabase/client';
import { KeyRound, Mail, Sparkles, Building2, UserCog } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123'); // Default password
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

  const handleQuickDemoSelect = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('wasim@705853');
    // Automatically login with demo account
    setLoading(true);
    setError('');
    setTimeout(async () => {
      try {
        const res = await db.login(demoEmail, 'wasim@705853');
        if (res) {
          setSessionUser(res);
          if (res.user.role === 'superadmin') {
            router.push('/super-admin');
          } else {
            router.push('/dashboard');
          }
        }
      } catch (err) {
        setError('Demo login failed');
      } finally {
        setLoading(false);
      }
    }, 400);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-red-100 blur-[120px] opacity-70"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-100 blur-[120px] opacity-70"></div>

      <div className="w-full max-w-md space-y-8 z-10">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-white font-black text-2xl shadow-xl shadow-red-200 mb-4 animate-bounce">
            SD
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
            StayDesk CRM
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            India's simplest Hotel Management Platform
          </p>
        </div>

        <div className="bg-white p-8 rounded-[24px] shadow-xl border border-slate-100/50">
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
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-10 pr-3 text-sm placeholder-slate-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-200"
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
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-10 pr-3 text-sm placeholder-slate-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-200"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center items-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-lg shadow-red-200 hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all duration-200 disabled:opacity-50"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-solid border-white border-t-transparent"></div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Quick Demo Selector */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-1.5 justify-center text-xs font-semibold text-slate-400 mb-4 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Demo Fast Pass
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleQuickDemoSelect('wasimhavaldar70@gmail.com')}
                className="flex flex-col items-center gap-1 px-3 py-3 rounded-xl border border-slate-100 hover:border-red-200 hover:bg-red-50/20 text-center transition-all duration-200 group"
              >
                <UserCog className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />
                <span className="text-xs font-bold text-slate-700">Super Admin</span>
                <span className="text-[10px] text-slate-400">wasimhavaldar70@gmail.com</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoSelect('admin@staydesk.com')}
                className="flex flex-col items-center gap-1 px-3 py-3 rounded-xl border border-slate-100 hover:border-red-200 hover:bg-red-50/20 text-center transition-all duration-200 group"
              >
                <Building2 className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />
                <span className="text-xs font-bold text-slate-700">Backup Admin</span>
                <span className="text-[10px] text-slate-400">admin@staydesk.com</span>
              </button>
            </div>
            
            <div className="mt-4 text-center">
              <span className="text-[11px] text-slate-400">
                Type any email to auto-register a new hotel.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
