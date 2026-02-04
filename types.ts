
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

export interface ShopSettings {
  openingHour: number;
  closingHour: number;
  lockDurationHours: number; // 3, 4, 5
  active: boolean;
  couponsEnabled: boolean;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  firstTimeOnly: boolean;
  expirationDate: string;
  active: boolean;
  usedBy: string[];
}

export interface CashbackConfig {
  enabled: boolean;
  percentage: number;
}

export interface MessageTemplate {
  id: string;
  title: string;
  content: string;
}

export interface Appointment {
  id: string;
  type: 'queue' | 'booking'; // queue = presencial admin, booking = site cliente
  serviceId: string;
  serviceName: string;
  price: number;
  originalPrice?: number;
  discountApplied?: number;
  couponCode?: string;
  
  date: string;
  time: string;
  durationMinutes: number;
  
  dirtLevel: DirtLevel;
  extras: string[];
  
  customerName: string;
  customerPhone: string;
  vehicleModel: string;
  vehiclePlate?: string; 
  vehicleColor?: string; 
  paymentMethod?: 'Pix' | 'Débito' | 'Crédito' | 'Cartão' | 'Dinheiro'; 
  notes?: string;
  status: 'waiting' | 'in_progress' | 'completed' | 'cancelled' | 'paid';
  createdAt?: string;
  generatedCashback?: number;
}

export interface ClientHistory {
  phone: string;
  name: string;
  totalVisits: number;
  totalSpent: number;
  availableCashback: number;
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

export enum ViewState {
  HOME = 'HOME',
  BOOKING = 'BOOKING',
  GALLERY = 'GALLERY',
  CANCELLATION = 'CANCELLATION',
  ADMIN_LOGIN = 'ADMIN_LOGIN',
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD'
}
