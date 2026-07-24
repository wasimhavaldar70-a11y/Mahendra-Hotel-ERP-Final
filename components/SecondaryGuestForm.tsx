'use client';

// ========================================================
// StayDesk CRM / HotelFlow CRM — Secondary Guest Form
// Location: components/SecondaryGuestForm.tsx
// ========================================================

import React, { useState, useEffect } from 'react';
import { User, Phone, MapPin, Search, Upload, Check, Loader2, Camera, ShieldCheck, Sparkles, FileText, Car, X } from 'lucide-react';
import { Customer } from '../types';
import { STATE_CITIES } from '../lib/constants/statesCities';
import { optimizeImage } from '../lib/imageOptimizer';
import CustomerSearch from './CustomerSearch';
import LoadingButton from './ui/LoadingButton';

interface SecondaryGuestFormProps {
  hotelId?: string;
  primaryCustomer?: Partial<Customer> | null;
  primaryVehicleNumber?: string;
  initialData?: Partial<Customer>;
  initialDoc?: { type: 'Aadhar' | 'Driving License' | 'Passport' | 'Voter ID'; number: string; front: string; back: string };
  initialRelationship?: 'Self' | 'Friend' | 'Family' | 'Wife' | 'Husband' | 'GF' | 'BF' | 'Child';
  onSubmit: (
    customerData: any,
    docData?: { type: string; number: string; front: string; back: string },
    relationship?: string,
    documentVerified?: boolean
  ) => void;
  onCancel?: () => void;
  submitButtonLabel?: string;
  isSubmitting?: boolean;
}

