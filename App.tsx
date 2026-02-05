
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { ShieldCheck, Settings as SettingsIcon, ListOrdered, TrendingUp, Home as HomeIcon, Users, PlusCircle, LogOut, X, MessageCircle, Calendar, Sparkles, Clock } from 'lucide-react';
import { ViewState } from './types';
import { api } from './services/firebase';
import { AppProvider, useApp } from './AppContext';
import { Button } from './components/Button';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider, useToast } from './components/Toast';
import { InstallPWA } from './components/InstallPWA';

// Static imports for critical client path to ensure reliability
import { BookingFlow } from './BookingFlow';
import { GalleryView } from './GalleryView';

// Lazy loading admin sub-components
const HomeScreen = lazy(() => import('./HomeScreen').then(m => ({ default: m.HomeScreen })));
const DashboardFinanceiro = lazy(() => import('./DashboardFinanceiro').then(m => ({ default: m.DashboardFinanceiro })));
const FilaLavagem = lazy(() => import('./FilaLavagem').then(m => ({ default: m.FilaLavagem })));
const CRMClientes = lazy(() => import('./CRMClientes').then(m => ({ default: m.CRMClientes })));
const MaisEstatisticas = lazy(() => import('./MaisEstatisticas').then(m => ({ default: m.MaisEstatisticas })));

const LoadingSpinner = () => (
  <div className="flex-1 flex items-center justify-center p-12">
    <div className="w-8 h-8 border-4 border-vivid-blue border-t-transparent rounded-full animate-spin"></div>
  </div>
);

