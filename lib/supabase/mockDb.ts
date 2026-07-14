// ========================================================
// StayDesk CRM / HotelFlow CRM Mock Database Service
// Location: lib/supabase/mockDb.ts
// ========================================================

import { Hotel, User, Room, RoomStatus, Customer, CustomerDocument, CheckIn, CheckInGuest, Payment, ExtendedCheckIn } from '../../types';

// Broadcaster for real-time synchronization between browser tabs
const syncChannel = typeof window !== 'undefined' ? new BroadcastChannel('hotelflow-sync') : null;

export const broadcastDbUpdate = (table: string) => {
  if (syncChannel) {
    syncChannel.postMessage({ type: 'DB_UPDATE', table });
  }
};

// Seed Data definition
const DEFAULT_HOTELS: Hotel[] = [];

const DEFAULT_USERS: User[] = [
  {
    id: 'admin-id-0000',
    hotel_id: null,
    role: 'superadmin',
    email: 'admin@staydesk.com',
    created_at: new Date().toISOString(),
  },
  {
    id: 'admin-id-wasim',
    hotel_id: null,
    role: 'superadmin',
    email: 'wasimhavaldar70@gmail.com',
    created_at: new Date().toISOString(),
  }
];

const DEFAULT_ROOMS = (hotelId: string): Room[] => [];

const DEFAULT_CUSTOMERS = (hotelId: string): Customer[] => [];

// Initialize Mock Database in LocalStorage
export const initMockDb = () => {
  if (typeof window === 'undefined') return;

  const setItemIfEmpty = (key: string, data: any) => {
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify(data));
    }
  };

  setItemIfEmpty('hf_hotels', DEFAULT_HOTELS);
  setItemIfEmpty('hf_users', DEFAULT_USERS);
};

// Generic read/write functions
const getTable = <T>(key: string): T[] => {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
};

const setTable = <T>(key: string, data: T[]): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
};

