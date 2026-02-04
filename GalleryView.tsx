
import React from 'react';
import { Instagram, ChevronLeft, Sparkles, Star, Camera, ExternalLink } from 'lucide-react';
import { Button } from './components/Button';

interface GalleryViewProps {
  onBack: () => void;
}

const MOCK_PHOTOS = [
  { id: 1, url: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&q=80&w=800', title: 'Espelhamento VIP' },
  { id: 2, url: 'https://images.unsplash.com/photo-1552933061-90320ee70125?auto=format&fit=crop&q=80&w=800', title: 'Higiene Detalhada' },
  { id: 3, url: 'https://images.unsplash.com/photo-1605515298946-d062f2e9da53?auto=format&fit=crop&q=80&w=800', title: 'Brilho Intenso' },
  { id: 4, url: 'https://images.unsplash.com/photo-1553008169-2d431f92eaf5?auto=format&fit=crop&q=80&w=800', title: 'Cuidado Premium' },
  { id: 5, url: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=800', title: 'Finalização Show' },
  { id: 6, url: 'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&q=80&w=800', title: 'Padrão Pit Stop' },
];

export const GalleryView: React.FC<GalleryViewProps> = ({ onBack }) => {
  return (
    <div className="h-screen bg-navy text-white overflow-hidden flex flex-col font-sans animate-fade-in relative">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-vivid-blue/20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
      
      {/* Header Fixo */}
      <div className="p-6 flex items-center justify-between z-20 sticky top-0 bg-navy/80 backdrop-blur-md">
        <button onClick={onBack} className="p-3 bg-white/10 rounded-2xl backdrop-blur-md active:scale-90 transition-transform">
          <ChevronLeft size={24} />
        </button>
        <div className="flex flex-col items-center text-center px-4">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-vivid-blue">Galeria</span>
          <h2 className="text-xl font-black italic tracking-tighter">NOSSO INSTAGRAM</h2>
        </div>
        <div className="w-12 h-12" /> {/* Spacer para centralizar */}
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-20 space-y-8 scrollbar-hide">
        {/* Banner Instagram */}
        <div className="bg-gradient-to-br from-[#833ab4] via-[#fd1d1d] to-[#fcb045] p-8 rounded-[3rem] shadow-2xl relative overflow-hidden group mt-4">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <Instagram size={120} />
          </div>
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2">
              <Star className="text-yellow-300 fill-yellow-300 animate-pulse" size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/90">Destaques Diários</span>
            </div>
            <h3 className="text-2xl font-black leading-tight">VEJA NOSSAS TRANSFORMAÇÕES NO INSTA!</h3>
            <p className="text-xs text-white/80 font-medium max-w-[80%]">Siga para ver os carros de nossos clientes satisfeitos e pegar cupons exclusivos nos stories.</p>
            <Button 
              onClick={() => window.open('https://instagram.com/pitstoplavacar', '_blank')}
              className="bg-white text-navy rounded-2xl py-4 font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-transform flex items-center justify-center gap-2"
            >
              <Instagram size={18} /> SEGUIR @PITSTOP <ExternalLink size={12} />
            </Button>
          </div>
        </div>

        {/* Galeria de Fotos de Clientes */}
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center">
                <Camera size={20} className="text-vivid-blue" />
              </div>
              <div>
                <h4 className="font-black text-xs uppercase tracking-[0.2em]">Clientes Satisfeitos</h4>
                <p className="text-[8px] text-white/30 font-bold uppercase tracking-widest">Fotos Reais do Nosso Dia a Dia</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {MOCK_PHOTOS.map((photo) => (
              <div key={photo.id} className="group relative aspect-square rounded-[2.5rem] overflow-hidden bg-white/5 border border-white/10 shadow-2xl">
                <img 
                  src={photo.url} 
                  alt={photo.title} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-5">
                   <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-white">{photo.title}</p>
                      <div className="flex gap-1">
                        <Star size={8} className="text-golden fill-golden" />
                        <Star size={8} className="text-golden fill-golden" />
                        <Star size={8} className="text-golden fill-golden" />
                        <Star size={8} className="text-golden fill-golden" />
                        <Star size={8} className="text-golden fill-golden" />
                      </div>
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA para o cliente agendar */}
        <div className="bg-white/5 border border-white/10 p-8 rounded-[3rem] text-center space-y-4">
           <Sparkles className="mx-auto text-golden" size={32} />
           <h3 className="text-lg font-black italic">QUER VER SEU CARRO ASSIM?</h3>
           <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest leading-relaxed">Garanta agora o seu horário e dê o brilho que seu veículo merece.</p>
           <Button onClick={onBack} variant="primary" className="mx-auto rounded-2xl text-[10px] uppercase font-black px-8">VOLTAR E AGENDAR</Button>
        </div>

        {/* Footer info */}
        <div className="text-center py-6 opacity-20 flex flex-col items-center">
          <p className="text-[8px] font-bold uppercase tracking-[0.5em]">Pit Stop Lava Car • Estética Automotiva</p>
        </div>
      </div>
    </div>
  );
};
