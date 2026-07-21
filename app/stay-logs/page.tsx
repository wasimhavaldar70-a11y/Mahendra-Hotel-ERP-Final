'use client';

// ========================================================
// StayDesk CRM / HotelFlow CRM — Stay Logs Module
// Location: app/stay-logs/page.tsx
// ========================================================

import React, { useState, useEffect, useMemo, useRef } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { db, getSessionUser } from '../../lib/supabase/client';
import { ExtendedCheckIn } from '../../types';
import * as XLSX from 'xlsx';
import { 
  History, 
  Search, 
  Filter, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  User, 
  Phone, 
  Calendar, 
  Clock, 
  BedDouble, 
  IndianRupee, 
  CheckCircle2, 
  LogOut, 
  Eye, 
  EyeOff, 
  Printer, 
  CreditCard
} from 'lucide-react';

type SortColumn = 
  | 'booking_id'
  | 'customer_name'
  | 'room_number'
  | 'room_type'
  | 'check_in'
  | 'check_out'
  | 'total_nights'
  | 'amount'
  | 'payment_status'
  | 'stay_status';

type SortDirection = 'asc' | 'desc';

const STANDARD_AC_ROOMS = [
  'Standard A/C',
  'Semi Deluxe A/C',
  'Deluxe A/C',
  'Super Deluxe A/C',
  'Family Suite A/C',
  'Executive Suite A/C',
  'Dormitory A/C'
];

const STANDARD_NON_AC_ROOMS = [
  'Standard Non A/C',
  'Semi Deluxe Non A/C',
  'Deluxe Non A/C',
  'Super Deluxe Non A/C',
  'Family Suite Non A/C',
  'Executive Suite Non A/C',
  'Dormitory Non A/C'
];

