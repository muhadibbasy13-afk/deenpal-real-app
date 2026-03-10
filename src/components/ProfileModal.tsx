import React from 'react';
import { X, User, Mail, ShieldCheck, Zap, LogOut, Calendar } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: Session | null;
  darkMode: boolean;
  isPremium: boolean;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, session, darkMode, isPremium }) => {
  if (!isOpen || !session) return null;

  const user = session.user;
  const joinDate = new Date(user.created_at).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      
      <div
        className={`relative w-full max-w-md overflow-hidden rounded-[32px] shadow-2xl flex flex-col ${
          darkMode ? 'bg-deenly-dark-surface border border-deenly-gold/20' : 'bg-deenly-cream border border-deenly-gold/10'
        }`}
      >
        <div className="p-6 border-b border-deenly-gold/10 flex items-center justify-between bg-deenly-gold/5">
          <h2 className={`text-xl font-bold ${darkMode ? 'text-deenly-dark-text' : 'text-deenly-green'}`}>
            Mi Perfil
          </h2>
          <button 
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${darkMode ? 'hover:bg-white/10 text-white/60' : 'hover:bg-black/5 text-black/40'}`}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-8">
          <div className="flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-deenly-gold/10 flex items-center justify-center text-deenly-gold border-2 border-deenly-gold/20 mb-4 relative">
              <User size={48} />
              {isPremium && (
                <div className="absolute -right-1 -bottom-1 bg-deenly-gold text-white p-1.5 rounded-full shadow-lg">
                  <Zap size={16} fill="currentColor" />
                </div>
              )}
            </div>
            <h3 className={`text-lg font-bold ${darkMode ? 'text-deenly-dark-text' : 'text-deenly-green'}`}>
              {user.user_metadata?.full_name || 'Usuario de Deenly'}
            </h3>
            <div className="flex items-center gap-2 text-xs opacity-50 font-medium uppercase tracking-widest mt-1">
              <ShieldCheck size={12} className="text-deenly-gold" />
              <span>{isPremium ? 'Miembro Premium' : 'Cuenta Gratuita'}</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className={`p-4 rounded-2xl border border-deenly-gold/10 ${darkMode ? 'bg-deenly-dark-bg/50' : 'bg-white/50'}`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-deenly-gold/10 flex items-center justify-center text-deenly-gold">
                  <Mail size={16} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold opacity-40">Correo Electrónico</p>
                  <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-deenly-green'}`}>{user.email}</p>
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border border-deenly-gold/10 ${darkMode ? 'bg-deenly-dark-bg/50' : 'bg-white/50'}`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-deenly-gold/10 flex items-center justify-center text-deenly-gold">
                  <Calendar size={16} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold opacity-40">Miembro desde</p>
                  <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-deenly-green'}`}>{joinDate}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button 
              onClick={() => supabase.auth.signOut()}
              className="w-full py-4 flex items-center justify-center gap-3 text-red-500 font-bold text-xs uppercase tracking-widest border border-red-500/20 rounded-2xl hover:bg-red-500/5 transition-colors"
            >
              <LogOut size={18} />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
