'use client';

// ========================================================
// StayDesk CRM / HotelFlow CRM Room Grid component
// Location: components/RoomGrid.tsx
// ========================================================

import React, { useState, useEffect } from 'react';
import { Room } from '../types';
import { db } from '../lib/supabase/client';
import { Sparkles, Wrench, CheckCircle, Flame, User } from 'lucide-react';

interface RoomGridProps {
  rooms: Room[];
  hotelId: string;
  onRoomClick: (room: Room) => void;
}

export default function RoomGrid({ rooms, hotelId, onRoomClick }: RoomGridProps) {
  const [activeStays, setActiveStays] = useState<Record<string, { guestName: string; phone: string; price: number }>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // For occupied rooms, load the guest names and checkout details to show on dashboard grid
    const loadOccupiedGuests = async () => {
      setLoading(true);
      try {
        const stays = await db.getActiveStaysForHotel(hotelId);
        const staysMap: Record<string, { guestName: string; phone: string; price: number }> = {};
        
        stays.forEach(stay => {
          if (stay.room_id) {
            const roomObj = rooms.find(r => r.id === stay.room_id);
            staysMap[stay.room_id] = {
              guestName: stay.primary_customer?.full_name || 'Guest',
              phone: stay.primary_customer?.phone || '',
              price: Number(stay.payment?.room_price || roomObj?.price || 0)
            };
          }
        });
        
        setActiveStays(staysMap);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (rooms.length > 0) {
      loadOccupiedGuests();
    }
  }, [rooms, hotelId]);

  // Group rooms by floor
  const floors = rooms.reduce((acc, room) => {
    const floor = room.floor || 'Ground Floor';
    if (!acc[floor]) {
      acc[floor] = [];
    }
    acc[floor].push(room);
    return acc;
  }, {} as Record<string, Room[]>);

  // Sort floors in descending order so Ground Floor is at the bottom, or ascending?
  // Let's sort Ground, First, Second, Third.
  const floorOrder = ['Ground Floor', 'First Floor', 'Second Floor', 'Third Floor', 'Fourth Floor'];
  const sortedFloors = Object.keys(floors).sort((a, b) => {
    const indexA = floorOrder.indexOf(a);
    const indexB = floorOrder.indexOf(b);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    return a.localeCompare(b);
  });

  const getStatusBadge = (status: Room['status']) => {
    switch (status) {
      case 'Ready':
        return 'bg-green-50 text-green-700 border-green-200/60';
      case 'Occupied':
        return 'bg-red-50 text-red-700 border-red-200/60';
      case 'Maintenance':
        return 'bg-slate-100 text-slate-700 border-slate-200/60';
      case 'Cleaning':
        return 'bg-amber-50 text-amber-700 border-amber-200/60';
    }
  };

  return (
    <div className="space-y-8">
      {sortedFloors.map((floorName) => {
        const floorRooms = floors[floorName].sort((a, b) => a.room_number.localeCompare(b.room_number));
        return (
          <div key={floorName} className="space-y-3.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100/80 border border-slate-200/30 px-3 py-1 rounded-full">
                {floorName}
              </span>
              <div className="h-[1px] bg-slate-200/60 flex-1"></div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {floorRooms.map((room) => {
                const isOccupied = room.status === 'Occupied';
                const stayInfo = activeStays[room.id];
                
                return (
                  <button
                    key={room.id}
                    onClick={() => onRoomClick(room)}
                    className="flex flex-col p-4 rounded-xl text-left bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer select-none transform hover:-translate-y-0.5 active:scale-[0.98]"
                  >
                    {/* Status Icons */}
                    <div className="flex justify-between items-center w-full">
                      <span className="text-base font-bold text-slate-800 tracking-tight">{room.room_number}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold border ${getStatusBadge(room.status)}`}>
                        {room.status === 'Ready' && <CheckCircle className="w-3 h-3" />}
                        {room.status === 'Cleaning' && <Sparkles className="w-3 h-3" />}
                        {room.status === 'Maintenance' && <Wrench className="w-3 h-3" />}
                        {room.status === 'Occupied' && <User className="w-3 h-3" />}
                        <span>{room.status}</span>
                      </span>
                    </div>

                    {/* Room Metadata */}
                    <div className="mt-4 w-full min-h-[54px] flex flex-col justify-end">
                      {isOccupied ? (
                        <>
                          <span className="text-xs font-bold text-slate-900 truncate block">
                            {stayInfo ? stayInfo.guestName : 'Occupied'}
                          </span>
                          {stayInfo?.phone && (
                            <span className="text-[10px] font-medium text-slate-500 truncate block mt-0.5">
                              {stayInfo.phone}
                            </span>
                          )}
                          <span className="text-[11px] font-semibold text-slate-800 block mt-1">
                            ₹{stayInfo ? stayInfo.price.toLocaleString('en-IN') : Number(room.price).toLocaleString('en-IN')}
                          </span>
                        </>
                      ) : (
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                            {room.room_type}
                          </span>
                          <span className="text-xs font-bold text-slate-700 mt-1 block">
                            ₹{Number(room.price).toLocaleString('en-IN')}/night
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