// Core DB operations
export const mockDb = {
  // Authentication
  login: async (email: string, password?: string): Promise<{ user: User; hotel: Hotel | null } | null> => {
    initMockDb();
    const users = getTable<User>('hf_users');
    const lowercaseEmail = email.toLowerCase().trim();
    
    // Check if it's a superadmin email pattern
    const isSuperAdminEmail = 
      lowercaseEmail.startsWith('admin') || 
      lowercaseEmail.includes('superadmin') || 
      lowercaseEmail.includes('super_admin') ||
      lowercaseEmail === 'wasimhavaldar70@gmail.com';

    if (isSuperAdminEmail) {
      // Find or create superadmin
      let adminUser = users.find(u => u.email.toLowerCase() === lowercaseEmail);
      if (!adminUser) {
        adminUser = {
          id: `u-${Date.now()}`,
          hotel_id: null,
          role: 'superadmin',
          email: lowercaseEmail,
          created_at: new Date().toISOString()
        };
        setTable('hf_users', [...users, adminUser]);
      }
      return { user: adminUser, hotel: null };
    }

    const user = users.find(u => u.email.toLowerCase() === lowercaseEmail);
    
    if (user) {
      if (user.role === 'superadmin') {
        return { user, hotel: null };
      }
      const hotels = getTable<Hotel>('hf_hotels');
      const hotel = hotels.find(h => h.id === user.hotel_id) || null;
      return { user, hotel };
    }
    
    // Auto-create for demonstration if the owner tries any new email!
    // This allows frictionless logins.
    if (email.includes('@')) {
      const hotels = getTable<Hotel>('hf_hotels');
      const newHotelId = `h-${Date.now()}`;
      
      const newHotel: Hotel = {
        id: newHotelId,
        hotel_name: `${email.split('@')[0].toUpperCase()}'s Inn`,
        owner_name: email.split('@')[0],
        email,
        phone: '9999999999',
        subscription_plan: '30 Days',
        subscription_status: 'Active',
        created_at: new Date().toISOString()
      };
      
      const newUser: User = {
        id: `u-${Date.now()}`,
        hotel_id: newHotelId,
        role: 'hotel_owner',
        email,
        created_at: new Date().toISOString()
      };

      setTable('hf_hotels', [...hotels, newHotel]);
      setTable('hf_users', [...users, newUser]);
      
      // Init rooms and customers for this hotel
      setTable(`hf_rooms_${newHotelId}`, DEFAULT_ROOMS(newHotelId));
      setTable(`hf_customers_${newHotelId}`, DEFAULT_CUSTOMERS(newHotelId));
      setTable(`hf_checkins_${newHotelId}`, []);
      setTable(`hf_payments_${newHotelId}`, []);
      setTable(`hf_guests_${newHotelId}`, []);

      broadcastDbUpdate('hotels');
      return { user: newUser, hotel: newHotel };
    }

    return null;
  },

  // Hotels Management (Superadmin)
  getHotels: async (): Promise<Hotel[]> => {
    initMockDb();
    return getTable<Hotel>('hf_hotels');
  },

  addHotel: async (data: Omit<Hotel, 'id' | 'created_at' | 'subscription_status'> & { password?: string }): Promise<Hotel> => {
    const hotels = getTable<Hotel>('hf_hotels');
    const newId = `h-${Date.now()}`;
    const newHotel: Hotel = {
      ...data,
      id: newId,
      subscription_status: 'Active',
      created_at: new Date().toISOString()
    };
    
    // Auto create the owner user
    const users = getTable<User>('hf_users');
    const newOwnerUser: User = {
      id: `u-${Date.now()}`,
      hotel_id: newId,
      role: 'hotel_owner',
      email: data.email,
      created_at: new Date().toISOString()
    };
    
    setTable('hf_hotels', [...hotels, newHotel]);
    setTable('hf_users', [...users, newOwnerUser]);
    
    // Init resources
    setTable(`hf_rooms_${newId}`, DEFAULT_ROOMS(newId));
    setTable(`hf_customers_${newId}`, DEFAULT_CUSTOMERS(newId));
    setTable(`hf_checkins_${newId}`, []);
    setTable(`hf_payments_${newId}`, []);
    setTable(`hf_guests_${newId}`, []);

    broadcastDbUpdate('hotels');
    return newHotel;
  },

  updateHotelStatus: async (id: string, status: 'Active' | 'Expired' | 'Suspended'): Promise<Hotel | null> => {
    const hotels = getTable<Hotel>('hf_hotels');
    const index = hotels.findIndex(h => h.id === id);
    if (index === -1) return null;
    
    hotels[index].subscription_status = status;
    setTable('hf_hotels', hotels);
    broadcastDbUpdate('hotels');
    return hotels[index];
  },

  deleteHotel: async (id: string): Promise<boolean> => {
    const hotels = getTable<Hotel>('hf_hotels');
    const filtered = hotels.filter(h => h.id !== id);
    setTable('hf_hotels', filtered);
    
    const users = getTable<User>('hf_users');
    const filteredUsers = users.filter(u => u.hotel_id !== id);
    setTable('hf_users', filteredUsers);
    
    broadcastDbUpdate('hotels');
    return true;
  },

  // Rooms Operations
  getRooms: async (hotelId: string): Promise<Room[]> => {
    initMockDb();
    return getTable<Room>(`hf_rooms_${hotelId}`);
  },

  addRoom: async (hotelId: string, room: Omit<Room, 'id' | 'hotel_id' | 'created_at' | 'status'>): Promise<Room> => {
    const rooms = getTable<Room>(`hf_rooms_${hotelId}`);
    const newRoom: Room = {
      ...room,
      id: `r-${hotelId}-${room.room_number}`,
      hotel_id: hotelId,
      status: 'Ready',
      created_at: new Date().toISOString()
    };
    setTable(`hf_rooms_${hotelId}`, [...rooms, newRoom]);
    broadcastDbUpdate('rooms');
    return newRoom;
  },

  updateRoomStatus: async (hotelId: string, roomId: string, status: RoomStatus): Promise<Room | null> => {
    const rooms = getTable<Room>(`hf_rooms_${hotelId}`);
    const index = rooms.findIndex(r => r.id === roomId);
    if (index === -1) return null;
    
    rooms[index].status = status;
    setTable(`hf_rooms_${hotelId}`, rooms);
    broadcastDbUpdate('rooms');
    return rooms[index];
  },

  // Customers Operations
  getCustomers: async (hotelId: string): Promise<Customer[]> => {
    initMockDb();
    return getTable<Customer>(`hf_customers_${hotelId}`);
  },

  searchCustomers: async (hotelId: string, query: string): Promise<Customer[]> => {
    const customers = getTable<Customer>(`hf_customers_${hotelId}`);
    const q = query.toLowerCase().trim();
    if (!q) return [];
    
    return customers.filter(c => 
      c.full_name.toLowerCase().includes(q) || 
      c.phone.includes(q)
    );
  },

  getCustomerByPhoneOrAadhar: async (hotelId: string, identifier: string): Promise<{ customer: Customer; docs: CustomerDocument[]; stayCount: number; lastVisit: string | null; preferredRoom: string | null; pendingBalance: number } | null> => {
    const customers = getTable<Customer>(`hf_customers_${hotelId}`);
    const cleanId = identifier.trim();
    
    // Find customer by phone or Aadhaar
    const docsTable = getTable<CustomerDocument>(`hf_documents_${hotelId}`);
    let customer = customers.find(c => c.phone === cleanId);
    
    if (!customer) {
      // Search docs
      const doc = docsTable.find(d => d.document_number === cleanId);
      if (doc) {
        customer = customers.find(c => c.id === doc.customer_id);
      }
    }

    if (!customer) return null;

    // Get documents
    const customerDocs = docsTable.filter(d => d.customer_id === customer!.id);

    // Get statistics
    const checkIns = getTable<CheckIn>(`hf_checkins_${hotelId}`);
    const customerStays = checkIns.filter(ch => ch.primary_customer_id === customer!.id);
    
    // Last visit
    const completedStays = customerStays.filter(ch => ch.status === 'Completed');
    completedStays.sort((a, b) => new Date(b.check_in).getTime() - new Date(a.check_in).getTime());
    const lastVisit = completedStays.length > 0 ? completedStays[0].check_in : null;

    // Preferred Room
    const roomCounts: Record<string, number> = {};
    let maxCount = 0;
    let preferredRoomId: string | null = null;
    
    customerStays.forEach(st => {
      roomCounts[st.room_id] = (roomCounts[st.room_id] || 0) + 1;
      if (roomCounts[st.room_id] > maxCount) {
        maxCount = roomCounts[st.room_id];
        preferredRoomId = st.room_id;
      }
    });

    let preferredRoomNumber: string | null = null;
    if (preferredRoomId) {
      const rooms = getTable<Room>(`hf_rooms_${hotelId}`);
      const r = rooms.find(room => room.id === preferredRoomId);
      if (r) preferredRoomNumber = r.room_number;
    }

    // Outstanding Balance (pending from active stays)
    let pendingBalance = 0;
    const activeCheckins = customerStays.filter(ch => ch.status === 'Active');
    const payments = getTable<Payment>(`hf_payments_${hotelId}`);
    
    activeCheckins.forEach(ch => {
      const pay = payments.find(p => p.checkin_id === ch.id);
      if (pay) pendingBalance += Number(pay.pending);
    });

    return {
      customer,
      docs: customerDocs,
      stayCount: customerStays.length,
      lastVisit,
      preferredRoom: preferredRoomNumber,
      pendingBalance
    };
  },

  addCustomer: async (hotelId: string, data: Omit<Customer, 'id' | 'hotel_id' | 'created_at'>, docType?: string, docNum?: string, frontImg?: string, backImg?: string): Promise<Customer> => {
    const customers = getTable<Customer>(`hf_customers_${hotelId}`);
    
    // Check if phone already exists
    const existing = customers.find(c => c.phone === data.phone);
    if (existing) {
      // If customer exists, we might want to update documents or return it
      if (docType && docNum) {
        const docsTable = getTable<CustomerDocument>(`hf_documents_${hotelId}`);
        const newDoc: CustomerDocument = {
          id: `doc-${Date.now()}`,
          customer_id: existing.id,
          document_type: docType as any,
          document_number: docNum,
          front_image: frontImg,
          back_image: backImg,
          created_at: new Date().toISOString()
        };
        setTable(`hf_documents_${hotelId}`, [...docsTable, newDoc]);
      }
      return existing;
    }

    const newCustomer: Customer = {
      ...data,
      id: `c-${hotelId}-${Date.now()}`,
      hotel_id: hotelId,
      created_at: new Date().toISOString()
    };
    
    setTable(`hf_customers_${hotelId}`, [...customers, newCustomer]);

    if (docType && docNum) {
      const docsTable = getTable<CustomerDocument>(`hf_documents_${hotelId}`);
      const newDoc: CustomerDocument = {
        id: `doc-${Date.now()}`,
        customer_id: newCustomer.id,
        document_type: docType as any,
        document_number: docNum,
        front_image: frontImg,
        back_image: backImg,
        created_at: new Date().toISOString()
      };
      setTable(`hf_documents_${hotelId}`, [...docsTable, newDoc]);
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
    const checkIns = getTable<CheckIn>(`hf_checkins_${hotelId}`);
    const checkInId = `chk-${Date.now()}`;
    
    const newCheckIn: CheckIn = {
      id: checkInId,
      hotel_id: hotelId,
      room_id: checkInData.room_id,
      primary_customer_id: checkInData.primary_customer_id,
      number_of_guests: checkInData.number_of_guests,
      check_in: new Date().toISOString(),
      expected_checkout: checkInData.expected_checkout,
      status: 'Active',
      created_at: new Date().toISOString()
    };

    // Create Payment record
    const payments = getTable<Payment>(`hf_payments_${hotelId}`);
    const newPayment: Payment = {
      id: `p-${Date.now()}`,
      checkin_id: checkInId,
      room_price: paymentData.room_price,
      advance: paymentData.advance,
      pending: paymentData.pending,
      payment_method: paymentData.payment_method,
      created_at: new Date().toISOString()
    };

    // Create Guest records
    const guests = getTable<CheckInGuest>(`hf_guests_${hotelId}`);
    const newGuests: CheckInGuest[] = guestsList.map((g, idx) => ({
      id: `g-${Date.now()}-${idx}`,
      checkin_id: checkInId,
      customer_id: g.customer_id,
      relationship: g.relationship,
      document_verified: g.document_verified,
      created_at: new Date().toISOString()
    }));

    // Update Room status to Occupied
    const rooms = getTable<Room>(`hf_rooms_${hotelId}`);
    const rIndex = rooms.findIndex(r => r.id === checkInData.room_id);
    if (rIndex !== -1) {
      rooms[rIndex].status = 'Occupied';
    }

    setTable(`hf_checkins_${hotelId}`, [...checkIns, newCheckIn]);
    setTable(`hf_payments_${hotelId}`, [...payments, newPayment]);
    setTable(`hf_guests_${hotelId}`, [...guests, ...newGuests]);
    setTable(`hf_rooms_${hotelId}`, rooms);

    broadcastDbUpdate('checkins');
    broadcastDbUpdate('rooms');
    broadcastDbUpdate('payments');
    
    return newCheckIn;
  },

  extendStay: async (hotelId: string, checkInId: string, newExpectedCheckout: string, extraPrice: number = 0): Promise<CheckIn | null> => {
    const checkIns = getTable<CheckIn>(`hf_checkins_${hotelId}`);
    const index = checkIns.findIndex(ch => ch.id === checkInId);
    if (index === -1) return null;
    
    checkIns[index].expected_checkout = newExpectedCheckout;
    setTable(`hf_checkins_${hotelId}`, checkIns);

    // Update payment details if extra cost is added
    if (extraPrice > 0) {
      const payments = getTable<Payment>(`hf_payments_${hotelId}`);
      const pIndex = payments.findIndex(p => p.checkin_id === checkInId);
      if (pIndex !== -1) {
        payments[pIndex].room_price = Number(payments[pIndex].room_price) + extraPrice;
        payments[pIndex].pending = Number(payments[pIndex].pending) + extraPrice;
        setTable(`hf_payments_${hotelId}`, payments);
      }
    }

    broadcastDbUpdate('checkins');
    broadcastDbUpdate('payments');
    return checkIns[index];
  },

  // Checkout Operation
  checkOut: async (hotelId: string, checkInId: string, finalPaymentMethod: 'UPI' | 'Cash' | 'Card'): Promise<CheckIn | null> => {
    const checkIns = getTable<CheckIn>(`hf_checkins_${hotelId}`);
    const cIndex = checkIns.findIndex(ch => ch.id === checkInId);
    if (cIndex === -1) return null;

    checkIns[cIndex].status = 'Completed';

    // Settle payment: clear pending balance
    const payments = getTable<Payment>(`hf_payments_${hotelId}`);
    const pIndex = payments.findIndex(p => p.checkin_id === checkInId);
    if (pIndex !== -1) {
      const totalCost = Number(payments[pIndex].room_price);
      payments[pIndex].advance = totalCost; // fully paid now
      payments[pIndex].pending = 0;
      payments[pIndex].payment_method = finalPaymentMethod;
    }

    // Set Room status to Cleaning (Green available is automatic after cleaning)
    const roomId = checkIns[cIndex].room_id;
    const rooms = getTable<Room>(`hf_rooms_${hotelId}`);
    const rIndex = rooms.findIndex(r => r.id === roomId);
    if (rIndex !== -1) {
      rooms[rIndex].status = 'Cleaning'; // Transition to Cleaning
    }

    setTable(`hf_checkins_${hotelId}`, checkIns);
    setTable(`hf_payments_${hotelId}`, payments);
    setTable(`hf_rooms_${hotelId}`, rooms);

    broadcastDbUpdate('checkins');
    broadcastDbUpdate('rooms');
    broadcastDbUpdate('payments');

    return checkIns[cIndex];
  },

  // Full extended details for Room Modals
  getActiveStayForRoom: async (hotelId: string, roomId: string): Promise<ExtendedCheckIn | null> => {
    initMockDb();
    const checkIns = getTable<CheckIn>(`hf_checkins_${hotelId}`);
    const activeStay = checkIns.find(ch => ch.room_id === roomId && ch.status === 'Active');
    
    if (!activeStay) return null;

    const customers = getTable<Customer>(`hf_customers_${hotelId}`);
    const primaryCustomer = customers.find(c => c.id === activeStay.primary_customer_id);

    const docsTable = getTable<CustomerDocument>(`hf_documents_${hotelId}`);
    const primaryCustomerDocs = docsTable.filter(d => d.customer_id === activeStay.primary_customer_id);
    const primaryCustomerWithDocs = primaryCustomer ? {
      ...primaryCustomer,
      customer_documents: primaryCustomerDocs
    } : undefined;

    const payments = getTable<Payment>(`hf_payments_${hotelId}`);
    const payment = payments.find(p => p.checkin_id === activeStay.id);

    const guests = getTable<CheckInGuest>(`hf_guests_${hotelId}`);
    const stayGuests = guests.filter(g => g.checkin_id === activeStay.id);

    const rooms = getTable<Room>(`hf_rooms_${hotelId}`);
    const room = rooms.find(r => r.id === roomId);

    const guestsWithCustomer = stayGuests.map(sg => {
      const cust = customers.find(c => c.id === sg.customer_id);
      const custDocs = docsTable.filter(d => d.customer_id === sg.customer_id);
      return {
        ...sg,
        customer: cust ? { ...cust, customer_documents: custDocs } : undefined
      };
    });

    return {
      ...activeStay,
      room,
      primary_customer: primaryCustomerWithDocs,
      guests: guestsWithCustomer,
      payment
    };
  },

  // Payments Operations
  getPayments: async (hotelId: string): Promise<(Payment & { customerName: string; roomNumber: string })[]> => {
    initMockDb();
    const payments = getTable<Payment>(`hf_payments_${hotelId}`);
    const checkIns = getTable<CheckIn>(`hf_checkins_${hotelId}`);
    const customers = getTable<Customer>(`hf_customers_${hotelId}`);
    const rooms = getTable<Room>(`hf_rooms_${hotelId}`);

    return payments.map(p => {
      const stay = checkIns.find(ch => ch.id === p.checkin_id);
      const cust = stay ? customers.find(c => c.id === stay.primary_customer_id) : null;
      const rm = stay ? rooms.find(r => r.id === stay.room_id) : null;

      return {
        ...p,
        customerName: cust ? cust.full_name : 'Unknown Guest',
        roomNumber: rm ? rm.room_number : 'N/A'
      };
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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
    initMockDb();
    const payments = getTable<Payment>(`hf_payments_${hotelId}`);
    const checkIns = getTable<CheckIn>(`hf_checkins_${hotelId}`);
    const customers = getTable<Customer>(`hf_customers_${hotelId}`);
    const rooms = getTable<Room>(`hf_rooms_${hotelId}`);

    // Occupancy Rate
    const totalRoomsCount = rooms.length;
    const occupiedRoomsCount = rooms.filter(r => r.status === 'Occupied').length;
    const occupancyRate = totalRoomsCount > 0 ? Math.round((occupiedRoomsCount / totalRoomsCount) * 100) : 0;

    // Daily & Monthly Revenue
    const dailyMap: Record<string, number> = {};
    const monthlyMap: Record<string, number> = {};

    payments.forEach(p => {
      // Use advance payment as actual revenue collected
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
    checkIns.forEach(ch => {
      const cust = customers.find(c => c.id === ch.primary_customer_id);
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
        const stay = checkIns.find(ch => ch.id === p.checkin_id && ch.status === 'Active');
        if (stay) {
          const cust = customers.find(c => c.id === stay.primary_customer_id);
          const rm = rooms.find(r => r.id === stay.room_id);
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
    checkIns.forEach(ch => {
      const rm = rooms.find(r => r.id === ch.room_id);
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
