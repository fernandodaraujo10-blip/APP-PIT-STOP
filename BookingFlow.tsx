
import React, { useState, useMemo, useEffect } from 'react';
import {
  Clock, Calendar, Sparkles, X, ChevronLeft, Check, AlertCircle,
  CheckCircle, Banknote, QrCode, CreditCard, Percent, CheckSquare, Square, ThermometerSun, ShieldCheck
} from 'lucide-react';
import { Service, DirtLevel, ExtraService, ViewState } from './types';
import { Button } from './components/Button';
import { api } from './services/firebase';
import { useApp } from './AppContext';
import {
  SHOP_PHONE,
  DIRT_LEVEL_PRICES,
  DIRT_LEVELS,
  UPSELL_EXTRAS
} from './constants';
import { formatPhone } from './utils/validation';

// --- Helper Functions ---

const getAvailableTimeSlots = (dateStr: string, opening: number, closing: number, lockHours: number) => {
  const slots: string[] = [];
  const now = new Date();

  for (let h = opening; h < closing; h++) {
    for (let m of ['00', '30']) {
      const timeStr = `${h.toString().padStart(2, '0')}:${m}`;
      const slotTime = new Date(`${dateStr}T${timeStr}`);
      const lockTime = new Date(now.getTime() + lockHours * 60 * 60 * 1000);

      if (slotTime <= lockTime) continue;
      slots.push(timeStr);
    }
  }
  return slots;
};

const getNext7Days = () => {
  const days = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(now.getDate() + i);
    days.push({
      dateStr: d.toISOString().split('T')[0],
      dayName: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
      dayNum: d.getDate(),
      fullLabel: d.toLocaleDateString('pt-BR')
    });
  }
  return days;
};

interface BookingFlowProps {
  onCancel: () => void;
}

