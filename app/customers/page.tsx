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
  FileSpreadsheet,
  Pencil
} from 'lucide-react';

export default function CustomersPage() {
  const [currentHotel, setCurrentHotel] = useState<any>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [guestStats, setGuestStats] = useState<Record<string, { stayCount: number; lastVisit: string | null; pendingBalance: number; docs: CustomerDocument[] }>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showAddForm, setShowAddForm] = useState(false);
  const [viewGuest, setViewGuest] = useState<{ customer: Customer; stats: any } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [customerHistory, setCustomerHistory] = useState<any[]>([]);
  const [customerStays, setCustomerStays] = useState<any[]>([]);

  const fetchGuestDetails = async (customerId: string) => {
    if (!currentHotel) return;
    try {
      const [historyList, staysList] = await Promise.all([
        db.getCustomerHistory(currentHotel.id, customerId),
        db.getCustomerStays(currentHotel.id, customerId)
      ]);
      setCustomerHistory(historyList);
      setCustomerStays(staysList);
    } catch (err) {
      console.error(err);
    }
  };

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

  const handleUpdateCustomerSubmit = async (customerData: any, docData: any) => {
    if (!currentHotel || !viewGuest) return;
    try {
      await db.updateCustomer(
        currentHotel.id,
        viewGuest.customer.id,
        customerData,
        docData
      );
      setIsEditing(false);
      setViewGuest(null);
      loadCustomers(currentHotel.id);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to update guest details');
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
            className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
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
            className="block w-full rounded-xl border border-[#E2E8F0]/80 bg-white py-3.5 pl-10 pr-3 text-sm font-medium placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
          />
        </div>

        {/* Add Customer Modal Drawer */}
        {showAddForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl border border-slate-200/80 overflow-hidden my-8">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
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
            <div className="bg-white rounded-xl w-full max-w-xl shadow-2xl border border-slate-200/80 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-sm font-bold text-slate-800">
                  {isEditing ? 'Edit Guest Profile' : 'Guest Dossier'}
                </h3>
                <div className="flex items-center gap-2">
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-2 rounded-xl text-primary bg-blue-50 border border-blue-100 hover:bg-blue-100 hover:text-primary-hover transition-colors flex items-center justify-center"
                      title="Edit Guest Details"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => setViewGuest(null)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {isEditing ? (
                <div className="p-6 max-h-[75vh] overflow-y-auto">
                  <CustomerForm
                    initialData={viewGuest.customer}
                    initialDoc={viewGuest.stats?.docs?.[0] ? {
                      type: viewGuest.stats.docs[0].document_type,
                      number: viewGuest.stats.docs[0].document_number,
                      front: viewGuest.stats.docs[0].front_image,
                      back: viewGuest.stats.docs[0].back_image
                    } : undefined}
                    onSubmit={handleUpdateCustomerSubmit}
                    onCancel={() => setIsEditing(false)}
                  />
                </div>
              ) : (
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
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl border border-slate-100 text-center">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Stay Count</span>
                      <span className="text-sm font-black text-slate-800 mt-1 flex items-center justify-center gap-1">
                        <History className="w-4 h-4 text-emerald-500" />
                        {viewGuest.stats?.stayCount || 0} Visits
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

                  {/* Stay & Payment History */}
                  <div className="space-y-3 border-t border-slate-100 pt-4">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Stay & Payment History</span>
                    {customerStays && customerStays.length > 0 ? (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {customerStays.map(stay => (
                          <div key={stay.id} className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-2.5 hover:border-slate-200 transition-colors">
                            <div className="flex justify-between items-center">
                              <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-primary" />
                                Room {stay.room_number} ({stay.room_type})
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                stay.status === 'Active' 
                                  ? 'bg-[#0F4C45]/5 text-[#0F4C45] border-[#0F4C45]/20' 
                                  : 'bg-slate-50 text-slate-600 border-slate-250'
                              }`}>
                                {stay.status}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-[10px] text-slate-400 font-bold border-b border-slate-100/50 pb-2">
                              <div>
                                <span className="block font-medium">CHECK-IN</span>
                                <span className="text-slate-600 mt-0.5 block">
                                  {new Date(stay.check_in).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                              </div>
                              <div>
                                <span className="block font-medium">CHECKOUT</span>
                                <span className="text-slate-600 mt-0.5 block">
                                  {new Date(stay.expected_checkout).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                              <span className="flex items-center gap-1">
                                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                                Paid via <strong className="text-slate-800 uppercase">{stay.payment_method}</strong>
                              </span>
                              <div className="text-right">
                                <span className="block text-[9px] text-slate-400 font-bold uppercase">Total Charges</span>
                                <span className="text-primary font-extrabold text-xs">₹{stay.room_price}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-center text-xs text-slate-400 font-bold">
                        No previous stay records found for this guest.
                      </div>
                    )}
                  </div>

                  {/* Change History & Audit Trail */}
                  <div className="space-y-2 border-t border-slate-100 pt-4">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Change History & Audit Trail</span>
                    {customerHistory && customerHistory.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {customerHistory.map(h => (
                          <div key={h.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-1.5">
                            <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold">
                              <span>Field: <span className="text-slate-700 capitalize">{h.field_name.replace('_', ' ')}</span></span>
                              <span>{new Date(h.changed_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 font-semibold">
                              <div className="text-red-500/80 line-through truncate" title={h.old_value || 'None'}>
                                Old: {h.old_value || 'None'}
                              </div>
                              <div className="text-emerald-700 truncate" title={h.new_value || 'None'}>
                                New: {h.new_value || 'None'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-50/50 border border-slate-50 rounded-xl text-center text-[10px] font-bold text-slate-400">
                        No profile changes logged.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Customers Table */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
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
                  <tr className="bg-slate-50/50 border-b border-slate-200/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-4">Guest Name</th>
                    <th className="px-6 py-4">Phone Number</th>
                    <th className="px-6 py-4">Gender</th>
                    <th className="px-6 py-4">Total Visits</th>
                    <th className="px-6 py-4">Last Visit</th>
                    <th className="px-6 py-4">Pending Dues</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {filteredCustomers.map((cust) => {
                    const stats = guestStats[cust.id];
                    return (
                      <tr 
                        key={cust.id} 
                        onClick={() => {
                          setIsEditing(false);
                          setViewGuest({ customer: cust, stats });
                          fetchGuestDetails(cust.id);
                        }}
                        className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-4 font-semibold text-slate-900">{cust.full_name}</td>
                        <td className="px-6 py-4 text-slate-650">{cust.phone}</td>
                        <td className="px-6 py-4 text-slate-650">{cust.gender}</td>
                        <td className="px-6 py-4 text-slate-800">
                          <span className="inline-flex items-center gap-1">
                            <History className="w-3.5 h-3.5 text-slate-400" />
                            {stats?.stayCount || 0} stays
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600 font-semibold">
                          {stats?.lastVisit 
                            ? new Date(stats.lastVisit).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                            : 'Never'}
                        </td>
                        <td className="px-6 py-4">
                          {stats && stats.pendingBalance > 0 ? (
                            <span className="text-red-650 font-semibold">₹{stats.pendingBalance.toLocaleString('en-IN')}</span>
                          ) : (
                            <span className="text-emerald-600 font-semibold">₹0</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setIsEditing(false);
                              setViewGuest({ customer: cust, stats });
                              fetchGuestDetails(cust.id);
                            }}
                            className="p-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setIsEditing(true);
                              setViewGuest({ customer: cust, stats });
                              fetchGuestDetails(cust.id);
                            }}
                            className="p-2 bg-blue-50 border border-blue-100 hover:bg-blue-100 rounded-lg text-primary transition-colors"
                            title="Edit Profile"
                          >
                            <Pencil className="w-4 h-4" />
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
