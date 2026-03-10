import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Share2, Copy, Check, BookOpen, Quote } from 'lucide-react';
import { getAyahOfTheDay } from '../services/quranService';

interface AyahOfTheDayProps {
  darkMode: boolean;
  language: string;
}

const AyahOfTheDay: React.FC<AyahOfTheDayProps> = ({ darkMode, language }) => {
  const [ayah, setAyah] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchAyah = async () => {
      setLoading(true);
      const data = await getAyahOfTheDay(language === 'Español' ? 'es.cortes' : language === 'English' ? 'en.sahih' : language === 'Français' ? 'fr.hamidullah' : 'ar.alafasy');
      setAyah(data);
      setLoading(false);
    };
    fetchAyah();
  }, [language]);

  const handleCopy = () => {
    if (!ayah) return;
    const textToCopy = `${ayah.arabicText}\n\n${ayah.translation}\n\n— Corán ${ayah.surah.number}:${ayah.numberInSurah} (${ayah.surah.englishName})`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (!ayah) return;
    const textToShare = `📖 Ayah del Día en Deenly:\n\n"${ayah.translation}"\n\n— Corán ${ayah.surah.number}:${ayah.numberInSurah} (${ayah.surah.englishName})`;
    if (navigator.share) {
      navigator.share({
        title: 'Ayah del Día - Deenly',
        text: textToShare,
        url: window.location.href,
      });
    } else {
      handleCopy();
    }
  };

  if (loading) {
    return (
      <div className={`p-6 rounded-[32px] border border-deenly-gold/10 animate-pulse ${darkMode ? 'bg-deenly-dark-surface' : 'bg-white'}`}>
        <div className="h-4 w-32 bg-deenly-gold/20 rounded-full mb-4" />
        <div className="h-20 w-full bg-deenly-gold/5 rounded-2xl mb-4" />
        <div className="h-4 w-24 bg-deenly-gold/20 rounded-full" />
      </div>
    );
  }

  if (!ayah) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative overflow-hidden p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] border border-deenly-gold/10 shadow-xl ${
        darkMode ? 'bg-deenly-dark-surface/50' : 'bg-white'
      }`}
    >
      {/* Decorative background element */}
      <div className="absolute -right-8 -top-8 opacity-5 pointer-events-none">
        <BookOpen size={160} className="text-deenly-gold" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-deenly-gold">
            <div className="p-2 bg-deenly-gold/10 rounded-xl">
              <Sparkles size={18} />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em]">Ayah del Día</h3>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={handleCopy}
              className={`p-2 rounded-xl transition-colors ${darkMode ? 'hover:bg-white/5 text-white/40 hover:text-white' : 'hover:bg-black/5 text-black/40 hover:text-black'}`}
              title="Copiar"
            >
              {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            </button>
            <button 
              onClick={handleShare}
              className={`p-2 rounded-xl transition-colors ${darkMode ? 'hover:bg-white/5 text-white/40 hover:text-white' : 'hover:bg-black/5 text-black/40 hover:text-black'}`}
              title="Compartir"
            >
              <Share2 size={16} />
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="relative">
            <Quote className="absolute -left-2 -top-2 opacity-10 text-deenly-gold" size={40} />
            <p className={`text-2xl sm:text-3xl text-right font-serif leading-relaxed mb-6 ${darkMode ? 'text-white' : 'text-deenly-green'}`} dir="rtl">
              {ayah.arabicText}
            </p>
          </div>

          <div className="pl-4 border-l-2 border-deenly-gold/30">
            <p className={`text-sm sm:text-base leading-relaxed italic opacity-80 ${darkMode ? 'text-white' : 'text-deenly-green'}`}>
              "{ayah.translation}"
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-deenly-gold/5">
            <div className={`text-[10px] font-bold uppercase tracking-widest ${darkMode ? 'text-deenly-gold/60' : 'text-deenly-gold'}`}>
              Sura {ayah.surah.name} • {ayah.surah.number}:{ayah.numberInSurah}
            </div>
            <div className={`text-[10px] font-medium opacity-40 uppercase tracking-widest ${darkMode ? 'text-white' : 'text-deenly-green'}`}>
              {ayah.surah.englishName}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AyahOfTheDay;
