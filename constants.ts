
import { Service, Appointment, ExtraService, Coupon, CashbackConfig, ShopSettings, MessageTemplate } from './types';

export const SHOP_PHONE = "5511978055321";
export const LOGO_URL = "https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0420780722.firebasestorage.app/o/Logos%20de%20App%2FApp%20Lava%20Rapido%2FPit%20Stop%20-%20Lava%20Car.png?alt=media&token=5a4d5919-917f-432e-89a5-2e2678508b8b";
export const APP_BASE_URL = "https://pit-stop-lavacar.web.app";

// Defaults
export const OPENING_HOUR = 8;
export const CLOSING_HOUR = 22;

export const DEFAULT_SETTINGS: ShopSettings = {
  openingHour: 8,
  closingHour: 22,
  lockDurationHours: 3,
  active: true,
  couponsEnabled: true
};

export const INITIAL_SERVICES: Service[] = [
  {
    id: 's1',
    name: 'Lavagem Simples',
    price: 25,
    durationMinutes: 40,
    description: 'Lavagem externa e aplicação de pretinho comum.',
    icon: 'droplets',
    active: true
  },
  {
    id: 's2',
    name: 'Lavar e Secar',
    price: 35,
    durationMinutes: 50,
    description: 'Externa, secagem, vãos de porta, pretinho e caixas de rodas.',
    icon: 'droplets',
    active: true
  },
  {
    id: 's3',
    name: 'Lavagem Completa',
    price: 70,
    durationMinutes: 90,
    description: 'Lavagem, secagem, aspiração, plásticos, vidros e pretinho.',
    icon: 'car',
    active: true
  },
  {
    id: 's4',
    name: 'Lavagem de Moto',
    price: 35,
    durationMinutes: 45,
    description: 'Lavagem detalhada e completa para motos.',
    icon: 'sparkles',
    active: true
  }
];

export const DEFAULT_TEMPLATES: MessageTemplate[] = [
  { id: 't1', title: 'Carro Pronto', content: 'Olá [NOME], seu veículo [VEICULO] já está pronto e brilhando! Pode vir buscar quando desejar. Atenciosamente, Pit Stop Lava Car.' },
  { id: 't2', title: 'Lembrete Visita', content: 'Olá [NOME], faz um tempo que não vemos o seu [VEICULO] por aqui. Que tal uma lavagem completa hoje? Temos horários disponíveis!' },
  { id: 't3', title: 'Promoção Semanal', content: 'Olá [NOME], estamos com preços especiais esta semana para Lavagem Completa. Seu [VEICULO] merece! Garanta sua vaga.' }
];

export const DIRT_LEVELS = [
  { id: 'Normal', label: 'Normal', description: 'Sujeira do dia a dia', price: 0 },
  { id: 'Sujo', label: 'Sujo', description: 'Barro leve ou muita sujeira', price: 10 },
  { id: 'Muito Sujo', label: 'Muito Sujo', description: 'Barro pesado, crítico interior', price: 20 }
];

export const DIRT_LEVEL_PRICES = { 'Normal': 0, 'Sujo': 10, 'Muito Sujo': 20 };

export const UPSELL_EXTRAS: ExtraService[] = [
  { id: 'wax_simple', name: 'Cera Simples', price: 20, description: 'Brilho e proteção básica.' },
  { id: 'wax_premium', name: 'Cera Premium', price: 30, description: 'Brilho intenso e maior durabilidade.' },
  { id: 'pretinho_premium', name: 'Pretinho Premium', price: 20, description: 'Acabamento acetinado e longa duração.' }
];

export const MOCK_COUPONS: Coupon[] = [
  { id: 'c1', code: 'BEMVINDO', type: 'percent', value: 10, firstTimeOnly: true, expirationDate: '2030-12-31', active: true, usedBy: [] }
];

export const DEFAULT_CASHBACK_CONFIG: CashbackConfig = { enabled: true, percentage: 5 };

const today = new Date().toISOString().split('T')[0];
export const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: '101',
    type: 'queue',
    serviceId: 's1',
    serviceName: 'Lavagem Simples',
    price: 25,
    durationMinutes: 40,
    date: today,
    time: '09:00',
    customerName: 'Carlos Silva',
    customerPhone: '5511999999999',
    vehicleModel: 'Honda Civic',
    status: 'waiting',
    dirtLevel: 'Normal',
    extras: []
  }
];
