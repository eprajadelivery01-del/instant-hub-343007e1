export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  role: string | null;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  document: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  logo_url: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
  banner_url: string | null;
  cover_url?: string | null;
  description: string | null;
  category?: string | null;
  rating?: number | null;
  is_active?: boolean;
  latitude: number | null;
  longitude: number | null;
  opening_hours: any | null;
  delivery_mode: string | null;
  city_id: string | null;
  delivery_fee: number | null;
  is_open?: boolean;
  business_hours?: string | null;
}

export interface Product {
  id: string;
  company_id: string;
  name: string | null;
  price: number | null;
  description: string | null;
  category: string;
  image_url: string | null;
  image_urls?: string[] | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  customer_id: string;
  company_id: string | null;
  status: string;
  total: number;
  delivery_fee: number | null;
  delivery_address: string | null;
  payment_method: string | null;
  notes: string | null;
  region_id: string | null;
  created_at: string;
  updated_at: string;
  company?: Company;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  quantity: number;
  price: number | null;
  product_name: string | null;
  product?: Product;
}

export interface Region {
  id: string;
  name: string;
  geometry: any | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  color: string;
  delivery_fee: number;
  city_id: string | null;
}

export interface Delivery {
  id: string;
  order_id: string | null;
  driver_id: string | null;
  pickup_address: string;
  delivery_address: string;
  status: string;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
  current_latitude: number | null;
  current_longitude: number | null;
  created_at: string;
  updated_at: string;
  driver?: DeliveryDriver;
}

export interface DeliveryDriver {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  vehicle_type: string | null;
  status: string;
  is_online: boolean;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
}

export interface ChatMessage {
  id: string;
  delivery_id: string;
  sender_id: string | null;
  message: string | null;
  message_type: string | null;
  read: boolean;
  created_at: string;
}

export interface Address {
  id: string;
  user_id: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  complement: string | null;
  reference: string | null;
  latitude: number | null;
  longitude: number | null;
  label: string | null;
  created_at: string;
}

export interface CartItem {
  id?: string; // unique id for cart item (product_id + options_hash)
  product: Product;
  quantity: number;
  options?: any[];
}

export interface Review {
  id: string;
  order_id: string;
  user_id: string;
  company_id: string | null;
  driver_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_value: number;
  max_discount_value: number | null;
  expires_at: string | null;
  usage_limit: number | null;
  used_count: number;
  company_id: string | null;
  active: boolean;
  created_at: string;
}

export interface UserCoupon {
  id: string;
  user_id: string;
  coupon_id: string;
  used_at: string | null;
  order_id: string | null;
  created_at: string;
  coupon?: Coupon;
}
