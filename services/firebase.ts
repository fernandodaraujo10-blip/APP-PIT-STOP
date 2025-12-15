import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, collection, getDocs, addDoc, query, where, deleteDoc, updateDoc, doc, Timestamp, orderBy, limit } from 'firebase/firestore';
import { Appointment, Service } from '../types';
import { INITIAL_SERVICES, MOCK_APPOINTMENTS, LOGO_URL } from '../constants';

// --- Configuration ---
// Safely access process.env to avoid Uncaught ReferenceError in pure browser environments
const getEnv = (key: string) => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
};

const firebaseConfig = {
  apiKey: getEnv('FIREBASE_API_KEY'),
  authDomain: getEnv('FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('FIREBASE_APP_ID')
};

const isFirebaseConfigured = !!(firebaseConfig.apiKey && firebaseConfig.projectId);

let auth: any;
let db: any;

if (isFirebaseConfigured) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} else {
  console.warn("Firebase not configured. Running in SIMULATION MODE with local mock data.");
}

// --- Repository Layer ---

export const api = {
  // Config
  getLogoUrl: async (): Promise<string> => {
    if (!isFirebaseConfigured) return LOGO_URL;
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
    if (!isFirebaseConfigured) return [...INITIAL_SERVICES];
    
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
    if (!isFirebaseConfigured) {
       const newId = Math.random().toString();
       INITIAL_SERVICES.push({ ...service, id: newId });
       return;
    }
    await addDoc(collection(db, 'services'), { ...service });
  },

  updateService: async (id: string, data: Partial<Service>) => {
    if (!isFirebaseConfigured) {
      const index = INITIAL_SERVICES.findIndex(s => s.id === id);
      if (index !== -1) {
        INITIAL_SERVICES[index] = { ...INITIAL_SERVICES[index], ...data };
      }
      return;
    }
    await updateDoc(doc(db, 'services', id), data);
  },

  deleteService: async (id: string) => {
    if (!isFirebaseConfigured) {
       const index = INITIAL_SERVICES.findIndex(s => s.id === id);
       if (index > -1) INITIAL_SERVICES.splice(index, 1);
       return;
    }
    await deleteDoc(doc(db, 'services', id)); 
  },

  // Appointments
  getAppointments: async (date?: string): Promise<Appointment[]> => {
    if (!isFirebaseConfigured) {
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
      status: 'confirmed', 
      createdAt: new Date().toISOString()
    };

    if (!isFirebaseConfigured) {
      const mockId = Math.random().toString();
      MOCK_APPOINTMENTS.push({ ...newApt, id: mockId, status: 'confirmed' } as Appointment);
      return mockId;
    }

    const docRef = await addDoc(collection(db, 'agendamentos'), newApt);
    return docRef.id;
  },

  cancelAppointment: async (id: string) => {
    if (!isFirebaseConfigured) {
      const index = MOCK_APPOINTMENTS.findIndex(a => a.id === id);
      if (index > -1) MOCK_APPOINTMENTS[index].status = 'cancelled';
      return;
    }
    await updateDoc(doc(db, 'agendamentos', id), { status: 'cancelled' });
  },

  // Auth
  login: async (email: string, pass: string): Promise<User | null> => {
    if (!isFirebaseConfigured) {
      if (email === 'admin@pitstop.com' && pass === '123456') {
        return { email: 'admin@pitstop.com', uid: 'mock-admin' } as User;
      }
      throw new Error("Credenciais inválidas (Mock: admin@pitstop.com / 123456)");
    }
    const result = await signInWithEmailAndPassword(auth, email, pass);
    return result.user;
  },

  logout: async () => {
    if (isFirebaseConfigured) await signOut(auth);
  },

  onAuthStateChanged: (callback: (user: User | null) => void) => {
    if (!isFirebaseConfigured) {
      return () => {};
    }
    return onAuthStateChanged(auth, callback);
  }
};