
import React from 'react';
import { Users, CheckCircle, Clock, Tag } from 'lucide-react';
import { useApp } from './AppContext';
import { ClientHistory } from './types';

const ClientItem = React.memo(({ client, onSendMsg }: { client: ClientHistory, onSendMsg: (typeId: string, client: ClientHistory) => void }) => (
  <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-[#E5E7EB] space-y-4">
    <div className="flex justify-between items-start">
      <div>
        <h4 className="font-black text-navy">{client.name}</h4>
        <p className="text-[10px] text-slate-400 font-bold uppercase">{client.phone} • {client.vehicles[0]}</p>
      </div>
      <div className="text-right">
         <span className="text-[10px] font-black text-vivid-blue block uppercase">{client.totalVisits} Visitas</span>
         <span className="text-xs font-black text-navy">Saldo Cashback: <strong className="text-green-600">R$ {client.availableCashback}</strong></span>
      </div>
    </div>
    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-50">
      <button onClick={() => onSendMsg('t1', client)} className="bg-green-50 text-green-600 py-2 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-1 border border-green-100"><CheckCircle size={12}/> Pronto</button>
      <button onClick={() => onSendMsg('t2', client)} className="bg-vivid-blue/5 text-vivid-blue py-2 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-1 border border-blue-100"><Clock size={12}/> Retorno</button>
      <button onClick={() => onSendMsg('t3', client)} className="bg-golden/10 text-golden py-2 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-1 border border-golden/20"><Tag size={12}/> Promo</button>
    </div>
  </div>
));

export const CRMClientes: React.FC = () => {
  const { clients, templates } = useApp();

  const handleSendWhatsAppMsg = React.useCallback((typeId: string, client: ClientHistory) => {
    const template = templates.find(t => t.id === typeId);
    if (!template) return;

    let msg = template.content
      .replace(/\[NOME\]/g, client.name)
      .replace(/\[VEICULO\]/g, client.vehicles[0] || 'veículo');
    
    window.open(`https://wa.me/${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`);
  }, [templates]);

  return (
    <div className="space-y-4 animate-fade-in px-2">
      <h2 className="font-bold text-navy text-xl">CRM & Clientes</h2>
      <div className="space-y-3">
        {clients.map(client => (
          <ClientItem key={client.phone} client={client} onSendMsg={handleSendWhatsAppMsg} />
        ))}
        {clients.length === 0 && (
          <div className="text-center py-10 opacity-30">
            <Users size={48} className="mx-auto mb-2" />
            <p className="font-bold uppercase tracking-widest text-xs">Nenhum cliente salvo ainda</p>
          </div>
        )}
      </div>
    </div>
  );
};
