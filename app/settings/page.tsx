'use client';

// ========================================================
// StayDesk CRM / HotelFlow CRM Settings Screen
// Location: app/settings/page.tsx
// ========================================================

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { getSessionUser } from '../../lib/supabase/client';
import { 
  Settings, 
  Building2, 
  Mail, 
  Phone, 
  CalendarDays, 
  Crown,
  ToggleLeft,
  ToggleRight,
  Shield,
  MessageSquare
} from 'lucide-react';

export default function SettingsPage() {
  const [currentHotel, setCurrentHotel] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Future features states
  const [features, setFeatures] = useState({
    qrCheckin: false,
    whatsapp: false,
    sms: false,
    doorLocks: false,
    gst: false
  });

  useEffect(() => {
    const session = getSessionUser();
    if (session) {
      setCurrentHotel(session.hotel);
      setCurrentUser(session.user);
    }
    setLoading(false);
  }, []);

  const toggleFeature = (key: keyof typeof features) => {
    setFeatures(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-[65vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Hotel Configuration
          </h1>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Manage details of your property, active subscription, and configure future add-ons.</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm space-y-6">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-50 pb-2 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-primary" />
            Property Particulars
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Hotel Name</span>
              <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 text-xs font-bold">
                <Building2 className="w-4 h-4 text-slate-400" />
                <span>{currentHotel?.hotel_name}</span>
              </div>
            </div>

            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Owner Name</span>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 text-xs font-bold">
                <span>{currentHotel?.owner_name}</span>
              </div>
            </div>

            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</span>
              <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 text-xs font-bold">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>{currentHotel?.email}</span>
              </div>
            </div>

            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Phone Number</span>
              <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 text-xs font-bold">
                <Phone className="w-4 h-4 text-slate-400" />
                <span>{currentHotel?.phone}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription details */}
        <div className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm space-y-6">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-50 pb-2 flex items-center gap-1.5">
            <Crown className="w-4 h-4 text-amber-500" />
            SaaS Plan & Billing
          </h3>

          <div className="flex items-center justify-between p-4 bg-amber-50/15 border border-amber-100/50 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-slate-800">
                  {currentHotel?.subscription_plan === 'Lifetime' ? 'Lifetime License' : 'Premium Professional Suite'}
                </h4>
                <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block">
                  Plan tier: {currentHotel?.subscription_plan === 'Lifetime' ? 'Lifetime (One-Time Sale)' : currentHotel?.subscription_plan}
                </span>
                {currentHotel?.subscription_plan === 'Lifetime' && (
                  <span className="text-[9px] text-slate-500 font-semibold mt-1 block">
                    * Annual maintenance: ₹5,000/yr (Domain Renewal & Supabase Database)
                  </span>
                )}
              </div>
            </div>

            <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
              Active Stay
            </span>
          </div>
        </div>

        {/* Coming soon integrations (Add-ons) */}
        <div className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-primary" />
              Powerpack Add-ons
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Toggle these beta features to customize your desk operations.</p>
          </div>

          <div className="space-y-4">
            {/* WhatsApp */}
            <div className="flex items-center justify-between py-3 border-b border-slate-50">
              <div>
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  WhatsApp Bookings & Receipts
                  <span className="bg-red-50 text-primary text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Future</span>
                </h4>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Send reservation receipts, check-ins, and checkout confirmations via WhatsApp.</p>
              </div>
              <button onClick={() => toggleFeature('whatsapp')} className="text-slate-400">
                {features.whatsapp ? <ToggleRight className="w-10 h-10 text-emerald-600" /> : <ToggleLeft className="w-10 h-10 text-slate-300" />}
              </button>
            </div>

            {/* QR Checkin */}
            <div className="flex items-center justify-between py-3 border-b border-slate-50">
              <div>
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  QR Code Desk Check-In
                  <span className="bg-red-50 text-primary text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Future</span>
                </h4>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Guests scan a table QR at the counter to self-register their Aadhaar card.</p>
              </div>
              <button onClick={() => toggleFeature('qrCheckin')} className="text-slate-400">
                {features.qrCheckin ? <ToggleRight className="w-10 h-10 text-emerald-600" /> : <ToggleLeft className="w-10 h-10 text-slate-300" />}
              </button>
            </div>

            {/* SMS */}
            <div className="flex items-center justify-between py-3 border-b border-slate-50">
              <div>
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  Transactional SMS Notifications
                  <span className="bg-red-50 text-primary text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Future</span>
                </h4>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Automate welcome messages and pending invoice links.</p>
              </div>
              <button onClick={() => toggleFeature('sms')} className="text-slate-400">
                {features.sms ? <ToggleRight className="w-10 h-10 text-emerald-600" /> : <ToggleLeft className="w-10 h-10 text-slate-300" />}
              </button>
            </div>

            {/* Smart Lock */}
            <div className="flex items-center justify-between py-3">
              <div>
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  RFID Digital Door Lock Keys
                  <span className="bg-red-50 text-primary text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Future</span>
                </h4>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Program and print room cards immediately on successful check-in.</p>
              </div>
              <button onClick={() => toggleFeature('doorLocks')} className="text-slate-400">
                {features.doorLocks ? <ToggleRight className="w-10 h-10 text-emerald-600" /> : <ToggleLeft className="w-10 h-10 text-slate-300" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
