'use client';

// ========================================================
// StayDesk CRM / HotelFlow CRM Shared Dashboard Layout (Premium Theme)
// Location: components/DashboardLayout.tsx
// ========================================================

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  BedDouble, 
  Users, 
  ClipboardSignature, 
  LogOut, 
  Menu, 
  X, 
  Coins, 
  FilePieChart, 
  Settings, 
  Building2,
  Lock,
  DoorClosed
} from 'lucide-react';
import { getSessionUser, setSessionUser } from '../lib/supabase/client';
import { User, Hotel } from '../types';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentHotel, setCurrentHotel] = useState<Hotel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check session
    const session = getSessionUser();
    if (!session) {
      router.push('/login');
      return;
    }

    setCurrentUser(session.user);
    setCurrentHotel(session.hotel);
    setLoading(false);

    // Role-based route guard
    const isSA = session.user.role === 'superadmin';
    const path = window.location.pathname;

    if (isSA && path !== '/super-admin') {
      // Super admin can only access /super-admin
      router.push('/super-admin');
    } else if (!isSA && path === '/super-admin') {
      // Hotel owners cannot access /super-admin
      router.push('/dashboard');
    }
  }, [router, pathname]);

  const handleLogout = () => {
    setSessionUser(null);
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
          <span className="text-sm font-medium text-slate-500">Loading StayDesk...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) return null;

  const isSuperAdmin = currentUser.role === 'superadmin';

  // Navigation Items
  const menuItems = isSuperAdmin
    ? [
        { name: 'Hotels Admin', path: '/super-admin', icon: Building2 },
      ]
    : [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Rooms', path: '/rooms', icon: BedDouble },
        { name: 'Customers', path: '/customers', icon: Users },
        { name: 'Check In', path: '/check-in', icon: ClipboardSignature },
        { name: 'Check Out', path: '/check-out', icon: DoorClosed },
        { name: 'Payments', path: '/payments', icon: Coins },
        { name: 'Reports', path: '/reports', icon: FilePieChart },
        { name: 'Settings', path: '/settings', icon: Settings },
      ];

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col bg-gradient-to-b from-[#0F172A] to-[#1E293B] flex-shrink-0 border-r border-[#1E293B] shadow-2xl">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-800/40 bg-slate-900/10">
          <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-rose-500 text-white font-extrabold text-lg shadow-lg shadow-red-500/20 transform hover:scale-105 transition-transform duration-200">
            SD
          </div>
          <div>
            <h1 className="font-black text-white text-base leading-none tracking-tight">StayDesk CRM</h1>
            <span className="text-[9px] text-[#94A3B8] font-bold uppercase tracking-widest mt-1 block">PMS Platform</span>
          </div>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 px-4 py-6 space-y-2.5 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 transform ${
                  isActive 
                    ? 'bg-gradient-to-r from-primary to-rose-600 text-white shadow-lg shadow-red-500/15 translate-x-1' 
                    : 'text-[#94A3B8] hover:text-white hover:bg-white/5 hover:translate-x-0.5'
                }`}
              >
                <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-white' : 'text-[#64748B]'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Sign Out Footer */}
        <div className="p-4 border-t border-slate-800/40 bg-slate-900/10">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-[#94A3B8] hover:bg-red-500/15 hover:text-red-400 transition-all duration-200"
          >
            <LogOut className="w-4.5 h-4.5 text-[#64748B] group-hover:text-red-400" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Sidebar - Mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-slate-950/60 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-[260px] flex flex-col bg-gradient-to-b from-[#0F172A] to-[#1E293B] h-full shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800/40 bg-slate-900/10">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-rose-500 text-white font-extrabold shadow-md">
                  SD
                </div>
                <h1 className="font-black text-white text-sm tracking-tight">StayDesk</h1>
              </div>
              <button 
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded-lg text-[#94A3B8] hover:bg-white/5 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
              {menuItems.map((item) => {
                const isActive = pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                      isActive 
                        ? 'bg-gradient-to-r from-primary to-rose-600 text-white shadow-lg shadow-red-500/15' 
                        : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-white' : 'text-[#64748B]'}`} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-800/40 bg-slate-900/10">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-[#94A3B8] hover:bg-red-500/15 hover:text-red-400 transition-all duration-200"
              >
                <LogOut className="w-4.5 h-4.5 text-[#64748B]" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md border-b border-slate-100/80 h-[70px] sticky top-0 z-40 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 rounded-xl text-slate-500 hover:bg-slate-50 md:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>

            {isSuperAdmin ? (
              <div className="flex items-center gap-2">
                <div className="bg-violet-50 text-violet-700 border border-violet-100 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold">
                  <Lock className="w-3.5 h-3.5" />
                  Super Admin Console
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 text-slate-500">
                  <Building2 className="w-4.5 h-4.5" />
                </div>
                <span className="font-extrabold text-slate-800 text-base leading-tight truncate max-w-[200px] sm:max-w-none">
                  {currentHotel?.hotel_name}
                </span>
                <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100">
                  {currentHotel?.subscription_plan}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                {isSuperAdmin ? 'Administrator' : currentHotel?.owner_name || 'Owner'}
              </span>
              <span className="text-xs font-bold text-slate-700 mt-1">{currentUser.email}</span>
            </div>
            
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-50 to-slate-100/50 border border-slate-200/60 shadow-sm font-black text-slate-700 text-xs">
              {(isSuperAdmin ? 'Admin' : currentHotel?.owner_name || 'O').substring(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#F8FAFC] pb-10">
          {children}
        </main>
      </div>
    </div>
  );
}