export default function StayLogsPage() {
  const [currentHotel, setCurrentHotel] = useState<any>(null);
  const [stays, setStays] = useState<ExtendedCheckIn[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('ALL');
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>('ALL');
  const [checkInFromDate, setCheckInFromDate] = useState('');
  const [checkInToDate, setCheckInToDate] = useState('');
  const [checkOutFromDate, setCheckOutFromDate] = useState('');
  const [checkOutToDate, setCheckOutToDate] = useState('');

  // Sorting State
  const [sortColumn, setSortColumn] = useState<SortColumn>('check_in');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // View Details Modal State
  const [selectedStay, setSelectedStay] = useState<ExtendedCheckIn | null>(null);
  const [unmaskId, setUnmaskId] = useState(false);

  // Export Dropdown State
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch all stays
  const loadStays = async (hotelId: string) => {
    setLoading(true);
    try {
      const data = await db.getAllStaysForHotel(hotelId);
      setStays(data);
    } catch (err) {
      console.error('Failed to load stay logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const session = getSessionUser();
    if (session && session.hotel) {
      setCurrentHotel(session.hotel);
      loadStays(session.hotel.id);

      const channel = new BroadcastChannel('hotelflow-sync');
      channel.onmessage = (event) => {
        if (event.data && event.data.type === 'DB_UPDATE') {
          loadStays(session.hotel.id);
        }
      };
      return () => channel.close();
    }
  }, []);

  // Helper: Mask document number (e.g. "123456789012" -> "XXXX-XXXX-9012")
  const maskDocumentNumber = (docNum?: string) => {
    if (!docNum) return 'N/A';
    const clean = docNum.replace(/\s+/g, '');
    if (clean.length <= 4) return clean;
    const visibleLength = Math.min(4, clean.length);
    const visibleDigits = clean.slice(-visibleLength);
    const maskedLength = clean.length - visibleLength;
    const maskedPart = 'X'.repeat(maskedLength);
    
    const combined = maskedPart + visibleDigits;
    return combined.replace(/(.{4})/g, '$1-').replace(/-$/, '');
  };

  // Helper: Get stay status category string
  const getStayStatusCategory = (status: string): 'Upcoming' | 'Checked In' | 'Checked Out' | 'Cancelled' => {
    switch (status) {
      case 'Active': return 'Checked In';
      case 'Completed': return 'Checked Out';
      case 'Cancelled': return 'Cancelled';
      case 'Reserved':
      case 'Pending':
      default:
        return 'Upcoming';
    }
  };

  // Helper: Get payment status
  const getPaymentStatus = (stay: ExtendedCheckIn): 'Paid' | 'Partial' | 'Pending' => {
    const advance = Number(stay.payment?.advance || 0);
    const pending = Number(stay.payment?.pending || 0);
    const grandTotal = Number(stay.grand_total || stay.payment?.room_price || 0);

    if (pending <= 0 || (grandTotal > 0 && advance >= grandTotal)) {
      return 'Paid';
    }
    if (advance > 0 && pending > 0) {
      return 'Partial';
    }
    return 'Pending';
  };

  // Other Custom Room Types present in data
  const otherRoomTypes = useMemo(() => {
    const allStandard = new Set([...STANDARD_AC_ROOMS, ...STANDARD_NON_AC_ROOMS]);
    const set = new Set<string>();
    stays.forEach(s => {
      const type = s.room?.room_type;
      if (type && !allStandard.has(type)) {
        set.add(type);
      }
    });
    return Array.from(set);
  }, [stays]);

  // Filtered & Searched Data Logic
  const filteredStays = useMemo(() => {
    return stays.filter(stay => {
      const customer = stay.primary_customer;
      const room = stay.room;
      const doc = customer?.customer_documents?.[0];

      const bookingIdStr = (stay.booking_id || `BK-${stay.id.slice(0, 8).toUpperCase()}`).toLowerCase();
      const customerName = (customer?.full_name || '').toLowerCase();
      const mobileNumber = (customer?.phone || '').toLowerCase();
      const emailAddr = (customer?.email || '').toLowerCase();
      const docType = (doc?.document_type || stay.address_proof_type || '').toLowerCase();
      const docNumber = (doc?.document_number || stay.document_number || '').toLowerCase();
      const roomNumber = (room?.room_number || '').toLowerCase();
      const roomType = (room?.room_type || '').toLowerCase();
      const stayStatusCat = getStayStatusCategory(stay.status).toLowerCase();
      const payStatus = getPaymentStatus(stay).toLowerCase();
      const purpose = (stay.purpose_of_stay || '').toLowerCase();
      const vehicle = (stay.vehicle_number || '').toLowerCase();

      // 1. Multi-Field Substring Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery = 
          customerName.includes(q) ||
          mobileNumber.includes(q) ||
          emailAddr.includes(q) ||
          docType.includes(q) ||
          docNumber.includes(q) ||
          roomNumber.includes(q) ||
          roomType.includes(q) ||
          bookingIdStr.includes(q) ||
          stayStatusCat.includes(q) ||
          payStatus.includes(q) ||
          purpose.includes(q) ||
          vehicle.includes(q);

        if (!matchesQuery) return false;
      }

      // 2. Stay Status Filter
      if (statusFilter !== 'ALL' && getStayStatusCategory(stay.status) !== statusFilter) {
        return false;
      }

      // 3. Payment Status Filter
      if (paymentStatusFilter !== 'ALL' && getPaymentStatus(stay) !== paymentStatusFilter) {
        return false;
      }

      // 4. Room Type Filter (Flexible substring or exact match)
      if (roomTypeFilter !== 'ALL') {
        const stayType = roomType.trim();
        const filterType = roomTypeFilter.toLowerCase().trim();
        if (!stayType.includes(filterType) && !filterType.includes(stayType)) {
          return false;
        }
      }

      // 5. Check-in Date Range Filter
      const inDate = stay.check_in_date || stay.check_in?.substring(0, 10);
      if (checkInFromDate && inDate < checkInFromDate) return false;
      if (checkInToDate && inDate > checkInToDate) return false;

      // 6. Check-out Date Range Filter
      const outDate = stay.check_out_date || stay.actual_checkout?.substring(0, 10) || stay.expected_checkout?.substring(0, 10);
      if (checkOutFromDate && outDate < checkOutFromDate) return false;
      if (checkOutToDate && outDate > checkOutToDate) return false;

      return true;
    });
  }, [
    stays,
    searchQuery,
    statusFilter,
    paymentStatusFilter,
    roomTypeFilter,
    checkInFromDate,
    checkInToDate,
    checkOutFromDate,
    checkOutToDate
  ]);

  // Sorted Data Logic
  const sortedStays = useMemo(() => {
    const data = [...filteredStays];

    return data.sort((a, b) => {
      let aVal: any = '';
      let bVal: any = '';

      switch (sortColumn) {
        case 'booking_id':
          aVal = a.booking_id || a.id;
          bVal = b.booking_id || b.id;
          break;
        case 'customer_name':
          aVal = (a.primary_customer?.full_name || '').toLowerCase();
          bVal = (b.primary_customer?.full_name || '').toLowerCase();
          break;
        case 'room_number':
          aVal = a.room?.room_number || '';
          bVal = b.room?.room_number || '';
          break;
        case 'room_type':
          aVal = (a.room?.room_type || '').toLowerCase();
          bVal = (b.room?.room_type || '').toLowerCase();
          break;
        case 'check_in':
          aVal = new Date(a.check_in).getTime();
          bVal = new Date(b.check_in).getTime();
          break;
        case 'check_out':
          aVal = new Date(a.actual_checkout || a.expected_checkout).getTime();
          bVal = new Date(b.actual_checkout || b.expected_checkout).getTime();
          break;
        case 'total_nights':
          aVal = a.total_nights || 1;
          bVal = b.total_nights || 1;
          break;
        case 'amount':
          aVal = Number(a.grand_total || a.payment?.room_price || 0);
          bVal = Number(b.grand_total || b.payment?.room_price || 0);
          break;
        case 'payment_status':
          aVal = getPaymentStatus(a);
          bVal = getPaymentStatus(b);
          break;
        case 'stay_status':
          aVal = getStayStatusCategory(a.status);
          bVal = getStayStatusCategory(b.status);
          break;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredStays, sortColumn, sortDirection]);

  // Paginated Data
  const totalPages = Math.ceil(sortedStays.length / rowsPerPage) || 1;
  const paginatedStays = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return sortedStays.slice(start, start + rowsPerPage);
  }, [sortedStays, currentPage, rowsPerPage]);

  // Handle Sort Click
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setPaymentStatusFilter('ALL');
    setRoomTypeFilter('ALL');
    setCheckInFromDate('');
    setCheckInToDate('');
    setCheckOutFromDate('');
    setCheckOutToDate('');
    setCurrentPage(1);
  };

  // Check if any filter is active
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery) count++;
    if (statusFilter !== 'ALL') count++;
    if (paymentStatusFilter !== 'ALL') count++;
    if (roomTypeFilter !== 'ALL') count++;
    if (checkInFromDate || checkInToDate) count++;
    if (checkOutFromDate || checkOutToDate) count++;
    return count;
  }, [
    searchQuery,
    statusFilter,
    paymentStatusFilter,
    roomTypeFilter,
    checkInFromDate,
    checkInToDate,
    checkOutFromDate,
    checkOutToDate
  ]);

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    setExportOpen(false);

    const exportRows = sortedStays.map(s => {
      const cust = s.primary_customer;
      const doc = cust?.customer_documents?.[0];
      const room = s.room;
      const bookingIdStr = s.booking_id || `BK-${s.id.slice(0, 8).toUpperCase()}`;

      return {
        'Booking ID': bookingIdStr,
        'Customer Name': cust?.full_name || 'N/A',
        'Mobile Number': cust?.phone || 'N/A',
        'Email Address': cust?.email || 'N/A',
        'ID Proof Type': doc?.document_type || s.address_proof_type || 'N/A',
        'ID Number': doc?.document_number || s.document_number || 'N/A',
        'Room Number': room?.room_number || 'N/A',
        'Room Type': room?.room_type || 'N/A',
        'Number of Guests': s.number_of_guests || 1,
        'Check-in Date & Time': s.check_in ? new Date(s.check_in).toLocaleString('en-IN') : 'N/A',
        'Check-out Date & Time': s.actual_checkout 
          ? new Date(s.actual_checkout).toLocaleString('en-IN') 
          : s.expected_checkout 
            ? new Date(s.expected_checkout).toLocaleString('en-IN') 
            : 'N/A',
        'Total Nights': s.total_nights || 1,
        'Booking Source': s.booking_source || 'Walk-in',
        'Grand Total (INR)': Number(s.grand_total || s.payment?.room_price || 0),
        'Advance Paid (INR)': Number(s.payment?.advance || 0),
        'Pending Balance (INR)': Number(s.payment?.pending || 0),
        'Payment Status': getPaymentStatus(s),
        'Stay Status': getStayStatusCategory(s.status),
        'Purpose of Stay': s.purpose_of_stay || 'Tourism',
        'Arrival From': s.arrival_from || 'N/A',
        'Proceeding To': s.proceeding_to || 'N/A'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Stay Logs Register');

    const colWidths = Object.keys(exportRows[0] || {}).map(key => ({
      wch: Math.max(key.length + 3, 16)
    }));
    worksheet['!cols'] = colWidths;

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `StayDesk-StayLogs-${dateStr}.xlsx`);
  };

  // Export to PDF / Print
  const handleExportPDF = () => {
    setExportOpen(false);
    window.print();
  };

  // Stats Counters
  const stats = useMemo(() => {
    let checkedIn = 0;
    let checkedOut = 0;
    let totalRev = 0;

    stays.forEach(s => {
      if (s.status === 'Active') checkedIn++;
      if (s.status === 'Completed') checkedOut++;
      totalRev += Number(s.grand_total || s.payment?.room_price || 0);
    });

    return {
      total: stays.length,
      checkedIn,
      checkedOut,
      totalRev
    };
  }, [stays]);

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Stay Logs &amp; Historical Register
            </h1>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              Permanent historical archive of every completed, active, and upcoming stay for compliance, auditing, and guest management.
            </p>
          </div>

          {/* Top Actions: Export Button Dropdown */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="relative" ref={exportRef}>
              <button
                type="button"
                onClick={() => setExportOpen(!exportOpen)}
                className="bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-white font-bold px-4 py-2.5 rounded-xl transition-all text-xs inline-flex items-center gap-2 shadow-sm"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                Export Register
              </button>

              {exportOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Export Filtered ({filteredStays.length} records)
                  </div>
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    Export as Excel (.xlsx)
                  </button>
                  <button
                    type="button"
                    onClick={handleExportPDF}
                    className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-blue-600" />
                    Export as PDF / Print
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
              <History className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Recorded</span>
              <span className="text-base font-extrabold text-slate-800">{stats.total} Stays</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Currently Checked In</span>
              <span className="text-base font-extrabold text-emerald-700">{stats.checkedIn} Active</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Completed Stays</span>
              <span className="text-base font-extrabold text-blue-700">{stats.checkedOut} Checked Out</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Historical Value</span>
              <span className="text-base font-extrabold text-slate-800">₹{stats.totalRev.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Search & Filter Controls Bar */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full md:w-96">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Search guest name, mobile, proof id, e.t.c"
                className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-xs font-semibold placeholder-slate-400 focus:bg-white focus:border-primary focus:outline-none transition-all shadow-inner"
              />
            </div>

            {/* Filter Toggle & Quick Stats */}
            <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
              <button
                type="button"
                onClick={() => setShowFiltersPanel(!showFiltersPanel)}
                className={`flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl border transition-all ${
                  showFiltersPanel || activeFiltersCount > 0
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="bg-primary text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline px-2 py-1"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Expandable Combinable Filters Panel (Retaining ONLY Stay status, payment status, room type, check-in, check-out) */}
          {showFiltersPanel && (
            <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 animate-in fade-in duration-150">
              {/* Stay Status */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Stay Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="ALL">All Stay Statuses</option>
                  <option value="Checked In">Checked In (Active)</option>
                  <option value="Checked Out">Checked Out (Completed)</option>
                  <option value="Upcoming">Upcoming (Reserved)</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              {/* Payment Status */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Payment Status</label>
                <select
                  value={paymentStatusFilter}
                  onChange={(e) => { setPaymentStatusFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="ALL">All Payment Statuses</option>
                  <option value="Paid">Fully Paid</option>
                  <option value="Partial">Partially Paid</option>
                  <option value="Pending">Payment Pending</option>
                </select>
              </div>

              {/* Room Type (Categorized into A/C & Non A/C) */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Room Type</label>
                <select
                  value={roomTypeFilter}
                  onChange={(e) => { setRoomTypeFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="ALL">All Room Types</option>
                  <optgroup label="── A/C Rooms ──">
                    {STANDARD_AC_ROOMS.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </optgroup>
                  <optgroup label="── Non A/C Rooms ──">
                    {STANDARD_NON_AC_ROOMS.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </optgroup>
                  {otherRoomTypes.length > 0 && (
                    <optgroup label="── Other Room Categories ──">
                      {otherRoomTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Check-in Range */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Check-in From</label>
                <input
                  type="date"
                  value={checkInFromDate}
                  onChange={(e) => { setCheckInFromDate(e.target.value); setCurrentPage(1); }}
                  className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-2 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Check-in To</label>
                <input
                  type="date"
                  value={checkInToDate}
                  onChange={(e) => { setCheckInToDate(e.target.value); setCurrentPage(1); }}
                  className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-2 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              {/* Check-out Range */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Check-out From</label>
                <input
                  type="date"
                  value={checkOutFromDate}
                  onChange={(e) => { setCheckOutFromDate(e.target.value); setCurrentPage(1); }}
                  className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-2 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Check-out To</label>
                <input
                  type="date"
                  value={checkOutToDate}
                  onChange={(e) => { setCheckOutToDate(e.target.value); setCurrentPage(1); }}
                  className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-2 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Data Table */}
        {loading ? (
          <div className="flex justify-center items-center py-24 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent" />
              <span className="text-xs font-medium text-slate-400">Loading historical stay register...</span>
            </div>
          </div>
        ) : filteredStays.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm text-center py-20 px-6 space-y-3">
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-center">
                <History className="w-7 h-7 text-slate-300" />
              </div>
            </div>
            <p className="font-bold text-slate-600 text-sm">No stays matching currently applied filters</p>
            <p className="text-xs text-slate-400 font-medium">Try clearing search or filters to inspect full stay history.</p>
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm hover:bg-primary-hover transition-colors mt-2"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-x-auto max-h-[65vh]">
              <table className="w-full text-left border-collapse min-w-[1100px]">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky top-0 z-10 backdrop-blur-md">
                    <th 
                      onClick={() => handleSort('booking_id')}
                      className="px-4 py-3.5 cursor-pointer hover:bg-slate-100/70 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>Booking ID</span>
                        {sortColumn === 'booking_id' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />) : <ArrowUpDown className="w-3 h-3 text-slate-300" />}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('customer_name')}
                      className="px-4 py-3.5 cursor-pointer hover:bg-slate-100/70 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>Guest Name &amp; Contact</span>
                        {sortColumn === 'customer_name' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />) : <ArrowUpDown className="w-3 h-3 text-slate-300" />}
                      </div>
                    </th>
                    <th className="px-4 py-3.5">ID Proof</th>
                    <th 
                      onClick={() => handleSort('room_number')}
                      className="px-4 py-3.5 cursor-pointer hover:bg-slate-100/70 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>Room</span>
                        {sortColumn === 'room_number' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />) : <ArrowUpDown className="w-3 h-3 text-slate-300" />}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('check_in')}
                      className="px-4 py-3.5 cursor-pointer hover:bg-slate-100/70 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>Check In</span>
                        {sortColumn === 'check_in' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />) : <ArrowUpDown className="w-3 h-3 text-slate-300" />}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('check_out')}
                      className="px-4 py-3.5 cursor-pointer hover:bg-slate-100/70 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>Check Out</span>
                        {sortColumn === 'check_out' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />) : <ArrowUpDown className="w-3 h-3 text-slate-300" />}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('total_nights')}
                      className="px-4 py-3.5 cursor-pointer hover:bg-slate-100/70 transition-colors text-center"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Nights</span>
                        {sortColumn === 'total_nights' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />) : <ArrowUpDown className="w-3 h-3 text-slate-300" />}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('amount')}
                      className="px-4 py-3.5 cursor-pointer hover:bg-slate-100/70 transition-colors text-right"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Total Bill</span>
                        {sortColumn === 'amount' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />) : <ArrowUpDown className="w-3 h-3 text-slate-300" />}
                      </div>
                    </th>
                    <th className="px-4 py-3.5 text-center">Payment</th>
                    <th className="px-4 py-3.5 text-center">Stay Status</th>
                    <th className="px-4 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {paginatedStays.map((stay) => {
                    const cust = stay.primary_customer;
                    const doc = cust?.customer_documents?.[0];
                    const room = stay.room;
                    const bookingIdStr = stay.booking_id || `BK-${stay.id.slice(0, 8).toUpperCase()}`;
                    const stayStatusCat = getStayStatusCategory(stay.status);
                    const payStatus = getPaymentStatus(stay);
                    const grandTotal = Number(stay.grand_total || stay.payment?.room_price || 0);

                    return (
                      <tr key={stay.id} className="hover:bg-slate-50/70 transition-colors group">
                        {/* Booking ID */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="font-mono text-[11px] font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200/80">
                            {bookingIdStr}
                          </span>
                        </td>

                        {/* Customer Info */}
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-900 leading-tight">
                            {cust?.full_name || 'Walk-in Guest'}
                          </div>
                          <div className="text-[11px] font-semibold text-slate-400 mt-0.5 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{cust?.phone || '—'}</span>
                          </div>
                        </td>

                        {/* ID Proof */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="text-[11px] font-bold text-slate-700 uppercase">
                            {doc?.document_type || stay.address_proof_type || 'N/A'}
                          </div>
                          <div className="text-[10px] font-mono font-bold text-slate-400">
                            {maskDocumentNumber(doc?.document_number || stay.document_number)}
                          </div>
                        </td>

                        {/* Room Details */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-slate-800 bg-slate-100 text-xs px-2 py-0.5 rounded-md border border-slate-200">
                              {room?.room_number || 'N/A'}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 truncate max-w-[100px]">
                              {room?.room_type || ''}
                            </span>
                          </div>
                        </td>

                        {/* Check-in */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-slate-700">
                          <div>
                            {new Date(stay.check_in).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                          <div className="text-[10px] text-slate-400 font-semibold">
                            {new Date(stay.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        {/* Check-out */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-slate-700">
                          <div>
                            {stay.actual_checkout
                              ? new Date(stay.actual_checkout).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                              : new Date(stay.expected_checkout).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                            }
                          </div>
                          <div className="text-[10px] text-slate-400 font-semibold">
                            {stay.actual_checkout
                              ? new Date(stay.actual_checkout).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                              : new Date(stay.expected_checkout).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                            }
                          </div>
                        </td>

                        {/* Total Nights */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap font-bold text-slate-800">
                          {stay.total_nights || 1} N
                        </td>

                        {/* Amount */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap font-extrabold text-slate-800">
                          ₹{grandTotal.toLocaleString('en-IN')}
                        </td>

                        {/* Payment Status */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            payStatus === 'Paid'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : payStatus === 'Partial'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {payStatus}
                          </span>
                        </td>

                        {/* Stay Status */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            stayStatusCat === 'Checked In'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : stayStatusCat === 'Checked Out'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : stayStatusCat === 'Upcoming'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : 'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {stayStatusCat}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => { setSelectedStay(stay); setUnmaskId(false); }}
                            className="bg-slate-100 hover:bg-primary hover:text-white text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-xs"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold text-slate-500">
              <div className="flex items-center gap-3">
                <span>Rows per page:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-slate-400">
                  Showing {sortedStays.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, sortedStays.length)} of {sortedStays.length} stays
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 font-bold text-slate-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* VIEW DETAILS DRAWER / MODAL */}
      {selectedStay && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-lg font-extrabold text-slate-800">
                    Stay Record Details
                  </h3>
                  <span className="font-mono text-xs font-bold text-slate-700 bg-slate-200/80 px-2.5 py-0.5 rounded-md">
                    {selectedStay.booking_id || `BK-${selectedStay.id.slice(0, 8).toUpperCase()}`}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">
                  Full stay ledger, customer credentials, and billing breakdown
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStay(null)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body Scroll */}
            <div className="p-6 flex-1 overflow-y-auto space-y-6 text-xs">
              {/* Section 1: Customer Details */}
              <div className="p-4 rounded-2xl bg-slate-50/60 border border-slate-200/70 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <User className="w-4 h-4 text-primary" />
                    Customer Particulars
                  </h4>
                  <span className="text-[10px] font-bold text-slate-400">
                    ID #{selectedStay.primary_customer?.id?.slice(0, 8) || 'N/A'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</span>
                    <span className="font-bold text-slate-800 text-sm mt-0.5 block">{selectedStay.primary_customer?.full_name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mobile Number</span>
                    <span className="font-bold text-slate-800 text-sm mt-0.5 block">{selectedStay.primary_customer?.phone || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</span>
                    <span className="font-semibold text-slate-700 mt-0.5 block">{selectedStay.primary_customer?.email || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Emergency Contact</span>
                    <span className="font-semibold text-slate-700 mt-0.5 block">{selectedStay.primary_customer?.emergency_contact || 'N/A'}</span>
                  </div>
                </div>

                {/* ID Proof Box */}
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200/70">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {selectedStay.primary_customer?.customer_documents?.[0]?.document_type || selectedStay.address_proof_type || 'ID Proof'}
                    </span>
                    <span className="font-mono font-bold text-slate-800 text-xs mt-0.5 block">
                      {unmaskId
                        ? (selectedStay.primary_customer?.customer_documents?.[0]?.document_number || selectedStay.document_number || 'N/A')
                        : maskDocumentNumber(selectedStay.primary_customer?.customer_documents?.[0]?.document_number || selectedStay.document_number)
                      }
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUnmaskId(!unmaskId)}
                    className="flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                  >
                    {unmaskId ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {unmaskId ? 'Mask' : 'Show Full'}
                  </button>
                </div>

                {selectedStay.primary_customer?.address && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Residential Address</span>
                    <span className="font-medium text-slate-700 mt-0.5 block">{selectedStay.primary_customer.address}</span>
                  </div>
                )}
              </div>

              {/* Section 2: Booking Details */}
              <div className="p-4 rounded-2xl bg-slate-50/60 border border-slate-200/70 space-y-3">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5 border-b border-slate-200/60 pb-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Booking Particulars
                </h4>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Booking ID</span>
                    <span className="font-mono font-bold text-slate-800">{selectedStay.booking_id || `BK-${selectedStay.id.slice(0, 8).toUpperCase()}`}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Booking Date</span>
                    <span className="font-bold text-slate-700">{new Date(selectedStay.created_at).toLocaleDateString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Booking Source</span>
                    <span className="font-bold text-emerald-700">{selectedStay.booking_source || 'Walk-in'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-200/60">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Guests</span>
                    <span className="font-bold text-slate-800">{selectedStay.number_of_guests || 1} Person(s)</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Adults</span>
                    <span className="font-bold text-slate-800">{selectedStay.adults || selectedStay.number_of_guests || 1}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Children</span>
                    <span className="font-bold text-slate-800">{selectedStay.children || 0}</span>
                  </div>
                </div>

                {selectedStay.special_requests && (
                  <div className="pt-2 border-t border-slate-200/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Special Requests</span>
                    <span className="font-medium text-slate-700 italic mt-0.5 block">{selectedStay.special_requests}</span>
                  </div>
                )}
              </div>

              {/* Section 3: Room Details */}
              <div className="p-4 rounded-2xl bg-slate-50/60 border border-slate-200/70 space-y-3">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5 border-b border-slate-200/60 pb-2">
                  <BedDouble className="w-4 h-4 text-primary" />
                  Assigned Room Details
                </h4>

                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Room Number</span>
                    <span className="font-extrabold text-slate-900 text-sm">{selectedStay.room?.room_number || 'N/A'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Room Category</span>
                    <span className="font-bold text-slate-800">{selectedStay.room?.room_type || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Floor</span>
                    <span className="font-bold text-slate-800">{selectedStay.room?.floor || 'Ground'}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Configured Room Tariff</span>
                  <span className="font-extrabold text-slate-900">₹{Number(selectedStay.room_rate || selectedStay.room?.price || 0).toLocaleString('en-IN')} / Night</span>
                </div>
              </div>

              {/* Section 4: Stay Timeline */}
              <div className="p-4 rounded-2xl bg-slate-50/60 border border-slate-200/70 space-y-3">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5 border-b border-slate-200/60 pb-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Stay Duration &amp; Timeline
                </h4>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Check-in</span>
                    <span className="font-bold text-slate-800 block">{new Date(selectedStay.check_in).toLocaleDateString('en-IN')}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">{new Date(selectedStay.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Check-out</span>
                    <span className="font-bold text-slate-800 block">
                      {selectedStay.actual_checkout 
                        ? new Date(selectedStay.actual_checkout).toLocaleDateString('en-IN')
                        : new Date(selectedStay.expected_checkout).toLocaleDateString('en-IN')
                      }
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {selectedStay.actual_checkout 
                        ? new Date(selectedStay.actual_checkout).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                        : new Date(selectedStay.expected_checkout).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                      }
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Nights</span>
                    <span className="font-extrabold text-slate-900 text-sm block">{selectedStay.total_nights || 1} Night(s)</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-200/60 text-[11px]">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Purpose of Stay</span>
                    <span className="font-bold text-slate-700">{selectedStay.purpose_of_stay || 'Tourism'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Arrival From</span>
                    <span className="font-bold text-slate-700">{selectedStay.arrival_from || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Proceeding To</span>
                    <span className="font-bold text-slate-700">{selectedStay.proceeding_to || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Section 5: Financial & Settlement Ledger */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-xs">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5 border-b border-slate-150 pb-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  Financial Settlement Breakdown
                </h4>

                <div className="space-y-1.5 font-medium text-slate-600">
                  <div className="flex justify-between">
                    <span>Room Rent Charges ({selectedStay.total_nights || 1} Nights)</span>
                    <span className="font-bold text-slate-800">₹{Number(selectedStay.room_charges || (selectedStay.total_nights || 1) * Number(selectedStay.room_rate || selectedStay.room?.price || 0)).toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Extra Charges (POS / Amenities)</span>
                    <span className="font-semibold text-slate-700">₹{Number(selectedStay.extra_charges || 0).toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Discount Allowed</span>
                    <span className="font-semibold text-slate-700">₹{Number(selectedStay.discount || 0).toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Taxes (GST)</span>
                    <span className="font-semibold text-slate-700">₹{Number(selectedStay.tax_amount || 0).toLocaleString('en-IN')}</span>
                  </div>

                  <div className="h-[1px] bg-slate-200 my-2"></div>

                  <div className="flex justify-between text-slate-900 font-extrabold text-sm">
                    <span>Grand Total Bill</span>
                    <span>₹{Number(selectedStay.grand_total || selectedStay.payment?.room_price || 0).toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex justify-between text-emerald-700 font-bold pt-1">
                    <span>Payments / Advance Received</span>
                    <span>- ₹{Number(selectedStay.payment?.advance || 0).toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex justify-between text-slate-900 font-extrabold text-sm pt-2 border-t border-slate-200">
                    <span>Remaining Balance</span>
                    <span className={Number(selectedStay.payment?.pending || 0) > 0 ? 'text-red-650' : 'text-slate-800'}>
                      ₹{Number(selectedStay.payment?.pending || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-150 flex items-center justify-between text-[11px]">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payment Mode</span>
                  <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                    {selectedStay.payment?.final_payment_method || selectedStay.payment?.payment_method || 'UPI'}
                  </span>
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors inline-flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4 text-slate-500" />
                Print Folio
              </button>
              <button
                type="button"
                onClick={() => setSelectedStay(null)}
                className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-colors"
              >
                Close Register Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
