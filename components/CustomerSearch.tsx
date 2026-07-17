'use client';

// ========================================================
// StayDesk CRM / HotelFlow CRM Customer Search / Returning Guest Lookup
// Location: components/CustomerSearch.tsx
// ========================================================

import React, { useState } from 'react';
import { Search, Sparkles, CheckCircle2, History, RotateCcw, AlertTriangle } from 'lucide-react';
import { db } from '../lib/supabase/client';
import { Customer, CustomerDocument } from '../types';

interface CustomerSearchProps {
  hotelId: string;
  onSelectCustomer: (customer: Customer, isReturning: boolean) => void;
  onClear?: () => void;
}

export default function CustomerSearch({ hotelId, onSelectCustomer, onClear }: CustomerSearchProps) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{
    customer: Customer;
    docs: CustomerDocument[];
    stayCount: number;
    lastVisit: string | null;
    pendingBalance: number;
  }>>([]);
  const [noResultFound, setNoResultFound] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    setSearchResults([]);
    setNoResultFound(false);

    try {
      const matches = await db.searchCustomers(hotelId, query);
      if (matches.length > 0) {
        setSearchResults(matches);
      } else {
        setNoResultFound(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setSearchResults([]);
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
            placeholder="Search returning guest (Phone, Name, Email, Doc, Vehicle)..."
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
        {(query || searchResults.length > 0) && (
          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 font-bold text-sm"
          >
            Clear
          </button>
        )}
      </form>

      {/* Returning Guests Matches List */}
      {searchResults.length > 0 && (
        <div className="space-y-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Matches Found ({searchResults.length})</span>
          {searchResults.map((res) => {
            const primaryDoc = res.docs.find(d => d.is_primary) || res.docs[0];
            const maskedNum = primaryDoc 
              ? `${primaryDoc.document_type} (XXXX-${primaryDoc.document_number.slice(-4)})` 
              : 'No Document';
            return (
              <div key={res.customer.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/40 flex items-center justify-between hover:bg-slate-50 transition-all">
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm">{res.customer.full_name}</h4>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    Phone: {res.customer.phone} | Doc: {maskedNum} | Address: {res.customer.city || 'N/A'}, {res.customer.country || 'India'}
                  </p>
                  <p className="text-[9px] text-emerald-600 font-bold mt-1 uppercase tracking-widest">
                    {res.stayCount} Visits • Last stayed: {res.lastVisit ? new Date(res.lastVisit).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Never'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectCustomer(res.customer, true)}
                  className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all"
                >
                  Verify & Select
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* No Result Fallback */}
      {noResultFound && (
        <div className="p-4 rounded-xl bg-amber-50/30 border border-amber-100 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <h4 className="font-bold text-amber-800 text-sm">Guest not found</h4>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              We couldn't find any guest with details matching "{query}". You can create a new guest profile below.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
