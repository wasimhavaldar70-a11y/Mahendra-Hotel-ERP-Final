'use client';

// ========================================================
// StayDesk CRM / HotelFlow CRM Check-In Wizard Screen
// Location: app/check-in/page.tsx
// ========================================================

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '../../components/DashboardLayout';
import CustomerSearch from '../../components/CustomerSearch';
import CustomerForm from '../../components/CustomerForm';
import { db, getSessionUser } from '../../lib/supabase/client';
import { Room, Customer } from '../../types';
import { 
  ClipboardSignature, 
  BedDouble, 
  Users, 
  DollarSign, 
  Check, 
  UserPlus, 
  Trash2,
  CalendarCheck
} from 'lucide-react';

function CheckInFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryRoomId = searchParams.get('room_id');

  const [currentHotel, setCurrentHotel] = useState<any>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  // Flow State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [isReturning, setIsReturning] = useState(false);

  // New customer registration state (to hold form data temporarily)
  const [tempCustomerData, setTempCustomerData] = useState<any>(null);
  const [tempDocData, setTempDocData] = useState<any>(null);

  // Additional Guests State
  const [guests, setGuests] = useState<{
    full_name: string;
    relationship: 'Self' | 'Friend' | 'Family' | 'Wife' | 'Husband' | 'GF' | 'BF' | 'Child';
    document_verified: boolean;
    aadhar_number: string;
    phone: string;
    gender: 'Male' | 'Female' | 'Other';
  }[]>([
    { full_name: '', relationship: 'Self', document_verified: true, aadhar_number: '', phone: '', gender: 'Male' } // Primary guest
  ]);

  // Booking & Room Details
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [expectedCheckout, setExpectedCheckout] = useState('');
  const [advancePaid, setAdvancePaid] = useState(0);
  const [customRoomPrice, setCustomRoomPrice] = useState<number | string>('');

  useEffect(() => {
    const session = getSessionUser();
    if (session && session.hotel) {
      setCurrentHotel(session.hotel);
      loadRooms(session.hotel.id);
    }
  }, []);

  const loadRooms = async (hotelId: string) => {
    try {
      const roomsList = await db.getRooms(hotelId);
      const readyRooms = roomsList.filter(r => r.status === 'Ready');
      setRooms(readyRooms);

      // Preselect room from query param if valid
      if (queryRoomId) {
        const found = readyRooms.some(r => r.id === queryRoomId);
        if (found) {
          setSelectedRoomId(queryRoomId);
          const roomObj = readyRooms.find(r => r.id === queryRoomId);
          if (roomObj) setCustomRoomPrice(Number(roomObj.price));
        }
      }

      // Default expected checkout date = tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setExpectedCheckout(tomorrow.toISOString().substring(0, 10));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCustomer = (customer: Customer, returning: boolean) => {
    setSelectedCustomer(customer);
    setIsReturning(returning);
    setShowNewCustomerForm(false);
    
    // Update first guest name in members list
    setGuests(prev => {
      const updated = [...prev];
      updated[0].full_name = customer.full_name;
      return updated;
    });
  };

  const handleCreateCustomerSubmit = (customerData: any, docData: any) => {
    setTempCustomerData(customerData);
    setTempDocData(docData);
    
    // Simulate selection of this new customer
    const mockCustomer: Customer = {
      id: 'temp-new-id',
      hotel_id: currentHotel.id,
      full_name: customerData.full_name,
      phone: customerData.phone,
      gender: customerData.gender,
      address: customerData.address,
      city: customerData.city,
      state: customerData.state,
      country: customerData.country,
      created_at: new Date().toISOString()
    };
    
    setSelectedCustomer(mockCustomer);
    setIsReturning(false);
    setShowNewCustomerForm(false);

    // Update first guest name in members list
    setGuests(prev => {
      const updated = [...prev];
      updated[0].full_name = customerData.full_name;
      return updated;
    });
  };

  const handleRoomChange = (roomId: string) => {
    setSelectedRoomId(roomId);
    const room = rooms.find(r => r.id === roomId);
    if (room) {
      setCustomRoomPrice(Number(room.price));
    }
  };

  const addGuestRow = () => {
    setGuests([...guests, { full_name: '', relationship: 'Friend', document_verified: false, aadhar_number: '', phone: '', gender: 'Male' }]);
  };

  const removeGuestRow = (index: number) => {
    if (index === 0) return; // Cannot remove primary guest
    setGuests(guests.filter((_, idx) => idx !== index));
  };

  const handleGuestFieldChange = (index: number, field: string, value: any) => {
    const updated = [...guests];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setGuests(updated);
  };

  const handleCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomId || !selectedCustomer || !expectedCheckout) return;

    setLoading(true);

    try {
      let finalCustomer = selectedCustomer;

      // If it's a new customer, save to the mock database first
      if (selectedCustomer.id === 'temp-new-id' && tempCustomerData) {
        finalCustomer = await db.addCustomer(
          currentHotel.id,
          tempCustomerData,
          tempDocData?.type,
          tempDocData?.number,
          tempDocData?.front,
          tempDocData?.back
        );
      }

      // Resolve room details
      const room = rooms.find(r => r.id === selectedRoomId);
      const roomPrice = Number(customRoomPrice || room?.price || 0);
      const pendingVal = Math.max(0, roomPrice - advancePaid);

      // Create primary guest account and add extra guests
      const parsedGuestsList = await Promise.all(
        guests.map(async (g, index) => {
          if (index === 0) {
            // Primary guest
            return {
              customer_id: finalCustomer.id,
              relationship: 'Self' as const,
              document_verified: true
            };
          } else {
            // Additional guests
            // Suffix-based phone number linkage if blank
            const resolvedPhone = g.phone && g.phone.trim() !== ''
              ? g.phone.trim()
              : `${finalCustomer.phone}-${index + 1}`;

            const childCustomer = await db.addCustomer(
              currentHotel.id,
              {
                full_name: g.full_name,
                phone: resolvedPhone,
                gender: g.gender || 'Male',
                country: 'India'
              },
              g.aadhar_number ? 'Aadhar' : undefined,
              g.aadhar_number || undefined
            );
            return {
              customer_id: childCustomer.id,
              relationship: g.relationship,
              document_verified: g.document_verified
            };
          }
        })
      );

      // Execute check-in
      await db.checkIn(
        currentHotel.id,
        {
          room_id: selectedRoomId,
          primary_customer_id: finalCustomer.id,
          expected_checkout: new Date(expectedCheckout + 'T12:00:00').toISOString(),
          number_of_guests: guests.length
        },
        {
          room_price: roomPrice,
          advance: advancePaid,
          pending: pendingVal,
          payment_method: 'UPI'
        },
        parsedGuestsList
      );

      // Redirect to Dashboard
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const selectedRoom = rooms.find(r => r.id === selectedRoomId);
  const roomPrice = Number(customRoomPrice || selectedRoom?.price || 0);
  const pendingAmount = Math.max(0, roomPrice - advancePaid);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <ClipboardSignature className="w-5 h-5 text-primary" />
          Front Desk Check-In
        </h1>
        <p className="text-xs text-slate-400 font-semibold mt-0.5">Quickly check in solo travelers, couples, or families in a few clicks.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Step 1: Customer Lookup & Reg */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lookup Panel */}
          <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-1.5 border-b border-slate-50 pb-2">
              <Users className="w-4 h-4 text-primary" />
              1. Search Guest Database
            </h2>

            <CustomerSearch 
              hotelId={currentHotel?.id} 
              onSelectCustomer={handleSelectCustomer}
              onClear={() => {
                setSelectedCustomer(null);
                setTempCustomerData(null);
              }}
            />

            {!selectedCustomer && !showNewCustomerForm && (
              <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <p className="text-xs text-slate-500 font-semibold mb-3">Or register a new guest directly</p>
                <button
                  type="button"
                  onClick={() => setShowNewCustomerForm(true)}
                  className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-red-200 transition-colors inline-flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Register New Guest
                </button>
              </div>
            )}
          </div>

          {/* New Customer Form Drawer */}
          {showNewCustomerForm && (
            <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-700 border-b border-slate-50 pb-2">
                Register New Guest Profile
              </h2>
              <CustomerForm 
                onSubmit={handleCreateCustomerSubmit} 
                onCancel={() => setShowNewCustomerForm(false)} 
              />
            </div>
          )}

          {/* Selected Customer Info Card */}
          {selectedCustomer && (
            <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600 bg-emerald-50 rounded-full p-0.5" />
                  Primary Guest Selected
                </h2>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="text-xs font-bold text-red-600 hover:text-red-700"
                >
                  Change Guest
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">{selectedCustomer.full_name}</h3>
                  <span className="text-xs text-slate-400 font-semibold block mt-0.5">{selectedCustomer.phone}</span>
                </div>
                {isReturning && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase tracking-widest border border-emerald-200">
                    Stayed Before
                  </span>
                )}
              </div>

              {/* Step 2: Add Members / Family Guest List */}
              <div className="pt-4 border-t border-slate-50 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Group/Family Details</h3>
                  <button
                    type="button"
                    onClick={addGuestRow}
                    className="text-xs font-bold text-primary hover:text-primary-hover flex items-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Add Member
                  </button>
                </div>

                <div className="space-y-4">
                  {guests.map((g, idx) => {
                    if (idx === 0) {
                      return (
                        <div key={idx} className="flex gap-2.5 items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs font-bold text-slate-600">
                          <span className="flex-1">Primary Guest: {g.full_name || selectedCustomer?.full_name}</span>
                          <span className="text-slate-400 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">Relationship: Self</span>
                          <span className="text-emerald-600 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5 bg-emerald-50 rounded-full p-0.5 text-emerald-600 animate-pulse" />
                            Verified
                          </span>
                        </div>
                      );
                    }
                    return (
                      <div key={idx} className="bg-slate-50/50 p-4 rounded-[20px] border border-slate-100 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-500">Additional Guest #{idx} Details</span>
                          <button
                            type="button"
                            onClick={() => removeGuestRow(idx)}
                            className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Remove
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Full Name *</label>
                            <input
                              type="text"
                              required
                              value={g.full_name}
                              onChange={(e) => handleGuestFieldChange(idx, 'full_name', e.target.value)}
                              className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                              placeholder="Guest Name"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Relationship *</label>
                            <select
                              value={g.relationship}
                              onChange={(e) => handleGuestFieldChange(idx, 'relationship', e.target.value)}
                              className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                            >
                              <option value="Friend">Friend</option>
                              <option value="Wife">Wife</option>
                              <option value="Husband">Husband</option>
                              <option value="GF">Girlfriend</option>
                              <option value="BF">Boyfriend</option>
                              <option value="Family">Family Member</option>
                              <option value="Child">Child</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Aadhaar Card Number *</label>
                            <input
                              type="text"
                              required
                              value={g.aadhar_number || ''}
                              onChange={(e) => handleGuestFieldChange(idx, 'aadhar_number', e.target.value)}
                              className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                              placeholder="12-digit Aadhaar Number"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Gender *</label>
                              <select
                                value={g.gender || 'Male'}
                                onChange={(e) => handleGuestFieldChange(idx, 'gender', e.target.value)}
                                className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                              >
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Phone (Optional)</label>
                              <input
                                type="tel"
                                value={g.phone || ''}
                                onChange={(e) => handleGuestFieldChange(idx, 'phone', e.target.value)}
                                className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                                placeholder="Phone number"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 pt-1">
                          <input
                            type="checkbox"
                            id={`verify-${idx}`}
                            checked={g.document_verified}
                            onChange={(e) => handleGuestFieldChange(idx, 'document_verified', e.target.checked)}
                            className="w-4 h-4 rounded text-primary focus:ring-primary border-slate-300"
                          />
                          <label htmlFor={`verify-${idx}`} className="text-[10px] font-bold text-slate-500 uppercase cursor-pointer select-none">Aadhaar Card Verified</label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Room & Billing Checklist (Right Sidebar panel) */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm space-y-5">
            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-1.5 border-b border-slate-50 pb-2">
              <BedDouble className="w-4 h-4 text-primary" />
              2. Room Assignment & Bill
            </h2>

            {/* Room selection dropdown */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Available Rooms *</label>
              <select
                required
                value={selectedRoomId}
                onChange={(e) => handleRoomChange(e.target.value)}
                className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none"
              >
                <option value="">-- Choose Room --</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    Room {room.room_number} - {room.room_type} (₹{room.price})
                  </option>
                ))}
              </select>
            </div>

            {/* Expected checkout */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Expected Checkout Date *</label>
              <input
                type="date"
                required
                value={expectedCheckout}
                onChange={(e) => setExpectedCheckout(e.target.value)}
                className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none"
              />
            </div>

            {/* Price Adjustment */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Room Rent (Adjust if needed)</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="text-xs font-bold text-slate-400">₹</span>
                </div>
                <input
                  type="number"
                  value={customRoomPrice}
                  onChange={(e) => setCustomRoomPrice(e.target.value)}
                  className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-slate-200 rounded-xl p-3 pl-7 focus:bg-white focus:outline-none"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Advance payment */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Advance Paid (₹)</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="text-xs font-bold text-slate-400">₹</span>
                </div>
                <input
                  type="number"
                  value={advancePaid === 0 ? '' : advancePaid}
                  onChange={(e) => setAdvancePaid(Number(e.target.value))}
                  className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-slate-200 rounded-xl p-3 pl-7 focus:bg-white focus:outline-none"
                  placeholder="Enter advance amount"
                />
              </div>
            </div>

            {/* Receipt Summary */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-2">
              <div className="flex justify-between font-bold text-slate-500">
                <span>Room Charges:</span>
                <span>₹{roomPrice}</span>
              </div>
              <div className="flex justify-between font-bold text-emerald-600">
                <span>Advance Paid:</span>
                <span>- ₹{advancePaid}</span>
              </div>
              <div className="h-[1px] bg-slate-200 my-1"></div>
              <div className="flex justify-between font-extrabold text-slate-800 text-sm">
                <span>Pending Balance:</span>
                <span className={pendingAmount > 0 ? 'text-red-600' : 'text-slate-800'}>₹{pendingAmount}</span>
              </div>
            </div>

            {/* Action button */}
            <button
              onClick={handleCheckInSubmit}
              disabled={loading || !selectedRoomId || !selectedCustomer}
              className="flex items-center justify-center gap-1.5 w-full bg-primary hover:bg-primary-hover text-white font-bold py-3.5 rounded-xl shadow-lg shadow-red-200 disabled:opacity-50 transition-all duration-200"
            >
              <CalendarCheck className="w-5 h-5" />
              Complete Guest Check-In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckInPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div>Loading Page...</div>}>
        <CheckInFormContent />
      </Suspense>
    </DashboardLayout>
  );
}
