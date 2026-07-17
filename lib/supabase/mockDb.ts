// ========================================================
// StayDesk CRM / HotelFlow CRM Mock Database Service
// Location: lib/supabase/mockDb.ts
// ========================================================

import { Hotel, User, Room, RoomStatus, Customer, CustomerDocument, CustomerHistory, CheckIn, CheckInGuest, Payment, ExtendedCheckIn } from '../../types';

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

const DEFAULT_ROOMS = (hotelId: string): Room[] => [
  { id: `r-${hotelId}-101`, hotel_id: hotelId, room_number: '101', room_type: 'Deluxe Room', price: 2500, floor: 'Ground Floor', capacity: 2, status: 'Ready', created_at: new Date().toISOString() },
  { id: `r-${hotelId}-102`, hotel_id: hotelId, room_number: '102', room_type: 'Super Deluxe Room', price: 4500, floor: 'Ground Floor', capacity: 2, status: 'Ready', created_at: new Date().toISOString() },
  { id: `r-${hotelId}-103`, hotel_id: hotelId, room_number: '103', room_type: 'Family Suite', price: 6500, floor: 'Ground Floor', capacity: 4, status: 'Ready', created_at: new Date().toISOString() },
  { id: `r-${hotelId}-104`, hotel_id: hotelId, room_number: '104', room_type: 'Executive Suite', price: 9500, floor: 'Ground Floor', capacity: 2, status: 'Ready', created_at: new Date().toISOString() },
  { id: `r-${hotelId}-201`, hotel_id: hotelId, room_number: '201', room_type: 'Deluxe Room', price: 2500, floor: 'First Floor', capacity: 2, status: 'Ready', created_at: new Date().toISOString() },
  { id: `r-${hotelId}-202`, hotel_id: hotelId, room_number: '202', room_type: 'Super Deluxe Room', price: 4500, floor: 'First Floor', capacity: 2, status: 'Ready', created_at: new Date().toISOString() },
  { id: `r-${hotelId}-203`, hotel_id: hotelId, room_number: '203', room_type: 'Family Suite', price: 6500, floor: 'First Floor', capacity: 4, status: 'Ready', created_at: new Date().toISOString() },
  { id: `r-${hotelId}-204`, hotel_id: hotelId, room_number: '204', room_type: 'Executive Suite', price: 9500, floor: 'First Floor', capacity: 2, status: 'Ready', created_at: new Date().toISOString() },
];

