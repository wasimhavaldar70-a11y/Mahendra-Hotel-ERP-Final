// ========================================================
// Supabase Cloud Database Client Adapter
// Location: lib/supabase/supabaseDb.ts
// ========================================================

import { createClient } from '@supabase/supabase-js';
import { User, Hotel, Room, Customer, CustomerDocument, CheckIn, CheckInGuest, Payment, ExtendedCheckIn, RoomStatus } from '../../types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Only instantiate if credentials are provided
const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Broadcast changes locally so that multiple open tabs refresh automatically on edits
const broadcastChannel = typeof window !== 'undefined' ? new BroadcastChannel('hotelflow-sync') : null;
const broadcastDbUpdate = (type: string) => {
  if (broadcastChannel) {
    broadcastChannel.postMessage({ type, timestamp: Date.now() });
  }
};

export const supabaseDb = {
  // Authentication
  login: async (email: string, password?: string): Promise<{ user: User; hotel: Hotel | null } | null> => {
    if (!supabase) return null;
    const lowercaseEmail = email.toLowerCase().trim();

    // If a password is provided, validate it via Supabase Auth
    if (password) {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: lowercaseEmail,
        password: password
      });

      if (authError || !authData.user) {
        console.log('Supabase Auth credentials check failed:', authError?.message);
        return null;
      }
    }

    // Check if the user exists in our public users table
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', lowercaseEmail)
      .maybeSingle();

    if (userError || !user) {
      console.log('Login match failed or error in public schema:', userError);
      return null;
    }

    if (user.role === 'superadmin') {
      return { user, hotel: null };
    }

    // Fetch the hotel details if it's an owner or receptionist
    if (user.hotel_id) {
      const { data: hotel, error: hotelError } = await supabase
        .from('hotels')
        .select('*')
        .eq('id', user.hotel_id)
        .maybeSingle();
      return { user, hotel: hotel || null };
    }

    return { user, hotel: null };
  },

  // Hotels Management (Superadmin)
  getHotels: async (): Promise<Hotel[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('hotels')
      .select('*')
      .order('created_at', { ascending: false });
    return error ? [] : data || [];
  },

  addHotel: async (data: Omit<Hotel, 'id' | 'created_at' | 'subscription_status'> & { password?: string }): Promise<Hotel> => {
    const response = await fetch('/api/provision-hotel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        hotel_name: data.hotel_name,
        owner_name: data.owner_name,
        email: data.email,
        phone: data.phone,
        subscription_plan: data.subscription_plan,
        password: data.password || 'password123'
      })
    });

    const resData = await response.json();
    if (!response.ok) {
      throw new Error(resData.error || 'Failed to provision hotel');
    }

    broadcastDbUpdate('hotels');
    return resData.hotel;
  },

  updateHotelStatus: async (id: string, status: 'Active' | 'Expired' | 'Suspended'): Promise<Hotel | null> => {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('hotels')
      .update({ subscription_status: status })
      .eq('id', id)
      .select()
      .single();
    
    if (error) return null;
    broadcastDbUpdate('hotels');
    return data;
  },

  deleteHotel: async (id: string): Promise<boolean> => {
    const response = await fetch('/api/delete-hotel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ hotel_id: id })
    });

    const resData = await response.json();
    if (!response.ok) {
      throw new Error(resData.error || 'Failed to delete hotel');
    }

    broadcastDbUpdate('hotels');
    return true;
  },

  // Rooms Operations
  getRooms: async (hotelId: string): Promise<Room[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('hotel_id', hotelId)
      .order('room_number', { ascending: true });
    return error ? [] : data || [];
  },

  addRoom: async (hotelId: string, room: Omit<Room, 'id' | 'hotel_id' | 'created_at' | 'status'>): Promise<Room> => {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { data, error } = await supabase
      .from('rooms')
      .insert({
        hotel_id: hotelId,
        room_number: room.room_number,
        room_type: room.room_type,
        price: room.price,
        floor: room.floor,
        capacity: room.capacity,
        status: 'Ready'
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to create room');
    }

    broadcastDbUpdate('rooms');
    return data;
  },

  updateRoomStatus: async (hotelId: string, roomId: string, status: RoomStatus): Promise<Room | null> => {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('rooms')
      .update({ status })
      .eq('id', roomId)
      .eq('hotel_id', hotelId)
      .select()
      .single();

    if (error) return null;
    broadcastDbUpdate('rooms');
    return data;
  },

  // Customers Operations
  getCustomers: async (hotelId: string): Promise<Customer[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('hotel_id', hotelId)
      .order('full_name', { ascending: true });
    return error ? [] : data || [];
  },

  searchCustomers: async (hotelId: string, query: string): Promise<Customer[]> => {
    if (!supabase) return [];
    const q = query.trim();
    if (!q) return [];

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('hotel_id', hotelId)
      .or(`full_name.ilike.%${q}%,phone.like.%${q}%`);

    return error ? [] : data || [];
  },

  getCustomerByPhoneOrAadhar: async (hotelId: string, identifier: string): Promise<{ customer: Customer; docs: CustomerDocument[]; stayCount: number; lastVisit: string | null; preferredRoom: string | null; pendingBalance: number } | null> => {
    if (!supabase) return null;
    const cleanId = identifier.trim();

    // 1. Fetch customer by phone
    let { data: customer, error } = await supabase
      .from('customers')
      .select('*')
      .eq('hotel_id', hotelId)
      .eq('phone', cleanId)
      .maybeSingle();

    // 2. If not found by phone, search through document numbers
    if (!customer) {
      const { data: docData } = await supabase
        .from('customer_documents')
        .select('customer_id')
        .eq('document_number', cleanId)
        .limit(1);

      if (docData && docData.length > 0) {
        const { data: custByDoc } = await supabase
          .from('customers')
          .select('*')
          .eq('hotel_id', hotelId)
          .eq('id', docData[0].customer_id)
          .maybeSingle();
        customer = custByDoc || null;
      }
    }

    if (!customer) return null;

    // 3. Fetch documents
    const { data: docs } = await supabase
      .from('customer_documents')
      .select('*')
      .eq('customer_id', customer.id);

    // 4. Fetch stays and payments for stats
    const { data: stays } = await supabase
      .from('check_ins')
      .select('id, room_id, status, check_in')
      .eq('hotel_id', hotelId)
      .eq('primary_customer_id', customer.id);

    const customerStays = stays || [];
    const stayCount = customerStays.length;

    // Last Visit
    const completedStays = customerStays.filter(s => s.status === 'Completed');
    completedStays.sort((a, b) => new Date(b.check_in).getTime() - new Date(a.check_in).getTime());
    const lastVisit = completedStays.length > 0 ? completedStays[0].check_in : null;

    // Preferred Room calculation
    const roomCounts: Record<string, number> = {};
    let preferredRoomId: string | null = null;
    let maxRoomCount = 0;
    customerStays.forEach(st => {
      if (st.room_id) {
        roomCounts[st.room_id] = (roomCounts[st.room_id] || 0) + 1;
        if (roomCounts[st.room_id] > maxRoomCount) {
          maxRoomCount = roomCounts[st.room_id];
          preferredRoomId = st.room_id;
        }
      }
    });

    let preferredRoomNumber: string | null = null;
    if (preferredRoomId) {
      const { data: r } = await supabase
        .from('rooms')
        .select('room_number')
        .eq('id', preferredRoomId)
        .maybeSingle();
      if (r) preferredRoomNumber = r.room_number;
    }

    // Outstanding Balance (pending payments from active stays)
    let pendingBalance = 0;
    const activeStays = customerStays.filter(s => s.status === 'Active');
    if (activeStays.length > 0) {
      const activeIds = activeStays.map(s => s.id);
      const { data: activePayments } = await supabase
        .from('payments')
        .select('pending')
        .in('checkin_id', activeIds);

      activePayments?.forEach(p => {
        pendingBalance += Number(p.pending);
      });
    }

    return {
      customer,
      docs: docs || [],
      stayCount,
      lastVisit,
      preferredRoom: preferredRoomNumber,
      pendingBalance
    };
  },

  addCustomer: async (hotelId: string, data: Omit<Customer, 'id' | 'hotel_id' | 'created_at'>, docType?: string, docNum?: string, frontImg?: string, backImg?: string): Promise<Customer> => {
    if (!supabase) throw new Error('Supabase client not initialized');

    // Check if phone already exists
    const { data: existing } = await supabase
      .from('customers')
      .select('*')
      .eq('hotel_id', hotelId)
      .eq('phone', data.phone)
      .maybeSingle();

    if (existing) {
      // If customer exists, check if new documents need to be added
      if (docType && docNum) {
        await supabase
          .from('customer_documents')
          .insert({
            customer_id: existing.id,
            document_type: docType,
            document_number: docNum,
            front_image: frontImg,
            back_image: backImg
          });
      }
      return existing;
    }

    // Add new customer
    const { data: newCustomer, error } = await supabase
      .from('customers')
      .insert({
        hotel_id: hotelId,
        full_name: data.full_name,
        phone: data.phone,
        gender: data.gender,
        address: data.address,
        city: data.city,
        state: data.state,
        country: data.country || 'India'
      })
      .select()
      .single();

    if (error || !newCustomer) {
      throw new Error(error?.message || 'Failed to create customer');
    }

    // Add customer document
    if (docType && docNum) {
      await supabase
        .from('customer_documents')
        .insert({
          customer_id: newCustomer.id,
          document_type: docType,
          document_number: docNum,
          front_image: frontImg,
          back_image: backImg
        });
    }

    broadcastDbUpdate('customers');
    return newCustomer;
  },

  // Check In and Stays
  checkIn: async (
    hotelId: string,
    checkInData: {
      room_id: string;
      primary_customer_id: string;
      expected_checkout: string;
      number_of_guests: number;
    },
    paymentData: {
      room_price: number;
      advance: number;
      pending: number;
      payment_method: 'UPI' | 'Cash' | 'Card';
    },
    guestsList: {
      customer_id: string;
      relationship: 'Self' | 'Friend' | 'Family' | 'Wife' | 'Husband' | 'GF' | 'BF' | 'Child';
      document_verified: boolean;
    }[]
  ): Promise<CheckIn> => {
    if (!supabase) throw new Error('Supabase client not initialized');

    // 1. Insert Check-In record
    const { data: newCheckIn, error: checkInError } = await supabase
      .from('check_ins')
      .insert({
        hotel_id: hotelId,
        room_id: checkInData.room_id,
        primary_customer_id: checkInData.primary_customer_id,
        number_of_guests: checkInData.number_of_guests,
        check_in: new Date().toISOString(),
        expected_checkout: checkInData.expected_checkout,
        status: 'Active'
      })
      .select()
      .single();

    if (checkInError || !newCheckIn) {
      throw new Error(checkInError?.message || 'Failed to create check-in');
    }

    // 2. Insert Payment record
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        checkin_id: newCheckIn.id,
        room_price: paymentData.room_price,
        advance: paymentData.advance,
        pending: paymentData.pending,
        payment_method: paymentData.payment_method
      });

    if (paymentError) {
      console.error('Payment insert failed, but check-in was created:', paymentError);
    }

    // 3. Insert Guest list records
    if (guestsList.length > 0) {
      const guestsToInsert = guestsList.map(g => ({
        checkin_id: newCheckIn.id,
        customer_id: g.customer_id,
        relationship: g.relationship,
        document_verified: g.document_verified
      }));
      await supabase.from('check_in_guests').insert(guestsToInsert);
    }

    // 4. Update Room status to Occupied
    await supabase
      .from('rooms')
      .update({ status: 'Occupied' })
      .eq('id', checkInData.room_id);

    broadcastDbUpdate('checkins');
    broadcastDbUpdate('rooms');
    broadcastDbUpdate('payments');

    return newCheckIn;
  },

  extendStay: async (hotelId: string, checkInId: string, newExpectedCheckout: string, extraPrice: number = 0): Promise<CheckIn | null> => {
    if (!supabase) return null;

    // Update Expected Checkout
    const { data: checkIn, error } = await supabase
      .from('check_ins')
      .update({ expected_checkout: newExpectedCheckout })
      .eq('id', checkInId)
      .eq('hotel_id', hotelId)
      .select()
      .single();

    if (error) return null;

    // Update payment details if extra cost is added
    if (extraPrice > 0) {
      const { data: currentPayment } = await supabase
        .from('payments')
        .select('*')
        .eq('checkin_id', checkInId)
        .maybeSingle();

      if (currentPayment) {
        const newPrice = Number(currentPayment.room_price) + extraPrice;
        const newPending = Number(currentPayment.pending) + extraPrice;

        await supabase
          .from('payments')
          .update({
            room_price: newPrice,
            pending: newPending
          })
          .eq('id', currentPayment.id);
      }
    }

    broadcastDbUpdate('checkins');
    broadcastDbUpdate('payments');
    return checkIn;
  },

  // Checkout Operation
  checkOut: async (hotelId: string, checkInId: string, finalPaymentMethod: 'UPI' | 'Cash' | 'Card'): Promise<CheckIn | null> => {
    if (!supabase) return null;

    // 1. Set Check-In status to Completed
    const { data: checkIn, error: checkInError } = await supabase
      .from('check_ins')
      .update({ status: 'Completed' })
      .eq('id', checkInId)
      .eq('hotel_id', hotelId)
      .select()
      .single();

    if (checkInError || !checkIn) return null;

    // 2. Settle payment: clear pending balance
    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('checkin_id', checkInId)
      .maybeSingle();

    if (payment) {
      await supabase
        .from('payments')
        .update({
          advance: payment.room_price, // fully paid
          pending: 0,
          payment_method: finalPaymentMethod
        })
        .eq('id', payment.id);
    }

    // 3. Set Room status to Cleaning
    if (checkIn.room_id) {
      await supabase
        .from('rooms')
        .update({ status: 'Cleaning' })
        .eq('id', checkIn.room_id);
    }

    broadcastDbUpdate('checkins');
    broadcastDbUpdate('rooms');
    broadcastDbUpdate('payments');

    return checkIn;
  },

  // Full extended details for Room Modals
  getActiveStayForRoom: async (hotelId: string, roomId: string): Promise<ExtendedCheckIn | null> => {
    if (!supabase) return null;

    // Fetch active stay
    const { data: activeStay } = await supabase
      .from('check_ins')
      .select('*')
      .eq('hotel_id', hotelId)
      .eq('room_id', roomId)
      .eq('status', 'Active')
      .maybeSingle();

    if (!activeStay) return null;

    // Fetch primary customer with documents
    const { data: primaryCustomer } = await supabase
      .from('customers')
      .select('*, customer_documents(*)')
      .eq('id', activeStay.primary_customer_id)
      .maybeSingle();

    // Fetch payment record
    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('checkin_id', activeStay.id)
      .maybeSingle();

    // Fetch stay guests joined with customers and their documents
    const { data: stayGuests } = await supabase
      .from('check_in_guests')
      .select('*, customers(*, customer_documents(*))')
      .eq('checkin_id', activeStay.id);

    // Fetch room details
    const { data: room } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .maybeSingle();

    const formattedGuests = (stayGuests || []).map(g => ({
      id: g.id,
      checkin_id: g.checkin_id,
      customer_id: g.customer_id,
      relationship: g.relationship,
      document_verified: g.document_verified,
      created_at: g.created_at,
      customer: g.customers
    }));

    return {
      ...activeStay,
      room: room || undefined,
      primary_customer: primaryCustomer || undefined,
      guests: formattedGuests,
      payment: payment || undefined
    };
  },

  // Payments Operations
  getPayments: async (hotelId: string): Promise<(Payment & { customerName: string; roomNumber: string })[]> => {
    if (!supabase) return [];

    // Fetch check-ins list for this hotel
    const { data: checkins } = await supabase
      .from('check_ins')
      .select('id, primary_customer_id, room_id')
      .eq('hotel_id', hotelId);

    if (!checkins || checkins.length === 0) return [];
    const checkinIds = checkins.map(c => c.id);

    // Fetch payments matching checkinIds
    const { data: payments, error } = await supabase
      .from('payments')
      .select('*')
      .in('checkin_id', checkinIds)
      .order('created_at', { ascending: false });

    if (error || !payments) return [];

    // Resolve dependencies
    const customerIds = checkins.map(c => c.primary_customer_id).filter(Boolean);
    const roomIds = checkins.map(c => c.room_id).filter(Boolean);

    const { data: customers } = await supabase.from('customers').select('id, full_name').in('id', customerIds);
    const { data: rooms } = await supabase.from('rooms').select('id, room_number').in('id', roomIds);

    return payments.map(p => {
      const stay = checkins.find(ch => ch.id === p.checkin_id);
      const cust = stay ? customers?.find(c => c.id === stay.primary_customer_id) : null;
      const rm = stay ? rooms?.find(r => r.id === stay.room_id) : null;

      return {
        ...p,
        customerName: cust ? cust.full_name : 'Unknown Guest',
        roomNumber: rm ? rm.room_number : 'N/A'
      };
    });
  },

  // Reports aggregations
  getReports: async (hotelId: string): Promise<{
    dailyRevenue: { date: string; amount: number }[];
    monthlyRevenue: { month: string; amount: number }[];
    occupancyRate: number;
    repeatCustomers: { name: string; phone: string; visits: number }[];
    pendingPayments: { guest: string; phone: string; room: string; amount: number }[];
    mostUsedRooms: { room: string; usageCount: number }[];
  }> => {
    if (!supabase) {
      return { dailyRevenue: [], monthlyRevenue: [], occupancyRate: 0, repeatCustomers: [], pendingPayments: [], mostUsedRooms: [] };
    }

    // Fetch operational datasets
    const { data: rooms } = await supabase.from('rooms').select('*').eq('hotel_id', hotelId);
    const { data: checkins } = await supabase.from('check_ins').select('*').eq('hotel_id', hotelId);
    const { data: customers } = await supabase.from('customers').select('*').eq('hotel_id', hotelId);

    const checkinIds = checkins?.map(c => c.id) || [];
    const payments = checkinIds.length > 0
      ? (await supabase.from('payments').select('*').in('checkin_id', checkinIds)).data || []
      : [];

    const roomList = rooms || [];
    const checkinList = checkins || [];
    const customerList = customers || [];

    // Occupancy Rate
    const totalRoomsCount = roomList.length;
    const occupiedRoomsCount = roomList.filter(r => r.status === 'Occupied').length;
    const occupancyRate = totalRoomsCount > 0 ? Math.round((occupiedRoomsCount / totalRoomsCount) * 100) : 0;

    // Daily & Monthly Revenue
    const dailyMap: Record<string, number> = {};
    const monthlyMap: Record<string, number> = {};

    payments.forEach(p => {
      const amount = Number(p.advance);
      if (amount <= 0) return;

      const dateObj = new Date(p.created_at);
      const dayKey = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      const monthKey = dateObj.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

      dailyMap[dayKey] = (dailyMap[dayKey] || 0) + amount;
      monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + amount;
    });

    const dailyRevenue = Object.entries(dailyMap).map(([date, amount]) => ({ date, amount })).slice(-7);
    const monthlyRevenue = Object.entries(monthlyMap).map(([month, amount]) => ({ month, amount }));

    // Repeat Customers
    const guestVisits: Record<string, { name: string; phone: string; visits: number }> = {};
    checkinList.forEach(ch => {
      const cust = customerList.find(c => c.id === ch.primary_customer_id);
      if (cust) {
        if (!guestVisits[cust.id]) {
          guestVisits[cust.id] = { name: cust.full_name, phone: cust.phone, visits: 0 };
        }
        guestVisits[cust.id].visits += 1;
      }
    });

    const repeatCustomers = Object.values(guestVisits)
      .filter(v => v.visits > 1)
      .sort((a, b) => b.visits - a.visits);

    // Pending payments
    const pendingPayments: { guest: string; phone: string; room: string; amount: number }[] = [];
    payments.forEach(p => {
      const pendingVal = Number(p.pending);
      if (pendingVal > 0) {
        const stay = checkinList.find(ch => ch.id === p.checkin_id && ch.status === 'Active');
        if (stay) {
          const cust = customerList.find(c => c.id === stay.primary_customer_id);
          const rm = roomList.find(r => r.id === stay.room_id);
          pendingPayments.push({
            guest: cust ? cust.full_name : 'Unknown Guest',
            phone: cust ? cust.phone : '',
            room: rm ? rm.room_number : '',
            amount: pendingVal
          });
        }
      }
    });

    // Most used rooms
    const roomUsage: Record<string, number> = {};
    checkinList.forEach(ch => {
      const rm = roomList.find(r => r.id === ch.room_id);
      if (rm) {
        roomUsage[rm.room_number] = (roomUsage[rm.room_number] || 0) + 1;
      }
    });
    const mostUsedRooms = Object.entries(roomUsage)
      .map(([room, usageCount]) => ({ room, usageCount }))
      .sort((a, b) => b.usageCount - a.usageCount);

    return {
      dailyRevenue,
      monthlyRevenue,
      occupancyRate,
      repeatCustomers,
      pendingPayments,
      mostUsedRooms
    };
  }
};
