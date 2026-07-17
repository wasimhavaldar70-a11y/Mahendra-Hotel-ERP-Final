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

  const loadReports = async (hotelId: string) => {
    try {
      const data = await db.getReports(hotelId);
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
      loadReports(session.hotel.id);
    }
  }, []);

  const handleExport = (type: 'Excel' | 'PDF') => {
    setExporting(type);
    setTimeout(() => {
      setExporting(null);
      // Simulate file download
      const element = document.createElement("a");
      const file = new Blob(["StayDesk Report Dump"], {type: 'text/plain'});
      element.href = URL.createObjectURL(file);
      element.download = `HotelFlow_Report_${type === 'Excel' ? 'Export.csv' : 'Export.pdf'}`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
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

  // Find max revenue for scaling chart bars
  const maxRevenue = Math.max(...reportsData.dailyRevenue.map(r => r.amount), 1);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <FilePieChart className="w-5 h-5 text-primary" />
              Reports & Business Intelligence
            </h1>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Understand revenue cycles, guest loyalty patterns, and occupancy stats.</p>
          </div>

          <div className="flex gap-2">
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

        {/* Visual Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Daily Revenue Bar Chart (Custom SVG) */}
          <div className="lg:col-span-2 bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Daily Revenue Collected (Last 7 Days)
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Tracks cash inflows from checks and advance bookings.</p>
            </div>

            <div className="relative pt-6">
              {/* SVG Bar Chart */}
              <div className="flex justify-between items-end h-48 w-full gap-4 px-2">
                {reportsData.dailyRevenue.map((d, index) => {
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
                })}
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
    </DashboardLayout>
  );
}
