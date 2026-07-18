'use client';

// ========================================================
// StayDesk CRM / HotelFlow CRM Booking Management & Timeline Calendar
// Location: app/bookings/page.tsx
// ========================================================

import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import CustomerSearch from '../../components/CustomerSearch';
import CustomerForm from '../../components/CustomerForm';
import { db, getSessionUser } from '../../lib/supabase/client';
import { Room, Hotel, ExtendedCheckIn, Customer } from '../../types';
import { 
  Calendar as CalendarIcon, 
  List, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Search, 
  X, 
  UserPlus, 
  CheckCircle2, 
  Clock, 
  CreditCard,
  Phone,
  UserCheck,
  Coins
} from 'lucide-react';

export default function BookingsPage() {
  const [currentHotel] = useState<Hotel | null>(() => {
    const session = getSessionUser();
    return session?.hotel || null;
  });
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<ExtendedCheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'timeline' | 'list'>('timeline');

  // Timeline Date Range State (14-day window)
  const [startDate, setStartDate] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });

  // Booking details view modal/drawer
  const [selectedBooking, setSelectedBooking] = useState<ExtendedCheckIn | null>(null);
  
  // Create Booking Drawer State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [bookingCheckIn, setBookingCheckIn] = useState('');
  const [bookingCheckout, setBookingCheckout] = useState('');
  const [numberOfGuests, setNumberOfGuests] = useState(1);
  const [customRoomPrice, setCustomRoomPrice] = useState<number | string>('');
  const [advancePaid, setAdvancePaid] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Cash' | 'Card'>('UPI');
  
  // Create Guest Management inside Booking Form
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Search & Filters for list tab
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Ref for horizontal grid scrolling
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Pending web bookings allocation states
  const [confirmRoomId, setConfirmRoomId] = useState<string>('');
  const [confirming, setConfirming] = useState<boolean>(false);

  const loadData = async (hotelId: string) => {
    try {
      const roomsList = await db.getRooms(hotelId);
      setRooms(roomsList);
      
      const bookingsList = await db.getBookings(hotelId);
      setBookings(bookingsList);
    } catch (err) {
      console.error('Error loading bookings data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const session = getSessionUser();
    if (session && session.hotel) {
      const hotelId = session.hotel.id;
      
      const timer = setTimeout(() => {
        loadData(hotelId);
      }, 0);

      const channel = new BroadcastChannel('hotelflow-sync');
      channel.onmessage = () => {
        loadData(hotelId);
      };

      return () => {
        clearTimeout(timer);
        channel.close();
      };
    }
  }, []);

  // Format date grid (14 days)
  const dateColumns = React.useMemo(() => {
    const dates: Date[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [startDate]);

  // Navigate dates
  const handlePrevWeek = () => {
    setStartDate(prev => {
      const nextDate = new Date(prev);
      nextDate.setDate(prev.getDate() - 7);
      return nextDate;
    });
  };

  const handleNextWeek = () => {
    setStartDate(prev => {
      const nextDate = new Date(prev);
      nextDate.setDate(prev.getDate() + 7);
      return nextDate;
    });
  };

  const handleToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setStartDate(today);
  };

  // Open creation flow from cell click
  const handleCellClick = (roomId: string, date: Date) => {
    setSelectedRoomId(roomId);
    
    // Set check-in date to clicked date
    const checkInString = date.toISOString().substring(0, 10);
    setBookingCheckIn(checkInString);

    // Set checkout to next day
    const checkOutDate = new Date(date);
    checkOutDate.setDate(date.getDate() + 1);
    setBookingCheckout(checkOutDate.toISOString().substring(0, 10));

    // Get default price
    const room = rooms.find(r => r.id === roomId);
    if (room) setCustomRoomPrice(Number(room.price));

    setSelectedCustomer(null);
    setShowNewCustomerForm(false);
    setAdvancePaid(0);
    setIsCreateOpen(true);
  };

  // Select customer callback from CustomerSearch
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowNewCustomerForm(false);
  };

  // Form submission
  const handleCreateBookingSubmit = async (e: React.FormEvent, createStatus: 'Reserved' | 'Active' = 'Reserved') => {
    e.preventDefault();
    if (!currentHotel) return;

    const newErrors: Record<string, string> = {};

    if (!selectedCustomer) {
      newErrors.selectedCustomer = 'Please select or register a guest profile first';
    }

    if (!selectedRoomId) {
      newErrors.selectedRoomId = 'Please select a room';
    }

    if (!bookingCheckIn) {
      newErrors.bookingCheckIn = 'Check-in date is required';
    }

    if (!bookingCheckout) {
      newErrors.bookingCheckout = 'Checkout date is required';
    } else if (bookingCheckIn && bookingCheckout <= bookingCheckIn) {
      newErrors.bookingCheckout = 'Checkout date must be strictly after the check-in date';
    }

    if (numberOfGuests <= 0) {
      newErrors.numberOfGuests = 'Number of guests must be at least 1';
    }

    const roomObj = rooms.find(r => r.id === selectedRoomId);
    const roomPrice = Number(customRoomPrice !== '' ? customRoomPrice : (roomObj?.price || 0));
    if (isNaN(roomPrice) || roomPrice < 0) {
      newErrors.customRoomPrice = 'Room price cannot be negative';
    }

    const parsedAdvance = Number(advancePaid) || 0;
    if (parsedAdvance < 0) {
      newErrors.advancePaid = 'Advance paid cannot be negative';
    } else if (parsedAdvance > roomPrice) {
      newErrors.advancePaid = `Advance paid (₹${parsedAdvance}) cannot exceed total room price (₹${roomPrice})`;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      if (!selectedCustomer) return;
      setErrors({});
      setLoading(true);
      const pendingVal = Math.max(0, roomPrice - parsedAdvance);

      const bookingData = {
        room_id: selectedRoomId,
        primary_customer_id: selectedCustomer.id,
        check_in: new Date(bookingCheckIn).toISOString(),
        expected_checkout: new Date(bookingCheckout).toISOString(),
        number_of_guests: numberOfGuests,
        status: createStatus
      };

      const paymentData = {
        room_price: roomPrice,
        advance: parsedAdvance,
        pending: pendingVal,
        payment_method: paymentMethod
      };

      await db.createBooking(
        currentHotel.id, 
        bookingData, 
        paymentData, 
        [{ customer_id: selectedCustomer.id, relationship: 'Self', document_verified: true }]
      );

      // Reset form states
      setIsCreateOpen(false);
      setSelectedCustomer(null);
      await loadData(currentHotel.id);
    } catch (err) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : 'Failed to create booking.';
      alert(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Handle registration of new customer within the booking drawer
  const handleNewCustomerCreate = async (
    customerData: any,
    docData?: any
  ) => {
    if (!currentHotel) return;
    try {
      setLoading(true);
      const newCust = await db.addCustomer(
        currentHotel.id,
        customerData,
        docData?.type,
        docData?.number,
        docData?.front,
        docData?.back
      );
      setSelectedCustomer(newCust);
      setShowNewCustomerForm(false);
    } catch (err) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : 'Failed to register customer';
      alert(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Cancel reservation
  const handleCancelBooking = async (bookingId: string) => {
    if (!currentHotel) return;
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    
    try {
      setLoading(true);
      await db.cancelBooking(currentHotel.id, bookingId);
      setSelectedBooking(null);
      await loadData(currentHotel.id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Confirm pending web booking
  const handleConfirmPendingBooking = async (bookingId: string) => {
    if (!currentHotel) return;
    if (!confirmRoomId) {
      alert('Please select a room to allocate first.');
      return;
    }
    
    setConfirming(true);
    try {
      await db.confirmBooking(currentHotel.id, bookingId, confirmRoomId);
      setConfirmRoomId('');
      setSelectedBooking(null);
      await loadData(currentHotel.id);
      alert('Booking confirmed successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to confirm booking');
    } finally {
      setConfirming(false);
    }
  };

  // Convert reservation to Active stay (Check-in)
  const handleCheckInBooking = async (bookingId: string) => {
    if (!currentHotel) return;
    try {
      setLoading(true);
      await db.checkInBooking(currentHotel.id, bookingId);
      setSelectedBooking(null);
      await loadData(currentHotel.id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Checkout Active Stay
  const handleCheckOutBooking = async (bookingId: string, finalPaymentMethod: 'UPI' | 'Cash' | 'Card') => {
    if (!currentHotel) return;
    try {
      setLoading(true);
      await db.checkOut(currentHotel.id, bookingId, finalPaymentMethod);
      setSelectedBooking(null);
      await loadData(currentHotel.id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filter list results
  const filteredListBookings = bookings.filter(b => {
    const matchesSearch = b.primary_customer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.primary_customer?.phone?.includes(searchQuery) ||
      b.room?.room_number?.includes(searchQuery);

    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Controls */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <CalendarIcon className="w-5.5 h-5.5 text-primary" />
              Booking & Stay Timeline
            </h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">
              Manage future bookings, calendars, and guest stays
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Toggle */}
            <div className="flex p-1 bg-slate-100/80 border border-slate-200/60 rounded-xl">
              <button
                onClick={() => setActiveTab('timeline')}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all ${
                  activeTab === 'timeline'
                    ? 'bg-white text-primary shadow-sm border border-slate-200/40'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <CalendarIcon className="w-4 h-4" />
                Timeline
              </button>
              <button
                onClick={() => setActiveTab('list')}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all ${
                  activeTab === 'list'
                    ? 'bg-white text-primary shadow-sm border border-slate-200/40'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <List className="w-4 h-4" />
                List View
              </button>
            </div>

            {/* Create Booking Button */}
            <button
              onClick={() => {
                setSelectedRoomId(rooms[0]?.id || '');
                const today = new Date();
                setBookingCheckIn(today.toISOString().substring(0, 10));
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                setBookingCheckout(tomorrow.toISOString().substring(0, 10));
                setCustomRoomPrice(rooms[0] ? Number(rooms[0].price) : '');
                setSelectedCustomer(null);
                setShowNewCustomerForm(false);
                setIsCreateOpen(true);
              }}
              className="flex items-center gap-2 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-white bg-primary hover:bg-primary-hover rounded-xl shadow-sm hover:shadow-md active:scale-98 transition-all"
            >
              <Plus className="w-4 h-4" />
              New Booking
            </button>
          </div>
        </div>

        {/* TIMELINE CALENDAR VIEW */}
        {activeTab === 'timeline' && (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
            
            {/* Timeline Sub-header Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-slate-150 gap-4">
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrevWeek}
                  className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-all"
                  title="Previous Week"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={handleToday}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-700 rounded-xl transition-all"
                >
                  Today
                </button>
                <button
                  onClick={handleNextWeek}
                  className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-all"
                  title="Next Week"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="text-sm font-semibold text-slate-700 uppercase tracking-wider bg-slate-50 px-4 py-2 rounded-xl border border-slate-200/80 flex items-center gap-2">
                <Clock className="w-4.5 h-4.5 text-slate-400" />
                <span>
                  {startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <span className="text-slate-300 font-normal">➔</span>
                <span>
                  {dateColumns[13]?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>

            {/* Scrollable Timeline Grid Container */}
            <div 
              ref={gridContainerRef}
              className="overflow-x-auto select-none"
            >
              <div className="min-w-[1940px]"> {/* 260px (Left Col) + 14 * 120px (Date Cols) */}
                {/* Grid Headings */}
                <div className="flex bg-slate-50/50 border-b border-slate-200/60">
                  {/* Left Column Spacer */}
                  <div className="w-64 p-4 font-bold text-slate-400 text-[11px] uppercase tracking-wider border-r border-slate-200/60 flex-shrink-0 flex items-center bg-white sticky left-0 z-10">
                    Room Details
                  </div>
                  {/* Date Columns */}
                  {dateColumns.map((date, idx) => {
                    const isToday = date.toDateString() === new Date().toDateString();
                    return (
                      <div
                        key={idx}
                        className={`w-[120px] p-3 text-center border-r border-slate-200/60 flex-shrink-0 flex flex-col justify-center items-center ${
                          isToday ? 'bg-primary/[0.03] relative' : ''
                        }`}
                      >
                        <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                          {date.toLocaleDateString('en-IN', { weekday: 'short' })}
                        </span>
                        <span className={`text-sm font-semibold mt-1 w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                          isToday 
                            ? 'bg-primary text-white shadow-sm' 
                            : 'text-slate-700'
                        }`}>
                          {date.getDate()}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Grid Body Rows */}
                <div className="divide-y divide-slate-100">
                  {rooms.map((room) => {
                    // Timeline Start (00:00:00 of selected startDate)
                    const timelineStart = new Date(startDate);
                    timelineStart.setHours(0, 0, 0, 0);

                    // Timeline End (23:59:59 of final date)
                    const timelineEnd = new Date(dateColumns[13]);
                    timelineEnd.setHours(23, 59, 59, 999);

                    // Filter bookings for this room intersecting timeline
                    const roomBookings = bookings.filter(b => {
                      if (b.room_id !== room.id) return false;
                      if (b.status === 'Cancelled') return false;

                      const bStart = new Date(b.check_in);
                      const bEnd = new Date(b.expected_checkout);
                      return bStart < timelineEnd && bEnd > timelineStart;
                    });

                    return (
                      <div key={room.id} className="flex relative h-20 items-stretch hover:bg-slate-50/20 transition-colors">
                        {/* Sticky Left Column: Room info */}
                        <div className="w-64 p-4 border-r border-slate-100 flex-shrink-0 flex flex-col justify-center bg-white sticky left-0 z-10 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-800">
                              Room {room.room_number}
                            </span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                              room.status === 'Ready' ? 'bg-emerald-50/80 text-emerald-700 border-emerald-200/60' :
                              room.status === 'Occupied' ? 'bg-indigo-50/80 text-indigo-700 border-indigo-200/60' :
                              room.status === 'Maintenance' ? 'bg-amber-50/80 text-amber-700 border-amber-200/60' :
                              'bg-slate-50 text-slate-500 border border-slate-200'
                            }`}>
                              {room.status}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            <span>{room.room_type}</span>
                            <span className="text-slate-500">₹{Number(room.price).toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Interactive Click Cells Background */}
                        <div className="flex flex-1 relative items-stretch">
                          {dateColumns.map((date, colIdx) => {
                            const isToday = date.toDateString() === new Date().toDateString();
                            return (
                              <div
                                key={colIdx}
                                onClick={() => handleCellClick(room.id, date)}
                                className={`w-[120px] border-r border-slate-200/60 cursor-pointer flex-shrink-0 relative group hover:bg-slate-50/80 transition-all ${
                                  isToday ? 'bg-primary/[0.01]' : ''
                                }`}
                              >
                                <span className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                  + BOOK
                                </span>
                              </div>
                            );
                          })}

                          {/* Absolute Overlaid Booking Blocks */}
                          {roomBookings.map((b) => {
                            const bStart = new Date(b.check_in);
                            const bEnd = new Date(b.expected_checkout);
                            
                            // Align dates with timeline limits
                            const startClamped = new Date(Math.max(bStart.getTime(), timelineStart.getTime()));
                            const endClamped = new Date(Math.min(bEnd.getTime(), timelineEnd.getTime()));

                            // Calculate offset and width in days
                            const offsetDays = (startClamped.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24);
                            const durationDays = (endClamped.getTime() - startClamped.getTime()) / (1000 * 60 * 60 * 24);
                            
                            // Calculate px positions (cell width 120px)
                            const leftPx = offsetDays * 120;
                            const widthPx = Math.max(24, durationDays * 120); // Minimum 24px width for visibility

                            const isReserved = b.status === 'Reserved';
                            const isActive = b.status === 'Active';
                            
                            return (
                              <div
                                key={b.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedBooking(b);
                                }}
                                style={{
                                  left: `${leftPx + 4}px`,
                                  width: `${widthPx - 8}px`
                                }}
                                className={`absolute top-3 bottom-3 rounded-xl border px-3 flex flex-col justify-center cursor-pointer shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-99 transition-all duration-200 overflow-hidden ${
                                  isReserved 
                                    ? 'bg-gradient-to-r from-indigo-500/10 to-purple-600/10 text-indigo-700 border-indigo-200/50 hover:bg-indigo-50/20' 
                                    : isActive 
                                    ? 'bg-gradient-to-r from-emerald-500/10 to-teal-600/10 text-emerald-700 border-emerald-200/50 hover:bg-emerald-50/20' 
                                    : 'bg-slate-100/90 text-slate-600 border-slate-200 hover:bg-slate-200/80'
                                }`}
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                    isReserved ? 'bg-indigo-500 animate-pulse' :
                                    isActive ? 'bg-emerald-500' : 'bg-slate-400'
                                  }`}></div>
                                  <span className="text-xs font-semibold truncate">
                                    {b.primary_customer?.full_name || 'Guest'}
                                  </span>
                                </div>
                                <div className="text-[9px] font-bold uppercase tracking-wider opacity-85 mt-0.5 truncate">
                                  {isReserved ? 'Reserved' : isActive ? 'Active Stay' : 'Completed'} 
                                  {' • '} 
                                  {bStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* LIST VIEW TAB */}
        {activeTab === 'list' && (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            {/* Search & Filters */}
            <div className="p-6 border-b border-slate-50 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="h-4.5 w-4.5 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search bookings (Guest Name, Phone, Room)..."
                  className="block w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-xs font-semibold placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                />
              </div>

              {/* Status Filters */}
              <div className="flex flex-wrap items-center gap-1">
                {['ALL', 'Pending', 'Reserved', 'Active', 'Completed', 'Cancelled'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider border transition-all ${
                      statusFilter === status
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Bookings Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="p-4">Guest</th>
                    <th className="p-4">Room</th>
                    <th className="p-4">Check In / Out</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Total Price</th>
                    <th className="p-4">Advance / Pending</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 text-xs font-medium">
                  {filteredListBookings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-400 italic text-xs">
                        No bookings found matching filters.
                      </td>
                    </tr>
                  ) : (
                    filteredListBookings.map((b) => {
                      const checkInDate = new Date(b.check_in);
                      const checkOutDate = new Date(b.expected_checkout);
                      
                      return (
                        <tr key={b.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-slate-800">{b.primary_customer?.full_name}</span>
                              <span className="text-[10px] text-slate-400 font-bold mt-0.5 flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {b.primary_customer?.phone}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-slate-800">Room {b.room?.room_number}</span>
                              <span className="text-[10px] text-slate-400 font-bold mt-0.5">{b.room?.room_type}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-700">
                                {checkInDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                              <span className="text-[10px] text-slate-400 font-bold mt-0.5 flex items-center gap-1">
                                ➔ {checkOutDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
                              b.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200/60' :
                              b.status === 'Reserved' ? 'bg-indigo-50 text-indigo-700 border-indigo-200/60' :
                              b.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' :
                              b.status === 'Completed' ? 'bg-slate-100 text-slate-600 border-slate-200/60' :
                              'bg-rose-50 text-rose-700 border-rose-200/60'
                            }`}>
                              {b.status}
                            </span>
                          </td>
                          <td className="p-4 text-xs font-semibold text-slate-800">
                            ₹{b.payment ? Number(b.payment.room_price).toLocaleString('en-IN') : 'N/A'}
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-emerald-600">Paid: ₹{b.payment ? Number(b.payment.advance).toLocaleString('en-IN') : '0'}</span>
                              <span className="text-[10px] font-bold text-amber-600 mt-0.5">Due: ₹{b.payment ? Number(b.payment.pending).toLocaleString('en-IN') : '0'}</span>
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => setSelectedBooking(b)}
                              className="px-3 py-1.5 border border-slate-200 hover:border-slate-300 text-xs font-semibold rounded-lg transition-colors bg-white hover:bg-slate-50 text-slate-700 shadow-sm"
                            >
                              Manage
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* BOOKING DETAILS DRAWER/MODAL */}
        {selectedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-sm transition-all duration-300">
            <div className="w-full max-w-lg bg-white h-full shadow-2xl p-6 overflow-y-auto flex flex-col justify-between border-l border-slate-100 animate-in slide-in-from-right duration-300">
              
              <div>
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                  <div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                      selectedBooking.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      selectedBooking.status === 'Reserved' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                      selectedBooking.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                      selectedBooking.status === 'Completed' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                      'bg-rose-50 text-rose-700 border-rose-100'
                    }`}>
                      Booking {selectedBooking.status}
                    </span>
                    <h3 className="text-base font-black text-slate-800 mt-1">Reservation Details</h3>
                  </div>
                  <button
                    onClick={() => setSelectedBooking(null)}
                    className="p-1 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Details Content */}
                <div className="space-y-6">
                  {/* Guest Section */}
                  <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-4 space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-450">Primary Guest</h4>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-black text-slate-800">{selectedBooking.primary_customer?.full_name}</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-1 flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" /> {selectedBooking.primary_customer?.phone}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                          {selectedBooking.primary_customer?.city}, {selectedBooking.primary_customer?.state}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Room & Stay Section */}
                  <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-4 space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-450">Stay Information</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[9px] font-bold uppercase text-slate-400">Room</p>
                        <p className="text-xs font-black text-slate-800 mt-0.5">
                          {selectedBooking.room?.room_number ? `Room ${selectedBooking.room.room_number}` : 'Pending Allocation'}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold">{selectedBooking.room?.room_type || 'No Room Assigned'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold uppercase text-slate-400">Guests Number</p>
                        <p className="text-xs font-black text-slate-800 mt-0.5">{selectedBooking.number_of_guests} guest(s)</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold uppercase text-slate-400">Check In Date</p>
                        <p className="text-xs font-black text-slate-800 mt-0.5">
                          {new Date(selectedBooking.check_in).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold uppercase text-slate-400">Expected Checkout</p>
                        <p className="text-xs font-black text-slate-800 mt-0.5">
                          {new Date(selectedBooking.expected_checkout).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Financial Settlement */}
                  {selectedBooking.payment && (
                    <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-4 space-y-3">
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-450">Financial Summary</h4>
                      <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <p className="text-[9px] font-bold uppercase text-slate-400">Room Price</p>
                          <p className="text-xs font-black text-slate-800 mt-0.5">₹{Number(selectedBooking.payment.room_price).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold uppercase text-slate-400 text-emerald-600">Advance Paid</p>
                          <p className="text-xs font-black text-emerald-600 mt-0.5">₹{Number(selectedBooking.payment.advance).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold uppercase text-slate-400 text-amber-600">Due Amount</p>
                          <p className="text-xs font-black text-amber-600 mt-0.5">₹{Number(selectedBooking.payment.pending).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider pt-0.5">
                        <span>Payment Method</span>
                        <span className="text-slate-700 flex items-center gap-1">
                          <CreditCard className="w-3.5 h-3.5" />
                          {selectedBooking.payment.payment_method}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="border-t border-slate-100 pt-6 mt-8 space-y-2">
                {/* Pending Status Actions */}
                {selectedBooking.status === 'Pending' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Allocate Room *</label>
                      <select
                        value={confirmRoomId}
                        onChange={(e) => setConfirmRoomId(e.target.value)}
                        className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none"
                      >
                        <option value="">-- Select Available Room --</option>
                        {rooms
                          .filter((r) => r.status === 'Ready')
                          .map((r) => (
                            <option key={r.id} value={r.id}>
                              Room {r.room_number} ({r.room_type}) - ₹{r.price}
                            </option>
                          ))}
                      </select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleCancelBooking(selectedBooking.id)}
                        className="w-full py-3.5 text-xs font-black uppercase tracking-wider text-rose-600 hover:bg-rose-50 border border-rose-200/50 rounded-xl transition-all"
                      >
                        Reject Request
                      </button>
                      <button
                        onClick={() => handleConfirmPendingBooking(selectedBooking.id)}
                        disabled={confirming}
                        className="w-full py-3.5 text-xs font-black uppercase tracking-wider text-white bg-primary hover:bg-primary-hover rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-55"
                      >
                        <UserCheck className="w-4 h-4" />
                        Confirm Booking
                      </button>
                    </div>
                  </div>
                )}

                {/* Reserved Status Actions */}
                {selectedBooking.status === 'Reserved' && (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleCancelBooking(selectedBooking.id)}
                      className="w-full py-3.5 text-xs font-black uppercase tracking-wider text-rose-600 hover:bg-rose-50 border border-rose-200/50 rounded-xl transition-all"
                    >
                      Cancel Booking
                    </button>
                    <button
                      onClick={() => handleCheckInBooking(selectedBooking.id)}
                      className="w-full py-3.5 text-xs font-black uppercase tracking-wider text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <UserCheck className="w-4 h-4" />
                      Check-In Guest
                    </button>
                  </div>
                )}

                {/* Active Stay Actions */}
                {selectedBooking.status === 'Active' && (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleCancelBooking(selectedBooking.id)}
                      className="w-full py-3.5 text-xs font-black uppercase tracking-wider text-rose-600 hover:bg-rose-50 border border-rose-200/50 rounded-xl transition-all"
                    >
                      Release & Void
                    </button>
                    <button
                      onClick={() => {
                        const finalMethod = window.prompt(
                          `Confirm Settling Check-Out.\nDue Balance: ₹${selectedBooking.payment?.pending || 0}\nChoose Settlement Method (UPI, Cash, Card):`,
                          'UPI'
                        );
                        if (finalMethod && ['UPI', 'Cash', 'Card'].includes(finalMethod)) {
                          handleCheckOutBooking(selectedBooking.id, finalMethod as 'UPI' | 'Cash' | 'Card');
                        } else if (finalMethod !== null) {
                          alert('Invalid payment method selected. Checkout cancelled.');
                        }
                      }}
                      className="w-full py-3.5 text-xs font-black uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <Coins className="w-4 h-4" />
                      Settle & Checkout
                    </button>
                  </div>
                )}

                <button
                  onClick={() => setSelectedBooking(null)}
                  className="w-full py-3 text-xs font-black uppercase tracking-wider text-slate-400 hover:bg-slate-50 border border-slate-200/60 rounded-xl transition-all"
                >
                  Close Drawer
                </button>
              </div>

            </div>
          </div>
        )}

        {/* CREATE BOOKING PANEL SLIDEOUT */}
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-sm transition-all duration-300">
            <div className="w-full max-w-xl bg-white h-full shadow-2xl p-6 overflow-y-auto flex flex-col justify-between border-l border-slate-100 animate-in slide-in-from-right duration-300">
              
              <div>
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                  <div>
                    <h3 className="text-base font-black text-slate-800">New Reservation</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Book or direct check-in a guest</p>
                  </div>
                  <button
                    onClick={() => {
                      setIsCreateOpen(false);
                      setSelectedCustomer(null);
                      setShowNewCustomerForm(false);
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Step 1: Customer Selection */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Step 1: Guest Selection *</label>
                      {errors.selectedCustomer && (
                        <div className="p-3 bg-red-50 text-xs font-semibold text-red-600 rounded-xl border border-red-100 mt-1 w-full block">
                          {errors.selectedCustomer}
                        </div>
                      )}
                      {!showNewCustomerForm ? (
                        <button
                          type="button"
                          onClick={() => setShowNewCustomerForm(true)}
                          className="text-[10px] font-bold uppercase tracking-wider text-primary hover:text-red-700 flex items-center gap-1"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          Register New Guest
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowNewCustomerForm(false)}
                          className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600"
                        >
                          Lookup Existing Guest
                        </button>
                      )}
                    </div>

                    {showNewCustomerForm ? (
                      <div className="border border-dashed border-slate-200 p-4 rounded-2xl bg-slate-50/30">
                        <CustomerForm 
                          onSubmit={handleNewCustomerCreate} 
                          onCancel={() => setShowNewCustomerForm(false)} 
                        />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {currentHotel && (
                          <CustomerSearch 
                            hotelId={currentHotel.id} 
                            onSelectCustomer={handleSelectCustomer}
                            onClear={() => setSelectedCustomer(null)}
                          />
                        )}
                        
                        {/* Display Selected Guest */}
                        {selectedCustomer && (
                          <div className="flex items-center justify-between p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl animate-fade-in">
                            <div>
                              <p className="text-xs font-black text-emerald-800">{selectedCustomer.full_name}</p>
                              <p className="text-[10px] text-emerald-600 font-bold mt-1">{selectedCustomer.phone} • {selectedCustomer.city || 'India'}</p>
                            </div>
                            <span className="bg-emerald-500 text-white rounded-full p-1">
                              <CheckCircle2 className="w-4 h-4" />
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Step 2: Booking details */}
                  <form onSubmit={(e) => handleCreateBookingSubmit(e, 'Reserved')} className="space-y-4">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Step 2: Stay & Billing Details</label>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {/* Room Selection */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Room *</label>
                        <select
                          required
                          value={selectedRoomId}
                          onChange={(e) => {
                            setSelectedRoomId(e.target.value);
                            const rm = rooms.find(r => r.id === e.target.value);
                            if (rm) setCustomRoomPrice(Number(rm.price));
                            if (errors.selectedRoomId) {
                              setErrors(prev => {
                                const copy = { ...prev };
                                delete copy.selectedRoomId;
                                return copy;
                              });
                            }
                          }}
                          className={`w-full text-xs font-bold text-slate-700 bg-slate-50/50 border rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary ${
                            errors.selectedRoomId ? 'border-red-500 focus:ring-red-500' : 'border-slate-200'
                          }`}
                        >
                          <option value="">Select a Room</option>
                          {rooms.map((r) => (
                            <option key={r.id} value={r.id}>
                              Room {r.room_number} - {r.room_type} (₹{Number(r.price).toLocaleString()})
                            </option>
                          ))}
                        </select>
                        {errors.selectedRoomId && (
                          <span className="text-[10px] font-bold text-red-500 mt-1 block">{errors.selectedRoomId}</span>
                        )}
                      </div>

                      {/* Number of Guests */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Number of Guests *</label>
                        <input
                          type="number"
                          min={1}
                          required
                          value={numberOfGuests}
                          onChange={(e) => {
                            setNumberOfGuests(Number(e.target.value));
                            if (errors.numberOfGuests) {
                              setErrors(prev => {
                                const copy = { ...prev };
                                delete copy.numberOfGuests;
                                return copy;
                              });
                            }
                          }}
                          className={`w-full text-xs font-bold text-slate-700 bg-slate-50/50 border rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary ${
                            errors.numberOfGuests ? 'border-red-500 focus:ring-red-500' : 'border-slate-200'
                          }`}
                        />
                        {errors.numberOfGuests && (
                          <span className="text-[10px] font-bold text-red-500 mt-1 block">{errors.numberOfGuests}</span>
                        )}
                      </div>

                      {/* Check-In Date */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Check-in Date *</label>
                        <input
                          type="date"
                          required
                          value={bookingCheckIn}
                          onChange={(e) => {
                            setBookingCheckIn(e.target.value);
                            if (errors.bookingCheckIn) {
                              setErrors(prev => {
                                const copy = { ...prev };
                                delete copy.bookingCheckIn;
                                return copy;
                              });
                            }
                          }}
                          className={`w-full text-xs font-bold text-slate-700 bg-slate-50/50 border rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary ${
                            errors.bookingCheckIn ? 'border-red-500 focus:ring-red-500' : 'border-slate-200'
                          }`}
                        />
                        {errors.bookingCheckIn && (
                          <span className="text-[10px] font-bold text-red-500 mt-1 block">{errors.bookingCheckIn}</span>
                        )}
                      </div>

                      {/* Checkout Date */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Expected Checkout *</label>
                        <input
                          type="date"
                          required
                          value={bookingCheckout}
                          onChange={(e) => {
                            setBookingCheckout(e.target.value);
                            if (errors.bookingCheckout) {
                              setErrors(prev => {
                                const copy = { ...prev };
                                delete copy.bookingCheckout;
                                return copy;
                              });
                            }
                          }}
                          className={`w-full text-xs font-bold text-slate-700 bg-slate-50/50 border rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary ${
                            errors.bookingCheckout ? 'border-red-500 focus:ring-red-500' : 'border-slate-200'
                          }`}
                        />
                        {errors.bookingCheckout && (
                          <span className="text-[10px] font-bold text-red-500 mt-1 block">{errors.bookingCheckout}</span>
                        )}
                      </div>

                      {/* Pricing */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Room Price (₹) *</label>
                        <input
                          type="number"
                          required
                          value={customRoomPrice}
                          onChange={(e) => {
                            setCustomRoomPrice(e.target.value);
                            if (errors.customRoomPrice) {
                              setErrors(prev => {
                                const copy = { ...prev };
                                delete copy.customRoomPrice;
                                return copy;
                              });
                            }
                          }}
                          className={`w-full text-xs font-bold text-slate-700 bg-slate-50/50 border rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary ${
                            errors.customRoomPrice ? 'border-red-500 focus:ring-red-500' : 'border-slate-200'
                          }`}
                        />
                        {errors.customRoomPrice && (
                          <span className="text-[10px] font-bold text-red-500 mt-1 block">{errors.customRoomPrice}</span>
                        )}
                      </div>

                      {/* Advance Payment */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Advance Payment Paid (₹)</label>
                        <input
                          type="number"
                          value={advancePaid}
                          onChange={(e) => {
                            setAdvancePaid(Number(e.target.value));
                            if (errors.advancePaid) {
                              setErrors(prev => {
                                const copy = { ...prev };
                                delete copy.advancePaid;
                                return copy;
                              });
                            }
                          }}
                          className={`w-full text-xs font-bold text-slate-700 bg-slate-50/50 border rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary ${
                            errors.advancePaid ? 'border-red-500 focus:ring-red-500' : 'border-slate-200'
                          }`}
                        />
                        {errors.advancePaid && (
                          <span className="text-[10px] font-bold text-red-500 mt-1 block">{errors.advancePaid}</span>
                        )}
                      </div>
                    </div>

                    {/* Payment Method */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Payment Method</label>
                      <div className="flex gap-2">
                        {['UPI', 'Cash', 'Card'].map((method) => (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setPaymentMethod(method as 'UPI' | 'Cash' | 'Card')}
                            className={`flex-1 py-3 text-xs font-bold border rounded-xl transition-all ${
                              paymentMethod === method
                                ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-500'
                            }`}
                          >
                            {method}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="border-t border-slate-100 pt-6 mt-8 grid grid-cols-2 gap-3">
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 text-xs font-black uppercase tracking-wider text-slate-800 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
                      >
                        {loading ? 'Processing...' : 'Reserve Only'}
                      </button>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={(e) => handleCreateBookingSubmit(e, 'Active')}
                        className="w-full py-3.5 text-xs font-black uppercase tracking-wider text-white bg-gradient-to-r from-primary to-rose-600 rounded-xl hover:shadow-lg hover:shadow-red-500/15 active:scale-98 transition-all flex items-center justify-center gap-1.5"
                      >
                        <UserCheck className="w-4 h-4" />
                        {loading ? 'Processing...' : 'Direct Check-In'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
