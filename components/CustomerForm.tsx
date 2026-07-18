'use client';

// ========================================================
// StayDesk CRM / HotelFlow CRM Customer Registration Form
// Location: components/CustomerForm.tsx
// ========================================================

import React, { useState } from 'react';
import { User, Phone, MapPin, ShieldAlert, Upload, Check } from 'lucide-react';
import { Customer } from '../types';
import { STATE_CITIES } from '../lib/constants/statesCities';

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

  // Documents
  const [docType, setDocType] = useState<'Aadhar' | 'Driving License' | 'Passport' | 'Voter ID'>(initialDoc?.type || 'Aadhar');
  const [docNumber, setDocNumber] = useState(initialDoc?.number || '');
  const [frontImage, setFrontImage] = useState<string>(initialDoc?.front || '');
  const [backImage, setBackImage] = useState<string>(initialDoc?.back || '');

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, [side + 'Image']: 'Only image files are allowed' }));
        return;
      }
      // Validate file size (max 5MB to prevent database bloat)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, [side + 'Image']: 'Image size must be less than 5MB' }));
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        if (side === 'front') {
          setFrontImage(reader.result as string);
          setErrors(prev => {
            const copy = { ...prev };
            delete copy.frontImage;
            return copy;
          });
        } else {
          setBackImage(reader.result as string);
          setErrors(prev => {
            const copy = { ...prev };
            delete copy.backImage;
            return copy;
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDocTypeChange = (type: 'Aadhar' | 'Driving License' | 'Passport' | 'Voter ID') => {
    setDocType(type);
    setDocNumber('');
    setFrontImage('');
    setBackImage('');
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
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-150 pb-2 flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 text-primary" />
          Document Upload & Verification
        </h3>

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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">ID Card Front Side *</span>
            <label className={`flex flex-col items-center justify-center h-36 rounded-xl border border-dashed bg-slate-50/50 hover:bg-slate-50 cursor-pointer overflow-hidden transition-all relative ${
              errors.frontImage ? 'border-red-500 animate-pulse' : 'border-slate-200'
            }`}>
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
            {errors.frontImage && (
              <span className="text-[10px] font-bold text-red-500 mt-1 block">{errors.frontImage}</span>
            )}
          </div>

          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">ID Card Back Side *</span>
            <label className={`flex flex-col items-center justify-center h-36 rounded-xl border border-dashed bg-slate-50/50 hover:bg-slate-50 cursor-pointer overflow-hidden transition-all relative ${
              errors.backImage ? 'border-red-500 animate-pulse' : 'border-slate-200'
            }`}>
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
            {errors.backImage && (
              <span className="text-[10px] font-bold text-red-500 mt-1 block">{errors.backImage}</span>
            )}
          </div>
        </div>
      </div>

      {/* Form Submission Buttons */}
      <div className="flex gap-3 justify-end">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="bg-primary hover:bg-primary-hover text-white font-semibold text-xs px-6 py-3 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-55"
        >
          {loading ? 'Saving Guest...' : 'Save Guest Details'}
        </button>
      </div>
    </form>
  );
}
