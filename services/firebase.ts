
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, collection, getDocs, addDoc, query, where, deleteDoc, updateDoc, doc, Timestamp, orderBy, limit, setDoc, getDoc } from 'firebase/firestore';
import { Appointment, Service, GalleryImage, Coupon, CashbackConfig, ShopSettings, ClientHistory, MessageTemplate } from '../types';
import { INITIAL_SERVICES, MOCK_APPOINTMENTS, LOGO_URL, MOCK_COUPONS, DEFAULT_CASHBACK_CONFIG, DEFAULT_SETTINGS, DEFAULT_TEMPLATES } from '../constants';

const firebaseConfig = {
  apiKey: "SIMULATION",
  projectId: "SIMULATION"
};

let auth: any = null;
let db: any = null;

// Mock Internal State (Persists during session)
let CURRENT_SETTINGS = { ...DEFAULT_SETTINGS };
let CURRENT_TEMPLATES = [...DEFAULT_TEMPLATES];
let CURRENT_CASHBACK_CONFIG = { ...DEFAULT_CASHBACK_CONFIG };
let CURRENT_APPOINTMENTS = [...MOCK_APPOINTMENTS];
let CURRENT_SERVICES = [...INITIAL_SERVICES];
let CURRENT_COUPONS = [...MOCK_COUPONS];

export const api = {
  getSettings: async (): Promise<ShopSettings> => {
    return { ...CURRENT_SETTINGS };
  },

  updateSettings: async (settings: ShopSettings) => {
    CURRENT_SETTINGS = { ...settings };
  },

  getTemplates: async (): Promise<MessageTemplate[]> => {
    return [...CURRENT_TEMPLATES];
  },

  updateTemplate: async (id: string, content: string) => {
    const index = CURRENT_TEMPLATES.findIndex(t => t.id === id);
    if (index !== -1) {
      CURRENT_TEMPLATES[index] = { ...CURRENT_TEMPLATES[index], content };
    }
  },

  getLogoUrl: async (): Promise<string> => {
    return LOGO_URL;
  },

  getServices: async (): Promise<Service[]> => {
    return [...CURRENT_SERVICES];
  },

  addService: async (service: Omit<Service, 'id'>) => {
     const newId = Math.random().toString();
     CURRENT_SERVICES.push({ ...service, id: newId });
  },

  updateService: async (id: string, data: Partial<Service>) => {
    const index = CURRENT_SERVICES.findIndex(s => s.id === id);
    if (index !== -1) CURRENT_SERVICES[index] = { ...CURRENT_SERVICES[index], ...data };
  },

  deleteService: async (id: string) => {
    const index = CURRENT_SERVICES.findIndex(s => s.id === id);
    if (index > -1) CURRENT_SERVICES.splice(index, 1);
  },

  getAppointments: async (date?: string): Promise<Appointment[]> => {
    if (date) return CURRENT_APPOINTMENTS.filter(a => a.date === date);
    return CURRENT_APPOINTMENTS;
  },

  createAppointment: async (apt: Omit<Appointment, 'id' | 'status'>): Promise<string> => {
    const mockId = Math.random().toString();
    CURRENT_APPOINTMENTS.push({ ...apt, id: mockId, status: 'waiting' } as Appointment);
    return mockId;
  },

  updateAppointmentStatus: async (id: string, status: Appointment['status']) => {
    const index = CURRENT_APPOINTMENTS.findIndex(a => a.id === id);
    if (index > -1) CURRENT_APPOINTMENTS[index].status = status;
  },

  // CRM Helper: Group appointments by unique phone number and calculate REAL cashback balance
  getCrmClients: async (): Promise<ClientHistory[]> => {
    const clientsMap = new Map<string, ClientHistory>();
    
    CURRENT_APPOINTMENTS.forEach(apt => {
      const phone = apt.customerPhone;
      if (!clientsMap.has(phone)) {
        clientsMap.set(phone, {
          phone,
          name: apt.customerName,
          totalVisits: 0,
          totalSpent: 0,
          availableCashback: 0,
          lastVisit: apt.date,
          lastService: apt.serviceName,
          vehicles: []
        });
      }
      
      const client = clientsMap.get(phone)!;
      client.totalVisits += 1;
      client.totalSpent += apt.price;
      
      // FUNCTIONAL CASHBACK: Calculate based on paid appointments if enabled
      if (apt.status === 'paid' && CURRENT_CASHBACK_CONFIG.enabled) {
          const earned = Math.round(apt.price * (CURRENT_CASHBACK_CONFIG.percentage / 100));
          client.availableCashback += earned;
      }

      if (apt.date > client.lastVisit) {
        client.lastVisit = apt.date;
        client.lastService = apt.serviceName;
      }
      if (!client.vehicles.includes(apt.vehicleModel)) {
        client.vehicles.push(apt.vehicleModel);
      }
    });
    
    return Array.from(clientsMap.values());
  },

  checkIfReturningCustomer: async (phone: string): Promise<boolean> => {
    const cleanPhone = phone.replace(/\D/g, '');
    return CURRENT_APPOINTMENTS.some(a => a.customerPhone.replace(/\D/g, '') === cleanPhone);
  },

  getGallery: async (): Promise<GalleryImage[]> => {
    return [];
  },

  addGalleryImage: async (url: string, caption?: string) => {},
  deleteGalleryImage: async (id: string) => {},

  getCashbackConfig: async (): Promise<CashbackConfig> => {
    return { ...CURRENT_CASHBACK_CONFIG };
  },

  updateCashbackConfig: async (config: CashbackConfig) => {
    CURRENT_CASHBACK_CONFIG = { ...config };
  },

  getCoupons: async (): Promise<Coupon[]> => {
    return [...CURRENT_COUPONS];
  },

  addCoupon: async (coupon: Omit<Coupon, 'id' | 'usedBy'>) => {
    CURRENT_COUPONS.push({ ...coupon, id: Math.random().toString(), usedBy: [] });
  },

  deleteCoupon: async (id: string) => {
    const idx = CURRENT_COUPONS.findIndex(c => c.id === id);
    if (idx > -1) CURRENT_COUPONS.splice(idx, 1);
  },

  validateCoupon: async (code: string, phone: string, subtotal: number): Promise<{ valid: boolean; discount: number; message: string }> => {
    const coupon = CURRENT_COUPONS.find(c => c.code.toUpperCase() === code.toUpperCase() && c.active);
    if (!coupon) return { valid: false, discount: 0, message: 'Cupom inválido.' };
    let discount = coupon.type === 'percent' ? subtotal * (coupon.value / 100) : coupon.value;
    return { valid: true, discount: Math.round(discount), message: 'Cupom aplicado!' };
  },

  login: async (username: string, pass: string): Promise<any> => {
    if (username === 'admin' && pass === '1234') {
      const user = { username, uid: 'admin' };
      localStorage.setItem('pitstop_mock_user', JSON.stringify(user));
      return user;
    }
    throw new Error("Usuário ou senha inválidos.");
  },

  logout: async () => {
    localStorage.removeItem('pitstop_mock_user');
  },

  onAuthStateChanged: (callback: (user: any) => void) => {
    const user = localStorage.getItem('pitstop_mock_user');
    callback(user ? JSON.parse(user) : null);
    return () => {};
  }
};
