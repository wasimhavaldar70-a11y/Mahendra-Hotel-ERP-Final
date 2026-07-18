'use client';

// ========================================================
// StayDesk CRM / HotelFlow CRM Payments & Ledger Screen
// Location: app/payments/page.tsx
// ========================================================

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { db, getSessionUser } from '../../lib/supabase/client';
import { Payment } from '../../types';
import { 
  Coins, 
  Search, 
  IndianRupee, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle,
  FileSpreadsheet,
  Smartphone,
  CreditCard
} from 'lucide-react';

export default function PaymentsPage() {
  const [currentHotel, setCurrentHotel] = useState<any>(null);
  const [payments, setPayments] = useState<(Payment & { customerName: string; roomNumber: string })[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All', 'Paid', 'Pending'
  const [searchQuery, setSearchQuery] = useState('');

  const loadPayments = async (hotelId: string) => {
    try {
      const data = await db.getPayments(hotelId);
      setPayments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const session = getSessionUser();
    if (session && session.hotel) {
      setCurrentHotel(session.hotel);
      loadPayments(session.hotel.id);
    }
  }, []);

  // Aggregated totals
  const totalReceived = payments.reduce((sum, p) => sum + Number(p.advance), 0);
  const totalPending = payments.reduce((sum, p) => sum + Number(p.pending), 0);

  // Group received payments by payment method
  const modeStats = {
    UPI: { received: 0, pending: 0 },
    Cash: { received: 0, pending: 0 },
    Card: { received: 0, pending: 0 }
  };

  payments.forEach(p => {
    const activeMode = (Number(p.pending) === 0 && p.final_payment_method) ? p.final_payment_method : p.payment_method;
    const mode = (activeMode === 'UPI' || activeMode === 'Cash' || activeMode === 'Card') ? activeMode : 'Cash';
    modeStats[mode].received += Number(p.advance || 0);
    modeStats[mode].pending += Number(p.pending || 0);
  });
  
  // Filtered payments list
  const filteredPayments = payments.filter(p => {
    const methodMatch = paymentMethodFilter === 'All' || p.payment_method === paymentMethodFilter;
    const statusMatch = statusFilter === 'All' || 
                        (statusFilter === 'Pending' && Number(p.pending) > 0) ||
                        (statusFilter === 'Paid' && Number(p.pending) === 0);
    const searchMatch = !searchQuery.trim() || 
                        p.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        p.roomNumber.includes(searchQuery);

    return methodMatch && statusMatch && searchMatch;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Coins className="w-5 h-5 text-primary" />
            Billing Ledger
          </h1>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Track collections, advanced balances, payment methods, and outstanding debts.</p>
        </div>

        {/* Quick summary totals */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Total Received Revenue</span>
              <span className="text-xl font-bold text-emerald-600 mt-1">₹{totalReceived.toLocaleString('en-IN')}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Total Pending Collect</span>
              <span className="text-xl font-bold text-red-650 mt-1">₹{totalPending.toLocaleString('en-IN')}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Net Billings booked</span>
              <span className="text-xl font-bold text-slate-800 mt-1">₹{(totalReceived + totalPending).toLocaleString('en-IN')}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Payment Mode Summary */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Payment Mode Summary
            </h2>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Real-time breakdown</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* UPI Summary */}
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/30 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">UPI Payments</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-base font-bold text-slate-800">₹{modeStats.UPI.received.toLocaleString('en-IN')}</span>
                  {modeStats.UPI.pending > 0 && (
                    <span className="text-[10px] font-semibold text-red-500">Pending: ₹{modeStats.UPI.pending}</span>
                  )}
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Smartphone className="w-4.5 h-4.5" />
              </div>
            </div>

            {/* Cash Summary */}
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/30 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Cash Payments</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-base font-bold text-slate-800">₹{modeStats.Cash.received.toLocaleString('en-IN')}</span>
                  {modeStats.Cash.pending > 0 && (
                    <span className="text-[10px] font-semibold text-red-500">Pending: ₹{modeStats.Cash.pending}</span>
                  )}
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Coins className="w-4.5 h-4.5" />
              </div>
            </div>

            {/* Card Summary */}
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/30 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Card Payments</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-base font-bold text-slate-800">₹{modeStats.Card.received.toLocaleString('en-IN')}</span>
                  {modeStats.Card.pending > 0 && (
                    <span className="text-[10px] font-semibold text-red-500">Pending: ₹{modeStats.Card.pending}</span>
                  )}
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <CreditCard className="w-4.5 h-4.5" />
              </div>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by guest name or room..."
              className="w-full text-xs font-semibold text-slate-700 bg-slate-50/50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white"
            />
          </div>

          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">Payment Mode:</span>
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 focus:outline-none"
              >
                <option value="All">All Modes</option>
                <option value="UPI">UPI</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 focus:outline-none"
              >
                <option value="All">All Bills</option>
                <option value="Paid">Fully Settled</option>
                <option value="Pending">Dues Pending</option>
              </select>
            </div>
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-20 text-slate-400 font-bold text-sm">
              No transaction histories found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-4">Transaction ID</th>
                    <th className="px-6 py-4">Guest Name</th>
                    <th className="px-6 py-4">Room No</th>
                    <th className="px-6 py-4">Billing Date</th>
                    <th className="px-6 py-4">Payment Method</th>
                    <th className="px-6 py-4">Total Amount</th>
                    <th className="px-6 py-4">Received</th>
                    <th className="px-6 py-4">Pending</th>
                    <th className="px-6 py-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {filteredPayments.map((p) => {
                    const isPending = Number(p.pending) > 0;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-mono text-[10px] text-slate-400 uppercase">TXN-{p.id.substring(0, 6)}</td>
                        <td className="px-6 py-4 font-semibold text-slate-900">{p.customerName}</td>
                        <td className="px-6 py-4 text-slate-500">Room {p.roomNumber}</td>
                        <td className="px-6 py-4 text-slate-500">
                          {new Date(p.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 rounded bg-slate-100/80 text-slate-600 text-[10px] font-semibold uppercase">
                            {p.payment_method}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-800">₹{p.room_price}</td>
                        <td className="px-6 py-4 text-emerald-600 font-semibold">₹{p.advance}</td>
                        <td className="px-6 py-4 text-red-650 font-semibold font-mono">₹{p.pending}</td>
                        <td className="px-6 py-4 text-right">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            isPending 
                              ? 'bg-red-50 text-red-700 border-red-200/60' 
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                          }`}>
                            {isPending ? 'Pending' : 'Settled'}
                          </span>
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
