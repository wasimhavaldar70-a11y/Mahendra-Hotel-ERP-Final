'use client';

// ========================================================
// StayDesk CRM / HotelFlow CRM Customers Directory Page
// Location: app/customers/page.tsx
// ========================================================

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import CustomerForm from '../../components/CustomerForm';
import { db, getSessionUser } from '../../lib/supabase/client';
import { Customer, CustomerDocument } from '../../types';
import { 
  Users, 
  Search, 
  Plus, 
  Eye, 
  X, 
  Sparkles, 
  History, 
  CreditCard,
  Building2,
  Phone,
  MapPin,
  FileSpreadsheet
} from 'lucide-react';

export default function CustomersPage() {
  const [currentHotel, setCurrentHotel] = useState<any>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [guestStats, setGuestStats] = useState<Record<string, { stayCount: number; lastVisit: string | null; preferredRoom: string | null; pendingBalance: number; docs: CustomerDocument[] }>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showAddForm, setShowAddForm] = useState(false);
  const [viewGuest, setViewGuest] = useState<{ customer: Customer; stats: any } | null>(null);

  const loadCustomers = async (hotelId: string) => {
    try {
      const list = await db.getCustomers(hotelId);
      setCustomers(list);

      // Load stats for each guest
      const statsMap: typeof guestStats = {};
      await Promise.all(
        list.map(async (cust) => {
          const detail = await db.getCustomerByPhoneOrAadhar(hotelId, cust.phone);
          if (detail) {
            statsMap[cust.id] = {
              stayCount: detail.stayCount,
              lastVisit: detail.lastVisit,
              preferredRoom: detail.preferredRoom,
              pendingBalance: detail.pendingBalance,
              docs: detail.docs
            };
          }
        })
      );
      setGuestStats(statsMap);
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
      loadCustomers(session.hotel.id);
    }
  }, []);

  const handleCreateCustomerSubmit = async (customerData: any, docData: any) => {
    try {
      await db.addCustomer(
        currentHotel.id,
        customerData,
        docData?.type,
        docData?.number,
        docData?.front,
        docData?.back
      );
      setShowAddForm(false);
      loadCustomers(currentHotel.id);
    } catch (err) {
      console.error(err);
    }
  };

  // Filter list
  const filteredCustomers = customers.filter(c => 
    c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Guest Database
            </h1>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">View customer profiles, visit history, outstanding balances, and documents.</p>
          </div>

          <button
            onClick={() => setShowAddForm(true)}
            className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-red-200 transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Register New Guest
          </button>
        </div>

        {/* Search Panel */}
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search guests by name or phone number..."
            className="block w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-10 pr-3 text-sm font-medium placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
          />
        </div>

        {/* Add Customer Modal Drawer */}
        {showAddForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-[24px] w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden my-8">
              <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-sm font-bold text-slate-800">Register New Customer Profile</h3>
                <button onClick={() => setShowAddForm(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 max-h-[80vh] overflow-y-auto">
                <CustomerForm 
                  onSubmit={handleCreateCustomerSubmit} 
                  onCancel={() => setShowAddForm(false)} 
                />
              </div>
            </div>
          </div>
        )}

        {/* View Customer Details Modal */}
        {viewGuest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-[24px] w-full max-w-xl shadow-2xl border border-slate-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-sm font-bold text-slate-800">Guest Dossier</h3>
                <button onClick={() => setViewGuest(null)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                {/* Profile Card */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-12 h-12 bg-primary/5 rounded-xl flex items-center justify-center font-bold text-primary text-lg">
                    {viewGuest.customer.full_name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-800">{viewGuest.customer.full_name}</h4>
                    <span className="text-xs text-slate-400 font-semibold mt-0.5 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" />
                      {viewGuest.customer.phone}
                    </span>
                  </div>
                </div>

                {/* Stays & Room Pref Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl border border-slate-100 text-center">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Stay Count</span>
                    <span className="text-sm font-black text-slate-800 mt-1 flex items-center justify-center gap-1">
                      <History className="w-4 h-4 text-emerald-500" />
                      {viewGuest.stats?.stayCount || 0} Visits
                    </span>
                  </div>
                  
                  <div className="p-3 rounded-xl border border-slate-100 text-center">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Room Preferred</span>
                    <span className="text-sm font-black text-slate-800 mt-1 flex items-center justify-center gap-1">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      {viewGuest.stats?.preferredRoom ? `Room ${viewGuest.stats.preferredRoom}` : 'N/A'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-100 text-center">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Outstanding</span>
                    <span className={`text-sm font-black mt-1 block ${viewGuest.stats?.pendingBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      ₹{viewGuest.stats?.pendingBalance || 0}
                    </span>
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Permanent Address</span>
                  <div className="flex gap-2 items-start text-xs font-semibold text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <span>
                      {viewGuest.customer.address || 'Address details not configured.'}
                      {(viewGuest.customer.city || viewGuest.customer.state) && (
                        <span className="block mt-1 text-slate-400 text-[10px]">
                          {[viewGuest.customer.city, viewGuest.customer.state, viewGuest.customer.country].filter(Boolean).join(', ')}
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Verification Documents Vault */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Document Vault</span>
                  
                  {viewGuest.stats?.docs && viewGuest.stats.docs.length > 0 ? (
                    viewGuest.stats.docs.map((doc: CustomerDocument) => (
                      <div key={doc.id} className="p-4 rounded-xl border border-slate-100 space-y-3.5">
                        <div className="flex justify-between items-center text-xs font-bold">
                          <span className="text-slate-800">{doc.document_type}</span>
                          <span className="text-slate-400">No: {doc.document_number}</span>
                        </div>
                        
                        {/* ID Images */}
                        <div className="grid grid-cols-2 gap-3">
                          {doc.front_image ? (
                            <div className="rounded-lg overflow-hidden border border-slate-200 h-28 relative">
                              <img src={doc.front_image} alt="ID Front Preview" className="object-cover w-full h-full" />
                              <span className="absolute bottom-1 left-1 bg-black/60 text-[8px] text-white px-1.5 py-0.5 rounded font-bold">FRONT SIDE</span>
                            </div>
                          ) : (
                            <div className="rounded-lg bg-slate-50 border border-slate-100 h-28 flex flex-col items-center justify-center text-slate-400 text-[10px] font-bold">
                              <span>Front scan missing</span>
                            </div>
                          )}

                          {doc.back_image ? (
                            <div className="rounded-lg overflow-hidden border border-slate-200 h-28 relative">
                              <img src={doc.back_image} alt="ID Back Preview" className="object-cover w-full h-full" />
                              <span className="absolute bottom-1 left-1 bg-black/60 text-[8px] text-white px-1.5 py-0.5 rounded font-bold">BACK SIDE</span>
                            </div>
                          ) : (
                            <div className="rounded-lg bg-slate-50 border border-slate-100 h-28 flex flex-col items-center justify-center text-slate-400 text-[10px] font-bold">
                              <span>Back scan missing</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-center text-xs text-slate-400 font-bold">
                      No uploaded documents found for this guest.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Customers Table */}
        <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-20 text-slate-400 font-bold text-sm">
              No guests found in database matching "{searchQuery}"
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-4">Guest Name</th>
                    <th className="px-6 py-4">Phone Number</th>
                    <th className="px-6 py-4">Gender</th>
                    <th className="px-6 py-4">Total Visits</th>
                    <th className="px-6 py-4">Preferred Room</th>
                    <th className="px-6 py-4">Pending Dues</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
                  {filteredCustomers.map((cust) => {
                    const stats = guestStats[cust.id];
                    return (
                      <tr key={cust.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-extrabold text-slate-900">{cust.full_name}</td>
                        <td className="px-6 py-4 text-slate-500">{cust.phone}</td>
                        <td className="px-6 py-4">{cust.gender}</td>
                        <td className="px-6 py-4 text-slate-800">
                          <span className="inline-flex items-center gap-1">
                            <History className="w-3.5 h-3.5 text-slate-400" />
                            {stats?.stayCount || 0} stays
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-800">
                          {stats?.preferredRoom ? `Room ${stats.preferredRoom}` : 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          {stats?.pendingBalance > 0 ? (
                            <span className="text-red-600 font-extrabold">₹{stats.pendingBalance}</span>
                          ) : (
                            <span className="text-emerald-600 font-bold">₹0</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setViewGuest({ customer: cust, stats })}
                            className="bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold px-3 py-1.5 rounded-lg transition-colors text-[10px] inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View Dossier
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