export default function SecondaryGuestForm({
  hotelId,
  primaryCustomer,
  primaryVehicleNumber = '',
  initialData,
  initialDoc,
  initialRelationship = 'Friend',
  onSubmit,
  onCancel,
  submitButtonLabel = 'Save Secondary Guest',
  isSubmitting = false
}: SecondaryGuestFormProps) {
  const primaryVehicle = primaryVehicleNumber || primaryCustomer?.vehicle_number || '';
  
  // Search modal state
  const [showSearchModal, setShowSearchModal] = useState(false);

  // Basic guest fields
  const [fullName, setFullName] = useState(initialData?.full_name || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [gender, setGender] = useState<string>(initialData?.gender || 'Male');
  const [relationship, setRelationship] = useState<string>(initialRelationship);
  const [documentVerified, setDocumentVerified] = useState(true);

  // Address fields (same_address_as_primary UNCHECKED by default as requested)
  const [sameAddressAsPrimary, setSameAddressAsPrimary] = useState(false);
  const [address, setAddress] = useState(initialData?.address || '');
  const [city, setCity] = useState(initialData?.city || '');
  const [state, setState] = useState(initialData?.state || '');
  const [country, setCountry] = useState(initialData?.country || 'India');

  const [isOtherState, setIsOtherState] = useState(() => {
    const val = initialData?.state || '';
    return !!(val && !Object.keys(STATE_CITIES).includes(val));
  });
  const [isOtherCity, setIsOtherCity] = useState(() => {
    const val = initialData?.city || '';
    const st = initialData?.state || '';
    return !!(val && (!st || !STATE_CITIES[st]?.includes(val)));
  });

  // Vehicle field with checkbox (same_vehicle_as_primary UNCHECKED by default as requested)
  const [sameVehicleAsPrimary, setSameVehicleAsPrimary] = useState(false);
  const [vehicleNumber, setVehicleNumber] = useState(initialData?.vehicle_number || '');

  // ID Documents
  const [docType, setDocType] = useState<'Aadhar' | 'Driving License' | 'Passport' | 'Voter ID'>(initialDoc?.type || 'Aadhar');
  const [docNumber, setDocNumber] = useState(initialDoc?.number || '');

  // Form submit paths & previews
  const [frontImage, setFrontImage] = useState<string>(initialDoc?.front || '');
  const [backImage, setBackImage] = useState<string>(initialDoc?.back || '');
  const [frontPreview, setFrontPreview] = useState<string>(initialDoc?.front || '');
  const [backPreview, setBackPreview] = useState<string>(initialDoc?.back || '');

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync address with primary customer when checkbox is checked
  useEffect(() => {
    if (sameAddressAsPrimary && primaryCustomer) {
      setAddress(primaryCustomer.address || '');
      setCity(primaryCustomer.city || '');
      setState(primaryCustomer.state || '');
      setCountry(primaryCustomer.country || 'India');
      setIsOtherState(false);
      setIsOtherCity(false);
    }
  }, [sameAddressAsPrimary, primaryCustomer]);

  // Sync vehicle number with primary when checkbox is checked
  useEffect(() => {
    if (sameVehicleAsPrimary) {
      setVehicleNumber(primaryVehicle);
    }
  }, [sameVehicleAsPrimary, primaryVehicle]);

  const handleSelectCustomerSearchResult = (customer: Customer) => {
    setFullName(customer.full_name || '');
    setPhone(customer.phone || '');
    setGender(customer.gender || 'Male');
    setAddress(customer.address || '');
    setCity(customer.city || '');
    setState(customer.state || '');
    setCountry(customer.country || 'India');
    setVehicleNumber(customer.vehicle_number || '');
    setSameAddressAsPrimary(false);
    setSameVehicleAsPrimary(false);

    if (customer.state && !Object.keys(STATE_CITIES).includes(customer.state)) {
      setIsOtherState(true);
    } else {
      setIsOtherState(false);
    }

    if (customer.city && customer.state && STATE_CITIES[customer.state] && !STATE_CITIES[customer.state].includes(customer.city)) {
      setIsOtherCity(true);
    } else {
      setIsOtherCity(false);
    }

    if (customer.customer_documents && customer.customer_documents.length > 0) {
      const primaryDoc = customer.customer_documents.find(d => d.is_primary) || customer.customer_documents[0];
      if (primaryDoc) {
        setDocType(primaryDoc.document_type as any);
        setDocNumber(primaryDoc.document_number || '');
        if (primaryDoc.front_image) {
          setFrontImage(primaryDoc.front_image);
          setFrontPreview(primaryDoc.front_image);
        }
        if (primaryDoc.back_image) {
          setBackImage(primaryDoc.back_image);
          setBackPreview(primaryDoc.back_image);
        }
      }
    }

    setShowSearchModal(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, [side + 'Image']: 'Only image files are allowed' }));
        return;
      }

      setErrors(prev => {
        const copy = { ...prev };
        delete copy[side + 'Image'];
        return copy;
      });

      try {
        const { dataUrl } = await optimizeImage(file, 'document');
        if (side === 'front') {
          setFrontPreview(dataUrl);
          setFrontImage(dataUrl);
        } else {
          setBackPreview(dataUrl);
          setBackImage(dataUrl);
        }
      } catch (err) {
        console.error('Image optimization failed:', err);
        setErrors(prev => ({ ...prev, [side + 'Image']: 'Failed to process image file' }));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (!/^[a-zA-Z\s]+$/.test(fullName.trim())) {
      newErrors.fullName = 'Name must only contain letters';
    }

    if (phone.trim() && phone.replace(/\D/g, '').length !== 10) {
      newErrors.phone = 'Phone number must be exactly 10 digits';
    }

    if (docNumber.trim()) {
      if (docType === 'Aadhar') {
        const cleanAadhar = docNumber.replace(/\s/g, '');
        if (cleanAadhar.length !== 12 || !/^\d{12}$/.test(cleanAadhar)) {
          newErrors.docNumber = 'Aadhaar must be exactly 12 digits';
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const finalVehicle = sameVehicleAsPrimary ? primaryVehicle : vehicleNumber.trim();
    const finalAddress = sameAddressAsPrimary && primaryCustomer ? (primaryCustomer.address || '') : address;
    const finalCity = sameAddressAsPrimary && primaryCustomer ? (primaryCustomer.city || '') : city;
    const finalState = sameAddressAsPrimary && primaryCustomer ? (primaryCustomer.state || '') : state;
    const finalCountry = sameAddressAsPrimary && primaryCustomer ? (primaryCustomer.country || 'India') : country;

    const customerPayload = {
      full_name: fullName.trim(),
      phone: phone.trim(),
      gender,
      address: finalAddress,
      city: finalCity,
      state: finalState,
      country: finalCountry,
      vehicle_number: finalVehicle,
      nationality: 'Indian'
    };

    const docPayload = docNumber.trim() ? {
      type: docType,
      number: docNumber.trim(),
      front: frontImage,
      back: backImage
    } : undefined;

    onSubmit(customerPayload, docPayload, relationship, documentVerified);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Top Bar with Guest Search/Lookup Option */}
      {hotelId && (
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-700">Search Existing Guest Database</span>
          </div>
          <button
            type="button"
            onClick={() => setShowSearchModal(true)}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs hover:bg-blue-50 transition-colors"
          >
            Search/Lookup Guest
          </button>
        </div>
      )}

      {/* Guest Search Modal */}
      {showSearchModal && hotelId && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-150 pb-2">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-600" />
                Look Up Guest Profile
              </h3>
              <button
                type="button"
                onClick={() => setShowSearchModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <CustomerSearch
              hotelId={hotelId}
              onSelectCustomer={(cust) => handleSelectCustomerSearchResult(cust)}
              onClear={() => {}}
            />
          </div>
        </div>
      )}

      {/* Personal Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            Full Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value.replace(/[^a-zA-Z\s]/g, ''));
                if (errors.fullName) setErrors(prev => ({ ...prev, fullName: '' }));
              }}
              placeholder="e.g. Rahul Sharma"
              className={`w-full text-xs font-medium border rounded-xl p-2.5 pl-9 bg-white focus:outline-none focus:ring-2 ${
                errors.fullName ? 'border-red-400 focus:ring-red-200' : 'border-slate-200 focus:ring-blue-100'
              }`}
            />
            <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </div>
          {errors.fullName && <p className="text-[10px] text-red-500 font-semibold mt-1">{errors.fullName}</p>}
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            Relationship to Primary Guest
          </label>
          <select
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="Friend">Friend</option>
            <option value="Family">Family Member</option>
            <option value="Wife">Wife</option>
            <option value="Husband">Husband</option>
            <option value="GF">Girlfriend</option>
            <option value="BF">Boyfriend</option>
            <option value="Child">Child</option>
            <option value="Self">Self</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            Phone Number <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <div className="relative">
            <input
              type="tel"
              maxLength={10}
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value.replace(/\D/g, ''));
                if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
              }}
              placeholder="10-digit mobile number"
              className={`w-full text-xs font-medium border rounded-xl p-2.5 pl-9 bg-white focus:outline-none focus:ring-2 ${
                errors.phone ? 'border-red-400 focus:ring-red-200' : 'border-slate-200 focus:ring-blue-100'
              }`}
            />
            <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </div>
          {errors.phone && <p className="text-[10px] text-red-500 font-semibold mt-1">{errors.phone}</p>}
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">Gender</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Vehicle Number Section with Checkbox */}
      <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer select-none">
            <Car className="w-4 h-4 text-blue-600" />
            Vehicle Details
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none">
            <input
              type="checkbox"
              checked={sameVehicleAsPrimary}
              onChange={(e) => setSameVehicleAsPrimary(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 accent-blue-600"
            />
            Same vehicle number as primary guest
          </label>
        </div>

        {sameVehicleAsPrimary ? (
          <div className="text-xs font-medium text-slate-600 bg-white p-2 rounded-lg border border-slate-200/60 flex items-center justify-between">
            <span>Linked Primary Vehicle:</span>
            <span className="font-bold text-slate-900">{primaryVehicle || 'Same as Primary Guest'}</span>
          </div>
        ) : (
          <div>
            <input
              type="text"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
              placeholder="e.g. MH09AB1234"
              className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 bg-white uppercase focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
        )}
      </div>

      {/* Address Section with State & City Dropdowns (UNCHECKED by default) */}
      <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-blue-600" />
            Address Details
          </label>
          {primaryCustomer && (
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none">
              <input
                type="checkbox"
                checked={sameAddressAsPrimary}
                onChange={(e) => setSameAddressAsPrimary(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 accent-blue-600"
              />
              Same address as primary guest
            </label>
          )}
        </div>

        {!sameAddressAsPrimary && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="md:col-span-2">
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Street Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Flat / House / Street Address"
                className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* State Dropdown */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">State</label>
              <select
                value={isOtherState ? 'Other' : state}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'Other') {
                    setState('');
                    setIsOtherState(true);
                    setCity('');
                    setIsOtherCity(true);
                  } else {
                    setState(val);
                    setIsOtherState(false);
                    setCity('');
                    setIsOtherCity(false);
                  }
                }}
                className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Select State</option>
                {Object.keys(STATE_CITIES).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
                <option value="Other">Other State (Type manually)</option>
              </select>

              {isOtherState && (
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                  className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 mt-2"
                  placeholder="Enter custom state name"
                />
              )}
            </div>

            {/* City Dropdown */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">City</label>
              {isOtherState ? (
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                  className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="Enter city name"
                />
              ) : (
                <>
                  <select
                    value={isOtherCity ? 'Other' : city}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'Other') {
                        setCity('');
                        setIsOtherCity(true);
                      } else {
                        setCity(val);
                        setIsOtherCity(false);
                      }
                    }}
                    className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">Select City</option>
                    {(STATE_CITIES[state] || []).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="Other">Other City (Type manually)</option>
                  </select>

                  {isOtherCity && (
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                      className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 mt-2"
                      placeholder="Enter custom city name"
                    />
                  )}
                </>
              )}
            </div>

            {/* Country */}
            <div className="md:col-span-2">
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Country</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                placeholder="Country"
                className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        )}
      </div>

      {/* ID Document Details & Take Photo / Upload Buttons */}
      <div className="p-3.5 bg-blue-50/40 border border-blue-100 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-blue-600" />
            ID Proof Document Verification
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-slate-700 select-none">
            <input
              type="checkbox"
              checked={documentVerified}
              onChange={(e) => setDocumentVerified(e.target.checked)}
              className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500 accent-blue-600"
            />
            Document Verified
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Document Type</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as any)}
              className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="Aadhar">Aadhaar Card</option>
              <option value="Driving License">Driving License</option>
              <option value="Passport">Passport</option>
              <option value="Voter ID">Voter ID</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Document / ID Number</label>
            <input
              type="text"
              value={docNumber}
              onChange={(e) => {
                let val = e.target.value;
                if (docType === 'Aadhar') {
                  const clean = val.replace(/\D/g, '').slice(0, 12);
                  let formatted = '';
                  for (let i = 0; i < clean.length; i++) {
                    if (i > 0 && i % 4 === 0) formatted += ' ';
                    formatted += clean[i];
                  }
                  val = formatted;
                }
                setDocNumber(val);
                if (errors.docNumber) setErrors(prev => ({ ...prev, docNumber: '' }));
              }}
              placeholder={docType === 'Aadhar' ? '12-digit Aadhaar number' : 'Enter document ID number'}
              className={`w-full text-xs font-medium border rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 ${
                errors.docNumber ? 'border-red-400 focus:ring-red-200' : 'border-slate-200 focus:ring-blue-100'
              }`}
            />
            {errors.docNumber && <p className="text-[10px] text-red-500 font-semibold mt-1">{errors.docNumber}</p>}
          </div>
        </div>

        {/* Dual Photo Buttons: Upload File & Take Photo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {/* Front Side */}
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-2">
            <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">ID Front Side Photo</span>
            
            {frontPreview ? (
              <div className="relative h-28 w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                <img src={frontPreview} alt="Front preview" className="w-full h-full object-cover" />
                <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full p-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
              </div>
            ) : (
              <div className="h-24 rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                <FileText className="w-6 h-6 mb-1 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-500">No Front Image Selected</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <label className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold cursor-pointer transition-colors shadow-2xs">
                <Upload className="w-3.5 h-3.5 text-slate-600" />
                Upload File
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'front')}
                  className="hidden"
                />
              </label>

              <label className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold cursor-pointer transition-colors shadow-2xs">
                <Camera className="w-3.5 h-3.5 text-white" />
                Take Photo
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleImageUpload(e, 'front')}
                  className="hidden"
                />
              </label>
            </div>
            {errors.frontImage && <p className="text-[10px] text-red-500 font-semibold mt-1">{errors.frontImage}</p>}
          </div>

          {/* Back Side */}
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-2">
            <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">ID Back Side Photo</span>
            
            {backPreview ? (
              <div className="relative h-28 w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                <img src={backPreview} alt="Back preview" className="w-full h-full object-cover" />
                <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full p-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
              </div>
            ) : (
              <div className="h-24 rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                <FileText className="w-6 h-6 mb-1 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-500">No Back Image Selected</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <label className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold cursor-pointer transition-colors shadow-2xs">
                <Upload className="w-3.5 h-3.5 text-slate-600" />
                Upload File
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'back')}
                  className="hidden"
                />
              </label>

              <label className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold cursor-pointer transition-colors shadow-2xs">
                <Camera className="w-3.5 h-3.5 text-white" />
                Take Photo
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleImageUpload(e, 'back')}
                  className="hidden"
                />
              </label>
            </div>
            {errors.backImage && <p className="text-[10px] text-red-500 font-semibold mt-1">{errors.backImage}</p>}
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
        )}
        <LoadingButton
          type="submit"
          loading={isSubmitting}
          className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all"
        >
          {submitButtonLabel}
        </LoadingButton>
      </div>
    </form>
  );
}
