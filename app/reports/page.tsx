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
  CalendarDays
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
      const data = await db.getReports(hotelId, start, end);
      setReportsData(data);
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
        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Report Period:</span>
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
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${
                    filterType === preset.value
                      ? 'bg-[#0F4C45] text-white shadow-sm'
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

        {/* Visual Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Daily Revenue Bar Chart (Custom SVG) */}
          <div className="lg:col-span-2 bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm space-y-4">
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
                            className="w-8 sm:w-12 rounded-t-lg bg-emerald-500 group-hover:bg-emerald-600 shadow-lg shadow-emerald-100 transition-all duration-300"
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
          <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <DoorClosed className="w-4 h-4 text-primary" />
                Current Occupancy Rate
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Proportion of occupied rooms to total vacant rooms.</p>
            </div>

            <div className="flex justify-center items-center py-4 relative">
              <svg className="w-36 h-36 transform -rotate-90">
                {/* Background Ring */}
                <circle 
                  cx="72" cy="72" r="58" 
                  stroke="#E2E8F0" strokeWidth="12" fill="transparent" 
                />
                {/* Foreground Progress Ring */}
                <circle 
                  cx="72" cy="72" r="58" 
                  stroke="#C62828" strokeWidth="12" fill="transparent" 
                  strokeDasharray={2 * Math.PI * 58}
                  strokeDashoffset={2 * Math.PI * 58 * (1 - reportsData.occupancyRate / 100)}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-black text-slate-800">{reportsData.occupancyRate}%</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Occupied</span>
              </div>
            </div>

            <div className="text-center text-[11px] font-bold text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              Good occupancy rates are above 65%.
            </div>
          </div>
        </div>

        {/* Detailed reports columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Repeat Customers */}
          <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-50 pb-2">
              <History className="w-4.5 h-4.5 text-emerald-600" />
              Repeat Customers
            </h3>
            
            {reportsData.repeatCustomers.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">No repeat guests registered yet.</p>
            ) : (
              <div className="space-y-3">
                {reportsData.repeatCustomers.map((c, index) => (
                  <div key={index} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{c.name}</h4>
                      <span className="text-[10px] text-slate-400 font-semibold block">{c.phone}</span>
                    </div>
                    <span className="px-2 py-1 rounded bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-black">
                      {c.visits} Visits
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Column 2: Outstanding Balances */}
          <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-50 pb-2">
              <Users className="w-4.5 h-4.5 text-red-600" />
              Pending Payments
            </h3>
            
            {reportsData.pendingPayments.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">No pending collections. Excellent!</p>
            ) : (
              <div className="space-y-3">
                {reportsData.pendingPayments.map((p, index) => (
                  <div key={index} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{p.guest} (Room {p.room})</h4>
                      <span className="text-[10px] text-slate-400 font-semibold block">{p.phone}</span>
                    </div>
                    <span className="text-red-600 text-xs font-extrabold">
                      ₹{p.amount}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Column 3: Room Occupancy count */}
          <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-50 pb-2">
              <CalendarDays className="w-4.5 h-4.5 text-blue-600" />
              Most Used Rooms
            </h3>
            
            {reportsData.mostUsedRooms.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">No bookings registered yet.</p>
            ) : (
              <div className="space-y-3">
                {reportsData.mostUsedRooms.slice(0, 5).map((r, index) => (
                  <div key={index} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Room {r.room}</h4>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Standard layout</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-bold">
                      {r.usageCount} Bookings
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Print Report Container (Hidden from screen, visible during print via global.css) */}
      <div id="print-report" className="hidden">
        <div style={{ borderBottom: '2px solid #0B2C24', paddingBottom: '15px', marginBottom: '20px' }}>
          <table style={{ width: '100%' }}>
            <tbody>
              <tr>
                <td>
                  <h1 style={{ margin: '0', fontSize: '24px', color: '#0B2C24', fontWeight: 'bold' }}>
                    {currentHotel?.hotel_name || 'StayDesk Hotel'}
                  </h1>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#666' }}>
                    Business Intelligence & Performance Report
                  </p>
                </td>
                <td style={{ textAlign: 'right', fontSize: '11px', color: '#444' }}>
                  <p style={{ margin: '0' }}><strong>Period:</strong> {getPeriodLabel()}</p>
                  <p style={{ margin: '2px 0 0 0' }}><strong>Generated On:</strong> {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  <p style={{ margin: '2px 0 0 0' }}><strong>System:</strong> StayDesk PMS Platform</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Executive Summary */}
        <div style={{ marginBottom: '25px', backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '8px', border: '1px solid #eee' }}>
          <h2 style={{ margin: '0 0 10px 0', fontSize: '14px', textTransform: 'uppercase', color: '#0B2C24', borderBottom: '1px solid #ddd', paddingBottom: '5px' }}>Executive Summary</h2>
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
            <h3 style={{ margin: '0 0 8px 0', fontSize: '12px', textTransform: 'uppercase', color: '#0B2C24', borderBottom: '1px solid #eee', paddingBottom: '3px' }}>Daily Revenue (Last 7 Days)</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f0f0f0', textAlign: 'left' }}>
                  <th style={{ padding: '6px', border: '1px solid #ddd' }}>Date</th>
                  <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {reportsData.dailyRevenue.map((r, i) => (
                  <tr key={i}>
                    <td style={{ padding: '6px', border: '1px solid #ddd' }}>{r.date}</td>
                    <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>₹{r.amount.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '12px', textTransform: 'uppercase', color: '#0B2C24', borderBottom: '1px solid #eee', paddingBottom: '3px' }}>Monthly Revenue</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f0f0f0', textAlign: 'left' }}>
                  <th style={{ padding: '6px', border: '1px solid #ddd' }}>Month</th>
                  <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {reportsData.monthlyRevenue.map((r, i) => (
                  <tr key={i}>
                    <td style={{ padding: '6px', border: '1px solid #ddd' }}>{r.month}</td>
                    <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>₹{r.amount.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Payments & Repeat Customers */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '12px', textTransform: 'uppercase', color: '#0B2C24', borderBottom: '1px solid #eee', paddingBottom: '3px' }}>Pending Payments</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f0f0f0', textAlign: 'left' }}>
                  <th style={{ padding: '6px', border: '1px solid #ddd' }}>Guest</th>
                  <th style={{ padding: '6px', border: '1px solid #ddd' }}>Room</th>
                  <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>Pending</th>
                </tr>
              </thead>
              <tbody>
                {reportsData.pendingPayments.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center', color: '#888' }}>No pending collections.</td>
                  </tr>
                ) : (
                  reportsData.pendingPayments.map((p, i) => (
                    <tr key={i}>
                      <td style={{ padding: '6px', border: '1px solid #ddd' }}>{p.guest}<br/><span style={{ fontSize: '9px', color: '#666' }}>{p.phone}</span></td>
                      <td style={{ padding: '6px', border: '1px solid #ddd' }}>Room {p.room}</td>
                      <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', color: '#c62828', fontWeight: 'bold' }}>₹{p.amount.toLocaleString('en-IN')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '12px', textTransform: 'uppercase', color: '#0B2C24', borderBottom: '1px solid #eee', paddingBottom: '3px' }}>Repeat & Loyal Customers</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f0f0f0', textAlign: 'left' }}>
                  <th style={{ padding: '6px', border: '1px solid #ddd' }}>Guest</th>
                  <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>Visits</th>
                </tr>
              </thead>
              <tbody>
                {reportsData.repeatCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={2} style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center', color: '#888' }}>No repeat guests registered yet.</td>
                  </tr>
                ) : (
                  reportsData.repeatCustomers.map((c, i) => (
                    <tr key={i}>
                      <td style={{ padding: '6px', border: '1px solid #ddd' }}>{c.name}<br/><span style={{ fontSize: '9px', color: '#666' }}>{c.phone}</span></td>
                      <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold' }}>{c.visits} Visits</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Room Utilisation */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '12px', textTransform: 'uppercase', color: '#0B2C24', borderBottom: '1px solid #eee', paddingBottom: '3px' }}>Most Utilised Rooms</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0', textAlign: 'left' }}>
                <th style={{ padding: '6px', border: '1px solid #ddd' }}>Room Number</th>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>Bookings Count</th>
              </tr>
            </thead>
            <tbody>
              {reportsData.mostUsedRooms.length === 0 ? (
                <tr>
                  <td colSpan={2} style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center', color: '#888' }}>No bookings registered yet.</td>
                </tr>
              ) : (
                reportsData.mostUsedRooms.map((r, i) => (
                  <tr key={i}>
                    <td style={{ padding: '6px', border: '1px solid #ddd' }}>Room {r.room}</td>
                    <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{r.usageCount} Bookings</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '50px', borderTop: '1px solid #ddd', paddingTop: '10px', textAlign: 'center', fontSize: '10px', color: '#888' }}>
          <p style={{ margin: '0' }}>StayDesk CRM System &copy; {new Date().getFullYear()}. All Rights Reserved.</p>
          <p style={{ margin: '2px 0 0 0' }}>Confidential Report for Internal Hotel Operations Only.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
