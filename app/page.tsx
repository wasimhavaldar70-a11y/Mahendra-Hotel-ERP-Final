'use client';

// ========================================================
// StayDesk CRM / HotelFlow CRM Luxury Customer Portal
// Location: app/page.tsx
// ========================================================

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '../lib/supabase/client';
import { 
  Menu, 
  X, 
  ChevronRight, 
  Check, 
  Phone, 
  Mail, 
  MapPin, 
  Compass, 
  CalendarDays, 
  Users, 
  FileText, 
  HeartHandshake, 
  Sparkles, 
  MessageSquare,
  HelpCircle,
  Play,
  ArrowRight
} from 'lucide-react';

export default function PublicHotelWebsite() {
  const [hotel, setHotel] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // Booking form states
  const [bookName, setBookName] = useState('');
  const [bookPhone, setBookPhone] = useState('');
  const [bookEmail, setBookEmail] = useState('');
  const [bookCheckIn, setBookCheckIn] = useState('');
  const [bookCheckOut, setBookCheckOut] = useState('');
  const [bookGuests, setBookGuests] = useState(2);
  const [bookRoomType, setBookRoomType] = useState('Deluxe Room');
  const [bookNotes, setBookNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // CMS configuration defaults
  const [cms, setCms] = useState<any>({
    tagline: 'An Oasis of Timeless Luxury and Serenity',
    heroImage: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1600&q=80',
    heroVideo: 'https://assets.mixkit.co/videos/preview/mixkit-luxury-resort-with-swimming-pool-40618-large.mp4',
    aboutTitle: 'A Sanctuary of Sophisticated Living',
    aboutText: 'Nestled amidst gorgeous surroundings, our property offers visitors a breathtaking escape into relaxation. Every detail is curated to deliver unmatched hospitality and absolute comfort.',
    aboutOwnerMessage: 'We look forward to welcoming you to our paradise. It is our honor to create lifelong memories for every traveler.',
    addressVal: 'Beach Road, North Goa, Goa 403515',
    whatsappVal: '',
    googleMapsUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3844.2014022416045!2d73.75338167590861!3d15.524584285078712!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bbfc1d560c5c363%3A0xc07cfb19cd7579bb!2sCalangute%20Beach!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin',
    instagram: 'https://instagram.com',
    facebook: 'https://facebook.com',
    twitter: 'https://twitter.com',
    faqs: [
      { question: 'What are the check-in and check-out timings?', answer: 'Our standard check-in time is 2:00 PM and check-out time is 11:00 AM. Early check-in or late check-out is subject to availability.' },
      { question: 'Do you offer airport transfers?', answer: 'Yes, we provide luxury private airport pickups and drop-offs at a nominal additional charge. Please coordinate with reception at least 24 hours prior.' },
      { question: 'Is breakfast included in the booking?', answer: 'A buffet breakfast is complimentary with all room stays and is served at our fine-dining restaurant from 7:30 AM to 10:30 AM.' }
    ],
    gallery: [
      'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80'
    ],
    rooms: {
      'Deluxe Room': {
        price: 2500,
        description: 'A spacious room featuring a queen-size bed, high-speed Wi-Fi, and a beautiful pool view.',
        image: 'https://images.unsplash.com/photo-1611891487122-2075b962442f?auto=format&fit=crop&w=800&q=80',
        amenities: ['Free WiFi', 'Air Conditioning', 'Room Service', 'Pool View']
      },
      'Super Deluxe Room': {
        price: 3500,
        description: 'Indulge in extra space and luxury, with a king-size bed, private balcony, and spectacular ocean views.',
        image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
        amenities: ['Free WiFi', 'Air Conditioning', 'Minibar', 'Balcony', 'Ocean View']
      },
      'Family Suite': {
        price: 5000,
        description: 'Perfect for families. Two interconnected bedrooms, premium linens, and personalized butler service.',
        image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
        amenities: ['Free WiFi', 'Air Conditioning', 'Kid\'s Play Area', 'Butler Service']
      },
      'Executive Suite': {
        price: 7500,
        description: 'Our finest accommodation. Enjoy ultimate luxury, private hot tub, lounge access, and panoramic city views.',
        image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80',
        amenities: ['Free WiFi', 'Air Conditioning', 'Hot Tub', 'Butler Service', 'Lounge Access']
      }
    }
  });

  const roomDisplayConfigs: Record<string, { image: string; description: string; amenities: string[] }> = {
    'Deluxe Room': {
      description: 'A spacious room featuring a queen-size bed, high-speed Wi-Fi, and a beautiful pool view.',
      image: 'https://images.unsplash.com/photo-1611891487122-2075b962442f?auto=format&fit=crop&w=800&q=80',
      amenities: ['Free WiFi', 'Air Conditioning', 'Room Service', 'Pool View']
    },
    'Super Deluxe Room': {
      description: 'Indulge in extra space and luxury, with a king-size bed, private balcony, and spectacular ocean views.',
      image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
      amenities: ['Free WiFi', 'Air Conditioning', 'Minibar', 'Balcony', 'Ocean View']
    },
    'Family Suite': {
      description: 'Perfect for families. Two interconnected bedrooms, premium linens, and personalized butler service.',
      image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
      amenities: ['Free WiFi', 'Air Conditioning', 'Kid\'s Play Area', 'Butler Service']
    },
    'Executive Suite': {
      description: 'Our finest accommodation. Enjoy ultimate luxury, private hot tub, lounge access, and panoramic city views.',
      image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80',
      amenities: ['Free WiFi', 'Air Conditioning', 'Hot Tub', 'Butler Service', 'Lounge Access']
    }
  };

  const loadData = async () => {
    try {
      const hotelsList = await db.getHotels();
      if (hotelsList && hotelsList.length > 0) {
        const activeHotel = hotelsList[0];
        setHotel(activeHotel);

        const roomsList = await db.getRooms(activeHotel.id);
        setRooms(roomsList);

        // Fetch CMS settings if saved
        const savedCMS = localStorage.getItem(`hf_cms_${activeHotel.id}`);
        if (savedCMS) {
          setCms((prev: any) => ({ ...prev, ...JSON.parse(savedCMS) }));
        }
      }
    } catch (e) {
      console.error('Failed to load hotel website', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen for updates from settings
    const channel = new BroadcastChannel('hotelflow-sync');
    channel.onmessage = (event) => {
      if (event.data && event.data.type === 'DB_UPDATE') {
        loadData();
      }
    };
    return () => {
      channel.close();
    };
  }, []);

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotel) return;

    if (!bookName || !bookPhone || !bookEmail || !bookCheckIn || !bookCheckOut) {
      alert('Please fill out all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      await db.createWebBooking(hotel.id, {
        full_name: bookName,
        phone: bookPhone,
        email: bookEmail,
        check_in: new Date(bookCheckIn).toISOString(),
        expected_checkout: new Date(bookCheckOut).toISOString(),
        number_of_guests: Number(bookGuests),
        room_type: bookRoomType,
        special_requests: bookNotes
      });

      alert(`Thank you ${bookName}! Your booking request is submitted and pending review. Our staff will contact you shortly to confirm!`);
      
      // Reset form & close
      setBookName('');
      setBookPhone('');
      setBookEmail('');
      setBookCheckIn('');
      setBookCheckOut('');
      setBookNotes('');
      setShowBookingModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to submit booking');
    } finally {
      setSubmitting(false);
    }
  };

  // Group rooms by type to show one of each configuration on showcase
  const uniqueRoomTypes = rooms.reduce((acc, current) => {
    const type = current.room_type;
    if (!acc.some((item: any) => item.room_type === type)) {
      acc.push(current);
    }
    return acc;
  }, [] as any[]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FCFBF7]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
          <span className="text-sm font-bold text-slate-500 font-serif">Humble Heavens...</span>
        </div>
      </div>
    );
  }

  const hotelNameDisplay = hotel?.hotel_name || 'Humble Heavens Palace';

  return (
    <div className="min-h-screen bg-[#FCFBF7] text-[#1A1F26] font-sans antialiased selection:bg-primary/10 selection:text-primary">
      
      {/* Floating Header */}
      <header className="fixed top-0 inset-x-0 z-40 bg-white/70 backdrop-blur-lg border-b border-[#E2E8F0]/30 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#0F4C45] text-white flex items-center justify-center font-bold text-lg font-serif">
              H
            </div>
            <span className="font-extrabold text-base font-serif tracking-tight text-[#0F4C45]">
              {hotelNameDisplay}
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-8 text-[11px] font-black uppercase tracking-widest text-slate-500">
            <a href="#about" className="hover:text-primary transition-colors">About Us</a>
            <a href="#rooms" className="hover:text-primary transition-colors">Our Suites</a>
            <a href="#amenities" className="hover:text-primary transition-colors">Amenities</a>
            <a href="#gallery" className="hover:text-primary transition-colors">Gallery</a>
            <a href="#faq" className="hover:text-primary transition-colors">FAQ</a>
            <a href="#location" className="hover:text-primary transition-colors">Location</a>
          </nav>

          <div className="hidden lg:flex items-center gap-4">
            <Link 
              href="/admin" 
              className="text-[11px] font-black uppercase tracking-widest text-[#0F4C45] hover:text-[#12372A]"
            >
              Staff Portal
            </Link>
            <button
              onClick={() => setShowBookingModal(true)}
              className="bg-primary hover:bg-primary-hover text-white text-[11px] font-black uppercase tracking-widest px-5 py-3 rounded-xl shadow-md transition-all"
            >
              Book Stay
            </button>
          </div>

          {/* Mobile Menu Trigger */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-slate-600 hover:text-slate-900"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Nav Menu Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-100 bg-white/95 backdrop-blur-xl px-6 py-8 space-y-6 animate-fade-in absolute top-20 inset-x-0 shadow-lg">
            <nav className="flex flex-col gap-4 text-xs font-black uppercase tracking-widest text-slate-500">
              <a href="#about" onClick={() => setMobileMenuOpen(false)} className="hover:text-primary">About Us</a>
              <a href="#rooms" onClick={() => setMobileMenuOpen(false)} className="hover:text-primary">Our Suites</a>
              <a href="#amenities" onClick={() => setMobileMenuOpen(false)} className="hover:text-primary">Amenities</a>
              <a href="#gallery" onClick={() => setMobileMenuOpen(false)} className="hover:text-primary">Gallery</a>
              <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="hover:text-primary">FAQ</a>
              <a href="#location" onClick={() => setMobileMenuOpen(false)} className="hover:text-primary font-bold">Location</a>
            </nav>
            <div className="h-[1px] bg-slate-100"></div>
            <div className="flex flex-col gap-3">
              <Link 
                href="/admin" 
                className="text-xs font-black uppercase tracking-widest text-center text-[#0F4C45] border border-[#0F4C45]/20 py-3 rounded-xl"
              >
                Staff Portal
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowBookingModal(true);
                }}
                className="bg-primary hover:bg-primary-hover text-white text-xs font-black uppercase tracking-widest py-3.5 rounded-xl shadow-md text-center w-full"
              >
                Book Stay Now
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center pt-20">
        <div className="absolute inset-0 z-0">
          <img 
            src={cms.heroImage} 
            alt="Luxury resort banner" 
            className="w-full h-full object-cover brightness-[0.7]" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#FCFBF7] via-black/10 to-black/30"></div>
        </div>

        <div className="max-w-4xl mx-auto px-6 text-center relative z-10 text-white space-y-6">
          <span className="text-[11px] font-black uppercase tracking-[0.25em] text-[#D4AF37] block bg-black/30 backdrop-blur-md px-4 py-2 rounded-full w-max mx-auto border border-white/10">
            Welcome to Paradise
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold font-serif tracking-tight drop-shadow-md">
            {hotelNameDisplay}
          </h1>
          <p className="text-base md:text-lg text-slate-100 font-medium tracking-wide max-w-2xl mx-auto drop-shadow-sm font-sans">
            {cms.tagline}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={() => setShowBookingModal(true)}
              className="w-full sm:w-auto bg-[#D4AF37] hover:bg-[#B8902C] text-slate-900 font-black text-xs uppercase tracking-widest px-8 py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              Reserve Suite Stay
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#rooms"
              className="w-full sm:w-auto bg-white/15 hover:bg-white/20 border border-white/20 backdrop-blur-md text-white font-black text-xs uppercase tracking-widest px-8 py-4 rounded-xl transition-all block text-center"
            >
              Explore Suites
            </a>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37] block">The Experience</span>
            <h2 className="text-3xl md:text-4xl font-extrabold font-serif text-[#0F4C45] tracking-tight">
              {cms.aboutTitle}
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed font-medium">
              {cms.aboutText}
            </p>
            
            <div className="p-6 border-l-2 border-[#D4AF37] bg-[#0F4C45]/5 rounded-r-2xl italic text-[#0F4C45] text-sm font-medium">
              "{cms.aboutOwnerMessage}"
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <img 
              src={cms.gallery[1]} 
              className="rounded-3xl w-full h-80 object-cover shadow-md" 
              alt="Hotel view 1" 
            />
            <img 
              src={cms.gallery[2]} 
              className="rounded-3xl w-full h-80 object-cover shadow-md mt-8" 
              alt="Hotel view 2" 
            />
          </div>
        </div>
      </section>

      {/* Rooms Showcase */}
      <section id="rooms" className="py-24 bg-[#0F4C45]/5 border-y border-[#0F4C45]/10">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37] block">Accommodations</span>
            <h2 className="text-3xl font-extrabold font-serif text-[#0F4C45] tracking-tight">Our Signature Suites</h2>
            <p className="text-slate-500 text-xs font-semibold leading-relaxed">
              Designed with bespoke luxury and absolute sanctuary in mind, discover room allocations built around absolute hospitality.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {uniqueRoomTypes.length > 0 ? (
              uniqueRoomTypes.map((room: any) => {
                const customConfig = cms.rooms?.[room.room_type] || {};
                const defaultConfig = roomDisplayConfigs[room.room_type] || {
                  description: 'A premium, beautifully appointed room featuring state of the art hospitality amenities.',
                  image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
                  amenities: ['Free WiFi', 'Air Conditioning', 'Premium Linens']
                };

                const displayImage = customConfig.image || defaultConfig.image;
                const displayDescription = customConfig.description || defaultConfig.description;
                const displayAmenities = customConfig.amenities || defaultConfig.amenities;
                const displayPrice = customConfig.price !== undefined && customConfig.price !== 0 ? customConfig.price : room.price;

                return (
                  <div key={room.id} className="bg-white rounded-[28px] overflow-hidden border border-[#E2E8F0]/40 shadow-sm flex flex-col group hover:shadow-md transition-shadow">
                    <div className="h-64 relative overflow-hidden">
                      <img 
                        src={displayImage} 
                        alt={room.room_type} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3.5 py-1.5 rounded-full text-xs font-black text-[#0F4C45] border border-slate-100 shadow-sm">
                        ₹{displayPrice}/Night
                      </div>
                    </div>

                    <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
                      <div className="space-y-3">
                        <div className="flex justify-between items-baseline">
                          <h3 className="text-lg font-bold text-slate-800 font-serif">{room.room_type}</h3>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{room.capacity} Persons</span>
                        </div>
                        <p className="text-slate-500 text-xs leading-relaxed font-semibold">{displayDescription}</p>
                      </div>

                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-1.5">
                          {displayAmenities.map((a: string, i: number) => (
                            <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-50 text-[10px] text-slate-500 font-bold border border-slate-100 flex items-center gap-1">
                              <Check className="w-3 h-3 text-[#D4AF37]" />
                              {a}
                            </span>
                          ))}
                        </div>

                        <button
                          onClick={() => {
                            setBookRoomType(room.room_type);
                            setShowBookingModal(true);
                          }}
                          className="w-full bg-primary hover:bg-primary-hover text-white text-[11px] font-black uppercase tracking-widest py-3.5 rounded-xl transition-colors shadow-sm"
                        >
                          Book Stay Now
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              // Default fallback suites if no rooms in DB
              Object.entries(roomDisplayConfigs).map(([type, config]) => {
                const customConfig = cms.rooms?.[type] || {};
                const displayImage = customConfig.image || config.image;
                const displayDescription = customConfig.description || config.description;
                const displayAmenities = customConfig.amenities || config.amenities;
                const displayPrice = customConfig.price !== undefined && customConfig.price !== 0 ? customConfig.price : 2500;

                return (
                  <div key={type} className="bg-white rounded-[28px] overflow-hidden border border-[#E2E8F0]/40 shadow-sm flex flex-col group hover:shadow-md transition-shadow">
                    <div className="h-64 relative overflow-hidden">
                      <img 
                        src={displayImage} 
                        alt={type} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3.5 py-1.5 rounded-full text-xs font-black text-[#0F4C45] border border-slate-100 shadow-sm">
                        ₹{displayPrice}/Night
                      </div>
                    </div>

                    <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
                      <div className="space-y-3">
                        <div className="flex justify-between items-baseline">
                          <h3 className="text-lg font-bold text-slate-800 font-serif">{type}</h3>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">2 Persons</span>
                        </div>
                        <p className="text-slate-500 text-xs leading-relaxed font-semibold">{displayDescription}</p>
                      </div>

                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-1.5">
                          {config.amenities.map((a, i) => (
                            <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-50 text-[10px] text-slate-500 font-bold border border-slate-100 flex items-center gap-1">
                              <Check className="w-3 h-3 text-[#D4AF37]" />
                              {a}
                            </span>
                          ))}
                        </div>

                        <button
                          onClick={() => {
                            setBookRoomType(type);
                            setShowBookingModal(true);
                          }}
                          className="w-full bg-primary hover:bg-primary-hover text-white text-[11px] font-black uppercase tracking-widest py-3.5 rounded-xl transition-colors"
                        >
                          Book Stay Now
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* Amenities Grid */}
      <section id="amenities" className="py-24 max-w-7xl mx-auto px-6 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37] block">Amenities</span>
          <h2 className="text-3xl font-extrabold font-serif text-[#0F4C45] tracking-tight">Luxury Comforts</h2>
          <p className="text-slate-500 text-xs font-semibold leading-relaxed">
            We offer our guests top-tier facilities to make their vacation or stay absolutely magical.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { title: 'Free High Speed Wi-Fi', desc: 'Connectivity throughout the resort' },
            { title: 'Air Conditioning', desc: 'Individually adjustable cooling' },
            { title: 'Fine Dining Restaurant', desc: 'Delightful cuisine and cocktails' },
            { title: 'Valet Car Parking', desc: 'Secure parking with card keys' },
            { title: 'Swimming Pool', desc: 'Maintained infinity pool' },
            { title: 'Complimentary Room Service', desc: 'Dedicated butler staff 24x7' },
            { title: 'Complimentary Breakfast', desc: 'Serving local and international buffets' },
            { title: '24x7 Helpdesk Reception', desc: 'Express check-in and checkout' }
          ].map((item, i) => (
            <div key={i} className="bg-white p-5 rounded-[22px] border border-[#E2E8F0]/30 shadow-sm flex flex-col items-center text-center space-y-2 group hover:border-[#D4AF37]/45 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#0F4C45]/5 text-[#0F4C45] flex items-center justify-center font-bold text-xs">
                {i + 1}
              </div>
              <h4 className="text-xs font-bold text-slate-800">{item.title}</h4>
              <p className="text-[10px] text-slate-400 font-semibold">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Promotional Video Section */}
      <section className="relative h-[65vh] flex items-center justify-center bg-black overflow-hidden border-y border-white/5">
        <video 
          src={cms.heroVideo} 
          className="absolute inset-0 w-full h-full object-cover opacity-60 pointer-events-none" 
          autoPlay 
          muted 
          loop 
          playsInline 
        />
        <div className="absolute inset-0 bg-black/35 backdrop-blur-[1px]"></div>
        <div className="relative z-10 text-center text-white space-y-4 max-w-2xl px-6">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">Visual Tour</span>
          <h2 className="text-3xl font-extrabold font-serif tracking-tight">Experience Humble Sanctuary</h2>
          <p className="text-xs text-slate-200 leading-relaxed font-medium">
            Take a sneak peak at our lush greens, pristine suites, and world-class luxury dining layouts designed around you.
          </p>
        </div>
      </section>

      {/* Hotel Photo Gallery */}
      <section id="gallery" className="py-24 max-w-7xl mx-auto px-6 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37] block">Visual Journal</span>
          <h2 className="text-3xl font-extrabold font-serif text-[#0F4C45] tracking-tight">Our Resort Gallery</h2>
          <p className="text-slate-500 text-xs font-semibold leading-relaxed">
            Beautiful moments captured within our property lines.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {cms.gallery.map((url: string, idx: number) => (
            <div key={idx} className="h-64 rounded-3xl overflow-hidden shadow-sm border border-slate-100 group">
              <img 
                src={url} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                alt={`Resort picture ${idx + 1}`} 
              />
            </div>
          ))}
        </div>
      </section>

      {/* Guest Reviews / Testimonials */}
      <section className="py-24 bg-[#0F4C45]/5 border-y border-[#0F4C45]/10">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37] block">Endorsements</span>
            <h2 className="text-3xl font-extrabold font-serif text-[#0F4C45] tracking-tight">Stories from our Guests</h2>
            <p className="text-slate-500 text-xs font-semibold leading-relaxed">
              Read how travelers from all over the world enjoyed their holiday stays.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: 'Aditya Sen', role: 'Business Executive', quote: 'Absolutely beautiful. The check-in was seamless, and the Executive Suite exceeded all our expectations. The staff is polite, helpful, and provides world-class service.' },
              { name: 'Meera Deshmukh', role: 'Nature photographer', quote: 'The aesthetic and landscape are breathtaking. Waking up to the ocean view from the Super Deluxe balcony was simply stunning. Highly recommended for couples.' },
              { name: 'Dr. Rahul Verma', role: 'Family Traveler', quote: 'Booked the Family Suite for a 4-day weekend trip. The kids loved the complimentary pool and play zones. Food at the main dining room was exceptional!' }
            ].map((t, idx) => (
              <div key={idx} className="bg-white p-6 rounded-[24px] border border-[#E2E8F0]/30 shadow-sm space-y-4 flex flex-col justify-between">
                <p className="text-slate-600 text-xs italic font-medium leading-relaxed">"{t.quote}"</p>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{t.name}</h4>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{t.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs Section */}
      <section id="faq" className="py-24 max-w-4xl mx-auto px-6 space-y-12">
        <div className="text-center space-y-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37] block">Assistance</span>
          <h2 className="text-3xl font-extrabold font-serif text-[#0F4C45] tracking-tight">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-4">
          {cms.faqs.map((faq: any, idx: number) => (
            <div key={idx} className="bg-white p-6 rounded-2xl border border-[#E2E8F0]/30 shadow-sm space-y-2">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#D4AF37]" />
                {faq.question}
              </h4>
              <p className="text-xs text-slate-500 font-medium leading-relaxed pl-6">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Maps Location & Attractions */}
      <section id="location" className="py-24 max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6 self-center">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37] block">Geography</span>
          <h2 className="text-3xl font-extrabold font-serif text-[#0F4C45] tracking-tight">Our Destination</h2>
          <p className="text-slate-600 text-xs font-semibold leading-relaxed">
            Ideally placed adjacent to pristine white sand beach shores. Convenient transport access points nearby:
          </p>
          
          <div className="space-y-3 text-xs font-semibold text-slate-700">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#D4AF37]" />
              <span>Calangute Beach (2 min walk)</span>
            </div>
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#D4AF37]" />
              <span>Fort Aguada (12 min drive)</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#D4AF37]" />
              <span>Goa International Airport (35 min drive)</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 h-96 rounded-3xl overflow-hidden border border-slate-100 shadow-sm bg-slate-50">
          <iframe 
            src={cms.googleMapsUrl} 
            className="w-full h-full border-none"
            allowFullScreen 
            loading="lazy" 
            referrerPolicy="no-referrer-when-downgrade" 
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0B2C24] text-white pt-16 pb-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <h4 className="text-base font-extrabold font-serif text-white">{hotelNameDisplay}</h4>
              <p className="text-[#A0AEC0] text-xs font-semibold leading-relaxed">
                Experience world-class hospitality, beachside luxury rooms, and curated dining experiences.
              </p>
            </div>

            <div className="space-y-4">
              <h5 className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">Suites Directory</h5>
              <ul className="space-y-2 text-xs font-semibold text-[#A0AEC0]">
                <li>Deluxe Suites</li>
                <li>Super Deluxe Suites</li>
                <li>Executive Garden Rooms</li>
                <li>Presidents Family Suite</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h5 className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">Contacts</h5>
              <ul className="space-y-2.5 text-xs font-semibold text-[#A0AEC0]">
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400" />
                  {hotel?.phone || '+91 98765 43210'}
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  {hotel?.email || 'contact@staydesk.com'}
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  {cms.addressVal}
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h5 className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">Connect</h5>
              <div className="flex gap-3 text-xs font-bold">
                <a href={cms.instagram} target="_blank" rel="noreferrer" className="text-[#A0AEC0] hover:text-white transition-colors">Instagram</a>
                <a href={cms.facebook} target="_blank" rel="noreferrer" className="text-[#A0AEC0] hover:text-white transition-colors">Facebook</a>
                <a href={cms.twitter} target="_blank" rel="noreferrer" className="text-[#A0AEC0] hover:text-white transition-colors">Twitter</a>
              </div>
              <div className="pt-2">
                <Link 
                  href="/admin" 
                  className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37] hover:underline"
                >
                  Manage Property (Staff Login)
                </Link>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center text-[10px] font-bold text-[#A0AEC0] uppercase tracking-wider gap-4">
            <span>© 2026 {hotelNameDisplay}. Powered by Humble Goats.</span>
            <div className="flex gap-6">
              <span>Privacy Policy</span>
              <span>Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>

      {/* BOOK STAY MODAL FORM */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white rounded-[28px] w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in scale-in duration-200">
            <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Reserve Your stay</h3>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">{hotelNameDisplay}</span>
              </div>
              <button 
                onClick={() => setShowBookingModal(false)} 
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <form onSubmit={handleBookingSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Guest Full Name *</label>
                <input
                  type="text"
                  required
                  value={bookName}
                  onChange={(e) => setBookName(e.target.value)}
                  className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-[#E2E8F0]/80 rounded-xl p-3 focus:bg-white focus:outline-none"
                  placeholder="e.g. John Doe"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={bookPhone}
                    onChange={(e) => setBookPhone(e.target.value)}
                    className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-[#E2E8F0]/80 rounded-xl p-3 focus:bg-white focus:outline-none"
                    placeholder="e.g. 9876543210"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={bookEmail}
                    onChange={(e) => setBookEmail(e.target.value)}
                    className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-[#E2E8F0]/80 rounded-xl p-3 focus:bg-white focus:outline-none"
                    placeholder="e.g. john@email.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Check-in Date *</label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      value={bookCheckIn}
                      onChange={(e) => setBookCheckIn(e.target.value)}
                      className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-[#E2E8F0]/80 rounded-xl p-3 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Check-out Date *</label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      value={bookCheckOut}
                      onChange={(e) => setBookCheckOut(e.target.value)}
                      className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-[#E2E8F0]/80 rounded-xl p-3 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Select Suite Type</label>
                  <select
                    value={bookRoomType}
                    onChange={(e) => setBookRoomType(e.target.value)}
                    className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-[#E2E8F0]/80 rounded-xl p-3 focus:bg-white focus:outline-none"
                  >
                    <option value="Deluxe Room">Deluxe Room</option>
                    <option value="Super Deluxe Room">Super Deluxe Room</option>
                    <option value="Family Suite">Family Suite</option>
                    <option value="Executive Suite">Executive Suite</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Number of Guests</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={bookGuests}
                    onChange={(e) => setBookGuests(Number(e.target.value))}
                    className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-[#E2E8F0]/80 rounded-xl p-3 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Special Requests / Notes</label>
                <textarea
                  value={bookNotes}
                  onChange={(e) => setBookNotes(e.target.value)}
                  rows={2}
                  className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-[#E2E8F0]/80 rounded-xl p-3 focus:bg-white focus:outline-none resize-none"
                  placeholder="e.g. Airport pickup required, extra towels, ground floor..."
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-primary text-white text-xs font-black uppercase tracking-widest py-3.5 rounded-xl hover:bg-primary-hover shadow-md hover:shadow-lg transition-all disabled:opacity-55 flex items-center justify-center gap-1.5"
                >
                  {submitting ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-t-transparent"></div>
                  ) : (
                    <>Submit Booking Request</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="bg-slate-100 text-slate-600 text-xs font-bold px-5 py-3.5 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
