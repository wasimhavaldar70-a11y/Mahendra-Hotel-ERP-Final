'use client';

// ========================================================
// StayDesk CRM / HotelFlow CRM Shared Dashboard Layout (Premium Theme)
// Location: components/DashboardLayout.tsx
// ========================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  DoorClosed,
  Calendar,
  Globe,
  ChevronLeft,
  MoreHorizontal
} from 'lucide-react';
import { getSessionUser, setSessionUser, supabase, isRealSupabase, db } from '../lib/supabase/client';
import { User, Hotel } from '../types';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpenRaw] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Swipe-to-close sidebar
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Body scroll lock when mobile sidebar is open
  const setSidebarOpen = (open: boolean) => {
    setSidebarOpenRaw(open);
    if (typeof document !== 'undefined') {
      if (open) {
        document.body.classList.add('scroll-locked');
      } else {
        document.body.classList.remove('scroll-locked');
      }
    }
  };

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentHotel, setCurrentHotel] = useState<Hotel | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('hf_sidebar_collapsed');
      if (stored === 'true') {
        setIsCollapsed(true);
      }
    }
  }, []);

  const toggleCollapse = () => {
    const newVal = !isCollapsed;
    setIsCollapsed(newVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hf_sidebar_collapsed', String(newVal));
    }
  };

  const loadPendingCount = async (hotelId: string) => {
    try {
      const data = await db.getPendingBookingRequests(hotelId);
      setPendingCount(data.length);
    } catch (err) {
      console.error(err);
    }
  };

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

    if (session.hotel) {
      loadPendingCount(session.hotel.id);

      const channel = new BroadcastChannel('hotelflow-sync');
      channel.onmessage = (event) => {
        if (event.data && event.data.type === 'DB_UPDATE') {
          loadPendingCount(session.hotel.id);
        }
      };

      return () => {
        channel.close();
      };
    }
  }, [router, pathname]);

  const handleLogout = async () => {
    // 1. Clear session
    setSessionUser(null);

    // 2. Clear all local storage keys starting with hf_ (mock database tables)
    if (typeof window !== 'undefined') {
      const keysToDelete: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('hf_')) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => localStorage.removeItem(key));
    }

    // 3. Clear Supabase Auth state if real Supabase connection is active
    if (isRealSupabase && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Error during Supabase signout:', err);
      }
    }

    router.push('/login');
  };

  // ── Swipe-to-close sidebar on mobile ──────────────────────
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    const dy = Math.abs(touchStartY.current - e.changedTouches[0].clientY);
    // Close if swipe left > 50px and mostly horizontal
    if (dx > 50 && dy < 80) {
      setSidebarOpen(false);
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }, []);

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
  const isReceptionist = currentUser.role === 'receptionist';

  // Navigation Items
  const menuItems = isSuperAdmin
    ? [
        { name: 'Hotels Admin', path: '/super-admin', icon: Building2 },
      ]
    : [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Rooms', path: '/rooms', icon: BedDouble },
        { name: 'Bookings', path: '/bookings', icon: Calendar },
        { name: 'Customers', path: '/customers', icon: Users },
        { name: 'Check In', path: '/check-in', icon: ClipboardSignature },
        { name: 'Check Out', path: '/check-out', icon: DoorClosed },
        { name: 'Payments', path: '/payments', icon: Coins },
        { name: 'Reports', path: '/reports', icon: FilePieChart },
        ...(!isReceptionist ? [{ name: 'Settings', path: '/settings', icon: Settings }] : []),
      ];

  // Bottom nav shows top 4 items + "More" for the rest (non-superadmin)
  const bottomNavItems = isSuperAdmin
    ? [{ name: 'Hotels', path: '/super-admin', icon: Building2 }]
    : [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Check In', path: '/check-in', icon: ClipboardSignature },
        { name: 'Check Out', path: '/check-out', icon: DoorClosed },
        { name: 'Rooms', path: '/rooms', icon: BedDouble },
      ];

  const handleBottomNavTap = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(8);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 has-bottom-nav">
      {/* ── Sidebar - Desktop ──────────────────────────────── */}
      <aside className={`hidden md:flex md:flex-col bg-[#083B36] flex-shrink-0 border-r border-[#0D443E]/30 shadow-none transition-all duration-300 ${
        isCollapsed ? 'md:w-20' : 'md:w-64'
      }`}>
        {/* Brand Header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-[#0D443E]/30 bg-[#083B36]">
          <div className="flex items-center gap-3 overflow-hidden">
            <img 
              src="/logo.jpg" 
              alt="StayDesk Logo" 
              className="w-9 h-9 rounded-xl object-cover border border-[#0D443E]/50 shadow-sm shrink-0"
            />
            {!isCollapsed && (
              <div className="animate-in fade-in duration-300">
                <h1 className="font-bold text-white text-sm leading-none tracking-tight">StayDesk</h1>
                <span className="text-[9px] text-emerald-400 font-semibold uppercase tracking-widest mt-1 block">PMS Console</span>
              </div>
            )}
          </div>
          <button 
            onClick={toggleCollapse} 
            className="p-1.5 rounded-lg text-emerald-400 hover:bg-[#0F5D52]/50 hover:text-white hidden md:block shrink-0"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <ChevronLeft className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Sidebar Nav */}
        <nav className={`flex-1 py-6 space-y-1.5 overflow-y-auto ${isCollapsed ? 'px-3' : 'px-4'}`}>
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            const Icon = item.icon;
            
            if ('external' in item && item.external) {
              return (
                <a
                  key={item.name}
                  href={item.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-3 rounded-lg text-sm font-medium text-emerald-100/80 hover:text-white hover:bg-[#0D443E]/40 transition-all duration-150 ${
                    isCollapsed ? 'justify-center p-2.5' : 'px-4 py-2.5'
                  }`}
                  title={isCollapsed ? item.name : undefined}
                >
                  <Icon className="w-4 h-4 text-emerald-400 shrink-0" />
                  {!isCollapsed && <span className="truncate">{item.name}</span>}
                </a>
              );
            }

            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center rounded-lg text-sm font-medium transition-all duration-150 ${
                  isCollapsed ? 'justify-center p-2.5' : 'justify-between px-4 py-2.5'
                } ${
                  isActive 
                    ? 'bg-primary text-white font-semibold shadow-md shadow-[#083B36]/20' 
                    : 'text-emerald-100/80 hover:text-white hover:bg-[#0D443E]/40'
                }`}
                title={isCollapsed ? item.name : undefined}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-emerald-400 group-hover:text-white'}`} />
                  {!isCollapsed && <span className="truncate">{item.name}</span>}
                </div>
                {!isCollapsed && item.name === 'Dashboard' && pendingCount > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-550 text-[10px] font-black text-white shadow-sm animate-pulse normal-case shrink-0">
                    {pendingCount}
                  </span>
                )}
                {isCollapsed && item.name === 'Dashboard' && pendingCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-2.5 w-2.5 rounded-full bg-red-550 ring-2 ring-white"></span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sign Out Footer */}
        <div className="p-4 border-t border-[#0D443E]/30 bg-[#083B36]">
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 rounded-lg text-sm font-medium text-emerald-100/80 hover:bg-[#0D443E]/40 hover:text-white transition-all duration-150 ${
              isCollapsed ? 'justify-center p-2.5 w-full' : 'px-4 py-2.5 w-full'
            }`}
            title={isCollapsed ? "Sign Out" : undefined}
          >
            <LogOut className="w-4 h-4 text-emerald-400 shrink-0" />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ── Sidebar - Mobile drawer ───────────────────────── */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-50 flex md:hidden bg-slate-950/40 backdrop-blur-sm animate-fade-overlay" 
          onClick={() => setSidebarOpen(false)}
        >
          <div 
            className="relative w-full max-w-[280px] flex flex-col bg-[#083B36] border-r border-[#0D443E]/30 h-full shadow-2xl animate-slide-left safe-bottom" 
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#0D443E]/30 bg-[#083B36]">
              <div className="flex items-center gap-3">
                <img 
                  src="/logo.jpg" 
                  alt="StayDesk Logo" 
                  className="w-8 h-8 rounded-lg object-cover border border-[#0D443E]/50 shadow-sm"
                />
                <h1 className="font-bold text-white text-sm tracking-tight">StayDesk</h1>
              </div>
              <button 
                onClick={() => setSidebarOpen(false)}
                className="p-2.5 rounded-lg text-emerald-400 hover:bg-[#0F5D52]/50 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Close navigation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
              {menuItems.map((item) => {
                const isActive = pathname === item.path;
                const Icon = item.icon;

                if ('external' in item && item.external) {
                  return (
                    <a
                      key={item.name}
                      href={item.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setSidebarOpen(false)}
                      className="flex items-center gap-3 px-4 py-3.5 rounded-lg text-sm font-medium text-emerald-100/80 hover:text-white hover:bg-[#0D443E]/40 transition-all duration-150"
                    >
                      <Icon className="w-4 h-4 text-emerald-400" />
                      {item.name}
                    </a>
                  );
                }

                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => {
                      setSidebarOpen(false);
                      handleBottomNavTap();
                    }}
                    className={`flex items-center justify-between px-4 py-3.5 rounded-lg text-sm font-medium transition-all duration-150 active:scale-[0.97] ${
                      isActive 
                        ? 'bg-primary text-white font-semibold shadow-md shadow-[#083B36]/20' 
                        : 'text-emerald-100/80 hover:text-white hover:bg-[#0D443E]/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-emerald-400 group-hover:text-white'}`} />
                      {item.name}
                    </div>
                    {item.name === 'Dashboard' && pendingCount > 0 && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white shadow-sm animate-pulse normal-case shrink-0">
                        {pendingCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-[#0D443E]/30 bg-[#083B36]">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-4 py-3.5 rounded-lg text-sm font-medium text-emerald-100/80 hover:bg-[#0D443E]/40 hover:text-white transition-all duration-150"
              >
                <LogOut className="w-4 h-4 text-emerald-400" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content Area ─────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-white/90 backdrop-blur-md border-b border-slate-100 h-[60px] sm:h-[70px] sticky top-0 z-40 shadow-sm safe-top">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Hamburger — only shown on mobile when needed for full menu access */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2.5 -ml-1 rounded-xl text-slate-500 hover:bg-slate-50 md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-[0.93] active:bg-slate-100 transition-all duration-75"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {isSuperAdmin ? (
              <div className="flex items-center gap-2">
                <div className="bg-emerald-55/10 text-primary border border-[#0F5D52]/20 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold">
                  <Lock className="w-3.5 h-3.5" />
                  Super Admin Console
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-slate-50 border border-slate-200/60 text-slate-600">
                  <Building2 className="w-4.5 h-4.5" />
                </div>
                <span className="font-bold text-slate-800 text-sm leading-tight truncate max-w-[120px] sm:max-w-[200px] md:max-w-none">
                  {currentHotel?.hotel_name}
                </span>
                <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-[#0F5D52]/10 text-primary border border-[#0F5D52]/20">
                  {currentHotel?.subscription_plan}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">
                {isSuperAdmin ? 'Administrator' : currentHotel?.owner_name || 'Owner'}
              </span>
              <span className="text-xs font-semibold text-slate-550 mt-1">{currentUser.email}</span>
            </div>
            
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#0F5D52]/10 border border-[#0F5D52]/20 shadow-sm font-bold text-primary text-xs">
              {(isSuperAdmin ? 'Admin' : currentHotel?.owner_name || 'O').substring(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 bg-slate-50/30 pb-10 safe-bottom">
          {children}
        </main>
      </div>

      {/* ── Mobile Bottom Navigation Bar ─────────────────── */}
      {!isSuperAdmin && (
        <nav className="bottom-nav md:hidden" aria-label="Bottom navigation">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            const hasBadge = item.name === 'Dashboard' && pendingCount > 0;

            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={handleBottomNavTap}
                className={`bottom-nav-item ${isActive ? 'active' : ''}`}
                aria-label={item.name}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="relative">
                  <Icon className={`w-5 h-5 transition-transform duration-75 ${isActive ? 'scale-110' : ''}`} />
                  {hasBadge && (
                    <span className="absolute -top-1 -right-1 flex h-2 w-2 rounded-full bg-red-500 ring-1 ring-white" />
                  )}
                </span>
                <span className={`text-[10px] font-semibold leading-none ${isActive ? 'font-bold' : ''}`}>
                  {item.name === 'Check In' ? 'Check In' : item.name === 'Check Out' ? 'Check Out' : item.name}
                </span>
              </Link>
            );
          })}

          {/* More button — opens sidebar drawer for remaining items */}
          <button
            type="button"
            onClick={() => {
              setSidebarOpen(true);
              handleBottomNavTap();
            }}
            className={`bottom-nav-item ${
              !bottomNavItems.some(i => i.path === pathname) && pathname !== '/dashboard' 
                ? 'active' 
                : ''
            }`}
            aria-label="More navigation options"
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] font-semibold leading-none">More</span>
          </button>
        </nav>
      )}
    </div>
  );
}
