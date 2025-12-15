import { Service, Appointment } from './types';

export const SHOP_PHONE = "5511978055321"; // Updated Owner Phone Number
export const LOGO_URL = "https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0420780722.firebasestorage.app/o/Logos%20de%20App%2FApp%20Lava%20Rapido%2FPit%20Stop%20-%20Lava%20Car.png?alt=media&token=5a4d5919-917f-432e-89a5-2e2678508b8b";
export const APP_BASE_URL = "https://pit-stop-lava-car-583261147772.us-west1.run.app";

export const INITIAL_SERVICES: Service[] = [
  {
    id: '1',
    name: 'Lavagem Simples',
    price: 35,
    durationMinutes: 45,
    description: 'Lavagem externa, pretinho nos pneus e aspiração interna rápida.',
    icon: 'droplets',
    active: true
  },
  {
    id: '2',
    name: 'Lavagem Completa',
    price: 60,
    durationMinutes: 90,
    description: 'Lavagem detalhada, cera líquida, limpeza de vidros e painel.',
    icon: 'car',
    active: true
  },
  {
    id: '3',
    name: 'Polimento Técnico',
    price: 250,
    durationMinutes: 240,
    description: 'Correção de pintura, remoção de riscos superficiais e proteção.',
    icon: 'sparkles',
    active: true
  },
  {
    id: '4',
    name: 'Higienização Interna',
    price: 150,
    durationMinutes: 180,
    description: 'Limpeza profunda de estofados, teto e carpetes.',
    icon: 'clock',
    active: true
  }
];

// Mock data for today and tomorrow to show functionality
const today = new Date().toISOString().split('T')[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

export const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: '101',
    serviceId: '1',
    serviceName: 'Lavagem Simples',
    price: 35,
    durationMinutes: 45,
    date: today,
    time: '09:00',
    customerName: 'Carlos Silva',
    customerPhone: '11999999999',
    vehicleModel: 'Honda Civic',
    vehiclePlate: 'ABC-1234',
    vehicleColor: 'Prata',
    paymentMethod: 'Pix',
    notes: 'Cuidado com retrovisor esquerdo',
    status: 'pending'
  },
  {
    id: '102',
    serviceId: '2',
    serviceName: 'Lavagem Completa',
    price: 60,
    durationMinutes: 90,
    date: today,
    time: '14:00',
    customerName: 'Ana Souza',
    customerPhone: '11988888888',
    vehicleModel: 'Jeep Compass',
    vehiclePlate: 'XYZ-9876',
    vehicleColor: 'Preto',
    paymentMethod: 'Crédito',
    status: 'confirmed'
  },
  {
    id: '103',
    serviceId: '1',
    serviceName: 'Lavagem Simples',
    price: 35,
    durationMinutes: 45,
    date: tomorrow,
    time: '10:00',
    customerName: 'Roberto Oliveira',
    customerPhone: '11977777777',
    vehicleModel: 'Fiat Argo',
    vehiclePlate: 'DEF-5678',
    vehicleColor: 'Branco',
    paymentMethod: 'Débito',
    status: 'pending'
  }
];