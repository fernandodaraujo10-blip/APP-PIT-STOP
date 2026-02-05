
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Service, Appointment, Coupon, CashbackConfig, ShopSettings, MessageTemplate, ClientHistory } from './types';
import { api } from './services/firebase';
import { DEFAULT_CASHBACK_CONFIG, DEFAULT_SETTINGS, INITIAL_SERVICES } from './constants';
import { useToast } from './components/Toast';

interface AppContextType {
  appointments: Appointment[];
  services: Service[];
  settings: ShopSettings;
  templates: MessageTemplate[];
  coupons: Coupon[];
  cashback: CashbackConfig;
  clients: ClientHistory[];
  isLoading: boolean;
  refreshData: () => Promise<void>;
  updateAppointmentStatus: (id: string, status: Appointment['status']) => Promise<void>;
  createAppointment: (apt: any) => Promise<void>;
  updateShopSettings: (settings: ShopSettings) => Promise<void>;
  updateCashback: (config: CashbackConfig) => Promise<void>;
  updateMsgTemplate: (id: string, content: string) => Promise<void>;
  restoreDatabase: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper for generic retry logic
const withRetry = async <T,>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>(INITIAL_SERVICES);
  const [settings, setSettings] = useState<ShopSettings>(DEFAULT_SETTINGS);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [cashback, setCashback] = useState<CashbackConfig>(DEFAULT_CASHBACK_CONFIG);
  const [clients, setClients] = useState<ClientHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  const refreshData = useCallback(async () => {
    // We only manually refresh Appointments/CRM/Coupons as they are heavy or less critical for instant sync
    // In a full production app, Appointments should also be realtime for the admin (filtered by day)
    try {
      // Try to fetch each data point individually so failure of one (like admin data) 
      // doesn't break the whole app for the customer.
      const fetchCrm = api.getCrmClients().catch(e => { console.warn("CRM sync skipped (admin only)"); return []; });
      const fetchCoupons = api.getCoupons().catch(e => { console.warn("Coupons sync skipped"); return []; });
      const fetchCashback = api.getCashbackConfig().catch(e => { console.warn("Cashback sync skipped"); return DEFAULT_CASHBACK_CONFIG; });
      const fetchTemplates = api.getTemplates().catch(e => { console.warn("Templates sync skipped (admin only)"); return []; });

      const [cls, cps, cb, tmps] = await Promise.all([
        fetchCrm,
        fetchCoupons,
        fetchCashback,
        fetchTemplates
      ]);

      setClients(cls);
      setCoupons(cps);
      setCashback(cb);
      setTemplates(tmps);
      setIsLoading(false);
    } catch (error) {
      console.error("Erro crítico ao carregar dados:", error);
      setIsLoading(false);
    }
  }, []);

  // Real-time Subscriptions
  useEffect(() => {
    const unsubServices = api.subscribeToServices((data) => {
      // Use DB data if available, otherwise stay with INITIAL_SERVICES
      if (data && data.length > 0) {
        setServices(data);
      }
    });
    const unsubSettings = api.subscribeToSettings(setSettings);

    // Subscribe to ALL recent appointments (last 500) to keep stats and queue alive
    const unsubAppointments = api.subscribeToAllAppointments(setAppointments);

    // Initial fetch for non-realtime data (CRM, Coupons, etc)
    refreshData();

    // SAFETY FALLBACK: Never stay stuck in loading more than 8 seconds
    const safetyTimer = setTimeout(() => {
      setIsLoading(false);
    }, 8000);

    return () => {
      unsubServices();
      unsubSettings();
      unsubAppointments();
      clearTimeout(safetyTimer);
    };
  }, [refreshData]);

  const updateAppointmentStatus = useCallback(async (id: string, status: Appointment['status']) => {
    try {
      await withRetry(() => api.updateAppointmentStatus(id, status));
      await refreshData();
      showToast('Status atualizado com sucesso!', 'success');
    } catch (error) {
      showToast('Erro ao atualizar status.', 'error');
    }
  }, [refreshData, showToast]);

  const createAppointment = useCallback(async (apt: any) => {
    try {
      // Add a small safety delay or timeout if needed, but let's just make it robust
      await api.createAppointment(apt);
      // We don't wait for refreshData to finish before showing success for the user
      refreshData().catch(e => console.warn("Refresh after booking failed", e));
      showToast('Agendamento realizado!', 'success');
    } catch (error) {
      console.error("Create appointment error:", error);
      showToast('Erro ao gravar agendamento.', 'error');
      throw error; // Rethrow so the caller (BookingFlow) knows it failed
    }
  }, [refreshData, showToast]);

  const updateShopSettings = useCallback(async (newSettings: ShopSettings) => {
    try {
      await api.updateSettings(newSettings);
      // setSettings is handled by subscription
      showToast('Configurações salvas.', 'success');
    } catch (error) {
      showToast('Erro ao salvar configurações.', 'error');
    }
  }, [showToast]);

  const updateCashback = useCallback(async (newConfig: CashbackConfig) => {
    try {
      await api.updateCashbackConfig(newConfig);
      setCashback(newConfig);
      await refreshData();
      showToast('Cashback configurado!', 'success');
    } catch (error) {
      showToast('Erro ao salvar cashback.', 'error');
    }
  }, [refreshData, showToast]);

  const updateMsgTemplate = useCallback(async (id: string, content: string) => {
    try {
      await api.updateTemplate(id, content);
      setTemplates(prev => prev.map(t => t.id === id ? { ...t, content } : t));
      showToast('Template atualizado.', 'success');
    } catch (error) {
      showToast('Erro ao salvar template.', 'error');
    }
  }, [showToast]);

  const restoreDatabase = useCallback(async () => {
    try {
      setIsLoading(true);
      await api.forceSeedServices();
      await refreshData();
      showToast('Banco de dados restaurado!', 'success');
    } catch (error) {
      showToast('Erro ao restaurar banco.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [refreshData, showToast]);

  const value = useMemo(() => ({
    appointments, services, settings, templates, coupons, cashback, clients, isLoading,
    refreshData, updateAppointmentStatus, createAppointment, updateShopSettings, updateCashback, updateMsgTemplate, restoreDatabase
  }), [appointments, services, settings, templates, coupons, cashback, clients, isLoading, refreshData, updateAppointmentStatus, createAppointment, updateShopSettings, updateCashback, updateMsgTemplate, restoreDatabase]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};
