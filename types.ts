export interface Service {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
  description: string;
  active: boolean; // Field from Architecture Spec
  icon: 'droplets' | 'sparkles' | 'car' | 'clock';
}

export interface Appointment {
  id: string;
  serviceId: string;
  serviceName: string; // Denormalized for easier display
  price: number; // Stored at time of booking for financial accuracy
  date: string; // ISO Date string (YYYY-MM-DD)
  time: string; // HH:mm
  durationMinutes: number; // Stored to calculate end time for conflict checks
  customerName: string;
  customerPhone: string;
  vehicleModel: string; // "veiculo" in spec usually combines model/color, we keep structured
  vehiclePlate?: string;
  vehicleColor: string; // New field
  paymentMethod: 'Pix' | 'Débito' | 'Crédito'; // New field
  notes?: string; // New optional field for observations
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  createdAt?: string;
}

export interface ClientHistory {
  phone: string;
  name: string;
  totalVisits: number;
  lastVisit: string;
  lastService: string;
  vehicles: string[];
}

export interface AdminUser {
  email: string;
  role: 'admin';
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export enum ViewState {
  HOME = 'HOME',
  BOOKING = 'BOOKING',
  CANCELLATION = 'CANCELLATION',
  ADMIN_LOGIN = 'ADMIN_LOGIN',
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD'
}