export const BookingFlow: React.FC<BookingFlowProps> = ({ onCancel }) => {
  const { services, settings, cashback, createAppointment } = useApp();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState('');
  const [dirtLevel, setDirtLevel] = useState<DirtLevel>('Normal');
  const [selectedExtras, setSelectedExtras] = useState<ExtraService[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    model: '',
    paymentMethod: '' as any,
    agreedToTerms: false
  });
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ discount: number; code: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const next7Days = useMemo(() => getNext7Days(), []);
  const availableSlots = useMemo(() =>
    getAvailableTimeSlots(selectedDate, settings.openingHour, settings.closingHour, settings.lockDurationHours),
    [selectedDate, settings]
  );

  const priceBreakdown = useMemo(() => {
    if (!selectedService) return { subtotal: 0, total: 0, cashback: 0 };
    const subtotal = selectedService.price + DIRT_LEVEL_PRICES[dirtLevel] + selectedExtras.reduce((a, b) => a + b.price, 0);
    const discount = appliedCoupon?.discount || 0;
    const total = Math.max(0, subtotal - discount);
    const cbAmount = (cashback.enabled && cashback.percentage > 0) ? (total * (cashback.percentage / 100)) : 0;
    return { subtotal, total, cashback: Math.round(cbAmount) };
  }, [selectedService, dirtLevel, selectedExtras, appliedCoupon, cashback]);

  const bookingSummary = useMemo(() => {
    if (!selectedService) return '';
    const itemsCount = selectedExtras.length + (dirtLevel !== 'Normal' ? 1 : 0);
    return `${selectedService.name}${itemsCount > 0 ? ` + ${itemsCount} adicional(is)` : ''}`;
  }, [selectedService, selectedExtras, dirtLevel]);

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    const result = await api.validateCoupon(couponCode, formData.phone, priceBreakdown.subtotal);
    if (result.valid) {
      setAppliedCoupon({ discount: result.discount, code: couponCode.toUpperCase() });
    } else {
      setAppliedCoupon(null);
      alert(result.message);
    }
  };

  const handleFinalSubmit = async () => {
    try {
      setIsSubmitting(true);
      const appointmentData = {
        type: 'booking' as const,
        serviceId: selectedService!.id,
        serviceName: selectedService!.name,
        price: priceBreakdown.total,
        date: selectedDate,
        time: selectedTime,
        durationMinutes: selectedService!.durationMinutes,
        dirtLevel,
        extras: selectedExtras.map(e => e.name),
        customerName: formData.name,
        customerPhone: formData.phone,
        vehicleModel: formData.model,
        paymentMethod: formData.paymentMethod,
      };

      // Tenta salvar no banco, mas com um tempo limite de 4 segundos 
      // para não travar o usuário se a internet estiver lenta
      try {
        await Promise.race([
          createAppointment(appointmentData),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
        ]);
      } catch (e) {
        console.warn("Aviso: Banco de dados demorou a responder, prosseguindo com WhatsApp...");
      }

      const msg = `*NOVO AGENDAMENTO 🚗*\n\n` +
        `*Cliente:* ${formData.name}\n` +
        `*WhatsApp:* ${formData.phone}\n` +
        `*Veículo:* ${formData.model}\n` +
        `*Serviço:* ${selectedService?.name}\n` +
        `*Data:* ${selectedDate.split('-').reverse().join('/')} às ${selectedTime}\n` +
        `*Pagamento:* ${formData.paymentMethod}\n` +
        (appliedCoupon ? `*Cupom:* ${appliedCoupon.code} (-R$ ${appliedCoupon.discount})\n` : '') +
        (priceBreakdown.cashback > 0 ? `*Cashback Estimado:* R$ ${priceBreakdown.cashback}\n` : '') +
        `*VALOR TOTAL:* R$ ${priceBreakdown.total}`;

      setIsSubmitting(false);
      setStep(5);

      // Pequeno delay para garantir que o estado do React atualizou antes do redirecionamento
      setTimeout(() => {
        const whatsappUrl = `https://wa.me/${SHOP_PHONE.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
        window.location.href = whatsappUrl;
      }, 500);

    } catch (error) {
      console.error("Booking error:", error);
      setIsSubmitting(false);
      alert("Ocorreu um erro ao processar. Por favor, tente novamente.");
    }
  };

  const Header = ({ title, showSteps = true }: { title: string, showSteps?: boolean }) => (
    <div className="bg-navy text-white sticky top-0 z-50 shadow-md">
      <div className="p-4 flex items-center justify-between">
        <button onClick={() => setStep(s => (s > 1 ? (s - 1) : 1) as any)} className="p-1"><ChevronLeft size={24} /></button>
        <span className="font-bold uppercase tracking-widest text-[10px]">{title}</span>
        <button onClick={onCancel} className="p-1"><X size={24} /></button>
      </div>
      {showSteps && (
        <div className="flex justify-center gap-1.5 pb-3">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className={`h-1 rounded-full transition-all duration-300 ${s === step ? 'w-6 bg-vivid-blue' : 'w-1.5 bg-slate-200/30'}`} />
          ))}
        </div>
      )}
    </div>
  );

  const BottomBar = ({ label, onClick, disabled, value, summary }: any) => (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-[#E5E7EB] flex flex-col items-center justify-center z-50 safe-area-bottom">
      {summary && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{summary}</span>}
      <button
        onClick={onClick}
        disabled={disabled || isSubmitting}
        className="w-full max-w-lg bg-vivid-blue text-white h-14 rounded-2xl font-black flex justify-between px-6 items-center shadow-lg shadow-blue-500/20 disabled:opacity-50 active:scale-[0.97] transition-all"
      >
        <div className="flex items-center gap-2">
          {isSubmitting && <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          <span className="uppercase tracking-widest text-[14px]">{label}</span>
        </div>
        <span className="text-[16px] font-black">R$ {value}</span>
      </button>
    </div>
  );

  if (step === 5) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center animate-fade-in">
        <div className="bg-white p-10 rounded-[3rem] shadow-xl w-full max-w-md space-y-6 border border-[#E5E7EB]">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600 animate-bounce"><Check className="w-10 h-10" /></div>
          <h2 className="text-2xl font-black text-navy italic">AGENDADO!</h2>
          <p className="text-slate-text text-sm">Pronto! Seu horário foi reservado. <br /><span className="font-bold text-vivid-blue">Estamos abrindo seu WhatsApp para confirmar...</span></p>
          <div className="bg-slate-50 p-6 rounded-3xl text-left text-sm space-y-2 border border-[#E5E7EB]">
            <p><strong>📅 Data:</strong> {selectedDate.split('-').reverse().join('/')}</p>
            <p><strong>⏰ Hora:</strong> {selectedTime}</p>
            <p><strong>🚗 Veículo:</strong> {formData.model}</p>
          </div>
          <div className="pt-4">
            <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-300 uppercase animate-pulse">
              <div className="w-1.5 h-1.5 bg-vivid-blue rounded-full"></div>
              Redirecionando automaticamente
            </div>
          </div>
          <Button fullWidth onClick={onCancel} variant="primary" className="py-4 rounded-xl font-black uppercase tracking-widest">Voltar ao Início</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#F3F4F6] flex flex-col font-sans native-scroll relative">
      {/* Overlay de Processamento Premium */}
      {isSubmitting && (
        <div className="fixed inset-0 z-[100] bg-navy/80 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-fade-in">
          <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl flex flex-col items-center space-y-6 max-w-xs w-full text-center">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-slate-100 rounded-full"></div>
              <div className="absolute top-0 left-0 w-20 h-20 border-4 border-vivid-blue border-t-transparent rounded-full animate-spin"></div>
              <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-golden animate-pulse" size={24} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-navy italic">QUASE LÁ!</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                Estamos reservando sua vaga e preparando seu WhatsApp...
              </p>
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <>
          <Header title="1. Quando deseja vir?" />
          <div className="p-4 space-y-6 animate-fade-in max-w-lg mx-auto w-full pb-32">
            <h2 className="text-xl font-bold text-navy">Escolha a data e hora</h2>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {next7Days.map((day) => (
                <button key={day.dateStr} onClick={() => setSelectedDate(day.dateStr)} className={`flex-shrink-0 w-16 h-20 rounded-2xl flex flex-col items-center justify-center transition-all ${selectedDate === day.dateStr ? 'bg-vivid-blue text-white shadow-lg scale-105' : 'bg-white text-slate-400 border border-[#E5E7EB]'}`}>
                  <span className="text-[10px] font-bold uppercase mb-1">{day.dayName}</span>
                  <span className="text-lg font-black">{day.dayNum}</span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 w-full">
              {availableSlots.length > 0 ? availableSlots.map(time => (
                <button key={time} onClick={() => setSelectedTime(time)} className={`py-4 rounded-2xl font-black text-sm transition-all ${selectedTime === time ? 'bg-navy text-white shadow-lg' : 'bg-white text-slate-400 border border-[#E5E7EB]'}`}>{time}</button>
              )) : (
                <div className="col-span-3 text-center py-10 text-slate-400 font-bold uppercase text-xs italic">Sem horários para hoje</div>
              )}
            </div>
          </div>
          <BottomBar label="Próximo" value={priceBreakdown.total} disabled={!selectedTime} onClick={() => setStep(2)} />
        </>
      )}

      {step === 2 && (
        <>
          <Header title="2. Qual o serviço?" />
          <div className="p-4 space-y-4 animate-fade-in max-w-lg mx-auto w-full pb-32">
            {services.filter(s => s.active !== false).map(s => (
              <div
                key={s.id}
                onClick={() => { setSelectedService(s); setStep(3); }}
                className={`p-5 bg-white rounded-[2rem] border-2 transition-all flex items-center justify-between gap-4 shadow-soft ${selectedService?.id === s.id ? 'border-vivid-blue ring-4 ring-blue-50' : 'border-[#E5E7EB]'
                  }`}
              >
                <div className="flex-1">
                  <h3 className="font-black text-navy text-lg">{s.name}</h3>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.durationMinutes} min</span>
                  <p className="text-xs text-slate-text mt-1">{s.description}</p>
                </div>
                <div className="text-right pl-3 border-l">
                  <span className="text-xl font-black text-vivid-blue">R$ {s.price}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <Header title="3. Detalhes e Extras" />
          <div className="p-4 space-y-6 animate-fade-in max-w-lg mx-auto w-full pb-32">
            <div className="space-y-3">
              <h3 className="font-bold text-navy text-sm uppercase tracking-widest italic ml-1">Nível de Sujeira</h3>
              <div className="space-y-2">
                {DIRT_LEVELS.map(level => (
                  <div
                    key={level.id}
                    onClick={() => setDirtLevel(level.id as DirtLevel)}
                    className={`p-4 rounded-2xl border-2 flex items-center gap-4 transition-all cursor-pointer ${dirtLevel === level.id ? 'border-vivid-blue bg-blue-50' : 'border-[#E5E7EB] bg-white'
                      }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${dirtLevel === level.id ? 'bg-vivid-blue text-white' : 'bg-slate-100 text-slate-400'}`}>
                      <ThermometerSun size={20} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-navy">{level.label}</h4>
                      <p className="text-[10px] text-slate-500">{level.description}</p>
                    </div>
                    <span className="text-sm font-black text-vivid-blue">
                      {level.price === 0 ? 'Grátis' : `+ R$ ${level.price}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-navy text-sm uppercase tracking-widest italic ml-1">Adicionais</h3>
              <div className="bg-white p-2 rounded-3xl border border-[#E5E7EB] space-y-1 shadow-sm">
                {UPSELL_EXTRAS.map(ex => {
                  const isSelected = selectedExtras.find(e => e.id === ex.id);
                  return (
                    <div
                      key={ex.id}
                      onClick={() => setSelectedExtras(prev => isSelected ? prev.filter(e => e.id !== ex.id) : [...prev, ex])}
                      className={`p-4 rounded-2xl flex justify-between items-center transition-all cursor-pointer ${isSelected ? 'bg-golden/5' : 'bg-transparent'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        {isSelected ? <CheckSquare size={20} className="text-golden" /> : <Square size={20} className="text-[#D1D5DB]" />}
                        <span className="font-bold text-navy text-sm">{ex.name}</span>
                      </div>
                      <span className="font-black text-vivid-blue text-sm">+ R$ {ex.price}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <BottomBar label="Próximo" value={priceBreakdown.total} summary={bookingSummary} onClick={() => setStep(4)} />
        </>
      )}

      {step === 4 && (
        <>
          <Header title="4. Finalizar" />
          <div className="p-4 space-y-6 animate-fade-in max-w-lg mx-auto w-full pb-32">
            <div className="bg-white p-6 rounded-[2.5rem] border border-[#E5E7EB] space-y-4 shadow-sm">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Seu Nome</label>
                <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-slate-50 h-12 px-4 rounded-2xl font-bold text-navy outline-none border border-transparent focus:border-vivid-blue" placeholder="Ex: João da Silva" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp</label>
                <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: formatPhone(e.target.value) })} className="w-full bg-slate-50 h-12 px-4 rounded-2xl font-bold text-navy outline-none border border-transparent focus:border-vivid-blue" placeholder="(35) 9 0000-0000" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Veículo (Modelo)</label>
                <input value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} className="w-full bg-slate-50 h-12 px-4 rounded-2xl font-bold text-navy outline-none border border-transparent focus:border-vivid-blue" placeholder="Ex: Honda Civic" />
              </div>

              <div className="pt-4 border-t border-slate-100">
                <div
                  onClick={() => setFormData({ ...formData, agreedToTerms: !formData.agreedToTerms })}
                  className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex gap-3 items-start cursor-pointer active:scale-[0.98] transition-all"
                >
                  <div className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center ${formData.agreedToTerms ? 'bg-navy border-navy' : 'bg-white border-slate-300'}`}>
                    {formData.agreedToTerms && <Check size={16} className="text-white" />}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-[11px] font-bold text-navy leading-tight flex items-center gap-2">
                      Concordo com os Termos <ShieldCheck size={12} className="text-vivid-blue" />
                    </p>
                    <p className="text-[9px] text-slate-500 leading-relaxed text-justify">
                      Autorizo o tratamento dos meus dados pessoais (Nome, Telefone e Modelo do Carro) exclusivamente para a realização deste agendamento, conforme a <strong>Lei Geral de Proteção de Dados (LGPD)</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-navy text-sm uppercase tracking-widest italic ml-1">Pagamento (No Local)</h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'Pix', icon: <QrCode size={18} /> },
                  { id: 'Cartão', icon: <CreditCard size={18} /> },
                  { id: 'Dinheiro', icon: <Banknote size={18} /> }
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => setFormData({ ...formData, paymentMethod: m.id as any })}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${formData.paymentMethod === m.id ? 'border-vivid-blue bg-blue-50 text-vivid-blue' : 'border-[#E5E7EB] bg-white text-slate-400'
                      }`}
                  >
                    {m.icon}
                    <span className="text-[10px] font-black uppercase">{m.id}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-navy text-sm uppercase tracking-widest italic ml-1">Vantagens</h3>
              <div className="bg-white p-6 rounded-[2.5rem] border border-[#E5E7EB] space-y-4 shadow-sm">
                <div className="flex gap-2">
                  <input
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value.toUpperCase())}
                    className="flex-1 bg-slate-50 h-12 px-4 rounded-2xl font-black text-navy uppercase placeholder:text-slate-300 outline-none"
                    placeholder="CUPOM"
                  />
                  <button onClick={handleApplyCoupon} className="bg-navy text-white px-6 rounded-2xl font-black text-xs uppercase tracking-widest">OK</button>
                </div>
                {appliedCoupon && (
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 p-2 rounded-xl text-[10px] font-black italic">
                    <CheckCircle size={14} /> CUPOM {appliedCoupon.code} ATIVADO! (-R$ {appliedCoupon.discount})
                  </div>
                )}
                {cashback.enabled && priceBreakdown.cashback > 0 && (
                  <div className="bg-vivid-blue/5 border border-vivid-blue/20 p-3 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-2 text-vivid-blue font-bold text-xs"><Percent size={14} /> Cashback acumulado:</div>
                    <span className="text-navy font-black text-sm">R$ {priceBreakdown.cashback}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-amber-50 border-2 border-amber-200 p-4 rounded-3xl flex items-start gap-3 animate-pulse">
              <AlertCircle className="text-amber-600 flex-shrink-0" size={20} />
              <p className="text-[11px] font-black text-amber-800 leading-tight">
                O agendamento será confirmado somente após o envio da mensagem no WhatsApp do Lava Rápido.
              </p>
            </div>
          </div>
          <BottomBar
            label="Confirmar"
            value={priceBreakdown.total}
            disabled={!formData.name || !formData.phone || !formData.model || !formData.paymentMethod || !formData.agreedToTerms}
            onClick={handleFinalSubmit}
          />
        </>
      )}
    </div>
  );
};
