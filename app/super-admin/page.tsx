'use client';

// ========================================================
// StayDesk CRM / HotelFlow CRM Super Admin Console
// Location: app/super-admin/page.tsx
// ========================================================

import React, { useState, useEffect } from 'react';
import { validatePassword } from '../../lib/passwordStrength';
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
  Trash2,
  Key,
  Eye,
  EyeOff
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
  const [plan, setPlan] = useState<'30 Days' | '90 Days' | '1 Year' | 'Lifetime'>('Lifetime');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Password Reset states
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetHotelEmail, setResetHotelEmail] = useState('');
  const [resetHotelName, setResetHotelName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

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

    let syncTimeout: NodeJS.Timeout | null = null;
    const channel = new BroadcastChannel('hotelflow-sync');
    channel.onmessage = (event) => {
      if (event.data && event.data.type === 'DB_UPDATE') {
        if (syncTimeout) clearTimeout(syncTimeout);
        // Apply jittered debounce (300ms to 800ms) to stagger DB hits across open tabs
        const delay = 300 + Math.random() * 500;
        syncTimeout = setTimeout(() => {
          loadHotels();
        }, delay);
      }
    };

    return () => {
      if (syncTimeout) clearTimeout(syncTimeout);
      channel.close();
    };
  }, []);

  const handleAddHotel = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    if (!hotelName.trim()) {
      newErrors.hotelName = 'Hotel Name is required';
    }
    
    if (!ownerName.trim()) {
      newErrors.ownerName = 'Owner Name is required';
    } else if (!/^[a-zA-Z\s]+$/.test(ownerName)) {
      newErrors.ownerName = 'Owner Name must only contain letters and spaces';
    }

    if (!phone) {
      newErrors.phone = 'Phone Number is required';
    } else if (phone.length !== 10 || !/^\d{10}$/.test(phone)) {
      newErrors.phone = 'Phone Number must be exactly 10 digits';
    }

    if (!email) {
      newErrors.email = 'Email Address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else {
      const pwdResult = validatePassword(password);
      if (!pwdResult.valid) {
        newErrors.password = `Password must have: ${pwdResult.errors.join(', ')}`;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setError('');
    const emailMatch = hotels.some(h => h.email.toLowerCase() === email.toLowerCase());
    if (emailMatch) {
      setError(`Hotel owner with email ${email} already exists.`);
      return;
    }

    try {
      await db.addHotel({
        hotel_name: hotelName.trim(),
        owner_name: ownerName.trim(),
        phone,
        email: email.toLowerCase().trim(),
        subscription_plan: plan,
        password,
        address: address.trim()
      });

      setHotelName('');
      setOwnerName('');
      setPhone('');
      setEmail('');
      setPassword('');
      setAddress('');
      setErrors({});
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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      setResetError('Password is required');
      return;
    }
    const pwdResult = validatePassword(newPassword);
    if (!pwdResult.valid) {
      setResetError(`Password must have: ${pwdResult.errors.join(', ')}`);
      return;
    }

    setResetLoading(true);
    setResetError('');
    setResetSuccess('');

    try {
      await db.resetHotelPassword(resetHotelEmail, newPassword);
      setResetSuccess('Password reset successfully!');
      setNewPassword('');
      setTimeout(() => {
        setShowResetModal(false);
        setResetSuccess('');
      }, 1500);
    } catch (err) {
      console.error(err);
      setResetError(err instanceof Error ? err.message : 'Failed to reset password.');
    } finally {
      setResetLoading(false);
    }
  };

  const activeHotels = hotels.filter(h => h.subscription_status === 'Active').length;
  const suspendedHotels = hotels.filter(h => h.subscription_status === 'Suspended').length;

  // Dynamic ARR/Maintenance Calculation based on active accounts (₹5,000/yr for domain & database maintenance per customer)
  const maintenanceRevenue = hotels.reduce((acc, hotel) => {
    if (hotel.subscription_status !== 'Active') return acc;
    return acc + 5000;
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
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Annual Maintenance</span>
              <span className="text-xl font-black text-primary mt-1">₹{maintenanceRevenue.toLocaleString('en-IN')}</span>
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
                    onChange={(e) => {
                      setHotelName(e.target.value);
                      if (errors.hotelName) {
                        setErrors(prev => {
                          const copy = { ...prev };
                          delete copy.hotelName;
                          return copy;
                        });
                      }
                    }}
                    className={`w-full text-xs font-bold text-slate-700 bg-slate-50/50 border rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary ${
                      errors.hotelName ? 'border-red-500 focus:ring-red-500' : 'border-slate-200'
                    }`}
                    placeholder="e.g. Taj Residency"
                  />
                  {errors.hotelName && (
                    <span className="text-[10px] font-bold text-red-500 mt-1 block">{errors.hotelName}</span>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Owner Name *</label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                      setOwnerName(val);
                      if (errors.ownerName) {
                        setErrors(prev => {
                          const copy = { ...prev };
                          delete copy.ownerName;
                          return copy;
                        });
                      }
                    }}
                    className={`w-full text-xs font-bold text-slate-700 bg-slate-50/50 border rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary ${
                      errors.ownerName ? 'border-red-500 focus:ring-red-500' : 'border-slate-200'
                    }`}
                    placeholder="e.g. Rajesh Kumar"
                  />
                  {errors.ownerName && (
                    <span className="text-[10px] font-bold text-red-500 mt-1 block">{errors.ownerName}</span>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setPhone(val);
                      if (errors.phone) {
                        setErrors(prev => {
                          const copy = { ...prev };
                          delete copy.phone;
                          return copy;
                        });
                      }
                    }}
                    className={`w-full text-xs font-bold text-slate-700 bg-slate-50/50 border rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary ${
                      errors.phone ? 'border-red-500 focus:ring-red-500' : 'border-slate-200'
                    }`}
                    placeholder="10-digit number"
                  />
                  {errors.phone && (
                    <span className="text-[10px] font-bold text-red-500 mt-1 block">{errors.phone}</span>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Hotel Address / Location</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="e.g. Anjuna, Goa, India"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Owner Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) {
                        setErrors(prev => {
                          const copy = { ...prev };
                          delete copy.email;
                          return copy;
                        });
                      }
                    }}
                    className={`w-full text-xs font-bold text-slate-700 bg-slate-50/50 border rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary ${
                      errors.email ? 'border-red-500 focus:ring-red-500' : 'border-slate-200'
                    }`}
                    placeholder="rajesh@tajresidency.com"
                  />
                  {errors.email && (
                    <span className="text-[10px] font-bold text-red-500 mt-1 block">{errors.email}</span>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Owner Login Password *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errors.password) {
                          setErrors(prev => {
                            const copy = { ...prev };
                            delete copy.password;
                            return copy;
                          });
                        }
                      }}
                      className={`w-full text-xs font-bold text-slate-700 bg-slate-50/50 border rounded-xl p-3 pr-10 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary ${
                        errors.password ? 'border-red-500 focus:ring-red-500' : 'border-slate-200'
                      }`}
                      placeholder="Min 8 chars, uppercase + number"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {/* Password Strength Meter */}
                  {password && (() => {
                    const result = validatePassword(password);
                    const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-500'];
                    const labels = ['Weak', 'Fair', 'Good', 'Strong'];
                    const score = Math.min(result.score, 3);
                    return (
                      <div className="mt-1.5 space-y-1">
                        <div className="flex gap-1">
                          {[0,1,2,3].map(i => (
                            <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= score ? colors[score] : 'bg-slate-200'}`} />
                          ))}
                        </div>
                        <span className={`text-[10px] font-bold ${
                          score === 3 ? 'text-emerald-600' : score >= 2 ? 'text-yellow-600' : 'text-orange-600'
                        }`}>{labels[score]}</span>
                      </div>
                    );
                  })()}
                  {errors.password && (
                    <span className="text-[10px] font-bold text-red-500 mt-1 block">{errors.password}</span>
                  )}
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

        {/* Reset Password Modal */}
        {showResetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[24px] w-full max-w-sm shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-primary" />
                  Reset Owner Password
                </h3>
                <button onClick={() => {
                  setShowResetModal(false);
                  setNewPassword('');
                  setResetError('');
                  setResetSuccess('');
                }} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleResetPassword} className="p-6 space-y-4">
                {resetError && (
                  <div className="p-3 bg-red-50 text-xs font-semibold text-red-600 rounded-xl border border-red-100">
                    {resetError}
                  </div>
                )}
                {resetSuccess && (
                  <div className="p-3 bg-emerald-50 text-xs font-semibold text-emerald-600 rounded-xl border border-emerald-100">
                    {resetSuccess}
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hotel Property</label>
                  <span className="text-xs font-bold text-slate-700 block mt-1">{resetHotelName}</span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Owner Email</label>
                  <span className="text-xs font-bold text-slate-500 block mt-0.5">{resetHotelEmail}</span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">New Password *</label>
                  <div className="relative">
                    <input
                      type={showResetPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (resetError) setResetError('');
                      }}
                      className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-slate-200 rounded-xl p-3 pr-10 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Min 8 chars, uppercase + number"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(!showResetPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                      aria-label={showResetPassword ? 'Hide password' : 'Show password'}
                    >
                      {showResetPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {/* Password Strength Meter */}
                  {newPassword && (() => {
                    const result = validatePassword(newPassword);
                    const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-500'];
                    const labels = ['Weak', 'Fair', 'Good', 'Strong'];
                    const score = Math.min(result.score, 3);
                    return (
                      <div className="mt-1.5 space-y-1">
                        <div className="flex gap-1">
                          {[0,1,2,3].map(i => (
                            <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= score ? colors[score] : 'bg-slate-200'}`} />
                          ))}
                        </div>
                        <span className={`text-[10px] font-bold ${
                          score === 3 ? 'text-emerald-600' : score >= 2 ? 'text-yellow-600' : 'text-orange-600'
                        }`}>{labels[score]}</span>
                      </div>
                    );
                  })()}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex-1 bg-primary text-white text-xs font-bold py-3 rounded-xl hover:bg-primary-hover shadow-lg shadow-red-200 transition-colors disabled:opacity-50"
                  >
                    {resetLoading ? 'Resetting...' : 'Update Password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowResetModal(false);
                      setNewPassword('');
                      setResetError('');
                      setResetSuccess('');
                    }}
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
                        <td className="px-6 py-4 font-bold text-slate-800">
                          {hotel.subscription_plan === 'Lifetime' ? 'Lifetime (₹5,000/yr)' : hotel.subscription_plan}
                        </td>
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
                            onClick={() => {
                              setResetHotelName(hotel.hotel_name);
                              setResetHotelEmail(hotel.email);
                              setShowResetModal(true);
                            }}
                            className="bg-slate-50 hover:bg-slate-100/50 text-slate-700 border border-slate-200 font-bold px-3 py-1.5 rounded-lg transition-colors text-[10px] inline-flex items-center gap-1.5"
                          >
                            <Key className="w-3.5 h-3.5" />
                            Reset Password
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
