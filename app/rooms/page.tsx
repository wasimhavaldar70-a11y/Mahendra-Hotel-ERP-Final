'use client';

// ========================================================
// StayDesk CRM / HotelFlow CRM Rooms Management Screen
// Location: app/rooms/page.tsx
// ========================================================

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { db, getSessionUser } from '../../lib/supabase/client';
import { Room, RoomStatus } from '../../types';
import { 
  BedDouble, 
  Plus, 
  Trash2, 
  Wrench, 
  Sparkles, 
  CheckCircle,
  Filter,
  X
} from 'lucide-react';

export default function RoomsPage() {
  const [currentHotel, setCurrentHotel] = useState<any>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [floorFilter, setFloorFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Add Room form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [roomNumber, setRoomNumber] = useState('');
  const [roomType, setRoomType] = useState('Deluxe Room');
  const [floor, setFloor] = useState('Ground Floor');
  const [price, setPrice] = useState('');
  const [capacity, setCapacity] = useState(2);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadRooms = async (hotelId: string) => {
    try {
      const data = await db.getRooms(hotelId);
      setRooms(data);
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
      loadRooms(session.hotel.id);
      
      const channel = new BroadcastChannel('hotelflow-sync');
      channel.onmessage = (event) => {
        if (event.data && event.data.type === 'DB_UPDATE') {
          loadRooms(session.hotel.id);
        }
      };

      return () => {
        channel.close();
      };
    }
  }, []);

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHotel) return;

    const newErrors: Record<string, string> = {};
    const cleanRoomNum = roomNumber.trim();
    if (!cleanRoomNum) {
      newErrors.roomNumber = 'Room number is required';
    } else if (!/^[A-Z0-9]+$/.test(cleanRoomNum)) {
      newErrors.roomNumber = 'Room number must be alphanumeric (letters and numbers only)';
    }

    const priceNum = Number(price);
    if (!price || isNaN(priceNum) || priceNum <= 0) {
      newErrors.price = 'Price must be a positive number greater than 0';
    }

    if (!capacity || capacity <= 0) {
      newErrors.capacity = 'Capacity must be greater than 0';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setError('');
    const numMatch = rooms.some(r => r.room_number.toUpperCase() === cleanRoomNum.toUpperCase());
    if (numMatch) {
      setError(`Room ${cleanRoomNum} already exists.`);
      return;
    }

    try {
      await db.addRoom(currentHotel.id, {
        room_number: cleanRoomNum,
        room_type: roomType,
        price: priceNum,
        floor: floor,
        capacity: Number(capacity)
      });
      
      // Reset form
      setRoomNumber('');
      setPrice('');
      setCapacity(2);
      setErrors({});
      setShowAddForm(false);
      loadRooms(currentHotel.id);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to add room.');
    }
  };

  const handleToggleStatus = async (roomId: string, currentStatus: RoomStatus) => {
    // Cycle status: Ready -> Cleaning -> Maintenance -> Ready (skip Occupied manually)
    let nextStatus: RoomStatus = 'Ready';
    if (currentStatus === 'Ready') nextStatus = 'Cleaning';
    else if (currentStatus === 'Cleaning') nextStatus = 'Maintenance';
    else if (currentStatus === 'Maintenance') nextStatus = 'Ready';
    else return; // Don't toggle occupied rooms from here

    try {
      await db.updateRoomStatus(currentHotel.id, roomId, nextStatus);
      loadRooms(currentHotel.id);
    } catch (err) {
      console.error(err);
    }
  };

  // Extract unique floors
  const floors = Array.from(new Set(rooms.map(r => r.floor || 'Ground Floor'))).sort();

  // Filtered rooms list
  const filteredRooms = rooms.filter(room => {
    const floorMatch = floorFilter === 'All' || room.floor === floorFilter;
    const statusMatch = statusFilter === 'All' || room.status === statusFilter;
    return floorMatch && statusMatch;
  });

  const getStatusBadge = (status: RoomStatus) => {
    switch (status) {
      case 'Ready':
        return 'bg-[#0F4C45]/5 text-[#0F4C45] border-[#0F4C45]/20';
      case 'Occupied':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'Maintenance':
        return 'bg-slate-50 text-slate-700 border-slate-200';
      case 'Cleaning':
        return 'bg-[#D4AF37]/5 text-[#B8902C] border-[#D4AF37]/20';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <BedDouble className="w-5 h-5 text-primary" />
              Room Management
            </h1>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Define room configurations, pricing, and update clean status.</p>
          </div>

          <button
            onClick={() => setShowAddForm(true)}
            className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add New Room
          </button>
        </div>

        {/* Add Room Modal Drawer */}
        {showAddForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[24px] w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">Add New Hotel Room</h3>
                <button onClick={() => setShowAddForm(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddRoom} className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 text-xs font-semibold text-red-600 rounded-xl border border-red-100">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Room Number *</label>
                  <input
                    type="text"
                    required
                    value={roomNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10);
                      setRoomNumber(val);
                      if (errors.roomNumber) {
                        setErrors(prev => {
                          const copy = { ...prev };
                          delete copy.roomNumber;
                          return copy;
                        });
                      }
                    }}
                    className={`w-full text-xs font-bold text-slate-700 bg-slate-50/50 border rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary ${
                      errors.roomNumber ? 'border-red-500 focus:ring-red-500' : 'border-[#E2E8F0]/80'
                    }`}
                    placeholder="e.g. 101"
                  />
                  {errors.roomNumber && (
                    <span className="text-[10px] font-bold text-red-500 mt-1 block">{errors.roomNumber}</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Room Type</label>
                    <select
                      value={roomType}
                      onChange={(e) => setRoomType(e.target.value)}
                      className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none"
                    >
                      <option value="Deluxe Room">Deluxe Room</option>
                      <option value="Super Deluxe Room">Super Deluxe Room</option>
                      <option value="Family Suite">Family Suite</option>
                      <option value="Executive Suite">Executive Suite</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Floor</label>
                    <select
                      value={floor}
                      onChange={(e) => setFloor(e.target.value)}
                      className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none"
                    >
                      <option value="Ground Floor">Ground Floor</option>
                      <option value="First Floor">First Floor</option>
                      <option value="Second Floor">Second Floor</option>
                      <option value="Third Floor">Third Floor</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Base Price per Night (₹) *</label>
                    <input
                      type="number"
                      required
                      value={price}
                      onChange={(e) => {
                        setPrice(e.target.value);
                        if (errors.price) {
                          setErrors(prev => {
                            const copy = { ...prev };
                            delete copy.price;
                            return copy;
                          });
                        }
                      }}
                      className={`w-full text-xs font-bold text-slate-700 bg-slate-50/50 border rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary ${
                        errors.price ? 'border-red-500 focus:ring-red-500' : 'border-[#E2E8F0]/80'
                      }`}
                      placeholder="e.g. 1800"
                    />
                    {errors.price && (
                      <span className="text-[10px] font-bold text-red-500 mt-1 block">{errors.price}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Capacity (Persons) *</label>
                    <input
                      type="number"
                      required
                      value={capacity}
                      onChange={(e) => {
                        setCapacity(Number(e.target.value));
                        if (errors.capacity) {
                          setErrors(prev => {
                            const copy = { ...prev };
                            delete copy.capacity;
                            return copy;
                          });
                        }
                      }}
                      className={`w-full text-xs font-bold text-slate-700 bg-slate-50/50 border rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary ${
                        errors.capacity ? 'border-red-500 focus:ring-red-500' : 'border-[#E2E8F0]/80'
                      }`}
                      min="1"
                    />
                    {errors.capacity && (
                      <span className="text-[10px] font-bold text-red-500 mt-1 block">{errors.capacity}</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-primary text-white text-xs font-bold py-3 rounded-xl hover:bg-primary-hover shadow-md hover:shadow-lg transition-all"
                  >
                    Save Room configuration
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

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-[24px] border border-[#E2E8F0]/40 shadow-sm flex flex-wrap gap-4 items-center">
          <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            Filters:
          </span>

          {/* Floor selection */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold">Floor:</span>
            <select
              value={floorFilter}
              onChange={(e) => setFloorFilter(e.target.value)}
              className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="All">All Floors</option>
              {floors.map(fl => (
                <option key={fl} value={fl}>{fl}</option>
              ))}
            </select>
          </div>

          {/* Status selection */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="All">All Statuses</option>
              <option value="Ready">Ready</option>
              <option value="Occupied">Occupied</option>
              <option value="Cleaning">Cleaning</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          </div>
        </div>

        {/* Rooms Table List */}
        <div className="bg-white rounded-[24px] border border-[#E2E8F0]/40 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="text-center py-20 text-slate-400 font-bold text-sm">
              No matching rooms found. Add some rooms or clear filters!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-4">Room Number</th>
                    <th className="px-6 py-4">Floor</th>
                    <th className="px-6 py-4">Room Type</th>
                    <th className="px-6 py-4">Capacity</th>
                    <th className="px-6 py-4">Price per Night</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Quick Toggle Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
                  {filteredRooms.map((room) => (
                    <tr key={room.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-extrabold text-slate-900">{room.room_number}</td>
                      <td className="px-6 py-4 text-slate-500">{room.floor}</td>
                      <td className="px-6 py-4">{room.room_type}</td>
                      <td className="px-6 py-4 text-slate-500">{room.capacity} Persons</td>
                      <td className="px-6 py-4 font-bold text-slate-800">₹{room.price}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(room.status)}`}>
                          {room.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {room.status === 'Occupied' ? (
                          <span className="text-[10px] text-slate-400 font-semibold italic">In Use (Checkout to toggle)</span>
                        ) : (
                          <button
                            onClick={() => handleToggleStatus(room.id, room.status)}
                            className="bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold px-3 py-1.5 rounded-lg transition-colors text-[10px]"
                          >
                            Cycle Status
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
