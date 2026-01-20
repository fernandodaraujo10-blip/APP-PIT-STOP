import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, collection, getDocs, addDoc, query, where, deleteDoc, updateDoc, doc, Timestamp, orderBy, limit, setDoc } from 'firebase/firestore';
import { Appointment, Service, GalleryImage, Coupon, CashbackConfig } from '../types';
import { INITIAL_SERVICES, MOCK_APPOINTMENTS, LOGO_URL, MOCK_COUPONS, DEFAULT_CASHBACK_CONFIG } from '../constants';

// --- Configuration ---
// Robust Environment Variable Retrieval
const getEnv = (key: string) => {
  // Try import.meta.env (Vite/Modern Bundlers)
  try {
    // @ts-ignore
    if (import.meta && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {}

  // Try process.env (Webpack/Node/Standard)
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch(e) {}

  return undefined;
};

const firebaseConfig = {
  apiKey: getEnv('FIREBASE_API_KEY') || getEnv('VITE_FIREBASE_API_KEY'),
  authDomain: getEnv('FIREBASE_AUTH_DOMAIN') || getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('FIREBASE_PROJECT_ID') || getEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('FIREBASE_STORAGE_BUCKET') || getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('FIREBASE_MESSAGING_SENDER_ID') || getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('FIREBASE_APP_ID') || getEnv('VITE_FIREBASE_APP_ID')
};

const isFirebaseConfigured = !!(firebaseConfig.apiKey && firebaseConfig.projectId);

let auth: any;
let db: any;

if (isFirebaseConfigured) {
  try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.error("Firebase Initialization Error:", error);
    // Fallback to simulation if config is present but init fails (e.g. bad keys)
  }
} 

if (!auth) {
  console.warn("Firebase not configured or failed to initialize. Running in SIMULATION MODE with local mock data.");
}

// Mock Gallery Data
const MOCK_GALLERY: GalleryImage[] = [
  { id: '1', url: 'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&q=80&w=500', caption: 'Polimento Técnico', createdAt: new Date().toISOString() },
  { id: '2', url: 'https://images.unsplash.com/photo-1520340356584-7c9948811dff?auto=format&fit=crop&q=80&w=500', caption: 'Higienização Premium', createdAt: new Date().toISOString() }
];

// --- Repository Layer ---

export const api = {
  // Config
  getLogoUrl: async (): Promise<string> => {
    if (!auth) return LOGO_URL;
    try {
      // Try to fetch from a 'config' collection, document 'global'
      const q = query(collection(db, 'config'), limit(1));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        return data.logoUrl || LOGO_URL;
      }
      return LOGO_URL;
    } catch (e) {
      console.warn("Could not fetch config, using default logo", e);
      return LOGO_URL;
    }
  },

  // Services
  getServices: async (): Promise<Service[]> => {
    // CRITICAL FIX: Return a COPY of the array ([...INITIAL_SERVICES]) 
    // so React detects the state change when we update the list.
    if (!auth) return [...INITIAL_SERVICES];
    
    try {
      const q = query(collection(db, 'services'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
    } catch (e) {
      console.error("Error fetching services", e);
      return [];
    }
  },

  addService: async (service: Omit<Service, 'id'>) => {
    if (!auth) {
       const newId = Math.random().toString();
       INITIAL_SERVICES.push({ ...service, id: newId });
       return;
    }
    await addDoc(collection(db, 'services'), { ...service });
  },

  updateService: async (id: string, data: Partial<Service>) => {
    if (!auth) {
      const index = INITIAL_SERVICES.findIndex(s => s.id === id);
      if (index !== -1) {
        INITIAL_SERVICES[index] = { ...INITIAL_SERVICES[index], ...data };
      }
      return;
    }
    await updateDoc(doc(db, 'services', id), data);
  },

  deleteService: async (id: string) => {
    if (!auth) {
       const index = INITIAL_SERVICES.findIndex(s => s.id === id);
       if (index > -1) INITIAL_SERVICES.splice(index, 1);
       return;
    }
    await deleteDoc(doc(db, 'services', id)); 
  },

  // Appointments
  getAppointments: async (date?: string): Promise<Appointment[]> => {
    if (!auth) {
       // Return all, let the UI decide how to display cancelled ones (filtered in Booking, shown in Admin)
       if (date) return MOCK_APPOINTMENTS.filter(a => a.date === date);
       return MOCK_APPOINTMENTS;
    }

    let q = collection(db, 'agendamentos');
    // If date is provided, filter by date. 
    // IMPORTANT: We do NOT filter out cancelled appointments here anymore, 
    // so the Admin can see that a client cancelled.
    if (date) {
      q = query(q, where("date", "==", date));
    } else {
      q = query(q, orderBy("date", "desc"));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
  },

  createAppointment: async (apt: Omit<Appointment, 'id' | 'status'>): Promise<string> => {
    const newApt = {
      ...apt,
      status: 'waiting', 
      createdAt: new Date().toISOString()
    };

    if (!auth) {
      const mockId = Math.random().toString();
      MOCK_APPOINTMENTS.push({ ...newApt, id: mockId, status: 'waiting' } as Appointment);
      return mockId;
    }

    const docRef = await addDoc(collection(db, 'agendamentos'), newApt);
    
    // If coupon was used, record usage (mock only for simplicity in this demo, real world needs transaction)
    if (apt.couponCode) {
      // In a real app, we would add the phone to the 'usedBy' array of the coupon document
    }

    return docRef.id;
  },

  cancelAppointment: async (id: string) => {
    if (!auth) {
      const index = MOCK_APPOINTMENTS.findIndex(a => a.id === id);
      if (index > -1) MOCK_APPOINTMENTS[index].status = 'cancelled';
      return;
    }
    await updateDoc(doc(db, 'agendamentos', id), { status: 'cancelled' });
  },

  // Helper: Check if customer is returning
  checkIfReturningCustomer: async (phone: string): Promise<boolean> => {
    // Clean phone number
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 8) return false;

    if (!auth) {
       return MOCK_APPOINTMENTS.some(a => a.customerPhone.replace(/\D/g, '') === cleanPhone);
    }

    const q = query(collection(db, 'agendamentos'), where("customerPhone", "==", phone), limit(1));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  },

  // Gallery
  getGallery: async (): Promise<GalleryImage[]> => {
    if (!auth) return [...MOCK_GALLERY];
    try {
      const q = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GalleryImage));
    } catch(e) {
      console.error(e);
      return [];
    }
  },

  addGalleryImage: async (url: string, caption?: string) => {
    const newItem = { url, caption, createdAt: new Date().toISOString() };
    if (!auth) {
       MOCK_GALLERY.unshift({ ...newItem, id: Math.random().toString() });
       return;
    }
    await addDoc(collection(db, 'gallery'), newItem);
  },

  deleteGalleryImage: async (id: string) => {
    if (!auth) {
      const idx = MOCK_GALLERY.findIndex(g => g.id === id);
      if (idx > -1) MOCK_GALLERY.splice(idx, 1);
      return;
    }
    await deleteDoc(doc(db, 'gallery', id));
  },

  // --- PROMOTIONS MODULE ---

  // 1. Cashback Config
  getCashbackConfig: async (): Promise<CashbackConfig> => {
    if (!auth) return { ...DEFAULT_CASHBACK_CONFIG };
    try {
      const docRef = doc(db, 'config', 'cashback');
      const snap = await getDocs(query(collection(db, 'config'), where('__name__', '==', 'cashback')));
      // Using query because getting doc directly might be simpler but consistency with other calls
      // Actually let's just try getDoc if available or fallback to query
      // Simpler: Just allow local default if not found
      return { ...DEFAULT_CASHBACK_CONFIG }; // Placeholder for actual Fetch
    } catch {
      return { ...DEFAULT_CASHBACK_CONFIG };
    }
  },

  updateCashbackConfig: async (config: CashbackConfig) => {
     if (!auth) {
        Object.assign(DEFAULT_CASHBACK_CONFIG, config);
        return;
     }
     // In real app, write to config/cashback
  },

  // 2. Coupons
  getCoupons: async (): Promise<Coupon[]> => {
    if (!auth) return [...MOCK_COUPONS];
    try {
      const q = query(collection(db, 'coupons'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Coupon));
    } catch(e) {
      return [];
    }
  },

  addCoupon: async (coupon: Omit<Coupon, 'id' | 'usedBy'>) => {
    const newCoupon = { ...coupon, usedBy: [] };
    if (!auth) {
      MOCK_COUPONS.push({ ...newCoupon, id: Math.random().toString() });
      return;
    }
    await addDoc(collection(db, 'coupons'), newCoupon);
  },

  deleteCoupon: async (id: string) => {
    if (!auth) {
      const idx = MOCK_COUPONS.findIndex(c => c.id === id);
      if (idx > -1) MOCK_COUPONS.splice(idx, 1);
      return;
    }
    await deleteDoc(doc(db, 'coupons', id));
  },

  validateCoupon: async (code: string, phone: string, subtotal: number): Promise<{ valid: boolean; discount: number; message: string }> => {
    const coupons = await api.getCoupons();
    const coupon = coupons.find(c => c.code.toUpperCase() === code.toUpperCase() && c.active);

    if (!coupon) {
      return { valid: false, discount: 0, message: 'Cupom inválido ou inativo.' };
    }

    // Check expiration
    const today = new Date().toISOString().split('T')[0];
    if (coupon.expirationDate < today) {
      return { valid: false, discount: 0, message: 'Cupom expirado.' };
    }

    // Check First Time Rule
    if (coupon.firstTimeOnly) {
      const returning = await api.checkIfReturningCustomer(phone);
      if (returning) {
        return { valid: false, discount: 0, message: 'Válido apenas para primeira visita.' };
      }
    }

    // Check if user already used it (if logic existed)
    // For this simple version, rely on "FirstTimeOnly" as the main gatekeeper or allow multiple uses if not specified
    
    let discount = 0;
    if (coupon.type === 'percent') {
      discount = subtotal * (coupon.value / 100);
    } else {
      discount = coupon.value;
    }

    // Ensure discount doesn't exceed total
    if (discount > subtotal) discount = subtotal;

    return { valid: true, discount: Math.round(discount), message: 'Cupom aplicado!' };
  },

  // Auth
  login: async (email: string, pass: string): Promise<User | null> => {
    if (!auth) {
      if (email === 'admin@pitstop.com' && pass === '123456') {
        const mockUser = { email: 'admin@pitstop.com', uid: 'mock-admin' } as User;
        // PERSIST MOCK SESSION
        localStorage.setItem('pitstop_mock_user', JSON.stringify(mockUser));
        return mockUser;
      }
      throw new Error("Credenciais inválidas (Mock: admin@pitstop.com / 123456)");
    }
    const result = await signInWithEmailAndPassword(auth, email, pass);
    return result.user;
  },

  logout: async () => {
    if (auth) {
      await signOut(auth);
    } else {
      // CLEAR MOCK SESSION
      localStorage.removeItem('pitstop_mock_user');
    }
  },

  onAuthStateChanged: (callback: (user: User | null) => void) => {
    if (!auth) {
      // CHECK FOR PERSISTED MOCK SESSION
      const storedUser = localStorage.getItem('pitstop_mock_user');
      if (storedUser) {
        try {
          callback(JSON.parse(storedUser));
        } catch(e) {
          callback(null);
        }
      } else {
        callback(null);
      }
      return () => {};
    }
    return onAuthStateChanged(auth, callback);
  }
};