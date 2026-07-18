// ========================================================
// Supabase Cloud Database Client Adapter
// Location: lib/supabase/supabaseDb.ts
// ========================================================

import { supabase } from './supabaseClient';
import { User, Hotel, Room, Customer, CustomerDocument, CustomerHistory, CheckIn, CheckInGuest, Payment, ExtendedCheckIn, RoomStatus } from '../../types';

// Broadcast changes locally so that multiple open tabs refresh automatically on edits
const broadcastChannel = typeof window !== 'undefined' ? new BroadcastChannel('hotelflow-sync') : null;
const broadcastDbUpdate = (type: string) => {
  if (broadcastChannel) {
    broadcastChannel.postMessage({ type: 'DB_UPDATE', table: type, timestamp: Date.now() });
  }
};

// Helper: Convert base64 Data URI to Blob for storage uploading
const dataURItoBlob = (dataURI: string) => {
  const parts = dataURI.split(',');
  const byteString = atob(parts[1]);
  const mimeString = parts[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
};

// Helper: Upload file to Supabase Storage and return path
const uploadImageToStorage = async (hotelId: string, customerId: string, side: 'front' | 'back', base64Data: string | undefined): Promise<string> => {
  if (!supabase || !base64Data) return '';
  if (!base64Data.startsWith('data:')) return base64Data; // Already URL/path

  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) throw listError;

    if (!buckets?.some(b => b.id === 'customer-documents')) {
      const { error: createError } = await supabase.storage.createBucket('customer-documents', {
        public: false,
        fileSizeLimit: 5242880 // 5MB
      });
      if (createError) throw createError;
    }

    const blob = dataURItoBlob(base64Data);
    const fileExt = blob.type.split('/')[1] || 'png';
    const filePath = `${hotelId}/${customerId}/${side}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('customer-documents')
      .upload(filePath, blob, {
        contentType: blob.type,
        upsert: true
      });

    if (uploadError) throw uploadError;
    return filePath;
  } catch (err) {
    console.error('Failed to upload image to Supabase Storage:', err);
    throw new Error('Storage Upload Failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
  }
};

// Helper: Upload room image to storage
const uploadRoomImageToStorage = async (hotelId: string, roomId: string, base64Data: string): Promise<string> => {
  if (!supabase || !base64Data) return '';
  if (!base64Data.startsWith('data:')) return base64Data;

  try {
    // Check if hotel-assets bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.some(b => b.id === 'hotel-assets')) {
      const { error: createError } = await supabase.storage.createBucket('hotel-assets', {
        public: true,
        fileSizeLimit: 5242880 // 5MB
      });
      if (createError) throw createError;
    }

    const blob = dataURItoBlob(base64Data);
    const fileExt = blob.type.split('/')[1] || 'png';
    const filePath = `${hotelId}/rooms/${roomId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('hotel-assets')
      .upload(filePath, blob, {
        contentType: blob.type,
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from('hotel-assets').getPublicUrl(filePath);
    return publicUrl || '';
  } catch (err) {
    console.error('Failed to upload room photo:', err);
    throw new Error('Room photo upload failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
  }
};

// Helper: Get pre-signed URL for storage path
const resolveImageUrl = async (imagePath: string | null | undefined): Promise<string> => {
  if (!imagePath) return '';
  if (imagePath.startsWith('data:') || imagePath.startsWith('http')) return imagePath;
  if (!supabase) return '';

  const isPublicAsset = imagePath.includes('/rooms/') || imagePath.includes('/gallery/') || imagePath.includes('/hero/');
  const bucketName = isPublicAsset ? 'hotel-assets' : 'customer-documents';

  try {
    if (isPublicAsset) {
      const { data: pubData } = supabase.storage.from(bucketName).getPublicUrl(imagePath);
      return pubData.publicUrl || '';
    }

    const { data, error } = await supabase.storage.from(bucketName).createSignedUrl(imagePath, 3600);
    if (error || !data) {
      // Fallback to publicUrl if signing fails
      const { data: pubData } = supabase.storage.from(bucketName).getPublicUrl(imagePath);
      return pubData.publicUrl || '';
    }
    return data.signedUrl || '';
  } catch (e) {
    const { data: pubData } = supabase.storage.from(bucketName).getPublicUrl(imagePath);
    return pubData.publicUrl || '';
  }
};

// Helper: Map list of documents to resolve paths asynchronously
const resolveDocs = async (docs: any[] | null | undefined) => {
  if (!docs) return [];
  const resolved = await Promise.all(
    docs.map(async d => ({
      ...d,
      front_image: await resolveImageUrl(d.front_image),
      back_image: await resolveImageUrl(d.back_image)
    }))
  );
  return resolved;
};

export const supabaseDb = {
  // Authentication
  login: async (email: string, password?: string): Promise<{ user: User; hotel: Hotel | null; access_token?: string } | null> => {
    if (!supabase) return null;
    const lowercaseEmail = email.toLowerCase().trim();
    let access_token: string | undefined = undefined;
    let authUser: any = null;

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
      
      authUser = authData.user;
      const session = (await supabase.auth.getSession()).data.session;
      access_token = session?.access_token;
    } else {
      const session = (await supabase.auth.getSession()).data.session;
      access_token = session?.access_token;
      authUser = session?.user || null;
    }

    // Check if the user exists in our public users table by their auth ID
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    // If the user profile exists but email casing is different, update it to ensure consistency
    if (user && user.email !== lowercaseEmail) {
      const { data: updatedUser } = await supabase
        .from('users')
        .update({ email: lowercaseEmail })
        .eq('id', authUser.id)
        .select('*')
        .maybeSingle();
      if (updatedUser) {
        user = updatedUser;
      }
    }

    if (!user && !userError && authUser) {
      // Self-healing: If user exists in auth.users, dynamically create public.users record
      const defaultRole = lowercaseEmail === 'wasimhavaldar70@gmail.com' || lowercaseEmail === 'admin@staydesk.com' ? 'superadmin' : 'hotel_owner';
      
      // Find matching hotel by email (case-insensitive)
      const { data: matchingHotel } = await supabase
        .from('hotels')
        .select('id')
        .ilike('email', lowercaseEmail)
        .maybeSingle();

      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          id: authUser.id,
          email: lowercaseEmail,
          role: defaultRole,
          hotel_id: matchingHotel ? matchingHotel.id : null
        })
        .select('*')
        .maybeSingle();

      if (!insertError && newUser) {
        user = newUser;
      } else {
        console.log('Self-healing public.users insertion failed:', insertError);
      }
    }

    if (!user) {
      console.log('Login match failed or error in public schema:', userError);
      return null;
    }

    if (user.role === 'superadmin') {
      return { user, hotel: null, access_token };
    }

    // Fetch the hotel details if it's an owner or receptionist
    if (user.hotel_id) {
      const { data: hotel, error: hotelError } = await supabase
        .from('hotels')
        .select('*')
        .eq('id', user.hotel_id)
        .maybeSingle();
      return { user, hotel: hotel || null, access_token };
    }

    return { user, hotel: null, access_token };
  },

  uploadPublicAsset: async (hotelId: string, folder: string, base64Data: string): Promise<string> => {
    if (!supabase || !base64Data) return '';
    if (!base64Data.startsWith('data:')) return base64Data;

    try {
      // Check if hotel-assets bucket exists
      const { data: buckets } = await supabase.storage.listBuckets();
      if (!buckets?.some(b => b.id === 'hotel-assets')) {
        const { error: createError } = await supabase.storage.createBucket('hotel-assets', {
          public: true,
          fileSizeLimit: 5242880 // 5MB
        });
        if (createError) throw createError;
      }

      const blob = dataURItoBlob(base64Data);
      const fileExt = blob.type.split('/')[1] || 'png';
      const filePath = `${hotelId}/${folder}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('hotel-assets')
        .upload(filePath, blob, {
          contentType: blob.type,
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('hotel-assets').getPublicUrl(filePath);
      return publicUrl || '';
    } catch (err) {
      console.error('Failed to upload public asset:', err);
      throw new Error('Public asset upload failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
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

  getHotelById: async (hotelId: string): Promise<Hotel | null> => {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('hotels')
      .select('*')
      .eq('id', hotelId)
      .single();
    return error ? null : data;
  },

  addHotel: async (data: Omit<Hotel, 'id' | 'created_at' | 'subscription_status'> & { password?: string }): Promise<Hotel> => {
    const session = supabase ? (await supabase.auth.getSession()).data.session : null;
    const token = session?.access_token || '';

    const response = await fetch('/api/provision-hotel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
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

  updateHotelCMS: async (hotelId: string, cmsData: any): Promise<Hotel | null> => {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('hotels')
      .update({ cms_data: cmsData })
      .eq('id', hotelId)
      .select()
      .single();
    
    if (error) {
      console.error('Failed to update hotel CMS:', error);
      throw error;
    }
    broadcastDbUpdate('hotels');
    return data;
  },

  deleteHotel: async (id: string): Promise<boolean> => {
    const session = supabase ? (await supabase.auth.getSession()).data.session : null;
    const token = session?.access_token || '';

    const response = await fetch('/api/delete-hotel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
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

  resetHotelPassword: async (email: string, password?: string): Promise<boolean> => {
    const session = supabase ? (await supabase.auth.getSession()).data.session : null;
    const token = session?.access_token || '';

    const response = await fetch('/api/reset-hotel-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        email: email,
        password: password
      })
    });

    const resData = await response.json();
    if (!response.ok) {
      throw new Error(resData.error || 'Failed to reset password');
    }

    return true;
  },

  // Rooms Operations
  getRooms: async (hotelId: string): Promise<Room[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('hotel_id', hotelId)
      .is('deleted_at', null)
      .order('room_number', { ascending: true });
    
    if (error || !data) return [];
    const resolvedRooms = await Promise.all(
      data.map(async r => ({
        ...r,
        image_url: r.image_url ? await resolveImageUrl(r.image_url) : ''
      }))
    );
    return resolvedRooms;
  },

  addRoom: async (hotelId: string, room: Omit<Room, 'id' | 'hotel_id' | 'created_at' | 'status' | 'image_url'>): Promise<Room> => {
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

  updateRoomImage: async (hotelId: string, roomId: string, base64OrUrl: string): Promise<Room | null> => {
    let storagePath = base64OrUrl;
    if (base64OrUrl && base64OrUrl.startsWith('data:')) {
      storagePath = await uploadRoomImageToStorage(hotelId, roomId, base64OrUrl);
    }

    if (!supabase) return null;
    const { data, error } = await supabase
      .from('rooms')
      .update({ image_url: storagePath })
      .eq('id', roomId)
      .eq('hotel_id', hotelId)
      .select()
      .single();

    if (error) {
      console.error('Update room image failed:', error.message);
      throw new Error('Failed to update room image: ' + error.message);
    }
    broadcastDbUpdate('rooms');
    
    return {
      ...data,
      image_url: data.image_url ? await resolveImageUrl(data.image_url) : ''
    };
  },

  updateRoomDetails: async (hotelId: string, roomId: string, details: { price?: number; image_url?: string; room_type?: string }): Promise<Room | null> => {
    let imagePath = details.image_url;
    if (details.image_url && details.image_url.startsWith('data:')) {
      imagePath = await uploadRoomImageToStorage(hotelId, roomId, details.image_url);
    }

    if (!supabase) return null;
    const { data, error } = await supabase
      .from('rooms')
      .update({
        ...(details.price !== undefined && { price: details.price }),
        ...(imagePath !== undefined && { image_url: imagePath }),
        ...(details.room_type !== undefined && { room_type: details.room_type })
      })
      .eq('id', roomId)
      .eq('hotel_id', hotelId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update room details:', error);
      throw error;
    }
    broadcastDbUpdate('rooms');
    return {
      ...data,
      image_url: data.image_url ? await resolveImageUrl(data.image_url) : ''
    };
  },

  deleteRoom: async (hotelId: string, roomId: string): Promise<boolean> => {
    if (!supabase) return false;
    const { error } = await supabase
      .from('rooms')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', roomId)
      .eq('hotel_id', hotelId);

    if (error) {
      console.error('Delete room failed:', error.message);
      throw new Error('Failed to delete room: ' + error.message);
    }
    broadcastDbUpdate('rooms');
    return true;
  },

  // Customers Operations
  getCustomers: async (hotelId: string): Promise<Customer[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('hotel_id', hotelId)
      .is('deleted_at', null)
      .order('full_name', { ascending: true });
    return error ? [] : data || [];
  },

  searchCustomers: async (hotelId: string, query: string): Promise<Array<{ customer: Customer; docs: CustomerDocument[]; stayCount: number; lastVisit: string | null; pendingBalance: number }>> => {
    if (!supabase) return [];
    const q = query.trim();
    if (!q) return [];

    const { data, error } = await supabase
      .from('customers')
      .select(`
        *,
        customer_documents(*),
        check_ins(id, check_in, expected_checkout, status, payments(pending))
      `)
      .eq('hotel_id', hotelId)
      .is('deleted_at', null)
      .or(`full_name.ilike.%${q}%,phone.like.%${q}%`);

    if (error || !data) return [];

    const results = await Promise.all(data.map(async (c: any) => {
      const docs = await resolveDocs(c.customer_documents);
      const stays = c.check_ins || [];
      const stayCount = stays.length;

      // Last Visit
      const completedStays = stays.filter((s: any) => s.status === 'Completed');
      completedStays.sort((a: any, b: any) => new Date(b.check_in).getTime() - new Date(a.check_in).getTime());
      const lastVisit = completedStays.length > 0 ? completedStays[0].check_in : null;

      // Outstanding Balance (pending payments from active stays)
      let pendingBalance = 0;
      const activeStays = stays.filter((s: any) => s.status === 'Active');
      activeStays.forEach((s: any) => {
        const pay = Array.isArray(s.payments) ? s.payments[0] : s.payments;
        if (pay) {
          pendingBalance += Number(pay.pending || 0);
        }
      });

      const customerInfo: Customer = {
        id: c.id,
        hotel_id: c.hotel_id,
        full_name: c.full_name,
        phone: c.phone,
        gender: c.gender,
        address: c.address,
        city: c.city,
        state: c.state,
        country: c.country,
        email: c.email,
        vehicle_number: c.vehicle_number,
        emergency_contact: c.emergency_contact,
        nationality: c.nationality,
        created_at: c.created_at
      };

      return {
        customer: customerInfo,
        docs,
        stayCount,
        lastVisit,
        pendingBalance
      };
    }));

    return results;
  },

  getCustomerByPhoneOrAadhar: async (hotelId: string, identifier: string): Promise<{ customer: Customer; docs: CustomerDocument[]; stayCount: number; lastVisit: string | null; pendingBalance: number } | null> => {
    if (!supabase) return null;
    const cleanId = identifier.trim();

    // 1. Fetch customer by phone
    let { data: customer, error } = await supabase
      .from('customers')
      .select('*')
      .eq('hotel_id', hotelId)
      .eq('phone', cleanId)
      .is('deleted_at', null)
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
          .is('deleted_at', null)
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

    const resolvedDocs = await resolveDocs(docs);

    // 4. Fetch stays and payments for stats
    const { data: stays } = await supabase
      .from('check_ins')
      .select('id, room_id, status, check_in')
      .eq('hotel_id', hotelId)
      .eq('primary_customer_id', customer.id)
      .is('deleted_at', null);

    const customerStays = stays || [];
    const stayCount = customerStays.length;

    // Last Visit
    const completedStays = customerStays.filter(s => s.status === 'Completed');
    completedStays.sort((a, b) => new Date(b.check_in).getTime() - new Date(a.check_in).getTime());
    const lastVisit = completedStays.length > 0 ? completedStays[0].check_in : null;

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
      docs: resolvedDocs || [],
      stayCount,
      lastVisit,
      pendingBalance
    };
  },

  addCustomer: async (hotelId: string, data: Omit<Customer, 'id' | 'hotel_id' | 'created_at'>, docType?: string, docNum?: string, frontImg?: string, backImg?: string): Promise<Customer> => {
    if (!supabase) throw new Error('Supabase client not initialized');

    // Check if phone already exists (excluding soft deleted)
    const { data: existing } = await supabase
      .from('customers')
      .select('*')
      .eq('hotel_id', hotelId)
      .eq('phone', data.phone)
      .is('deleted_at', null)
      .maybeSingle();

    if (existing) {
      // If customer exists, check if new documents need to be added
      if (docType && docNum) {
        let finalFront = '';
        let finalBack = '';
        try {
          finalFront = await uploadImageToStorage(hotelId, existing.id, 'front', frontImg);
          finalBack = await uploadImageToStorage(hotelId, existing.id, 'back', backImg);
        } catch (err) {
          console.error('Storage upload failed, falling back to base64:', err);
          finalFront = frontImg || '';
          finalBack = backImg || '';
        }

        const { error: docError } = await supabase
          .from('customer_documents')
          .insert({
            customer_id: existing.id,
            document_type: docType,
            document_number: docNum,
            front_image: finalFront,
            back_image: finalBack
          });
        
        if (docError) {
          throw new Error('Failed to create customer document: ' + docError.message);
        }
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
        country: data.country || 'India',
        email: data.email,
        vehicle_number: data.vehicle_number,
        emergency_contact: data.emergency_contact,
        nationality: data.nationality || 'Indian'
      })
      .select()
      .single();

    if (error || !newCustomer) {
      throw new Error(error?.message || 'Failed to create customer');
    }

    // Add customer document
    if (docType && docNum) {
      let finalFront = '';
      let finalBack = '';
      try {
        finalFront = await uploadImageToStorage(hotelId, newCustomer.id, 'front', frontImg);
        finalBack = await uploadImageToStorage(hotelId, newCustomer.id, 'back', backImg);
      } catch (err) {
        console.error('Storage upload failed, falling back to base64:', err);
        finalFront = frontImg || '';
        finalBack = backImg || '';
      }

      const { error: docError } = await supabase
        .from('customer_documents')
        .insert({
          customer_id: newCustomer.id,
          document_type: docType,
          document_number: docNum,
          front_image: finalFront,
          back_image: finalBack,
          is_primary: true,
          upload_date: new Date().toISOString()
        });

      if (docError) {
        throw new Error('Failed to create customer document: ' + docError.message);
      }
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
    if (!supabase) throw new Error('Supabase client not initialized');

    // 1. Update customer profile details
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .update({
        full_name: customerData.full_name,
        phone: customerData.phone,
        gender: customerData.gender,
        address: customerData.address,
        city: customerData.city,
        state: customerData.state,
        country: customerData.country,
        email: customerData.email,
        vehicle_number: customerData.vehicle_number,
        emergency_contact: customerData.emergency_contact,
        nationality: customerData.nationality
      })
      .eq('id', customerId)
      .eq('hotel_id', hotelId)
      .select()
      .single();

    if (customerError || !customer) {
      throw new Error(customerError?.message || 'Failed to update customer profile');
    }

    // 2. Update or insert document details
    if (docData) {
      // Find if document with this number/type exists
      const { data: existingDoc } = await supabase
        .from('customer_documents')
        .select('id')
        .eq('customer_id', customerId)
        .eq('document_type', docData.type)
        .eq('document_number', docData.number)
        .maybeSingle();

      let finalFront = '';
      let finalBack = '';
      try {
        finalFront = await uploadImageToStorage(hotelId, customerId, 'front', docData.front);
        finalBack = await uploadImageToStorage(hotelId, customerId, 'back', docData.back);
      } catch (err) {
        console.error('Storage upload failed, falling back to base64:', err);
        finalFront = docData.front || '';
        finalBack = docData.back || '';
      }

      if (existingDoc) {
        // Update images
        const { error: docError } = await supabase
          .from('customer_documents')
          .update({
            front_image: finalFront,
            back_image: finalBack
          })
          .eq('id', existingDoc.id);
        
        if (docError) throw new Error(docError.message);
      } else {
        // Set all other documents to non-primary if this new document is primary
        await supabase
          .from('customer_documents')
          .update({ is_primary: false })
          .eq('customer_id', customerId);

        // Insert new document
        const { error: docError } = await supabase
          .from('customer_documents')
          .insert({
            customer_id: customerId,
            document_type: docData.type,
            document_number: docData.number,
            front_image: finalFront,
            back_image: finalBack,
            is_primary: true,
            upload_date: new Date().toISOString()
          });

        if (docError) throw new Error(docError.message);
      }
    }

    broadcastDbUpdate('customers');
    return customer;
  },

  deleteCustomer: async (hotelId: string, customerId: string): Promise<boolean> => {
    if (!supabase) return false;
    const { error } = await supabase
      .from('customers')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', customerId)
      .eq('hotel_id', hotelId);

    if (error) {
      console.error('Delete customer failed:', error.message);
      throw new Error('Failed to delete customer: ' + error.message);
    }
    broadcastDbUpdate('customers');
    return true;
  },

  setPrimaryDocument: async (hotelId: string, customerId: string, documentId: string): Promise<boolean> => {
    if (!supabase) return false;
    
    // Set all other documents to non-primary
    await supabase
      .from('customer_documents')
      .update({ is_primary: false })
      .eq('customer_id', customerId);

    // Set selected to primary
    const { error } = await supabase
      .from('customer_documents')
      .update({ is_primary: true, verification_date: new Date().toISOString() })
      .eq('id', documentId);

    broadcastDbUpdate('customers');
    return !error;
  },

  getCustomerHistory: async (hotelId: string, customerId: string): Promise<CustomerHistory[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('customer_history')
      .select('*')
      .eq('customer_id', customerId)
      .order('changed_at', { ascending: false });
    return error ? [] : data || [];
  },

  getCustomerStays: async (hotelId: string, customerId: string): Promise<any[]> => {
    if (!supabase) return [];
    
    const { data: stays, error } = await supabase
      .from('check_ins')
      .select(`
        id,
        check_in,
        expected_checkout,
        status,
        room_id,
        rooms (
          room_number,
          room_type
        ),
        payments (
          room_price,
          advance,
          pending,
          payment_method
        )
      `)
      .eq('hotel_id', hotelId)
      .eq('primary_customer_id', customerId)
      .is('deleted_at', null)
      .order('check_in', { ascending: false });

    if (error) {
      console.error('Error fetching stays:', error);
      return [];
    }

    return (stays || []).map((stay: any) => {
      const roomInfo = Array.isArray(stay.rooms) ? stay.rooms[0] : stay.rooms;
      const paymentInfo = Array.isArray(stay.payments) ? stay.payments[0] : stay.payments;
      
      return {
        id: stay.id,
        check_in: stay.check_in,
        expected_checkout: stay.expected_checkout,
        status: stay.status,
        room_number: roomInfo?.room_number || 'N/A',
        room_type: roomInfo?.room_type || 'N/A',
        room_price: Number(paymentInfo?.room_price || 0),
        advance: Number(paymentInfo?.advance || 0),
        pending: Number(paymentInfo?.pending || 0),
        payment_method: paymentInfo?.payment_method || 'N/A'
      };
    });
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

    // Call the PostgreSQL transactional check-in RPC function
    const { data: checkinId, error } = await supabase.rpc('check_in_guests_transactional', {
      p_hotel_id: hotelId,
      p_room_id: checkInData.room_id,
      p_primary_customer_id: checkInData.primary_customer_id,
      p_number_of_guests: checkInData.number_of_guests,
      p_expected_checkout: checkInData.expected_checkout,
      p_room_price: paymentData.room_price,
      p_advance: paymentData.advance,
      p_pending: paymentData.pending,
      p_payment_method: paymentData.payment_method,
      p_guests: guestsList
    });

    if (error || !checkinId) {
      throw new Error(error?.message || 'Failed to complete transactional check-in');
    }

    // Broadcast synchronization updates
    broadcastDbUpdate('checkins');
    broadcastDbUpdate('rooms');
    broadcastDbUpdate('payments');

    // Fetch the newly created check-in to return it (matching original method signature)
    const { data: newCheckIn, error: fetchError } = await supabase
      .from('check_ins')
      .select('*')
      .eq('id', checkinId)
      .single();

    if (fetchError || !newCheckIn) {
      throw new Error(fetchError?.message || 'Failed to retrieve check-in details');
    }

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

    const { error } = await supabase.rpc('checkout_stay_transactional', {
      p_hotel_id: hotelId,
      p_checkin_id: checkInId,
      p_final_payment_method: finalPaymentMethod
    });

    if (error) {
      console.error('Checkout failed:', error.message);
      throw new Error('Checkout transaction failed: ' + error.message);
    }

    // Fetch the updated check-in to return
    const { data: checkIn, error: fetchError } = await supabase
      .from('check_ins')
      .select('*')
      .eq('id', checkInId)
      .eq('hotel_id', hotelId)
      .single();

    if (fetchError || !checkIn) {
      throw new Error(fetchError?.message || 'Failed to retrieve updated stay after checkout');
    }

    broadcastDbUpdate('checkins');
    broadcastDbUpdate('rooms');
    broadcastDbUpdate('payments');

    return checkIn;
  },

  // Get all active stays for the entire hotel in a single query to eliminate N+1 cascades
  getActiveStaysForHotel: async (hotelId: string): Promise<ExtendedCheckIn[]> => {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('check_ins')
      .select('*, primary_customer:customers(*), payment:payments(*)')
      .eq('hotel_id', hotelId)
      .eq('status', 'Active')
      .is('deleted_at', null);

    if (error) {
      console.error('Error fetching active stays for hotel:', error.message);
      return [];
    }

    return (data || []).map((stay: any) => ({
      ...stay,
      primary_customer: stay.primary_customer || undefined,
      payment: Array.isArray(stay.payment) ? stay.payment[0] : (stay.payment || undefined)
    })) as ExtendedCheckIn[];
  },

  // Full extended details for Room Modals
  getActiveStayForRoom: async (hotelId: string, roomId: string): Promise<ExtendedCheckIn | null> => {
    if (!supabase) return null;

    // Fetch active stay (excluding soft deleted)
    const { data: activeStay } = await supabase
      .from('check_ins')
      .select('*')
      .eq('hotel_id', hotelId)
      .eq('room_id', roomId)
      .eq('status', 'Active')
      .is('deleted_at', null)
      .maybeSingle();

    if (!activeStay) return null;

    // Fetch primary customer with documents (excluding soft deleted)
    const { data: primaryCustomer } = await supabase
      .from('customers')
      .select('*, customer_documents(*)')
      .eq('id', activeStay.primary_customer_id)
      .is('deleted_at', null)
      .maybeSingle();

    if (primaryCustomer && primaryCustomer.customer_documents) {
      primaryCustomer.customer_documents = await resolveDocs(primaryCustomer.customer_documents);
    }

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

    // Fetch room details (excluding soft deleted)
    const { data: room } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .is('deleted_at', null)
      .maybeSingle();

    const formattedGuests = await Promise.all((stayGuests || []).map(async g => {
      const cust = g.customers;
      if (cust && cust.customer_documents) {
        cust.customer_documents = await resolveDocs(cust.customer_documents);
      }
      return {
        id: g.id,
        checkin_id: g.checkin_id,
        customer_id: g.customer_id,
        relationship: g.relationship,
        document_verified: g.document_verified,
        created_at: g.created_at,
        customer: cust
      };
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

    // Fetch check-ins list for this hotel (excluding soft deleted)
    const { data: checkins } = await supabase
      .from('check_ins')
      .select('id, primary_customer_id, room_id')
      .eq('hotel_id', hotelId)
      .is('deleted_at', null);

    if (!checkins || checkins.length === 0) return [];
    const checkinIds = checkins.map(c => c.id);

    // Fetch payments matching checkinIds
    const { data: payments, error } = await supabase
      .from('payments')
      .select('*')
      .in('checkin_id', checkinIds)
      .order('created_at', { ascending: false });

    if (error || !payments) return [];

    // Resolve dependencies (excluding soft deleted)
    const customerIds = checkins.map(c => c.primary_customer_id).filter(Boolean);
    const roomIds = checkins.map(c => c.room_id).filter(Boolean);

    const { data: customers } = await supabase.from('customers').select('id, full_name').in('id', customerIds).is('deleted_at', null);
    const { data: rooms } = await supabase.from('rooms').select('id, room_number').in('id', roomIds).is('deleted_at', null);

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

  // Bookings Management (Optimized single joined query to resolve N+1 waterfall)
  getBookings: async (hotelId: string): Promise<ExtendedCheckIn[]> => {
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('check_ins')
      .select('*, room:rooms(*), primary_customer:customers(*), payment:payments(*)')
      .eq('hotel_id', hotelId)
      .is('deleted_at', null)
      .order('check_in', { ascending: false });

    if (error || !data) {
      console.error('Error fetching bookings:', error?.message);
      return [];
    }

    return data.map((b: any) => ({
      ...b,
      room: b.room || undefined,
      primary_customer: b.primary_customer || undefined,
      payment: Array.isArray(b.payment) ? b.payment[0] : (b.payment || undefined)
    })) as ExtendedCheckIn[];
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
    if (!supabase) throw new Error('Supabase client not initialized');
    const status = bookingData.status || 'Reserved';

    const { data: newBooking, error: bookingError } = await supabase
      .from('check_ins')
      .insert({
        hotel_id: hotelId,
        room_id: bookingData.room_id,
        primary_customer_id: bookingData.primary_customer_id,
        number_of_guests: bookingData.number_of_guests,
        check_in: bookingData.check_in,
        expected_checkout: bookingData.expected_checkout,
        status: status
      })
      .select()
      .single();

    if (bookingError || !newBooking) {
      throw new Error(bookingError?.message || 'Failed to create booking');
    }

    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        checkin_id: newBooking.id,
        room_price: paymentData.room_price,
        advance: paymentData.advance,
        pending: paymentData.pending,
        payment_method: paymentData.payment_method
      });

    if (paymentError) {
      console.error('Payment insert failed, but booking was created:', paymentError);
    }

    if (guestsList.length > 0) {
      const guestsToInsert = guestsList.map(g => ({
        checkin_id: newBooking.id,
        customer_id: g.customer_id,
        relationship: g.relationship,
        document_verified: g.document_verified
      }));
      await supabase.from('check_in_guests').insert(guestsToInsert);
    }

    if (status === 'Active') {
      await supabase
        .from('rooms')
        .update({ status: 'Occupied' })
        .eq('id', bookingData.room_id);
      broadcastDbUpdate('rooms');
    }

    broadcastDbUpdate('checkins');
    broadcastDbUpdate('payments');

    return newBooking;
  },

  cancelBooking: async (hotelId: string, bookingId: string): Promise<CheckIn | null> => {
    if (!supabase) return null;
    
    const { error } = await supabase.rpc('cancel_booking_transactional', {
      p_hotel_id: hotelId,
      p_booking_id: bookingId
    });

    if (error) {
      console.error('Cancel booking failed:', error.message);
      throw new Error('Cancel booking transaction failed: ' + error.message);
    }

    const { data: booking, error: fetchError } = await supabase
      .from('check_ins')
      .select('*')
      .eq('id', bookingId)
      .eq('hotel_id', hotelId)
      .single();

    if (fetchError || !booking) {
      throw new Error(fetchError?.message || 'Failed to retrieve updated stay after cancellation');
    }

    broadcastDbUpdate('checkins');
    broadcastDbUpdate('rooms');
    return booking;
  },

  checkInBooking: async (hotelId: string, bookingId: string): Promise<CheckIn | null> => {
    if (!supabase) return null;
    
    const { error } = await supabase.rpc('check_in_booking_transactional', {
      p_hotel_id: hotelId,
      p_booking_id: bookingId
    });

    if (error) {
      console.error('Check-in booking failed:', error.message);
      throw new Error('Check-in booking transaction failed: ' + error.message);
    }

    const { data: booking, error: fetchError } = await supabase
      .from('check_ins')
      .select('*')
      .eq('id', bookingId)
      .eq('hotel_id', hotelId)
      .single();

    if (fetchError || !booking) {
      throw new Error(fetchError?.message || 'Failed to retrieve updated stay after checking in');
    }

    broadcastDbUpdate('checkins');
    broadcastDbUpdate('rooms');
    return booking;
  },

  // Reports aggregations
  getReports: async (
    hotelId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{
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

    const { data, error } = await supabase.rpc('get_hotel_reports', {
      p_hotel_id: hotelId,
      p_start_date: startDate || null,
      p_end_date: endDate || null
    });

    if (error || !data) {
      console.error('Failed to retrieve server-side reports:', error);
      return { dailyRevenue: [], monthlyRevenue: [], occupancyRate: 0, repeatCustomers: [], pendingPayments: [], mostUsedRooms: [] };
    }

    return {
      dailyRevenue: data.dailyRevenue || [],
      monthlyRevenue: data.monthlyRevenue || [],
      occupancyRate: Number(data.occupancyRate) || 0,
      repeatCustomers: data.repeatCustomers || [],
      pendingPayments: data.pendingPayments || [],
      mostUsedRooms: data.mostUsedRooms || []
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
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data: request, error } = await supabase
      .from('booking_requests')
      .insert({
        hotel_id: hotelId,
        full_name: webBookingData.full_name,
        phone: webBookingData.phone,
        email: webBookingData.email,
        check_in: webBookingData.check_in,
        expected_checkout: webBookingData.expected_checkout,
        number_of_guests: webBookingData.number_of_guests,
        room_type: webBookingData.room_type,
        special_requests: webBookingData.special_requests || '',
        status: 'Pending'
      })
      .select()
      .single();

    if (error || !request) {
      throw new Error(error?.message || 'Failed to file booking request');
    }

    broadcastDbUpdate('booking_requests');
    return request;
  },

  confirmBooking: async (hotelId: string, bookingId: string, roomId: string): Promise<any> => {
    if (!supabase) return null;

    const { data: booking, error } = await supabase
      .from('check_ins')
      .update({ status: 'Reserved', room_id: roomId })
      .eq('id', bookingId)
      .eq('hotel_id', hotelId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Failed to confirm booking');
    }

    broadcastDbUpdate('checkins');
    return booking;
  },

  getPendingBookingRequests: async (hotelId: string): Promise<any[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('booking_requests')
      .select('*')
      .eq('hotel_id', hotelId)
      .eq('status', 'Pending')
      .order('created_at', { ascending: false });
    return error ? [] : data || [];
  },

  approveBookingRequest: async (hotelId: string, requestId: string, roomId: string): Promise<any> => {
    if (!supabase) throw new Error('Supabase client not initialized');

    // 1. Get the booking request details
    const { data: req, error: reqError } = await supabase
      .from('booking_requests')
      .select('*')
      .eq('id', requestId)
      .eq('hotel_id', hotelId)
      .single();

    if (reqError || !req) {
      throw new Error(reqError?.message || 'Failed to retrieve booking request details');
    }

    // 2. Find or create the customer record
    let { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('hotel_id', hotelId)
      .eq('phone', req.phone)
      .maybeSingle();

    if (!customer) {
      const { data: newCustomer, error: insertCustomerError } = await supabase
        .from('customers')
        .insert({
          hotel_id: hotelId,
          full_name: req.full_name,
          phone: req.phone,
          email: req.email,
          gender: 'Male',
          city: 'Website Booking',
          country: 'India'
        })
        .select()
        .single();

      if (insertCustomerError || !newCustomer) {
        throw new Error(insertCustomerError?.message || 'Failed to create customer profile');
      }
      customer = newCustomer;
    }

    // 3. Fetch the room details to get the price
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('price')
      .eq('id', roomId)
      .eq('hotel_id', hotelId)
      .single();

    if (roomError || !room) {
      throw new Error(roomError?.message || 'Failed to retrieve room details for allocation');
    }

    // 4. Create the booking record in check_ins with status = 'Reserved'
    const { data: checkIn, error: checkInError } = await supabase
      .from('check_ins')
      .insert({
        hotel_id: hotelId,
        room_id: roomId,
        primary_customer_id: customer.id,
        number_of_guests: req.number_of_guests,
        check_in: req.check_in,
        expected_checkout: req.expected_checkout,
        status: 'Reserved'
      })
      .select()
      .single();

    if (checkInError || !checkIn) {
      throw new Error(checkInError?.message || 'Failed to create check-in reservation');
    }

    // 5. Create the payments record
    const roomPrice = Number(room.price) || 2500;
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        checkin_id: checkIn.id,
        room_price: roomPrice,
        advance: 0,
        pending: roomPrice,
        payment_method: 'Cash'
      });

    if (paymentError) {
      console.error('Approved booking request payment registration warning:', paymentError);
    }

    // 6. Update booking request status to 'Approved'
    const { error: updateReqError } = await supabase
      .from('booking_requests')
      .update({ status: 'Approved' })
      .eq('id', requestId);

    if (updateReqError) {
      console.error('Failed to update booking request status to Approved:', updateReqError);
    }

    broadcastDbUpdate('booking_requests');
    broadcastDbUpdate('checkins');
    broadcastDbUpdate('customers');
    broadcastDbUpdate('rooms');
    return checkIn;
  },

  getDashboardStats: async (hotelId: string): Promise<any> => {
    if (!supabase) return null;
    const { data, error } = await supabase.rpc('get_dashboard_stats', {
      p_hotel_id: hotelId
    });
    if (error) {
      console.error('Failed to get dashboard stats:', error);
      return null;
    }
    return data;
  },

  rejectBookingRequest: async (hotelId: string, requestId: string): Promise<boolean> => {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { error } = await supabase
      .from('booking_requests')
      .update({ status: 'Rejected' })
      .eq('id', requestId)
      .eq('hotel_id', hotelId);

    if (error) {
      throw new Error(error.message || 'Failed to reject booking request');
    }

    broadcastDbUpdate('booking_requests');
    return true;
  }
};
