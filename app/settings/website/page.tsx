'use client';

// ========================================================
// StayDesk CRM / HotelFlow CRM Website Builder Settings
// Location: app/settings/website/page.tsx
// ========================================================

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/DashboardLayout';
import { getSessionUser, db, setSessionUser } from '../../../lib/supabase/client';
import { Room } from '../../../types';
import { 
  Globe, 
  Save, 
  Plus, 
  Trash2, 
  HelpCircle, 
  Image as ImageIcon, 
  MapPin, 
  Phone, 
  Mail, 
  Video, 
  Link as LinkIcon 
} from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

export default function WebsiteSettingsPage() {
  const [currentHotel, setCurrentHotel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // CMS state
  const [hotelName, setHotelName] = useState('');
  const [tagline, setTagline] = useState('An Oasis of Timeless Luxury and Serenity');
  const [heroImage, setHeroImage] = useState('https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1600&q=80');
  const [heroVideo, setHeroVideo] = useState('https://assets.mixkit.co/videos/preview/mixkit-luxury-resort-with-swimming-pool-40618-large.mp4');
  const [aboutTitle, setAboutTitle] = useState('A Sanctuary of Sophisticated Living');
  const [aboutText, setAboutText] = useState('Nestled amidst gorgeous surroundings, our property offers visitors a breathtaking escape into relaxation. Every detail is curated to deliver unmatched hospitality and absolute comfort.');
  const [aboutOwnerMessage, setAboutOwnerMessage] = useState('We look forward to welcoming you to our paradise. It is our honor to create lifelong memories for every traveler.');
  
  // Contacts
  const [phoneVal, setPhoneVal] = useState('');
  const [emailVal, setEmailVal] = useState('');
  const [addressVal, setAddressVal] = useState('Beach Road, North Goa, Goa 403515');
  const [whatsappVal, setWhatsappVal] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3844.2014022416045!2d73.75338167590861!3d15.524584285078712!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bbfc1d560c5c363%3A0xc07cfb19cd7579bb!2sCalangute%20Beach!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin');

  // Socials
  const [instagram, setInstagram] = useState('https://instagram.com');
  const [facebook, setFacebook] = useState('https://facebook.com');
  const [twitter, setTwitter] = useState('https://twitter.com');

  // FAQs
  const [faqs, setFaqs] = useState<FAQItem[]>([
    { question: 'What are the check-in and check-out timings?', answer: 'Our standard check-in time is 2:00 PM and check-out time is 11:00 AM. Early check-in or late check-out is subject to availability.' },
    { question: 'Do you offer airport transfers?', answer: 'Yes, we provide luxury private airport pickups and drop-offs at a nominal additional charge. Please coordinate with reception at least 24 hours prior.' },
    { question: 'Is breakfast included in the booking?', answer: 'A buffet breakfast is complimentary with all room stays and is served at our fine-dining restaurant from 7:30 AM to 10:30 AM.' }
  ]);

  // Gallery
  const [gallery, setGallery] = useState<string[]>([
    'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80'
  ]);

  // Room Customization Settings
  const [roomConfigs, setRoomConfigs] = useState<Record<string, { id?: string; image: string; images?: string[]; price: number; description: string; amenities: string[] }>>({
    'Deluxe Room': {
      price: 2500,
      description: 'A spacious room featuring a queen-size bed, high-speed Wi-Fi, and a beautiful pool view.',
      image: 'https://images.unsplash.com/photo-1611891487122-2075b962442f?auto=format&fit=crop&w=800&q=80',
      images: [
        'https://images.unsplash.com/photo-1611891487122-2075b962442f?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80'
      ],
      amenities: ['Free WiFi', 'Air Conditioning', 'Room Service', 'Pool View']
    },
    'Super Deluxe Room': {
      price: 3500,
      description: 'Indulge in extra space and luxury, with a king-size bed, private balcony, and spectacular ocean views.',
      image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
      images: [
        'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80'
      ],
      amenities: ['Free WiFi', 'Air Conditioning', 'Minibar', 'Balcony', 'Ocean View']
    },
    'Family Suite': {
      price: 5000,
      description: 'Perfect for families. Two interconnected bedrooms, premium linens, and personalized butler service.',
      image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
      images: [
        'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80'
      ],
      amenities: ['Free WiFi', 'Air Conditioning', 'Kid\'s Play Area', 'Butler Service']
    },
    'Executive Suite': {
      price: 7500,
      description: 'Our finest accommodation. Enjoy ultimate luxury, private hot tub, lounge access, and panoramic city views.',
      image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80',
      images: [
        'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80'
      ],
      amenities: ['Free WiFi', 'Air Conditioning', 'Hot Tub', 'Butler Service', 'Lounge Access']
    }
  });

  const handleRoomConfigChange = (roomType: string, field: string, value: any) => {
    setRoomConfigs(prev => ({
      ...prev,
      [roomType]: {
        ...prev[roomType],
        [field]: value
      }
    }));
  };

  const handleRoomImageUpload = (e: React.ChangeEvent<HTMLInputElement>, roomType: string, imgIdx: number) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Only image files are allowed');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const currentImages = [...(roomConfigs[roomType]?.images || ['', '', ''])];
        currentImages[imgIdx] = reader.result as string;

        setRoomConfigs(prev => ({
          ...prev,
          [roomType]: {
            ...prev[roomType],
            images: currentImages,
            ...(imgIdx === 0 && { image: reader.result as string })
          }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRoomImageTextChange = (roomType: string, imgIdx: number, value: string) => {
    const currentImages = [...(roomConfigs[roomType]?.images || ['', '', ''])];
    currentImages[imgIdx] = value;

    setRoomConfigs(prev => ({
      ...prev,
      [roomType]: {
        ...prev[roomType],
        images: currentImages,
        ...(imgIdx === 0 && { image: value })
      }
    }));
  };

  useEffect(() => {
    const session = getSessionUser();
    if (session && session.hotel) {
      const hotel = session.hotel;
      setCurrentHotel(hotel);
      setHotelName(hotel.hotel_name);
      setPhoneVal(hotel.phone || '');
      setEmailVal(hotel.email || '');

      const loadCMSAndRooms = async () => {
        try {
          // 1. Load CMS from database (hotel.cms_data) or fallback to local storage
          const savedCMS = hotel.cms_data || {};
          const localCMS = localStorage.getItem(`hf_cms_${hotel.id}`);
          const cms = (Object.keys(savedCMS).length > 0) ? savedCMS : (localCMS ? JSON.parse(localCMS) : {});

          if (cms.tagline) setTagline(cms.tagline);
          if (cms.heroImage) setHeroImage(cms.heroImage);
          if (cms.heroVideo) setHeroVideo(cms.heroVideo);
          if (cms.aboutTitle) setAboutTitle(cms.aboutTitle);
          if (cms.aboutText) setAboutText(cms.aboutText);
          if (cms.aboutOwnerMessage) setAboutOwnerMessage(cms.aboutOwnerMessage);
          if (cms.addressVal) setAddressVal(cms.addressVal);
          if (cms.whatsappVal) setWhatsappVal(cms.whatsappVal);
          if (cms.googleMapsUrl) setGoogleMapsUrl(cms.googleMapsUrl);
          if (cms.instagram) setInstagram(cms.instagram);
          if (cms.facebook) setFacebook(cms.facebook);
          if (cms.twitter) setTwitter(cms.twitter);
          if (cms.faqs) setFaqs(cms.faqs);
          if (cms.gallery) setGallery(cms.gallery);

          // 2. Load rooms from database
          const roomsList = await db.getRooms(hotel.id);
          const initialConfigs: Record<string, any> = { ...roomConfigs };

          const defaultConfigMap: Record<string, { price: number; description: string; image: string; images: string[]; amenities: string[] }> = {
            'Deluxe Room': {
              price: 2500,
              description: 'A spacious room featuring a queen-size bed, high-speed Wi-Fi, and a beautiful pool view.',
              image: 'https://images.unsplash.com/photo-1611891487122-2075b962442f?auto=format&fit=crop&w=800&q=80',
              images: [
                'https://images.unsplash.com/photo-1611891487122-2075b962442f?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80'
              ],
              amenities: ['Free WiFi', 'Air Conditioning', 'Room Service', 'Pool View']
            },
            'Super Deluxe Room': {
              price: 3500,
              description: 'Indulge in extra space and luxury, with a king-size bed, private balcony, and spectacular ocean views.',
              image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
              images: [
                'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80'
              ],
              amenities: ['Free WiFi', 'Air Conditioning', 'Minibar', 'Balcony', 'Ocean View']
            },
            'Family Suite': {
              price: 5000,
              description: 'Perfect for families. Two interconnected bedrooms, premium linens, and personalized butler service.',
              image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
              images: [
                'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80'
              ],
              amenities: ['Free WiFi', 'Air Conditioning', 'Kid\'s Play Area', 'Butler Service']
            },
            'Executive Suite': {
              price: 7500,
              description: 'Our finest accommodation. Enjoy ultimate luxury, private hot tub, lounge access, and panoramic city views.',
              image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80',
              images: [
                'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80'
              ],
              amenities: ['Free WiFi', 'Air Conditioning', 'Hot Tub', 'Butler Service', 'Lounge Access']
            }
          };

          roomsList.forEach((r: Room) => {
            const defaults = defaultConfigMap[r.room_type] || {
              price: 2000,
              description: 'A premium, beautifully appointed room featuring state of the art hospitality amenities.',
              image: '',
              images: ['', '', ''],
              amenities: ['Free WiFi', 'Air Conditioning']
            };

            const oldRoomCMS = cms.rooms?.[r.room_type] || {};
            const oldImages = oldRoomCMS.images || (oldRoomCMS.image ? [oldRoomCMS.image] : []);
            const defaultImagesList = defaultConfigMap[r.room_type]?.images || [defaults.image];
            
            const finalImages = [
              oldImages[0] || r.image_url || oldRoomCMS.image || defaultImagesList[0] || '',
              oldImages[1] || defaultImagesList[1] || '',
              oldImages[2] || defaultImagesList[2] || ''
            ];

            initialConfigs[r.room_type] = {
              id: r.id,
              price: r.price || oldRoomCMS.price || defaults.price,
              image: finalImages[0],
              images: finalImages,
              description: oldRoomCMS.description || defaults.description,
              amenities: oldRoomCMS.amenities || defaults.amenities
            };
          });

          setRoomConfigs(initialConfigs);
        } catch (e) {
          console.error('Error loading brand customization options:', e);
        } finally {
          setLoading(false);
        }
      };

      loadCMSAndRooms();
    } else {
      setLoading(false);
    }
  }, []);

  const handleSaveCMS = async () => {
    if (!currentHotel) return;
    setSaving(true);

    try {
      // 1. Perform direct atomic database updates for room prices and photos first
      // This uploads any base64 images to Supabase Storage and returns clean public URLs
      const updatedConfigs = { ...roomConfigs };
      const roomTypes = Object.keys(roomConfigs);
      
      for (const type of roomTypes) {
        const config = roomConfigs[type];
        if (config.id) {
          const currentImages = config.images || [config.image || '', '', ''];
          const cleanImages = [];
          for (let i = 0; i < currentImages.length; i++) {
            let img = currentImages[i];
            if (img && img.startsWith('data:')) {
              // @ts-ignore
              img = await db.uploadPublicAsset(currentHotel.id, `rooms/${config.id}`, img);
            }
            cleanImages.push(img || '');
          }

          const updatedRoom = await db.updateRoomDetails(currentHotel.id, config.id, {
            price: Number(config.price),
            image_url: cleanImages[0]
          });
          
          if (updatedRoom) {
            updatedConfigs[type] = {
              ...config,
              price: updatedRoom.price,
              image: updatedRoom.image_url || '',
              images: cleanImages
            };
          }
        }
      }

      // Update roomConfigs state with clean URLs
      setRoomConfigs(updatedConfigs);

      // 2. Compile cmsData with clean public URLs (no Base64!)
      const cmsData = {
        tagline,
        heroImage,
        heroVideo,
        aboutTitle,
        aboutText,
        aboutOwnerMessage,
        addressVal,
        whatsappVal,
        googleMapsUrl,
        instagram,
        facebook,
        twitter,
        faqs,
        gallery,
        rooms: updatedConfigs
      };

      // 3. Update brand config json inside the hotels table
      const updatedHotel = await db.updateHotelCMS(currentHotel.id, cmsData);
      if (updatedHotel) {
        const session = getSessionUser();
        if (session) {
          session.hotel = updatedHotel;
          setSessionUser(session);
          setCurrentHotel(updatedHotel);
        }
      }

      // Update backup compatibility fallback local storage values
      localStorage.setItem(`hf_cms_${currentHotel.id}`, JSON.stringify(cmsData));

      // Broadcast changes
      const channel = new BroadcastChannel('hotelflow-sync');
      channel.postMessage({ type: 'DB_UPDATE' });
      channel.close();

      alert('Brand website settings and room details saved successfully to database!');
    } catch (err: any) {
      console.error(err);
      const errMsg = err?.message || err?.error_description || (typeof err === 'string' ? err : JSON.stringify(err));
      alert('Failed to save settings: ' + errMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleAddFaq = () => {
    setFaqs(prev => [...prev, { question: 'New Question', answer: 'New Answer' }]);
  };

  const handleRemoveFaq = (idx: number) => {
    setFaqs(prev => prev.filter((_, i) => i !== idx));
  };

  const handleFaqChange = (idx: number, field: keyof FAQItem, val: string) => {
    setFaqs(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  };

  const handleGalleryChange = (idx: number, val: string) => {
    setGallery(prev => prev.map((url, i) => i === idx ? val : url));
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-[65vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl pb-20">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              Website Builder & CMS
            </h1>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Customize your guest-facing brand landing page live at "/"</p>
          </div>

          <button
            onClick={handleSaveCMS}
            disabled={saving}
            className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-5 py-3 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 self-start sm:self-auto disabled:opacity-50"
          >
            {saving ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-t-transparent"></div>
            ) : (
              <>
                <Save className="w-4.5 h-4.5" />
                Publish Changes Live
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main CMS Editor Forms */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* HERO SECTION */}
            <div className="bg-white rounded-[24px] border border-[#E2E8F0]/40 p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-50 pb-2 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-primary" />
                Hero Banner Settings
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Luxury Tagline</label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-[#E2E8F0]/80 rounded-xl p-3 focus:bg-white focus:outline-none"
                    placeholder="e.g. An Oasis of Timeless Luxury and Serenity"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Hero Image URL (Background / Upload file)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={heroImage}
                      onChange={(e) => setHeroImage(e.target.value)}
                      className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-[#E2E8F0]/80 rounded-xl p-3 focus:bg-white focus:outline-none flex-1 truncate"
                      placeholder="URL to high-quality backdrop photo"
                    />
                    <label className="bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 font-bold px-4 py-3 rounded-xl transition-colors text-xs flex items-center justify-center cursor-pointer shrink-0">
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 5 * 1024 * 1024) {
                              alert('Image must be less than 5MB');
                              return;
                            }
                            const reader = new FileReader();
                            reader.onloadend = async () => {
                              try {
                                // @ts-ignore
                                const uploadedUrl = await db.uploadPublicAsset(currentHotel.id, 'hero', reader.result as string);
                                setHeroImage(uploadedUrl);
                              } catch (err: any) {
                                alert('Failed to upload hero image: ' + err.message);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Promotional Video URL (Background / Frame)</label>
                  <input
                    type="text"
                    value={heroVideo}
                    onChange={(e) => setHeroVideo(e.target.value)}
                    className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-[#E2E8F0]/80 rounded-xl p-3 focus:bg-white focus:outline-none"
                    placeholder="URL to promotional video stream (.mp4)"
                  />
                </div>
              </div>
            </div>

            {/* ABOUT US SECTION */}
            <div className="bg-white rounded-[24px] border border-[#E2E8F0]/40 p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-50 pb-2 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-primary" />
                Hotel Introduction & Story
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">About Section Title</label>
                  <input
                    type="text"
                    value={aboutTitle}
                    onChange={(e) => setAboutTitle(e.target.value)}
                    className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-[#E2E8F0]/80 rounded-xl p-3 focus:bg-white focus:outline-none"
                    placeholder="e.g. A Sanctuary of Sophisticated Living"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Introduction Text</label>
                  <textarea
                    value={aboutText}
                    onChange={(e) => setAboutText(e.target.value)}
                    rows={4}
                    className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-[#E2E8F0]/80 rounded-xl p-3 focus:bg-white focus:outline-none"
                    placeholder="Write a beautiful narrative intro about your property..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Owner's Message</label>
                  <textarea
                    value={aboutOwnerMessage}
                    onChange={(e) => setAboutOwnerMessage(e.target.value)}
                    rows={2}
                    className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-[#E2E8F0]/80 rounded-xl p-3 focus:bg-white focus:outline-none"
                    placeholder="A welcome quote from the owner..."
                  />
                </div>
              </div>
            </div>

            {/* ROOM CUSTOMIZATION SETTINGS */}
            <div className="bg-white rounded-[24px] border border-[#E2E8F0]/40 p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-50 pb-2 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-primary" />
                Signature Suites Customization (Pricing & Photos)
              </h3>

              <div className="space-y-6">
                {Object.keys(roomConfigs).map((roomType) => {
                  const rConfig = roomConfigs[roomType] || {};
                  return (
                    <div key={roomType} className="p-4 rounded-xl border border-slate-100 bg-slate-50/20 space-y-3">
                      <h4 className="text-xs font-bold text-[#0F4C45]">{roomType}</h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Price per Night (₹)</label>
                          <input
                            type="number"
                            value={rConfig.price || ''}
                            onChange={(e) => handleRoomConfigChange(roomType, 'price', Number(e.target.value))}
                            className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-[#E2E8F0]/80 rounded-xl p-2.5 focus:bg-white focus:outline-none"
                            placeholder="e.g. 2500"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Suite Photos (up to 3 for Showcase gallery)</label>
                          {[0, 1, 2].map((imgIdx) => {
                            const currentImages = rConfig.images || [rConfig.image || '', '', ''];
                            const urlVal = currentImages[imgIdx] || '';
                            return (
                              <div key={imgIdx} className="flex gap-2">
                                <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-2 rounded-xl flex items-center justify-center shrink-0 w-6">
                                  #{imgIdx + 1}
                                </span>
                                <input
                                  type="text"
                                  value={urlVal}
                                  onChange={(e) => handleRoomImageTextChange(roomType, imgIdx, e.target.value)}
                                  className="w-full text-xs font-semibold text-slate-600 bg-slate-50/50 border border-[#E2E8F0]/80 rounded-xl p-2.5 focus:bg-white focus:outline-none flex-1 truncate"
                                  placeholder={`Photo #${imgIdx + 1} URL`}
                                />
                                <label className="bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl transition-colors text-[10px] flex items-center justify-center cursor-pointer shrink-0">
                                  Upload
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleRoomImageUpload(e, roomType, imgIdx)}
                                    className="hidden"
                                  />
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Suite Description</label>
                          <textarea
                            value={rConfig.description || ''}
                            onChange={(e) => handleRoomConfigChange(roomType, 'description', e.target.value)}
                            rows={2}
                            className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-[#E2E8F0]/80 rounded-xl p-2.5 focus:bg-white focus:outline-none resize-none"
                            placeholder="Brief description of the room..."
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* WEBSITE GALLERY */}
            <div className="bg-white rounded-[24px] border border-[#E2E8F0]/40 p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-50 pb-2 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-primary" />
                Hotel Portfolio Gallery (6 Photos)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {gallery.map((url, idx) => (
                  <div key={idx}>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Image #{idx + 1} (Upload or paste URL)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={url}
                        onChange={(e) => handleGalleryChange(idx, e.target.value)}
                        className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-[#E2E8F0]/80 rounded-xl p-2.5 focus:bg-white focus:outline-none flex-1 truncate"
                        placeholder={`Image #${idx + 1} URL`}
                      />
                      <label className="bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2.5 rounded-xl transition-colors text-[10px] flex items-center justify-center cursor-pointer shrink-0">
                        Upload
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 5 * 1024 * 1024) {
                                alert('Image must be less than 5MB');
                                return;
                              }
                              const reader = new FileReader();
                              reader.onloadend = async () => {
                                try {
                                  // @ts-ignore
                                  const uploadedUrl = await db.uploadPublicAsset(currentHotel.id, 'gallery', reader.result as string);
                                  handleGalleryChange(idx, uploadedUrl);
                                } catch (err: any) {
                                  alert('Failed to upload gallery image: ' + err.message);
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* FREQUENTLY ASKED QUESTIONS */}
            <div className="bg-white rounded-[24px] border border-[#E2E8F0]/40 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-primary" />
                  Frequently Asked Questions (FAQ)
                </h3>
                <button
                  type="button"
                  onClick={handleAddFaq}
                  className="bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold px-3 py-1.5 rounded-lg transition-colors text-[10px] flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add FAQ
                </button>
              </div>

              <div className="space-y-4">
                {faqs.map((faq, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-slate-50/20 space-y-3 relative group">
                    <button
                      type="button"
                      onClick={() => handleRemoveFaq(idx)}
                      className="absolute top-3 right-3 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div>
                      <input
                        type="text"
                        value={faq.question}
                        onChange={(e) => handleFaqChange(idx, 'question', e.target.value)}
                        className="w-full text-xs font-bold text-slate-800 bg-transparent border-b border-slate-200 focus:border-primary focus:outline-none pb-1"
                        placeholder="Question"
                      />
                    </div>
                    <div>
                      <textarea
                        value={faq.answer}
                        onChange={(e) => handleFaqChange(idx, 'answer', e.target.value)}
                        rows={2}
                        className="w-full text-xs text-slate-600 bg-transparent border-none focus:outline-none p-0 resize-none font-medium"
                        placeholder="Answer details..."
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right sidebar fields (Branding, Maps, Socials) */}
          <div className="space-y-6">
            
            {/* CONTACT DETAILS */}
            <div className="bg-white rounded-[24px] border border-[#E2E8F0]/40 p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-50 pb-2 flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-primary" />
                Contact Info
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Display Phone Number</label>
                  <input
                    type="text"
                    value={phoneVal}
                    onChange={(e) => setPhoneVal(e.target.value)}
                    className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-[#E2E8F0]/80 rounded-xl p-3 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Display Email Address</label>
                  <input
                    type="text"
                    value={emailVal}
                    onChange={(e) => setEmailVal(e.target.value)}
                    className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-[#E2E8F0]/80 rounded-xl p-3 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Property Address</label>
                  <textarea
                    value={addressVal}
                    onChange={(e) => setAddressVal(e.target.value)}
                    rows={2.5}
                    className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-[#E2E8F0]/80 rounded-xl p-3 focus:bg-white focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">WhatsApp Contact Number</label>
                  <input
                    type="text"
                    value={whatsappVal}
                    onChange={(e) => setWhatsappVal(e.target.value)}
                    className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-[#E2E8F0]/80 rounded-xl p-3 focus:bg-white focus:outline-none"
                    placeholder="e.g. 9876543210 (without +91/country code)"
                  />
                </div>
              </div>
            </div>

            {/* LOCATION MAP */}
            <div className="bg-white rounded-[24px] border border-[#E2E8F0]/40 p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-50 pb-2 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-primary" />
                Google Map Embed
              </h3>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Map src Iframe URL</label>
                <textarea
                  value={googleMapsUrl}
                  onChange={(e) => setGoogleMapsUrl(e.target.value)}
                  rows={4}
                  className="w-full text-xs font-semibold text-slate-600 bg-slate-50/50 border border-[#E2E8F0]/80 rounded-xl p-3 focus:bg-white focus:outline-none"
                  placeholder="https://www.google.com/maps/embed?pb=..."
                />
              </div>
            </div>

            {/* SOCIAL CONNECTIONS */}
            <div className="bg-white rounded-[24px] border border-[#E2E8F0]/40 p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-50 pb-2 flex items-center gap-1.5">
                <LinkIcon className="w-4 h-4 text-primary" />
                Social Profiles
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Instagram Link</label>
                  <input
                    type="text"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-[#E2E8F0]/80 rounded-xl p-3 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Facebook Link</label>
                  <input
                    type="text"
                    value={facebook}
                    onChange={(e) => setFacebook(e.target.value)}
                    className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-[#E2E8F0]/80 rounded-xl p-3 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Twitter/X Link</label>
                  <input
                    type="text"
                    value={twitter}
                    onChange={(e) => setTwitter(e.target.value)}
                    className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-[#E2E8F0]/80 rounded-xl p-3 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
