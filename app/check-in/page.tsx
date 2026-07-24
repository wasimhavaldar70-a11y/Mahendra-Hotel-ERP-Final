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
import LoadingButton from '../../components/ui/LoadingButton';
import { db, getSessionUser } from '../../lib/supabase/client';
import { Room, Customer, CustomerDocument } from '../../types';
import { 
  ClipboardSignature, 
  BedDouble, 
  Users, 
  DollarSign, 
  Check, 
  UserPlus, 
  Trash2,
  CalendarCheck,
  X,
  Search,
  Loader2
} from 'lucide-react';

const calculateStayDuration = (
  inDate: string,
  inTime: string,
  outDate: string,
  outTime: string
) => {
  if (!inDate || !outDate) return { nights: 0, days: 0 };
  
  const checkInDT = new Date(`${inDate}T${inTime || '00:00'}`);
  const checkOutDT = new Date(`${outDate}T${outTime || '00:00'}`);
  
  if (isNaN(checkInDT.getTime()) || isNaN(checkOutDT.getTime())) {
    return { nights: 0, days: 0 };
  }
  
  const diffMs = checkOutDT.getTime() - checkInDT.getTime();
  if (diffMs <= 0) return { nights: 0, days: 0 };
  
  const inDateObj = new Date(inDate);
  const outDateObj = new Date(outDate);
  inDateObj.setHours(0, 0, 0, 0);
  outDateObj.setHours(0, 0, 0, 0);
  const dateDiffMs = outDateObj.getTime() - inDateObj.getTime();
  const dateDiffNights = Math.round(dateDiffMs / (1000 * 60 * 60 * 24));
  
  // same-day is 1 night / day stay (hotel policy)
  const nights = dateDiffNights === 0 ? 1 : dateDiffNights;
  const days = dateDiffNights + 1;
  
  return { nights, days };
};

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

  const [isEditingSelectedCustomer, setIsEditingSelectedCustomer] = useState(false);
  const [selectedCustomerDocs, setSelectedCustomerDocs] = useState<CustomerDocument[]>([]);
  const [selectedCustomerStats, setSelectedCustomerStats] = useState<any>(null);
  const [activeGuestSearchIndex, setActiveGuestSearchIndex] = useState<number | null>(null);

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
    doc_type?: 'Aadhar' | 'Driving License' | 'Passport' | 'Voter ID';
    doc_number?: string;
    front_image?: string;
    back_image?: string;
    same_vehicle_as_primary?: boolean;
    vehicle_number?: string;
    same_address_as_primary?: boolean;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
  }[]>([
    { full_name: '', relationship: 'Self', document_verified: true, aadhar_number: '', phone: '', gender: 'Male' } // Primary guest
  ]);

  // Booking & Room Details
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('11:00');
  const [purposeOfStay, setPurposeOfStay] = useState('Tourism');
  const [arrivalFrom, setArrivalFrom] = useState('');
  const [proceedingTo, setProceedingTo] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [extraCharges, setExtraCharges] = useState<number | string>('');
  const [discount, setDiscount] = useState<number | string>('');
  const [applyTax, setApplyTax] = useState(false);
  const [advancePaid, setAdvancePaid] = useState(0);
  const [customRoomPrice, setCustomRoomPrice] = useState<number | string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

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
      const now = new Date();
      const localDate = now.toISOString().substring(0, 10);
      const localTime = now.toTimeString().substring(0, 5); // "HH:MM"
      
      setCheckInDate(localDate);
      setCheckInTime(localTime);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setCheckOutDate(tomorrow.toISOString().substring(0, 10));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCustomer = async (customer: Customer, returning: boolean) => {
    setSelectedCustomer(customer);
    setIsReturning(returning);
    setShowNewCustomerForm(false);
    setIsEditingSelectedCustomer(false);
    
    // Update first guest name in members list
    setGuests(prev => {
      const updated = [...prev];
      updated[0].full_name = customer.full_name;
      return updated;
    });

    if (customer.id !== 'temp-new-id') {
      try {
        const detail = await db.getCustomerByPhoneOrAadhar(currentHotel.id, customer.phone);
        if (detail) {
          setSelectedCustomerDocs(detail.docs);
          setSelectedCustomerStats({
            stayCount: detail.stayCount,
            lastVisit: detail.lastVisit,
            pendingBalance: detail.pendingBalance
          });
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      setSelectedCustomerDocs([]);
      setSelectedCustomerStats(null);
    }
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

  const handleUpdateSelectedCustomer = async (customerData: any, docData: any) => {
    if (!currentHotel || !selectedCustomer) return;
    try {
      const updated = await db.updateCustomer(
        currentHotel.id,
        selectedCustomer.id,
        customerData,
        docData
      );
      if (updated) {
        setSelectedCustomer(updated);
        setIsEditingSelectedCustomer(false);
        // Refresh details
        const detail = await db.getCustomerByPhoneOrAadhar(currentHotel.id, updated.phone);
        if (detail) {
          setSelectedCustomerDocs(detail.docs);
          setSelectedCustomerStats({
            stayCount: detail.stayCount,
            lastVisit: detail.lastVisit,
            pendingBalance: detail.pendingBalance
          });
        }
      }
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to update guest details');
    }
  };

  const handleSetPrimaryDoc = async (docId: string) => {
    if (!currentHotel || !selectedCustomer) return;
    try {
      const ok = await db.setPrimaryDocument(currentHotel.id, selectedCustomer.id, docId);
      if (ok) {
        // Refresh docs
        const detail = await db.getCustomerByPhoneOrAadhar(currentHotel.id, selectedCustomer.phone);
        if (detail) {
          setSelectedCustomerDocs(detail.docs);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRoomChange = (roomId: string) => {
    setSelectedRoomId(roomId);
    const room = rooms.find(r => r.id === roomId);
    if (room) {
      setCustomRoomPrice(Number(room.price));
    } else {
      setCustomRoomPrice('');
    }
  };

  const addGuestRow = () => {
    setGuests([
      ...guests,
      {
        full_name: '',
        relationship: 'Friend',
        document_verified: true,
        aadhar_number: '',
        phone: '',
        gender: 'Male',
        same_vehicle_as_primary: true,
        vehicle_number: '',
        same_address_as_primary: true,
        doc_type: 'Aadhar',
        doc_number: '',
        front_image: '',
        back_image: ''
      }
    ]);
  };

  const removeGuestRow = (index: number) => {
    if (index === 0) return; // Cannot remove primary guest
    setGuests(guests.filter((_, idx) => idx !== index));
  };

  const handleGuestFieldChange = (index: number, field: string, value: any) => {
    let cleanVal = value;
    if (field === 'full_name') {
      cleanVal = value.replace(/[^a-zA-Z\s]/g, '');
    } else if (field === 'phone') {
      cleanVal = value.replace(/\D/g, '').slice(0, 10);
    } else if (field === 'aadhar_number' || (field === 'doc_number' && guests[index].doc_type === 'Aadhar')) {
      const clean = value.replace(/\D/g, '').slice(0, 12);
      let formatted = '';
      for (let i = 0; i < clean.length; i++) {
        if (i > 0 && i % 4 === 0) {
          formatted += ' ';
        }
        formatted += clean[i];
      }
      cleanVal = formatted;
    }

    const updated = [...guests];
    updated[index] = {
      ...updated[index],
      [field]: cleanVal
    };

    // Keep aadhar_number and doc_number synced if doc_type is Aadhar
    if (field === 'aadhar_number') {
      updated[index].doc_number = cleanVal;
    } else if (field === 'doc_number' && updated[index].doc_type === 'Aadhar') {
      updated[index].aadhar_number = cleanVal;
    }

    setGuests(updated);

    if (errors.guests) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy.guests;
        return copy;
      });
    }
  };

  const handleCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};

    if (!selectedCustomer) {
      newErrors.selectedCustomer = 'Please select or create a guest profile first';
    } else {
      // Validate address proof exists
      if (selectedCustomer.id === 'temp-new-id') {
        if (!tempDocData || !tempDocData.number || !tempDocData.number.trim()) {
          newErrors.selectedCustomer = 'Address proof document is required for new guests';
        }
      } else {
        if (!selectedCustomerDocs || selectedCustomerDocs.length === 0) {
          newErrors.selectedCustomer = 'Missing address proof! Please click "Update Details" to upload a document for this guest.';
        }
      }
    }

    if (!selectedRoomId) {
      newErrors.selectedRoomId = 'Please select a room';
    }

    if (!checkInDate || !checkInTime) {
      newErrors.checkIn = 'Check-in date and time are required';
    }
    if (!checkOutDate || !checkOutTime) {
      newErrors.checkOut = 'Check-out date and time are required';
    }

    if (checkInDate && checkOutDate) {
      const checkInDT = new Date(`${checkInDate}T${checkInTime || '00:00'}`);
      const checkOutDT = new Date(`${checkOutDate}T${checkOutTime || '00:00'}`);
      
      if (checkOutDT.getTime() <= checkInDT.getTime()) {
        newErrors.checkOut = 'Check-out must be after check-in';
      }
    }

    const room = rooms.find(r => r.id === selectedRoomId);
    const roomPriceRateVal = Number(customRoomPrice !== '' ? customRoomPrice : (room?.price || 0));
    if (isNaN(roomPriceRateVal) || roomPriceRateVal < 0) {
      newErrors.customRoomPrice = 'Room price cannot be negative';
    }

    // Vehicle validation if entered
    if (vehicleNumber && vehicleNumber.trim() !== '') {
      const cleanVehicle = vehicleNumber.replace(/\s+/g, '');
      if (cleanVehicle.length < 8 || cleanVehicle.length > 13) {
        newErrors.vehicleNumber = 'Please enter a valid vehicle number (e.g. MH09AB1234, 8 to 13 characters)';
      }
    }

    const durationVal = calculateStayDuration(checkInDate, checkInTime, checkOutDate, checkOutTime);
    const totalNightsVal = durationVal.nights;
    const roomChargesVal = totalNightsVal * roomPriceRateVal;
    const subtotalVal = roomChargesVal + Number(extraCharges || 0);
    const discountAmountVal = Number(discount || 0);
    const taxAmountVal = applyTax ? Math.round((subtotalVal - discountAmountVal) * (12 / 100)) : 0;
    const grandTotalVal = Math.max(0, subtotalVal - discountAmountVal + taxAmountVal);

    const advPaidNum = Number(advancePaid);
    if (isNaN(advPaidNum) || advPaidNum < 0) {
      newErrors.advancePaid = 'Advance paid cannot be negative';
    } else if (advPaidNum > grandTotalVal) {
      newErrors.advancePaid = `Advance paid (₹${advPaidNum}) cannot exceed grand total (₹${grandTotalVal})`;
    }

    // Additional guests validation
    const guestErrors: string[] = [];
    guests.forEach((g, idx) => {
      if (idx > 0) {
        if (!g.full_name.trim()) {
          guestErrors.push(`Guest #${idx + 1}: Name is required`);
        } else if (!/^[a-zA-Z\s]+$/.test(g.full_name)) {
          guestErrors.push(`Guest #${idx + 1}: Name must only contain letters`);
        }
        if (g.phone && g.phone.replace(/\D/g, '').length !== 10) {
          guestErrors.push(`Guest #${idx + 1}: Phone must be exactly 10 digits`);
        }
        if (g.aadhar_number) {
          const cleanAadhar = g.aadhar_number.replace(/\s/g, '');
          if (cleanAadhar.length !== 12 || !/^\d{12}$/.test(cleanAadhar)) {
            guestErrors.push(`Guest #${idx + 1}: Aadhaar must be exactly 12 digits`);
          }
        }
      }
    });

    if (guestErrors.length > 0) {
      newErrors.guests = guestErrors.join(', ');
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      if (!selectedCustomer) return;
      let finalCustomer = selectedCustomer;

      // If it's a new customer, save to the database first
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
            const resolvedPhone = g.phone && g.phone.trim() !== ''
              ? g.phone.trim()
              : `${finalCustomer.phone}-${index + 1}`;

            const resolvedVehicle = g.same_vehicle_as_primary !== false
              ? (vehicleNumber || finalCustomer.vehicle_number || '')
              : (g.vehicle_number || '');

            const resolvedAddress = g.same_address_as_primary !== false ? (finalCustomer.address || '') : (g.address || '');
            const resolvedCity = g.same_address_as_primary !== false ? (finalCustomer.city || '') : (g.city || '');
            const resolvedState = g.same_address_as_primary !== false ? (finalCustomer.state || '') : (g.state || '');
            const resolvedCountry = g.same_address_as_primary !== false ? (finalCustomer.country || 'India') : (g.country || 'India');

            const docTypeVal = g.doc_type || (g.doc_number || g.aadhar_number ? 'Aadhar' : undefined);
            const docNumVal = g.doc_number || g.aadhar_number || undefined;

            const childCustomer = await db.addCustomer(
              currentHotel.id,
              {
                full_name: g.full_name,
                phone: resolvedPhone,
                gender: g.gender || 'Male',
                address: resolvedAddress,
                city: resolvedCity,
                state: resolvedState,
                country: resolvedCountry,
                vehicle_number: resolvedVehicle,
                nationality: 'Indian'
              },
              docTypeVal,
              docNumVal,
              g.front_image || undefined,
              g.back_image || undefined
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
          expected_checkout: new Date(`${checkOutDate}T${checkOutTime}:00`).toISOString(),
          number_of_guests: guests.length,
          purpose_of_stay: purposeOfStay,
          arrival_from: arrivalFrom,
          proceeding_to: proceedingTo,
          residential_address: finalCustomer.address,
          address_proof_type: tempDocData?.type || selectedCustomerDocs?.[0]?.document_type || 'Aadhar',
          document_number: tempDocData?.number || selectedCustomerDocs?.[0]?.document_number || '',
          vehicle_number: vehicleNumber || finalCustomer.vehicle_number || '',
          check_in_date: checkInDate,
          check_in_time: checkInTime + ':00',
          total_nights: totalNightsVal,
          room_rate: roomPriceRateVal,
          room_charges: roomChargesVal,
          subtotal: subtotalVal,
          discount: discountAmountVal,
          extra_charges: Number(extraCharges || 0),
          tax_amount: taxAmountVal,
          grand_total: grandTotalVal
        },
        {
          room_price: grandTotalVal,
          advance: advancePaid,
          pending: Math.max(0, grandTotalVal - advancePaid),
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
  const roomPriceRate = Number(customRoomPrice || selectedRoom?.price || 0);

  const duration = calculateStayDuration(checkInDate, checkInTime, checkOutDate, checkOutTime);
  const totalNights = duration.nights;
  const totalDays = duration.days;

  const roomCharges = totalNights * roomPriceRate;
  const subtotal = roomCharges + Number(extraCharges || 0);
  const discountAmount = Number(discount || 0);
  const taxRateVal = 12; // 12% Standard
  const taxAmount = applyTax ? Math.round((subtotal - discountAmount) * (taxRateVal / 100)) : 0;
  const grandTotal = Math.max(0, subtotal - discountAmount + taxAmount);
  const pendingAmount = Math.max(0, grandTotal - advancePaid);

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

            {errors.selectedCustomer && (
              <div className="p-3.5 bg-red-50 text-xs font-semibold text-red-600 rounded-xl border border-red-100 mb-2">
                {errors.selectedCustomer}
              </div>
            )}

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
              <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                <h2 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600 bg-emerald-50 rounded-full p-0.5" />
                  Primary Guest Verification & Details
                </h2>
                <div className="flex items-center gap-2">
                  {!isEditingSelectedCustomer && selectedCustomer.id !== 'temp-new-id' && (
                    <button
                      onClick={() => setIsEditingSelectedCustomer(true)}
                      className="text-[10px] font-bold text-primary hover:text-primary-hover bg-red-50 hover:bg-red-100/80 px-3 py-1.5 rounded-xl transition-all uppercase tracking-wider"
                    >
                      Update Details
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    className="text-xs font-bold text-red-600 hover:text-red-700"
                  >
                    Change Guest
                  </button>
                </div>
              </div>

              {isEditingSelectedCustomer ? (
                <div className="p-2 border border-slate-100 rounded-2xl bg-slate-50/20">
                  <CustomerForm
                    initialData={selectedCustomer}
                    initialDoc={selectedCustomerDocs?.[0] ? {
                      type: selectedCustomerDocs[0].document_type,
                      number: selectedCustomerDocs[0].document_number,
                      front: selectedCustomerDocs[0].front_image || '',
                      back: selectedCustomerDocs[0].back_image || ''
                    } : undefined}
                    onSubmit={handleUpdateSelectedCustomer}
                    onCancel={() => setIsEditingSelectedCustomer(false)}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Personal & Contact Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Full Name</span>
                      <span className="text-xs font-bold text-slate-800 mt-0.5 block">{selectedCustomer.full_name}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Phone</span>
                      <span className="text-xs font-bold text-slate-800 mt-0.5 block">{selectedCustomer.phone}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Email</span>
                      <span className="text-xs font-bold text-slate-800 mt-0.5 block">{selectedCustomer.email || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Nationality</span>
                      <span className="text-xs font-bold text-slate-800 mt-0.5 block">{selectedCustomer.nationality || 'Indian'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Vehicle Number</span>
                      <span className="text-xs font-bold text-slate-800 mt-0.5 block">{selectedCustomer.vehicle_number || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Emergency Contact</span>
                      <span className="text-xs font-bold text-slate-800 mt-0.5 block">{selectedCustomer.emergency_contact || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Stays Summary</span>
                      <span className="text-xs font-black text-emerald-600 mt-0.5 block">
                        {selectedCustomerStats ? `${selectedCustomerStats.stayCount} Stays` : '1st Stay'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Last Visit</span>
                      <span className="text-xs font-semibold text-slate-600 mt-0.5 block">
                        {selectedCustomerStats?.lastVisit ? new Date(selectedCustomerStats.lastVisit).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Address Details */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Permanent Address</span>
                    <div className="text-xs font-semibold text-slate-700 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                      {selectedCustomer.address || 'No address specified.'} 
                      {(selectedCustomer.city || selectedCustomer.state) && ` (${[selectedCustomer.city, selectedCustomer.state, selectedCustomer.country].filter(Boolean).join(', ')})`}
                    </div>
                  </div>

                  {/* Documents Vault */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Documents Vault</span>
                      {selectedCustomer.id !== 'temp-new-id' && (
                        <button
                          type="button"
                          onClick={() => setIsEditingSelectedCustomer(true)}
                          className="text-[9px] font-bold text-primary hover:underline uppercase"
                        >
                          + Upload Document
                        </button>
                      )}
                    </div>
                    
                    {selectedCustomerDocs && selectedCustomerDocs.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {selectedCustomerDocs.map(doc => (
                          <div key={doc.id} className={`p-3 rounded-xl border ${doc.is_primary ? 'bg-emerald-50/10 border-emerald-100' : 'bg-slate-50/20 border-slate-100'} flex items-center justify-between text-xs`}>
                            <div>
                              <span className="font-bold text-slate-800">{doc.document_type}</span>
                              <span className="text-slate-400 ml-1.5 font-bold">No: {doc.document_number}</span>
                              {doc.is_primary && (
                                <span className="ml-2 px-1.5 py-0.5 rounded text-[8px] bg-emerald-600 text-white font-extrabold uppercase tracking-wider">Primary</span>
                              )}
                            </div>
                            {!doc.is_primary && (
                              <button
                                type="button"
                                onClick={() => handleSetPrimaryDoc(doc.id)}
                                className="text-[9px] font-black text-primary hover:underline uppercase tracking-wider"
                              >
                                Make Primary
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center text-xs text-slate-400 font-bold">
                        No documents found.
                      </div>
                    )}
                  </div>
                </div>
              )}

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

                {errors.guests && (
                  <div className="p-3 bg-red-50 text-xs font-semibold text-red-600 rounded-xl border border-red-100">
                    {errors.guests}
                  </div>
                )}

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
                      <div key={idx} className="bg-slate-50/70 p-4 rounded-[20px] border border-slate-200/80 space-y-3.5">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                          <span className="text-xs font-bold text-slate-700">Secondary Guest #{idx} Information</span>
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
                            <div className="relative">
                              <input
                                type="text"
                                required
                                value={g.full_name}
                                onChange={(e) => handleGuestFieldChange(idx, 'full_name', e.target.value)}
                                className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl pl-2.5 pr-10 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                                placeholder="Guest Name"
                              />
                              {currentHotel && (
                                <button
                                  type="button"
                                  onClick={() => setActiveGuestSearchIndex(idx)}
                                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-primary transition-colors"
                                  title="Look Up Guest"
                                >
                                  <Search className="w-4 h-4" />
                                </button>
                              )}
                            </div>
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
                              <option value="Self">Self</option>
                            </select>
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

                          {/* ID Document Type & Number */}
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">ID Document *</label>
                              <select
                                value={g.doc_type || 'Aadhar'}
                                onChange={(e) => handleGuestFieldChange(idx, 'doc_type', e.target.value)}
                                className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5"
                              >
                                <option value="Aadhar">Aadhaar</option>
                                <option value="Driving License">Driving License</option>
                                <option value="Passport">Passport</option>
                                <option value="Voter ID">Voter ID</option>
                              </select>
                            </div>
                            <input
                              type="text"
                              value={g.doc_number || g.aadhar_number || ''}
                              onChange={(e) => handleGuestFieldChange(idx, 'doc_number', e.target.value)}
                              className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                              placeholder={g.doc_type === 'Aadhar' || !g.doc_type ? '12-digit Aadhaar Number' : 'Document ID Number'}
                            />
                          </div>
                        </div>

                        {/* Vehicle Number Checkbox Section */}
                        <div className="p-2.5 bg-white border border-slate-200/80 rounded-xl space-y-1.5">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none">
                            <input
                              type="checkbox"
                              checked={g.same_vehicle_as_primary !== false}
                              onChange={(e) => handleGuestFieldChange(idx, 'same_vehicle_as_primary', e.target.checked)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 accent-blue-600"
                            />
                            Vehicle Number - Same as primary guest
                          </label>
                          {g.same_vehicle_as_primary === false ? (
                            <input
                              type="text"
                              value={g.vehicle_number || ''}
                              onChange={(e) => handleGuestFieldChange(idx, 'vehicle_number', e.target.value.toUpperCase())}
                              placeholder="Enter Vehicle Number (e.g. MH09AB1234)"
                              className="w-full text-xs font-bold text-slate-700 uppercase bg-slate-50 border border-slate-200 rounded-lg p-2 focus:bg-white focus:outline-none"
                            />
                          ) : (
                            <p className="text-[10px] font-medium text-slate-400 pl-6">
                              Auto-linked vehicle: <span className="font-bold text-slate-600">{vehicleNumber || selectedCustomer?.vehicle_number || 'None specified'}</span>
                            </p>
                          )}
                        </div>

                        {/* Document Photo Uploads */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">ID Front Photo</label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  try {
                                    const { optimizeImage } = await import('../../lib/imageOptimizer');
                                    const { dataUrl } = await optimizeImage(file, 'document');
                                    handleGuestFieldChange(idx, 'front_image', dataUrl);
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }
                              }}
                              className="text-[10px] text-slate-500 w-full file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            {g.front_image && (
                              <div className="mt-1 h-10 w-16 rounded border overflow-hidden">
                                <img src={g.front_image} alt="ID Front" className="w-full h-full object-cover" />
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">ID Back Photo</label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  try {
                                    const { optimizeImage } = await import('../../lib/imageOptimizer');
                                    const { dataUrl } = await optimizeImage(file, 'document');
                                    handleGuestFieldChange(idx, 'back_image', dataUrl);
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }
                              }}
                              className="text-[10px] text-slate-500 w-full file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            {g.back_image && (
                              <div className="mt-1 h-10 w-16 rounded border overflow-hidden">
                                <img src={g.back_image} alt="ID Back" className="w-full h-full object-cover" />
                              </div>
                            )}
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
                          <label htmlFor={`verify-${idx}`} className="text-[10px] font-bold text-slate-500 uppercase cursor-pointer select-none">ID Document Verified</label>
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
          {/* CARD 1: ROOM ASSIGNMENT & DATES */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-1.5 border-b border-slate-150 pb-2">
              <BedDouble className="w-4 h-4 text-primary" />
              2. Room & Dates
            </h2>

            {/* Room selection dropdown */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Available Rooms *</label>
              <select
                required
                value={selectedRoomId}
                onChange={(e) => {
                  handleRoomChange(e.target.value);
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
                <option value="">-- Choose Room --</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    Room {room.room_number} - {room.room_type} (₹{room.price})
                  </option>
                ))}
              </select>
              {errors.selectedRoomId && (
                <span className="text-[10px] font-bold text-red-500 mt-1 block">{errors.selectedRoomId}</span>
              )}
            </div>

            {/* Check-in Date & Time Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Check-in Date *</label>
                <input
                  type="date"
                  required
                  value={checkInDate}
                  onChange={(e) => {
                    setCheckInDate(e.target.value);
                    if (errors.checkIn) {
                      setErrors(prev => {
                        const copy = { ...prev };
                        delete copy.checkIn;
                        return copy;
                      });
                    }
                  }}
                  className={`w-full text-xs font-bold text-slate-700 bg-slate-50/50 border rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary ${
                    errors.checkIn ? 'border-red-500 focus:ring-red-500' : 'border-slate-200'
                  }`}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Check-in Time *</label>
                <input
                  type="time"
                  required
                  value={checkInTime}
                  onChange={(e) => {
                    setCheckInTime(e.target.value);
                    if (errors.checkIn) {
                      setErrors(prev => {
                        const copy = { ...prev };
                        delete copy.checkIn;
                        return copy;
                      });
                    }
                  }}
                  className={`w-full text-xs font-bold text-slate-700 bg-slate-50/50 border rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary ${
                    errors.checkIn ? 'border-red-500 focus:ring-red-500' : 'border-slate-200'
                  }`}
                />
              </div>
            </div>
            {errors.checkIn && (
              <span className="text-[10px] font-bold text-red-500 mt-0.5 block">{errors.checkIn}</span>
            )}

            {/* Check-out Date & Time Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Check-out Date *</label>
                <input
                  type="date"
                  required
                  value={checkOutDate}
                  onChange={(e) => {
                    setCheckOutDate(e.target.value);
                    if (errors.checkOut) {
                      setErrors(prev => {
                        const copy = { ...prev };
                        delete copy.checkOut;
                        return copy;
                      });
                    }
                  }}
                  className={`w-full text-xs font-bold text-slate-700 bg-slate-50/50 border rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary ${
                    errors.checkOut ? 'border-red-500 focus:ring-red-500' : 'border-slate-200'
                  }`}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Check-out Time *</label>
                <input
                  type="time"
                  required
                  value={checkOutTime}
                  onChange={(e) => {
                    setCheckOutTime(e.target.value);
                    if (errors.checkOut) {
                      setErrors(prev => {
                        const copy = { ...prev };
                        delete copy.checkOut;
                        return copy;
                      });
                    }
                  }}
                  className={`w-full text-xs font-bold text-slate-700 bg-slate-50/50 border rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary ${
                    errors.checkOut ? 'border-red-500 focus:ring-red-500' : 'border-slate-200'
                  }`}
                />
              </div>
            </div>
            {errors.checkOut && (
              <span className="text-[10px] font-bold text-red-500 mt-0.5 block">{errors.checkOut}</span>
            )}

            {/* Stay Duration Display */}
            {totalNights > 0 && (
              <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-xs font-bold text-blue-700 flex justify-between items-center">
                <span>Calculated Duration:</span>
                <span>{totalNights} Night{totalNights > 1 ? 's' : ''} ({totalDays} Day{totalDays > 1 ? 's' : ''})</span>
              </div>
            )}
          </div>

          {/* CARD 2: STAY DETAILS */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-1.5 border-b border-slate-150 pb-2">
              <ClipboardSignature className="w-4 h-4 text-primary" />
              3. Stay Information
            </h2>

            {/* Purpose of Stay */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Purpose of Stay *</label>
              <select
                required
                value={purposeOfStay}
                onChange={(e) => setPurposeOfStay(e.target.value)}
                className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="Tourism">Tourism</option>
                <option value="Business">Business</option>
                <option value="Family Visit">Family Visit</option>
                <option value="Medical">Medical</option>
                <option value="Education">Education</option>
                <option value="Marriage">Marriage</option>
                <option value="Official Work">Official Work</option>
                <option value="Transit">Transit</option>
                <option value="Religious Visit">Religious Visit</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Arrival From */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Arrival From *</label>
              <input
                type="text"
                required
                value={arrivalFrom}
                onChange={(e) => setArrivalFrom(e.target.value)}
                className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="e.g. Pune, Kolhapur, Delhi"
              />
            </div>

            {/* Address to which proceeding */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Address to which proceeding *</label>
              <input
                type="text"
                required
                value={proceedingTo}
                onChange={(e) => setProceedingTo(e.target.value)}
                className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="e.g. Mumbai, Goa, Office Address"
              />
            </div>

            {/* Vehicle Number */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Vehicle Number (Optional)</label>
              <input
                type="text"
                value={vehicleNumber}
                onChange={(e) => {
                  setVehicleNumber(e.target.value.toUpperCase());
                  if (errors.vehicleNumber) {
                    setErrors(prev => {
                      const copy = { ...prev };
                      delete copy.vehicleNumber;
                      return copy;
                    });
                  }
                }}
                className={`w-full text-xs font-bold text-slate-700 bg-slate-50/50 border rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary ${
                  errors.vehicleNumber ? 'border-red-500 focus:ring-red-500' : 'border-slate-200'
                }`}
                placeholder="e.g. MH09AB1234"
              />
              {errors.vehicleNumber && (
                <span className="text-[10px] font-bold text-red-500 mt-1 block">{errors.vehicleNumber}</span>
              )}
            </div>
          </div>

          {/* CARD 3: BILLING & PAYMENT */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-1.5 border-b border-slate-150 pb-2">
              <DollarSign className="w-4 h-4 text-primary" />
              4. Billing & Payments
            </h2>

            {/* Nightly Price Rate */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nightly Rate (₹)</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="text-xs font-bold text-slate-400">₹</span>
                </div>
                <input
                  type="number"
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
                  className={`w-full text-xs font-bold text-slate-700 bg-slate-50/50 border rounded-xl p-3 pl-7 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary ${
                    errors.customRoomPrice ? 'border-red-500 focus:ring-red-500' : 'border-slate-200'
                  }`}
                  placeholder="0"
                />
              </div>
              {errors.customRoomPrice && (
                <span className="text-[10px] font-bold text-red-500 mt-1 block">{errors.customRoomPrice}</span>
              )}
            </div>

            {/* Extra Charges & Discount */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Extra Charges (₹)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={extraCharges}
                  onChange={(e) => setExtraCharges(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Discount (₹)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Tax Enable Toggle */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="apply-tax-toggle"
                checked={applyTax}
                onChange={(e) => setApplyTax(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary border-slate-300"
              />
              <label htmlFor="apply-tax-toggle" className="text-[10px] font-bold text-slate-500 uppercase cursor-pointer select-none">
                Apply GST Tax (12% SGST + CGST)
              </label>
            </div>

            {/* Itemized Billing Breakdown */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-2">
              <div className="flex justify-between text-slate-500 font-bold">
                <span>Room Charges ({totalNights} Night{totalNights > 1 ? 's' : ''} × ₹{roomPriceRate.toLocaleString('en-IN')}):</span>
                <span>₹{roomCharges.toLocaleString('en-IN')}</span>
              </div>
              {Number(extraCharges) > 0 && (
                <div className="flex justify-between text-slate-500 font-bold">
                  <span>Extra Charges:</span>
                  <span>+ ₹{Number(extraCharges).toLocaleString('en-IN')}</span>
                </div>
              )}
              {Number(discount) > 0 && (
                <div className="flex justify-between text-red-500 font-bold">
                  <span>Discount:</span>
                  <span>- ₹{Number(discount).toLocaleString('en-IN')}</span>
                </div>
              )}
              {taxAmount > 0 && (
                <div className="flex justify-between text-slate-500 font-bold">
                  <span>GST Tax (12%):</span>
                  <span>+ ₹{taxAmount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="h-[1px] bg-slate-200 my-1"></div>
              <div className="flex justify-between font-extrabold text-slate-800 text-sm">
                <span>Grand Total:</span>
                <span>₹{grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Advance payment */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Advance Paid (₹)</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="text-xs font-bold text-slate-400">₹</span>
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  value={advancePaid === 0 ? '' : advancePaid}
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
                  className={`w-full text-xs font-bold text-slate-700 bg-slate-50/50 border rounded-xl p-3 pl-7 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary ${
                    errors.advancePaid ? 'border-red-500 focus:ring-red-500' : 'border-slate-200'
                  }`}
                  placeholder="Enter advance amount"
                />
              </div>
              {errors.advancePaid && (
                <span className="text-[10px] font-bold text-red-500 mt-1 block">{errors.advancePaid}</span>
              )}
            </div>

            {/* Pending Balance Card */}
            <div className="p-3.5 bg-slate-100 rounded-xl border border-slate-200 text-xs flex justify-between items-center font-extrabold text-slate-700">
              <span>Outstanding Balance:</span>
              <span className={pendingAmount > 0 ? 'text-red-650 text-sm font-black' : 'text-slate-800 text-sm font-black'}>
                ₹{pendingAmount.toLocaleString('en-IN')}
              </span>
            </div>

            {/* Action button */}
            <div className="sticky-action-footer">
              <LoadingButton
                type="button"
                loading={loading}
                loadingText="Processing Check-In..."
                disabled={!selectedRoomId || !selectedCustomer}
                onClick={handleCheckInSubmit}
                className="flex items-center justify-center gap-1.5 w-full bg-primary hover:bg-primary-hover text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all duration-200 text-sm"
              >
                <CalendarCheck className="w-5 h-5" />
                Complete Guest Check-In
              </LoadingButton>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Guest Search Modal */}
      {activeGuestSearchIndex !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl border border-slate-200/80 p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-primary" />
                Search & Auto-fill Guest #{activeGuestSearchIndex}
              </h3>
              <button
                type="button"
                onClick={() => setActiveGuestSearchIndex(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <CustomerSearch
              hotelId={currentHotel?.id}
              onSelectCustomer={async (customer, isReturning) => {
                let resolvedAadhar = '';
                try {
                  const detail = await db.getCustomerByPhoneOrAadhar(currentHotel.id, customer.phone);
                  if (detail && detail.docs) {
                    const aadharDoc = detail.docs.find(d => d.document_type === 'Aadhar');
                    if (aadharDoc) resolvedAadhar = aadharDoc.document_number;
                  }
                } catch (err) {
                  console.error(err);
                }

                setGuests(prev => {
                  const updated = [...prev];
                  if (updated[activeGuestSearchIndex]) {
                    updated[activeGuestSearchIndex] = {
                      ...updated[activeGuestSearchIndex],
                      full_name: customer.full_name,
                      phone: customer.phone,
                      gender: (customer.gender as any) || 'Male',
                      aadhar_number: resolvedAadhar,
                      document_verified: true
                    };
                  }
                  return updated;
                });
                setActiveGuestSearchIndex(null);
              }}
            />
          </div>
        </div>
      )}
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
