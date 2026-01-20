export interface Service {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
  description: string;
  active: boolean;
  icon: 'droplets' | 'sparkles' | 'car' | 'clock';
}

export interface ExtraService {
  id: string;
  name: string;
  price: number;
  description?: string;
}

export type DirtLevel = 'Normal' | 'Sujo' | 'Muito Sujo';

export interface Coupon {
  id: string;
  code: string;
  type: 'percent' | 'fixed'; // % or R$
  value: number;
  firstTimeOnly: boolean;
  expirationDate: string; // YYYY-MM-DD
  active: boolean;
  usedBy: string[]; // List of phone numbers who used this
}

export interface CashbackConfig {
  enabled: boolean;
  percentage: number; // e.g., 5 for 5%
}

export interface Appointment {
  id: string;
  serviceId: string;
  serviceName: string;
  price: number; // Final calculated price (after discount)
  originalPrice?: number; // Price before discount
  discountApplied?: number;
  couponCode?: string;
  
  date: string; // "YYYY-MM-DD" (Today)
  time: string; // Check-in Time (HH:mm)
  durationMinutes: number; // Base duration + extras duration (optional logic)
  
  // New Fields for Phases 2 & 3
  dirtLevel: DirtLevel;
  extras: string[]; // List of Extra IDs or Names
  
  customerName: string;
  customerPhone: string;
  vehicleModel: string;
  vehiclePlate?: string; 
  vehicleColor?: string; 
  paymentMethod?: 'Pix' | 'Débito' | 'Crédito'; 
  notes?: string;
  status: 'waiting' | 'in_progress' | 'completed' | 'cancelled';
  createdAt?: string;
  generatedCashback?: number; // How much cashback this visit generated
}

export interface ClientHistory {
  phone: string;
  name: string;
  totalVisits: number;
  totalSpent: number; // Added for Cashback Phase
  availableCashback: number; // Dynamic based on config
  lastVisit: string;
  lastService: string;
  vehicles: string[];
}

export interface GalleryImage {
  id: string;
  url: string;
  caption?: string;
  createdAt: string;
}

export interface AdminUser {
  email: string;
  role: 'admin';
}

export enum ViewState {
  HOME = 'HOME',
  BOOKING = 'BOOKING',
  GALLERY = 'GALLERY',
  CANCELLATION = 'CANCELLATION',
  ADMIN_LOGIN = 'ADMIN_LOGIN',
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD'
}