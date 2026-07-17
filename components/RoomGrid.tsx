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
      const occupiedRooms = rooms.filter(r => r.status === 'Occupied');
      const staysMap: Record<string, { guestName: string; phone: string; price: number }> = {};
      
      await Promise.all(
        occupiedRooms.map(async (room) => {
          try {
            const stay = await db.getActiveStayForRoom(hotelId, room.id);
            if (stay) {
              staysMap[room.id] = {
                guestName: stay.primary_customer?.full_name || 'Guest',
                phone: stay.primary_customer?.phone || '',
                price: Number(stay.payment?.room_price || room.price)
              };
            }
          } catch (err) {
            console.error(err);
          }
        })
      );
      
      setActiveStays(staysMap);
      setLoading(false);
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

  const getStatusColor = (status: Room['status']) => {
    switch (status) {
      case 'Ready':
        return 'bg-gradient-to-br from-[#0F4C45] to-[#0B2C24] text-white hover:shadow-lg hover:shadow-[#0F4C45]/20 border border-white/10';
      case 'Occupied':
        return 'bg-gradient-to-br from-[#8C2A2A] to-[#601A1A] text-white hover:shadow-lg hover:shadow-[#8C2A2A]/25 border border-white/10';
      case 'Maintenance':
        return 'bg-gradient-to-br from-[#475569] to-[#334155] text-white hover:shadow-lg hover:shadow-slate-500/20 border border-white/10';
      case 'Cleaning':
        return 'bg-gradient-to-br from-[#D4AF37] to-[#B8902C] text-white hover:shadow-lg hover:shadow-[#D4AF37]/20 border border-white/10';
    }
  };

  return (
    <div className="space-y-8">
      {sortedFloors.map((floorName) => {
        const floorRooms = floors[floorName].sort((a, b) => a.room_number.localeCompare(b.room_number));
        return (
          <div key={floorName} className="space-y-3.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">
                {floorName}
              </span>
              <div className="h-[1px] bg-slate-100 flex-1"></div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {floorRooms.map((room) => {
                const isOccupied = room.status === 'Occupied';
                const stayInfo = activeStays[room.id];
                
                return (
                  <button
                    key={room.id}
                    onClick={() => onRoomClick(room)}
                    className={`flex flex-col p-4 rounded-[22px] text-left transition-all duration-300 cursor-pointer shadow-lg select-none transform hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98] ${getStatusColor(room.status)}`}
                  >
                    {/* Status Icons */}
                    <div className="flex justify-between items-start w-full">
                      <span className="text-lg font-black tracking-tight">{room.room_number}</span>
                      <div className="opacity-90">
                        {room.status === 'Ready' && <CheckCircle className="w-4 h-4" />}
                        {room.status === 'Cleaning' && <Sparkles className="w-4 h-4" />}
                        {room.status === 'Maintenance' && <Wrench className="w-4 h-4" />}
                        {room.status === 'Occupied' && <User className="w-4 h-4" />}
                      </div>
                    </div>

                    {/* Room Metadata */}
                    <div className="mt-4 w-full min-h-[58px] flex flex-col justify-end">
                      {isOccupied ? (
                        <>
                          <span className="text-xs font-extrabold truncate uppercase tracking-wide block">
                            {stayInfo ? stayInfo.guestName : 'Occupied'}
                          </span>
                          {stayInfo?.phone && (
                            <span className="text-[10px] font-semibold opacity-90 truncate block mt-0.5">
                              {stayInfo.phone}
                            </span>
                          )}
                          <span className="text-[11px] font-medium opacity-90 block mt-0.5">
                            ₹{stayInfo ? stayInfo.price : room.price}
                          </span>
                        </>
                      ) : (
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold opacity-80 leading-none">
                            {room.room_type.split(' ')[0]}
                          </span>
                          <span className="text-xs font-bold mt-1 block">
                            {room.status}
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
