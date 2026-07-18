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
import { DoorClosed, Search, Eye, AlertTriangle, Clock, Calendar } from 'lucide-react';

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
      const list = await db.getRooms(hotelId);
      const occupied = list.filter(r => r.status === 'Occupied');
      setOccupiedRooms(occupied);

      const staysMap: Record<string, any> = {};
      await Promise.all(
        occupied.map(async (room) => {
          const stay = await db.getActiveStayForRoom(hotelId, room.id);
          if (stay) {
            staysMap[room.id] = stay;
          }
        })
      );
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
          // Apply jittered debounce (300ms to 800ms) to stagger DB hits across open tabs
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
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <DoorClosed className="w-5 h-5 text-primary" />
            Active Stays & Check-Out Desk
          </h1>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Quickly find check-out due lists, outstanding balances, and print receipt bills.</p>
        </div>

        {/* Search */}
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search occupied rooms by room number, guest name, or phone..."
            className="block w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-10 pr-3 text-sm font-medium placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
          />
        </div>

        {/* List */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
            </div>
          ) : occupiedRooms.length === 0 ? (
            <div className="text-center py-20 text-slate-400 font-bold text-sm space-y-2">
              <div className="flex justify-center">
                <AlertTriangle className="w-8 h-8 text-slate-300" />
              </div>
              <p>All rooms are currently vacant or in maintenance. No guests to checkout.</p>
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="text-center py-20 text-slate-400 font-bold text-sm">
              No occupied rooms matching "{searchQuery}"
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-4">Room No</th>
                    <th className="px-6 py-4">Primary Guest</th>
                    <th className="px-6 py-4">Phone Number</th>
                    <th className="px-6 py-4">Checked In</th>
                    <th className="px-6 py-4">Expected Checkout</th>
                    <th className="px-6 py-4">Pending dues</th>
                    <th className="px-6 py-4 text-right">Actions</th>
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
                            onClick={() => setSelectedRoom(room)}
                            className="bg-primary hover:bg-primary-hover text-white font-semibold px-3 py-1.5 rounded-lg transition-colors text-[11px] inline-flex items-center gap-1 shadow-sm"
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
          )}
        </div>
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