const DEFAULT_CUSTOMERS = (hotelId: string): Customer[] => [
  { id: `c-${hotelId}-1`, hotel_id: hotelId, full_name: 'Rahul Verma', phone: '9876543210', gender: 'Male', address: 'MG Road', city: 'Mumbai', state: 'Maharashtra', country: 'India', created_at: new Date().toISOString() },
  { id: `c-${hotelId}-2`, hotel_id: hotelId, full_name: 'Priya Sharma', phone: '9876543211', gender: 'Female', address: 'Indiranagar', city: 'Bangalore', state: 'Karnataka', country: 'India', created_at: new Date().toISOString() },
];

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
        subscription_plan: 'Lifetime',
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
      setTable(`hf_rooms_${newHotelId}`, []);
      setTable(`hf_customers_${newHotelId}`, []);
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
    setTable(`hf_rooms_${newId}`, []);
    setTable(`hf_customers_${newId}`, []);
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

  updateHotelCMS: async (hotelId: string, cmsData: any): Promise<Hotel | null> => {
    const hotels = getTable<Hotel>('hf_hotels');
    const index = hotels.findIndex(h => h.id === hotelId);
    if (index === -1) return null;
    
    hotels[index].cms_data = cmsData;
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

  resetHotelPassword: async (email: string, password?: string): Promise<boolean> => {
    // In mockDb mode, password validation is not enforced, so we return true.
    return true;
  },

  // Rooms Operations
  getRooms: async (hotelId: string): Promise<Room[]> => {
    initMockDb();
    return getTable<Room>(`hf_rooms_${hotelId}`).filter(r => !r.deleted_at);
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

  updateRoomImage: async (hotelId: string, roomId: string, image: string): Promise<Room | null> => {
    const rooms = getTable<Room>(`hf_rooms_${hotelId}`);
    const index = rooms.findIndex(r => r.id === roomId);
    if (index === -1) return null;
    
    rooms[index].image_url = image;
    setTable(`hf_rooms_${hotelId}`, rooms);
    broadcastDbUpdate('rooms');
    return rooms[index];
  },

  updateRoomDetails: async (hotelId: string, roomId: string, details: { price?: number; image_url?: string; room_type?: string }): Promise<Room | null> => {
    const rooms = getTable<Room>(`hf_rooms_${hotelId}`);
    const index = rooms.findIndex(r => r.id === roomId);
    if (index === -1) return null;
    
    if (details.price !== undefined) rooms[index].price = details.price;
    if (details.image_url !== undefined) rooms[index].image_url = details.image_url;
    if (details.room_type !== undefined) rooms[index].room_type = details.room_type;
    
    setTable(`hf_rooms_${hotelId}`, rooms);
    broadcastDbUpdate('rooms');
    return rooms[index];
  },

  deleteRoom: async (hotelId: string, roomId: string): Promise<boolean> => {
    const rooms = getTable<Room>(`hf_rooms_${hotelId}`);
    const index = rooms.findIndex(r => r.id === roomId);
    if (index === -1) return false;
    rooms[index].deleted_at = new Date().toISOString();
    setTable(`hf_rooms_${hotelId}`, rooms);
    broadcastDbUpdate('rooms');
    return true;
  },

  // Customers Operations
  getCustomers: async (hotelId: string): Promise<Customer[]> => {
    initMockDb();
    return getTable<Customer>(`hf_customers_${hotelId}`).filter(c => !c.deleted_at);
  },

  searchCustomers: async (hotelId: string, query: string): Promise<Customer[]> => {
    const customers = getTable<Customer>(`hf_customers_${hotelId}`).filter(c => !c.deleted_at);
    const q = query.toLowerCase().trim();
    if (!q) return [];
    
    const tokens = q.split(/\s+/).filter(Boolean);
    const docs = getTable<CustomerDocument>(`hf_documents_${hotelId}`);

    return customers.filter(c => {
      const nameMatched = tokens.every(tok => c.full_name.toLowerCase().includes(tok));
      const phoneMatched = c.phone.includes(q);
      const emailMatched = c.email?.toLowerCase().includes(q) || false;
      const vehicleMatched = c.vehicle_number?.toLowerCase().includes(q) || false;
      const docMatched = docs.some(d => d.customer_id === c.id && d.document_number.includes(q));

      return nameMatched || phoneMatched || emailMatched || vehicleMatched || docMatched;
    });
  },

  getCustomerByPhoneOrAadhar: async (hotelId: string, identifier: string): Promise<{ customer: Customer; docs: CustomerDocument[]; stayCount: number; lastVisit: string | null; pendingBalance: number } | null> => {
    const customers = getTable<Customer>(`hf_customers_${hotelId}`).filter(c => !c.deleted_at);
    const cleanId = identifier.trim();
    
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cleanId);
    let customer = null;
    
    if (isUuid) {
      customer = customers.find(c => c.id === cleanId);
    } else {
      customer = customers.find(c => 
        c.phone === cleanId || 
        c.email?.toLowerCase() === cleanId.toLowerCase() || 
        c.vehicle_number?.toLowerCase() === cleanId.toLowerCase()
      );

      if (!customer) {
        const docsTable = getTable<CustomerDocument>(`hf_documents_${hotelId}`);
        const doc = docsTable.find(d => d.document_number === cleanId);
        if (doc) {
          customer = customers.find(c => c.id === doc.customer_id);
        }
      }

      if (!customer) {
        customer = customers.find(c => c.full_name.toLowerCase().includes(cleanId.toLowerCase()));
      }
    }

    if (!customer) return null;

    const docsTable = getTable<CustomerDocument>(`hf_documents_${hotelId}`);
    const customerDocs = docsTable.filter(d => d.customer_id === customer!.id);

    const checkIns = getTable<CheckIn>(`hf_checkins_${hotelId}`).filter(ch => !ch.deleted_at);
    const customerStays = checkIns.filter(ch => ch.primary_customer_id === customer!.id);
    
    const completedStays = customerStays.filter(ch => ch.status === 'Completed');
    completedStays.sort((a, b) => new Date(b.check_in).getTime() - new Date(a.check_in).getTime());
    const lastVisit = completedStays.length > 0 ? completedStays[0].check_in : null;

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
      pendingBalance
    };
  },

  addCustomer: async (hotelId: string, data: Omit<Customer, 'id' | 'hotel_id' | 'created_at'>, docType?: string, docNum?: string, frontImg?: string, backImg?: string): Promise<Customer> => {
    const customers = getTable<Customer>(`hf_customers_${hotelId}`);
    
    const existing = customers.find(c => c.phone === data.phone && !c.deleted_at);
    if (existing) {
      if (docType && docNum) {
        const docsTable = getTable<CustomerDocument>(`hf_documents_${hotelId}`);
        const existingDoc = docsTable.find(d => d.customer_id === existing.id && d.document_type === docType && d.document_number === docNum);
        if (!existingDoc) {
          const newDoc: CustomerDocument = {
            id: `doc-${Date.now()}`,
            customer_id: existing.id,
            document_type: docType as any,
            document_number: docNum,
            front_image: frontImg,
            back_image: backImg,
            is_primary: true,
            created_at: new Date().toISOString()
          };
          setTable(`hf_documents_${hotelId}`, [...docsTable, newDoc]);
        }
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
        is_primary: true,
        created_at: new Date().toISOString()
      };
      setTable(`hf_documents_${hotelId}`, [...docsTable, newDoc]);
    }

    broadcastDbUpdate('customers');
    return newCustomer;
  },

  updateCustomer: async (
    hotelId: string,
    customerId: string,
    customerData: Omit<Customer, 'id' | 'hotel_id' | 'created_at'>,
    docData?: { type: string; number: string; front: string; back: string }
  ): Promise<Customer | null> => {
    const customers = getTable<Customer>(`hf_customers_${hotelId}`);
    const idx = customers.findIndex(c => c.id === customerId);
    if (idx === -1) return null;

    customers[idx] = {
      ...customers[idx],
      ...customerData
    };
    setTable(`hf_customers_${hotelId}`, customers);

    if (docData) {
      const docs = getTable<CustomerDocument>(`hf_documents_${hotelId}`);
      const dIdx = docs.findIndex(d => d.customer_id === customerId && d.document_type === docData.type && d.document_number === docData.number);
      if (dIdx !== -1) {
        docs[dIdx] = {
          ...docs[dIdx],
          front_image: docData.front,
          back_image: docData.back
        };
      } else {
        const updatedDocs = docs.map(d => {
          if (d.customer_id === customerId) {
            return { ...d, is_primary: false };
          }
          return d;
        });
        updatedDocs.push({
          id: `doc-${Date.now()}`,
          customer_id: customerId,
          document_type: docData.type as any,
          document_number: docData.number,
          front_image: docData.front,
          back_image: docData.back,
          is_primary: true,
          created_at: new Date().toISOString()
        });
        setTable(`hf_documents_${hotelId}`, updatedDocs);
      }
    }

    broadcastDbUpdate('customers');
    return customers[idx];
  },

  deleteCustomer: async (hotelId: string, customerId: string): Promise<boolean> => {
    const customers = getTable<Customer>(`hf_customers_${hotelId}`);
    const index = customers.findIndex(c => c.id === customerId);
    if (index === -1) return false;
    customers[index].deleted_at = new Date().toISOString();
    setTable(`hf_customers_${hotelId}`, customers);
    broadcastDbUpdate('customers');
    return true;
  },

  setPrimaryDocument: async (hotelId: string, customerId: string, documentId: string): Promise<boolean> => {
    const docs = getTable<CustomerDocument>(`hf_documents_${hotelId}`);
    const updated = docs.map(d => {
      if (d.customer_id === customerId) {
        return { ...d, is_primary: d.id === documentId };
      }
      return d;
    });
    setTable(`hf_documents_${hotelId}`, updated);
    broadcastDbUpdate('customers');
    return true;
  },

  getCustomerHistory: async (hotelId: string, customerId: string): Promise<CustomerHistory[]> => {
    return [];
  },

  getCustomerStays: async (hotelId: string, customerId: string): Promise<any[]> => {
    initMockDb();
    const checkIns = getTable<any>(`hf_checkins_${hotelId}`) || [];
    const rooms = getTable<any>(`hf_rooms_${hotelId}`) || [];
    const payments = getTable<any>(`hf_payments_${hotelId}`) || [];

    const stays = checkIns.filter(ci => ci.primary_customer_id === customerId && !ci.deleted_at);

    const mapped = stays.map(stay => {
      const room = rooms.find(r => r.id === stay.room_id);
      const payment = payments.find(p => p.checkin_id === stay.id);
      return {
        id: stay.id,
        check_in: stay.check_in,
        expected_checkout: stay.expected_checkout,
        status: stay.status,
        room_number: room?.room_number || 'N/A',
        room_type: room?.room_type || 'N/A',
        room_price: Number(payment?.room_price || 0),
        advance: Number(payment?.advance || 0),
        pending: Number(payment?.pending || 0),
        payment_method: payment?.payment_method || 'N/A'
      };
    });

    mapped.sort((a, b) => new Date(b.check_in).getTime() - new Date(a.check_in).getTime());
    return mapped;
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
    const checkIns = getTable<CheckIn>(`hf_checkins_${hotelId}`).filter(ch => !ch.deleted_at);
    const activeStay = checkIns.find(ch => ch.room_id === roomId && ch.status === 'Active');
    
    if (!activeStay) return null;

    const customers = getTable<Customer>(`hf_customers_${hotelId}`).filter(c => !c.deleted_at);
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

    const rooms = getTable<Room>(`hf_rooms_${hotelId}`).filter(r => !r.deleted_at);
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
    const checkIns = getTable<CheckIn>(`hf_checkins_${hotelId}`).filter(ch => !ch.deleted_at);
    const customers = getTable<Customer>(`hf_customers_${hotelId}`).filter(c => !c.deleted_at);
    const rooms = getTable<Room>(`hf_rooms_${hotelId}`).filter(r => !r.deleted_at);

    return payments.map(p => {
      const stay = checkIns.find(ch => ch.id === p.checkin_id);
      const cust = stay ? customers.find(c => c.id === stay.primary_customer_id) : null;
      const rm = stay ? rooms.find(r => r.id === stay.room_id) : null;

      return {
        ...p,
        customerName: cust ? cust.full_name : 'Unknown Guest',
        roomNumber: rm ? rm.room_number : 'N/A'
      };
    }).filter(p => checkIns.some(ch => ch.id === p.checkin_id)).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  // Bookings Management
  getBookings: async (hotelId: string): Promise<ExtendedCheckIn[]> => {
    initMockDb();
    const checkIns = getTable<CheckIn>(`hf_checkins_${hotelId}`).filter(ch => !ch.deleted_at);
    const customers = getTable<Customer>(`hf_customers_${hotelId}`).filter(c => !c.deleted_at);
    const rooms = getTable<Room>(`hf_rooms_${hotelId}`).filter(r => !r.deleted_at);
    const payments = getTable<Payment>(`hf_payments_${hotelId}`);

    return checkIns.map(b => {
      const room = rooms.find(r => r.id === b.room_id);
      const customer = customers.find(c => c.id === b.primary_customer_id);
      const payment = payments.find(p => p.checkin_id === b.id);

      return {
        ...b,
        room,
        primary_customer: customer,
        payment
      };
    }).sort((a, b) => new Date(b.check_in).getTime() - new Date(a.check_in).getTime());
  },

  createBooking: async (
    hotelId: string,
    bookingData: {
      room_id: string;
      primary_customer_id: string;
      check_in: string;
      expected_checkout: string;
      number_of_guests: number;
      status?: 'Reserved' | 'Active';
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
    initMockDb();
    const checkIns = getTable<CheckIn>(`hf_checkins_${hotelId}`);
    const checkInId = `chk-${Date.now()}`;
    const status = bookingData.status || 'Reserved';

    const newBooking: CheckIn = {
      id: checkInId,
      hotel_id: hotelId,
      room_id: bookingData.room_id,
      primary_customer_id: bookingData.primary_customer_id,
      number_of_guests: bookingData.number_of_guests,
      check_in: bookingData.check_in,
      expected_checkout: bookingData.expected_checkout,
      status: status,
      created_at: new Date().toISOString()
    };

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

    const guests = getTable<CheckInGuest>(`hf_guests_${hotelId}`);
    const newGuests: CheckInGuest[] = guestsList.map((g, idx) => ({
      id: `g-${Date.now()}-${idx}`,
      checkin_id: checkInId,
      customer_id: g.customer_id,
      relationship: g.relationship,
      document_verified: g.document_verified,
      created_at: new Date().toISOString()
    }));

    const rooms = getTable<Room>(`hf_rooms_${hotelId}`);
    if (status === 'Active') {
      const rIndex = rooms.findIndex(r => r.id === bookingData.room_id);
      if (rIndex !== -1) {
        rooms[rIndex].status = 'Occupied';
      }
    }

    setTable(`hf_checkins_${hotelId}`, [...checkIns, newBooking]);
    setTable(`hf_payments_${hotelId}`, [...payments, newPayment]);
    setTable(`hf_guests_${hotelId}`, [...guests, ...newGuests]);
    setTable(`hf_rooms_${hotelId}`, rooms);

    broadcastDbUpdate('checkins');
    if (status === 'Active') {
      broadcastDbUpdate('rooms');
    }
    broadcastDbUpdate('payments');

    return newBooking;
  },

  cancelBooking: async (hotelId: string, bookingId: string): Promise<CheckIn | null> => {
    initMockDb();
    const checkIns = getTable<CheckIn>(`hf_checkins_${hotelId}`);
    const index = checkIns.findIndex(ch => ch.id === bookingId);
    if (index === -1) return null;

    const oldStatus = checkIns[index].status;
    checkIns[index].status = 'Cancelled';

    const roomId = checkIns[index].room_id;
    const rooms = getTable<Room>(`hf_rooms_${hotelId}`);

    if (oldStatus === 'Active' && roomId) {
      const rIndex = rooms.findIndex(r => r.id === roomId);
      if (rIndex !== -1) {
        rooms[rIndex].status = 'Ready';
      }
    }

    setTable(`hf_checkins_${hotelId}`, checkIns);
    setTable(`hf_rooms_${hotelId}`, rooms);

    broadcastDbUpdate('checkins');
    broadcastDbUpdate('rooms');

    return checkIns[index];
  },

  checkInBooking: async (hotelId: string, bookingId: string): Promise<CheckIn | null> => {
    initMockDb();
    const checkIns = getTable<CheckIn>(`hf_checkins_${hotelId}`);
    const index = checkIns.findIndex(ch => ch.id === bookingId);
    if (index === -1) return null;

    checkIns[index].status = 'Active';
    checkIns[index].check_in = new Date().toISOString();

    const roomId = checkIns[index].room_id;
    const rooms = getTable<Room>(`hf_rooms_${hotelId}`);

    if (roomId) {
      const rIndex = rooms.findIndex(r => r.id === roomId);
      if (rIndex !== -1) {
        rooms[rIndex].status = 'Occupied';
      }
    }

    setTable(`hf_checkins_${hotelId}`, checkIns);
    setTable(`hf_rooms_${hotelId}`, rooms);

    broadcastDbUpdate('checkins');
    broadcastDbUpdate('rooms');

    return checkIns[index];
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
    const checkIns = getTable<CheckIn>(`hf_checkins_${hotelId}`).filter(ch => !ch.deleted_at);
    const customers = getTable<Customer>(`hf_customers_${hotelId}`).filter(c => !c.deleted_at);
    const rooms = getTable<Room>(`hf_rooms_${hotelId}`).filter(r => !r.deleted_at);

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
  },
  createWebBooking: async (
    hotelId: string,
    webBookingData: {
      full_name: string;
      phone: string;
      email: string;
      check_in: string;
      expected_checkout: string;
      number_of_guests: number;
      room_type: string;
      special_requests?: string;
    }
  ): Promise<any> => {
    initMockDb();
    const requests = getTable<any>(`hf_booking_requests_${hotelId}`) || [];
    const request = {
      id: Math.random().toString(36).substring(2, 9),
      hotel_id: hotelId,
      full_name: webBookingData.full_name,
      phone: webBookingData.phone,
      email: webBookingData.email,
      check_in: webBookingData.check_in,
      expected_checkout: webBookingData.expected_checkout,
      number_of_guests: webBookingData.number_of_guests,
      room_type: webBookingData.room_type,
      special_requests: webBookingData.special_requests || '',
      status: 'Pending',
      created_at: new Date().toISOString()
    };
    requests.push(request);
    setTable(`hf_booking_requests_${hotelId}`, requests);
    broadcastDbUpdate('booking_requests');
    return request;
  },

  confirmBooking: async (hotelId: string, bookingId: string, roomId: string): Promise<any> => {
    initMockDb();
    const checkIns = getTable<CheckIn>(`hf_checkins_${hotelId}`);
    const index = checkIns.findIndex(ch => ch.id === bookingId);
    if (index === -1) return null;

    checkIns[index].status = 'Reserved';
    checkIns[index].room_id = roomId;

    setTable(`hf_checkins_${hotelId}`, checkIns);
    broadcastDbUpdate('checkins');
    return checkIns[index];
  },

  getPendingBookingRequests: async (hotelId: string): Promise<any[]> => {
    initMockDb();
    const requests = getTable<any>(`hf_booking_requests_${hotelId}`) || [];
    return requests.filter((r: any) => r.status === 'Pending').sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  approveBookingRequest: async (hotelId: string, requestId: string, roomId: string): Promise<any> => {
    initMockDb();
    const requests = getTable<any>(`hf_booking_requests_${hotelId}`) || [];
    const reqIndex = requests.findIndex((r: any) => r.id === requestId);
    if (reqIndex === -1) throw new Error('Booking request not found');

    const req = requests[reqIndex];

    // Find or create customer
    const customers = getTable<Customer>(`hf_customers_${hotelId}`);
    let customer = customers.find(c => c.phone === req.phone);
    if (!customer) {
      customer = {
        id: Math.random().toString(36).substring(2, 9),
        hotel_id: hotelId,
        full_name: req.full_name,
        phone: req.phone,
        email: req.email,
        city: 'Website Booking',
        country: 'India',
        gender: 'Male',
        created_at: new Date().toISOString()
      };
      customers.push(customer);
      setTable(`hf_customers_${hotelId}`, customers);
    }

    // Get room details
    const rooms = getTable<Room>(`hf_rooms_${hotelId}`);
    const room = rooms.find(r => r.id === roomId);
    if (!room) throw new Error('Room not found');

    // Create reservation record
    const checkIns = getTable<CheckIn>(`hf_checkins_${hotelId}`);
    const checkIn: CheckIn = {
      id: Math.random().toString(36).substring(2, 9),
      hotel_id: hotelId,
      room_id: roomId,
      primary_customer_id: customer.id,
      number_of_guests: req.number_of_guests,
      check_in: req.check_in,
      expected_checkout: req.expected_checkout,
      status: 'Reserved',
      created_at: new Date().toISOString()
    };
    checkIns.push(checkIn);
    setTable(`hf_checkins_${hotelId}`, checkIns);

    // Create payment record
    const payments = getTable<any>(`hf_payments_${hotelId}`);
    payments.push({
      id: Math.random().toString(36).substring(2, 9),
      checkin_id: checkIn.id,
      room_price: Number(room.price) || 2500,
      advance: 0,
      pending: Number(room.price) || 2500,
      payment_method: 'Cash',
      created_at: new Date().toISOString()
    });
    setTable(`hf_payments_${hotelId}`, payments);

    // Mark request as Approved
    requests[reqIndex].status = 'Approved';
    setTable(`hf_booking_requests_${hotelId}`, requests);

    broadcastDbUpdate('booking_requests');
    broadcastDbUpdate('checkins');
    broadcastDbUpdate('customers');
    broadcastDbUpdate('rooms');
    return checkIn;
  },

  rejectBookingRequest: async (hotelId: string, requestId: string): Promise<boolean> => {
    initMockDb();
    const requests = getTable<any>(`hf_booking_requests_${hotelId}`) || [];
    const index = requests.findIndex((r: any) => r.id === requestId);
    if (index === -1) throw new Error('Booking request not found');

    requests[index].status = 'Rejected';
    setTable(`hf_booking_requests_${hotelId}`, requests);

    broadcastDbUpdate('booking_requests');
    return true;
  }
};
