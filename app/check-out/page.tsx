'use client';

// ========================================================
// StayDesk CRM / HotelFlow CRM Quick Check-Out Page
// Location: app/check-out/page.tsx
// ========================================================

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import RoomDetailModal from '../../components/RoomDetailModal';
import { db, getSessionUser } from '../../lib/supabase/client';
import { Room } from '../../types';
import { DoorClosed, Search, AlertTriangle, Clock, Calendar, IndianRupee, User, Phone } from 'lucide-react';

export default function CheckOutPage() {
  const [currentHotel, setCurrentHotel] = useState<any>(null);
  const [occupiedRooms, setOccupiedRooms] = useState<Room[]>([]);
  const [roomStays, setRoomStays] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const loadOccupiedRooms = async (hotelId: string) => {
    try {
      // Fetch rooms and active stays in parallel to avoid N+1 query loops
      const [roomsList, staysList] = await Promise.all([
        db.getRooms(hotelId),
        db.getActiveStaysForHotel(hotelId)
      ]);

      const occupied = roomsList.filter(r => r.status === 'Occupied');
      setOccupiedRooms(occupied);

      const staysMap: Record<string, any> = {};
      staysList.forEach((stay) => {
        if (stay.room_id) {
          staysMap[stay.room_id] = stay;
        }
      });
      setRoomStays(staysMap);
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
      loadOccupiedRooms(session.hotel.id);
      
      let syncTimeout: NodeJS.Timeout | null = null;
      const channel = new BroadcastChannel('hotelflow-sync');
      channel.onmessage = (event) => {
        if (event.data && event.data.type === 'DB_UPDATE') {
          if (syncTimeout) clearTimeout(syncTimeout);
          const delay = 300 + Math.random() * 500;
          syncTimeout = setTimeout(() => {
            loadOccupiedRooms(session.hotel.id);
          }, delay);
        }
      };

      return () => {
        if (syncTimeout) clearTimeout(syncTimeout);
        channel.close();
      };
    }
  }, []);

  const handleRoomStatusChanged = () => {
    if (currentHotel) {
      loadOccupiedRooms(currentHotel.id);
    }
  };

  // Filter list
  const filteredRooms = occupiedRooms.filter(room => {
    const stay = roomStays[room.id];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    
    return (
      room.room_number.includes(q) ||
      (stay && stay.primary_customer?.full_name.toLowerCase().includes(q)) ||
      (stay && stay.primary_customer?.phone.includes(q))
    );
  });

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <DoorClosed className="w-5 h-5 text-primary" />
            Active Stays &amp; Check-Out Desk
          </h1>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">
            Quickly find check-out due lists, outstanding balances, and print receipt bills.
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <Search className="h-4.5 w-4.5 text-slate-400" />
          </div>
          <input
            id="checkout-search"
            type="search"
            inputMode="search"
            autoComplete="off"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by room, guest name, or phone..."
            className="block w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-10 pr-4 text-sm font-medium placeholder-slate-400 focus:border-primary focus:outline-none shadow-sm"
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <div className="flex flex-col items-center gap-3">
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent" />
              <span className="text-sm font-medium text-slate-400">Loading rooms...</span>
            </div>
          </div>
        ) : occupiedRooms.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm text-center py-20 px-6 space-y-3">
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-slate-300" />
              </div>
            </div>
            <p className="font-bold text-slate-500 text-sm">All rooms are currently vacant</p>
            <p className="text-xs text-slate-400 font-medium">No guests to checkout right now.</p>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm text-center py-16 px-6">
            <p className="text-slate-400 font-bold text-sm">No results for &ldquo;{searchQuery}&rdquo;</p>
          </div>
        ) : (
          <>
            {/* ── Mobile Card List (< md) ─────────────────── */}
            <div className="mobile-cards-wrapper space-y-3">
              {filteredRooms.map((room) => {
                const stay = roomStays[room.id];
                const checkoutDate = stay ? new Date(stay.expected_checkout) : null;
                const isOverdue = checkoutDate ? checkoutDate.getTime() < Date.now() : false;
                const pendingDues = stay ? Number(stay.payment?.pending || 0) : 0;

                return (
                  <div
                    key={room.id}
                    className="mobile-card shadow-sm"
                    onClick={() => setSelectedRoom(room)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedRoom(room); }}
                    aria-label={`Room ${room.room_number} — ${stay?.primary_customer?.full_name || 'Guest'}`}
                  >
                    {/* Room number + overdue badge */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-extrabold text-slate-800 leading-none">
                          {room.room_number}
                        </span>
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200/60">
                          {room.room_type}
                        </span>
                      </div>
                      {isOverdue && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200/60 text-[10px] font-bold">
                          <AlertTriangle className="w-3 h-3" />
                          Overdue
                        </span>
                      )}
                    </div>

                    {/* Guest info */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-xs font-semibold text-slate-700 truncate">
                          {stay?.primary_customer?.full_name || 'Loading...'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-xs font-medium text-slate-600 truncate">
                          {stay?.primary_customer?.phone || '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-xs text-slate-500 font-medium">
                          {stay ? new Date(stay.check_in).toLocaleDateString('en-IN') : '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className={`text-xs font-medium ${isOverdue ? 'text-red-600' : 'text-slate-500'}`}>
                          {stay ? new Date(stay.expected_checkout).toLocaleDateString('en-IN') : '—'}
                        </span>
                      </div>
                    </div>

                    {/* Dues + CTA */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <IndianRupee className="w-3.5 h-3.5 text-slate-400" />
                        <span className={`text-sm font-bold ${pendingDues > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {pendingDues > 0 ? `₹${pendingDues.toLocaleString('en-IN')} pending` : 'Fully paid'}
                        </span>
                      </div>
                      <button
                        id={`checkout-btn-${room.id}`}
                        onClick={(e) => { e.stopPropagation(); setSelectedRoom(room); }}
                        className="bg-primary hover:bg-primary-hover active:scale-[0.95] active:opacity-85 text-white font-bold px-4 py-2.5 rounded-xl transition-all duration-75 text-xs inline-flex items-center gap-1.5 shadow-sm min-h-[44px]"
                      >
                        <DoorClosed className="w-3.5 h-3.5" />
                        Checkout
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Desktop Table (≥ md) ───────────────────── */}
            <div className="desktop-table-wrapper bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-200/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="px-6 py-4 sticky-th">Room No</th>
                      <th className="px-6 py-4 sticky-th">Primary Guest</th>
                      <th className="px-6 py-4 sticky-th">Phone Number</th>
                      <th className="px-6 py-4 sticky-th">Checked In</th>
                      <th className="px-6 py-4 sticky-th">Expected Checkout</th>
                      <th className="px-6 py-4 sticky-th">Pending Dues</th>
                      <th className="px-6 py-4 text-right sticky-th">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
                    {filteredRooms.map((room) => {
                      const stay = roomStays[room.id];
                      const checkoutDate = stay ? new Date(stay.expected_checkout) : null;
                      const isOverdue = checkoutDate ? checkoutDate.getTime() < Date.now() : false;
                      
                      return (
                        <tr key={room.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-slate-900">{room.room_number}</td>
                          <td className="px-6 py-4 font-semibold text-slate-800">{stay?.primary_customer?.full_name || 'Loading...'}</td>
                          <td className="px-6 py-4 text-slate-600">{stay?.primary_customer?.phone || 'Loading...'}</td>
                          <td className="px-6 py-4 text-slate-600">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {stay ? new Date(stay.check_in).toLocaleDateString('en-IN') : '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${isOverdue ? 'bg-red-50 text-red-700 border border-red-200/60 font-semibold' : 'text-slate-600'}`}>
                              <Calendar className="w-3.5 h-3.5" />
                              {stay ? new Date(stay.expected_checkout).toLocaleDateString('en-IN') : '-'}
                              {isOverdue && ' (Overdue)'}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-semibold">
                            {stay && Number(stay.payment?.pending) > 0 ? (
                              <span className="text-red-600">₹{Number(stay.payment.pending).toLocaleString('en-IN')}</span>
                            ) : (
                              <span className="text-emerald-600">₹0</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              id={`checkout-table-btn-${room.id}`}
                              onClick={() => setSelectedRoom(room)}
                              className="bg-primary hover:bg-primary-hover active:scale-[0.95] active:opacity-85 text-white font-semibold px-3 py-2 rounded-lg transition-all duration-75 text-[11px] inline-flex items-center gap-1 shadow-sm"
                            >
                              <DoorClosed className="w-3.5 h-3.5" />
                              Process Checkout
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Checkout Modal */}
      {selectedRoom && currentHotel && (
        <RoomDetailModal 
          room={selectedRoom} 
          hotelId={currentHotel.id} 
          onClose={() => setSelectedRoom(null)} 
          onStatusChanged={handleRoomStatusChanged}
        />
      )}
    </DashboardLayout>
  );
}
