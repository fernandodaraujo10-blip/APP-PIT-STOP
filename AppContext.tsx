
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Service, Appointment, Coupon, CashbackConfig, ShopSettings, MessageTemplate, ClientHistory } from './types';
import { api } from './services/firebase';
import { DEFAULT_CASHBACK_CONFIG, DEFAULT_SETTINGS } from './constants';
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
  const [services, setServices] = useState<Service[]>([]);
  const [settings, setSettings] = useState<ShopSettings>(DEFAULT_SETTINGS);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [cashback, setCashback] = useState<CashbackConfig>(DEFAULT_CASHBACK_CONFIG);
  const [clients, setClients] = useState<ClientHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [apts, s, svs, cls, cps, cb, tmps] = await withRetry(() => Promise.all([
        api.getAppointments(),
        api.getSettings(),
        api.getServices(),
        api.getCrmClients(),
        api.getCoupons(),
        api.getCashbackConfig(),
        api.getTemplates()
      ]));
      setAppointments(apts);
      setSettings(s);
      setServices(svs);
      setClients(cls);
      setCoupons(cps);
      setCashback(cb);
      setTemplates(tmps);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      showToast('Falha ao sincronizar dados com o servidor.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    refreshData();
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
      await api.createAppointment(apt);
      await refreshData();
      showToast('Agendamento realizado!', 'success');
    } catch (error) {
      showToast('Erro ao realizar agendamento.', 'error');
    }
  }, [refreshData, showToast]);

  const updateShopSettings = useCallback(async (newSettings: ShopSettings) => {
    try {
      await api.updateSettings(newSettings);
      setSettings(newSettings);
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

  const value = useMemo(() => ({
    appointments, services, settings, templates, coupons, cashback, clients, isLoading,
    refreshData, updateAppointmentStatus, createAppointment, updateShopSettings, updateCashback, updateMsgTemplate
  }), [appointments, services, settings, templates, coupons, cashback, clients, isLoading, refreshData, updateAppointmentStatus, createAppointment, updateShopSettings, updateCashback, updateMsgTemplate]);

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
