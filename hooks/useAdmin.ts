
import { useMemo } from 'react';
import { useApp } from '../AppContext';
import { Appointment } from '../types';

export const useAdmin = () => {
  const { appointments, clients } = useApp();

  const financialStats = useMemo(() => {
    const paidApts = appointments.filter(a => a.status === 'paid');
    const allWorkDone = appointments.filter(a => a.status === 'paid' || a.status === 'completed');
    const today = new Date().toISOString().split('T')[0];
    const revenueToday = paidApts.filter(a => a.date === today).reduce((sum, a) => sum + (a.price || 0), 0);
    const totalRevenue = paidApts.reduce((sum, a) => sum + (a.price || 0), 0);
    const averageTicket = paidApts.length > 0 ? (totalRevenue / paidApts.length) : 0;
    return { revenueToday, totalRevenue, totalWashes: allWorkDone.length, averageTicket };
  }, [appointments]);

  const queueMetrics = useMemo(() => {
    const waiting = appointments.filter(a => a.status === 'waiting');
    const inProgress = appointments.filter(a => a.status === 'in_progress');
    const estWaitTime = waiting.length * 40;
    return { waitingCount: waiting.length, inProgressCount: inProgress.length, estWaitTime };
  }, [appointments]);

  const extraStats = useMemo(() => {
    const paidOrCompleted = appointments.filter(a => a.status === 'paid' || a.status === 'completed');
    const totalVisits = paidOrCompleted.length;
    const uniqueClients = (new Set(paidOrCompleted.map(a => a.customerPhone)).size) as number;
    
    const clientVisitCounts = paidOrCompleted.reduce((acc, a) => {
      acc[a.customerPhone] = (acc[a.customerPhone] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const returningClients = (Object.values(clientVisitCounts) as number[]).filter((count: number) => count > 1).length;
    const returnRate = uniqueClients > 0 ? (returningClients / uniqueClients) * 100 : 0;

    const serviceCounts = paidOrCompleted.reduce((acc, a) => {
      acc[a.serviceName] = (acc[a.serviceName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topServices = (Object.entries(serviceCounts) as [string, number][])
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([name, count]) => ({ name, count: count as number }));

    return { totalVisits, activeClients: uniqueClients, returnRate, topServices };
  }, [appointments]);

  return { financialStats, queueMetrics, extraStats };
};
