
import React, { useState, useCallback, useMemo } from 'react';
import { PlusCircle, Power, Check, DollarSign, Activity, Clock, Loader2 } from 'lucide-react';
import { useApp } from './AppContext';
import { useAdmin } from './hooks/useAdmin';
import { Button } from './components/Button';
import { Appointment } from './types';
import { sanitizeString, validateName, validateVehicle, formatPhone } from './utils/validation';

const QueueItem = React.memo(({ q, onUpdateStatus }: { q: Appointment, onUpdateStatus: (id: string, status: Appointment['status']) => Promise<void> }) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusUpdate = async (newStatus: Appointment['status']) => {
    setIsUpdating(true);
    try {
      await onUpdateStatus(q.id, newStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  // Cores dinâmicas solicitadas: Verde quando iniciado (in_progress)
  const getContainerStyles = () => {
    switch (q.status) {
      case 'in_progress':
        return 'bg-green-50 border-green-500 shadow-lg shadow-green-100/30 ring-1 ring-green-500/20';
      case 'completed':
        return 'bg-blue-50/50 border-vivid-blue shadow-md';
      default:
        return 'bg-white border-[#E5E7EB] hover:border-vivid-blue/30';
    }
  };

  const getBadgeStyles = () => {
    switch (q.status) {
      case 'in_progress':
        return 'bg-green-600 text-white';
      case 'completed':
        return 'bg-vivid-blue text-white';
      default:
        return 'bg-slate-100 text-slate-400';
    }
  };

  const getStatusText = () => {
    switch (q.status) {
      case 'in_progress': return 'EM LAVAGEM';
      case 'completed': return 'AGUARDANDO PAGTO';
      default: return 'EM FILA';
    }
  };

  return (
    <div className={`p-5 rounded-[2.5rem] border flex justify-between items-center mx-2 group transition-all duration-500 transform ${getContainerStyles()}`}>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h4 className="font-black text-navy text-base tracking-tight">{q.customerName}</h4>
          <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter transition-colors duration-300 ${getBadgeStyles()}`}>
            {getStatusText()}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{q.vehicleModel} • {q.serviceName}</p>
          <span className="text-slate-300 text-[10px]">•</span>
          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
            <Clock size={10} />
            {q.time}
          </div>
        </div>
      </div>

      <div className="flex gap-2 relative">
        {isUpdating && (
          <div className="absolute inset-0 flex items-center justify-center bg-inherit z-10 rounded-2xl">
            <Loader2 size={24} className="animate-spin text-vivid-blue" />
          </div>
        )}

        {/* Botão INICIAR -> Transita para Verde */}
        {q.status === 'waiting' && (
          <button
            disabled={isUpdating}
            onClick={() => handleStatusUpdate('in_progress')}
            className="bg-golden text-navy px-5 py-4 rounded-2xl transition-active active:scale-90 shadow-md shadow-golden/20 border border-golden/50 flex items-center gap-2 font-black text-[10px] hover:brightness-105"
          >
            <Power size={18} className={isUpdating ? 'animate-pulse' : ''} /> INICIAR
          </button>
        )}

        {/* Botão PRONTO -> Item continua verde, mas muda ação para finalização */}
        {q.status === 'in_progress' && (
          <button
            disabled={isUpdating}
            onClick={() => handleStatusUpdate('completed')}
            className="bg-green-600 text-white px-5 py-4 rounded-2xl transition-active active:scale-90 shadow-md shadow-green-600/20 flex items-center gap-2 font-black text-[10px] hover:bg-green-700"
          >
            <Check size={18} /> FINALIZAR
          </button>
        )}

        {/* Botão RECEBER -> Ação final para remover da fila e registrar pagamento */}
        {q.status === 'completed' && (
          <button
            disabled={isUpdating}
            onClick={() => handleStatusUpdate('paid')}
            className="bg-navy text-white px-5 py-4 rounded-2xl transition-active active:scale-90 shadow-lg shadow-navy/30 flex items-center gap-2 font-black text-[10px] hover:bg-black"
          >
            <DollarSign size={18} /> RECEBER
          </button>
        )}
      </div>
    </div>
  );
});

export const FilaLavagem: React.FC = () => {
  const { appointments, services, updateAppointmentStatus, createAppointment } = useApp();
  const { queueMetrics } = useAdmin();
  const [isAddingToQueue, setIsAddingToQueue] = useState(false);
  const [newQueueItem, setNewQueueItem] = useState({ name: '', phone: '', model: '', serviceId: '' });
  const [error, setError] = useState('');

  const handleAddPresencial = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateName(newQueueItem.name)) return setError('Nome do cliente é obrigatório.');
    if (!validateVehicle(newQueueItem.model)) return setError('Veículo é obrigatório.');
    if (!newQueueItem.serviceId) return setError('Selecione um serviço.');

    const service = services.find(s => s.id === newQueueItem.serviceId);
    try {
      await createAppointment({
        type: 'queue',
        serviceId: newQueueItem.serviceId,
        serviceName: service?.name || 'Manual',
        price: service?.price || 0,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        durationMinutes: service?.durationMinutes || 60,
        dirtLevel: 'Normal',
        extras: [],
        customerName: sanitizeString(newQueueItem.name),
        customerPhone: sanitizeString(newQueueItem.phone || 'N/A'),
        vehicleModel: sanitizeString(newQueueItem.model),
      });
      setIsAddingToQueue(false);
      setNewQueueItem({ name: '', phone: '', model: '', serviceId: '' });
    } catch (err) {
      setError('Erro ao salvar. Tente novamente.');
    }
  };

  const activeAppointments = useMemo(() =>
    appointments.filter(a => ['waiting', 'in_progress', 'completed'].includes(a.status))
      .sort((a, b) => {
        // Prioridade na visualização: Em Lavagem no topo -> Pronto -> Esperando
        const order = { 'in_progress': 0, 'completed': 1, 'waiting': 2 };
        return (order[a.status as keyof typeof order] || 3) - (order[b.status as keyof typeof order] || 3);
      }),
    [appointments]
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-between items-center px-2 pt-2">
        <div>
          <h2 className="font-black text-navy text-2xl leading-tight italic tracking-tighter">FILA EM TEMPO REAL</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Gestão Operacional</p>
        </div>
        <Button variant="golden" onClick={() => setIsAddingToQueue(true)} className="py-2.5 text-[11px] rounded-full px-5 uppercase font-black">
          <PlusCircle size={14} className="mr-2" /> Entrada
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 px-2">
        <div className="bg-white p-4 rounded-3xl border border-[#E5E7EB] shadow-soft flex flex-col items-center">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Status Pista</span>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full animate-pulse ${queueMetrics.waitingCount > 3 ? 'bg-red-500' : queueMetrics.waitingCount > 0 ? 'bg-golden' : 'bg-green-500'}`} />
            <span className="font-black text-navy text-[11px] uppercase">{queueMetrics.waitingCount > 3 ? 'Lotada' : queueMetrics.waitingCount > 0 ? 'Movimentada' : 'Livre'}</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-[#E5E7EB] shadow-soft flex flex-col items-center">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tempo Espera</span>
          <span className="font-black text-navy text-lg leading-none">{queueMetrics.estWaitTime} <small className="text-[10px] opacity-40 italic">min</small></span>
        </div>
      </div>

      {isAddingToQueue && (
        <form onSubmit={handleAddPresencial} className="bg-white p-7 rounded-[3rem] shadow-2xl border-2 border-golden space-y-4 mx-2 animate-in slide-in-from-top duration-300 relative z-20">
          <div className="flex justify-between items-center mb-1">
            <h3 className="font-black text-navy uppercase text-sm italic tracking-tighter">Entrada de Veículo</h3>
            <button type="button" onClick={() => setIsAddingToQueue(false)} className="text-slate-300 hover:text-navy transition-colors">
              <PlusCircle size={22} className="rotate-45" />
            </button>
          </div>

          {error && <p className="text-red-500 text-[10px] font-bold text-center bg-red-50 py-2 rounded-xl border border-red-100">{error}</p>}

          <div className="space-y-3">
            <input placeholder="Nome do Cliente" value={newQueueItem.name} onChange={e => setNewQueueItem({ ...newQueueItem, name: e.target.value })} className="w-full p-4 bg-slate-50 rounded-2xl font-bold border border-transparent outline-none focus:border-vivid-blue focus:bg-white transition-all" required />
            <input type="tel" placeholder="WhatsApp (Opcional)" value={newQueueItem.phone} onChange={e => setNewQueueItem({ ...newQueueItem, phone: formatPhone(e.target.value) })} className="w-full p-4 bg-slate-50 rounded-2xl font-bold border border-transparent outline-none focus:border-vivid-blue focus:bg-white transition-all" />
            <input placeholder="Modelo / Placa / Cor" value={newQueueItem.model} onChange={e => setNewQueueItem({ ...newQueueItem, model: e.target.value })} className="w-full p-4 bg-slate-50 rounded-2xl font-bold border border-transparent outline-none focus:border-vivid-blue focus:bg-white transition-all" required />
            <div className="relative">
              <select value={newQueueItem.serviceId} onChange={e => setNewQueueItem({ ...newQueueItem, serviceId: e.target.value })} className="w-full p-4 bg-slate-50 rounded-2xl font-bold border border-transparent outline-none focus:border-vivid-blue focus:bg-white appearance-none transition-all" required>
                <option value="">Selecione o Serviço</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name} - R$ {s.price}</option>)}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-30 italic font-bold text-[10px]">VER TUDO</div>
            </div>
          </div>

          <Button fullWidth type="submit" className="rounded-2xl py-5 font-black uppercase tracking-widest shadow-lg shadow-vivid-blue/10">Registrar na Fila</Button>
        </form>
      )}

      <div className="space-y-3 pb-8">
        {activeAppointments.map(q => (
          <QueueItem key={q.id + q.status} q={q} onUpdateStatus={updateAppointmentStatus} />
        ))}
        {activeAppointments.length === 0 && !isAddingToQueue && (
          <div className="text-center py-24 opacity-20 flex flex-col items-center animate-pulse">
            <Activity size={70} className="mb-4 text-slate-300" />
            <p className="font-black uppercase tracking-[0.2em] text-xs">Pista Limpa</p>
            <p className="text-[10px] font-bold mt-1">Nenhum veículo aguardando no momento</p>
          </div>
        )}
      </div>
    </div>
  );
};
