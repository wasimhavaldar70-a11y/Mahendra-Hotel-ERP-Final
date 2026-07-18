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
  DoorClosed,
  Calendar,
  Globe,
  ChevronLeft
} from 'lucide-react';
import { getSessionUser, setSessionUser, supabase, isRealSupabase, db } from '../lib/supabase/client';
import { User, Hotel } from '../types';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
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

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar - Desktop */}
      <aside className={`hidden md:flex md:flex-col bg-white flex-shrink-0 border-r border-slate-200/80 shadow-none transition-all duration-300 ${
        isCollapsed ? 'md:w-20' : 'md:w-64'
      }`}>
        {/* Brand Header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3 overflow-hidden">
            <img 
              src="/logo.jpg" 
              alt="StayDesk Logo" 
              className="w-9 h-9 rounded-xl object-cover border border-slate-100 shadow-sm shrink-0"
            />
            {!isCollapsed && (
              <div className="animate-in fade-in duration-300">
                <h1 className="font-bold text-slate-800 text-sm leading-none tracking-tight">StayDesk</h1>
                <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-widest mt-1 block">PMS Console</span>
              </div>
            )}
          </div>
          <button 
            onClick={toggleCollapse} 
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 hidden md:block shrink-0"
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
                  className={`flex items-center gap-3 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all duration-150 ${
                    isCollapsed ? 'justify-center p-2.5' : 'px-4 py-2.5'
                  }`}
                  title={isCollapsed ? item.name : undefined}
                >
                  <Icon className="w-4 h-4 text-slate-400 shrink-0" />
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
                    ? 'bg-purple-50 text-primary font-semibold shadow-none' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
                title={isCollapsed ? item.name : undefined}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600'}`} />
                  {!isCollapsed && <span className="truncate">{item.name}</span>}
                </div>
                {!isCollapsed && item.name === 'Dashboard' && pendingCount > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white shadow-sm animate-pulse normal-case shrink-0">
                    {pendingCount}
                  </span>
                )}
                {isCollapsed && item.name === 'Dashboard' && pendingCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"></span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sign Out Footer */}
        <div className="p-4 border-t border-slate-100 bg-white">
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all duration-150 ${
              isCollapsed ? 'justify-center p-2.5 w-full' : 'px-4 py-2.5 w-full'
            }`}
            title={isCollapsed ? "Sign Out" : undefined}
          >
            <LogOut className="w-4 h-4 text-slate-400 shrink-0" />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Sidebar - Mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-slate-950/40 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-[260px] flex flex-col bg-white border-r border-slate-200 h-full shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-white">
              <div className="flex items-center gap-3">
                <img 
                  src="/logo.jpg" 
                  alt="StayDesk Logo" 
                  className="w-8 h-8 rounded-lg object-cover border border-slate-100 shadow-sm"
                />
                <h1 className="font-bold text-slate-800 text-sm tracking-tight">StayDesk</h1>
              </div>
              <button 
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600"
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
                      className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all duration-150"
                    >
                      <Icon className="w-4 h-4 text-slate-400" />
                      {item.name}
                    </a>
                  );
                }

                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                      isActive 
                        ? 'bg-purple-50 text-primary font-semibold shadow-none' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600'}`} />
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

            <div className="p-4 border-t border-slate-100 bg-white">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all duration-150"
              >
                <LogOut className="w-4 h-4 text-slate-400" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md border-b border-slate-200/50 h-[70px] sticky top-0 z-40 shadow-sm">
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
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/60 text-slate-600">
                  <Building2 className="w-4.5 h-4.5" />
                </div>
                <span className="font-bold text-slate-800 text-sm leading-tight truncate max-w-[200px] sm:max-w-none">
                  {currentHotel?.hotel_name}
                </span>
                <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-semibold bg-purple-50 text-primary border border-purple-100/60">
                  {currentHotel?.subscription_plan}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[9px] font-medium text-slate-400 uppercase tracking-wider leading-none">
                {isSuperAdmin ? 'Administrator' : currentHotel?.owner_name || 'Owner'}
              </span>
              <span className="text-xs font-semibold text-slate-600 mt-1">{currentUser.email}</span>
            </div>
            
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/80 shadow-sm font-semibold text-slate-700 text-xs">
              {(isSuperAdmin ? 'Admin' : currentHotel?.owner_name || 'O').substring(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/30 pb-10">
          {children}
        </main>
      </div>
    </div>
  );
}