const LandingPage: React.FC<{
  onStartBooking: () => void;
  onOpenGallery: () => void;
  onAdminLogin: () => void;
  logoUrl: string
}> = ({ onStartBooking, onOpenGallery, onAdminLogin, logoUrl }) => {
  return (
    <div className="h-screen max-h-screen overflow-hidden bg-navy text-white flex flex-col font-sans relative">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-[radial-gradient(circle,white_0%,transparent_60%)]"></div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-evenly p-6 text-center z-10 animate-fade-in">
        <div className="flex flex-col items-center space-y-6">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-vivid-blue to-golden rounded-[3.5rem] blur opacity-25"></div>
            <div className="relative w-44 h-44 bg-white rounded-[3.5rem] shadow-2xl flex items-center justify-center overflow-hidden border-4 border-white/50 active:scale-95 transition-transform duration-500">
              <img src={logoUrl} className="w-full h-full object-contain scale-[1.3]" alt="Logo" />
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tighter leading-none italic mb-1">PIT STOP</h1>
            <div className="inline-block bg-golden text-navy px-4 py-1 rounded-full"><p className="font-black text-[9px] tracking-[0.2em] uppercase">Lava Car & Estética</p></div>
            <p className="text-white/30 text-[9px] font-bold uppercase tracking-[0.3em] pt-4">Resultados Extraordinários</p>
          </div>
        </div>
        <div className="w-full max-w-sm space-y-4">
          <Button
            fullWidth
            onClick={() => onStartBooking()}
            variant="primary"
            className="py-6 text-lg font-black shadow-2xl shadow-blue-500/30 rounded-[2rem] uppercase tracking-widest active:scale-95 transition-all"
          >
            <Calendar className="mr-2 w-7 h-7" /> AGENDAR AGORA
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-white/5 rounded-[2rem] border border-white/5 text-center flex flex-col items-center gap-1 backdrop-blur-md">
              <Clock className="text-golden" size={20} />
              <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Atendimento</span>
              <span className="text-[9px] font-black uppercase">Fila Rápida</span>
            </div>
            <button
              onClick={() => onOpenGallery()}
              className="p-4 bg-white/5 rounded-[2rem] border border-white/5 text-center flex flex-col items-center gap-1 backdrop-blur-md active:scale-95 transition-all hover:bg-white/10"
            >
              <Sparkles className="text-vivid-blue" size={20} />
              <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Galeria</span>
              <span className="text-[9px] font-black uppercase">Nosso Instagram</span>
            </button>
          </div>
        </div>
        <div className="pt-2">
          <button onClick={onAdminLogin} className="text-white/20 text-[8px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-2 mx-auto hover:text-white transition-colors">
            <ShieldCheck size={12} /> Dashboard Proprietário
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'queue' | 'finance' | 'home' | 'crm' | 'promotions'>('home');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { settings, templates, updateShopSettings, updateMsgTemplate } = useApp();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-navy text-white p-4 flex justify-between items-center shadow-lg sticky top-0 z-50">
        <div className="flex items-center gap-2 font-bold italic"><ShieldCheck className="text-golden" /> PIT STOP <span className="text-vivid-blue">PRO</span></div>
        <button onClick={() => setIsSettingsOpen(true)} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors"><SettingsIcon size={20} /></button>
      </header>

      <main className="flex-1 p-4 max-w-5xl mx-auto w-full space-y-6 pb-28 overflow-y-auto">
        <Suspense fallback={<LoadingSpinner />}>
          {activeTab === 'home' && <HomeScreen onTabChange={setActiveTab} />}
          {activeTab === 'queue' && <FilaLavagem />}
          {activeTab === 'finance' && <DashboardFinanceiro />}
          {activeTab === 'crm' && <CRMClientes />}
          {activeTab === 'promotions' && <MaisEstatisticas />}
        </Suspense>

        {isSettingsOpen && (
          <div className="fixed inset-0 z-[60] bg-white p-6 overflow-y-auto animate-in fade-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-8">
              <h2 className="font-black text-2xl text-navy italic uppercase">AJUSTES DO SISTEMA</h2>
              <button onClick={() => setIsSettingsOpen(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><X size={20} /></button>
            </div>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Abertura</label><input type="number" value={settings.openingHour} onChange={e => updateShopSettings({ ...settings, openingHour: parseInt(e.target.value) })} className="w-full p-4 bg-slate-50 border rounded-3xl font-black text-xl text-center outline-none focus:border-vivid-blue" /></div>
                <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Fechamento</label><input type="number" value={settings.closingHour} onChange={e => updateShopSettings({ ...settings, closingHour: parseInt(e.target.value) })} className="w-full p-4 bg-slate-50 border rounded-3xl font-black text-xl text-center outline-none focus:border-vivid-blue" /></div>
              </div>
              <div className="space-y-4 pt-6 border-t">
                <h3 className="text-xs font-black text-navy uppercase flex items-center gap-2"><MessageCircle size={16} /> Templates de WhatsApp</h3>
                {templates.map(template => (
                  <div key={template.id} className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase">{template.title}</label>
                    <textarea value={template.content} onChange={e => updateMsgTemplate(template.id, e.target.value)} rows={3} className="w-full bg-slate-50 p-4 rounded-2xl text-[11px] border resize-none outline-none focus:border-vivid-blue" />
                  </div>
                ))}
              </div>
              <div className="space-y-3 pt-6 border-t">
                <Button fullWidth variant="danger" className="rounded-3xl py-4 font-black" onClick={onLogout}><LogOut size={18} className="mr-2" /> DESCONECTAR</Button>
              </div>
            </div>
          </div>
        )}
      </main>

      <div className="flex bg-white shadow-[0_-4px_10px_rgba(0,0,0,0.05)] border-t fixed bottom-0 left-0 right-0 z-50 px-2 safe-area-bottom">
        <button onClick={() => setActiveTab('queue')} className={`flex-1 py-3 text-[10px] font-black uppercase flex flex-col items-center gap-1 border-t-4 transition-all ${activeTab === 'queue' ? 'border-navy text-navy' : 'border-transparent text-slate-300'}`}><ListOrdered size={18} /> Fila</button>
        <button onClick={() => setActiveTab('finance')} className={`flex-1 py-3 text-[10px] font-black uppercase flex flex-col items-center gap-1 border-t-4 transition-all ${activeTab === 'finance' ? 'border-navy text-navy' : 'border-transparent text-slate-300'}`}><TrendingUp size={18} /> Dinheiro</button>
        <button onClick={() => setActiveTab('home')} className={`flex-1 py-3 text-[10px] font-black uppercase flex flex-col items-center gap-1 border-t-4 transition-all ${activeTab === 'home' ? 'border-navy text-navy' : 'border-transparent text-slate-300'}`}><HomeIcon size={18} /> Home</button>
        <button onClick={() => setActiveTab('crm')} className={`flex-1 py-3 text-[10px] font-black uppercase flex flex-col items-center gap-1 border-t-4 transition-all ${activeTab === 'crm' ? 'border-navy text-navy' : 'border-transparent text-slate-300'}`}><Users size={18} /> CRM</button>
        <button onClick={() => setActiveTab('promotions')} className={`flex-1 py-3 text-[10px] font-black uppercase flex flex-col items-center gap-1 border-t-4 transition-all ${activeTab === 'promotions' ? 'border-navy text-navy' : 'border-transparent text-slate-300'}`}><PlusCircle size={18} /> Mais</button>
      </div>
    </div>
  );
};

const MainApp: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.HOME);
  const [logoUrl, setLogoUrl] = useState('');
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [loginForm, setLoginForm] = useState({ user: '', pass: '', error: '', loading: false });
  const { showToast } = useToast();

  useEffect(() => {
    // Initial data fetch
    const init = async () => {
      try {
        const logo = await api.getLogoUrl().catch(() => '');
        setLogoUrl(logo);
      } finally {
        // Only set auth check to false after a timeout if Firebase is slow
        const timer = setTimeout(() => setIsAuthChecking(false), 5000);

        api.onAuthStateChanged(user => {
          if (user) setView(ViewState.ADMIN_DASHBOARD);
          setIsAuthChecking(false);
          clearTimeout(timer);
        });
      }
    };
    init();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginForm(prev => ({ ...prev, loading: true, error: '' }));
    try {
      await api.login(loginForm.user, loginForm.pass);
      setView(ViewState.ADMIN_DASHBOARD);
      showToast('Bem-vindo de volta!', 'success');
    } catch (err) {
      setLoginForm(prev => ({ ...prev, error: 'Acesso Negado.' }));
      showToast('Credenciais inválidas.', 'error');
    } finally {
      setLoginForm(prev => ({ ...prev, loading: false }));
    }
  };

  if (isAuthChecking) {
    return (
      <div className="h-screen bg-navy flex flex-col items-center justify-center p-6 text-center overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-[radial-gradient(circle,white_0%,transparent_60%)] animate-pulse"></div>
        </div>

        <div className="relative z-10 space-y-8 animate-fade-in">
          <div className="relative group">
            <div className="absolute -inset-4 bg-gradient-to-r from-vivid-blue to-golden rounded-[3.5rem] blur-2xl opacity-20 animate-pulse"></div>
            <div className="relative w-40 h-40 bg-white rounded-[3.5rem] shadow-2xl flex items-center justify-center overflow-hidden border-4 border-white/20">
              {logoUrl ? (
                <img src={logoUrl} className="w-full h-full object-contain scale-[1.2]" alt="Logo" />
              ) : (
                <div className="w-full h-full bg-slate-50 flex items-center justify-center">
                  <Sparkles className="text-vivid-blue w-12 h-12" />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col items-center">
              <h1 className="text-3xl font-black text-white italic tracking-tighter leading-none mb-1">PIT STOP</h1>
              <div className="bg-golden px-4 py-0.5 rounded-full">
                <span className="text-navy font-black text-[8px] tracking-[0.2em] uppercase">CAR WASH</span>
              </div>
            </div>

            <div className="pt-8 flex flex-col items-center gap-3">
              <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden relative">
                <div className="absolute top-0 left-0 h-full bg-vivid-blue w-1/2 animate-[loading_1.5s_ease-in-out_infinite]"></div>
              </div>
              <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] animate-pulse">Iniciando sistema...</p>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(200%); }
          }
        `}</style>
      </div>
    );
  }

  if (view === ViewState.HOME) return (
    <LandingPage
      onStartBooking={() => setView(ViewState.BOOKING)}
      onOpenGallery={() => setView(ViewState.GALLERY)}
      onAdminLogin={() => setView(ViewState.ADMIN_LOGIN)}
      logoUrl={logoUrl}
    />
  );

  if (view === ViewState.BOOKING) return (
    <BookingFlow onCancel={() => setView(ViewState.HOME)} />
  );

  if (view === ViewState.GALLERY) return (
    <GalleryView onBack={() => setView(ViewState.HOME)} />
  );

  if (view === ViewState.ADMIN_LOGIN) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="bg-white p-12 rounded-[3rem] shadow-soft max-w-md w-full text-center border-4 border-white">
        <ShieldCheck className="w-12 h-12 mx-auto text-navy mb-4" />
        <h2 className="text-2xl font-black text-navy italic uppercase">PIT STOP</h2>
        <form onSubmit={handleLogin} className="mt-8 space-y-4">
          <input type="text" placeholder="Usuário" value={loginForm.user} onChange={e => setLoginForm({ ...loginForm, user: e.target.value })} className="w-full p-5 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-vivid-blue/20" required />
          <input type="password" placeholder="Senha" value={loginForm.pass} onChange={e => setLoginForm({ ...loginForm, pass: e.target.value })} className="w-full p-5 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-vivid-blue/20" required />
          {loginForm.error && <p className="text-red-500 text-[10px] font-black">{loginForm.error}</p>}
          <Button type="submit" fullWidth isLoading={loginForm.loading} className="py-5 rounded-2xl">ENTRAR</Button>
          <button type="button" onClick={() => setView(ViewState.HOME)} className="text-[10px] font-bold text-slate-300 uppercase mt-4 block mx-auto hover:text-navy transition-colors">Voltar</button>
        </form>
      </div>
    </div>
  );

  if (view === ViewState.ADMIN_DASHBOARD) return <AdminDashboard onLogout={async () => { await api.logout(); setView(ViewState.HOME); }} />;

  return null;
};

const App: React.FC = () => (
  <ErrorBoundary>
    <ToastProvider>
      <InstallPWA />
      <AppProvider>
        <MainApp />
      </AppProvider>
    </ToastProvider>
  </ErrorBoundary>
);

export default App;
