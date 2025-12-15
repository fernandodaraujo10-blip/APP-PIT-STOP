import React, { useState, useMemo, useEffect } from 'react';
import { 
  Car, 
  Calendar, 
  Clock, 
  CheckCircle, 
  Phone, 
  ShieldCheck, 
  LogOut, 
  Plus, 
  Trash2, 
  Sparkles, 
  Droplets,
  X,
  Bot,
  ChevronLeft,
  User,
  AlertCircle,
  Check,
  Power,
  Search,
  History,
  AlertTriangle,
  FileText,
  CreditCard,
  QrCode,
  Wallet,
  FlaskConical,
  LayoutDashboard,
  TrendingUp,
  DollarSign,
  CalendarDays,
  Pencil,
  MessageCircle,
  Megaphone,
  Copy,
  ExternalLink
} from 'lucide-react';
import { ViewState, Service, Appointment, ClientHistory } from './types';
import { Button } from './components/Button';
import { generateDailyBriefing } from './services/geminiService';
import { api } from './services/firebase';
import { SHOP_PHONE, APP_BASE_URL } from './constants';

// --- Helper Components ---

const IconMap = {
  droplets: Droplets,
  sparkles: Sparkles,
  car: Car,
  clock: Clock
};

// --- Logic: Dynamic Slot Generation & Conflict ---

const generateTimeSlots = (startHour: number, endHour: number, intervalMinutes: number = 30) => {
  const slots: string[] = [];
  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += intervalMinutes) {
      const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      slots.push(time);
    }
  }
  return slots;
};

const isSlotAvailable = (
  slotTime: string, 
  serviceDuration: number, 
  appointments: Appointment[]
): boolean => {
  const slotDate = new Date(`2000-01-01T${slotTime}`);
  const slotStart = slotDate.getTime();
  const slotEnd = slotStart + serviceDuration * 60000;

  for (const apt of appointments) {
    if (apt.status === 'cancelled') continue;
    
    const aptStart = new Date(`2000-01-01T${apt.time}`).getTime();
    const aptDuration = apt.durationMinutes || 60; 
    const aptEnd = aptStart + aptDuration * 60000;

    // Check intersection
    if (slotStart < aptEnd && slotEnd > aptStart) {
      return false;
    }
  }
  return true;
};

// --- Logic: Client History Aggregation ---
const aggregateClientHistory = (appointments: Appointment[]): ClientHistory[] => {
  const clients: Record<string, ClientHistory> = {};

  appointments.forEach(apt => {
    // Clean phone to use as key
    const phoneKey = apt.customerPhone.replace(/\D/g, '');
    if (!clients[phoneKey]) {
      clients[phoneKey] = {
        phone: apt.customerPhone,
        name: apt.customerName,
        totalVisits: 0,
        lastVisit: apt.date,
        lastService: apt.serviceName,
        vehicles: []
      };
    }
    
    const client = clients[phoneKey];
    client.totalVisits += 1;
    if (apt.date > client.lastVisit) {
      client.lastVisit = apt.date;
      client.lastService = apt.serviceName;
    }
    if (!client.vehicles.includes(apt.vehicleModel)) {
      client.vehicles.push(apt.vehicleModel);
    }
  });

  return Object.values(clients).sort((a, b) => b.totalVisits - a.totalVisits);
};

// --- View: Customer Booking ---

interface BookingFlowProps {
  onCancel: () => void;
  onSimulateCancellation: (id: string) => void;
  appointmentId?: string; // Passed when flow is complete
}

type PaymentMethod = 'Pix' | 'Débito' | 'Crédito';

