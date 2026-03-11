import React from 'react';
import { X, Zap, Check, ShieldCheck, Sparkles, MessageSquare, BookOpen, Globe } from 'lucide-react';

interface PlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  isPremium: boolean;
  onUpgrade: () => void;
  t: any;
}

export const PlansModal: React.FC<PlansModalProps> = ({ isOpen, onClose, darkMode, isPremium, onUpgrade, t }) => {
  const plans = [
    {
      name: t.plansFree,
      price: '0€',
      period: t.plansForever,
      features: t.plansFeaturesFree,
      buttonText: t.plansCurrent,
      disabled: true,
      popular: false,
      icon: <MessageSquare size={24} className="text-deenly-gold" />
    },
    {
      name: t.plansPro,
      price: '9.99€',
      period: t.plansMonthly,
      features: t.plansFeaturesPro,
      buttonText: isPremium ? t.plansAlreadyPro : t.plansUpgrade,
      disabled: isPremium,
      popular: true,
      icon: <Zap size={24} className="text-deenly-gold fill-deenly-gold" />
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />
      
      <div
        className={`relative w-full max-w-4xl overflow-hidden rounded-[40px] shadow-2xl flex flex-col ${
          darkMode ? 'bg-deenly-dark-surface border border-deenly-gold/20' : 'bg-deenly-cream border border-deenly-gold/10'
        }`}
      >
        <div className="p-6 sm:p-8 border-b border-deenly-gold/10 flex items-center justify-between bg-deenly-gold/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-deenly-gold flex items-center justify-center shadow-lg shadow-deenly-gold/20">
              <Zap className="text-white" size={24} fill="currentColor" />
            </div>
            <div>
              <h2 className={`text-2xl font-bold ${darkMode ? 'text-deenly-dark-text' : 'text-deenly-green'}`}>
                {t.plansTitle}
              </h2>
              <p className="text-xs opacity-50 uppercase tracking-widest font-bold text-deenly-gold">
                {t.plansSubtitle}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className={`p-3 rounded-2xl transition-colors ${darkMode ? 'hover:bg-white/10 text-white/60' : 'hover:bg-black/5 text-black/40'}`}
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 sm:p-12 overflow-y-auto max-h-[70vh] scrollbar-hide">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {plans.map((plan, i) => (
              <div 
                key={i}
                className={`relative p-8 rounded-[40px] border-2 transition-colors flex flex-col h-full ${
                  plan.popular 
                    ? 'border-deenly-gold bg-deenly-gold/5 shadow-xl shadow-deenly-gold/10' 
                    : 'border-deenly-gold/10 bg-white/30'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-deenly-gold text-white px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg">
                    {t.plansPopular}
                  </div>
                )}

                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-deenly-gold/10 flex items-center justify-center">
                    {plan.icon}
                  </div>
                  <div className="text-right">
                    <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-deenly-green'}`}>{plan.price}</p>
                    <p className="text-[10px] opacity-40 uppercase tracking-widest font-bold">{plan.period}</p>
                  </div>
                </div>

                <h3 className={`text-xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-deenly-green'}`}>{plan.name}</h3>

                <div className="space-y-4 flex-1 mb-8">
                  {plan.features.map((feature: string, j: number) => (
                    <div key={j} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-deenly-gold/10 flex items-center justify-center text-deenly-gold shrink-0 mt-0.5">
                        <Check size={12} strokeWidth={3} />
                      </div>
                      <span className={`text-sm opacity-70 ${darkMode ? 'text-white' : 'text-deenly-green'}`}>{feature}</span>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={plan.disabled ? undefined : onUpgrade}
                  disabled={plan.disabled}
                  className={`w-full py-4 rounded-2xl text-xs font-bold uppercase tracking-widest transition-colors shadow-md ${
                    plan.popular 
                      ? 'bg-deenly-gold text-white hover:bg-deenly-gold/90 disabled:opacity-50' 
                      : 'bg-deenly-gold/10 text-deenly-gold hover:bg-deenly-gold/20 disabled:opacity-50'
                  }`}
                >
                  {plan.buttonText}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-12 p-8 rounded-[40px] border border-deenly-gold/10 bg-deenly-gold/5 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            <div className="w-16 h-16 rounded-full bg-deenly-gold/10 flex items-center justify-center text-deenly-gold shrink-0">
              <ShieldCheck size={32} />
            </div>
            <div>
              <h4 className={`text-lg font-bold mb-1 ${darkMode ? 'text-white' : 'text-deenly-green'}`}>{t.plansSecure}</h4>
              <p className="text-sm opacity-60">{t.plansSecureDesc}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
