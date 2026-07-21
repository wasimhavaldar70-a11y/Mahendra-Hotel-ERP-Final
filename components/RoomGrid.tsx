'use client';

// ========================================================
// StayDesk CRM / HotelFlow CRM Room Grid component
// Location: components/RoomGrid.tsx
// ========================================================

import React, { useMemo } from 'react';
import { Room } from '../types';
import { db } from '../lib/supabase/client';
import { Sparkles, Wrench, CheckCircle, Flame, User } from 'lucide-react';

interface RoomGridProps {
  rooms: Room[];
  hotelId: string;
  activeStays: Record<string, { guestName: string; phone: string; price: number }>;
  onRoomClick: (room: Room) => void;
}

function RoomGrid({ rooms, hotelId, activeStays, onRoomClick }: RoomGridProps) {

  // Group rooms by floor and sort them, memoized to prevent recalculation on every render
  const { floors, sortedFloors } = useMemo(() => {
    const floorGroups = rooms.reduce((acc, room) => {
      const floor = room.floor || 'Ground Floor';
      if (!acc[floor]) {
        acc[floor] = [];
      }
      acc[floor].push(room);
      return acc;
    }, {} as Record<string, Room[]>);

    const floorOrder = ['Ground Floor', 'First Floor', 'Second Floor', 'Third Floor', 'Fourth Floor'];
    const sorted = Object.keys(floorGroups).sort((a, b) => {
      const indexA = floorOrder.indexOf(a);
      const indexB = floorOrder.indexOf(b);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      return a.localeCompare(b);
    });

    return { floors: floorGroups, sortedFloors: sorted };
  }, [rooms]);

  const getCardStyles = (status: Room['status']) => {
    switch (status) {
      case 'Ready':
        return {
          card: 'bg-[#15803D] hover:bg-[#115E59] text-white border-[#115E59]/40 shadow-sm hover:shadow-md',
          badge: 'bg-white/10 text-white border-white/15 backdrop-blur-sm',
          subText: 'text-teal-50/80',
          primaryText: 'text-white'
        };
      case 'Occupied':
        return {
          card: 'bg-[#B91C1C] hover:bg-[#991B1B] text-white border-[#991B1B]/40 shadow-sm hover:shadow-md',
          badge: 'bg-white/10 text-white border-white/15 backdrop-blur-sm',
          subText: 'text-rose-50/80',
          primaryText: 'text-white'
        };
      case 'Cleaning':
        return {
          card: 'bg-[#D97706] hover:bg-[#B45309] text-white border-[#B45309]/40 shadow-sm hover:shadow-md',
          badge: 'bg-white/10 text-white border-white/15 backdrop-blur-sm',
          subText: 'text-amber-50/80',
          primaryText: 'text-white'
        };
      case 'Maintenance':
        return {
          card: 'bg-[#4B5563] hover:bg-[#374151] text-white border-[#374151]/40 shadow-sm hover:shadow-md',
          badge: 'bg-white/10 text-white border-white/15 backdrop-blur-sm',
          subText: 'text-slate-100/80',
          primaryText: 'text-white'
        };
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
                const styles = getCardStyles(room.status);
                
                return (
                  <button
                    key={room.id}
                    onClick={() => onRoomClick(room)}
                    className={`flex flex-col p-4 rounded-2xl text-left border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer select-none transform hover:-translate-y-0.5 active:scale-[0.98] ${styles.card}`}
                  >
                    {/* Status Icons */}
                    <div className="flex justify-between items-center w-full">
                      <span className="text-base font-bold tracking-tight text-white">{room.room_number}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold border ${styles.badge}`}>
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
                          <span className={`text-xs font-bold truncate block ${styles.primaryText}`}>
                            {stayInfo ? stayInfo.guestName : 'Occupied'}
                          </span>
                          {stayInfo?.phone && (
                            <span className={`text-[10px] font-medium truncate block mt-0.5 ${styles.subText}`}>
                              {stayInfo.phone}
                            </span>
                          )}
                          <span className={`text-[11px] font-semibold block mt-1 ${styles.primaryText}`}>
                            ₹{stayInfo ? stayInfo.price.toLocaleString('en-IN') : Number(room.price).toLocaleString('en-IN')}
                          </span>
                        </>
                      ) : (
                        <div className="flex flex-col">
                          <span className={`text-[10px] uppercase font-semibold tracking-wider ${styles.subText}`}>
                            {room.room_type}
                          </span>
                          <span className={`text-xs font-bold mt-1 block ${styles.primaryText}`}>
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

export default React.memo(RoomGrid);
