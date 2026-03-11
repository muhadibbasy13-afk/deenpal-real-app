import React, { useState, useEffect } from 'react';
import { X, User, Mail, ShieldCheck, Zap, LogOut, Calendar, Heart, BookOpen, TrendingUp, ChevronRight, Trash2 } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { favoriteService, type Favorite } from '../services/favoriteService';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: Session | null;
  darkMode: boolean;
  isPremium: boolean;
  t: any;
  language: string;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, session, darkMode, isPremium, t, language }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'favorites' | 'progress'>('profile');
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && activeTab === 'favorites') {
      loadFavorites();
    }
  }, [isOpen, activeTab]);

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const favs = await favoriteService.getFavorites();
      setFavorites(favs);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (surahNumber: number, ayahNumber: number) => {
    try {
      await favoriteService.removeFavorite(surahNumber, ayahNumber);
      setFavorites(prev => prev.filter(f => !(f.surah_number === surahNumber && f.ayah_number === ayahNumber)));
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  if (!isOpen || !session) return null;

  const user = session.user;
  const joinDate = new Date(user.created_at).toLocaleDateString(language === 'Español' ? 'es-ES' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const tabs = [
    { id: 'profile', label: t.profile || 'Perfil', icon: User },
    { id: 'favorites', label: t.favorites || 'Favoritos', icon: Heart },
    { id: 'progress', label: t.progress || 'Progreso', icon: TrendingUp },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />
      
      <div
        className={`relative w-full max-w-2xl h-[80vh] overflow-hidden rounded-[40px] shadow-2xl flex flex-col ${
          darkMode ? 'bg-deenly-dark-surface border border-deenly-gold/20' : 'bg-deenly-cream border border-deenly-gold/10'
        }`}
      >
        <div className="p-6 border-b border-deenly-gold/10 flex items-center justify-between bg-deenly-gold/5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-deenly-gold flex items-center justify-center shadow-lg shadow-deenly-gold/20">
              <User className="text-white" size={20} />
            </div>
            <h2 className={`text-xl font-bold ${darkMode ? 'text-deenly-dark-text' : 'text-deenly-green'}`}>
              {t.myProfile || 'Mi Perfil'}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${darkMode ? 'hover:bg-white/10 text-white/60' : 'hover:bg-black/5 text-black/40'}`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex p-2 gap-1 border-b border-deenly-gold/10 bg-deenly-gold/5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3 flex items-center justify-center gap-2 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                activeTab === tab.id
                  ? 'bg-deenly-gold text-white shadow-lg shadow-deenly-gold/20'
                  : darkMode ? 'text-white/40 hover:bg-white/5 hover:text-white' : 'text-black/40 hover:bg-black/5 hover:text-black'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
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
                    <span>{isPremium ? t.premiumMember || 'Miembro Premium' : t.freeAccount || 'Cuenta Gratuita'}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className={`p-4 rounded-2xl border border-deenly-gold/10 ${darkMode ? 'bg-deenly-dark-bg/50' : 'bg-white/50'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-deenly-gold/10 flex items-center justify-center text-deenly-gold">
                        <Mail size={16} />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest font-bold opacity-40">{t.email || 'Correo Electrónico'}</p>
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
                        <p className="text-[10px] uppercase tracking-widest font-bold opacity-40">{t.memberSince || 'Miembro desde'}</p>
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
                    {t.logout || 'Cerrar Sesión'}
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'favorites' && (
              <motion.div
                key="favorites"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-deenly-gold"></div>
                  </div>
                ) : favorites.length > 0 ? (
                  favorites.map((fav) => (
                    <div 
                      key={fav.id}
                      className={`p-6 rounded-3xl border border-deenly-gold/10 ${darkMode ? 'bg-deenly-dark-bg/50' : 'bg-white'}`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-deenly-gold/10 flex items-center justify-center text-deenly-gold text-[10px] font-bold">
                            {fav.ayah_number}
                          </div>
                          <div className={`text-[10px] font-bold uppercase tracking-widest text-deenly-gold`}>
                            {fav.surah_name} • {fav.surah_number}:{fav.ayah_number}
                          </div>
                        </div>
                        <button 
                          onClick={() => removeFavorite(fav.surah_number, fav.ayah_number)}
                          className="p-2 rounded-xl hover:bg-red-500/10 text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <p className={`text-xl text-right mb-4 font-serif leading-loose ${darkMode ? 'text-white' : 'text-deenly-green'}`} dir="rtl">
                        {fav.ayah_text}
                      </p>
                      <p className={`text-sm leading-relaxed opacity-70 italic ${darkMode ? 'text-white' : 'text-deenly-green'}`}>
                        "{fav.translation_text}"
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 opacity-50">
                    <Heart size={48} className="mx-auto mb-4 text-deenly-gold/20" />
                    <p className="text-sm font-medium">{t.noFavoritesYet || 'Aún no tienes favoritos'}</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'progress' && (
              <motion.div
                key="progress"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-6 rounded-3xl border border-deenly-gold/10 ${darkMode ? 'bg-deenly-dark-bg/50' : 'bg-white'}`}>
                    <div className="text-deenly-gold mb-2">
                      <Heart size={24} />
                    </div>
                    <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-deenly-green'}`}>
                      {favorites.length}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest font-bold opacity-40">
                      {t.favoritesCount || 'Ayas Favoritas'}
                    </div>
                  </div>
                  <div className={`p-6 rounded-3xl border border-deenly-gold/10 ${darkMode ? 'bg-deenly-dark-bg/50' : 'bg-white'}`}>
                    <div className="text-deenly-gold mb-2">
                      <BookOpen size={24} />
                    </div>
                    <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-deenly-green'}`}>
                      {user.user_metadata?.onboarding?.knowledgeLevel || 'Principiante'}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest font-bold opacity-40">
                      {t.knowledgeLevel || 'Nivel de Conocimiento'}
                    </div>
                  </div>
                </div>

                <div className={`p-6 rounded-3xl border border-deenly-gold/10 ${darkMode ? 'bg-deenly-gold/5' : 'bg-deenly-gold/5'}`}>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-deenly-gold mb-4 flex items-center gap-2">
                    <TrendingUp size={16} />
                    {t.learningGoals || 'Objetivos de Aprendizaje'}
                  </h3>
                  <div className="space-y-4">
                    {user.user_metadata?.onboarding?.interests?.map((interest: string, i: number) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-deenly-gold" />
                          <span className={`text-sm font-medium ${darkMode ? 'text-white/80' : 'text-deenly-green/80'}`}>
                            {interest}
                          </span>
                        </div>
                        <ChevronRight size={14} className="opacity-20" />
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
