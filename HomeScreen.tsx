
import React from 'react';
import { BarChart3 } from 'lucide-react';
import { useAdmin } from './hooks/useAdmin';

export const HomeScreen: React.FC<{ onTabChange: (tab: any) => void }> = ({ onTabChange }) => {
  const { financialStats, extraStats } = useAdmin();

  return (
    <div className="space-y-6 animate-fade-in px-2">
      <div className="flex flex-col gap-1">
        <h2 className="font-black text-3xl text-navy italic">BEM-VINDO, ADMIN</h2>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Visão Geral do Pit Stop</p>
      </div>
      
      <div className="bg-navy p-8 rounded-[3rem] text-white space-y-4 shadow-xl shadow-navy/20 overflow-hidden relative">
         <div className="absolute top-0 right-0 p-4 opacity-10"><BarChart3 size={100}/></div>
         <div className="relative z-10">
           <h3 className="font-black text-lg uppercase tracking-wider mb-2">Pista do Dia</h3>
           <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                <span className="text-[9px] uppercase font-bold text-white/50 tracking-widest">Hoje</span>
                <p className="text-2xl font-black">R$ {financialStats.revenueToday}</p>
              </div>
              <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                <span className="text-[9px] uppercase font-bold text-white/50 tracking-widest">Lavados</span>
                <p className="text-2xl font-black">{extraStats.totalVisits}</p>
              </div>
           </div>
         </div>
         <button onClick={() => onTabChange('queue')} className="w-full bg-golden text-navy py-3 rounded-2xl font-black text-xs uppercase tracking-widest mt-2 hover:bg-white transition-colors">VER FILA COMPLETA</button>
      </div>
    </div>
  );
};
