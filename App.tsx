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
  ExternalLink,
  Play,
  CheckSquare,
  ShoppingCart,
  ThermometerSun,
  SprayCan,
  Tag,
  Image as ImageIcon,
  Share2,
  Ticket,
  Percent,
  Moon
} from 'lucide-react';
import { ViewState, Service, Appointment, ClientHistory, DirtLevel, ExtraService, GalleryImage, Coupon, CashbackConfig } from './types';
import { Button } from './components/Button';
import { generateDailyBriefing } from './services/geminiService';
import { api } from './services/firebase';
import { SHOP_PHONE, APP_BASE_URL, DIRT_LEVEL_PRICES, UPSELL_EXTRAS, DEFAULT_CASHBACK_CONFIG, OPENING_HOUR, CLOSING_HOUR } from './constants';

// --- Helper Functions ---

const isShopOpen = () => {
  const now = new Date();
  const hour = now.getHours();
  return hour >= OPENING_HOUR && hour < CLOSING_HOUR;
};

const IconMap = {
  droplets: Droplets,
  sparkles: Sparkles,
  car: Car,
  clock: Clock
};

// --- Logic: Client History Aggregation ---
const aggregateClientHistory = (appointments: Appointment[], cashbackConfig: CashbackConfig): ClientHistory[] => {
  const clients: Record<string, ClientHistory> = {};
  const cbRate = cashbackConfig.enabled ? (cashbackConfig.percentage / 100) : 0;

  appointments.forEach(apt => {
    // Clean phone to use as key
    const phoneKey = apt.customerPhone.replace(/\D/g, '');
    if (!clients[phoneKey]) {
      clients[phoneKey] = {
        phone: apt.customerPhone,
        name: apt.customerName,
        totalVisits: 0,
        totalSpent: 0,
        availableCashback: 0,
        lastVisit: apt.date,
        lastService: apt.serviceName,
        vehicles: []
      };
    }
    
    const client = clients[phoneKey];
    client.totalVisits += 1;
    // Use price (final paid amount)
    client.totalSpent += apt.price; 
    
    // Accumulate informative cashback
    client.availableCashback += (apt.price * cbRate);

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

// --- View: Customer Booking (Check-in) ---

interface BookingFlowProps {
  onCancel: () => void;
  onSimulateCancellation: (id: string) => void;
  appointmentId?: string; 
}

const BookingFlow: React.FC<BookingFlowProps> = ({ onCancel, onSimulateCancellation, appointmentId: propAppointmentId }) => {
  // Steps: 1-Service, 2-Dirt, 3-Extras, 4-Details, 5-Success
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [services, setServices] = useState<Service[]>([]);
  
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [dirtLevel, setDirtLevel] = useState<DirtLevel>('Normal');
  const [selectedExtras, setSelectedExtras] = useState<ExtraService[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    model: '',
    plate: '',
    color: '',
    notes: '',
    paymentMethod: '' as 'Pix' | 'Débito' | 'Crédito' | ''
  });
  
  // Promotion State
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{code: string, discount: number} | null>(null);
  const [couponError, setCouponError] = useState('');
  const [cashbackConfig, setCashbackConfig] = useState<CashbackConfig>(DEFAULT_CASHBACK_CONFIG);

  const [appointmentId, setAppointmentId] = useState<string>(propAppointmentId || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Data
  useEffect(() => {
    const load = async () => {
      const s = await api.getServices();
      setServices(s.filter(service => service.active));
      const cb = await api.getCashbackConfig();
      setCashbackConfig(cb);
    };
    load();
  }, []);

  const priceBreakdown = useMemo(() => {
    if (!selectedService) return { subtotal: 0, discount: 0, total: 0, generatedCashback: 0 };
    
    const base = selectedService.price;
    const dirt = DIRT_LEVEL_PRICES[dirtLevel];
    const extras = selectedExtras.reduce((acc, curr) => acc + curr.price, 0);
    const subtotal = base + dirt + extras;
    
    const discount = appliedCoupon ? appliedCoupon.discount : 0;
    const total = Math.max(0, subtotal - discount);

    // Calculate informative cashback on the FINAL paid amount
    const generatedCashback = cashbackConfig.enabled ? (total * (cashbackConfig.percentage / 100)) : 0;

    return { subtotal, discount, total, generatedCashback };
  }, [selectedService, dirtLevel, selectedExtras, appliedCoupon, cashbackConfig]);

  const handleToggleExtra = (extra: ExtraService) => {
    if (selectedExtras.find(e => e.id === extra.id)) {
      setSelectedExtras(prev => prev.filter(e => e.id !== extra.id));
    } else {
      setSelectedExtras(prev => [...prev, extra]);
    }
  };

  const handleApplyCoupon = async () => {
    setCouponError('');
    if (!couponCode) return;
    
    // Preliminary total calculation
    const base = (selectedService?.price || 0) + DIRT_LEVEL_PRICES[dirtLevel] + selectedExtras.reduce((a,b) => a+b.price, 0);

    const result = await api.validateCoupon(couponCode, formData.phone, base);
    if (result.valid) {
       setAppliedCoupon({ code: couponCode.toUpperCase(), discount: result.discount });
    } else {
       setAppliedCoupon(null);
       setCouponError(result.message);
    }
  };

  const handleNextStep = () => {
    if (step === 1 && selectedService) setStep(2);
    else if (step === 2) setStep(3);
    else if (step === 3) setStep(4);
    else if (step === 4 && formData.name && formData.phone && formData.model && formData.paymentMethod) {
      handleFinalSubmit();
    }
  };

  const handleFinalSubmit = async () => {
    if (!isShopOpen()) {
      alert(`O Lava Rápido está fechado no momento. Nosso horário é das ${OPENING_HOUR}h às ${CLOSING_HOUR}h.`);
      onCancel();
      return;
    }

    if (selectedService && formData.name && formData.phone && formData.model) {
      setIsSubmitting(true);
      const now = new Date();
      const todayDate = now.toISOString().split('T')[0];
      const timeNow = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      // Append Coupon info to notes if used
      let finalNotes = formData.notes;
      if (appliedCoupon) {
        finalNotes = `(CUPOM: ${appliedCoupon.code} -R$${appliedCoupon.discount}) ${finalNotes}`;
      }

      const newId = await api.createAppointment({
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        price: priceBreakdown.total,
        originalPrice: priceBreakdown.subtotal,
        discountApplied: priceBreakdown.discount,
        couponCode: appliedCoupon?.code,
        generatedCashback: priceBreakdown.generatedCashback,

        date: todayDate,
        time: timeNow,
        durationMinutes: selectedService.durationMinutes,
        
        dirtLevel: dirtLevel,
        extras: selectedExtras.map(e => e.name),

        customerName: formData.name,
        customerPhone: formData.phone,
        vehicleModel: formData.model,
        vehiclePlate: formData.plate,
        vehicleColor: formData.color,
        paymentMethod: formData.paymentMethod as any,
        notes: finalNotes
      });
      setAppointmentId(newId);
      setIsSubmitting(false);
      setStep(5);
    }
  };

  const openWhatsApp = () => {
    if (!selectedService) return;
    
    let extrasText = selectedExtras.length > 0 
      ? selectedExtras.map(e => `+ ${e.name}`).join('\n')
      : 'Nenhum';

    const cancelLink = `${APP_BASE_URL}/?cancelId=${appointmentId}`;
    const cashbackStr = priceBreakdown.generatedCashback.toFixed(2).replace('.', ',');

    const message = `*PIT STOP LAVA CAR - NOVO PEDIDO 🚗*

*Cliente:* ${formData.name}
*Veículo:* ${formData.model}
*Cor:* ${formData.color || 'Não inf.'} | *Placa:* ${formData.plate || 'Não inf.'}

-----------------------------
*SERVIÇO:* ${selectedService.name}
*NÍVEL DE SUJEIRA:* ${dirtLevel}
*ADICIONAIS:*
${extrasText}
-----------------------------

*💰 FORMA DE PAGAMENTO:* ${formData.paymentMethod}

*Valor Original:* R$ ${priceBreakdown.subtotal},00
${appliedCoupon ? `*Desconto (${appliedCoupon.code}):* -R$ ${appliedCoupon.discount},00` : ''}
*VALOR FINAL:* R$ ${priceBreakdown.total},00

${cashbackConfig.enabled ? `💰 *Cashback disponível para próxima lavagem:* R$ ${cashbackStr}` : ''}

*📝 OBSERVAÇÕES:*
${formData.notes || 'Nenhuma'}

*Link de Cancelamento:*
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
          <div className="mb-2 text-right text-sm text-slate-500 font-medium">
            {secondaryText}
          </div>
        )}
        <Button onClick={onClick} disabled={disabled} fullWidth className="py-4 text-lg rounded-xl flex justify-between items-center px-6">
           <span>{text}</span>
           {step < 5 && selectedService && (
             <div className="text-right leading-tight">
               <span className="bg-white/20 px-2 py-1 rounded text-sm block">R$ {priceBreakdown.total}</span>
               {appliedCoupon && <span className="text-[10px] text-green-500 font-bold block">Cupom Aplicado</span>}
             </div>
           )}
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
          <h2 className="text-2xl font-bold text-navy">Check-in Realizado!</h2>
          <p className="text-slate-500">Você entrou na fila de espera.</p>
          
          <div className="bg-slate-50 p-4 rounded-xl text-left space-y-2 text-sm text-slate-600">
            <p><strong>Serviço:</strong> {selectedService?.name}</p>
            <p><strong>Veículo:</strong> {formData.model}</p>
            
            <div className="border-t border-slate-200 mt-2 pt-2 space-y-1">
              <div className="flex justify-between">
                 <span>Subtotal:</span>
                 <span>R$ {priceBreakdown.subtotal},00</span>
              </div>
              {appliedCoupon && (
                 <div className="flex justify-between text-green-600 font-bold">
                    <span>Desconto ({appliedCoupon.code}):</span>
                    <span>-R$ {appliedCoupon.discount},00</span>
                 </div>
              )}
              <div className="flex justify-between items-center text-lg font-bold text-vivid-blue pt-1 border-t border-slate-200">
                <strong>Total:</strong>
                <span>R$ {priceBreakdown.total},00</span>
              </div>
              {cashbackConfig.enabled && (
                <div className="bg-yellow-50 text-yellow-800 p-2 rounded-lg text-center font-bold text-xs mt-2 border border-yellow-200 flex items-center justify-center gap-1">
                   <Sparkles className="w-3 h-3" />
                   Cashback gerado: R$ {priceBreakdown.generatedCashback.toFixed(2)}
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-3 pt-2">
            <Button onClick={openWhatsApp} fullWidth className="bg-[#25D366] hover:bg-[#128C7E] text-white shadow-none border-0">
              <Phone className="w-4 h-4 mr-2" />
              Avisar Chegada no WhatsApp
            </Button>
            
            <Button onClick={onCancel} fullWidth variant="secondary">
              Voltar ao Início
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f2f2f2] pb-32 font-sans">
      
      {step === 1 && (
        <>
          <MobileHeader title="1. Escolha o Serviço" />
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
            secondaryText={selectedService ? "Próximo: Nível de Sujeira" : ""}
          />
        </>
      )}

      {step === 2 && (
        <>
           <MobileHeader title="2. Como está o carro?" />
           <div className="p-4 max-w-lg mx-auto space-y-4">
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <p className="text-slate-500 mb-4 text-center">Selecione o nível de sujeira para ajustarmos o tempo e produtos necessários.</p>
                <div className="grid grid-cols-1 gap-3">
                  {(['Normal', 'Sujo', 'Muito Sujo'] as DirtLevel[]).map((level) => {
                    const price = DIRT_LEVEL_PRICES[level];
                    const isSelected = dirtLevel === level;
                    return (
                      <button
                        key={level}
                        onClick={() => setDirtLevel(level)}
                        className={`p-4 rounded-xl border-2 flex items-center justify-between transition-all ${
                          isSelected 
                           ? 'border-vivid-blue bg-blue-50' 
                           : 'border-slate-100 hover:bg-slate-50'
                        }`}
                      >
                         <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                               isSelected ? 'bg-vivid-blue text-white' : 'bg-slate-200 text-slate-400'
                            }`}>
                               <ThermometerSun className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                              <p className={`font-bold ${isSelected ? 'text-navy' : 'text-slate-600'}`}>{level}</p>
                              <p className="text-xs text-slate-400">
                                {level === 'Normal' ? 'Sujeira do dia a dia' : 
                                 level === 'Sujo' ? 'Barro leve ou muita poeira' : 'Barro pesado, interior crítico'}
                              </p>
                            </div>
                         </div>
                         <div className="font-bold text-navy">
                           {price === 0 ? 'Sem custo' : `+ R$ ${price},00`}
                         </div>
                      </button>
                    )
                  })}
                </div>
              </div>
           </div>
           <StickyFooter 
            onClick={handleNextStep} 
            text="Continuar"
            secondaryText="Próximo: Adicionais"
          />
        </>
      )}

      {step === 3 && (
        <>
          <MobileHeader title="3. Turbinar Lavagem?" />
          <div className="p-4 max-w-lg mx-auto space-y-4">
            <div className="bg-gradient-to-r from-golden to-yellow-400 p-1 rounded-xl shadow-sm">
               <div className="bg-white p-4 rounded-lg flex items-center gap-3">
                 <Sparkles className="w-6 h-6 text-golden" />
                 <div>
                   <h3 className="font-bold text-navy">Produtos Premium</h3>
                   <p className="text-xs text-slate-500">Adicione brilho e proteção extra.</p>
                 </div>
               </div>
            </div>

            <div className="space-y-3">
               {UPSELL_EXTRAS.map(extra => {
                 const isSelected = selectedExtras.some(e => e.id === extra.id);
                 return (
                   <div 
                    key={extra.id}
                    onClick={() => handleToggleExtra(extra)}
                    className={`bg-white p-4 rounded-xl border-2 cursor-pointer transition-all flex justify-between items-center ${
                      isSelected ? 'border-golden shadow-md' : 'border-slate-100'
                    }`}
                   >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded border flex items-center justify-center ${
                          isSelected ? 'bg-golden border-golden text-navy' : 'border-slate-300'
                        }`}>
                          {isSelected && <Check className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="font-bold text-navy">{extra.name}</p>
                          <p className="text-xs text-slate-400">{extra.description}</p>
                        </div>
                      </div>
                      <span className="font-bold text-vivid-blue">+ R$ {extra.price}</span>
                   </div>
                 )
               })}
            </div>
          </div>
          <StickyFooter 
            onClick={handleNextStep} 
            text="Continuar"
            secondaryText={`Adicionais: R$ ${selectedExtras.reduce((a,b) => a + b.price, 0)}`}
          />
        </>
      )}

      {step === 4 && (
        <>
          <MobileHeader title="4. Finalizar Check-in" />
          <div className="p-4 max-w-lg mx-auto pb-24">
             {/* SECTION: CONTACT */}
             <div className="bg-white p-6 rounded-xl shadow-sm space-y-4 mb-4">
                <div className="flex items-center gap-2 text-navy font-bold border-b pb-2 mb-2">
                   <User className="w-5 h-5 text-vivid-blue" />
                   <h3>Seus Dados</h3>
                </div>
                <div className="grid gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo *</label>
                    <input 
                      type="text" 
                      placeholder="Seu nome"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-vivid-blue"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">WhatsApp *</label>
                    <input 
                      type="tel" 
                      placeholder="(11) 99999-9999"
                      className={`w-full p-3 bg-slate-50 border rounded-xl focus:outline-none focus:border-vivid-blue border-slate-200`}
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                </div>
             </div>

             {/* SECTION: VEHICLE */}
             <div className="bg-white p-6 rounded-xl shadow-sm space-y-4 mb-4">
                <div className="flex items-center gap-2 text-navy font-bold border-b pb-2 mb-2">
                   <Car className="w-5 h-5 text-vivid-blue" />
                   <h3>Dados do Veículo</h3>
                </div>
                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Modelo *</label>
                   <input 
                      type="text" 
                      placeholder="Ex: Chevrolet Onix"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-vivid-blue"
                      value={formData.model}
                      onChange={e => setFormData({...formData, model: e.target.value})}
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Placa (Opcional)</label>
                    <input 
                      type="text" 
                      placeholder="ABC-1234"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-vivid-blue"
                      value={formData.plate}
                      onChange={e => setFormData({...formData, plate: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cor (Opcional)</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Prata"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-vivid-blue"
                      value={formData.color}
                      onChange={e => setFormData({...formData, color: e.target.value})}
                    />
                  </div>
                </div>
             </div>

             {/* SECTION: PAYMENT */}
             <div className="bg-white p-6 rounded-xl shadow-sm space-y-4 mb-4">
               <div className="flex items-center gap-2 text-navy font-bold border-b pb-2 mb-2">
                   <Wallet className="w-5 h-5 text-vivid-blue" />
                   <h3>Forma de Pagamento *</h3>
                </div>
               <div className="grid grid-cols-3 gap-3">
                 {['Pix', 'Débito', 'Crédito'].map((method) => {
                   const isSelected = formData.paymentMethod === method;
                   return (
                     <button
                        key={method}
                        onClick={() => setFormData({...formData, paymentMethod: method as any})}
                        className={`py-3 px-2 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                          isSelected 
                            ? 'bg-blue-50 border-vivid-blue text-vivid-blue ring-2 ring-vivid-blue ring-offset-1' 
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                        }`}
                     >
                       {method === 'Pix' && <QrCode className="w-5 h-5" />}
                       {method === 'Débito' && <CreditCard className="w-5 h-5" />}
                       {method === 'Crédito' && <CreditCard className="w-5 h-5" />}
                       <span className="text-xs font-bold">{method}</span>
                     </button>
                   );
                 })}
               </div>
             </div>

             {/* SECTION: OBSERVATIONS */}
             <div className="bg-white p-6 rounded-xl shadow-sm space-y-4 mb-4">
                <div className="flex items-center gap-2 text-navy font-bold border-b pb-2 mb-2">
                   <FileText className="w-5 h-5 text-vivid-blue" />
                   <h3>Observações</h3>
                </div>
                <textarea 
                   placeholder="Ex: Cuidado com retrovisor, mancha no banco..."
                   className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-vivid-blue h-20 resize-none"
                   value={formData.notes}
                   onChange={e => setFormData({...formData, notes: e.target.value})}
                />
             </div>

             {/* SECTION: PROMOTION */}
             <div className="bg-white p-6 rounded-xl shadow-sm space-y-4 mb-4">
                <div className="flex items-center gap-2 text-navy font-bold border-b pb-2 mb-2">
                   <Ticket className="w-5 h-5 text-vivid-blue" />
                   <h3>Cupom de Desconto</h3>
                </div>
                <div className="flex gap-2">
                   <input 
                      type="text" 
                      placeholder="Código do Cupom"
                      className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-vivid-blue uppercase"
                      value={couponCode}
                      onChange={e => setCouponCode(e.target.value)}
                      disabled={!!appliedCoupon}
                   />
                   {appliedCoupon ? (
                     <Button variant="danger" onClick={() => { setAppliedCoupon(null); setCouponCode(''); }}>
                       Remover
                     </Button>
                   ) : (
                     <Button variant="secondary" onClick={handleApplyCoupon}>
                       Aplicar
                     </Button>
                   )}
                </div>
                {couponError && <p className="text-red-500 text-xs font-bold">{couponError}</p>}
                {appliedCoupon && <p className="text-green-500 text-xs font-bold flex items-center gap-1"><Check className="w-3 h-3"/> Desconto de R$ {appliedCoupon.discount} aplicado!</p>}
             </div>


             {/* SECTION: SUMMARY */}
             <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
               <h3 className="font-bold text-navy mb-2 flex items-center gap-2">
                 <ShoppingCart className="w-4 h-4" /> Resumo
               </h3>
               <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex justify-between">
                    <span>{selectedService?.name}</span>
                    <span>R$ {selectedService?.price}</span>
                  </div>
                  {dirtLevel !== 'Normal' && (
                    <div className="flex justify-between text-orange-600">
                      <span>Nível: {dirtLevel}</span>
                      <span>+ R$ {DIRT_LEVEL_PRICES[dirtLevel]}</span>
                    </div>
                  )}
                  {selectedExtras.map(ex => (
                    <div key={ex.id} className="flex justify-between text-blue-600">
                      <span>{ex.name}</span>
                      <span>+ R$ {ex.price}</span>
                    </div>
                  ))}
                  
                  {appliedCoupon && (
                    <div className="flex justify-between text-green-600 font-bold border-t border-slate-100 pt-1 mt-1">
                       <span>Desconto ({appliedCoupon.code})</span>
                       <span>- R$ {appliedCoupon.discount}</span>
                    </div>
                  )}

                  <div className="border-t pt-2 flex justify-between font-bold text-lg text-navy">
                    <span>Total</span>
                    <span>R$ {priceBreakdown.total}</span>
                  </div>
               </div>
             </div>

          </div>
          <StickyFooter 
            onClick={handleFinalSubmit} 
            disabled={!formData.name || !formData.phone || !formData.model || !formData.paymentMethod || isSubmitting} 
            text={isSubmitting ? "Enviando..." : "Confirmar Check-in"} 
          />
        </>
      )}

    </div>
  );
};

// --- View: Gallery ---

const GalleryView: React.FC<{ onBack: () => void; onBook: () => void }> = ({ onBack, onBook }) => {
  const [images, setImages] = useState<GalleryImage[]>([]);

  useEffect(() => {
    const load = async () => {
      const imgs = await api.getGallery();
      setImages(imgs);
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      <div className="bg-navy p-4 text-center sticky top-0 z-20 shadow-md flex items-center justify-between">
        <button onClick={onBack} className="text-white opacity-80 hover:opacity-100">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-white font-medium text-lg">Nossos Resultados</h2>
        <div className="w-6"></div>
      </div>

      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
        {images.length === 0 ? (
           <div className="col-span-full text-center py-20 text-slate-400">
             <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
             <p>Nenhuma foto na galeria ainda.</p>
           </div>
        ) : (
          images.map(img => (
            <div key={img.id} className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100 group">
              <div className="aspect-[4/3] overflow-hidden relative">
                <img src={img.url} alt={img.caption || 'Trabalho realizado'} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                   <p className="text-white font-medium text-sm">{img.caption}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-20 text-center">
        <Button onClick={onBook} fullWidth variant="primary" className="py-4 text-lg" disabled={!isShopOpen()}>
           {isShopOpen() ? 'Agendar Meu Carro Agora' : 'Lava Rápido Fechado'}
        </Button>
      </div>
    </div>
  );
};

// --- View: Admin Dashboard ---

interface AdminDashboardProps {
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'queue' | 'services' | 'clients' | 'gallery' | 'promotions'>('queue');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [aiBriefing, setAiBriefing] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]); // Current Queue
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]); // For history
  const [clientHistory, setClientHistory] = useState<ClientHistory[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);

  // Promotion State
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [cashbackConfig, setCashbackConfig] = useState<CashbackConfig>(DEFAULT_CASHBACK_CONFIG);
  const [newCoupon, setNewCoupon] = useState<{
    code: string;
    type: 'percent' | 'fixed';
    value: string;
    firstTimeOnly: boolean;
    expirationDate: string;
  }>({ code: '', type: 'percent', value: '10', firstTimeOnly: false, expirationDate: '2025-12-31' });

  // Add/Edit Service State
  const [isAddingService, setIsAddingService] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newService, setNewService] = useState<{
    name: string;
    price: string;
    durationMinutes: string;
    description: string;
    icon: 'droplets' | 'sparkles' | 'car' | 'clock';
  }>({
    name: '',
    price: '',
    durationMinutes: '',
    description: '',
    icon: 'car'
  });

  // Gallery Add State
  const [newImage, setNewImage] = useState({ url: '', caption: '' });
  const [isAddingImage, setIsAddingImage] = useState(false);

  // Marketing State
  const [showMarketingModal, setShowMarketingModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [marketingMessage, setMarketingMessage] = useState('Olá {nome}, o Pit Stop Lava Car está vazio! Venha agora e seja atendido na hora.');
  const [targetClient, setTargetClient] = useState<ClientHistory | null>(null);

  // Load Data
  const loadData = async () => {
    const s = await api.getServices();
    setServices(s);
    
    // Fetch appointments for selected date (Queue view)
    const dailyApts = await api.getAppointments(selectedDate);
    setAppointments(dailyApts);
    
    // Fetch ALL for history
    const all = await api.getAppointments(); 
    setAllAppointments(all);

    // Fetch config for calculation
    const cbConfig = await api.getCashbackConfig();
    setCashbackConfig(cbConfig);

    const clients = aggregateClientHistory(all, cbConfig);
    setClientHistory(clients);

    // Gallery
    if (activeTab === 'gallery') {
       const imgs = await api.getGallery();
       setGalleryImages(imgs);
    }

    // Promotions
    if (activeTab === 'promotions') {
      const cps = await api.getCoupons();
      setCoupons(cps);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate, activeTab]);

  const queueItems = useMemo(() => {
    // Sort by arrival time
    return appointments.sort((a, b) => a.time.localeCompare(b.time));
  }, [appointments]);

  const handleAiBriefing = async () => {
    setIsAiLoading(true);
    setAiBriefing('');
    const summary = await generateDailyBriefing(selectedDate, queueItems, services);
    setAiBriefing(summary);
    setIsAiLoading(false);
  };

  const updateStatus = async (id: string, newStatus: Appointment['status']) => {
    const apt = appointments.find(a => a.id === id);
    if(apt) {
      // Optimistic update - in real app would sync to FB
      const updated = appointments.map(a => a.id === id ? {...a, status: newStatus} : a);
      setAppointments(updated);
      loadData(); 
    }
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newService.name || !newService.price) return;
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

  // Gallery Actions
  const handleAddImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newImage.url) return;
    await api.addGalleryImage(newImage.url, newImage.caption);
    setNewImage({ url: '', caption: '' });
    setIsAddingImage(false);
    loadData();
  };

  const handleDeleteImage = async (id: string) => {
    if(confirm("Remover esta imagem?")) {
      await api.deleteGalleryImage(id);
      loadData();
    }
  };

  // Promotion Actions
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!newCoupon.code || !newCoupon.value) return;
    
    await api.addCoupon({
      code: newCoupon.code.toUpperCase(),
      type: newCoupon.type,
      value: Number(newCoupon.value),
      firstTimeOnly: newCoupon.firstTimeOnly,
      expirationDate: newCoupon.expirationDate,
      active: true
    });
    setNewCoupon({ code: '', type: 'percent', value: '10', firstTimeOnly: false, expirationDate: '2025-12-31' });
    loadData();
  };

  const handleDeleteCoupon = async (id: string) => {
    if(confirm("Excluir cupom permanentemente?")) {
      await api.deleteCoupon(id);
      loadData();
    }
  };
  
  const handleUpdateCashback = async () => {
    await api.updateCashbackConfig(cashbackConfig);
    alert('Configurações de Cashback salvas!');
    loadData();
  };


  const handleOpenMarketing = (client: ClientHistory | null = null) => {
    setTargetClient(client);
    setShowMarketingModal(true);
  };

  const getWhatsappLink = (client: ClientHistory, messageTemplate: string) => {
    let phone = client.phone.replace(/\D/g, '');
    if (!phone.startsWith('55')) phone = '55' + phone; 
    const firstName = client.name.split(' ')[0];
    const message = messageTemplate.replace('{nome}', firstName);
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  const copyAllNumbers = () => {
    const numbers = clientHistory.map(c => c.phone.replace(/\D/g, '')).join(',');
    navigator.clipboard.writeText(numbers);
    alert(`${clientHistory.length} números copiados!`);
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
        {/* Operating Hours Info */}
        <div className="mb-6 flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-100">
           <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full animate-pulse ${isShopOpen() ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm font-bold text-navy">
                 {isShopOpen() ? 'Pista Aberta' : 'Pista Fechada'} (Horário de Atendimento: {OPENING_HOUR}h - {CLOSING_HOUR}h)
              </span>
           </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-8 bg-white p-1 rounded-xl shadow-sm border border-slate-100 w-fit">
          <button onClick={() => setActiveTab('queue')} className={`px-4 sm:px-6 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${activeTab === 'queue' ? 'bg-navy text-white shadow-md' : 'text-slate-500 hover:text-navy hover:bg-slate-50'}`}>
            <LayoutDashboard className="w-4 h-4" /> Fila
          </button>
          <button onClick={() => setActiveTab('clients')} className={`px-4 sm:px-6 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${activeTab === 'clients' ? 'bg-navy text-white shadow-md' : 'text-slate-500 hover:text-navy hover:bg-slate-50'}`}>
            <User className="w-4 h-4" /> Clientes
          </button>
          <button onClick={() => setActiveTab('promotions')} className={`px-4 sm:px-6 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${activeTab === 'promotions' ? 'bg-navy text-white shadow-md' : 'text-slate-500 hover:text-navy hover:bg-slate-50'}`}>
            <Tag className="w-4 h-4" /> Promoções
          </button>
          <button onClick={() => setActiveTab('services')} className={`px-4 sm:px-6 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${activeTab === 'services' ? 'bg-navy text-white shadow-md' : 'text-slate-500 hover:text-navy hover:bg-slate-50'}`}>
            <Car className="w-4 h-4" /> Serviços
          </button>
          <button onClick={() => setActiveTab('gallery')} className={`px-4 sm:px-6 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${activeTab === 'gallery' ? 'bg-navy text-white shadow-md' : 'text-slate-500 hover:text-navy hover:bg-slate-50'}`}>
            <ImageIcon className="w-4 h-4" /> Galeria
          </button>
        </div>

        {activeTab === 'queue' && (
          <div className="grid lg:grid-cols-3 gap-6 animate-fade-in">
            <div className="space-y-6">
              {/* Controls */}
              <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100">
                <label className="block text-sm font-semibold text-navy mb-3">Data do Movimento</label>
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

              {/* AI Briefing */}
              <div className="bg-gradient-to-br from-navy to-[#0A2A4D] text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-vivid-blue rounded-full blur-[60px] opacity-20"></div>
                <div className="flex items-center gap-2 mb-4 relative z-10">
                  <div className="p-2 bg-white/10 rounded-lg">
                    <Bot className="w-5 h-5 text-golden" />
                  </div>
                  <h3 className="font-bold">Resumo do Fluxo</h3>
                </div>
                {aiBriefing ? (
                  <div className="bg-white/5 p-4 rounded-xl text-sm leading-relaxed mb-4 backdrop-blur-md border border-white/10 animate-fade-in text-slate-200">
                    <div className="whitespace-pre-line">{aiBriefing}</div>
                  </div>
                ) : (
                  <p className="text-slate-300 text-sm mb-6 relative z-10">
                    Análise da fila, tempo de espera e sugestões operacionais.
                  </p>
                )}
                <Button onClick={handleAiBriefing} isLoading={isAiLoading} variant="golden" fullWidth className="relative z-10 font-bold">
                   {aiBriefing ? 'Atualizar' : 'Gerar Análise'}
                </Button>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center mb-2">
                 <h2 className="text-xl font-bold text-navy flex items-center gap-2">
                  Fila de Espera
                  <span className="bg-vivid-blue text-white text-xs px-2 py-1 rounded-full">{queueItems.length}</span>
                </h2>
              </div>
              
              {queueItems.length === 0 ? (
                <div className="bg-white p-16 rounded-2xl text-center border-2 border-dashed border-slate-200">
                  <Car className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p className="text-slate-500 font-medium">Fila vazia. O movimento está livre!</p>
                </div>
              ) : (
                queueItems.map(apt => (
                  <div key={apt.id} className={`bg-white p-5 rounded-2xl shadow-soft border border-slate-100 flex flex-col sm:flex-row gap-5 items-start sm:items-center ${apt.status === 'in_progress' ? 'border-l-4 border-l-golden bg-yellow-50/30' : ''}`}>
                    <div className="flex items-start gap-4 flex-1 w-full">
                      <div className="text-navy font-bold px-4 py-3 rounded-xl text-xl min-w-[90px] text-center border border-slate-100 bg-slate-50 flex flex-col items-center justify-center">
                        {apt.time}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-navy text-lg">{apt.customerName}</h4>
                          <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                            apt.status === 'waiting' ? 'bg-slate-200 text-slate-600' :
                            apt.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {apt.status === 'waiting' ? 'Na Fila' : 
                             apt.status === 'in_progress' ? 'Lavando' : 'Pronto'}
                          </span>
                        </div>
                        <p className="text-slate-text flex items-center gap-2 mt-1">
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide text-slate-600">{apt.vehicleModel}</span>
                          {apt.vehicleColor && <span className="text-xs text-slate-400">({apt.vehicleColor})</span>}
                          {apt.vehiclePlate && <span className="text-xs font-mono bg-slate-100 px-1 rounded text-slate-500 ml-1">{apt.vehiclePlate}</span>}
                        </p>
                        
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                           {/* Base Service */}
                           <span className="text-xs bg-blue-50 text-vivid-blue px-2 py-1 rounded font-bold border border-blue-100">
                              {apt.serviceName}
                           </span>

                           {/* Coupon */}
                           {apt.couponCode && (
                              <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded font-bold border border-green-100 flex items-center gap-1">
                                <Ticket className="w-3 h-3" /> {apt.couponCode}
                              </span>
                           )}

                           {/* Dirt Level */}
                           {apt.dirtLevel !== 'Normal' && (
                             <span className="text-xs bg-orange-50 text-orange-600 px-2 py-1 rounded font-bold border border-orange-100 flex items-center gap-1">
                                <ThermometerSun className="w-3 h-3" /> {apt.dirtLevel}
                             </span>
                           )}
                           
                           {/* Payment Method */}
                           {apt.paymentMethod && (
                              <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded font-bold border border-green-100 flex items-center gap-1">
                                <Wallet className="w-3 h-3" /> {apt.paymentMethod}
                              </span>
                           )}

                           <div className="ml-auto text-right">
                             {apt.discountApplied ? (
                               <>
                                <span className="text-xs text-red-400 line-through mr-2">R$ {apt.originalPrice},00</span>
                                <span className="text-sm font-bold text-navy">R$ {apt.price},00</span>
                               </>
                             ) : (
                                <span className="text-sm font-bold text-navy">R$ {apt.price},00</span>
                             )}
                           </div>
                        </div>
                        
                        {/* Notes */}
                        {apt.notes && (
                           <div className="mt-2 text-xs bg-yellow-50 text-yellow-800 p-2 rounded border border-yellow-100 flex gap-2">
                              <AlertCircle className="w-4 h-4 shrink-0" />
                              <span className="font-medium">{apt.notes}</span>
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

        {/* Promotions Tab */}
        {activeTab === 'promotions' && (
          <div className="grid lg:grid-cols-2 gap-6 animate-fade-in">
             {/* Cashback Settings */}
             <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100">
               <div className="flex items-center gap-3 mb-4 border-b pb-2">
                 <Sparkles className="w-5 h-5 text-golden" />
                 <h3 className="font-bold text-navy">Configurar Cashback</h3>
               </div>
               <div className="space-y-4">
                 <div className="flex items-center justify-between">
                   <span className="text-sm font-medium text-slate-600">Ativar Cashback</span>
                   <button 
                    onClick={() => setCashbackConfig(c => ({...c, enabled: !c.enabled}))}
                    className={`w-12 h-6 rounded-full transition-colors relative ${cashbackConfig.enabled ? 'bg-green-500' : 'bg-slate-300'}`}
                   >
                     <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${cashbackConfig.enabled ? 'translate-x-6' : ''}`} />
                   </button>
                 </div>
                 <div>
                   <label className="text-xs font-bold text-navy uppercase mb-1 block">Porcentagem (%)</label>
                   <input 
                      type="number" 
                      className="w-full p-3 border rounded-lg bg-slate-50"
                      value={cashbackConfig.percentage}
                      onChange={e => setCashbackConfig(c => ({...c, percentage: Number(e.target.value)}))}
                   />
                 </div>
                 <Button onClick={handleUpdateCashback} fullWidth variant="primary">Salvar Configuração</Button>
               </div>
             </div>

             {/* Create Coupon */}
             <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100">
                <div className="flex items-center gap-3 mb-4 border-b pb-2">
                 <Ticket className="w-5 h-5 text-vivid-blue" />
                 <h3 className="font-bold text-navy">Novo Cupom</h3>
               </div>
               <form onSubmit={handleCreateCoupon} className="space-y-3">
                 <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-navy uppercase mb-1 block">Código</label>
                      <input 
                        className="w-full p-2 border rounded-lg bg-slate-50 uppercase" 
                        placeholder="EX: NATAL10" 
                        value={newCoupon.code} 
                        onChange={e => setNewCoupon({...newCoupon, code: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-navy uppercase mb-1 block">Validade</label>
                      <input 
                        type="date"
                        className="w-full p-2 border rounded-lg bg-slate-50" 
                        value={newCoupon.expirationDate} 
                        onChange={e => setNewCoupon({...newCoupon, expirationDate: e.target.value})}
                      />
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-navy uppercase mb-1 block">Tipo</label>
                      <select 
                        className="w-full p-2 border rounded-lg bg-slate-50"
                        value={newCoupon.type}
                        onChange={e => setNewCoupon({...newCoupon, type: e.target.value as any})}
                      >
                        <option value="percent">Porcentagem (%)</option>
                        <option value="fixed">Valor Fixo (R$)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-navy uppercase mb-1 block">Valor</label>
                      <input 
                        type="number"
                        className="w-full p-2 border rounded-lg bg-slate-50" 
                        value={newCoupon.value} 
                        onChange={e => setNewCoupon({...newCoupon, value: e.target.value})}
                      />
                    </div>
                 </div>
                 <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="firstTime"
                      checked={newCoupon.firstTimeOnly}
                      onChange={e => setNewCoupon({...newCoupon, firstTimeOnly: e.target.checked})}
                      className="w-4 h-4 text-vivid-blue"
                    />
                    <label htmlFor="firstTime" className="text-sm text-slate-600">Apenas 1ª Visita (Validação por Telefone)</label>
                 </div>
                 <Button type="submit" fullWidth>Criar Cupom</Button>
               </form>
             </div>

             {/* Coupon List */}
             <div className="lg:col-span-2 bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden">
                <div className="p-4 border-b bg-slate-50">
                   <h3 className="font-bold text-navy">Cupons Ativos</h3>
                </div>
                <div className="overflow-x-auto">
                   <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-400 uppercase text-xs">
                         <tr>
                            <th className="p-4">Código</th>
                            <th className="p-4">Desconto</th>
                            <th className="p-4">Regra</th>
                            <th className="p-4">Validade</th>
                            <th className="p-4 text-center">Ações</th>
                         </tr>
                      </thead>
                      <tbody>
                         {coupons.map(coupon => (
                            <tr key={coupon.id} className="border-b hover:bg-slate-50">
                               <td className="p-4 font-bold text-navy">{coupon.code}</td>
                               <td className="p-4">
                                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">
                                    {coupon.type === 'percent' ? `${coupon.value}% OFF` : `R$ ${coupon.value} OFF`}
                                  </span>
                               </td>
                               <td className="p-4 text-slate-500">
                                  {coupon.firstTimeOnly ? 'Apenas 1ª Visita' : 'Todos'}
                               </td>
                               <td className="p-4 text-slate-500">{coupon.expirationDate.split('-').reverse().join('/')}</td>
                               <td className="p-4 text-center">
                                  <button onClick={() => handleDeleteCoupon(coupon.id)} className="text-red-500 hover:bg-red-50 p-2 rounded">
                                     <Trash2 className="w-4 h-4" />
                                  </button>
                               </td>
                            </tr>
                         ))}
                         {coupons.length === 0 && (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-400">Nenhum cupom criado</td></tr>
                         )}
                      </tbody>
                   </table>
                </div>
             </div>
          </div>
        )}

        {/* Clients Tab */}
        {activeTab === 'clients' && (
          <div className="space-y-6">
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
                          <label className="text-xs font-bold text-navy uppercase mb-1 block">Mensagem</label>
                          <textarea 
                            className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none h-32 text-sm bg-slate-50"
                            value={marketingMessage}
                            onChange={(e) => setMarketingMessage(e.target.value)}
                          />
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
                                <h4 className="font-bold text-yellow-800 text-sm">Envio em Massa</h4>
                                <button onClick={copyAllNumbers} className="mt-3 bg-white border border-yellow-200 text-yellow-800 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-yellow-100 transition-colors">
                                  <Copy className="w-4 h-4" /> Copiar Todos os Números
                                </button>
                             </div>
                             <div>
                               <h4 className="font-bold text-navy text-sm mb-3">Envio Individual:</h4>
                               <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                                  {clientHistory.map((client, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-100 group">
                                       <div className="flex-1">
                                          <p className="font-bold text-navy text-sm">{client.name}</p>
                                          <p className="text-xs text-slate-400">{client.phone}</p>
                                       </div>
                                       <a href={getWhatsappLink(client, marketingMessage)} target="_blank" rel="noopener noreferrer" className="text-slate-300 group-hover:text-green-500 p-2 rounded-full hover:bg-green-50 transition-colors">
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

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                 <Button onClick={() => setShowQrModal(true)} variant="secondary" className="shadow-sm">
                   <QrCode className="w-4 h-4 mr-2" /> QR do App
                 </Button>
                 {showQrModal && (
                   <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/80 backdrop-blur-sm animate-fade-in" onClick={() => setShowQrModal(false)}>
                      <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
                         <h3 className="text-xl font-bold text-navy mb-4">Escaneie para Agendar</h3>
                         <div className="bg-white p-2 rounded-xl inline-block shadow-inner mb-4 border border-slate-100">
                           <img 
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(APP_BASE_URL)}`} 
                              alt="QR Code"
                              className="w-48 h-48"
                            />
                         </div>
                         <p className="text-sm text-slate-500 mb-6">Compartilhe este código com seus clientes para que eles agendem sozinhos.</p>
                         <Button onClick={() => setShowQrModal(false)} fullWidth>Fechar</Button>
                      </div>
                   </div>
                 )}
              </div>
              <Button onClick={() => handleOpenMarketing(null)} variant="golden" className="shadow-lg">
                <Megaphone className="w-4 h-4 mr-2" /> Criar Campanha
              </Button>
            </div>

            <div className="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden animate-fade-in mt-4">
              <div className="p-6 border-b border-slate-100 bg-slate-50">
                <h2 className="text-lg font-bold text-navy flex items-center gap-2">
                  <History className="w-5 h-5 text-vivid-blue" />
                  Base de Clientes e Cashback
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white text-xs uppercase text-slate-400 font-bold border-b border-slate-100">
                      <th className="px-6 py-4">Cliente</th>
                      <th className="px-6 py-4 text-center">Visitas</th>
                      <th className="px-6 py-4 text-right">Total Gasto</th>
                      <th className="px-6 py-4 text-right text-green-600">Cashback Disp. ({cashbackConfig.percentage}%)</th>
                      <th className="px-6 py-4 text-center">Ações</th>
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
                        <td className="px-6 py-4 text-right font-medium">
                          R$ {client.totalSpent},00
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-green-600">
                           R$ {client.availableCashback.toFixed(2).replace('.', ',')}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button onClick={() => handleOpenMarketing(client)} className="inline-flex items-center justify-center p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors">
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Gallery Tab */}
        {activeTab === 'gallery' && (
           <div className="space-y-6">
              {isAddingImage ? (
                 <div className="bg-white p-6 rounded-2xl shadow-soft border border-vivid-blue animate-fade-in">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-navy">Adicionar Nova Imagem</h3>
                      <button onClick={() => setIsAddingImage(false)} className="text-slate-400 hover:text-red-500"><X /></button>
                    </div>
                    <form onSubmit={handleAddImage} className="grid gap-4">
                       <div>
                         <label className="text-xs font-bold text-navy uppercase">URL da Imagem</label>
                         <input className="w-full p-3 border rounded-lg bg-slate-50" placeholder="https://..." value={newImage.url} onChange={e => setNewImage({...newImage, url: e.target.value})} required />
                         <p className="text-xs text-slate-400 mt-1">Copie o endereço da imagem e cole aqui.</p>
                       </div>
                       <div>
                         <label className="text-xs font-bold text-navy uppercase">Legenda (Opcional)</label>
                         <input className="w-full p-3 border rounded-lg bg-slate-50" placeholder="Ex: Polimento em Honda Civic" value={newImage.caption} onChange={e => setNewImage({...newImage, caption: e.target.value})} />
                       </div>
                       <Button fullWidth>Salvar na Galeria</Button>
                    </form>
                 </div>
              ) : (
                <button onClick={() => setIsAddingImage(true)} className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center gap-2 text-slate-500 hover:border-vivid-blue hover:text-vivid-blue hover:bg-blue-50 transition-all font-semibold">
                  <Plus className="w-5 h-5" /> Adicionar Foto à Galeria
                </button>
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                 {galleryImages.map(img => (
                   <div key={img.id} className="relative group rounded-xl overflow-hidden bg-white shadow-sm border border-slate-100">
                      <img src={img.url} alt="Gallery" className="w-full h-48 object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                         <p className="text-white text-xs font-medium mb-2">{img.caption}</p>
                         <button onClick={() => handleDeleteImage(img.id)} className="bg-red-500 text-white p-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-red-600">
                           <Trash2 className="w-3 h-3" /> Excluir
                         </button>
                      </div>
                   </div>
                 ))}
                 {galleryImages.length === 0 && !isAddingImage && (
                    <div className="col-span-full text-center py-10 text-slate-400">
                       <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
                       <p>Galeria vazia.</p>
                    </div>
                 )}
              </div>
           </div>
        )}

        {/* Services Tab */}
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
                <button onClick={() => setIsAddingService(true)} className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center gap-2 text-slate-500 hover:border-vivid-blue hover:text-vivid-blue hover:bg-blue-50 transition-all font-semibold">
                  <Plus className="w-5 h-5" /> Adicionar Novo Serviço
                </button>
             )}

             <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {services.map(service => (
                  <div key={service.id} className={`bg-white p-6 rounded-2xl shadow-soft border relative group transition-all duration-300 ${!service.active ? 'opacity-60 border-slate-200' : 'border-slate-100 hover:-translate-y-1'}`}>
                    <div className="absolute top-4 right-4 flex gap-2">
                      <button onClick={() => handleEditService(service)} className="text-slate-300 hover:text-vivid-blue hover:bg-blue-50 p-2 rounded-lg transition-colors">
                         <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleToggleService(service)} className={`p-2 rounded-lg transition-colors ${service.active ? 'text-green-500 bg-green-50' : 'text-slate-400 bg-slate-100'}`}>
                        <Power className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteService(service.id)} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">
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
                  </div>
                ))}
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

// --- Landing Page ---

interface LandingPageProps {
  onStartBooking: () => void;
  onAdminLogin: () => void;
  onOpenGallery: () => void;
  logoUrl: string;
}

const LandingPage: React.FC<LandingPageProps> = ({ 
  onStartBooking, 
  onAdminLogin, 
  onOpenGallery, 
  logoUrl 
}) => {
  const isOpen = isShopOpen();

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      <div className="bg-navy text-white relative overflow-hidden flex-1 flex flex-col items-center justify-center p-6 text-center min-h-[60vh]">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-[radial-gradient(circle,rgba(255,255,255,0.8)_0%,transparent_60%)]"></div>
        </div>
        
        <div className="z-10 max-w-md w-full space-y-8 animate-fade-in">
          <div className="w-32 h-32 bg-white rounded-3xl mx-auto shadow-2xl flex items-center justify-center overflow-hidden p-2 relative">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <Car className="w-16 h-16 text-navy" />
            )}
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-center mb-4">
               <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm border ${
                 isOpen ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'
               }`}>
                  <div className={`w-2 h-2 rounded-full ${isOpen ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                  {isOpen ? 'Aberto Agora' : 'Fechado no Momento'}
               </span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight">Pit Stop <span className="text-golden">Lava Car</span></h1>
            <p className="text-slate-300 text-lg">Seu carro novo de novo.</p>
          </div>

          <div className="space-y-4 pt-4">
            <Button onClick={onStartBooking} fullWidth variant="primary" className={`py-4 text-lg shadow-blue-500/25 ${!isOpen ? 'opacity-70 grayscale' : ''}`} disabled={!isOpen}>
              {isOpen ? 'Entrar na Fila' : 'Fila Fechada'}
            </Button>
            {!isOpen && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-3 text-red-300 text-sm justify-center">
                 <Moon className="w-4 h-4" />
                 Atendemos das {OPENING_HOUR}h às {CLOSING_HOUR}h
              </div>
            )}
            <Button onClick={onOpenGallery} fullWidth variant="secondary" className="py-4 text-lg bg-white/10 text-white border-white/20 hover:bg-white/20">
              <ImageIcon className="w-5 h-5 mr-2" /> Ver Resultados
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
            <Clock className="w-8 h-8 text-vivid-blue mx-auto mb-2" />
            <h3 className="font-bold text-navy">Rápido</h3>
            <p className="text-xs text-slate-500">Sem agendamento prévio</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
            <Sparkles className="w-8 h-8 text-golden mx-auto mb-2" />
            <h3 className="font-bold text-navy">Qualidade</h3>
            <p className="text-xs text-slate-500">Produtos de 1ª linha</p>
          </div>
        </div>

        <div className="text-center pt-8 pb-4">
          <button 
            onClick={onAdminLogin}
            className="text-slate-400 text-sm font-medium hover:text-navy flex items-center justify-center gap-2 mx-auto transition-colors"
          >
            <ShieldCheck className="w-4 h-4" /> Área do Proprietário
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.HOME);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [cancellationId, setCancellationId] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cancelId = params.get('cancelId');
    if (cancelId) {
      setCancellationId(cancelId);
      setView(ViewState.CANCELLATION);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = api.onAuthStateChanged((user) => {
      if (user) {
        setView(ViewState.ADMIN_DASHBOARD);
      }
      setIsAuthChecking(false);
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
    setEmail('admin@pitstop.com');
    setPassword('123456');
    setIsLoggingIn(true);
    api.login('admin@pitstop.com', '123456')
      .then(() => setView(ViewState.ADMIN_DASHBOARD))
      .catch(() => setView(ViewState.ADMIN_DASHBOARD))
      .finally(() => setIsLoggingIn(false));
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

  if (isAuthChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f2f2f2]">
        <div className="w-12 h-12 border-4 border-vivid-blue border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (view === ViewState.HOME) {
    return (
      <LandingPage 
        onStartBooking={() => setView(ViewState.BOOKING)} 
        onAdminLogin={() => setView(ViewState.ADMIN_LOGIN)} 
        onOpenGallery={() => setView(ViewState.GALLERY)}
        logoUrl={logoUrl} 
      />
    );
  }

  if (view === ViewState.GALLERY) {
    return (
      <GalleryView 
        onBack={() => setView(ViewState.HOME)}
        onBook={() => setView(ViewState.BOOKING)}
      />
    );
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
      <div className="min-h-screen bg-[#f2f2f2] flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-3xl shadow-sm text-center max-w-sm w-full">
             <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
               <X className="w-8 h-8 text-red-500" />
             </div>
             <h2 className="text-xl font-bold text-navy mb-2">Sair da Fila?</h2>
             <p className="text-slate-500 text-sm mb-6">Para cancelar sua posição, entre em contato via WhatsApp.</p>
             <Button onClick={() => setView(ViewState.HOME)} fullWidth variant="secondary">Voltar</Button>
          </div>
      </div>
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
            <p className="text-slate-text mt-2">Gerencie sua fila e serviços</p>
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