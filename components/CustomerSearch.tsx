'use client';

// ========================================================
// StayDesk CRM / HotelFlow CRM Customer Search / Returning Guest Lookup
// Location: components/CustomerSearch.tsx
// ========================================================

import React, { useState } from 'react';
import { Search, Sparkles, CheckCircle2, History, RotateCcw, AlertTriangle } from 'lucide-react';
import { db } from '../lib/supabase/client';
import { Customer } from '../types';

interface CustomerSearchProps {
  hotelId: string;
  onSelectCustomer: (customer: Customer, isReturning: boolean) => void;
  onClear?: () => void;
}

export default function CustomerSearch({ hotelId, onSelectCustomer, onClear }: CustomerSearchProps) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [historyResult, setHistoryResult] = useState<{
    customer: Customer;
    stayCount: number;
    lastVisit: string | null;
    preferredRoom: string | null;
    pendingBalance: number;
  } | null>(null);
  const [noResultFound, setNoResultFound] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    setHistoryResult(null);
    setNoResultFound(false);

    try {
      // First look for exact match on Phone or Aadhaar
      const match = await db.getCustomerByPhoneOrAadhar(hotelId, query);
      
      if (match) {
        setHistoryResult({
          customer: match.customer,
          stayCount: match.stayCount,
          lastVisit: match.lastVisit,
          preferredRoom: match.preferredRoom,
          pendingBalance: match.pendingBalance
        });
      } else {
        // If not exact phone/aadhaar, check list of customers by name
        const nameMatches = await db.searchCustomers(hotelId, query);
        if (nameMatches.length > 0) {
          // Take first match details
          const detailMatch = await db.getCustomerByPhoneOrAadhar(hotelId, nameMatches[0].phone);
          if (detailMatch) {
            setHistoryResult({
              customer: detailMatch.customer,
              stayCount: detailMatch.stayCount,
              lastVisit: detailMatch.lastVisit,
              preferredRoom: detailMatch.preferredRoom,
              pendingBalance: detailMatch.pendingBalance
            });
          } else {
            setNoResultFound(true);
          }
        } else {
          setNoResultFound(true);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setHistoryResult(null);
    setNoResultFound(false);
    if (onClear) onClear();
  };

  return (
    <div className="space-y-4">
      {/* Search Input Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search returning guest (Phone, Aadhaar, Name)..."
            className="block w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-10 pr-3 text-sm font-medium placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
          />
        </div>
        <button
          type="submit"
          disabled={searching}
          className="bg-slate-800 text-white font-bold text-sm px-6 rounded-xl hover:bg-slate-700 transition-colors shadow-sm disabled:opacity-50"
        >
          {searching ? 'Searching...' : 'Search'}
        </button>
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 font-bold text-sm"
          >
            Clear
          </button>
        )}
      </form>

      {/* Returning Guest Match Display */}
      {historyResult && (
        <div className="p-5 rounded-[22px] bg-emerald-50/20 border border-emerald-100 shadow-md space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-50">
            <div className="flex items-center gap-2">
              <div className="bg-emerald-500 text-white p-1 rounded-full">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-black text-emerald-600 uppercase tracking-widest block">Returning Guest found</span>
                <h4 className="font-extrabold text-slate-800 text-lg leading-tight">{historyResult.customer.full_name}</h4>
              </div>
            </div>
            
            <button
              onClick={() => onSelectCustomer(historyResult.customer, true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-md shadow-emerald-100 transition-all duration-200 flex items-center gap-1.5 self-start sm:self-center"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Check In Again (20 sec)
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 rounded-xl bg-white border border-emerald-100/50 text-center">
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Stay Count</span>
              <span className="text-base font-black text-slate-800 mt-1 flex items-center justify-center gap-1">
                <History className="w-4 h-4 text-emerald-500" />
                {historyResult.stayCount} Visits
              </span>
            </div>
            
            <div className="p-3 rounded-xl bg-white border border-emerald-100/50 text-center">
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Preferred Room</span>
              <span className="text-base font-black text-slate-800 mt-1 flex items-center justify-center gap-1">
                <Sparkles className="w-4 h-4 text-amber-500" />
                {historyResult.preferredRoom ? `Room ${historyResult.preferredRoom}` : 'None'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white border border-emerald-100/50 text-center">
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Last Visit</span>
              <span className="text-xs font-bold text-slate-700 mt-1.5 block">
                {historyResult.lastVisit 
                  ? new Date(historyResult.lastVisit).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                  : 'N/A'}
              </span>
            </div>

            <div className={`p-3 rounded-xl bg-white border text-center ${historyResult.pendingBalance > 0 ? 'bg-red-50/10 border-red-100' : 'border-emerald-100/50'}`}>
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Pending Balance</span>
              <span className={`text-base font-black mt-1 block ${historyResult.pendingBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                ₹{historyResult.pendingBalance}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* No Result Fallback */}
      {noResultFound && (
        <div className="p-4 rounded-xl bg-amber-50/30 border border-amber-100 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <h4 className="font-bold text-amber-800 text-sm">Guest not found</h4>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              We couldn't find any guest with details matching "{query}". You can create a new guest below.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
