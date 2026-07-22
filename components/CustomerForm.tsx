'use client';

// ========================================================
// StayDesk CRM / HotelFlow CRM Customer Registration Form
// Location: components/CustomerForm.tsx
// ========================================================

import React, { useState } from 'react';
import { User, Phone, MapPin, ShieldAlert, Upload, Check, Loader2, Camera, ShieldCheck, Sparkles, FileText } from 'lucide-react';
import { Customer } from '../types';
import { STATE_CITIES } from '../lib/constants/statesCities';
import { supabase, getSessionUser } from '../lib/supabase/client';
import { optimizeImage } from '../lib/imageOptimizer';
import LoadingButton from './ui/LoadingButton';

interface CustomerFormProps {
  initialData?: Partial<Customer>;
  initialDoc?: { type: 'Aadhar' | 'Driving License' | 'Passport' | 'Voter ID'; number: string; front: string; back: string };
  onSubmit: (customerData: any, docData?: { type: string; number: string; front: string; back: string }) => void;
  onCancel?: () => void;
}

export default function CustomerForm({ initialData, initialDoc, onSubmit, onCancel }: CustomerFormProps) {
  const [fullName, setFullName] = useState(initialData?.full_name || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [gender, setGender] = useState(initialData?.gender || 'Male');
  const [address, setAddress] = useState(initialData?.address || '');
  const [city, setCity] = useState(initialData?.city || '');
  const [state, setState] = useState(initialData?.state || '');
  const [country, setCountry] = useState(initialData?.country || 'India');
  const [email, setEmail] = useState(initialData?.email || '');
  const [vehicleNumber, setVehicleNumber] = useState(initialData?.vehicle_number || '');
  const [emergencyContact, setEmergencyContact] = useState(initialData?.emergency_contact || '');
  const [nationality, setNationality] = useState(initialData?.nationality || 'Indian');

  const [isOtherState, setIsOtherState] = useState(() => {
    const val = initialData?.state || '';
    return !!(val && !Object.keys(STATE_CITIES).includes(val));
  });
  const [isOtherCity, setIsOtherCity] = useState(() => {
    const val = initialData?.city || '';
    const st = initialData?.state || '';
    return !!(val && (!st || !STATE_CITIES[st]?.includes(val)));
  });

  // Client-Side Generated Customer ID (to allow background uploading using a permanent UUID)
  const [customerId] = useState(() => initialData?.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)));

  // Documents
  const [docType, setDocType] = useState<'Aadhar' | 'Driving License' | 'Passport' | 'Voter ID'>(initialDoc?.type || 'Aadhar');
  const [docNumber, setDocNumber] = useState(initialDoc?.number || '');

  // Form submit paths (hold path strings like "hotel_id/customer_id/front-...webp")
  const [frontImage, setFrontImage] = useState<string>(initialDoc?.front || '');
  const [backImage, setBackImage] = useState<string>(initialDoc?.back || '');

  // Base64 previews for client display
  const [frontPreview, setFrontPreview] = useState<string>(initialDoc?.front || '');
  const [backPreview, setBackPreview] = useState<string>(initialDoc?.back || '');

  // Background Upload states
  const [frontUploading, setFrontUploading] = useState(false);
  const [frontProgress, setFrontProgress] = useState(0);
  const [frontSuccess, setFrontSuccess] = useState(false);
  const [frontError, setFrontError] = useState('');

  const [backUploading, setBackUploading] = useState(false);
  const [backProgress, setBackProgress] = useState(0);
  const [backSuccess, setBackSuccess] = useState(false);
  const [backError, setBackError] = useState('');

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [frontBlob, setFrontBlob] = useState<Blob | null>(null);
  const [backBlob, setBackBlob] = useState<Blob | null>(null);

  const startBackgroundUpload = async (side: 'front' | 'back', blob: Blob, targetFileName: string) => {
    const setUploading = side === 'front' ? setFrontUploading : setBackUploading;
    const setProgress = side === 'front' ? setFrontProgress : setBackProgress;
    const setSuccess = side === 'front' ? setFrontSuccess : setBackSuccess;
    const setErrorState = side === 'front' ? setFrontError : setBackError;
    const setImagePath = side === 'front' ? setFrontImage : setBackImage;

    setUploading(true);
    setProgress(10);
    setSuccess(false);
    setErrorState('');

    // Smooth UI progress simulation (e.g. step up from 10 to 90 every 120ms)
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 120);

    const bucketName = 'customer-documents';
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        if (!supabase) throw new Error('Supabase client not initialized');

        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(targetFileName, blob, {
            contentType: 'image/webp',
            upsert: true
          });

        if (error) throw error;

        // Success!
        clearInterval(progressInterval);
        setProgress(100);
        setSuccess(true);
        setUploading(false);
        setImagePath(targetFileName); // Assign storage path to image form field
        return;
      } catch (err: any) {
        attempts++;
        if (attempts >= maxAttempts) {
          clearInterval(progressInterval);
          setUploading(false);
          setErrorState(err?.message || 'Upload failed');
          return;
        }
        // Exponential backoff wait (0.5s, 1.0s, 2.0s)
        await new Promise(res => setTimeout(res, Math.pow(2, attempts) * 500));
      }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
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
        // 1. Run client-side optimization immediately
        const optimized = await optimizeImage(file, 'document');

        // 2. Update preview state with base64 Data URL so user sees it instantly
        if (side === 'front') {
          setFrontBlob(optimized.blob);
          setFrontPreview(optimized.dataUrl);
        } else {
          setBackBlob(optimized.blob);
          setBackPreview(optimized.dataUrl);
        }

        // 3. Initiate background upload in non-blocking fashion
        const hotelId = getSessionUser()?.hotel?.id || 'default';
        const targetFileName = `${hotelId}/${customerId}/${side}-${Date.now()}.webp`;
        startBackgroundUpload(side, optimized.blob, targetFileName);

      } catch (err: any) {
        setErrors(prev => ({ ...prev, [side + 'Image']: err.message || 'Image optimization failed' }));
      }
    }
  };

  const handleDocTypeChange = (type: 'Aadhar' | 'Driving License' | 'Passport' | 'Voter ID') => {
    setDocType(type);
    setDocNumber('');
    setFrontImage('');
    setBackImage('');
    setFrontPreview('');
    setBackPreview('');
    setFrontSuccess(false);
    setBackSuccess(false);
    setFrontProgress(0);
    setBackProgress(0);
    setErrors(prev => {
      const copy = { ...prev };
      delete copy.docNumber;
      delete copy.frontImage;
      delete copy.backImage;
      return copy;
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 1. Full Name (mandatory, letters & spaces only)
    if (!fullName.trim()) {
      newErrors.fullName = 'Full Name is required';
    } else if (!/^[a-zA-Z\s]+$/.test(fullName)) {
      newErrors.fullName = 'Full Name must only contain letters and spaces';
    }

    // 2. Phone Number (mandatory, exactly 10 digits)
    if (!phone) {
      newErrors.phone = 'Phone Number is required';
    } else if (phone.length !== 10 || !/^\d{10}$/.test(phone)) {
      newErrors.phone = 'Phone number must be exactly 10 digits';
    }

    // 3. Street Address (mandatory)
    if (!address.trim()) {
      newErrors.address = 'Street Address is required';
    }

    // 4. City (mandatory, letters & spaces only)
    if (!city.trim()) {
      newErrors.city = 'City is required';
    } else if (!/^[a-zA-Z\s]+$/.test(city)) {
      newErrors.city = 'City must only contain letters and spaces';
    }

    // 5. State (mandatory, letters & spaces only)
    if (!state.trim()) {
      newErrors.state = 'State is required';
    } else if (!/^[a-zA-Z\s]+$/.test(state)) {
      newErrors.state = 'State must only contain letters and spaces';
    }

    // 6. Country (mandatory, letters & spaces only)
    if (!country.trim()) {
      newErrors.country = 'Country is required';
    } else if (!/^[a-zA-Z\s]+$/.test(country)) {
      newErrors.country = 'Country must only contain letters and spaces';
    }

    // Email (optional)
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email format';
    }

    // Emergency Contact (optional)
    if (emergencyContact && emergencyContact.replace(/\D/g, '').length > 0 && emergencyContact.replace(/\D/g, '').length !== 10) {
      newErrors.emergencyContact = 'Emergency phone must be exactly 10 digits';
    }

    // 7. Documents (all document fields are mandatory)
    if (!docNumber.trim()) {
      newErrors.docNumber = 'ID Document Number is required';
    } else {
      if (docType === 'Aadhar') {
        const cleanAadhar = docNumber.replace(/\s/g, '');
        if (cleanAadhar.length !== 12 || !/^\d{12}$/.test(cleanAadhar)) {
          newErrors.docNumber = 'Aadhaar Card must be exactly 12 digits (format: 1234 5678 9012)';
        }
      } else if (docType === 'Passport') {
        const isValid = /^[A-Z]{1}[0-9]{7}$/.test(docNumber) || /^[A-Z]{2}[0-9]{6}$/.test(docNumber);
        if (!isValid) {
          newErrors.docNumber = 'Passport must be 8 characters: 1 letter and 7 digits (e.g. K1234567) or 2 letters and 6 digits (e.g. AB123456)';
        }
      } else if (docType === 'Driving License') {
        const cleanDL = docNumber.replace(/[- ]/g, '');
        const isValid = /^[A-Z]{2}[0-9]{2}[0-9]{4}[0-9]{7}$/.test(cleanDL);
        if (cleanDL.length !== 15 || !isValid) {
          newErrors.docNumber = 'Driving Licence must be a valid 15-character Indian DL: e.g. MH-0420150034761';
        }
      } else if (docType === 'Voter ID') {
        if (!/^[A-Z]{3}[0-9]{7}$/.test(docNumber)) {
          newErrors.docNumber = 'Voter ID must be 10 characters: 3 uppercase letters followed by 7 digits (e.g. YCV0164822)';
        }
      }
    }

    // Document image uploads are mandatory if ID is registered
    if (!frontImage) {
      newErrors.frontImage = 'ID Card Front Side upload is required';
    }
    if (!backImage) {
      newErrors.backImage = 'ID Card Back Side upload is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    const customerData = {
      full_name: fullName,
      phone,
      gender,
      address,
      city,
      state,
      country,
      email: email || undefined,
      vehicle_number: vehicleNumber || undefined,
      emergency_contact: emergencyContact || undefined,
      nationality: nationality || 'Indian'
    };

    const docData = {
      type: docType,
      number: docNumber,
      front: frontImage,
      back: backImage
    };

    setTimeout(() => {
      onSubmit(customerData, docData);
      setLoading(false);
    }, 500);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 1. Guest Details Section */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 space-y-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-150 pb-2 flex items-center gap-1.5">
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
              onChange={(e) => {
                const val = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                setFullName(val);
                if (errors.fullName) {
                  setErrors(prev => {
                    const copy = { ...prev };
                    delete copy.fullName;
                    return copy;
                  });
                }
              }}
              className={`w-full text-xs font-semibold text-slate-700 bg-slate-50/50 border rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-200 ${
                errors.fullName ? 'border-red-500 focus:ring-red-500 focus:bg-white' : 'border-slate-200'
              }`}
              placeholder="Rahul Verma"
            />
            {errors.fullName && (
              <span className="text-[10px] font-bold text-red-500 mt-1 block">{errors.fullName}</span>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Phone Number *</label>
            <input
              type="tel"
              inputMode="tel"
              required
              value={phone}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                setPhone(val);
                if (errors.phone) {
                  setErrors(prev => {
                    const copy = { ...prev };
                    delete copy.phone;
                    return copy;
                  });
                }
              }}
              className={`w-full text-xs font-semibold text-slate-700 bg-slate-50/50 border rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-200 ${
                errors.phone ? 'border-red-500 focus:ring-red-500 focus:bg-white' : 'border-slate-200'
              }`}
              placeholder="10-digit number"
            />
            {errors.phone && (
              <span className="text-[10px] font-bold text-red-500 mt-1 block">{errors.phone}</span>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Gender *</label>
            <div className="flex gap-2">
              {['Male', 'Female', 'Other'].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={`flex-1 py-3 text-xs font-semibold rounded-xl border transition-all duration-200 ${
                    gender === g 
                      ? 'bg-primary border-primary text-white shadow-sm'
                      : 'bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-100/50'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
            <input
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) {
                  setErrors(prev => {
                    const copy = { ...prev };
                    delete copy.email;
                    return copy;
                  });
                }
              }}
              className={`w-full text-xs font-semibold text-slate-700 bg-slate-50/50 border rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-200 ${
                errors.email ? 'border-red-500 focus:ring-red-500 focus:bg-white' : 'border-slate-200'
              }`}
              placeholder="rahul@example.com"
            />
            {errors.email && (
              <span className="text-[10px] font-bold text-red-500 mt-1 block">{errors.email}</span>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Nationality</label>
            <input
              type="text"
              value={nationality}
              onChange={(e) => setNationality(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
              className="w-full text-xs font-semibold text-slate-700 bg-slate-50/50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-200"
              placeholder="Indian"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Vehicle Number</label>
            <input
              type="text"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
              className="w-full text-xs font-semibold text-slate-700 bg-slate-50/50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-200"
              placeholder="MH 12 AB 1234"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Emergency Phone</label>
            <input
              type="tel"
              value={emergencyContact}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                setEmergencyContact(val);
                if (errors.emergencyContact) {
                  setErrors(prev => {
                    const copy = { ...prev };
                    delete copy.emergencyContact;
                    return copy;
                  });
                }
              }}
              className={`w-full text-xs font-semibold text-slate-700 bg-slate-50/50 border rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-200 ${
                errors.emergencyContact ? 'border-red-500 focus:ring-red-500 focus:bg-white' : 'border-slate-200'
              }`}
              placeholder="10-digit number"
            />
            {errors.emergencyContact && (
              <span className="text-[10px] font-bold text-red-500 mt-1 block">{errors.emergencyContact}</span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Address Details Section */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 space-y-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-150 pb-2 flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-primary" />
          Address Details
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Street Address *</label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                if (errors.address) {
                  setErrors(prev => {
                    const copy = { ...prev };
                    delete copy.address;
                    return copy;
                  });
                }
              }}
              className={`w-full text-xs font-semibold text-slate-700 bg-slate-50/50 border rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-200 ${
                errors.address ? 'border-red-500 focus:ring-red-500 focus:bg-white' : 'border-slate-200'
              }`}
              placeholder="Flat 104, Royal Apartments, MG Road"
            />
            {errors.address && (
              <span className="text-[10px] font-bold text-red-500 mt-1 block">{errors.address}</span>
            )}
          </div>

          {/* State Section */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">State *</label>
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
                  if (errors.state) {
                    setErrors(prev => {
                      const copy = { ...prev };
                      delete copy.state;
                      return copy;
                    });
                  }
                }
              }}
              className={`w-full text-xs font-semibold text-slate-700 bg-slate-50/50 border rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-250 ${
                errors.state ? 'border-red-500 focus:ring-red-500 focus:bg-white' : 'border-slate-200'
              }`}
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
                required
                value={state}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                  setState(val);
                  if (errors.state) {
                    setErrors(prev => {
                      const copy = { ...prev };
                      delete copy.state;
                      return copy;
                    });
                  }
                }}
                className={`w-full text-xs font-semibold text-slate-700 bg-slate-50/50 border rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-200 mt-2 ${
                  errors.state ? 'border-red-500 focus:ring-red-500 focus:bg-white' : 'border-slate-200'
                }`}
                placeholder="Enter custom state name"
              />
            )}
            {errors.state && (
              <span className="text-[10px] font-bold text-red-500 mt-1 block">{errors.state}</span>
            )}
          </div>

          {/* City Section */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">City *</label>
            {isOtherState ? (
              <input
                type="text"
                required
                value={city}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                  setCity(val);
                  if (errors.city) {
                    setErrors(prev => {
                      const copy = { ...prev };
                      delete copy.city;
                      return copy;
                    });
                  }
                }}
                className={`w-full text-xs font-semibold text-slate-700 bg-slate-50/50 border rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-200 ${
                  errors.city ? 'border-red-500 focus:ring-red-500 focus:bg-white' : 'border-slate-200'
                }`}
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
                      if (errors.city) {
                        setErrors(prev => {
                          const copy = { ...prev };
                          delete copy.city;
                          return copy;
                        });
                      }
                    }
                  }}
                  className={`w-full text-xs font-semibold text-slate-700 bg-slate-50/50 border rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-250 ${
                    errors.city ? 'border-red-500 focus:ring-red-500 focus:bg-white' : 'border-slate-200'
                  }`}
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
                    required
                    value={city}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                      setCity(val);
                      if (errors.city) {
                        setErrors(prev => {
                          const copy = { ...prev };
                          delete copy.city;
                          return copy;
                        });
                      }
                    }}
                    className={`w-full text-xs font-semibold text-slate-700 bg-slate-50/50 border rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-200 mt-2 ${
                      errors.city ? 'border-red-500 focus:ring-red-500 focus:bg-white' : 'border-slate-200'
                    }`}
                    placeholder="Enter custom city name"
                  />
                )}
              </>
            )}
            {errors.city && (
              <span className="text-[10px] font-bold text-red-500 mt-1 block">{errors.city}</span>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Country *</label>
            <input
              type="text"
              required
              value={country}
              onChange={(e) => {
                const val = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                setCountry(val);
                if (errors.country) {
                  setErrors(prev => {
                    const copy = { ...prev };
                    delete copy.country;
                    return copy;
                  });
                }
              }}
              className={`w-full text-xs font-semibold text-slate-700 bg-slate-50/50 border rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-200 ${
                errors.country ? 'border-red-500 focus:ring-red-500 focus:bg-white' : 'border-slate-200'
              }`}
              placeholder="India"
            />
            {errors.country && (
              <span className="text-[10px] font-bold text-red-500 mt-1 block">{errors.country}</span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Document Verification Section */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 flex items-center justify-center shadow-md shadow-emerald-600/20 text-white">
              <ShieldCheck className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-800 tracking-wide uppercase flex items-center gap-1.5">
                ID Document Verification &amp; Scanner
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold">
                Upload clear front &amp; back side photos of guest identification
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200/60 shadow-xs">
            <Sparkles className="w-3 h-3 text-emerald-600 animate-pulse" />
            Auto WebP Compression
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">ID Type *</label>
            <select
              value={docType}
              onChange={(e) => handleDocTypeChange(e.target.value as any)}
              className="w-full text-xs font-semibold text-slate-700 bg-slate-50/50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-200"
            >
              <option value="Aadhar">Aadhaar Card</option>
              <option value="Driving License">Driving License</option>
              <option value="Passport">Passport</option>
              <option value="Voter ID">Voter ID Card</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">ID Document Number *</label>
            <input
              type="text"
              inputMode={docType === 'Aadhar' ? 'numeric' : 'text'}
              required
              value={docNumber}
              onChange={(e) => {
                let val = e.target.value;
                if (docType === 'Aadhar') {
                  const clean = val.replace(/\D/g, '').slice(0, 12);
                  let formatted = '';
                  for (let i = 0; i < clean.length; i++) {
                    if (i > 0 && i % 4 === 0) {
                      formatted += ' ';
                    }
                    formatted += clean[i];
                  }
                  val = formatted;
                } else if (docType === 'Passport') {
                  val = val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8);
                } else if (docType === 'Driving License') {
                  val = val.replace(/[^a-zA-Z0-9-\s]/g, '').toUpperCase().slice(0, 17);
                } else if (docType === 'Voter ID') {
                  val = val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10);
                }
                setDocNumber(val);
                if (errors.docNumber) {
                  setErrors(prev => {
                    const copy = { ...prev };
                    delete copy.docNumber;
                    return copy;
                  });
                }
              }}
              className={`w-full text-xs font-semibold text-slate-700 bg-slate-50/50 border rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-200 ${
                errors.docNumber ? 'border-red-500 focus:ring-red-500 focus:bg-white' : 'border-slate-200'
              }`}
              placeholder={
                docType === 'Aadhar' ? '1234 5678 9012' :
                docType === 'Passport' ? 'e.g. K1234567 or AB123456' :
                docType === 'Driving License' ? 'e.g. MH-0420150034761' :
                'e.g. YCV0164822'
              }
            />
            {errors.docNumber && (
              <span className="text-[10px] font-bold text-red-500 mt-1 block">{errors.docNumber}</span>
            )}
          </div>
        </div>

        {/* Upload dropzones */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Front Side */}
          <div className="bg-slate-50/60 p-3 rounded-2xl border border-slate-200/70 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                <FileText className="w-3 h-3 text-emerald-600" />
                ID Front Side *
              </span>
              {frontSuccess && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-extrabold shadow-xs">
                  <Check className="w-3 h-3" /> VERIFIED
                </span>
              )}
            </div>

            {/* Scanner Preview Frame */}
            <div className={`flex flex-col items-center justify-center h-36 rounded-xl border-2 border-dashed bg-white overflow-hidden relative transition-all duration-200 group ${
              errors.frontImage || frontError ? 'border-red-400 bg-red-50/30' : frontSuccess ? 'border-emerald-300 ring-2 ring-emerald-500/10' : 'border-slate-200/90 hover:border-teal-400'
            }`}>
              {/* Corner crosshairs for scanner effect */}
              <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-emerald-500/60 rounded-tl-xs pointer-events-none z-10"></div>
              <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-emerald-500/60 rounded-tr-xs pointer-events-none z-10"></div>
              <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-emerald-500/60 rounded-bl-xs pointer-events-none z-10"></div>
              <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-emerald-500/60 rounded-br-xs pointer-events-none z-10"></div>

              {frontPreview ? (
                <>
                  <img src={frontPreview} alt="ID Front" className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" />
                </>
              ) : (
                <div className="flex flex-col items-center text-center p-3 select-none">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mb-1.5 text-emerald-600 shadow-xs border border-emerald-100">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700">Front Side Photo</span>
                  <span className="text-[9px] font-medium text-slate-400 mt-0.5">Click buttons below to upload or snap</span>
                </div>
              )}

              {/* Uploading progress overlay */}
              {frontUploading && (
                <div className="absolute inset-0 bg-slate-900/75 backdrop-blur-[2px] flex flex-col items-center justify-center text-white p-3 z-20 animate-fade-in">
                  <Loader2 className="w-6 h-6 animate-spin mb-1.5 text-emerald-400" />
                  <span className="text-[10px] font-extrabold tracking-wider text-emerald-300">Optimizing &amp; Uploading...</span>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 max-w-[120px] overflow-hidden border border-slate-700">
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-150" style={{ width: `${frontProgress}%` }}></div>
                  </div>
                  <span className="text-[9px] text-slate-300 mt-1 font-bold">{frontProgress}%</span>
                </div>
              )}

              {/* Upload Error overlay */}
              {frontError && (
                <div className="absolute inset-0 bg-red-900/85 backdrop-blur-[1px] flex flex-col items-center justify-center text-white p-3 text-center z-20">
                  <span className="text-[10px] font-black uppercase tracking-wider text-red-200">Upload Failed</span>
                  <span className="text-[9px] mt-1 opacity-90 max-w-[150px] truncate">{frontError}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      if (frontBlob) {
                        const hotelId = getSessionUser()?.hotel?.id || 'default';
                        const targetFileName = `${hotelId}/${customerId}/front-${Date.now()}.webp`;
                        startBackgroundUpload('front', frontBlob, targetFileName);
                      }
                    }}
                    className="mt-2 text-[9px] font-extrabold bg-white text-red-700 px-3 py-1 rounded-lg shadow-sm active:scale-95 transition-all hover:bg-red-50"
                  >
                    Retry Upload
                  </button>
                </div>
              )}
            </div>

            {/* Catchy Action Buttons Row */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              {/* Upload File Button */}
              <label className={`flex items-center justify-center gap-2 py-2.5 px-2 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50/50 hover:border-emerald-300 text-slate-700 shadow-xs hover:shadow-sm transition-all duration-200 group cursor-pointer select-none active:scale-[0.98] ${
                frontUploading ? 'opacity-50 pointer-events-none' : ''
              }`}>
                <div className="w-6 h-6 rounded-lg bg-slate-100 group-hover:bg-emerald-600 group-hover:text-white text-slate-600 flex items-center justify-center transition-colors duration-200 shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col text-left leading-none">
                  <span className="text-[11px] font-extrabold text-slate-800 group-hover:text-emerald-700">Upload File</span>
                  <span className="text-[9px] text-slate-400 font-medium mt-0.5">Gallery / JPG</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'front')}
                  className="hidden"
                  disabled={frontUploading}
                />
              </label>

              {/* Take Photo Button */}
              <label className={`flex items-center justify-center gap-2 py-2.5 px-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white shadow-sm hover:shadow-md shadow-emerald-600/20 transition-all duration-200 group cursor-pointer select-none active:scale-[0.98] ${
                frontUploading ? 'opacity-50 pointer-events-none' : ''
              }`}>
                <div className="w-6 h-6 rounded-lg bg-white/20 text-white flex items-center justify-center group-hover:scale-110 transition-transform duration-200 shrink-0">
                  <Camera className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col text-left leading-none">
                  <span className="text-[11px] font-extrabold text-white tracking-wide">Take Photo</span>
                  <span className="text-[9px] text-emerald-100/90 font-medium mt-0.5">Live Camera</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleImageUpload(e, 'front')}
                  className="hidden"
                  disabled={frontUploading}
                />
              </label>
            </div>

            {errors.frontImage && (
              <span className="text-[10px] font-bold text-red-500 mt-1 block">{errors.frontImage}</span>
            )}
          </div>

          {/* Back Side */}
          <div className="bg-slate-50/60 p-3 rounded-2xl border border-slate-200/70 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                <FileText className="w-3 h-3 text-teal-600" />
                ID Back Side *
              </span>
              {backSuccess && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-extrabold shadow-xs">
                  <Check className="w-3 h-3" /> VERIFIED
                </span>
              )}
            </div>

            {/* Scanner Preview Frame */}
            <div className={`flex flex-col items-center justify-center h-36 rounded-xl border-2 border-dashed bg-white overflow-hidden relative transition-all duration-200 group ${
              errors.backImage || backError ? 'border-red-400 bg-red-50/30' : backSuccess ? 'border-emerald-300 ring-2 ring-emerald-500/10' : 'border-slate-200/90 hover:border-teal-400'
            }`}>
              {/* Corner crosshairs for scanner effect */}
              <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-teal-500/60 rounded-tl-xs pointer-events-none z-10"></div>
              <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-teal-500/60 rounded-tr-xs pointer-events-none z-10"></div>
              <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-teal-500/60 rounded-bl-xs pointer-events-none z-10"></div>
              <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-teal-500/60 rounded-br-xs pointer-events-none z-10"></div>

              {backPreview ? (
                <>
                  <img src={backPreview} alt="ID Back" className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" />
                </>
              ) : (
                <div className="flex flex-col items-center text-center p-3 select-none">
                  <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center mb-1.5 text-teal-600 shadow-xs border border-teal-100">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700">Back Side Photo</span>
                  <span className="text-[9px] font-medium text-slate-400 mt-0.5">Click buttons below to upload or snap</span>
                </div>
              )}

              {/* Uploading progress overlay */}
              {backUploading && (
                <div className="absolute inset-0 bg-slate-900/75 backdrop-blur-[2px] flex flex-col items-center justify-center text-white p-3 z-20 animate-fade-in">
                  <Loader2 className="w-6 h-6 animate-spin mb-1.5 text-teal-400" />
                  <span className="text-[10px] font-extrabold tracking-wider text-teal-300">Optimizing &amp; Uploading...</span>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 max-w-[120px] overflow-hidden border border-slate-700">
                    <div className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full transition-all duration-150" style={{ width: `${backProgress}%` }}></div>
                  </div>
                  <span className="text-[9px] text-slate-300 mt-1 font-bold">{backProgress}%</span>
                </div>
              )}

              {/* Upload Error overlay */}
              {backError && (
                <div className="absolute inset-0 bg-red-900/85 backdrop-blur-[1px] flex flex-col items-center justify-center text-white p-3 text-center z-20">
                  <span className="text-[10px] font-black uppercase tracking-wider text-red-200">Upload Failed</span>
                  <span className="text-[9px] mt-1 opacity-90 max-w-[150px] truncate">{backError}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      if (backBlob) {
                        const hotelId = getSessionUser()?.hotel?.id || 'default';
                        const targetFileName = `${hotelId}/${customerId}/back-${Date.now()}.webp`;
                        startBackgroundUpload('back', backBlob, targetFileName);
                      }
                    }}
                    className="mt-2 text-[9px] font-extrabold bg-white text-red-700 px-3 py-1 rounded-lg shadow-sm active:scale-95 transition-all hover:bg-red-50"
                  >
                    Retry Upload
                  </button>
                </div>
              )}
            </div>

            {/* Catchy Action Buttons Row */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              {/* Upload File Button */}
              <label className={`flex items-center justify-center gap-2 py-2.5 px-2 rounded-xl border border-slate-200 bg-white hover:bg-teal-50/50 hover:border-teal-300 text-slate-700 shadow-xs hover:shadow-sm transition-all duration-200 group cursor-pointer select-none active:scale-[0.98] ${
                backUploading ? 'opacity-50 pointer-events-none' : ''
              }`}>
                <div className="w-6 h-6 rounded-lg bg-slate-100 group-hover:bg-teal-600 group-hover:text-white text-slate-600 flex items-center justify-center transition-colors duration-200 shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col text-left leading-none">
                  <span className="text-[11px] font-extrabold text-slate-800 group-hover:text-teal-700">Upload File</span>
                  <span className="text-[9px] text-slate-400 font-medium mt-0.5">Gallery / JPG</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'back')}
                  className="hidden"
                  disabled={backUploading}
                />
              </label>

              {/* Take Photo Button */}
              <label className={`flex items-center justify-center gap-2 py-2.5 px-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white shadow-sm hover:shadow-md shadow-emerald-600/20 transition-all duration-200 group cursor-pointer select-none active:scale-[0.98] ${
                backUploading ? 'opacity-50 pointer-events-none' : ''
              }`}>
                <div className="w-6 h-6 rounded-lg bg-white/20 text-white flex items-center justify-center group-hover:scale-110 transition-transform duration-200 shrink-0">
                  <Camera className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col text-left leading-none">
                  <span className="text-[11px] font-extrabold text-white tracking-wide">Take Photo</span>
                  <span className="text-[9px] text-emerald-100/90 font-medium mt-0.5">Live Camera</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleImageUpload(e, 'back')}
                  className="hidden"
                  disabled={backUploading}
                />
              </label>
            </div>

            {errors.backImage && (
              <span className="text-[10px] font-bold text-red-500 mt-1 block">{errors.backImage}</span>
            )}
          </div>
        </div>
      </div>

      {/* Form Submission Buttons */}
      <div className="sticky-action-footer sm:static sm:flex sm:gap-3 sm:justify-end flex gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors active:scale-[0.96] min-h-[44px]"
          >
            Cancel
          </button>
        )}
        <LoadingButton
          type="submit"
          loading={loading || frontUploading || backUploading}
          loadingText={(frontUploading || backUploading) ? 'Uploading...' : 'Saving...'}
          className="flex-1 sm:flex-none bg-primary hover:bg-primary-hover text-white font-semibold text-xs px-6 py-3 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 min-h-[44px]"
        >
          Save Guest Details
        </LoadingButton>
      </div>
    </form>
  );
}
