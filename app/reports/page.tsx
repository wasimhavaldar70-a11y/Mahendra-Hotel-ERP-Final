'use client';

// ========================================================
// StayDesk CRM / HotelFlow CRM Reports & Analytics Screen
// Location: app/reports/page.tsx
// ========================================================

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { db, getSessionUser } from '../../lib/supabase/client';
import { 
  FilePieChart, 
  Download, 
  Sparkles, 
  Users, 
  DollarSign, 
  DoorClosed, 
  Printer,
  History,
  CalendarDays,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  Receipt,
  Activity,
  FileText
} from 'lucide-react';

export default function ReportsPage() {
  const [currentHotel, setCurrentHotel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reportsData, setReportsData] = useState<{
    dailyRevenue: { date: string; amount: number }[];
    monthlyRevenue: { month: string; amount: number }[];
    occupancyRate: number;
    repeatCustomers: { name: string; phone: string; visits: number }[];
    pendingPayments: { guest: string; phone: string; room: string; amount: number }[];
    mostUsedRooms: { room: string; usageCount: number }[];
  } | null>(null);

  const [ledgerReportsData, setLedgerReportsData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'analytics' | 'ledger'>('analytics');

  const [exporting, setExporting] = useState<string | null>(null);

  // Date Filtering States
  const [filterType, setFilterType] = useState<string>('all');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  const getDateRangeFromType = (type: string, startVal?: string, endVal?: string) => {
    const now = new Date();
    let start = '';
    let end = '';

    switch (type) {
      case 'this_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        break;
      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
        end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
        break;
      case 'last_30_days':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        end = now.toISOString().split('T')[0];
        break;
      case 'custom':
        start = startVal || '';
        end = endVal || '';
        break;
      case 'all':
      default:
        start = '';
        end = '';
        break;
    }
    return { start, end };
  };

  const getPeriodLabel = () => {
    const { start, end } = getDateRangeFromType(filterType, customStart, customEnd);
    if (!start && !end) return 'All Time';

    const formatDateStr = (dateStr: string) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return `${formatDateStr(start)} to ${formatDateStr(end)}`;
  };

  const loadReports = async (hotelId: string, start?: string, end?: string) => {
    setLoading(true);
    try {
      const [standardData, ledgerData] = await Promise.all([
        db.getReports(hotelId, start, end),
        db.getLedgerReports(hotelId, start, end)
      ]);
      setReportsData(standardData);
      setLedgerReportsData(ledgerData);
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
      const { start, end } = getDateRangeFromType(filterType, customStart, customEnd);
      // Wait for both custom dates if 'custom' is active
      if (filterType === 'custom' && (!customStart || !customEnd)) {
        return;
      }
      loadReports(session.hotel.id, start, end);
    }
  }, [filterType, customStart, customEnd]);

  const handleExport = (type: 'Excel' | 'PDF') => {
    setExporting(type);
    setTimeout(() => {
      setExporting(null);
      if (type === 'Excel') {
        const csvRows = [];
        csvRows.push(`"STAYDESK CRM - BUSINESS REPORT"`);
        csvRows.push(`"Hotel Name:","${currentHotel?.hotel_name || 'N/A'}"`);
        csvRows.push(`"Report Period:","${getPeriodLabel()}"`);
        csvRows.push(`"Generated On:","${new Date().toLocaleDateString('en-IN')}"`);
        csvRows.push(`"Occupancy Rate:","${reportsData?.occupancyRate || 0}%"`);
        csvRows.push(``);

        csvRows.push(`"DAILY REVENUE"`);
        csvRows.push(`"Date","Revenue (INR)"`);
        reportsData?.dailyRevenue.forEach(r => {
          csvRows.push(`"${r.date}","${r.amount}"`);
        });
        csvRows.push(``);

        csvRows.push(`"MONTHLY REVENUE"`);
        csvRows.push(`"Month","Revenue (INR)"`);
        reportsData?.monthlyRevenue.forEach(r => {
          csvRows.push(`"${r.month}","${r.amount}"`);
        });
        csvRows.push(``);

        csvRows.push(`"PENDING PAYMENTS"`);
        csvRows.push(`"Guest Name","Phone","Room","Amount (INR)"`);
        reportsData?.pendingPayments.forEach(p => {
          csvRows.push(`"${p.guest}","${p.phone}","Room ${p.room}","${p.amount}"`);
        });
        csvRows.push(``);

        csvRows.push(`"REPEAT CUSTOMERS"`);
        csvRows.push(`"Guest Name","Phone","Visits"`);
        reportsData?.repeatCustomers.forEach(c => {
          csvRows.push(`"${c.name}","${c.phone}","${c.visits}"`);
        });
        csvRows.push(``);

        csvRows.push(`"MOST USED ROOMS"`);
        csvRows.push(`"Room Number","Usage Count"`);
        reportsData?.mostUsedRooms.forEach(r => {
          csvRows.push(`"Room ${r.room}","${r.usageCount}"`);
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const element = document.createElement("a");
        const safePeriodLabel = getPeriodLabel().replace(/[^a-zA-Z0-9]/g, '_');
        element.href = URL.createObjectURL(blob);
        element.download = `${(currentHotel?.hotel_name || 'Hotel').replace(/\s+/g, '_')}_Report_${safePeriodLabel}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
      } else {
        document.body.classList.add('printing-report');
        window.print();
        setTimeout(() => {
          document.body.classList.remove('printing-report');
        }, 500);
      }
    }, 1000);
  };

  if (loading || !reportsData) {
    return (
      <DashboardLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
            <span className="text-sm font-medium text-slate-500">Generating analytics metrics...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Find max revenue for scaling chart bars safely
  const maxRevenue = reportsData.dailyRevenue.length > 0 
    ? Math.max(...reportsData.dailyRevenue.map(r => r.amount), 1) 
    : 1;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <FilePieChart className="w-5 h-5 text-primary" />
              Reports & Business Intelligence
            </h1>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Understand revenue cycles, guest loyalty patterns, and occupancy stats.</p>
          </div>

          <div className="flex gap-2 self-end sm:self-auto">
            <button
              onClick={() => handleExport('Excel')}
              disabled={!!exporting}
              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-1.5 shadow-sm"
            >
              <Download className="w-4 h-4 text-slate-500" />
              {exporting === 'Excel' ? 'Generating...' : 'Export Excel'}
            </button>
            
            <button
              onClick={() => handleExport('PDF')}
              disabled={!!exporting}
              className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-4 h-4 text-white" />
              {exporting === 'PDF' ? 'Generating...' : 'Export PDF'}
            </button>
          </div>
        </div>

        {/* Filter Controls Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Report Period:</span>
            <div className="flex flex-wrap gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
              {[
                { label: 'All Time', value: 'all' },
                { label: 'This Month', value: 'this_month' },
                { label: 'Last Month', value: 'last_month' },
                { label: 'Last 30 Days', value: 'last_30_days' },
                { label: 'Custom Range', value: 'custom' },
              ].map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => setFilterType(preset.value)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all duration-200 ${
                    filterType === preset.value
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {filterType === 'custom' && (
            <div className="flex flex-wrap items-center gap-3 animate-fade-in self-start lg:self-auto">
              <div className="flex items-center gap-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">From</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">To</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 border-b border-slate-200 pb-px">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all duration-200 ${
              activeTab === 'analytics'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            Business Analytics
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all duration-200 ${
              activeTab === 'ledger'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            Guest Folio Ledger & Audit Trail
          </button>
        </div>

        {activeTab === 'analytics' ? (
          /* Visual Charts Row */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Daily Revenue Bar Chart (Custom SVG) */}
            <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  Daily Revenue Collected ({getPeriodLabel()})
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Tracks cash inflows from checks and advance bookings.</p>
              </div>

              <div className="relative pt-6">
                {/* SVG Bar Chart */}
                <div className="flex justify-between items-end h-48 w-full gap-4 px-2">
                  {reportsData.dailyRevenue.length === 0 ? (
                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 italic py-10">
                      No daily revenue records found for this period.
                    </div>
                  ) : (
                    reportsData.dailyRevenue.map((d, index) => {
                      const percentHeight = (d.amount / maxRevenue) * 100;
                      return (
                        <div key={index} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                          <div className="relative w-full flex justify-center">
                            {/* Tooltip */}
                            <span className="absolute top-[-30px] bg-slate-800 text-[10px] text-white py-1 px-1.5 rounded font-black shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                              ₹{d.amount.toLocaleString()}
                            </span>
                            
                            {/* Bar */}
                            <div 
                              className="w-8 sm:w-12 rounded-t bg-blue-500 group-hover:bg-blue-600 shadow-md shadow-blue-100 transition-all duration-300"
                              style={{ height: `${Math.max(10, percentHeight * 1.2)}px` }}
                            ></div>
                          </div>
                          <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase truncate max-w-[50px]">
                            {d.date}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Occupancy Rate Speedometer Meter (Custom SVG) */}
            <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <DoorClosed className="w-4 h-4 text-blue-600" />
                  Live Room Occupancy Rate
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Real-time percentage of currently occupied rooms.</p>
              </div>

              <div className="flex flex-col items-center justify-center py-4">
                {/* SVG Semi-Circle gauge */}
                <svg className="w-40 h-24" viewBox="0 0 100 60">
                  {/* Background Arc */}
                  <path 
                    d="M 10 50 A 40 40 0 0 1 90 50" 
                    fill="none" 
                    stroke="#F1F5F9" 
                    strokeWidth="10" 
                    strokeLinecap="round" 
                  />
                  {/* Gauge Arc */}
                  <path 
                    d="M 10 50 A 40 40 0 0 1 90 50" 
                    fill="none" 
                    stroke={reportsData.occupancyRate > 70 ? '#EF4444' : reportsData.occupancyRate > 35 ? '#3B82F6' : '#10B981'} 
                    strokeWidth="10" 
                    strokeLinecap="round" 
                    strokeDasharray="125.6"
                    strokeDashoffset={125.6 - (reportsData.occupancyRate / 100) * 125.6}
                    className="transition-all duration-1000 ease-out"
                  />
                  {/* Text */}
                  <text x="50" y="48" textAnchor="middle" className="text-[14px] font-black fill-slate-800">{reportsData.occupancyRate}%</text>
                  <text x="50" y="58" textAnchor="middle" className="text-[5px] font-bold fill-slate-400 uppercase tracking-widest">Occupied</text>
                </svg>
              </div>

              <div className="text-center pt-2 border-t border-slate-100">
                <span className="text-[10px] text-slate-400 font-semibold">Total active stays monitored in PMS system.</span>
              </div>
            </div>

            {/* Loyalty/Repeat Customers and Room occupancy frequency details */}
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Repeat Customers */}
              <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-violet-600" />
                    Repeat & Loyal Customers
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Identifies customers with more than 1 stay check-in.</p>
                </div>
                {reportsData.repeatCustomers.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400 italic">No repeat guests registered yet.</div>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {reportsData.repeatCustomers.map((c, index) => (
                      <div key={index} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">{c.name}</h4>
                          <span className="text-[9px] text-slate-400 font-medium mt-0.5 block">{c.phone}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-violet-50 border border-violet-100 text-violet-700 text-[10px] font-semibold">
                          {c.visits} Visits
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pending Balance Settlements */}
              <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <History className="w-4 h-4 text-amber-600" />
                    Pending Collections
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Active rooms check-ins with remaining outstanding bills.</p>
                </div>
                {reportsData.pendingPayments.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400 italic">No pending collections for active stays.</div>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {reportsData.pendingPayments.map((p, index) => (
                      <div key={index} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">{p.guest}</h4>
                          <span className="text-[9px] text-slate-400 font-medium mt-0.5 block">Room {p.room} • {p.phone}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-red-50 border border-red-100 text-red-700 text-[10px] font-bold">
                          ₹{p.amount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Room Utilisation stats */}
              <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Most Utilised Rooms
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Most frequented room configurations based on stays.</p>
                </div>
                {reportsData.mostUsedRooms.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400 italic">No room utilization data yet.</div>
                ) : (
                  <div className="space-y-3 pr-1">
                    {reportsData.mostUsedRooms.slice(0, 5).map((r, index) => (
                      <div key={index} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">Room {r.room}</h4>
                          <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider block">Standard layout</span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-semibold">
                          {r.usageCount} Bookings
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Ledger Layout */
          <div className="space-y-6 animate-fade-in">
            {/* Ledger KPI Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Room Rent Revenue</span>
                  <span className="text-xl font-extrabold text-slate-800 mt-1 block">
                    ₹{Number(ledgerReportsData?.roomRevenue || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <DoorClosed className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Restaurant POS</span>
                  <span className="text-xl font-extrabold text-slate-800 mt-1 block">
                    ₹{Number(ledgerReportsData?.restaurantRevenue || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Other Services (Laundry/Spa)</span>
                  <span className="text-xl font-extrabold text-slate-800 mt-1 block">
                    ₹{Number((ledgerReportsData?.laundryRevenue || 0) + (ledgerReportsData?.extraServicesRevenue || 0)).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Collected Cash Flow</span>
                  <span className="text-xl font-extrabold text-green-700 mt-1 block">
                    ₹{Number(ledgerReportsData?.cashFlow || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Taxes Collected</span>
                  <span className="text-base font-bold text-slate-800 mt-1 block">
                    ₹{Number(ledgerReportsData?.taxes || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Discounts Issued</span>
                  <span className="text-base font-bold text-red-600 mt-1 block">
                    ₹{Number(ledgerReportsData?.discounts || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Refunds Paid</span>
                  <span className="text-base font-bold text-slate-800 mt-1 block">
                    ₹{Number(ledgerReportsData?.refunds || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Outstanding Ledger Balance</span>
                  <span className="text-base font-bold text-red-600 mt-1 block">
                    ₹{Number(ledgerReportsData?.outstandingBills || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Category breakdown list & Audit log trail */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Category list */}
              <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-slate-500" />
                    Ledger Category Summary
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Summary of charges and collections grouped by category.</p>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {ledgerReportsData?.categoryBreakdown && ledgerReportsData.categoryBreakdown.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400 italic">No category data for this period.</div>
                  ) : (
                    ledgerReportsData?.categoryBreakdown?.map((cat: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">{cat.category}</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400 font-medium">Charges (Debits): <strong className="text-slate-700 font-bold">₹{cat.total_debits}</strong></span>
                          <span className="text-slate-400 font-medium">Payments (Credits): <strong className="text-slate-700 font-bold">₹{cat.total_credits}</strong></span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Chronological Audit Log Trail table */}
              <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <History className="w-4 h-4 text-slate-500" />
                    Chronological Ledger Audit Log
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Chronological trail of all posted hotel transactions.</p>
                </div>
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-bold text-[10px] uppercase">
                        <th className="pb-2">Date/Time</th>
                        <th className="pb-2">Guest/Room</th>
                        <th className="pb-2">Description</th>
                        <th className="pb-2 text-right">Debit (+)</th>
                        <th className="pb-2 text-right">Credit (-)</th>
                        <th className="pb-2">User</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                      {ledgerReportsData?.recentTransactions && ledgerReportsData.recentTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-400 italic">No ledger audits found.</td>
                        </tr>
                      ) : (
                        ledgerReportsData?.recentTransactions?.map((tx: any) => (
                          <tr key={tx.id} className={tx.status === 'Void' ? 'line-through text-slate-400 bg-slate-50/20' : ''}>
                            <td className="py-3 text-[10px] whitespace-nowrap">
                              {new Date(tx.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                              <div className="text-[9px] text-slate-400 font-medium mt-0.5">
                                {new Date(tx.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </td>
                            <td className="py-3">
                              <div className="font-bold text-slate-700">{tx.guest_name || 'N/A'}</div>
                              <div className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Room {tx.room_number || 'N/A'}</div>
                            </td>
                            <td className="py-3">
                              <div className="font-semibold text-slate-700">{tx.description}</div>
                              <span className="bg-slate-100 text-slate-505 text-[9px] font-bold px-1 py-0.25 rounded uppercase tracking-wide mt-0.5 inline-block">{tx.category}</span>
                            </td>
                            <td className="py-3 text-right text-red-650 font-bold">
                              {tx.debit > 0 ? `₹${tx.debit.toLocaleString('en-IN')}` : '-'}
                            </td>
                            <td className="py-3 text-right text-green-650 font-bold">
                              {tx.credit > 0 ? `₹${tx.credit.toLocaleString('en-IN')}` : '-'}
                            </td>
                            <td className="py-3 text-[10px] font-bold text-slate-500 whitespace-nowrap">{tx.created_by}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Print Report Container (Hidden from screen, visible during print via global.css) */}
      <div id="print-report" className="hidden">
        <div style={{ borderBottom: '2px solid #2563EB', paddingBottom: '15px', marginBottom: '20px' }}>
          <table style={{ width: '100%' }}>
            <tbody>
              <tr>
                <td>
                  <h1 style={{ margin: '0', fontSize: '24px', color: '#111827', fontWeight: 'bold' }}>
                    {currentHotel?.hotel_name || 'StayDesk Hotel'}
                  </h1>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#6B7280' }}>
                    Business Intelligence & Performance Report
                  </p>
                </td>
                <td style={{ textAlign: 'right', fontSize: '11px', color: '#4B5563' }}>
                  <p style={{ margin: '0' }}><strong>Period:</strong> {getPeriodLabel()}</p>
                  <p style={{ margin: '2px 0 0 0' }}><strong>Generated On:</strong> {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  <p style={{ margin: '2px 0 0 0' }}><strong>System:</strong> StayDesk PMS Platform</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Executive Summary */}
        <div style={{ marginBottom: '25px', backgroundColor: '#F8FAFC', padding: '15px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
          <h2 style={{ margin: '0 0 10px 0', fontSize: '14px', textTransform: 'uppercase', color: '#2563EB', borderBottom: '1px solid #E5E7EB', paddingBottom: '5px' }}>Executive Summary</h2>
          <table style={{ width: '100%', fontSize: '12px' }}>
            <tbody>
              <tr>
                <td><strong>Occupancy Rate:</strong> {reportsData.occupancyRate}%</td>
                <td>
                  <strong>Period Revenue:</strong> ₹
                  {reportsData.dailyRevenue.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString('en-IN')}
                </td>
                <td>
                  <strong>Monthly Revenue:</strong> ₹
                  {reportsData.monthlyRevenue.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString('en-IN')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Revenue Tables */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '12px', textTransform: 'uppercase', color: '#2563EB', borderBottom: '1px solid #E5E7EB', paddingBottom: '3px' }}>Daily Revenue (Last 7 Days)</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', textAlign: 'left' }}>
                  <th style={{ padding: '6px', border: '1px solid #E5E7EB' }}>Date</th>
                  <th style={{ padding: '6px', border: '1px solid #E5E7EB', textAlign: 'right' }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {reportsData.dailyRevenue.map((r, i) => (
                  <tr key={i}>
                    <td style={{ padding: '6px', border: '1px solid #E5E7EB' }}>{r.date}</td>
                    <td style={{ padding: '6px', border: '1px solid #E5E7EB', textAlign: 'right' }}>₹{r.amount.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '12px', textTransform: 'uppercase', color: '#2563EB', borderBottom: '1px solid #E5E7EB', paddingBottom: '3px' }}>Monthly Revenue</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', textAlign: 'left' }}>
                  <th style={{ padding: '6px', border: '1px solid #E5E7EB' }}>Month</th>
                  <th style={{ padding: '6px', border: '1px solid #E5E7EB', textAlign: 'right' }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {reportsData.monthlyRevenue.map((r, i) => (
                  <tr key={i}>
                    <td style={{ padding: '6px', border: '1px solid #E5E7EB' }}>{r.month}</td>
                    <td style={{ padding: '6px', border: '1px solid #E5E7EB', textAlign: 'right' }}>₹{r.amount.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Payments & Repeat Customers */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '12px', textTransform: 'uppercase', color: '#2563EB', borderBottom: '1px solid #E5E7EB', paddingBottom: '3px' }}>Pending Payments</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', textAlign: 'left' }}>
                  <th style={{ padding: '6px', border: '1px solid #E5E7EB' }}>Guest</th>
                  <th style={{ padding: '6px', border: '1px solid #E5E7EB' }}>Room</th>
                  <th style={{ padding: '6px', border: '1px solid #E5E7EB', textAlign: 'right' }}>Pending</th>
                </tr>
              </thead>
              <tbody>
                {reportsData.pendingPayments.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ padding: '6px', border: '1px solid #E5E7EB', textAlign: 'center', color: '#888' }}>No pending collections.</td>
                  </tr>
                ) : (
                  reportsData.pendingPayments.map((p, i) => (
                    <tr key={i}>
                      <td style={{ padding: '6px', border: '1px solid #E5E7EB' }}>{p.guest}<br/><span style={{ fontSize: '9px', color: '#666' }}>{p.phone}</span></td>
                      <td style={{ padding: '6px', border: '1px solid #E5E7EB' }}>Room {p.room}</td>
                      <td style={{ padding: '6px', border: '1px solid #E5E7EB', textAlign: 'right', color: '#DC2626', fontWeight: 'bold' }}>₹{p.amount.toLocaleString('en-IN')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '12px', textTransform: 'uppercase', color: '#2563EB', borderBottom: '1px solid #E5E7EB', paddingBottom: '3px' }}>Repeat & Loyal Customers</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', textAlign: 'left' }}>
                  <th style={{ padding: '6px', border: '1px solid #E5E7EB' }}>Guest</th>
                  <th style={{ padding: '6px', border: '1px solid #E5E7EB', textAlign: 'right' }}>Visits</th>
                </tr>
              </thead>
              <tbody>
                {reportsData.repeatCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={2} style={{ padding: '6px', border: '1px solid #E5E7EB', textAlign: 'center', color: '#888' }}>No repeat guests registered yet.</td>
                  </tr>
                ) : (
                  reportsData.repeatCustomers.map((c, i) => (
                    <tr key={i}>
                      <td style={{ padding: '6px', border: '1px solid #E5E7EB' }}>{c.name}<br/><span style={{ fontSize: '9px', color: '#666' }}>{c.phone}</span></td>
                      <td style={{ padding: '6px', border: '1px solid #E5E7EB', textAlign: 'right', fontWeight: 'bold' }}>{c.visits} Visits</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Room Utilisation */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '12px', textTransform: 'uppercase', color: '#2563EB', borderBottom: '1px solid #E5E7EB', paddingBottom: '3px' }}>Most Utilised Rooms</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', textAlign: 'left' }}>
                <th style={{ padding: '6px', border: '1px solid #E5E7EB' }}>Room Number</th>
                <th style={{ padding: '6px', border: '1px solid #E5E7EB', textAlign: 'right' }}>Bookings Count</th>
              </tr>
            </thead>
            <tbody>
              {reportsData.mostUsedRooms.length === 0 ? (
                <tr>
                  <td colSpan={2} style={{ padding: '6px', border: '1px solid #E5E7EB', textAlign: 'center', color: '#888' }}>No bookings registered yet.</td>
                </tr>
              ) : (
                reportsData.mostUsedRooms.map((r, i) => (
                  <tr key={i}>
                    <td style={{ padding: '6px', border: '1px solid #E5E7EB' }}>Room {r.room}</td>
                    <td style={{ padding: '6px', border: '1px solid #E5E7EB', textAlign: 'right' }}>{r.usageCount} Bookings</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '50px', borderTop: '1px solid #E5E7EB', paddingTop: '10px', textAlign: 'center', fontSize: '10px', color: '#8B95A5' }}>
          <p style={{ margin: '0' }}>StayDesk CRM System &copy; {new Date().getFullYear()}. All Rights Reserved.</p>
          <p style={{ margin: '2px 0 0 0' }}>Confidential Report for Internal Hotel Operations Only.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
