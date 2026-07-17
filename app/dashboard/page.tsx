'use client';

// ========================================================
// StayDesk CRM / HotelFlow CRM Owner Dashboard Screen
// Location: app/dashboard/page.tsx
// ========================================================

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import RoomGrid from '../../components/RoomGrid';
import RoomDetailModal from '../../components/RoomDetailModal';
import { db, getSessionUser } from '../../lib/supabase/client';
import { Room, Hotel } from '../../types';
import { 
  IndianRupee, 
  UserCheck, 
  UserX, 
  DoorOpen, 
  Wrench, 
  Sparkles,
  Building2,
  Bell,
  Check,
  X,
  CalendarRange,
  Clock
} from 'lucide-react';

export default function DashboardPage() {
  const [currentHotel, setCurrentHotel] = useState<Hotel | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

  // Pending Booking Requests
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Statistics states
  const [stats, setStats] = useState({
    todayRevenue: 0,
    checkInsCount: 0,
    checkOutsCount: 0,
    occupiedRooms: 0,
    availableRooms: 0,
    maintenanceRooms: 0,
    cleaningRooms: 0
  });

  const loadDashboardData = async (hotelId: string) => {
    try {
      // Load rooms
      const roomsList = await db.getRooms(hotelId);
      setRooms(roomsList);

      // Load payments for revenue calculation
      const paymentsList = await db.getPayments(hotelId);
      const today = new Date().toDateString();
      
      const todayRevenue = paymentsList
        .filter(p => new Date(p.created_at).toDateString() === today)
        .reduce((sum, p) => sum + Number(p.advance), 0);

      // Load bookings for check-ins and check-outs today
      const bookingsList = await db.getBookings(hotelId);
      
      const checkInsCount = bookingsList.filter(b => {
        if (!b.check_in) return false;
        return new Date(b.check_in).toDateString() === today;
      }).length;

      const checkOutsCount = bookingsList.filter(b => {
        if (b.status !== 'Completed') return false;
        return b.expected_checkout && new Date(b.expected_checkout).toDateString() === today;
      }).length;
      
      const occupied = roomsList.filter(r => r.status === 'Occupied').length;
      const available = roomsList.filter(r => r.status === 'Ready').length;
      const maintenance = roomsList.filter(r => r.status === 'Maintenance').length;
      const cleaning = roomsList.filter(r => r.status === 'Cleaning').length;

      // Set real statistics based on database
      setStats({
        todayRevenue,
        checkInsCount,
        checkOutsCount,
        occupiedRooms: occupied,
        availableRooms: available,
        maintenanceRooms: maintenance,
        cleaningRooms: cleaning
      });

      // Load pending booking requests
      const requestsList = await db.getPendingBookingRequests(hotelId);
      setPendingRequests(requestsList);

    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async () => {
    if (!currentHotel || !selectedRequest || !selectedRoomId) return;
    setSubmitting(true);
    try {
      await db.approveBookingRequest(currentHotel.id, selectedRequest.id, selectedRoomId);
      alert('Booking approved and customer created successfully!');
      setSelectedRequest(null);
      setSelectedRoomId('');
      await loadDashboardData(currentHotel.id);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to approve booking request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!currentHotel || !selectedRequest) return;
    if (!confirm('Are you sure you want to reject this booking request?')) return;
    setSubmitting(true);
    try {
      await db.rejectBookingRequest(currentHotel.id, selectedRequest.id);
      alert('Booking request rejected successfully.');
      setSelectedRequest(null);
      setSelectedRoomId('');
      await loadDashboardData(currentHotel.id);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to reject booking request.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const session = getSessionUser();
    if (session && session.hotel) {
      setCurrentHotel(session.hotel);
      loadDashboardData(session.hotel.id);
      
      // Real-time synchronization event listener (BroadcastChannel)
      const channel = new BroadcastChannel('hotelflow-sync');
      channel.onmessage = (event) => {
        if (event.data && event.data.type === 'DB_UPDATE') {
          loadDashboardData(session.hotel.id);
        }
      };

      return () => {
        channel.close();
      };
    }
  }, []);

  const handleRoomStatusChanged = () => {
    if (currentHotel) {
      loadDashboardData(currentHotel.id);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
            <span className="text-sm font-medium text-slate-500">Loading floor layout...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Large Stats Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Revenue */}
          <div className="col-span-2 bg-white p-5 rounded-[24px] border border-[#E2E8F0]/40 shadow-sm flex items-center justify-between group hover:shadow-md transition-shadow">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Today's Revenue</span>
              <span className="text-2xl font-black text-slate-800">₹{stats.todayRevenue.toLocaleString('en-IN')}</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#0F4C45]/5 text-[#0F4C45] flex items-center justify-center">
              <IndianRupee className="w-6 h-6" />
            </div>
          </div>

          {/* Check-ins */}
          <div className="bg-white p-5 rounded-[24px] border border-[#E2E8F0]/40 shadow-sm flex items-center justify-between group hover:shadow-md transition-shadow">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Check-ins</span>
              <span className="text-2xl font-black text-slate-800">{stats.checkInsCount}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>

          {/* Checkouts */}
          <div className="bg-white p-5 rounded-[24px] border border-[#E2E8F0]/40 shadow-sm flex items-center justify-between group hover:shadow-md transition-shadow">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Checkouts</span>
              <span className="text-2xl font-black text-slate-800">{stats.checkOutsCount}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center">
              <UserX className="w-5 h-5" />
            </div>
          </div>

          {/* Occupied */}
          <div className="bg-white p-5 rounded-[24px] border border-[#E2E8F0]/40 shadow-sm flex items-center justify-between group hover:shadow-md transition-shadow">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Occupied</span>
              <span className="text-2xl font-black text-red-700">{stats.occupiedRooms}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-red-600"></div>
            </div>
          </div>

          {/* Available */}
          <div className="bg-white p-5 rounded-[24px] border border-[#E2E8F0]/40 shadow-sm flex items-center justify-between group hover:shadow-md transition-shadow">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Available</span>
              <span className="text-2xl font-black text-[#0F4C45]">{stats.availableRooms}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#0F4C45]/5 text-[#0F4C45] flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-[#0F4C45]"></div>
            </div>
          </div>
        </div>

        {/* Room Status Categories Mini Bar */}
        <div className="flex flex-wrap gap-4 items-center bg-white py-3.5 px-5 rounded-[24px] border border-[#E2E8F0]/40 shadow-sm text-xs font-semibold text-slate-500">
          <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">Quick Legend:</span>
          
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-lg bg-primary block"></span>
            <span>Ready ({stats.availableRooms})</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-lg bg-red-700 block"></span>
            <span>Occupied ({stats.occupiedRooms})</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-lg bg-maintenance block"></span>
            <span>Maintenance ({stats.maintenanceRooms})</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-lg bg-accent-gold block"></span>
            <span>Cleaning ({stats.cleaningRooms})</span>
          </div>
        </div>

        {/* PENDING BOOKING REQUESTS WIDGET */}
        {pendingRequests.length > 0 && (
          <div className="bg-white p-6 rounded-[24px] border border-red-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
                  Pending Booking Requests
                </h2>
                <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                  Online reservation requests waiting for your approval before room/customer generation.
                </p>
              </div>
              <span className="bg-red-50 text-red-700 font-bold px-2.5 py-1 rounded-full text-[10px]">
                {pendingRequests.length} New Requests
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingRequests.map((req) => (
                <div 
                  key={req.id} 
                  onClick={() => {
                    setSelectedRequest(req);
                    // Pre-select first matching available room if any
                    const matching = rooms.find(r => r.room_type === req.room_type && r.status === 'Ready');
                    setSelectedRoomId(matching ? matching.id : '');
                  }}
                  className="bg-slate-50/50 hover:bg-slate-50 p-4 rounded-2xl border border-[#E2E8F0]/40 cursor-pointer hover:border-primary/20 hover:shadow-sm transition-all duration-200 group flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <h3 className="text-xs font-bold text-slate-800">{req.full_name}</h3>
                      <span className="text-[9px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-lg">
                        {req.room_type}
                      </span>
                    </div>

                    <div className="space-y-1 text-[11px] font-semibold text-slate-500">
                      <p>📞 {req.phone}</p>
                      <p>📧 {req.email}</p>
                      <p>📅 {new Date(req.check_in).toLocaleDateString('en-IN')} - {new Date(req.expected_checkout).toLocaleDateString('en-IN')}</p>
                      <p>👥 {req.number_of_guests} Guests</p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-[#0F4C45] group-hover:text-primary-hover">
                    <span>Review & Allocate Room</span>
                    <span>→</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Visual Room Grid / Floor Map */}
        <div className="bg-white p-6 rounded-[24px] border border-[#E2E8F0]/40 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Visual Desk Layout</h2>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Click any room card to check-in guest, extend stay, or settle bill.</p>
            </div>
          </div>

          {currentHotel && (
            <RoomGrid 
              rooms={rooms} 
              hotelId={currentHotel.id} 
              onRoomClick={(room) => setSelectedRoom(room)} 
            />
          )}
        </div>
      </div>

      {/* Room Detail Popup Modal */}
      {selectedRoom && currentHotel && (
        <RoomDetailModal 
          room={selectedRoom} 
          hotelId={currentHotel.id} 
          onClose={() => setSelectedRoom(null)} 
          onStatusChanged={handleRoomStatusChanged}
        />
      )}

      {/* BOOKING REQUEST REVIEW MODAL */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-[28px] w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse"></span>
                <h3 className="text-sm font-bold text-slate-800">Review Booking Request</h3>
              </div>
              <button 
                onClick={() => {
                  setSelectedRequest(null);
                  setSelectedRoomId('');
                }} 
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
              {/* Guest Profile Details */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Guest Information</h4>
                <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 text-xs font-semibold text-slate-700">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">Guest Name</span>
                    <span className="font-bold text-slate-800">{selectedRequest.full_name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">Phone Number</span>
                    <span className="font-bold text-slate-800">{selectedRequest.phone}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Email Address</span>
                    <span className="font-bold text-slate-800">{selectedRequest.email}</span>
                  </div>
                </div>
              </div>

              {/* Stay Details */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stay & Suite Request</h4>
                <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 text-xs font-semibold text-slate-700">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">Requested Room Type</span>
                    <span className="font-bold text-primary">{selectedRequest.room_type}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">Guests Count</span>
                    <span className="font-bold text-slate-800">{selectedRequest.number_of_guests} Persons</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">Check-In Date</span>
                    <span className="font-bold text-slate-800">{new Date(selectedRequest.check_in).toLocaleDateString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">Check-Out Date</span>
                    <span className="font-bold text-slate-800">{new Date(selectedRequest.expected_checkout).toLocaleDateString('en-IN')}</span>
                  </div>
                  {selectedRequest.special_requests && (
                    <div className="col-span-2">
                      <span className="text-[10px] text-slate-400 block mb-0.5">Special Requests</span>
                      <p className="text-slate-600 bg-white p-2.5 rounded-xl border border-slate-100 leading-relaxed font-medium">{selectedRequest.special_requests}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Room Allocation */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Room Allocation *</h4>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Select Room to Assign</label>
                  <select
                    value={selectedRoomId}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none"
                  >
                    <option value="">-- Choose an Available Room --</option>
                    
                    {/* Matching Ready Rooms */}
                    {rooms.filter(r => r.room_type === selectedRequest.room_type && r.status === 'Ready').length > 0 && (
                      <optgroup label={`Available Matching ${selectedRequest.room_type}s`}>
                        {rooms
                          .filter(r => r.room_type === selectedRequest.room_type && r.status === 'Ready')
                          .map(r => (
                            <option key={r.id} value={r.id}>
                              Room {r.room_number} (Floor: {r.floor}, Price: ₹{r.price}/Night)
                            </option>
                          ))}
                      </optgroup>
                    )}

                    {/* Other Ready Rooms */}
                    {rooms.filter(r => r.room_type !== selectedRequest.room_type && r.status === 'Ready').length > 0 && (
                      <optgroup label="Other Available Rooms">
                        {rooms
                          .filter(r => r.room_type !== selectedRequest.room_type && r.status === 'Ready')
                          .map(r => (
                            <option key={r.id} value={r.id}>
                              Room {r.room_number} ({r.room_type}, Price: ₹{r.price}/Night)
                            </option>
                          ))}
                      </optgroup>
                    )}
                  </select>
                  
                  {rooms.filter(r => r.status === 'Ready').length === 0 && (
                    <p className="text-[10px] font-semibold text-red-500 mt-2">
                      ⚠️ No rooms are currently available in "Ready" status. Please release or clean a room to continue.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Approval/Rejection Actions Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button
                type="button"
                disabled={submitting}
                onClick={handleRejectRequest}
                className="flex-1 bg-white hover:bg-red-50 border border-red-200 text-red-600 text-xs font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <X className="w-4 h-4" />
                Reject Request
              </button>

              <button
                type="button"
                disabled={submitting || !selectedRoomId}
                onClick={handleApproveRequest}
                className={`flex-1 text-white text-xs font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md ${
                  selectedRoomId && !submitting
                    ? 'bg-[#0F4C45] hover:bg-[#0C3E38] hover:shadow-lg'
                    : 'bg-slate-300 cursor-not-allowed shadow-none'
                }`}
              >
                <Check className="w-4 h-4" />
                Approve & Allocate
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
