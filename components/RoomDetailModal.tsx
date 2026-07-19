'use client';

// ========================================================
// StayDesk CRM / HotelFlow CRM Room Detail Modal
// Location: components/RoomDetailModal.tsx
// ========================================================

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  X, 
  Calendar, 
  User, 
  Phone, 
  DollarSign, 
  Wrench, 
  Sparkles, 
  CheckCircle2, 
  Printer, 
  Clock, 
  ChevronRight,
  TrendingUp,
  CreditCard,
  Plus,
  Trash2,
  AlertCircle,
  Receipt
} from 'lucide-react';
import { db } from '../lib/supabase/client';
import { Room, ExtendedCheckIn, RoomStatus, FolioLedger } from '../types';

interface RoomDetailModalProps {
  room: Room;
  hotelId: string;
  onClose: () => void;
  onStatusChanged: () => void;
}

export default function RoomDetailModal({ room, hotelId, onClose, onStatusChanged }: RoomDetailModalProps) {
  const router = useRouter();
  const [stayData, setStayData] = useState<ExtendedCheckIn | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Extend Stay states
  const [extending, setExtending] = useState(false);
  const [newCheckoutDate, setNewCheckoutDate] = useState('');
  const [additionalCharges, setAdditionalCharges] = useState(0);

  // Checkout states
  const [checkingOut, setCheckingOut] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Cash' | 'Card'>('UPI');

  // Dynamic Hotel Info state
  const [currentHotel, setCurrentHotel] = useState<any>(null);

  // Ledger states
  const [ledgerEntries, setLedgerEntries] = useState<FolioLedger[]>([]);
  const [showLedger, setShowLedger] = useState(true);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [newEntry, setNewEntry] = useState({
    type: 'Debit' as 'Debit' | 'Credit',
    category: 'Restaurant',
    description: '',
    amount: 0,
    tax: 0
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const session = localStorage.getItem('hf_session');
      if (session) {
        try {
          const parsed = JSON.parse(session);
          if (parsed && parsed.hotel) {
            setCurrentHotel(parsed.hotel);
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (room.status === 'Occupied') {
      loadActiveStay();
    }
  }, [room]);

  const loadActiveStay = async () => {
    setLoading(true);
    try {
      const data = await db.getActiveStayForRoom(hotelId, room.id);
      setStayData(data);
      if (data) {
        // Set default extend date (expected checkout + 1 day)
        const expDate = new Date(data.expected_checkout);
        expDate.setDate(expDate.getDate() + 1);
        setNewCheckoutDate(expDate.toISOString().substring(0, 10));

        // Load folio ledger entries
        const entries = await db.getLedgerEntries(data.id);
        setLedgerEntries(entries);
      }
    } catch (err) {
      console.error("Error loading stay data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLedgerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stayData) return;

    try {
      const entryData = {
        hotel_id: hotelId,
        checkin_id: stayData.id,
        customer_id: stayData.primary_customer_id,
        room_id: room.id,
        transaction_type: newEntry.type,
        category: newEntry.category,
        description: newEntry.description,
        debit: newEntry.type === 'Debit' ? newEntry.amount : 0,
        credit: newEntry.type === 'Credit' ? newEntry.amount : 0,
        tax: newEntry.tax || 0,
        created_by: currentHotel?.owner_name || 'System'
      };

      await db.addLedgerEntry(entryData);

      // Reset Form
      setNewEntry({
        type: 'Debit',
        category: 'Restaurant',
        description: '',
        amount: 0,
        tax: 0
      });
      setShowAddEntry(false);

      // Reload
      await loadActiveStay();
      onStatusChanged();
    } catch (err) {
      console.error('Failed to post ledger entry:', err);
    }
  };

  const handleVoidEntry = async (entryId: string) => {
    if (!confirm('Are you sure you want to void this transaction? This will adjust the outstanding bill.')) return;
    try {
      await db.voidLedgerEntry(hotelId, entryId);
      await loadActiveStay();
      onStatusChanged();
    } catch (err) {
      console.error('Failed to void ledger entry:', err);
    }
  };

  const changeRoomStatus = async (newStatus: RoomStatus) => {
    try {
      await db.updateRoomStatus(hotelId, room.id, newStatus);
      onStatusChanged();
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  const handleExtendStay = async () => {
    if (!stayData) return;
    try {
      const checkoutTime = currentHotel?.cms_data?.checkoutTime || '12:00:00';
      const parsedDate = new Date(newCheckoutDate + 'T' + checkoutTime);
      await db.extendStay(hotelId, stayData.id, parsedDate.toISOString(), Number(additionalCharges));
      setExtending(false);
      loadActiveStay();
      onStatusChanged();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCheckoutSubmit = async () => {
    if (!stayData) return;
    try {
      await db.checkOut(hotelId, stayData.id, paymentMethod);
      setCheckingOut(false);
      onStatusChanged();
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrintBill = () => {
    if (!stayData) return;
    
    // Trigger standard browser print. CSS media query handles print styling.
    window.print();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadgeClass = (status: RoomStatus) => {
    switch (status) {
      case 'Ready': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Occupied': return 'bg-red-50 text-red-700 border-red-100';
      case 'Maintenance': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Cleaning': return 'bg-amber-50 text-amber-700 border-amber-100';
    }
  };

  return (
    <>
      {/* Print receipt container (Hidden from screen, visible during print via global.css) */}
      {stayData && (
        <div id="print-receipt" className="hidden" style={{ width: '100%', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1e293b' }}>
          {/* Header section with two columns */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #3b82f6', paddingBottom: '20px', marginBottom: '25px' }}>
            <div>
              <h1 style={{ margin: '0 0 5px 0', fontSize: '24px', fontWeight: '800', color: '#1e3a8a', letterSpacing: '-0.5px' }}>
                {currentHotel?.hotel_name || 'Grand Palace Hotel'}
              </h1>
              <p style={{ margin: '2px 0', fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Phone: {currentHotel?.phone || '9876543210'}</p>
              <p style={{ margin: '2px 0', fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Email: {currentHotel?.email || 'support@grandpalace.com'}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h2 style={{ margin: '0 0 5px 0', fontSize: '18px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>GUEST FOLIO / INVOICE</h2>
              <p style={{ margin: '2px 0', fontSize: '12px', color: '#64748b' }}><strong>Invoice ID:</strong> RCPT-{stayData.id.substring(0, 8).toUpperCase()}</p>
              <p style={{ margin: '2px 0', fontSize: '12px', color: '#64748b' }}><strong>Billing Date:</strong> {new Date().toLocaleDateString('en-IN')}</p>
            </div>
          </div>

          {/* Guest and Stay Details Boxes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Billed To (Guest)</h3>
              <p style={{ margin: '3px 0', fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{stayData.primary_customer?.full_name}</p>
              <p style={{ margin: '3px 0', fontSize: '12px', color: '#475569' }}>📞 {stayData.primary_customer?.phone}</p>
              {stayData.primary_customer?.email && (
                <p style={{ margin: '3px 0', fontSize: '12px', color: '#475569' }}>✉️ {stayData.primary_customer?.email}</p>
              )}
            </div>
            
            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Stay Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: '6px 12px', fontSize: '12px', color: '#475569' }}>
                <span style={{ fontWeight: '500' }}>Room Assigned:</span>
                <span style={{ fontWeight: '700', color: '#0f172a' }}>Room {room.room_number} ({room.room_type})</span>
                
                <span style={{ fontWeight: '500' }}>Check-in Date:</span>
                <span>{new Date(stayData.check_in).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                
                <span style={{ fontWeight: '500' }}>Checkout Date:</span>
                <span>{new Date(stayData.expected_checkout).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
            </div>
          </div>

          {/* Detailed Transaction ledger printout */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#475569', borderBottom: '1px solid #e2e8f0', paddingBottom: '5px' }}>Itemized Folio Transactions</h3>
            <table style={{ width: '100%', fontSize: '12px', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>
                  <th style={{ padding: '8px 10px', background: '#f8fafc' }}>Date</th>
                  <th style={{ padding: '8px 10px', background: '#f8fafc' }}>Item Description</th>
                  <th style={{ padding: '8px 10px', background: '#f8fafc' }}>Category</th>
                  <th style={{ padding: '8px 10px', background: '#f8fafc', textAlign: 'right' }}>Charges (Debit)</th>
                  <th style={{ padding: '8px 10px', background: '#f8fafc', textAlign: 'right' }}>Payments (Credit)</th>
                </tr>
              </thead>
              <tbody>
                {ledgerEntries.filter(e => e.status === 'Active').map((e, idx) => (
                  <tr key={e.id} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                    <td style={{ padding: '10px' }}>{new Date(e.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                    <td style={{ padding: '10px', fontWeight: '500', color: '#0f172a' }}>{e.description}</td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ fontSize: '10px', fontWeight: '700', background: '#e2e8f0', color: '#475569', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>{e.category}</span>
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: '600', color: '#ef4444' }}>{e.debit > 0 ? `₹${Number(e.debit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: '600', color: '#22c55e' }}>{e.credit > 0 ? `₹${Number(e.credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Summary Box aligned Right */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '50px' }}>
            <div style={{ width: '320px', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '8px 0', fontSize: '13px', color: '#475569' }}>
                <span>Total Charges (Debits):</span>
                <span style={{ fontWeight: '600' }}>₹{Number(stayData.payment?.room_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '8px 0', fontSize: '13px', color: '#475569' }}>
                <span>Total Payments (Credits):</span>
                <span style={{ fontWeight: '600' }}>₹{Number(stayData.payment?.advance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '12px 0 0 0', fontSize: '15px', fontWeight: '800', color: '#0f172a', borderTop: '2px solid #e2e8f0', paddingTop: '12px' }}>
                <span>Outstanding Balance:</span>
                <span style={{ color: Number(stayData.payment?.pending || 0) > 0 ? '#ef4444' : '#1e3a8a' }}>
                  ₹{Number(stayData.payment?.pending || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Signatures section */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '60px', padding: '0 20px', fontSize: '12px', color: '#475569' }}>
            <div style={{ textAlign: 'center', width: '200px' }}>
              <div style={{ borderBottom: '1px solid #cbd5e1', marginBottom: '8px', height: '40px' }}></div>
              <p style={{ margin: '0', fontWeight: '700' }}>Guest's Signature</p>
            </div>
            <div style={{ textAlign: 'center', width: '200px' }}>
              <div style={{ borderBottom: '1px solid #cbd5e1', marginBottom: '8px', height: '40px' }}></div>
              <p style={{ margin: '0', fontWeight: '700' }}>Authorized Signatory</p>
            </div>
          </div>

          {/* Invoice footer */}
          <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '60px', paddingTop: '15px', textAlign: 'center', fontSize: '11px', color: '#64748b' }}>
            <p style={{ margin: '0', fontWeight: '700' }}>StayDesk PMS Ledger System</p>
            <p style={{ margin: '4px 0 0 0', fontStyle: 'italic' }}>Thank you for staying with us. Have a safe journey ahead!</p>
          </div>
        </div>
      )}
      {/* Screen Modal Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
        <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-xl font-bold text-slate-800">Room {room.room_number}</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadgeClass(room.status)}`}>
                  {room.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">{room.room_type} • {room.floor}</p>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 flex-1 overflow-y-auto space-y-6">
            {/* OCCUPIED DETAILS */}
            {room.status === 'Occupied' && (
              loading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
                  <span className="text-xs font-medium text-slate-400">Loading stay details...</span>
                </div>
              ) : stayData ? (
                <div className="space-y-6">
                  {/* Guest Primary Card */}
                  <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-200/60 space-y-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm leading-none">{stayData.primary_customer?.full_name}</h4>
                        <span className="text-xs font-semibold text-slate-400 mt-1 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {stayData.primary_customer?.phone}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-150">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Checked In</span>
                        <span className="text-xs font-bold text-slate-700 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {formatDate(stayData.check_in)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Expected Out</span>
                        <span className="text-xs font-bold text-slate-700 mt-0.5 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {formatDate(stayData.expected_checkout)}
                        </span>
                      </div>
                    </div>

                    {stayData.primary_customer?.customer_documents && stayData.primary_customer.customer_documents.length > 0 && (
                      <div className="pt-3 border-t border-slate-150 flex items-center justify-between text-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {stayData.primary_customer.customer_documents[0].document_type} ID
                        </span>
                        <span className="font-bold text-slate-700">
                          {stayData.primary_customer.customer_documents[0].document_number}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Guests List */}
                  {stayData.guests && stayData.guests.some(g => g.relationship !== 'Self') && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Additional Guests</h4>
                      <div className="space-y-2">
                        {stayData.guests.filter(g => g.relationship !== 'Self').map((g) => (
                          <div key={g.id} className="p-3 rounded-xl border border-slate-200/60 text-xs font-medium bg-slate-50/20 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-800 font-bold">{g.customer?.full_name} ({g.relationship})</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                g.document_verified 
                                  ? 'bg-green-50 text-green-700 border border-green-200/60' 
                                  : 'bg-red-50 text-red-700 border border-red-200/60'
                              }`}>
                                {g.document_verified ? 'Docs Verified' : 'No Docs'}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-505 pt-1.5 border-t border-slate-200/40">
                              {g.customer?.phone && (
                                <div>
                                  <span className="font-bold text-slate-400 uppercase tracking-wider block">Phone</span>
                                  <span className="text-slate-700 font-semibold">{g.customer.phone}</span>
                                </div>
                              )}
                              {g.customer?.customer_documents && g.customer.customer_documents.length > 0 && (
                                <div>
                                  <span className="font-bold text-slate-400 uppercase tracking-wider block">
                                    {g.customer.customer_documents[0].document_type}
                                  </span>
                                  <span className="text-slate-700 font-bold">{g.customer.customer_documents[0].document_number}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bill Details */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Guest Folio & Ledger Balance</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl border border-slate-200/60 text-center bg-white shadow-sm">
                        <span className="text-[10px] font-bold text-slate-400 block">Total Charges</span>
                        <span className="text-sm font-bold text-slate-800 mt-1">₹{Number(stayData.payment?.room_price || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="p-3 rounded-xl border border-green-150 text-center bg-green-50/10">
                        <span className="text-[10px] font-bold text-green-600 block">Total Payments</span>
                        <span className="text-sm font-bold text-green-600 mt-1">₹{Number(stayData.payment?.advance || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="p-3 rounded-xl border border-red-150 text-center bg-red-50/10">
                        <span className="text-[10px] font-bold text-red-600 block">Outstanding</span>
                        <span className="text-sm font-bold text-red-650 mt-1">₹{Number(stayData.payment?.pending || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    {/* Folio Ledger details panel */}
                    <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white shadow-sm">
                      <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-150 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Receipt className="w-4 h-4 text-slate-500" />
                          PMS Transactions Audit Trail
                        </span>
                        <button 
                          type="button"
                          onClick={() => setShowLedger(!showLedger)}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
                        >
                          {showLedger ? 'Collapse' : 'Expand'}
                        </button>
                      </div>

                      {showLedger && (
                        <div className="p-4 space-y-3">
                          <div className="overflow-x-auto max-h-60 overflow-y-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="border-b border-slate-200 text-slate-400 font-bold text-[10px] uppercase">
                                  <th className="pb-2">Date</th>
                                  <th className="pb-2">Description</th>
                                  <th className="pb-2 text-right">Debit (+)</th>
                                  <th className="pb-2 text-right">Credit (-)</th>
                                  <th className="pb-2 text-right">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-medium">
                                {ledgerEntries.length === 0 ? (
                                  <tr>
                                    <td colSpan={5} className="py-4 text-center text-slate-400 italic">No ledger transactions posted yet.</td>
                                  </tr>
                                ) : (
                                  ledgerEntries.map(entry => (
                                    <tr 
                                      key={entry.id} 
                                      className={`text-slate-600 ${entry.status === 'Void' ? 'line-through text-slate-400 bg-slate-50/40' : ''}`}
                                    >
                                      <td className="py-2 text-[10px] whitespace-nowrap">
                                        {new Date(entry.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                      </td>
                                      <td className="py-2">
                                        <div className="font-semibold text-slate-700">{entry.description}</div>
                                        <div className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{entry.category}</div>
                                      </td>
                                      <td className="py-2 text-right text-red-600 font-bold">
                                        {entry.debit > 0 ? `₹${entry.debit}` : '-'}
                                      </td>
                                      <td className="py-2 text-right text-green-600 font-bold">
                                        {entry.credit > 0 ? `₹${entry.credit}` : '-'}
                                      </td>
                                      <td className="py-2 text-right">
                                        {entry.status === 'Active' ? (
                                          <button
                                            type="button"
                                            onClick={() => handleVoidEntry(entry.id)}
                                            className="text-[9px] text-red-500 font-bold border border-red-200 px-1.5 py-0.5 rounded hover:bg-red-50 transition-colors"
                                          >
                                            Void
                                          </button>
                                        ) : (
                                          <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 bg-slate-100 px-1 rounded">{entry.status}</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>

                          {/* Quick Actions Form to Add Charges/Credits */}
                          <div className="pt-3 border-t border-slate-150">
                            <button
                              type="button"
                              onClick={() => setShowAddEntry(!showAddEntry)}
                              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              {showAddEntry ? 'Cancel Post Transaction' : 'Post Charge, Payment or Discount'}
                            </button>

                            {showAddEntry && (
                              <form onSubmit={handleAddLedgerSubmit} className="mt-3 p-3 border border-slate-250 bg-slate-50/50 rounded-xl space-y-3 animate-fade-in">
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Entry Type</label>
                                    <select
                                      value={newEntry.type}
                                      onChange={(e) => {
                                        const type = e.target.value as 'Debit' | 'Credit';
                                        setNewEntry({
                                          ...newEntry,
                                          type,
                                          category: type === 'Credit' ? 'Payment' : 'Restaurant'
                                        });
                                      }}
                                      className="w-full text-xs font-medium border border-slate-200 rounded-lg p-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                                    >
                                      <option value="Debit">Charge (Debit)</option>
                                      <option value="Credit">Credit / Settlement</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Category</label>
                                    <select
                                      value={newEntry.category}
                                      onChange={(e) => setNewEntry({ ...newEntry, category: e.target.value })}
                                      className="w-full text-xs font-medium border border-slate-200 rounded-lg p-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                                    >
                                      {newEntry.type === 'Debit' ? (
                                        <>
                                          <option value="Restaurant">Restaurant (Food POS)</option>
                                          <option value="Laundry">Laundry Service</option>
                                          <option value="Spa">Spa & Gym</option>
                                          <option value="Extra Bed">Extra Bed / Rollaway</option>
                                          <option value="Taxi">Taxi & Transport</option>
                                          <option value="Airport Pickup">Airport Pickup</option>
                                          <option value="Custom Charges">Custom Fee / Amenity</option>
                                          <option value="Refund">Refund Debit</option>
                                        </>
                                      ) : (
                                        <>
                                          <option value="Payment">Payment Collection</option>
                                          <option value="Discount">Manager Discount</option>
                                        </>
                                      )}
                                    </select>
                                  </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                  <div className="col-span-2">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Item Description</label>
                                    <input
                                      type="text"
                                      value={newEntry.description}
                                      onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                                      placeholder="e.g. Dinner - Room Service"
                                      className="w-full text-xs font-medium border border-slate-200 rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-primary bg-white"
                                      required
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Amount (₹)</label>
                                    <input
                                      type="number"
                                      value={newEntry.amount || ''}
                                      onChange={(e) => setNewEntry({ ...newEntry, amount: Number(e.target.value) })}
                                      placeholder="0"
                                      className="w-full text-xs font-medium border border-slate-200 rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-primary bg-white"
                                      required
                                      min="1"
                                    />
                                  </div>
                                </div>

                                <div className="flex justify-end gap-1.5 pt-1">
                                  <button
                                    type="submit"
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-sm"
                                  >
                                    Post Entry
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setShowAddEntry(false)}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold px-3 py-1.5 rounded-lg"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </form>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* EXTEND STAY DRAWER */}
                  {extending ? (
                    <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/10 space-y-4">
                      <h4 className="text-sm font-bold text-slate-800">Extend Stay details</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">New Checkout Date</label>
                          <input 
                            type="date"
                            value={newCheckoutDate}
                            onChange={(e) => setNewCheckoutDate(e.target.value)}
                            className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-primary focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Add Extra Cost (₹)</label>
                          <input 
                            type="number" 
                            value={additionalCharges}
                            onChange={(e) => setAdditionalCharges(Number(e.target.value))}
                            className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-primary focus:outline-none"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleExtendStay}
                          className="flex-1 bg-primary text-white text-xs font-semibold py-2.5 rounded-lg hover:bg-primary-hover shadow-md transition-colors"
                        >
                          Confirm Extension
                        </button>
                        <button
                          onClick={() => setExtending(false)}
                          className="bg-slate-100 text-slate-600 text-xs font-semibold px-4 py-2.5 rounded-lg hover:bg-slate-200 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : checkingOut ? (
                    /* CHECKOUT DRAWER */
                    <div className="p-4 rounded-xl border border-emerald-250 bg-emerald-50/10 space-y-4">
                      <h4 className="text-sm font-bold text-slate-800">Settle & Checkout</h4>
                      <p className="text-xs text-slate-500 font-medium">
                        Confirm checkout and settle the final pending balance of <strong className="text-red-650 font-bold text-sm">₹{Number(stayData.payment?.pending).toLocaleString('en-IN')}</strong>.
                      </p>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Payment Method</label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['UPI', 'Cash', 'Card'] as const).map(method => (
                            <button
                              key={method}
                              type="button"
                              onClick={() => setPaymentMethod(method)}
                              className={`py-2 rounded-lg border text-xs font-semibold transition-all duration-200 ${
                                paymentMethod === method 
                                  ? 'bg-emerald-600 border-emerald-650 text-white shadow-sm'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {method}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={handleCheckoutSubmit}
                          className="flex-1 bg-emerald-600 text-white text-xs font-semibold py-2.5 rounded-lg hover:bg-emerald-750 shadow-md transition-colors"
                        >
                          Settle & Mark Room Green
                        </button>
                        <button
                          onClick={() => setCheckingOut(false)}
                          className="bg-slate-100 text-slate-600 text-xs font-semibold px-4 py-2.5 rounded-lg hover:bg-slate-200 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 font-medium text-sm">No stay details found.</div>
              )
            )}

            {/* STATUS TRANSITIONS (READY / CLEANING / MAINTENANCE) */}
            {room.status !== 'Occupied' && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Change Room Status</h4>
                <div className="grid grid-cols-3 gap-3">
                  {room.status !== 'Ready' && (
                    <button
                      onClick={() => changeRoomStatus('Ready')}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl border border-green-200/60 hover:bg-green-50/40 text-green-700 transition-all duration-200"
                    >
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="text-xs font-bold">Ready</span>
                    </button>
                  )}
                  {room.status !== 'Cleaning' && (
                    <button
                      onClick={() => changeRoomStatus('Cleaning')}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl border border-amber-200/60 hover:bg-amber-50/40 text-amber-700 transition-all duration-200"
                    >
                      <Sparkles className="w-5 h-5 text-amber-600" />
                      <span className="text-xs font-bold">Cleaning</span>
                    </button>
                  )}
                  {room.status !== 'Maintenance' && (
                    <button
                      onClick={() => changeRoomStatus('Maintenance')}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl border border-blue-200/60 hover:bg-blue-50/40 text-blue-700 transition-all duration-200"
                    >
                      <Wrench className="w-5 h-5 text-blue-600" />
                      <span className="text-xs font-bold">Maintenance</span>
                    </button>
                  )}
                </div>

                {room.status === 'Ready' && (
                  <div className="pt-4 border-t border-slate-100">
                    <button
                      onClick={() => {
                        router.push(`/check-in?room_id=${room.id}`);
                        onClose();
                      }}
                      className="flex items-center justify-between w-full p-4 rounded-xl bg-primary text-white font-semibold hover:bg-primary-hover shadow-md transition-all duration-200 group"
                    >
                      <span className="text-sm">Proceed to Guest Check-In</span>
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer (when occupied, showing base actions) */}
          {room.status === 'Occupied' && !extending && !checkingOut && (
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-2">
              <button
                onClick={() => setCheckingOut(true)}
                className="flex-1 bg-emerald-600 text-white text-xs font-semibold py-3 px-4 rounded-xl hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-100 flex items-center justify-center gap-1.5"
              >
                Checkout Room
              </button>
              <button
                onClick={() => setExtending(true)}
                className="bg-white border border-slate-200 text-slate-700 text-xs font-semibold py-3 px-4 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5"
              >
                Extend Stay
              </button>
              <button
                onClick={handlePrintBill}
                className="bg-white border border-slate-200 text-slate-700 text-xs font-semibold py-3 px-4 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5"
                title="Print Receipt"
              >
                <Printer className="w-4 h-4 text-slate-500" />
                Print Bill
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
