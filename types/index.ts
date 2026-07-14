// ========================================================
// StayDesk CRM Types
// Location: types/index.ts
// ========================================================

export interface Hotel {
  id: string;
  hotel_name: string;
  owner_name: string;
  email: string;
  phone: string;
  subscription_plan: '30 Days' | '90 Days' | '1 Year';
  subscription_status: 'Active' | 'Expired' | 'Suspended';
  created_at: string;
}

export interface User {
  id: string;
  hotel_id: string | null;
  role: 'superadmin' | 'hotel_owner' | 'receptionist';
  email: string;
  created_at: string;
}

export type RoomStatus = 'Ready' | 'Occupied' | 'Maintenance' | 'Cleaning';

export interface Room {
  id: string;
  hotel_id: string;
  room_number: string;
  room_type: string;
  price: number;
  floor: string;
  capacity: number;
  status: RoomStatus;
  created_at: string;
}

export interface Customer {
  id: string;
  hotel_id: string;
  full_name: string;
  phone: string;
  gender: string;
  address?: string;
  city?: string;
  state?: string;
  country: string;
  created_at: string;
  customer_documents?: CustomerDocument[];
}

export interface CustomerDocument {
  id: string;
  customer_id: string;
  document_type: 'Aadhar' | 'Driving License' | 'Passport' | 'Voter ID';
  document_number: string;
  front_image?: string; // Data URI (base64) or storage path
  back_image?: string;  // Data URI (base64) or storage path
  created_at: string;
}

export interface CheckIn {
  id: string;
  hotel_id: string;
  room_id: string;
  primary_customer_id: string;
  number_of_guests: number;
  check_in: string; // ISO Date String
  expected_checkout: string; // ISO Date String
  status: 'Active' | 'Completed';
  created_at: string;
}

export interface CheckInGuest {
  id: string;
  checkin_id: string;
  customer_id: string;
  relationship: 'Self' | 'Friend' | 'Family' | 'Wife' | 'Husband' | 'GF' | 'BF' | 'Child';
  document_verified: boolean;
  created_at: string;
}

export interface Payment {
  id: string;
  checkin_id: string;
  room_price: number;
  advance: number;
  pending: number;
  payment_method: 'UPI' | 'Cash' | 'Card';
  created_at: string;
}

// Complete checkout details
export interface ExtendedCheckIn extends CheckIn {
  room?: Room;
  primary_customer?: Customer;
  guests?: (CheckInGuest & { customer?: Customer })[];
  payment?: Payment;
}
