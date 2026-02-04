
import React from 'react';
import { DollarSign, Activity, Droplets, Wallet } from 'lucide-react';
import { useAdmin } from './hooks/useAdmin';

export const DashboardFinanceiro: React.FC = () => {
  const { financialStats } = useAdmin();

  return (
    <div className="space-y-6 animate-fade-in px-2">
      <h2 className="font-bold text-navy text-xl">Dashboard Financeiro</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         <div className="bg-white p-6 rounded-[2.5rem] border border-[#E5E7EB] shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-green-50 text-green-600 p-2 rounded-xl"><DollarSign size={18}/></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Receita Hoje</span>
            </div>
            <p className="text-2xl font-black text-navy italic">R$ {financialStats.revenueToday.toLocaleString('pt-BR')}</p>
         </div>
         <div className="bg-white p-6 rounded-[2.5rem] border border-[#E5E7EB] shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-vivid-blue/5 text-vivid-blue p-2 rounded-xl"><Activity size={18}/></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ticket Médio</span>
            </div>
            <p className="text-2xl font-black text-navy italic">R$ {financialStats.averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
         </div>
         <div className="bg-white p-6 rounded-[2.5rem] border border-[#E5E7EB] shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-golden/10 text-golden p-2 rounded-xl"><Droplets size={18}/></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lavagens</span>
            </div>
            <p className="text-2xl font-black text-navy italic">{financialStats.totalWashes}</p>
         </div>
         <div className="bg-white p-6 rounded-[2.5rem] border border-[#E5E7EB] shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-navy/5 text-navy p-2 rounded-xl"><Wallet size={18}/></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Faturamento Total</span>
            </div>
            <p className="text-2xl font-black text-navy italic">R$ {financialStats.totalRevenue.toLocaleString('pt-BR')}</p>
         </div>
      </div>
    </div>
  );
};
