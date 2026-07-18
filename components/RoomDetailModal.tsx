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
  CreditCard
} from 'lucide-react';
import { db } from '../lib/supabase/client';
import { Room, ExtendedCheckIn, RoomStatus } from '../types';

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
      }
    } catch (err) {
      console.error("Error loading stay data:", err);
    } finally {
      setLoading(false);
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
        <div id="print-receipt" className="hidden">
          <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '10px', marginBottom: '10px' }}>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '14px', textTransform: 'uppercase' }}>STAYDESK RECEIPT</h3>
            <p style={{ margin: '0', fontSize: '10px', fontWeight: 'bold' }}>{currentHotel?.hotel_name || 'Grand Palace Hotel'}</p>
            <p style={{ margin: '0', fontSize: '10px' }}>Phone: {currentHotel?.phone || '9876543210'}</p>
            <p style={{ margin: '0', fontSize: '10px' }}>Email: {currentHotel?.email || 'support@grandpalace.com'}</p>
          </div>

          <div style={{ marginBottom: '10px', fontSize: '10px' }}>
            <p style={{ margin: '3px 0' }}><strong>Receipt ID:</strong> RCPT-{stayData.id.substring(0, 6).toUpperCase()}</p>
            <p style={{ margin: '3px 0' }}><strong>Date:</strong> {new Date().toLocaleDateString('en-IN')}</p>
            <p style={{ margin: '3px 0' }}><strong>Room No:</strong> {room.room_number} ({room.room_type})</p>
            <p style={{ margin: '3px 0' }}><strong>Guest:</strong> {stayData.primary_customer?.full_name}</p>
            <p style={{ margin: '3px 0' }}><strong>Phone:</strong> {stayData.primary_customer?.phone}</p>
          </div>

          <div style={{ borderBottom: '1px dashed #000', borderTop: '1px dashed #000', padding: '5px 0', marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0' }}>
              <span>Check-in:</span>
              <span>{new Date(stayData.check_in).toLocaleDateString('en-IN')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0' }}>
              <span>Checkout:</span>
              <span>{new Date(stayData.expected_checkout).toLocaleDateString('en-IN')}</span>
            </div>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0' }}>
              <span>Room Charges:</span>
              <span>₹{Number(stayData.payment?.room_price).toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0' }}>
              <span>Advance Paid:</span>
              <span>₹{Number(stayData.payment?.advance).toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0', fontWeight: 'bold' }}>
              <span>Pending Settle:</span>
              <span>₹{Number(stayData.payment?.pending).toFixed(2)}</span>
            </div>
          </div>

          <div style={{ borderTop: '1px dashed #000', paddingTop: '10px', textAlign: 'center' }}>
            <p style={{ margin: '0', fontSize: '11px', fontWeight: 'bold' }}>Total Settled: ₹{Number(stayData.payment?.room_price).toFixed(2)}</p>
            <p style={{ margin: '15px 0 0 0', fontSize: '10px', fontStyle: 'italic' }}>Thank you for staying with us!</p>
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
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Payments & Billing</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl border border-slate-200/60 text-center bg-white shadow-sm">
                        <span className="text-[10px] font-bold text-slate-400 block">Room Charge</span>
                        <span className="text-sm font-bold text-slate-800 mt-1">₹{Number(stayData.payment?.room_price).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="p-3 rounded-xl border border-green-150 text-center bg-green-50/10">
                        <span className="text-[10px] font-bold text-green-600 block">Advance Paid</span>
                        <span className="text-sm font-bold text-green-600 mt-1">₹{Number(stayData.payment?.advance).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="p-3 rounded-xl border border-red-150 text-center bg-red-50/10">
                        <span className="text-[10px] font-bold text-red-600 block">Pending Balance</span>
                        <span className="text-sm font-bold text-red-600 mt-1">₹{Number(stayData.payment?.pending).toLocaleString('en-IN')}</span>
                      </div>
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
