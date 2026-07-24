'use client';

// ========================================================
// StayDesk CRM / HotelFlow CRM — Secondary Guest Form
// Location: components/SecondaryGuestForm.tsx
// ========================================================

import React, { useState, useEffect } from 'react';
import { User, Phone, MapPin, ShieldAlert, Upload, Check, Loader2, Camera, ShieldCheck, Sparkles, FileText, Car, CheckSquare, Square } from 'lucide-react';
import { Customer } from '../types';
import { STATE_CITIES } from '../lib/constants/statesCities';
import { supabase } from '../lib/supabase/client';
import { optimizeImage } from '../lib/imageOptimizer';
import LoadingButton from './ui/LoadingButton';

interface SecondaryGuestFormProps {
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
  
  // Basic guest fields
  const [fullName, setFullName] = useState(initialData?.full_name || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [gender, setGender] = useState<string>(initialData?.gender || 'Male');
  const [relationship, setRelationship] = useState<string>(initialRelationship);
  const [documentVerified, setDocumentVerified] = useState(true);

  // Address fields
  const [sameAddressAsPrimary, setSameAddressAsPrimary] = useState(true);
  const [address, setAddress] = useState(initialData?.address || primaryCustomer?.address || '');
  const [city, setCity] = useState(initialData?.city || primaryCustomer?.city || '');
  const [state, setState] = useState(initialData?.state || primaryCustomer?.state || '');
  const [country, setCountry] = useState(initialData?.country || primaryCustomer?.country || 'India');

  // Vehicle field with checkbox
  const [sameVehicleAsPrimary, setSameVehicleAsPrimary] = useState(true);
  const [vehicleNumber, setVehicleNumber] = useState(initialData?.vehicle_number || primaryVehicle);

  // ID Documents
  const [docType, setDocType] = useState<'Aadhar' | 'Driving License' | 'Passport' | 'Voter ID'>(initialDoc?.type || 'Aadhar');
  const [docNumber, setDocNumber] = useState(initialDoc?.number || '');

  // Form submit paths & previews
  const [frontImage, setFrontImage] = useState<string>(initialDoc?.front || '');
  const [backImage, setBackImage] = useState<string>(initialDoc?.back || '');
  const [frontPreview, setFrontPreview] = useState<string>(initialDoc?.front || '');
  const [backPreview, setBackPreview] = useState<string>(initialDoc?.back || '');

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync address with primary customer when checkbox is toggled
  useEffect(() => {
    if (sameAddressAsPrimary && primaryCustomer) {
      setAddress(primaryCustomer.address || '');
      setCity(primaryCustomer.city || '');
      setState(primaryCustomer.state || '');
      setCountry(primaryCustomer.country || 'India');
    }
  }, [sameAddressAsPrimary, primaryCustomer]);

  // Sync vehicle number with primary when checkbox is toggled
  useEffect(() => {
    if (sameVehicleAsPrimary) {
      setVehicleNumber(primaryVehicle);
    }
  }, [sameVehicleAsPrimary, primaryVehicle]);

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
            <span className="font-bold text-slate-900">{primaryVehicle || 'None Specified'}</span>
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

      {/* Address Section */}
      <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1">
            <div className="md:col-span-3">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full residential address"
                className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="State"
                className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Country"
                className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        )}
      </div>

      {/* ID Document Details & Uploads */}
      <div className="p-3.5 bg-blue-50/40 border border-blue-100 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-blue-600" />
            ID Proof Document
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

        {/* Photo Uploads Grid */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* Front Image */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Front Side Photo
            </label>
            <div className="relative border border-dashed border-slate-300 rounded-xl p-3 bg-white hover:bg-slate-50/80 transition-colors text-center cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, 'front')}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
              />
              {frontPreview ? (
                <div className="relative h-20 w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                  <img src={frontPreview} alt="Front preview" className="w-full h-full object-cover" />
                  <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full p-0.5">
                    <Check className="w-3 h-3" />
                  </div>
                </div>
              ) : (
                <div className="py-2 flex flex-col items-center justify-center text-slate-400">
                  <Camera className="w-5 h-5 mb-1 text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-600">Upload Front</span>
                </div>
              )}
            </div>
            {errors.frontImage && <p className="text-[10px] text-red-500 font-semibold mt-1">{errors.frontImage}</p>}
          </div>

          {/* Back Image */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Back Side Photo
            </label>
            <div className="relative border border-dashed border-slate-300 rounded-xl p-3 bg-white hover:bg-slate-50/80 transition-colors text-center cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, 'back')}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
              />
              {backPreview ? (
                <div className="relative h-20 w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                  <img src={backPreview} alt="Back preview" className="w-full h-full object-cover" />
                  <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full p-0.5">
                    <Check className="w-3 h-3" />
                  </div>
                </div>
              ) : (
                <div className="py-2 flex flex-col items-center justify-center text-slate-400">
                  <Camera className="w-5 h-5 mb-1 text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-600">Upload Back</span>
                </div>
              )}
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
