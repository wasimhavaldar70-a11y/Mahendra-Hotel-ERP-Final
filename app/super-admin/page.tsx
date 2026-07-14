'use client';

// ========================================================
// StayDesk CRM / HotelFlow CRM Super Admin Console
// Location: app/super-admin/page.tsx
// ========================================================

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { db } from '../../lib/supabase/client';
import { Hotel } from '../../types';
import { 
  Building2, 
  Plus, 
  TrendingUp, 
  Users, 
  DoorClosed, 
  Crown,
  X,
  PlayCircle,
  PauseCircle,
  UserCog,
  Trash2
} from 'lucide-react';

export default function SuperAdminPage() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [hotelName, setHotelName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [plan, setPlan] = useState<'30 Days' | '90 Days' | '1 Year'>('30 Days');
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');

  const loadHotels = async () => {
    try {
      const data = await db.getHotels();
      setHotels(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHotels();

    const channel = new BroadcastChannel('hotelflow-sync');
    channel.onmessage = (event) => {
      if (event.data && event.data.type === 'DB_UPDATE') {
        loadHotels();
      }
    };

    return () => {
      channel.close();
    };
  }, []);

  const handleAddHotel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotelName || !ownerName || !email || !phone || !password) {
      setError('All fields including password are required.');
      return;
    }

    setError('');
    const emailMatch = hotels.some(h => h.email.toLowerCase() === email.toLowerCase());
    if (emailMatch) {
      setError(`Hotel owner with email ${email} already exists.`);
      return;
    }

    try {
      await db.addHotel({
        hotel_name: hotelName,
        owner_name: ownerName,
        phone,
        email,
        subscription_plan: plan,
        password
      });

      setHotelName('');
      setOwnerName('');
      setPhone('');
      setEmail('');
      setPassword('');
      setShowAddForm(false);
      loadHotels();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to bootstrap hotel account.');
    }
  };

  const handleToggleSubscription = async (id: string, currentStatus: Hotel['subscription_status']) => {
    const nextStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
    try {
      await db.updateHotelStatus(id, nextStatus);
      loadHotels();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteHotel = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete the hotel "${name}" and all of its rooms, guests, payments, and owner account? This action cannot be undone.`)) {
      return;
    }
    try {
      await db.deleteHotel(id);
      loadHotels();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to delete hotel.');
    }
  };

  const activeHotels = hotels.filter(h => h.subscription_status === 'Active').length;
  const suspendedHotels = hotels.filter(h => h.subscription_status === 'Suspended').length;

  // Dynamic MRR Calculation based on plan prices (₹2,500/mo for 30 Days, ₹2,000/mo for 90 Days, ₹1,500/mo for 1 Year)
  const mrr = hotels.reduce((acc, hotel) => {
    if (hotel.subscription_status !== 'Active') return acc;
    switch (hotel.subscription_plan) {
      case '30 Days': return acc + 2500;
      case '90 Days': return acc + 2000;
      case '1 Year': return acc + 1500;
      default: return acc;
    }
  }, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <UserCog className="w-5 h-5 text-primary" />
              SaaS Administration Panel
            </h1>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Control tenant accounts, check subscription billing dates, and suspend hotel access.</p>
          </div>

          <button
            onClick={() => setShowAddForm(true)}
            className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-red-200 transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Provision New Hotel
          </button>
        </div>

        {/* Global SaaS Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-[18px] border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Hotels Registered</span>
              <span className="text-xl font-black text-slate-800 mt-1">{hotels.length}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-[18px] border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Hotel Owners</span>
              <span className="text-xl font-black text-slate-800 mt-1">{hotels.length}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-[18px] border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Active Subscriptions</span>
              <span className="text-xl font-black text-emerald-600 mt-1">{activeHotels}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Crown className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-[18px] border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">MRR Revenue</span>
              <span className="text-xl font-black text-primary mt-1">₹{mrr.toLocaleString('en-IN')}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-50 text-primary flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Provision Hotel Drawer */}
        {showAddForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[24px] w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">Provision New Hotel Account</h3>
                <button onClick={() => setShowAddForm(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddHotel} className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 text-xs font-semibold text-red-600 rounded-xl border border-red-100">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Hotel Name *</label>
                  <input
                    type="text"
                    required
                    value={hotelName}
                    onChange={(e) => setHotelName(e.target.value)}
                    className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none"
                    placeholder="e.g. Taj Residency"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Owner Name *</label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none"
                    placeholder="e.g. Rajesh Kumar"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none"
                      placeholder="9876543210"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Subscription plan</label>
                    <select
                      value={plan}
                      onChange={(e) => setPlan(e.target.value as any)}
                      className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none"
                    >
                      <option value="30 Days">30 Days Pro</option>
                      <option value="90 Days">90 Days Premium</option>
                      <option value="1 Year">1 Year Enterprise</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Owner Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none"
                    placeholder="rajesh@tajresidency.com"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Owner Login Password *</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none"
                    placeholder="Set owner password (min 6 chars)"
                    minLength={6}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-primary text-white text-xs font-bold py-3 rounded-xl hover:bg-primary-hover shadow-lg shadow-red-200 transition-colors"
                  >
                    Save & Create Account
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="bg-slate-100 text-slate-600 text-xs font-bold px-4 py-3 rounded-xl hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Tenant Accounts List */}
        <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-50 bg-slate-50/30">
            <h2 className="text-sm font-bold text-slate-800">Active Tenant Properties</h2>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-4">Hotel Name</th>
                    <th className="px-6 py-4">Owner</th>
                    <th className="px-6 py-4">Contact</th>
                    <th className="px-6 py-4">Billing Plan</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
                  {hotels.map((hotel) => {
                    const isSuspended = hotel.subscription_status === 'Suspended';
                    return (
                      <tr key={hotel.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-extrabold text-slate-900">{hotel.hotel_name}</td>
                        <td className="px-6 py-4 text-slate-800">{hotel.owner_name}</td>
                        <td className="px-6 py-4 text-slate-500">
                          <div>{hotel.email}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{hotel.phone}</div>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-800">{hotel.subscription_plan}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${
                            isSuspended 
                              ? 'bg-red-50 text-red-700 border-red-100' 
                              : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          }`}>
                            {hotel.subscription_status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleSubscription(hotel.id, hotel.subscription_status)}
                            className={`font-bold px-3 py-1.5 rounded-lg transition-colors text-[10px] inline-flex items-center gap-1 border ${
                              isSuspended
                                ? 'bg-emerald-50 hover:bg-emerald-100/50 text-emerald-700 border-emerald-100'
                                : 'bg-red-50 hover:bg-red-100/50 text-red-700 border-red-100'
                            }`}
                          >
                            {isSuspended ? (
                              <>
                                <PlayCircle className="w-3.5 h-3.5" />
                                Activate
                              </>
                            ) : (
                              <>
                                <PauseCircle className="w-3.5 h-3.5" />
                                Suspend
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleDeleteHotel(hotel.id, hotel.hotel_name)}
                            className="bg-red-50 hover:bg-red-100/50 text-red-700 border border-red-100 font-bold px-3 py-1.5 rounded-lg transition-colors text-[10px] inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
