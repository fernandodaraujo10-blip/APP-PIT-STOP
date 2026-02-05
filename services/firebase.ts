
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import {
  getFirestore, collection, getDocs, addDoc, query, where, deleteDoc, updateDoc,
  doc, Timestamp, orderBy, limit, setDoc, getDoc, onSnapshot
} from 'firebase/firestore';
import { Appointment, Service, GalleryImage, Coupon, CashbackConfig, ShopSettings, ClientHistory, MessageTemplate } from '../types';
import { INITIAL_SERVICES, MOCK_APPOINTMENTS, LOGO_URL, MOCK_COUPONS, DEFAULT_CASHBACK_CONFIG, DEFAULT_SETTINGS, DEFAULT_TEMPLATES } from '../constants';

const firebaseConfig = {
  apiKey: "AIzaSyDPdTOcEUpptT7fY7jB6egxUy4o6hYg0Go",
  authDomain: "pit-stop-lavacar.firebaseapp.com",
  projectId: "pit-stop-lavacar",
  storageBucket: "pit-stop-lavacar.firebasestorage.app",
  messagingSenderId: "397716130984",
  appId: "1:397716130984:web:bb7938c9e035fa4bf1c69d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Initialization Helper ---
// Check if collections are empty and seed them with defaults if necessary
const seedDatabase = async () => {
  try {
    console.log('--- Checking Database State ---');

    // Seed Services individually to ensure all are present
    for (const s of INITIAL_SERVICES) {
      const sDoc = await getDoc(doc(db, 'services', s.id));
      if (!sDoc.exists()) {
        console.log(`--- Seeding missing service: ${s.name} ---`);
        await setDoc(doc(db, 'services', s.id), s);
      }
    }

    const servicesSnap = await getDocs(collection(db, 'services'));
    console.log(`--- Services present in DB: ${servicesSnap.size} ---`);

    const settingsSnap = await getDoc(doc(db, 'config', 'shop_settings'));
    if (!settingsSnap.exists()) {
      console.log('--- Seeding DEFAULT SETTINGS ---');
      await setDoc(doc(db, 'config', 'shop_settings'), DEFAULT_SETTINGS);
    }

    const templatesSnap = await getDocs(collection(db, 'templates'));
    if (templatesSnap.empty) {
      console.log('--- Seeding DEFAULT TEMPLATES ---');
      for (const t of DEFAULT_TEMPLATES) {
        await setDoc(doc(db, 'templates', t.id), t);
      }
    }

    const cashbackSnap = await getDoc(doc(db, 'config', 'cashback'));
    if (!cashbackSnap.exists()) {
      await setDoc(doc(db, 'config', 'cashback'), DEFAULT_CASHBACK_CONFIG);
    }
    console.log('--- Database Check Complete ---');
  } catch (e) {
    console.error("!!! Auto-seed failed / Connection error !!!", e);
  }
};

// Run seed on load (lazy check)
seedDatabase();

export const api = {
  // --- SETTINGS ---
  getSettings: async (): Promise<ShopSettings> => {
    const snap = await getDoc(doc(db, 'config', 'shop_settings'));
    if (snap.exists()) return snap.data() as ShopSettings;
    return DEFAULT_SETTINGS;
  },

  updateSettings: async (settings: ShopSettings) => {
    await setDoc(doc(db, 'config', 'shop_settings'), settings);
  },

  // Use listener for real-time settings updates
  subscribeToSettings: (callback: (s: ShopSettings) => void) => {
    return onSnapshot(doc(db, 'config', 'shop_settings'),
      (doc) => {
        if (doc.exists()) callback(doc.data() as ShopSettings);
      },
      (err) => console.warn("Settings subscription error (normal if not admin):", err)
    );
  },

  // --- TEMPLATES ---
  getTemplates: async (): Promise<MessageTemplate[]> => {
    const q = query(collection(db, 'templates'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as MessageTemplate);
  },

  updateTemplate: async (id: string, content: string) => {
    await updateDoc(doc(db, 'templates', id), { content });
  },

  // --- LOGO ---
  getLogoUrl: async (): Promise<string> => {
    // Could be dynamic in future, static for now
    return LOGO_URL;
  },

  // --- SERVICES (Real-time) ---
  subscribeToServices: (callback: (services: Service[]) => void) => {
    const q = query(collection(db, 'services'));
    return onSnapshot(q,
      (snap) => {
        const services = snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Service));
        callback(services);
      },
      (err) => console.error("Services subscription error:", err)
    );
  },

  getServices: async (): Promise<Service[]> => {
    const q = query(collection(db, 'services'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as Service));
  },

  addService: async (service: Omit<Service, 'id'>) => {
    await addDoc(collection(db, 'services'), service);
  },

  updateService: async (id: string, data: Partial<Service>) => {
    await updateDoc(doc(db, 'services', id), data);
  },

  deleteService: async (id: string) => {
    await deleteDoc(doc(db, 'services', id));
  },

  // --- APPOINTMENTS (Real-time) ---

  // Subscribe to ALL appointments (last 500) for global stats and queue
  subscribeToAllAppointments: (callback: (apts: Appointment[]) => void) => {
    // Ordenar por data e hora garante que compromissos sem createdAt também apareçam
    const q = query(collection(db, 'appointments'), orderBy('date', 'desc'), orderBy('time', 'desc'), limit(500));
    return onSnapshot(q,
      (snap) => {
        const apts = snap.docs.map(d => ({ ...d.data(), id: d.id } as Appointment));
        callback(apts);
      },
      (err) => console.warn("Appointments subscription error (normal if not logged in):", err)
    );
  },

  // Keep date-specific for other uses if needed
  subscribeToAppointments: (date: string, callback: (apts: Appointment[]) => void) => {
    const q = query(collection(db, 'appointments'), where('date', '==', date));
    return onSnapshot(q, (snap) => {
      const apts = snap.docs.map(d => ({ ...d.data(), id: d.id } as Appointment));
      callback(apts);
    });
  },

  getAppointments: async (): Promise<Appointment[]> => {
    const q = query(collection(db, 'appointments'), orderBy('createdAt', 'desc'), limit(100));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as Appointment));
  },

  createAppointment: async (apt: Omit<Appointment, 'id' | 'status'>): Promise<string> => {
    const docRef = await addDoc(collection(db, 'appointments'), {
      ...apt,
      status: 'waiting',
      createdAt: Timestamp.now()
    });
    return docRef.id;
  },

  updateAppointmentStatus: async (id: string, status: Appointment['status']) => {
    await updateDoc(doc(db, 'appointments', id), { status });
  },

  // --- CRM & HISTORY ---
  getCrmClients: async (): Promise<ClientHistory[]> => {
    const q = query(collection(db, 'appointments'), orderBy('date', 'desc'), limit(1000));
    const snap = await getDocs(q);
    const appointments = snap.docs.map(d => d.data() as Appointment);

    const configSnap = await getDoc(doc(db, 'config', 'cashback'));
    const cashbackConfig = configSnap.exists() ? configSnap.data() as CashbackConfig : DEFAULT_CASHBACK_CONFIG;

    const clientsMap = new Map<string, ClientHistory>();

    appointments.forEach(apt => {
      const phone = apt.customerPhone || 'Não informado';
      if (!clientsMap.has(phone)) {
        clientsMap.set(phone, {
          phone,
          name: apt.customerName || 'Cliente sem nome',
          totalVisits: 0,
          totalSpent: 0,
          availableCashback: 0,
          lastVisit: apt.date || '',
          lastService: apt.serviceName || 'Lavação',
          vehicles: []
        });
      }

      const client = clientsMap.get(phone)!;
      client.totalVisits += 1;
      client.totalSpent += (Number(apt.price) || 0);

      const vehicle = apt.vehicleModel || 'Veículo';
      if (!client.vehicles.includes(vehicle)) {
        client.vehicles.push(vehicle);
      }

      if (apt.status === 'paid' && cashbackConfig.enabled) {
        const reward = (Number(apt.price) || 0) * (Number(cashbackConfig.percentage) / 100);
        client.availableCashback += Math.round(reward);
      }
    });

    return Array.from(clientsMap.values());
  },

  checkIfReturningCustomer: async (phone: string): Promise<boolean> => {
    const q = query(collection(db, 'appointments'), where('customerPhone', '==', phone), limit(1));
    const snap = await getDocs(q);
    return !snap.empty;
  },

  // --- GALLERY ---
  getGallery: async (): Promise<GalleryImage[]> => {
    return [];
  },

  // --- CASHBACK / COUPONS ---
  getCashbackConfig: async (): Promise<CashbackConfig> => {
    const snap = await getDoc(doc(db, 'config', 'cashback'));
    if (snap.exists()) return snap.data() as CashbackConfig;
    return DEFAULT_CASHBACK_CONFIG;
  },

  updateCashbackConfig: async (config: CashbackConfig) => {
    await setDoc(doc(db, 'config', 'cashback'), config);
  },

  getCoupons: async (): Promise<Coupon[]> => {
    const q = query(collection(db, 'coupons'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as Coupon));
  },

  addCoupon: async (coupon: Omit<Coupon, 'id' | 'usedBy'>) => {
    await addDoc(collection(db, 'coupons'), { ...coupon, usedBy: [] });
  },

  deleteCoupon: async (id: string) => {
    await deleteDoc(doc(db, 'coupons', id));
  },

  validateCoupon: async (code: string, phone: string, subtotal: number): Promise<{ valid: boolean; discount: number; message: string }> => {
    const q = query(collection(db, 'coupons'), where('code', '==', code.toUpperCase()), where('active', '==', true));
    const snap = await getDocs(q);

    if (snap.empty) return { valid: false, discount: 0, message: 'Cupom inválido.' };

    const coupon = snap.docs[0].data() as Coupon;

    if (coupon.expirationDate && new Date(coupon.expirationDate) < new Date()) {
      return { valid: false, discount: 0, message: 'Cupom expirado.' };
    }

    if (coupon.usedBy.includes(phone)) {
      return { valid: false, discount: 0, message: 'Você já usou este cupom.' };
    }


    // Check first time
    if (coupon.firstTimeOnly) {
      const isReturning = await api.checkIfReturningCustomer(phone);
      if (isReturning) return { valid: false, discount: 0, message: 'Cupom exclusivo para primeira lavagem.' };
    }

    let discount = coupon.type === 'percent' ? subtotal * (coupon.value / 100) : coupon.value;
    return { valid: true, discount: Math.round(discount), message: 'Cupom aplicado!' };
  },


  // --- AUTH ---
  login: async (email: string, pass: string): Promise<any> => {
    // For simplicity, we keep the hardcoded admin check for now OR map it to firebase auth
    // But since the user asked for "real", let's use real auth IF email provided, or fallback to mock for 'admin' user
    if (email === 'admin') {
      // Create a fake session for 'admin' textual login
      const user = { username: 'admin', uid: 'admin_mock_id' };
      localStorage.setItem('pitstop_mock_user', JSON.stringify(user));
      return user;
    }
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    return cred.user;
  },

  logout: async () => {
    localStorage.removeItem('pitstop_mock_user');
    await signOut(auth);
  },

  onAuthStateChanged: (callback: (user: any) => void) => {
    // Check mock first
    const mockUser = localStorage.getItem('pitstop_mock_user');
    if (mockUser) {
      callback(JSON.parse(mockUser));
      return () => { };
    }
    return onAuthStateChanged(auth, callback);
  },

  forceSeedServices: async () => {
    for (const s of INITIAL_SERVICES) {
      await setDoc(doc(db, 'services', s.id), s);
    }
    await setDoc(doc(db, 'config', 'shop_settings'), DEFAULT_SETTINGS);
  }
};
