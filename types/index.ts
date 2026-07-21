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
  subscription_plan: '30 Days' | '90 Days' | '1 Year' | 'Lifetime';
  subscription_status: 'Active' | 'Expired' | 'Suspended';
  cms_data?: any;
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
  image_url?: string;
  deleted_at?: string;
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
  email?: string;
  vehicle_number?: string;
  emergency_contact?: string;
  nationality?: string;
  deleted_at?: string;
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
  upload_date?: string;
  verification_date?: string;
  uploaded_by?: string;
  is_primary: boolean;
  created_at: string;
}

export interface CustomerHistory {
  id: string;
  customer_id: string;
  field_name: string;
  old_value?: string;
  new_value?: string;
  changed_by?: string;
  changed_at: string;
  reason?: string;
}

export interface CheckIn {
  id: string;
  hotel_id: string;
  room_id: string;
  primary_customer_id: string;
  number_of_guests: number;
  check_in: string; // ISO Date String
  expected_checkout: string; // ISO Date String
  status: 'Pending' | 'Reserved' | 'Active' | 'Completed' | 'Cancelled';
  deleted_at?: string;
  created_at: string;
  purpose_of_stay?: string;
  arrival_from?: string;
  residential_address?: string;
  address_proof_type?: string;
  document_number?: string;
  vehicle_number?: string;
  check_in_date?: string;
  check_in_time?: string;
  check_out_date?: string;
  check_out_time?: string;
  total_nights?: number;
  room_rate?: number;
  room_charges?: number;
  subtotal?: number;
  discount?: number;
  extra_charges?: number;
  tax_amount?: number;
  grand_total?: number;
  actual_checkout?: string;
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
  final_payment_method?: 'UPI' | 'Cash' | 'Card';
  created_at: string;
}

// Complete checkout details
export interface ExtendedCheckIn extends CheckIn {
  room?: Room;
  primary_customer?: Customer;
  guests?: (CheckInGuest & { customer?: Customer })[];
  payment?: Payment;
}

export interface BookingRequest {
  id: string;
  hotel_id: string;
  full_name: string;
  phone: string;
  email: string;
  check_in: string;
  expected_checkout: string;
  number_of_guests: number;
  room_type: string;
  special_requests?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  created_at: string;
}

export interface FolioLedger {
  id: string;
  hotel_id: string;
  checkin_id: string;
  customer_id: string;
  room_id?: string | null;
  transaction_type: 'Debit' | 'Credit';
  category: string;
  description: string;
  debit: number;
  credit: number;
  tax: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  reference_number?: string | null;
  status: 'Active' | 'Void' | 'Adjusted';
}

