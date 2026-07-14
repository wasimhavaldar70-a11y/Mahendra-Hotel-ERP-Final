'use client';

// ========================================================
// StayDesk CRM / HotelFlow CRM Customer Registration Form
// Location: components/CustomerForm.tsx
// ========================================================

import React, { useState } from 'react';
import { User, Phone, MapPin, ShieldAlert, Upload, Image as ImageIcon, Check } from 'lucide-react';
import { Customer } from '../types';

interface CustomerFormProps {
  initialData?: Partial<Customer>;
  onSubmit: (customerData: any, docData?: { type: string; number: string; front: string; back: string }) => void;
  onCancel?: () => void;
}

export default function CustomerForm({ initialData, onSubmit, onCancel }: CustomerFormProps) {
  const [fullName, setFullName] = useState(initialData?.full_name || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [gender, setGender] = useState(initialData?.gender || 'Male');
  const [address, setAddress] = useState(initialData?.address || '');
  const [city, setCity] = useState(initialData?.city || '');
  const [state, setState] = useState(initialData?.state || '');
  const [country, setCountry] = useState(initialData?.country || 'India');

  // Documents
  const [docType, setDocType] = useState<'Aadhar' | 'Driving License' | 'Passport' | 'Voter ID'>('Aadhar');
  const [docNumber, setDocNumber] = useState('');
  const [frontImage, setFrontImage] = useState<string>('');
  const [backImage, setBackImage] = useState<string>('');

  const [loading, setLoading] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (side === 'front') {
          setFrontImage(reader.result as string);
        } else {
          setBackImage(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone) return;

    setLoading(true);

    const customerData = {
      full_name: fullName,
      phone,
      gender,
      address,
      city,
      state,
      country
    };

    const docData = docNumber ? {
      type: docType,
      number: docNumber,
      front: frontImage,
      back: backImage
    } : undefined;

    setTimeout(() => {
      onSubmit(customerData, docData);
      setLoading(false);
    }, 500);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 border-b border-slate-50 pb-2 flex items-center gap-1.5">
          <User className="w-4 h-4 text-primary" />
          Guest Details
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Full Name *</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-200"
              placeholder="Rahul Verma"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Phone Number *</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-200"
              placeholder="9876543210"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Gender</label>
            <div className="flex gap-2">
              {['Male', 'Female', 'Other'].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={`flex-1 py-3 text-xs font-bold rounded-xl border transition-all duration-200 ${
                    gender === g 
                      ? 'bg-slate-800 border-slate-800 text-white shadow-sm'
                      : 'bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-100/50'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 border-b border-slate-50 pb-2 flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-primary" />
          Address Details
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Street Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-200"
              placeholder="Flat 104, Royal Apartments, MG Road"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-200"
              placeholder="Bengaluru"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">State</label>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-200"
              placeholder="Karnataka"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 border-b border-slate-50 pb-2 flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 text-primary" />
          Document Upload & Verification
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">ID Type</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as any)}
              className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-200"
            >
              <option value="Aadhar">Aadhaar Card</option>
              <option value="Driving License">Driving License</option>
              <option value="Passport">Passport</option>
              <option value="Voter ID">Voter ID Card</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">ID Document Number</label>
            <input
              type="text"
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value)}
              className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-200"
              placeholder="e.g. 1234 5678 9012"
            />
          </div>
        </div>

        {/* Upload dropzones */}
        {docNumber && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">ID Card Front Side</span>
              <label className="flex flex-col items-center justify-center h-36 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer overflow-hidden transition-all relative">
                {frontImage ? (
                  <>
                    <img src={frontImage} alt="ID Front" className="object-cover w-full h-full" />
                    <div className="absolute top-2 right-2 bg-emerald-500 text-white p-1 rounded-full">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center text-center p-4">
                    <Upload className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-xs font-bold text-slate-600">Upload Front Image</span>
                    <span className="text-[9px] text-slate-400 mt-0.5">Click to choose image file</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'front')}
                  className="hidden"
                />
              </label>
            </div>

            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">ID Card Back Side</span>
              <label className="flex flex-col items-center justify-center h-36 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer overflow-hidden transition-all relative">
                {backImage ? (
                  <>
                    <img src={backImage} alt="ID Back" className="object-cover w-full h-full" />
                    <div className="absolute top-2 right-2 bg-emerald-500 text-white p-1 rounded-full">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center text-center p-4">
                    <Upload className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-xs font-bold text-slate-600">Upload Back Image</span>
                    <span className="text-[9px] text-slate-400 mt-0.5">Click to choose image file</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'back')}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 justify-end">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="bg-primary hover:bg-primary-hover text-white font-bold text-xs px-6 py-3 rounded-xl shadow-lg shadow-red-200 transition-all duration-200 disabled:opacity-55"
        >
          {loading ? 'Saving Guest...' : 'Save Guest Details'}
        </button>
      </div>
    </form>
  );
}
