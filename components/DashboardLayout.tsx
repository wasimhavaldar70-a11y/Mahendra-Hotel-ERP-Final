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
  Globe
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentHotel, setCurrentHotel] = useState<Hotel | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

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
        { name: 'Settings', path: '/settings', icon: Settings },
      ];

  return (
    <div className="flex h-screen overflow-hidden bg-[#FCFBF7]">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col bg-gradient-to-b from-[#0B2C24] via-[#0F4C45] to-[#12372A] flex-shrink-0 border-r border-[#12372A]/20 shadow-2xl">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10 bg-black/10">
          <img 
            src="/logo.jpg" 
            alt="StayDesk Logo" 
            className="w-10 h-10 rounded-xl object-cover border border-white/15 shadow-md animate-pulse"
          />
          <div>
            <h1 className="font-black text-white text-base leading-none tracking-tight">StayDesk</h1>
            <span className="text-[9px] text-[#A0AEC0] font-bold uppercase tracking-widest mt-1 block">PMS Platform</span>
          </div>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 px-4 py-6 space-y-2.5 overflow-y-auto">
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
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] tracking-widest font-black uppercase text-[#A0AEC0] hover:text-white hover:bg-white/5 hover:translate-x-0.5 transition-all duration-200 transform"
                >
                  <Icon className="w-4.5 h-4.5 text-[#64748B]" />
                  {item.name}
                </a>
              );
            }

            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center justify-between px-4 py-3 rounded-xl text-[10px] tracking-widest font-black uppercase transition-all duration-200 transform ${
                  isActive 
                    ? 'bg-white/10 text-white border-l-2 border-accent-gold shadow-sm translate-x-1' 
                    : 'text-[#A0AEC0] hover:text-white hover:bg-white/5 hover:translate-x-0.5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-accent-gold' : 'text-[#64748B]'}`} />
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

        {/* Sign Out Footer */}
        <div className="p-4 border-t border-white/10 bg-black/10">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-[10px] tracking-widest font-black uppercase text-[#A0AEC0] hover:bg-white/5 hover:text-white transition-all duration-200"
          >
            <LogOut className="w-4.5 h-4.5 text-[#64748B]" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Sidebar - Mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-slate-950/60 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-[260px] flex flex-col bg-gradient-to-b from-[#0B2C24] via-[#0F4C45] to-[#12372A] h-full shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-black/10">
              <div className="flex items-center gap-3">
                <img 
                  src="/logo.jpg" 
                  alt="StayDesk Logo" 
                  className="w-8 h-8 rounded-lg object-cover border border-white/15 shadow-md animate-pulse"
                />
                <h1 className="font-black text-white text-sm tracking-tight">StayDesk</h1>
              </div>
              <button 
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded-lg text-[#A0AEC0] hover:bg-white/5 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
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
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] tracking-widest font-black uppercase text-[#A0AEC0] hover:text-white hover:bg-white/5 transition-all duration-200"
                    >
                      <Icon className="w-4.5 h-4.5 text-[#64748B]" />
                      {item.name}
                    </a>
                  );
                }

                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl text-[10px] tracking-widest font-black uppercase transition-all duration-200 ${
                      isActive 
                        ? 'bg-white/10 text-white border-l-2 border-accent-gold shadow-sm' 
                        : 'text-[#A0AEC0] hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-accent-gold' : 'text-[#64748B]'}`} />
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

            <div className="p-4 border-t border-white/10 bg-black/10">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-[10px] tracking-widest font-black uppercase text-[#A0AEC0] hover:bg-white/5 hover:text-white transition-all duration-200"
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
        <header className="flex items-center justify-between px-6 py-4 bg-white/60 backdrop-blur-md border-b border-[#E2E8F0]/30 h-[70px] sticky top-0 z-40 shadow-sm">
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
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#FCFBF7] border border-[#E2E8F0]/50 text-primary">
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
            
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FCFBF7] to-white border border-[#E2E8F0]/60 shadow-sm font-black text-slate-700 text-xs">
              {(isSuperAdmin ? 'Admin' : currentHotel?.owner_name || 'O').substring(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#FCFBF7] pb-10">
          {children}
        </main>
      </div>
    </div>
  );
}
