
import React, { useState } from 'react';
import { History, User, Percent, Award, Banknote, Ticket } from 'lucide-react';
import { useApp } from './AppContext';
import { useAdmin } from './hooks/useAdmin';
import { Button } from './components/Button';
import { api } from './services/firebase';

export const MaisEstatisticas: React.FC = () => {
  const { extraStats } = useAdmin();
  const { cashback, settings, updateCashback, updateShopSettings } = useApp();
  const [isAddingCoupon, setIsAddingCoupon] = useState(false);

  return (
    <div className="space-y-6 animate-fade-in px-2">
       <div className="flex flex-col gap-1">
          <h2 className="font-bold text-navy text-xl">Mais Estatísticas</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Performance Geral</p>
       </div>

       <div className="grid grid-cols-3 gap-2">
          <div className="bg-white p-3 rounded-2xl border border-[#E5E7EB] shadow-sm flex flex-col items-center justify-center text-center">
            <History size={14} className="text-vivid-blue mb-1" />
            <span className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">Visitas Totais</span>
            <p className="text-sm font-black text-navy">{extraStats.totalVisits}</p>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-[#E5E7EB] shadow-sm flex flex-col items-center justify-center text-center">
            <User size={14} className="text-golden mb-1" />
            <span className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">Clientes Ativos</span>
            <p className="text-sm font-black text-navy">{extraStats.activeClients}</p>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-[#E5E7EB] shadow-sm flex flex-col items-center justify-center text-center">
            <Percent size={14} className="text-green-500 mb-1" />
            <span className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">Taxa Retorno</span>
            <p className="text-sm font-black text-navy">{extraStats.returnRate.toFixed(0)}%</p>
          </div>
       </div>

       <div className="bg-white p-6 rounded-[2.5rem] border border-[#E5E7EB] shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Award size={16} className="text-golden" />
            <h3 className="text-xs font-black text-navy uppercase tracking-widest italic">Serviços Mais Usados</h3>
          </div>
          <div className="space-y-2">
            {extraStats.topServices.map((s, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs font-bold text-navy">{s.name}</span>
                <span className="text-[10px] font-black text-vivid-blue uppercase bg-white px-3 py-1 rounded-full border border-slate-200">{s.count}x</span>
              </div>
            ))}
            {extraStats.topServices.length === 0 && (
              <p className="text-center py-2 text-[10px] text-slate-400 font-bold uppercase italic">Aguardando dados...</p>
            )}
          </div>
       </div>
       
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
          <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-[#E5E7EB] space-y-6 flex flex-col">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3"><div className="p-3 bg-vivid-blue/10 text-vivid-blue rounded-2xl"><Banknote size={24}/></div><h3 className="font-black text-navy uppercase text-xs tracking-widest italic">Cashback</h3></div>
              <button onClick={() => updateCashback({...cashback, enabled: !cashback.enabled})} className={`h-6 w-11 rounded-full relative ${cashback.enabled ? 'bg-green-500' : 'bg-slate-200'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${cashback.enabled ? 'right-1' : 'left-1'}`} /></button>
            </div>
            <div className={`flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-[#E5E7EB] transition-opacity ${!cashback.enabled ? 'opacity-40' : 'opacity-100'}`}>
               <input 
                type="number" 
                disabled={!cashback.enabled}
                value={cashback.percentage} 
                onChange={e => { const v = parseInt(e.target.value); if(!isNaN(v)) updateCashback({...cashback, percentage: v}); }} 
                className="w-16 bg-transparent text-3xl font-black text-navy outline-none" 
              />
               <span className="text-xl font-black text-vivid-blue">%</span>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-[#E5E7EB] space-y-6 flex flex-col">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3"><div className="p-3 bg-golden/10 text-golden rounded-2xl"><Ticket size={24}/></div><h3 className="font-black text-navy uppercase text-xs tracking-widest italic">Cupons</h3></div>
              <button onClick={() => updateShopSettings({...settings, couponsEnabled: !settings.couponsEnabled})} className={`h-6 w-11 rounded-full relative ${settings.couponsEnabled ? 'bg-green-500' : 'bg-slate-200'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${settings.couponsEnabled ? 'right-1' : 'left-1'}`} /></button>
            </div>
            <Button fullWidth onClick={() => alert('Em breve!')} variant="secondary" className="rounded-2xl text-[10px] py-3 uppercase">Novo Cupom</Button>
          </div>
       </div>
    </div>
  );
};
