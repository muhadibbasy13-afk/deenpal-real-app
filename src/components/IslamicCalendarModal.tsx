import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, X, ChevronLeft, ChevronRight, Star, Moon, Sun, Clock } from 'lucide-react';

interface IslamicCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
}

interface IslamicEvent {
  name: string;
  hijriDate: string;
  description: string;
  type: 'major' | 'minor';
}

const ISLAMIC_EVENTS: IslamicEvent[] = [
  { name: "Ramadán", hijriDate: "1 Ramadán", description: "Mes de ayuno sagrado para los musulmanes.", type: 'major' },
  { name: "Eid al-Fitr", hijriDate: "1 Shawwal", description: "Celebración del fin del ayuno de Ramadán.", type: 'major' },
  { name: "Día de Arafah", hijriDate: "9 Dhu al-Hijjah", description: "El día más importante del Hajj.", type: 'major' },
  { name: "Eid al-Adha", hijriDate: "10 Dhu al-Hijjah", description: "Fiesta del sacrificio.", type: 'major' },
  { name: "Año Nuevo Hijri", hijriDate: "1 Muharram", description: "Inicio del nuevo año islámico.", type: 'minor' },
  { name: "Ashura", hijriDate: "10 Muharram", description: "Día de ayuno voluntario y significado histórico.", type: 'minor' },
  { name: "Mawlid al-Nabi", hijriDate: "12 Rabi' al-Awwal", description: "Nacimiento del Profeta Muhammad (PBUH).", type: 'minor' },
  { name: "Isra y Mi'raj", hijriDate: "27 Rajab", description: "Viaje nocturno y ascensión del Profeta.", type: 'minor' },
  { name: "Laylat al-Qadr", hijriDate: "27 Ramadán", description: "La Noche del Destino (fecha probable).", type: 'major' },
];

export const IslamicCalendarModal: React.FC<IslamicCalendarModalProps> = ({ isOpen, onClose, darkMode }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hijriDateStr, setHijriDateStr] = useState('');

  useEffect(() => {
    const formatter = new Intl.DateTimeFormat('es-u-ca-islamic-uma', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    setHijriDateStr(formatter.format(currentDate));
  }, [currentDate]);

  const changeMonth = (offset: number) => {
    const nextDate = new Date(currentDate);
    nextDate.setMonth(currentDate.getMonth() + offset);
    setCurrentDate(nextDate);
  };

  const getHijriMonth = (date: Date) => {
    return new Intl.DateTimeFormat('es-u-ca-islamic-uma', { month: 'long' }).format(date);
  };

  const getHijriYear = (date: Date) => {
    return new Intl.DateTimeFormat('es-u-ca-islamic-uma', { year: 'numeric' }).format(date);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-[40px] shadow-2xl flex flex-col ${
          darkMode ? 'bg-deenly-dark-surface border border-deenly-gold/20' : 'bg-deenly-cream border border-deenly-gold/10'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
          {/* Header */}
          <div className="p-6 sm:p-8 border-b border-deenly-gold/10 flex items-center justify-between bg-deenly-gold/5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-deenly-gold flex items-center justify-center shadow-lg shadow-deenly-gold/20">
                <CalendarIcon className="text-white" size={24} />
              </div>
              <div>
                <h2 className={`text-xl sm:text-2xl font-bold ${darkMode ? 'text-deenly-dark-text' : 'text-deenly-green'}`}>
                  Calendario Islámico
                </h2>
                <p className="text-[10px] opacity-50 uppercase tracking-widest font-bold text-deenly-gold">
                  Fechas y Eventos Sagrados
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className={`p-3 rounded-2xl transition-colors ${darkMode ? 'hover:bg-white/10 text-white/60' : 'hover:bg-black/5 text-black/40'}`}
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 scrollbar-hide">
            {/* Current Hijri Date Card */}
            <div className={`p-8 rounded-[40px] text-center relative overflow-hidden border border-deenly-gold/20 ${
              darkMode ? 'bg-deenly-gold/10' : 'bg-deenly-gold/5'
            }`}>
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Moon size={120} className="text-deenly-gold" />
              </div>
              <div className="relative z-10">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-deenly-gold mb-2">Fecha de Hoy</p>
                <h3 className={`text-3xl sm:text-4xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-deenly-green'}`}>
                  {hijriDateStr}
                </h3>
                <p className="text-xs opacity-50 font-medium">
                  {currentDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Calendar Navigation */}
            <div className="flex items-center justify-between px-4">
              <button 
                onClick={() => changeMonth(-1)}
                className={`p-2 rounded-xl border border-deenly-gold/20 ${darkMode ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}
              >
                <ChevronLeft size={20} className="text-deenly-gold" />
              </button>
              <div className="text-center">
                <h4 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-deenly-green'}`}>
                  {getHijriMonth(currentDate)}
                </h4>
                <p className="text-[10px] font-bold text-deenly-gold uppercase tracking-widest">
                  {getHijriYear(currentDate)}
                </p>
              </div>
              <button 
                onClick={() => changeMonth(1)}
                className={`p-2 rounded-xl border border-deenly-gold/20 ${darkMode ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}
              >
                <ChevronRight size={20} className="text-deenly-gold" />
              </button>
            </div>

            {/* Important Events */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Star size={16} className="text-deenly-gold" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-deenly-gold">Eventos Importantes</h3>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                {ISLAMIC_EVENTS.map((event, index) => (
                  <div 
                    key={index}
                    className={`p-5 rounded-3xl border border-deenly-gold/10 flex items-start gap-4 transition-colors hover:border-deenly-gold/30 ${
                      darkMode ? 'bg-deenly-dark-bg/30' : 'bg-white'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      event.type === 'major' ? 'bg-deenly-gold text-white' : 'bg-deenly-gold/10 text-deenly-gold'
                    }`}>
                      {event.type === 'major' ? <Star size={18} /> : <Moon size={18} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-deenly-green'}`}>
                          {event.name}
                        </h4>
                        <span className="text-[10px] font-bold text-deenly-gold px-2 py-0.5 rounded-full bg-deenly-gold/10">
                          {event.hijriDate}
                        </span>
                      </div>
                      <p className="text-xs opacity-60 leading-relaxed">
                        {event.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Info Note */}
            <div className={`p-6 rounded-3xl border border-deenly-gold/10 flex items-start gap-4 ${
              darkMode ? 'bg-deenly-dark-bg/20' : 'bg-white/50'
            }`}>
              <Clock size={18} className="text-deenly-gold shrink-0 mt-1" />
              <p className="text-[10px] leading-relaxed opacity-50">
                * Las fechas islámicas se basan en el avistamiento de la luna y pueden variar según la ubicación geográfica. Este calendario utiliza el cálculo Umm al-Qura.
              </p>
            </div>
          </div>
      </div>
    </div>
  );
};
