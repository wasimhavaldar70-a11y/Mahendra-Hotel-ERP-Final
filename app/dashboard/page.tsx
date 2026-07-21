'use client';

// ========================================================
// StayDesk CRM / HotelFlow CRM Owner Dashboard Screen
// Location: app/dashboard/page.tsx
// ========================================================

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import RoomGrid from '../../components/RoomGrid';
import RoomDetailModal from '../../components/RoomDetailModal';
import { db, getSessionUser, setSessionUser, supabase } from '../../lib/supabase/client';
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
  const [activeStays, setActiveStays] = useState<Record<string, { guestName: string; phone: string; price: number }>>({});
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
      // Execute all independent database queries in parallel to eliminate waterfalls
      const [roomsList, dashboardStats, requestsList, stays] = await Promise.all([
        db.getRooms(hotelId),
        db.getDashboardStats(hotelId),
        db.getPendingBookingRequests(hotelId),
        db.getActiveStaysForHotel(hotelId)
      ]);

      setRooms(roomsList);

      if (dashboardStats) {
        setStats({
          todayRevenue: Number(dashboardStats.todayRevenue || 0),
          checkInsCount: Number(dashboardStats.checkInsCount || 0),
          checkOutsCount: Number(dashboardStats.checkOutsCount || 0),
          occupiedRooms: Number(dashboardStats.occupiedRooms || 0),
          availableRooms: Number(dashboardStats.availableRooms || 0),
          maintenanceRooms: Number(dashboardStats.maintenanceRooms || 0),
          cleaningRooms: Number(dashboardStats.cleaningRooms || 0)
        });
      }

      setPendingRequests(requestsList);

      // Load active stays map to pass to RoomGrid
      const staysMap: Record<string, { guestName: string; phone: string; price: number }> = {};
      stays.forEach(stay => {
        if (stay.room_id) {
          const roomObj = roomsList.find(r => r.id === stay.room_id);
          staysMap[stay.room_id] = {
            guestName: stay.primary_customer?.full_name || 'Guest',
            phone: stay.primary_customer?.phone || '',
            price: Number(stay.payment?.room_price || roomObj?.price || 0)
          };
        }
      });
      setActiveStays(staysMap);

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
    if (!session) {
      window.location.href = '/login';
      return;
    }
    
    if (session.user.role === 'superadmin') {
      window.location.href = '/super-admin';
      return;
    }

    if (!session.hotel) {
      alert('Error: No hotel linked to this user account.');
      setSessionUser(null);
      window.location.href = '/login';
      return;
    }

    setCurrentHotel(session.hotel);
    loadDashboardData(session.hotel.id);
    
    let syncTimeout: NodeJS.Timeout | null = null;
    const triggerSync = () => {
      if (syncTimeout) clearTimeout(syncTimeout);
      // Apply jittered debounce (300ms to 800ms) to stagger DB hits
      const delay = 300 + Math.random() * 500;
      syncTimeout = setTimeout(() => {
        loadDashboardData(session.hotel.id);
      }, delay);
    };

    // 1. Local BroadcastChannel subscription (for same-device cross-tab syncing)
    const localChannel = new BroadcastChannel('hotelflow-sync');
    localChannel.onmessage = (event) => {
      if (event.data && event.data.type === 'DB_UPDATE') {
        triggerSync();
      }
    };

    // 2. Supabase Realtime subscription (for cross-terminal sync)
    let realtimeChannel: any = null;
    if (supabase) {
      realtimeChannel = supabase
        .channel('dashboard-db-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'check_ins' }, (payload: any) => {
          if (payload.new && payload.new.hotel_id === session.hotel.id) triggerSync();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, (payload: any) => {
          if (payload.new && payload.new.hotel_id === session.hotel.id) triggerSync();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'booking_requests' }, (payload: any) => {
          if (payload.new && payload.new.hotel_id === session.hotel.id) triggerSync();
        })
        .subscribe();
    }

    return () => {
      if (syncTimeout) clearTimeout(syncTimeout);
      localChannel.close();
      if (supabase && realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, []);

  const handleRoomStatusChanged = (updatedRoom?: Room) => {
    if (updatedRoom) {
      setRooms(prev => prev.map(r => r.id === updatedRoom.id ? updatedRoom : r));
    }
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

  if (rooms.length === 0) {
    const cms = currentHotel?.cms_data || {};
    
    const steps = [
      {
        id: 'profile',
        title: 'Hotel Profile',
        description: 'Your primary property details, email, contact info, and pricing metrics are active.',
        completed: true,
        actionLabel: 'View Profile',
        actionPath: '/settings',
      },
      {
        id: 'types',
        title: 'Create Room Types',
        description: 'Configure types (Deluxe, Suite, etc.), prices, standard capacities, and descriptions.',
        completed: !!cms.hasConfiguredRoomTypes,
        actionLabel: 'Configure Types',
        actionPath: '/settings/website',
      },
      {
        id: 'rooms',
        title: 'Add Rooms',
        description: 'Define your individual room numbers, floor locations, and assign them to categories.',
        completed: false,
        actionLabel: 'Add First Room',
        actionPath: '/rooms',
      },
      {
        id: 'config_web',
        title: 'Configure Hotel Website',
        description: 'Set your luxury taglines, about section info, owner statements, maps, and gallery assets.',
        completed: !!cms.hasConfiguredWebsite,
        actionLabel: 'Customize Website',
        actionPath: '/settings/website',
      },
      {
        id: 'publish_web',
        title: 'Publish Hotel Website',
        description: 'Push your customized hotel landing page live so guests can browse and make reservations.',
        completed: !!cms.hasPublishedWebsite,
        actionLabel: 'Publish Live',
        actionPath: '/settings/website',
      }
    ];

    return (
      <DashboardLayout>
        <div className="space-y-8 max-w-4xl mx-auto py-4">
          {/* Welcome Header */}
          <div className="bg-gradient-to-r from-primary/95 to-primary-hover text-white p-8 rounded-[24px] shadow-lg border border-primary/20 relative overflow-hidden">
            <div className="absolute right-0 bottom-0 translate-x-10 translate-y-10 opacity-10 pointer-events-none">
              <Building2 className="w-80 h-80" />
            </div>
            <div className="space-y-3 relative z-10">
              <span className="bg-white/20 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-white/10">
                Setup Workspace
              </span>
              <h1 className="text-3xl font-extrabold tracking-tight">Welcome to StayDesk ERP</h1>
              <p className="text-white/80 text-sm max-w-xl font-medium leading-relaxed">
                Your hotel has been created successfully. Complete the following setup steps to configure your property and activate your operational desk.
              </p>
            </div>
          </div>

          {/* Setup Checklist Progress */}
          <div className="bg-white rounded-[24px] border border-slate-200/60 p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Workspace Activation Checklist</h2>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Follow the steps below to initialize rooms and get ready for bookings.</p>
            </div>

            <div className="divide-y divide-slate-100">
              {steps.map((step, idx) => {
                return (
                  <div key={step.id} className="py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 group transition-colors">
                    <div className="flex items-start gap-4">
                      {/* Status Circle */}
                      <div className="mt-0.5 shrink-0">
                        {step.completed ? (
                          <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm" title="Completed">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-400 font-bold text-xs" title="Pending">
                            {idx + 1}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className={`text-sm font-bold ${step.completed ? 'text-slate-700' : 'text-slate-800'}`}>
                            {step.title}
                          </h3>
                          {step.completed && (
                            <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold px-1.5 py-0.25 rounded-md">
                              Ready
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 max-w-xl font-semibold leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </div>

                    <div>
                      <a
                        href={step.actionPath}
                        className={`text-xs font-bold px-4 py-2 rounded-xl transition-all inline-flex items-center gap-1.5 shadow-sm border ${
                          step.completed
                            ? 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                            : 'bg-primary hover:bg-primary-hover text-white border-primary/10 hover:shadow'
                        }`}
                      >
                        {step.actionLabel}
                        <span className="text-xs">→</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
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
          <div className="col-span-2 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-shadow">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Today's Revenue</span>
              <span className="text-2xl font-bold text-slate-900">₹{stats.todayRevenue.toLocaleString('en-IN')}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#0F5D52]/10 text-primary flex items-center justify-center">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>

          {/* Check-ins */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-shadow">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Check-ins</span>
              <span className="text-2xl font-bold text-slate-900">{stats.checkInsCount}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>

          {/* Checkouts */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-shadow">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Checkouts</span>
              <span className="text-2xl font-bold text-slate-900">{stats.checkOutsCount}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center">
              <UserX className="w-5 h-5" />
            </div>
          </div>

          {/* Occupied */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-shadow">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Occupied</span>
              <span className="text-2xl font-bold text-slate-900">{stats.occupiedRooms}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-650 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div>
            </div>
          </div>

          {/* Available */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-shadow">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Available</span>
              <span className="text-2xl font-bold text-slate-900">{stats.availableRooms}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-green-50 text-green-700 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-green-600"></div>
            </div>
          </div>
        </div>

        {/* Room Status Categories Mini Bar */}
        <div className="flex flex-wrap gap-4 items-center bg-white py-3 px-5 rounded-2xl border border-slate-100 shadow-sm text-xs font-semibold text-slate-500">
          <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">Quick Legend:</span>
          
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-600 block"></span>
            <span>Ready ({stats.availableRooms})</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 block"></span>
            <span>Occupied ({stats.occupiedRooms})</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-500 block"></span>
            <span>Maintenance ({stats.maintenanceRooms})</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block"></span>
            <span>Cleaning ({stats.cleaningRooms})</span>
          </div>
        </div>

        {/* PENDING BOOKING REQUESTS WIDGET */}
        {pendingRequests.length > 0 && (
          <div className="bg-white p-6 rounded-2xl border border-red-50 shadow-sm space-y-4">
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
              <span className="bg-red-50 text-red-700 font-bold px-2.5 py-1 rounded-full text-[10px] border border-red-100/50">
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
                  className="bg-slate-50/40 hover:bg-slate-50 p-4 rounded-2xl border border-slate-200/65 cursor-pointer hover:border-[#0F5D52]/40 hover:shadow-sm transition-all duration-150 group flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <h3 className="text-xs font-bold text-slate-800">{req.full_name}</h3>
                      <span className="text-[9px] bg-[#0F5D52]/10 text-primary border border-[#0F5D52]/20 font-bold px-2 py-0.5 rounded-lg">
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
 
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-primary group-hover:text-primary-hover">
                    <span>Review & Allocate Room</span>
                    <span>→</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
 
        {/* Visual Room Grid / Floor Map */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Visual Desk Layout</h2>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Click any room card to check-in guest, extend stay, or settle bill.</p>
            </div>
          </div>
 
          {currentHotel && (
            <RoomGrid 
              rooms={rooms} 
              hotelId={currentHotel.id} 
              activeStays={activeStays}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
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
                className="flex-1 bg-white hover:bg-red-50 border border-slate-200 text-slate-700 hover:text-red-600 hover:border-red-200 text-xs font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
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
                    ? 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'
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
