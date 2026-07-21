'use client';

// ========================================================
// StayDesk CRM / HotelFlow CRM Rooms Management Screen
// Location: app/rooms/page.tsx
// ========================================================

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import LoadingButton from '../../components/ui/LoadingButton';
import { db, getSessionUser } from '../../lib/supabase/client';
import { Room, RoomStatus } from '../../types';
import { 
  BedDouble, 
  Plus, 
  Trash2, 
  Wrench, 
  Sparkles, 
  CheckCircle,
  X,
  Pencil,
  Users,
  IndianRupee,
  Layers
} from 'lucide-react';

export default function RoomsPage() {
  const [currentHotel, setCurrentHotel] = useState<any>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('receptionist');
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState('All');

  // Add Room form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [roomNumber, setRoomNumber] = useState('');
  const [roomType, setRoomType] = useState('Deluxe A/C');
  const [floor, setFloor] = useState('Ground Floor');
  const [price, setPrice] = useState('');
  const [capacity, setCapacity] = useState(2);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [addingRoom, setAddingRoom] = useState(false);

  // Edit Room form state
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editRoomNumber, setEditRoomNumber] = useState('');
  const [editRoomType, setEditRoomType] = useState('Deluxe A/C');
  const [editFloor, setEditFloor] = useState('Ground Floor');
  const [editPrice, setEditPrice] = useState('');
  const [editCapacity, setEditCapacity] = useState(2);
  const [editError, setEditError] = useState('');
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editingRoom_loading, setEditingRoomLoading] = useState(false);

  // Toggle status loading state per room
  const [togglingRoom, setTogglingRoom] = useState<string | null>(null);

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
      setUserRole(session.user?.role || 'receptionist');
      loadRooms(session.hotel.id);
      
      let syncTimeout: NodeJS.Timeout | null = null;
      const channel = new BroadcastChannel('hotelflow-sync');
      channel.onmessage = (event) => {
        if (event.data && event.data.type === 'DB_UPDATE') {
          if (syncTimeout) clearTimeout(syncTimeout);
          const delay = 300 + Math.random() * 500;
          syncTimeout = setTimeout(() => {
            loadRooms(session.hotel.id);
          }, delay);
        }
      };

      return () => {
        if (syncTimeout) clearTimeout(syncTimeout);
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

    setAddingRoom(true);
    try {
      await db.addRoom(currentHotel.id, {
        room_number: cleanRoomNum,
        room_type: roomType,
        price: priceNum,
        floor: floor,
        capacity: Number(capacity)
      });
      
      setRoomNumber('');
      setPrice('');
      setCapacity(2);
      setErrors({});
      setShowAddForm(false);
      loadRooms(currentHotel.id);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to add room.');
    } finally {
      setAddingRoom(false);
    }
  };

  const openEditModal = (room: Room) => {
    setEditingRoom(room);
    setEditRoomNumber(room.room_number);
    setEditRoomType(room.room_type);
    setEditFloor(room.floor || 'Ground Floor');
    setEditPrice(room.price.toString());
    setEditCapacity(room.capacity);
    setEditError('');
    setEditErrors({});
    setShowEditForm(true);
  };

  const handleEditRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHotel || !editingRoom) return;

    const newErrors: Record<string, string> = {};
    const cleanRoomNum = editRoomNumber.trim();
    if (!cleanRoomNum) {
      newErrors.roomNumber = 'Room number is required';
    } else if (!/^[A-Z0-9]+$/.test(cleanRoomNum)) {
      newErrors.roomNumber = 'Room number must be alphanumeric (letters and numbers only)';
    }

    const priceNum = Number(editPrice);
    if (!editPrice || isNaN(priceNum) || priceNum <= 0) {
      newErrors.price = 'Price must be a positive number greater than 0';
    }

    if (!editCapacity || editCapacity <= 0) {
      newErrors.capacity = 'Capacity must be greater than 0';
    }

    if (Object.keys(newErrors).length > 0) {
      setEditErrors(newErrors);
      return;
    }

    setEditErrors({});
    setEditError('');
    const numMatch = rooms.some(r => r.id !== editingRoom.id && r.room_number.toUpperCase() === cleanRoomNum.toUpperCase());
    if (numMatch) {
      setEditError(`Room ${cleanRoomNum} already exists.`);
      return;
    }

    setEditingRoomLoading(true);
    try {
      await db.updateRoomDetails(currentHotel.id, editingRoom.id, {
        room_number: cleanRoomNum,
        room_type: editRoomType,
        price: priceNum,
        floor: editFloor,
        capacity: Number(editCapacity)
      });
      
      setEditingRoom(null);
      setEditErrors({});
      setShowEditForm(false);
      loadRooms(currentHotel.id);
    } catch (err) {
      console.error(err);
      setEditError(err instanceof Error ? err.message : 'Failed to update room.');
    } finally {
      setEditingRoomLoading(false);
    }
  };

  const handleDeleteRoom = async (roomId: string, roomNumber: string) => {
    if (!currentHotel) return;
    if (!confirm(`Are you sure you want to delete Room ${roomNumber}? This cannot be undone.`)) return;

    try {
      await db.deleteRoom(currentHotel.id, roomId);
      loadRooms(currentHotel.id);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to delete room.');
    }
  };

  const handleToggleStatus = async (roomId: string, currentStatus: RoomStatus) => {
    let nextStatus: RoomStatus = 'Ready';
    if (currentStatus === 'Ready') nextStatus = 'Cleaning';
    else if (currentStatus === 'Cleaning') nextStatus = 'Maintenance';
    else if (currentStatus === 'Maintenance') nextStatus = 'Ready';
    else return;

    setTogglingRoom(roomId);
    try {
      await db.updateRoomStatus(currentHotel.id, roomId, nextStatus);
      loadRooms(currentHotel.id);
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingRoom(null);
    }
  };

  // Extract unique floors
  const floors = Array.from(new Set(rooms.map(r => r.floor || 'Ground Floor'))).sort();

  // Filtered rooms list
  const filteredRooms = rooms.filter(room => {
    const statusMatch = statusFilter === 'All' || room.status === statusFilter;
    return statusMatch;
  });

  const getStatusBadge = (status: RoomStatus) => {
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

  const getStatusDot = (status: RoomStatus) => {
    switch (status) {
      case 'Ready': return 'bg-green-500';
      case 'Occupied': return 'bg-red-500';
      case 'Maintenance': return 'bg-slate-400';
      case 'Cleaning': return 'bg-amber-500';
    }
  };

  const modalInputClass = "w-full text-sm font-medium text-slate-700 bg-slate-50/60 border border-slate-200 rounded-xl px-3.5 py-3 focus:bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors placeholder:text-slate-400";

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <BedDouble className="w-5 h-5 text-primary" />
              Room Management
            </h1>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Define room configurations, pricing, and update clean status.</p>
          </div>

          {userRole !== 'receptionist' && (
            <button
              id="add-room-btn"
              onClick={() => setShowAddForm(true)}
              className="bg-primary hover:bg-primary-hover active:scale-[0.95] active:opacity-85 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 min-h-[44px] shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Room</span>
              <span className="sm:hidden">Add</span>
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="filter-pills">
          {['All', 'Ready', 'Occupied', 'Cleaning', 'Maintenance'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`filter-pill ${statusFilter === s ? 'active' : ''}`}
            >
              {s !== 'All' && <span className={`w-2 h-2 rounded-full ${
                s === 'Ready' ? 'bg-green-500' :
                s === 'Occupied' ? 'bg-red-500' :
                s === 'Cleaning' ? 'bg-amber-500' : 'bg-slate-400'
              } ${statusFilter === s ? 'bg-white' : ''}`} />}
              {s} {s !== 'All' && `(${rooms.filter(r => r.status === s).length})`}
            </button>
          ))}
        </div>

        {/* ── Add Room Modal ──────────────────────────────── */}
        {showAddForm && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm animate-fade-overlay modal-responsive">
            <div className="modal-sheet shadow-2xl border border-slate-100">
              <div className="modal-drag-handle sm:hidden" />
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-800">Add New Hotel Room</h3>
                <button 
                  onClick={() => setShowAddForm(false)} 
                  className="p-2.5 rounded-xl text-slate-400 hover:bg-slate-100 active:scale-[0.93] min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Close"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              <form onSubmit={handleAddRoom} className="flex-1 overflow-y-auto">
                <div className="p-6 space-y-4">
                  {error && (
                    <div className="p-3 bg-red-50 text-xs font-semibold text-red-600 rounded-xl border border-red-100">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Room Number *</label>
                    <input
                      id="add-room-number"
                      type="text"
                      required
                      autoFocus
                      inputMode="text"
                      autoCapitalize="characters"
                      value={roomNumber}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10);
                        setRoomNumber(val);
                        if (errors.roomNumber) setErrors(prev => { const c = {...prev}; delete c.roomNumber; return c; });
                      }}
                      className={`${modalInputClass} ${errors.roomNumber ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : ''}`}
                      placeholder="e.g. 101"
                    />
                    {errors.roomNumber && <span className="text-[10px] font-bold text-red-500 mt-1 block">{errors.roomNumber}</span>}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Room Type</label>
                      <select value={roomType} onChange={(e) => setRoomType(e.target.value)} className={modalInputClass}>
                        <optgroup label="── A/C Rooms ──">
                          <option value="Standard A/C">Standard A/C</option>
                          <option value="Semi Deluxe A/C">Semi Deluxe A/C</option>
                          <option value="Deluxe A/C">Deluxe A/C</option>
                          <option value="Super Deluxe A/C">Super Deluxe A/C</option>
                          <option value="Family Suite A/C">Family Suite A/C</option>
                          <option value="Executive Suite A/C">Executive Suite A/C</option>
                          <option value="Dormitory A/C">Dormitory A/C</option>
                        </optgroup>
                        <optgroup label="── Non A/C Rooms ──">
                          <option value="Standard Non A/C">Standard Non A/C</option>
                          <option value="Semi Deluxe Non A/C">Semi Deluxe Non A/C</option>
                          <option value="Deluxe Non A/C">Deluxe Non A/C</option>
                          <option value="Super Deluxe Non A/C">Super Deluxe Non A/C</option>
                          <option value="Family Suite Non A/C">Family Suite Non A/C</option>
                          <option value="Executive Suite Non A/C">Executive Suite Non A/C</option>
                          <option value="Dormitory Non A/C">Dormitory Non A/C</option>
                        </optgroup>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Floor</label>
                      <select value={floor} onChange={(e) => setFloor(e.target.value)} className={modalInputClass}>
                        <option value="Ground Floor">Ground Floor</option>
                        <option value="First Floor">First Floor</option>
                        <option value="Second Floor">Second Floor</option>
                        <option value="Third Floor">Third Floor</option>
                        <option value="Fourth Floor">Fourth Floor</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Price per Night (₹) *</label>
                      <input
                        type="number"
                        required
                        inputMode="decimal"
                        value={price}
                        onChange={(e) => {
                          setPrice(e.target.value);
                          if (errors.price) setErrors(prev => { const c = {...prev}; delete c.price; return c; });
                        }}
                        className={`${modalInputClass} ${errors.price ? 'border-red-400' : ''}`}
                        placeholder="e.g. 1800"
                      />
                      {errors.price && <span className="text-[10px] font-bold text-red-500 mt-1 block">{errors.price}</span>}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Capacity *</label>
                      <input
                        type="number"
                        required
                        inputMode="numeric"
                        value={capacity}
                        onChange={(e) => {
                          setCapacity(Number(e.target.value));
                          if (errors.capacity) setErrors(prev => { const c = {...prev}; delete c.capacity; return c; });
                        }}
                        className={`${modalInputClass} ${errors.capacity ? 'border-red-400' : ''}`}
                        min="1"
                        max="20"
                      />
                      {errors.capacity && <span className="text-[10px] font-bold text-red-500 mt-1 block">{errors.capacity}</span>}
                    </div>
                  </div>
                </div>

                {/* Sticky footer */}
                <div className="sticky-action-footer sm:static sm:px-6 sm:py-5 sm:border-t sm:border-slate-100 sm:bg-slate-50/30 flex gap-3">
                  <LoadingButton
                    type="submit"
                    loading={addingRoom}
                    loadingText="Saving..."
                    className="flex-1 bg-primary text-white text-sm font-bold py-3 rounded-xl hover:bg-primary-hover shadow-md hover:shadow-lg transition-all"
                  >
                    Save Room
                  </LoadingButton>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="bg-slate-100 text-slate-600 text-sm font-bold px-5 py-3 rounded-xl hover:bg-slate-200 active:scale-[0.96] transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Edit Room Modal ─────────────────────────────── */}
        {showEditForm && editingRoom && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm animate-fade-overlay modal-responsive">
            <div className="modal-sheet shadow-2xl border border-slate-100">
              <div className="modal-drag-handle sm:hidden" />
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-800">Edit Room — {editingRoom.room_number}</h3>
                <button 
                  onClick={() => setShowEditForm(false)} 
                  className="p-2.5 rounded-xl text-slate-400 hover:bg-slate-100 active:scale-[0.93] min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Close"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              <form onSubmit={handleEditRoom} className="flex-1 overflow-y-auto">
                <div className="p-6 space-y-4">
                  {editError && (
                    <div className="p-3 bg-red-50 text-xs font-semibold text-red-600 rounded-xl border border-red-100">{editError}</div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Room Number *</label>
                    <input
                      type="text"
                      required
                      autoFocus
                      inputMode="text"
                      autoCapitalize="characters"
                      value={editRoomNumber}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10);
                        setEditRoomNumber(val);
                        if (editErrors.roomNumber) setEditErrors(prev => { const c = {...prev}; delete c.roomNumber; return c; });
                      }}
                      className={`${modalInputClass} ${editErrors.roomNumber ? 'border-red-400' : ''}`}
                      placeholder="e.g. 101"
                    />
                    {editErrors.roomNumber && <span className="text-[10px] font-bold text-red-500 mt-1 block">{editErrors.roomNumber}</span>}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Room Type</label>
                      <select value={editRoomType} onChange={(e) => setEditRoomType(e.target.value)} className={modalInputClass}>
                        <optgroup label="── A/C Rooms ──">
                          <option value="Standard A/C">Standard A/C</option>
                          <option value="Semi Deluxe A/C">Semi Deluxe A/C</option>
                          <option value="Deluxe A/C">Deluxe A/C</option>
                          <option value="Super Deluxe A/C">Super Deluxe A/C</option>
                          <option value="Family Suite A/C">Family Suite A/C</option>
                          <option value="Executive Suite A/C">Executive Suite A/C</option>
                          <option value="Dormitory A/C">Dormitory A/C</option>
                        </optgroup>
                        <optgroup label="── Non A/C Rooms ──">
                          <option value="Standard Non A/C">Standard Non A/C</option>
                          <option value="Semi Deluxe Non A/C">Semi Deluxe Non A/C</option>
                          <option value="Deluxe Non A/C">Deluxe Non A/C</option>
                          <option value="Super Deluxe Non A/C">Super Deluxe Non A/C</option>
                          <option value="Family Suite Non A/C">Family Suite Non A/C</option>
                          <option value="Executive Suite Non A/C">Executive Suite Non A/C</option>
                          <option value="Dormitory Non A/C">Dormitory Non A/C</option>
                        </optgroup>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Floor</label>
                      <select value={editFloor} onChange={(e) => setEditFloor(e.target.value)} className={modalInputClass}>
                        <option value="Ground Floor">Ground Floor</option>
                        <option value="First Floor">First Floor</option>
                        <option value="Second Floor">Second Floor</option>
                        <option value="Third Floor">Third Floor</option>
                        <option value="Fourth Floor">Fourth Floor</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Price per Night (₹) *</label>
                      <input
                        type="number"
                        required
                        inputMode="decimal"
                        value={editPrice}
                        onChange={(e) => {
                          setEditPrice(e.target.value);
                          if (editErrors.price) setEditErrors(prev => { const c = {...prev}; delete c.price; return c; });
                        }}
                        className={`${modalInputClass} ${editErrors.price ? 'border-red-400' : ''}`}
                        placeholder="e.g. 1800"
                      />
                      {editErrors.price && <span className="text-[10px] font-bold text-red-500 mt-1 block">{editErrors.price}</span>}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Capacity *</label>
                      <input
                        type="number"
                        required
                        inputMode="numeric"
                        value={editCapacity}
                        onChange={(e) => {
                          setEditCapacity(Number(e.target.value));
                          if (editErrors.capacity) setEditErrors(prev => { const c = {...prev}; delete c.capacity; return c; });
                        }}
                        className={`${modalInputClass} ${editErrors.capacity ? 'border-red-400' : ''}`}
                        min="1"
                        max="20"
                      />
                      {editErrors.capacity && <span className="text-[10px] font-bold text-red-500 mt-1 block">{editErrors.capacity}</span>}
                    </div>
                  </div>
                </div>

                <div className="sticky-action-footer sm:static sm:px-6 sm:py-5 sm:border-t sm:border-slate-100 sm:bg-slate-50/30 flex gap-3">
                  <LoadingButton
                    type="submit"
                    loading={editingRoom_loading}
                    loadingText="Saving..."
                    className="flex-1 bg-primary text-white text-sm font-bold py-3 rounded-xl hover:bg-primary-hover shadow-md transition-all"
                  >
                    Save Changes
                  </LoadingButton>
                  <button
                    type="button"
                    onClick={() => setShowEditForm(false)}
                    className="bg-slate-100 text-slate-600 text-sm font-bold px-5 py-3 rounded-xl hover:bg-slate-200 active:scale-[0.96] transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Content ─────────────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <div className="flex flex-col items-center gap-3">
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent" />
              <span className="text-sm font-medium text-slate-400">Loading rooms...</span>
            </div>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm text-center py-20 px-6 space-y-3">
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-center">
                <BedDouble className="w-7 h-7 text-slate-300" />
              </div>
            </div>
            <p className="font-bold text-slate-500 text-sm">No rooms found</p>
            <p className="text-xs text-slate-400 font-medium">
              {rooms.length === 0 ? 'Add your first room to get started.' : 'Try adjusting the filters.'}
            </p>
          </div>
        ) : (
          <>
            {/* ── Mobile Cards (< md) ────────────────────── */}
            <div className="mobile-cards-wrapper space-y-3">
              {filteredRooms.map((room) => (
                <div key={room.id} className="mobile-card shadow-sm">
                  {/* Header row */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-extrabold text-slate-800">{room.room_number}</span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(room.status)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(room.status)}`} />
                        {room.status}
                      </span>
                    </div>
                    {userRole !== 'receptionist' && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(room)}
                          className="p-2.5 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-xl transition-all active:scale-[0.93] min-w-[40px] min-h-[40px] flex items-center justify-center"
                          aria-label={`Edit room ${room.room_number}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRoom(room.id, room.room_number)}
                          className="p-2.5 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition-all active:scale-[0.93] min-w-[40px] min-h-[40px] flex items-center justify-center"
                          aria-label={`Delete room ${room.room_number}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Info grid */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-xs text-slate-500 font-medium truncate">{room.floor || '—'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <BedDouble className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-xs text-slate-500 font-medium truncate">{room.room_type}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-xs text-slate-500 font-medium">{room.capacity} Persons</span>
                    </div>
                  </div>

                  {/* Price + toggle */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-1">
                      <IndianRupee className="w-3.5 h-3.5 text-slate-600" />
                      <span className="text-sm font-bold text-slate-800">
                        {Number(room.price).toLocaleString('en-IN')}<span className="text-xs font-medium text-slate-400">/night</span>
                      </span>
                    </div>
                    {room.status === 'Occupied' ? (
                      <span className="text-[10px] text-slate-400 font-semibold italic">In Use</span>
                    ) : (
                      <LoadingButton
                        type="button"
                        loading={togglingRoom === room.id}
                        loadingText=""
                        onClick={() => handleToggleStatus(room.id, room.status)}
                        className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold px-3 py-2 rounded-lg text-xs min-h-[40px]"
                      >
                        Cycle Status
                      </LoadingButton>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Desktop Table (≥ md) ───────────────────── */}
            <div className="desktop-table-wrapper bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-200/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="px-6 py-4">Room Number</th>
                      <th className="px-6 py-4">Floor</th>
                      <th className="px-6 py-4">Room Type</th>
                      <th className="px-6 py-4">Capacity</th>
                      <th className="px-6 py-4">Price per Night</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Quick Toggle</th>
                      {userRole !== 'receptionist' && <th className="px-6 py-4 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
                    {filteredRooms.map((room) => (
                      <tr key={room.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-900">{room.room_number}</td>
                        <td className="px-6 py-4 text-slate-600">{room.floor}</td>
                        <td className="px-6 py-4 text-slate-700">{room.room_type}</td>
                        <td className="px-6 py-4 text-slate-600">{room.capacity} Persons</td>
                        <td className="px-6 py-4 font-bold text-slate-900">₹{Number(room.price).toLocaleString('en-IN')}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(room.status)}`}>
                            {room.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {room.status === 'Occupied' ? (
                            <span className="text-[10px] text-slate-400 font-semibold italic">In Use (Checkout to toggle)</span>
                          ) : (
                            <LoadingButton
                              type="button"
                              loading={togglingRoom === room.id}
                              loadingText=""
                              onClick={() => handleToggleStatus(room.id, room.status)}
                              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold px-2.5 py-1.5 rounded-lg transition-colors text-[11px]"
                            >
                              Cycle Status
                            </LoadingButton>
                          )}
                        </td>
                        {userRole !== 'receptionist' && (
                          <td className="px-6 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => openEditModal(room)}
                                className="p-1.5 bg-slate-100 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded-lg transition-all active:scale-[0.93]"
                                title="Edit Room"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteRoom(room.id, room.room_number)}
                                className="p-1.5 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-lg transition-all active:scale-[0.93]"
                                title="Delete Room"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