const BookingFlow: React.FC<BookingFlowProps> = ({ onCancel, onSimulateCancellation, appointmentId: propAppointmentId }) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    model: '',
    plate: '',
    color: '', // New field
    paymentMethod: '' as PaymentMethod | '', // New field
    notes: '' 
  });
  const [appointmentId, setAppointmentId] = useState<string>(propAppointmentId || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Data
  useEffect(() => {
    const load = async () => {
      const s = await api.getServices();
      setServices(s.filter(service => service.active));
    };
    load();
  }, []);

  useEffect(() => {
    if (date) {
      const loadApts = async () => {
        const apts = await api.getAppointments(date);
        setAppointments(apts);
      };
      loadApts();
    }
  }, [date]);

  const availableSlots = useMemo(() => {
    if (!date || !selectedService) return [];
    const rawSlots = generateTimeSlots(8, 18, 30);
    return rawSlots.map(t => ({
      time: t,
      available: isSlotAvailable(t, selectedService.durationMinutes, appointments)
    }));
  }, [date, appointments, selectedService]);

  const handleNextStep = () => {
    if (step === 1 && selectedService) setStep(2);
    else if (step === 2 && date && time) setStep(3);
    else if (step === 3 && formData.model && formData.color) setStep(4);
  };

  const handleFinalSubmit = async () => {
    if (selectedService && date && time && formData.name && formData.phone && formData.paymentMethod) {
      setIsSubmitting(true);
      const newId = await api.createAppointment({
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        price: selectedService.price,
        date,
        time,
        durationMinutes: selectedService.durationMinutes,
        customerName: formData.name,
        customerPhone: formData.phone,
        vehicleModel: formData.model,
        vehiclePlate: formData.plate,
        vehicleColor: formData.color,
        paymentMethod: formData.paymentMethod as PaymentMethod,
        notes: formData.notes
      });
      setAppointmentId(newId);
      setIsSubmitting(false);
      setStep(5);
    }
  };

  const openWhatsApp = () => {
    if (!selectedService) return;
    
    const formattedDate = date.split('-').reverse().join('/');
    
    // Generate URL for the SPA with query parameter using the hardcoded APP_BASE_URL
    const cancelLink = `${APP_BASE_URL}?cancelId=${appointmentId}`;
    
    // Exact WhatsApp Message Format from request
    const message = `*Olá! Gostaria de confirmar meu agendamento no Pit Stop – Lava Car 🚗*

*Serviço:* ${selectedService.name}
*Valor:* R$ ${selectedService.price},00

*Data:* ${formattedDate}
*Horário:* ${time}

*Cliente:* ${formData.name}

*Veículo:*
Modelo: ${formData.model}
Placa: ${formData.plate || 'Não informada'}
Cor: ${formData.color}

*Forma de pagamento:* ${formData.paymentMethod}

*Observações do cliente:*
${formData.notes || 'Nenhuma'}

🔧 *Gestão do agendamento:*
Cancelar ou reagendar:
${cancelLink}`;

    const url = `https://wa.me/${SHOP_PHONE}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const MobileHeader = ({ title }: { title: string }) => (
    <div className="bg-navy p-4 text-center sticky top-0 z-20 shadow-md flex items-center justify-between">
      <div className="w-8">
         {step > 1 && step < 5 && (
           <button onClick={() => setStep(s => (s-1) as any)} className="text-white opacity-80 hover:opacity-100">
             <ChevronLeft className="w-6 h-6" />
           </button>
         )}
      </div>
      <h2 className="text-white font-medium text-lg">{title}</h2>
      <div className="w-8 flex justify-end">
         <button onClick={onCancel} className="text-white opacity-80 hover:opacity-100">
           <X className="w-6 h-6" />
         </button>
      </div>
    </div>
  );

  const StickyFooter = ({ onClick, disabled, text, secondaryText }: any) => (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-20">
      <div className="max-w-lg mx-auto w-full">
        {secondaryText && (
          <div className="mb-2 text-right text-sm text-slate-500">
            {secondaryText}
          </div>
        )}
        <Button onClick={onClick} disabled={disabled} fullWidth className="py-4 text-lg rounded-xl">
          {text}
        </Button>
      </div>
    </div>
  );

  if (step === 5) {
    return (
      <div className="min-h-screen bg-[#f2f2f2] flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white rounded-3xl p-8 shadow-sm w-full max-w-sm space-y-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto animate-bounce-slow">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-navy">Agendamento Realizado!</h2>
          <div className="bg-slate-50 p-4 rounded-xl text-left space-y-2 text-sm text-slate-600">
            <p><strong>Serviço:</strong> {selectedService?.name}</p>
            <p><strong>Valor:</strong> R$ {selectedService?.price},00</p>
            <p><strong>Data:</strong> {date?.split('-').reverse().join('/')} às {time}</p>
            <p><strong>Veículo:</strong> {formData.model} ({formData.color})</p>
            <p><strong>Pagamento:</strong> {formData.paymentMethod}</p>
            {formData.notes && <p><strong>Obs:</strong> {formData.notes}</p>}
          </div>
          
          <div className="space-y-3 pt-2">
            <Button onClick={openWhatsApp} fullWidth className="bg-[#25D366] hover:bg-[#128C7E] text-white shadow-none border-0">
              <Phone className="w-4 h-4 mr-2" />
              Enviar Confirmação
            </Button>
            
            <button 
              onClick={() => onSimulateCancellation(appointmentId)}
              className="text-xs text-vivid-blue underline hover:text-navy pt-2"
            >
              (Testar Link de Cancelamento)
            </button>
            
            <Button onClick={onCancel} fullWidth variant="secondary">
              Voltar ao Início
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f2f2f2] pb-28 font-sans">
      
      {step === 1 && (
        <>
          <MobileHeader title="Escolha o Serviço" />
          <div className="p-4 max-w-lg mx-auto space-y-3">
            {services.map(service => {
              const Icon = IconMap[service.icon];
              const isSelected = selectedService?.id === service.id;
              return (
                <div 
                  key={service.id}
                  onClick={() => setSelectedService(service)}
                  className={`bg-white p-4 rounded-xl flex gap-4 transition-all cursor-pointer border-2 ${
                    isSelected ? 'border-vivid-blue shadow-md' : 'border-transparent shadow-sm'
                  }`}
                >
                  <div className={`w-20 h-20 rounded-lg flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-blue-50 text-vivid-blue' : 'bg-slate-100 text-slate-400'
                  }`}>
                    <Icon className="w-8 h-8" />
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <h3 className="font-bold text-navy text-lg leading-tight">{service.name}</h3>
                    <p className="text-sm text-slate-text mt-1">{service.description}</p>
                    <div className="mt-2 flex items-center gap-3">
                      <span className="font-bold text-vivid-blue">R$ {service.price},00</span>
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {service.durationMinutes} min
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isSelected ? 'bg-golden text-navy' : 'bg-slate-100 text-slate-300'
                    }`}>
                      {isSelected ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <StickyFooter 
            onClick={handleNextStep} 
            disabled={!selectedService} 
            text="Continuar"
            secondaryText={selectedService ? `Total: R$ ${selectedService.price},00` : undefined}
          />
        </>
      )}

      {step === 2 && (
        <>
          <MobileHeader title="Data e Horário" />
          <div className="p-4 max-w-lg mx-auto space-y-6">
            <div className="bg-white p-5 rounded-xl shadow-sm">
              <h3 className="font-semibold text-navy mb-3">Escolha a data</h3>
              <input 
                type="date" 
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-vivid-blue text-navy font-medium"
                min={new Date().toISOString().split('T')[0]}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            {date && (
               <div className="bg-white p-5 rounded-xl shadow-sm">
                <h3 className="font-semibold text-navy mb-3">Horários Disponíveis</h3>
                <div className="grid grid-cols-3 gap-3">
                  {availableSlots.map(slot => (
                    <button
                      key={slot.time}
                      disabled={!slot.available}
                      onClick={() => setTime(slot.time)}
                      className={`py-2 rounded-lg font-medium text-sm transition-all border ${
                        time === slot.time 
                          ? 'bg-vivid-blue text-white border-vivid-blue' 
                          : !slot.available 
                            ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed opacity-50'
                            : 'bg-white text-navy border-slate-200 hover:border-vivid-blue'
                      }`}
                    >
                      {slot.time}
                    </button>
                  ))}
                  {availableSlots.length > 0 && availableSlots.every(s => !s.available) && (
                     <div className="col-span-3 text-center text-slate-400 py-4 text-sm">Sem horários livres para esta duração ({selectedService?.durationMinutes} min)</div>
                  )}
                </div>
               </div>
            )}
          </div>
          <StickyFooter 
            onClick={handleNextStep} 
            disabled={!date || !time} 
            text="Continuar" 
          />
        </>
      )}

      {step === 3 && (
        <>
          <MobileHeader title="Dados do Veículo" />
          <div className="p-4 max-w-lg mx-auto">
             <div className="bg-white p-6 rounded-xl shadow-sm space-y-4">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-vivid-blue">
                    <Car className="w-8 h-8" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy mb-2">Modelo do Veículo</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Chevrolet Onix"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-vivid-blue"
                    value={formData.model}
                    onChange={e => setFormData({...formData, model: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-navy mb-2">Placa (Opcional)</label>
                    <input 
                      type="text" 
                      placeholder="ABC-1234"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-vivid-blue"
                      value={formData.plate}
                      onChange={e => setFormData({...formData, plate: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy mb-2">Cor</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Preto"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-vivid-blue"
                      value={formData.color}
                      onChange={e => setFormData({...formData, color: e.target.value})}
                    />
                  </div>
                </div>
             </div>
          </div>
          <StickyFooter 
            onClick={handleNextStep} 
            disabled={!formData.model || !formData.color} 
            text="Continuar" 
          />
        </>
      )}

      {step === 4 && (
        <>
          <MobileHeader title="Finalizar Agendamento" />
          <div className="p-4 max-w-lg mx-auto pb-32">
             <div className="bg-white p-6 rounded-xl shadow-sm space-y-4">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-vivid-blue">
                    <User className="w-8 h-8" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy mb-2">Nome Completo</label>
                  <input 
                    type="text" 
                    placeholder="Seu nome"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-vivid-blue"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy mb-2">WhatsApp</label>
                  <input 
                    type="tel" 
                    placeholder="(11) 99999-9999"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-vivid-blue"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
             </div>
             
             {/* Payment Selection */}
             <div className="bg-white p-6 rounded-xl shadow-sm space-y-4 mt-4">
               <label className="block text-sm font-medium text-navy mb-2">Forma de Pagamento</label>
               <div className="grid grid-cols-3 gap-3">
                 {['Débito', 'Crédito', 'Pix'].map((method) => {
                   const isSelected = formData.paymentMethod === method;
                   return (
                     <button
                        key={method}
                        onClick={() => setFormData({...formData, paymentMethod: method as PaymentMethod})}
                        className={`py-4 px-2 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                          isSelected 
                            ? 'bg-blue-50 border-vivid-blue text-vivid-blue ring-2 ring-vivid-blue ring-offset-2' 
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                        }`}
                     >
                       {method === 'Pix' && <QrCode className="w-6 h-6" />}
                       {method === 'Débito' && <Wallet className="w-6 h-6" />}
                       {method === 'Crédito' && <CreditCard className="w-6 h-6" />}
                       <span className="text-xs font-bold">{method}</span>
                     </button>
                   );
                 })}
               </div>
             </div>

             {/* Observation Field */}
             <div className="bg-white p-6 rounded-xl shadow-sm space-y-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-navy mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Observações (Opcional)
                  </label>
                  <textarea 
                    placeholder="Ex: Cuidado com retrovisor, mancha no banco, etc."
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-vivid-blue h-24 resize-none"
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                  />
                </div>
             </div>
          </div>
          <StickyFooter 
            onClick={handleFinalSubmit} 
            disabled={!formData.name || !formData.phone || !formData.paymentMethod || isSubmitting} 
            text={isSubmitting ? "Agendando..." : "Finalizar Agendamento"} 
          />
        </>
      )}

    </div>
  );
};

// --- View: Cancellation / Manage Booking ---

const CancellationView: React.FC<{ appointmentId: string, onBack: () => void }> = ({ appointmentId, onBack }) => {
  const [apt, setApt] = useState<Appointment | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchApt = async () => {
       setIsLoading(true);
       const all = await api.getAppointments(); 
       const found = all.find(a => a.id === appointmentId);
       setApt(found || null);
       setIsLoading(false);
    };
    if (appointmentId) fetchApt();
  }, [appointmentId]);

  const handleCancel = async () => {
    if (confirm("Tem certeza que deseja cancelar este agendamento?")) {
      await api.cancelAppointment(appointmentId);
      setCancelled(true);
    }
  };

  if (cancelled) {
    return (
      <div className="min-h-screen bg-[#f2f2f2] flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl shadow-sm text-center max-w-sm w-full">
           <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
             <X className="w-8 h-8 text-red-500" />
           </div>
           <h2 className="text-xl font-bold text-navy mb-2">Agendamento Cancelado</h2>
           <p className="text-slate-500 text-sm mb-6">O horário foi liberado na nossa agenda.</p>
           <Button onClick={onBack} fullWidth variant="secondary">Agendar Novo Horário</Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f2f2f2] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-vivid-blue border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!apt) {
    return (
      <div className="min-h-screen bg-[#f2f2f2] flex items-center justify-center p-6">
        <div className="text-center">
           <AlertTriangle className="w-12 h-12 text-golden mx-auto mb-2" />
           <p className="text-navy font-bold">Agendamento não encontrado</p>
           <Button onClick={onBack} className="mt-4" variant="ghost">Voltar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f2f2f2] flex flex-col">
      <div className="bg-navy p-4 text-white text-center shadow-lg relative">
        <h2 className="font-bold">Gerenciar Agendamento</h2>
        <button onClick={() => { window.history.replaceState({}, '', window.location.pathname); onBack(); }} className="absolute left-4 top-4 opacity-80"><ChevronLeft /></button>
      </div>
      <div className="p-6 flex-1 flex flex-col justify-center">
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
          <div className="border-b pb-4 mb-4">
             <div className="flex justify-between items-start">
               <div>
                  <h3 className="text-xs uppercase text-slate-400 font-bold mb-1">Serviço</h3>
                  <p className="text-xl font-bold text-navy">{apt.serviceName}</p>
               </div>
               <div className={`px-2 py-1 rounded text-xs font-bold uppercase ${apt.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                 {apt.status === 'confirmed' ? 'Confirmado' : apt.status}
               </div>
             </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
               <h3 className="text-xs uppercase text-slate-400 font-bold mb-1">Data</h3>
               <p className="font-medium text-navy">{apt.date.split('-').reverse().join('/')}</p>
            </div>
            <div>
               <h3 className="text-xs uppercase text-slate-400 font-bold mb-1">Horário</h3>
               <p className="font-medium text-navy">{apt.time}</p>
            </div>
          </div>
          <div>
             <h3 className="text-xs uppercase text-slate-400 font-bold mb-1">Veículo</h3>
             <p className="font-medium text-navy">{apt.vehicleModel}</p>
             <p className="text-sm text-slate-500">
               {apt.vehiclePlate && <span>{apt.vehiclePlate}</span>}
               {apt.vehiclePlate && apt.vehicleColor && <span> • </span>}
               {apt.vehicleColor && <span>{apt.vehicleColor}</span>}
             </p>
          </div>
          
          <div>
            <h3 className="text-xs uppercase text-slate-400 font-bold mb-1">Pagamento</h3>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {apt.paymentMethod}
            </span>
          </div>

          {apt.notes && (
             <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
               <h3 className="text-xs uppercase text-yellow-600 font-bold mb-1">Observações</h3>
               <p className="text-sm text-yellow-800">{apt.notes}</p>
             </div>
          )}
          
          <div className="pt-6 space-y-3">
             {apt.status !== 'cancelled' ? (
               <Button onClick={handleCancel} fullWidth variant="danger">
                 Cancelar Agendamento
               </Button>
             ) : (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-center text-sm font-bold">
                  Este agendamento já foi cancelado.
                </div>
             )}
             <Button onClick={() => { window.history.replaceState({}, '', window.location.pathname); onBack(); }} fullWidth variant="ghost">
               Voltar
             </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- View: Admin Dashboard ---

interface AdminDashboardProps {
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'schedule' | 'services' | 'clients'>('dashboard');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [aiBriefing, setAiBriefing] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]); // For dashboard stats
  const [clientHistory, setClientHistory] = useState<ClientHistory[]>([]);

  // Add/Edit Service State
  const [isAddingService, setIsAddingService] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newService, setNewService] = useState({
    name: '',
    price: '',
    durationMinutes: '',
    description: '',
    icon: 'car' as const
  });

  // Marketing State
  const [showMarketingModal, setShowMarketingModal] = useState(false);
  const [marketingMessage, setMarketingMessage] = useState('Olá {nome}, o Pit Stop Lava Car está com uma promoção especial! Agende sua lavagem hoje e deixe seu carro novo.');
  const [targetClient, setTargetClient] = useState<ClientHistory | null>(null);

  // Load Data
  const loadData = async () => {
    const s = await api.getServices();
    setServices(s);
    
    // Fetch appointments for selected date (Schedule view)
    const dailyApts = await api.getAppointments(selectedDate);
    setAppointments(dailyApts);
    
    // Fetch ALL appointments for client history and dashboard stats
    const all = await api.getAppointments(); 
    setAllAppointments(all);
    const clients = aggregateClientHistory(all);
    setClientHistory(clients);
  };

  useEffect(() => {
    loadData();
  }, [selectedDate, activeTab]);

  const dailyAppointments = useMemo(() => {
    return appointments.sort((a, b) => a.time.localeCompare(b.time));
  }, [appointments]);

  // --- Financial Stats Logic ---
  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    // Get start of week (Sunday)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const startOfWeekStr = startOfWeek.toISOString().split('T')[0];

    // Get start of month
    const startOfMonthStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    let revenueToday = 0;
    let revenueWeek = 0;
    let revenueMonth = 0;
    let countToday = 0;
    let countMonth = 0;
    
    // For chart: Last 7 days revenue
    const last7Days: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      last7Days[d.toISOString().split('T')[0]] = 0;
    }

    allAppointments.forEach(apt => {
      if (apt.status === 'cancelled') return;
      
      const price = apt.price || 0;

      // Today
      if (apt.date === todayStr) {
        revenueToday += price;
        countToday++;
      }

      // Month
      if (apt.date >= startOfMonthStr) {
        revenueMonth += price;
        countMonth++;
      }

      // Last 7 Days (including today)
      if (last7Days[apt.date] !== undefined) {
        last7Days[apt.date] += price;
      }
      
      // Rough Week calc (Sunday to Sat)
      if (apt.date >= startOfWeekStr) {
        revenueWeek += price;
      }
    });

    const chartData = Object.keys(last7Days).map(date => {
        const d = new Date(date + 'T00:00:00');
        const dayName = d.toLocaleDateString('pt-BR', { weekday: 'short' });
        return { day: dayName, value: last7Days[date] };
    });

    return {
      revenueToday,
      revenueWeek,
      revenueMonth,
      countToday,
      countMonth,
      averageTicket: countMonth > 0 ? Math.round(revenueMonth / countMonth) : 0,
      chartData
    };
  }, [allAppointments]);

  const handleAiBriefing = async () => {
    setIsAiLoading(true);
    setAiBriefing('');
    const summary = await generateDailyBriefing(selectedDate, dailyAppointments, services);
    setAiBriefing(summary);
    setIsAiLoading(false);
  };

  const handleToggleService = async (service: Service) => {
    await api.updateService(service.id, { active: !service.active });
    loadData();
  };

  const handleEditService = (service: Service) => {
    setNewService({
      name: service.name,
      price: service.price.toString(),
      durationMinutes: service.durationMinutes.toString(),
      description: service.description,
      icon: service.icon
    });
    setEditingId(service.id);
    setIsAddingService(true);
    // Add scroll to top to ensure form is visible
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newService.name || !newService.price) return;

    // Preserve active status if editing, default true if new
    const currentActiveStatus = editingId 
      ? services.find(s => s.id === editingId)?.active ?? true 
      : true;

    const serviceData = {
      name: newService.name,
      price: Number(newService.price),
      durationMinutes: Number(newService.durationMinutes) || 60,
      description: newService.description,
      icon: newService.icon,
      active: currentActiveStatus
    };

    if (editingId) {
      await api.updateService(editingId, serviceData);
    } else {
      await api.addService(serviceData);
    }
    
    setIsAddingService(false);
    setEditingId(null);
    setNewService({ name: '', price: '', durationMinutes: '', description: '', icon: 'car' });
    loadData();
  };

  const handleDeleteService = async (id: string) => {
    if(confirm("Tem certeza que deseja excluir permanentemente este serviço?")) {
      await api.deleteService(id);
      loadData();
    }
  };

  const handleOpenMarketing = (client: ClientHistory | null = null) => {
    setTargetClient(client);
    setShowMarketingModal(true);
  };

  const getWhatsappLink = (client: ClientHistory, messageTemplate: string) => {
    // Clean phone number
    let phone = client.phone.replace(/\D/g, '');
    if (!phone.startsWith('55')) phone = '55' + phone; // Assume BR if no country code
    
    // Replace variable
    const firstName = client.name.split(' ')[0];
    const message = messageTemplate.replace('{nome}', firstName);
    
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  const copyAllNumbers = () => {
    const numbers = clientHistory.map(c => c.phone.replace(/\D/g, '')).join(',');
    navigator.clipboard.writeText(numbers);
    alert(`${clientHistory.length} números copiados! Cole em uma Lista de Transmissão no WhatsApp.`);
  };

  // Color mapping for services to distinguish visually
  const getServiceColor = (name: string) => {
    if (name.toLowerCase().includes('simples')) return 'border-l-4 border-l-vivid-blue';
    if (name.toLowerCase().includes('completa')) return 'border-l-4 border-l-golden';
    if (name.toLowerCase().includes('polimento')) return 'border-l-4 border-l-navy';
    return 'border-l-4 border-l-slate-300';
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <header className="bg-navy text-white px-6 py-4 shadow-lg sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-lg">
               <ShieldCheck className="w-6 h-6 text-golden" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-none">Painel Admin</h1>
              <p className="text-xs text-slate-300 mt-1">Pit Stop - Lava Car</p>
            </div>
          </div>
          <Button variant="ghost" onClick={onLogout} className="text-slate-300 hover:text-white hover:bg-white/10">
            <LogOut className="w-4 h-4 mr-2" /> <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 sm:p-6">
        <div className="flex flex-wrap gap-2 mb-8 bg-white p-1 rounded-xl shadow-sm border border-slate-100 w-fit">
          <button onClick={() => setActiveTab('dashboard')} className={`px-4 sm:px-6 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${activeTab === 'dashboard' ? 'bg-navy text-white shadow-md' : 'text-slate-500 hover:text-navy hover:bg-slate-50'}`}>
            <LayoutDashboard className="w-4 h-4" /> Visão Geral
          </button>
          <button onClick={() => setActiveTab('schedule')} className={`px-4 sm:px-6 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${activeTab === 'schedule' ? 'bg-navy text-white shadow-md' : 'text-slate-500 hover:text-navy hover:bg-slate-50'}`}>
            <CalendarDays className="w-4 h-4" /> Agenda
          </button>
          <button onClick={() => setActiveTab('clients')} className={`px-4 sm:px-6 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${activeTab === 'clients' ? 'bg-navy text-white shadow-md' : 'text-slate-500 hover:text-navy hover:bg-slate-50'}`}>
            <User className="w-4 h-4" /> Clientes
          </button>
          <button onClick={() => setActiveTab('services')} className={`px-4 sm:px-6 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${activeTab === 'services' ? 'bg-navy text-white shadow-md' : 'text-slate-500 hover:text-navy hover:bg-slate-50'}`}>
            <Car className="w-4 h-4" /> Serviços
          </button>
        </div>

        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fade-in">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               {/* Today Revenue */}
               <div className="bg-white p-5 rounded-2xl shadow-soft border border-slate-100">
                  <div className="flex justify-between items-start mb-2">
                     <div className="bg-green-50 p-2 rounded-lg text-green-600">
                       <DollarSign className="w-5 h-5" />
                     </div>
                     <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">+Hoje</span>
                  </div>
                  <h3 className="text-2xl font-bold text-navy">R$ {stats.revenueToday}</h3>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Faturamento Hoje</p>
               </div>

               {/* Today Appointments */}
               <div className="bg-white p-5 rounded-2xl shadow-soft border border-slate-100">
                  <div className="flex justify-between items-start mb-2">
                     <div className="bg-blue-50 p-2 rounded-lg text-vivid-blue">
                       <Car className="w-5 h-5" />
                     </div>
                  </div>
                  <h3 className="text-2xl font-bold text-navy">{stats.countToday}</h3>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Carros Hoje</p>
               </div>

               {/* Month Revenue */}
               <div className="bg-white p-5 rounded-2xl shadow-soft border border-slate-100">
                  <div className="flex justify-between items-start mb-2">
                     <div className="bg-purple-50 p-2 rounded-lg text-purple-600">
                       <TrendingUp className="w-5 h-5" />
                     </div>
                  </div>
                  <h3 className="text-2xl font-bold text-navy">R$ {stats.revenueMonth}</h3>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Faturamento Mês</p>
               </div>

               {/* Avg Ticket */}
               <div className="bg-white p-5 rounded-2xl shadow-soft border border-slate-100">
                  <div className="flex justify-between items-start mb-2">
                     <div className="bg-yellow-50 p-2 rounded-lg text-yellow-600">
                       <Wallet className="w-5 h-5" />
                     </div>
                  </div>
                  <h3 className="text-2xl font-bold text-navy">R$ {stats.averageTicket}</h3>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Ticket Médio</p>
               </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
               {/* Weekly Chart */}
               <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-soft border border-slate-100">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-navy">Evolução da Receita</h3>
                      <p className="text-sm text-slate-500">Últimos 7 dias</p>
                    </div>
                    <div className="text-right">
                       <p className="text-xs text-slate-400 font-bold uppercase">Semana Atual</p>
                       <p className="text-xl font-bold text-vivid-blue">R$ {stats.revenueWeek}</p>
                    </div>
                  </div>
                  
                  {/* Simple CSS Bar Chart */}
                  <div className="h-48 flex items-end justify-between gap-2">
                    {stats.chartData.map((data, idx) => {
                       // Calculate height relative to max, assume max is roughly 2x average or fixed if 0
                       const maxVal = Math.max(...stats.chartData.map(d => d.value)) || 100;
                       const heightPercent = Math.max((data.value / maxVal) * 100, 5); // Min 5% height
                       
                       return (
                         <div key={idx} className="flex-1 flex flex-col items-center group">
                            <div className="w-full bg-slate-100 rounded-t-lg relative overflow-hidden transition-all group-hover:bg-blue-50" style={{ height: '100%' }}>
                               <div 
                                 className="absolute bottom-0 left-0 right-0 bg-vivid-blue rounded-t-lg transition-all duration-500 ease-out group-hover:bg-navy"
                                 style={{ height: `${heightPercent}%` }}
                               ></div>
                            </div>
                            <span className="text-xs font-bold text-slate-400 mt-2">{data.day}</span>
                            <span className="text-[10px] font-medium text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity absolute -mt-6 bg-white shadow-sm px-1 rounded">R${data.value}</span>
                         </div>
                       );
                    })}
                  </div>
               </div>

               {/* Quick Stats / Top Services Placeholder */}
               <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100 flex flex-col justify-center">
                  <h3 className="text-lg font-bold text-navy mb-4">Insights Rápidos</h3>
                  <div className="space-y-4">
                     <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                        <p className="text-xs text-slate-500 uppercase font-bold mb-1">Dia Mais Movimentado</p>
                        <p className="text-navy font-medium">Sexta-feira (Histórico)</p>
                     </div>
                     <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                        <p className="text-xs text-slate-500 uppercase font-bold mb-1">Serviço Mais Pedido</p>
                        <p className="text-navy font-medium">Lavagem Simples</p>
                     </div>
                     <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                        <p className="text-xs text-slate-500 uppercase font-bold mb-1">Taxa de Ocupação Hoje</p>
                        <p className="text-navy font-medium">
                          {Math.round((dailyAppointments.filter(a => a.status !== 'cancelled').length / 20) * 100)}% (Estimado)
                        </p>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="grid lg:grid-cols-3 gap-6 animate-fade-in">
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100">
                <label className="block text-sm font-semibold text-navy mb-3">Data da Agenda</label>
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setAiBriefing('');
                  }}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-navy outline-none text-navy font-medium"
                />
              </div>

              <div className="bg-gradient-to-br from-navy to-[#0A2A4D] text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-vivid-blue rounded-full blur-[60px] opacity-20"></div>
                <div className="flex items-center gap-2 mb-4 relative z-10">
                  <div className="p-2 bg-white/10 rounded-lg">
                    <Bot className="w-5 h-5 text-golden" />
                  </div>
                  <h3 className="font-bold">Resumo Inteligente</h3>
                </div>
                
                {aiBriefing ? (
                  <div className="bg-white/5 p-4 rounded-xl text-sm leading-relaxed mb-4 backdrop-blur-md border border-white/10 animate-fade-in text-slate-200">
                    <div className="whitespace-pre-line">{aiBriefing}</div>
                  </div>
                ) : (
                  <p className="text-slate-300 text-sm mb-6 relative z-10">
                    Obtenha uma análise rápida dos agendamentos de hoje para otimizar sua equipe.
                  </p>
                )}
                
                <Button 
                  onClick={handleAiBriefing} 
                  isLoading={isAiLoading}
                  variant="golden"
                  fullWidth
                  className="relative z-10 font-bold"
                >
                   {aiBriefing ? 'Atualizar' : 'Gerar Resumo'}
                </Button>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center mb-2">
                 <h2 className="text-xl font-bold text-navy flex items-center gap-2">
                  Agendamentos 
                  <span className="bg-vivid-blue text-white text-xs px-2 py-1 rounded-full">{dailyAppointments.length}</span>
                </h2>
              </div>
              
              {dailyAppointments.length === 0 ? (
                <div className="bg-white p-16 rounded-2xl text-center border-2 border-dashed border-slate-200">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p className="text-slate-500 font-medium">Nenhum agendamento para este dia.</p>
                </div>
              ) : (
                dailyAppointments.map(apt => (
                  <div key={apt.id} className={`bg-white p-5 rounded-2xl shadow-soft border border-slate-100 flex flex-col sm:flex-row gap-5 items-start sm:items-center ${getServiceColor(apt.serviceName)} ${apt.status === 'cancelled' ? 'opacity-60 border-red-200 bg-red-50' : ''}`}>
                    <div className="flex items-start gap-4 flex-1 w-full">
                      <div className={`text-navy font-bold px-4 py-3 rounded-xl text-xl min-w-[90px] text-center border border-slate-100 ${apt.status === 'cancelled' ? 'bg-red-100 text-red-600 line-through' : 'bg-slate-50'}`}>
                        {apt.time}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className={`font-bold text-navy text-lg ${apt.status === 'cancelled' ? 'line-through text-slate-500' : ''}`}>{apt.customerName}</h4>
                          <div className="flex flex-col items-end gap-1">
                             <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-500">{apt.customerPhone}</span>
                             {apt.status === 'cancelled' && <span className="text-xs font-bold text-white bg-red-500 px-2 py-1 rounded uppercase">Cancelado</span>}
                          </div>
                        </div>
                        <p className="text-slate-text flex items-center gap-2 mt-1">
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide text-slate-600">{apt.vehicleModel}</span>
                          {apt.vehicleColor && <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{apt.vehicleColor}</span>}
                          {apt.vehiclePlate && <span className="text-sm text-slate-400 font-mono">{apt.vehiclePlate}</span>}
                        </p>
                        <div className="mt-2 flex items-center gap-3">
                          <p className="text-sm text-vivid-blue font-semibold">{apt.serviceName}</p>
                          <span className="text-xs text-slate-400">({apt.durationMinutes} min)</span>
                          <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-bold">{apt.paymentMethod}</span>
                        </div>
                        {apt.notes && (
                          <div className="mt-3 bg-yellow-50 border border-yellow-100 p-2 rounded-lg flex gap-2 items-start">
                             <AlertCircle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                             <p className="text-xs text-yellow-800 font-medium leading-tight">{apt.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'clients' && (
          <div className="space-y-6">
            
            {/* Marketing Modal */}
            {showMarketingModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/20 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                     <div className="flex items-center gap-3">
                       <div className="bg-green-100 p-2 rounded-lg text-green-600">
                         <Megaphone className="w-5 h-5" />
                       </div>
                       <div>
                         <h3 className="text-lg font-bold text-navy">Campanha de Marketing</h3>
                         <p className="text-xs text-slate-500">Envie promoções e lembretes via WhatsApp</p>
                       </div>
                     </div>
                     <button onClick={() => setShowMarketingModal(false)} className="text-slate-400 hover:text-red-500"><X /></button>
                  </div>
                  
                  <div className="p-6 flex-1 overflow-y-auto">
                     <div className="space-y-4">
                        <div>
                          <label className="text-xs font-bold text-navy uppercase mb-1 block">Mensagem (Use {'{nome}'} para o nome do cliente)</label>
                          <textarea 
                            className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none h-32 text-sm bg-slate-50"
                            value={marketingMessage}
                            onChange={(e) => setMarketingMessage(e.target.value)}
                          />
                          <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                            <Bot className="w-3 h-3" />
                            Dica: Mantenha a mensagem curta e objetiva para maior conversão.
                          </p>
                        </div>

                        {targetClient ? (
                          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                             <p className="text-sm text-blue-800 font-medium mb-2">Enviar apenas para:</p>
                             <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-blue-100">
                                <span className="font-bold text-navy">{targetClient.name}</span>
                                <a 
                                  href={getWhatsappLink(targetClient, marketingMessage)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
                                >
                                  <MessageCircle className="w-4 h-4" /> Enviar Agora
                                </a>
                             </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                             <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                                <div className="flex items-start gap-3">
                                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                                  <div>
                                    <h4 className="font-bold text-yellow-800 text-sm">Envio em Massa (Broadcast)</h4>
                                    <p className="text-xs text-yellow-700 mt-1">
                                      O WhatsApp Web não permite envio automático em massa. A melhor prática é usar uma <strong>Lista de Transmissão</strong> no seu celular.
                                    </p>
                                    <button 
                                      onClick={copyAllNumbers}
                                      className="mt-3 bg-white border border-yellow-200 text-yellow-800 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-yellow-100 transition-colors"
                                    >
                                      <Copy className="w-4 h-4" /> Copiar Todos os Números
                                    </button>
                                  </div>
                                </div>
                             </div>

                             <div>
                               <h4 className="font-bold text-navy text-sm mb-3">Ou envie individualmente abaixo:</h4>
                               <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                                  {clientHistory.map((client, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-100 hover:border-green-200 transition-colors group">
                                       <div className="flex-1">
                                          <p className="font-bold text-navy text-sm">{client.name}</p>
                                          <p className="text-xs text-slate-400">{client.phone}</p>
                                       </div>
                                       <a 
                                          href={getWhatsappLink(client, marketingMessage)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-slate-300 group-hover:text-green-500 p-2 rounded-full hover:bg-green-50 transition-colors"
                                          title="Enviar WhatsApp"
                                       >
                                         <ExternalLink className="w-4 h-4" />
                                       </a>
                                    </div>
                                  ))}
                               </div>
                             </div>
                          </div>
                        )}
                     </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={() => handleOpenMarketing(null)} variant="golden" className="shadow-lg">
                <Megaphone className="w-4 h-4 mr-2" /> Criar Campanha
              </Button>
            </div>

            <div className="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden animate-fade-in">
              <div className="p-6 border-b border-slate-100 bg-slate-50">
                <h2 className="text-lg font-bold text-navy flex items-center gap-2">
                  <History className="w-5 h-5 text-vivid-blue" />
                  Base de Clientes
                </h2>
                <p className="text-sm text-slate-500 mt-1">Gerencie e fidelize seus clientes</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white text-xs uppercase text-slate-400 font-bold border-b border-slate-100">
                      <th className="px-6 py-4">Cliente</th>
                      <th className="px-6 py-4 text-center">Total Visitas</th>
                      <th className="px-6 py-4">Última Visita</th>
                      <th className="px-6 py-4">Veículos</th>
                      <th className="px-6 py-4 text-center">WhatsApp</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {clientHistory.map((client, idx) => (
                      <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-navy">{client.name}</p>
                          <p className="text-xs text-slate-400 font-mono">{client.phone}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="bg-blue-50 text-vivid-blue px-3 py-1 rounded-full font-bold">{client.totalVisits}</span>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{client.lastVisit.split('-').reverse().join('/')}</td>
                        <td className="px-6 py-4 text-xs text-slate-500 max-w-[200px] truncate">{client.vehicles.join(', ')}</td>
                        <td className="px-6 py-4 text-center">
                          <button 
                            onClick={() => handleOpenMarketing(client)}
                            className="inline-flex items-center justify-center p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                            title="Enviar Mensagem"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {clientHistory.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400">Nenhum histórico encontrado.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'services' && (
          <div className="grid gap-6 animate-fade-in">
             {/* Add/Edit Service Section */}
             {isAddingService ? (
               <div className="bg-white p-6 rounded-2xl shadow-soft border border-vivid-blue animate-fade-in">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-navy">{editingId ? 'Editar Serviço' : 'Novo Serviço'}</h3>
                    <button onClick={() => { setIsAddingService(false); setEditingId(null); setNewService({ name: '', price: '', durationMinutes: '', description: '', icon: 'car' }); }} className="text-slate-400 hover:text-red-500"><X /></button>
                  </div>
                  <form onSubmit={handleAddService} className="grid sm:grid-cols-2 gap-4">
                     <div className="col-span-2">
                       <label className="text-xs font-bold text-navy uppercase">Nome do Serviço</label>
                       <input className="w-full p-3 border rounded-lg bg-slate-50" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} required />
                     </div>
                     <div>
                       <label className="text-xs font-bold text-navy uppercase">Preço (R$)</label>
                       <input type="number" className="w-full p-3 border rounded-lg bg-slate-50" value={newService.price} onChange={e => setNewService({...newService, price: e.target.value})} required />
                     </div>
                     <div>
                       <label className="text-xs font-bold text-navy uppercase">Duração (Min)</label>
                       <input type="number" className="w-full p-3 border rounded-lg bg-slate-50" value={newService.durationMinutes} onChange={e => setNewService({...newService, durationMinutes: e.target.value})} required />
                     </div>
                     <div className="col-span-2">
                       <label className="text-xs font-bold text-navy uppercase">Descrição</label>
                       <textarea className="w-full p-3 border rounded-lg bg-slate-50" value={newService.description} onChange={e => setNewService({...newService, description: e.target.value})} />
                     </div>
                     <div className="col-span-2">
                       <Button fullWidth>{editingId ? 'Atualizar Serviço' : 'Salvar Serviço'}</Button>
                     </div>
                  </form>
               </div>
             ) : (
                <button 
                  onClick={() => setIsAddingService(true)}
                  className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center gap-2 text-slate-500 hover:border-vivid-blue hover:text-vivid-blue hover:bg-blue-50 transition-all font-semibold"
                >
                  <Plus className="w-5 h-5" /> Adicionar Novo Serviço
                </button>
             )}

             <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {services.map(service => (
                  <div key={service.id} className={`bg-white p-6 rounded-2xl shadow-soft border relative group transition-all duration-300 ${!service.active ? 'opacity-60 border-slate-200' : 'border-slate-100 hover:-translate-y-1'}`}>
                    <div className="absolute top-4 right-4 flex gap-2">
                      <button
                        onClick={() => handleEditService(service)}
                        className="text-slate-300 hover:text-vivid-blue hover:bg-blue-50 p-2 rounded-lg transition-colors"
                        title="Editar"
                      >
                         <Pencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleToggleService(service)}
                        className={`p-2 rounded-lg transition-colors ${service.active ? 'text-green-500 bg-green-50' : 'text-slate-400 bg-slate-100'}`}
                        title={service.active ? "Desativar" : "Ativar"}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteService(service.id)}
                        className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="w-12 h-12 bg-navy text-golden rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-navy/20">
                       <Sparkles className="w-6 h-6" />
                    </div>
                    
                    <h3 className="font-bold text-lg text-navy mb-1">{service.name}</h3>
                    <p className="text-slate-text text-sm mb-4 leading-relaxed h-[40px] overflow-hidden">{service.description}</p>
                    
                    <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                      <span className="text-lg font-bold text-vivid-blue">R$ {service.price}</span>
                      <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md">
                        <Clock className="w-3 h-3" /> {service.durationMinutes} min
                      </span>
                    </div>
                    {!service.active && <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-2xl pointer-events-none"><span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold uppercase">Inativo</span></div>}
                  </div>
                ))}
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

// --- View: Home Landing ---

const LandingPage: React.FC<{ onStartBooking: () => void; onAdminLogin: () => void; logoUrl: string }> = ({ onStartBooking, onAdminLogin, logoUrl }) => (
  <div className="min-h-screen flex flex-col bg-[#f2f2f2] font-sans">
    
    {/* Facebook-style Cover */}
    <div className="relative">
      <div className="h-40 bg-gradient-to-r from-navy to-blue-900 rounded-b-[40px] shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-vivid-blue blur-[60px] opacity-30 rounded-full"></div>
        <div className="absolute left-10 bottom-0 w-32 h-32 bg-golden blur-[50px] opacity-20 rounded-full"></div>
      </div>
      
      <div className="relative -mt-16 flex flex-col items-center px-4">
        <div className="relative group">
          <div className="absolute inset-0 bg-golden rounded-full blur-md opacity-20 group-hover:opacity-40 transition-opacity"></div>
          <img 
            src={logoUrl} 
            alt="Pit Stop Lava Car" 
            className="w-32 h-32 rounded-full border-4 border-white shadow-xl bg-white object-contain p-2 relative z-10"
          />
        </div>
        
        <h1 className="text-2xl font-bold text-navy mt-4 mb-1 text-center">Pit Stop - Lava Car</h1>
        <p className="text-slate-500 text-sm text-center max-w-xs">Cuidado profissional para o seu veículo em menos de 2 minutos.</p>
        
        <div className="flex gap-2 mt-4 text-xs font-semibold text-slate-400 bg-white px-4 py-2 rounded-full shadow-sm">
           <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-green-500" /> Seguro</span>
           <span className="w-px h-3 bg-slate-200"></span>
           <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-vivid-blue" /> Rápido</span>
        </div>
      </div>
    </div>

    <main className="flex-1 flex flex-col p-6 max-w-lg mx-auto w-full gap-4 mt-4">
       <Button onClick={onStartBooking} variant="primary" fullWidth className="py-4 text-lg shadow-blue-500/30">
          <Calendar className="w-5 h-5 mr-2" />
          Agendar Serviço
       </Button>
       
       <Button onClick={onStartBooking} variant="secondary" fullWidth className="py-4 text-lg text-slate-600">
          <Sparkles className="w-5 h-5 mr-2 text-golden" />
          Conhecer Preços
       </Button>

       <button onClick={onAdminLogin} className="mt-auto pt-8 text-xs text-slate-400 hover:text-navy flex items-center justify-center gap-1 pb-4">
         <LogOut className="w-3 h-3" /> Acesso Administrativo
       </button>
    </main>
  </div>
);

// --- Main App Component ---

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.HOME);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [cancellationId, setCancellationId] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string>('');

  // Handle URL parameters for direct linking (e.g. from WhatsApp)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cancelId = params.get('cancelId');
    if (cancelId) {
      setCancellationId(cancelId);
      setView(ViewState.CANCELLATION);
    }
  }, []);

  // Auth Listener & Config
  useEffect(() => {
    const unsubscribe = api.onAuthStateChanged((user) => {
      if (user) {
        setView(ViewState.ADMIN_DASHBOARD);
      }
    });

    const fetchConfig = async () => {
      const url = await api.getLogoUrl();
      setLogoUrl(url);
    };
    fetchConfig();

    return () => unsubscribe();
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');
    try {
      await api.login(email, password);
      setView(ViewState.ADMIN_DASHBOARD);
    } catch (err: any) {
      setLoginError(err.message || 'Falha no login');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleTestAccess = () => {
    // Fill credentials for visual confirmation if needed, but the main goal is access.
    // We try to log in with mock credentials to satisfy the 'login' flow if possible, 
    // but if that fails (e.g. on a real backend without these creds), we force the view change 
    // because the user explicitly requested "access without password for testing".
    setEmail('admin@pitstop.com');
    setPassword('123456');
    
    setIsLoggingIn(true);
    
    // Attempt standard login first (works for mock mode)
    api.login('admin@pitstop.com', '123456')
      .then(() => {
        setView(ViewState.ADMIN_DASHBOARD);
      })
      .catch(() => {
        // Fallback: If login fails (e.g. real firebase), force entry to dashboard for UI testing
        setView(ViewState.ADMIN_DASHBOARD);
      })
      .finally(() => {
        setIsLoggingIn(false);
      });
  };

  const handleLogout = async () => {
    await api.logout();
    setView(ViewState.HOME);
    setEmail('');
    setPassword('');
  };

  const handleSimulateCancellation = (id: string) => {
    setCancellationId(id);
    setView(ViewState.CANCELLATION);
  }

  // View Routing
  if (view === ViewState.HOME) {
    return <LandingPage onStartBooking={() => setView(ViewState.BOOKING)} onAdminLogin={() => setView(ViewState.ADMIN_LOGIN)} logoUrl={logoUrl} />;
  }

  if (view === ViewState.BOOKING) {
    return (
      <BookingFlow 
        onCancel={() => setView(ViewState.HOME)}
        onSimulateCancellation={handleSimulateCancellation}
      />
    );
  }

  if (view === ViewState.CANCELLATION) {
    return (
      <CancellationView 
        appointmentId={cancellationId}
        onBack={() => setView(ViewState.HOME)}
      />
    );
  }

  if (view === ViewState.ADMIN_LOGIN) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6 font-sans">
        <div className="bg-white p-10 rounded-3xl shadow-soft max-w-md w-full border border-slate-100">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-navy text-golden rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-navy/20">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-navy">Acesso Administrativo</h2>
            <p className="text-slate-text mt-2">Gerencie sua agenda e serviços</p>
            <p className="text-xs text-slate-400 mt-2">(Admin: admin@pitstop.com / 123456)</p>
          </div>
          <form onSubmit={handleAdminLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-vivid-blue outline-none transition-all bg-slate-50"
                placeholder="admin@pitstop.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Senha</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-vivid-blue outline-none transition-all bg-slate-50"
                placeholder="••••••••"
              />
              {loginError && (
                <div className="flex items-center gap-2 text-red-500 text-sm mt-2 font-medium bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  {loginError}
                </div>
              )}
            </div>
            <Button type="submit" fullWidth isLoading={isLoggingIn} className="shadow-lg shadow-blue-500/30">
              Entrar no Painel
            </Button>
            
            <Button type="button" onClick={handleTestAccess} fullWidth variant="secondary" className="border-dashed border-2 border-slate-300 text-slate-500 hover:border-vivid-blue hover:text-vivid-blue bg-transparent">
              <FlaskConical className="w-4 h-4 mr-2" />
              Entrar sem Senha (Teste)
            </Button>

            <Button type="button" variant="ghost" onClick={() => setView(ViewState.HOME)} fullWidth>Voltar ao Início</Button>
          </form>
        </div>
      </div>
    );
  }

  if (view === ViewState.ADMIN_DASHBOARD) {
    return (
      <AdminDashboard 
        onLogout={handleLogout}
      />
    );
  }

  return <div>Error: Unknown View</div>;
};

export default App;