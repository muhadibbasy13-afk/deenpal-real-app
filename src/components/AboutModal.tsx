import React from 'react';
import { X, Info, Heart, ShieldCheck, Globe, MessageSquare } from 'lucide-react';
import { Logo } from './Logo';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose, darkMode }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />
      
      <div
        className={`relative w-full max-w-md overflow-hidden rounded-[32px] shadow-2xl flex flex-col ${
          darkMode ? 'bg-deenly-dark-surface border border-deenly-gold/20' : 'bg-deenly-cream border border-deenly-gold/10'
        }`}
      >
        <div className="p-6 border-b border-deenly-gold/10 flex items-center justify-between bg-deenly-gold/5">
          <h2 className={`text-xl font-bold ${darkMode ? 'text-deenly-dark-text' : 'text-deenly-green'}`}>
            Sobre Deenly
          </h2>
          <button 
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${darkMode ? 'hover:bg-white/10 text-white/60' : 'hover:bg-black/5 text-black/40'}`}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh] scrollbar-hide">
          <div className="flex flex-col items-center text-center">
            <Logo size={64} className="mb-4" />
            <Logo showText size={0} className="justify-center mb-2" />
            <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-deenly-gold">Versión 1.0.0</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className={`text-sm font-bold uppercase tracking-widest text-deenly-gold flex items-center gap-2`}>
                <Globe size={14} /> Nuestra Misión
              </h3>
              <p className={`text-sm leading-relaxed opacity-70 ${darkMode ? 'text-white' : 'text-deenly-green'}`}>
                Deenly nace con el propósito de democratizar el acceso al conocimiento islámico auténtico mediante el uso de inteligencia artificial avanzada. Queremos ser un puente entre la tradición y la tecnología moderna.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className={`text-sm font-bold uppercase tracking-widest text-deenly-gold flex items-center gap-2`}>
                <ShieldCheck size={14} /> Compromiso con la Verdad
              </h3>
              <p className={`text-sm leading-relaxed opacity-70 ${darkMode ? 'text-white' : 'text-deenly-green'}`}>
                Nuestras respuestas se basan en fuentes académicas reconocidas y el Sagrado Corán. Aunque la IA puede cometer errores, trabajamos continuamente para mejorar la precisión y fidelidad de la información proporcionada.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className={`p-4 rounded-2xl border border-deenly-gold/10 ${darkMode ? 'bg-deenly-dark-bg/50' : 'bg-white/50'} text-center`}>
                <div className="w-10 h-10 rounded-full bg-deenly-gold/10 flex items-center justify-center text-deenly-gold mx-auto mb-2">
                  <MessageSquare size={20} />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Chats</p>
                <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-deenly-green'}`}>+10k</p>
              </div>
              <div className={`p-4 rounded-2xl border border-deenly-gold/10 ${darkMode ? 'bg-deenly-dark-bg/50' : 'bg-white/50'} text-center`}>
                <div className="w-10 h-10 rounded-full bg-deenly-gold/10 flex items-center justify-center text-deenly-gold mx-auto mb-2">
                  <Heart size={20} />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Usuarios</p>
                <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-deenly-green'}`}>+5k</p>
              </div>
            </div>

            <div className="pt-6 text-center">
              <p className="text-[10px] opacity-40 uppercase tracking-widest font-medium">
                Hecho con ❤️ para la Ummah
              </p>
              <p className="text-[10px] text-deenly-gold font-bold mt-1">
                © 2026 Deenly AI. Todos los derechos reservados.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
