import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Mail, Lock, User, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AuthProps {
  darkMode: boolean;
}

export const Auth: React.FC<AuthProps> = ({ darkMode }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState({
    gender: '',
    knowledgeLevel: '',
    interests: [] as string[],
    goal: ''
  });

  const onboardingQuestions = [
    {
      id: 'gender',
      question: '¿Cómo prefieres que me dirija a ti?',
      options: ['Hermano', 'Hermana']
    },
    {
      id: 'knowledgeLevel',
      question: '¿Cuál es tu nivel de conocimiento sobre el Islam?',
      options: ['Principiante', 'Intermedio', 'Avanzado']
    },
    {
      id: 'interests',
      question: '¿Qué temas te interesan más?',
      options: ['Historia', 'Fiqh', 'Espiritualidad', 'Corán', 'Hadiz'],
      multiple: true
    },
    {
      id: 'goal',
      question: '¿Cuál es tu objetivo principal con Deenly?',
      options: ['Aprender', 'Resolver dudas', 'Conexión diaria']
    }
  ];

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isSupabaseConfigured) {
      setError('Supabase no está configurado. Por favor, añade las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });
        if (error) throw error;
        
        if (data.user) {
          setShowOnboarding(true);
        } else {
          setSuccess('¡Registro exitoso! Por favor, revisa tu correo para confirmar tu cuenta.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  const handleOnboardingNext = async () => {
    if (onboardingStep < onboardingQuestions.length - 1) {
      setOnboardingStep(prev => prev + 1);
    } else {
      setLoading(true);
      try {
        const { error } = await supabase.auth.updateUser({
          data: { 
            onboarding: onboardingData,
            is_onboarded: true
          }
        });
        if (error) throw error;
        setSuccess('¡Perfil completado! Ya puedes empezar tu viaje espiritual.');
        setTimeout(() => window.location.reload(), 2000);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  if (showOnboarding) {
    const currentQ = onboardingQuestions[onboardingStep];
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${darkMode ? 'bg-[#0a0a0a] text-white' : 'bg-[#f5f5f0] text-gray-900'}`}>
        <div 
          className={`w-full max-w-md p-8 rounded-[40px] shadow-2xl ${darkMode ? 'bg-[#141414] border border-white/10' : 'bg-white border border-black/5'}`}
        >
          <div className="text-center mb-8">
            <div className="flex justify-center gap-2 mb-6">
              {onboardingQuestions.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1.5 rounded-full transition-all duration-500 ${i <= onboardingStep ? 'w-8 bg-emerald-500' : 'w-2 bg-gray-300'}`} 
                />
              ))}
            </div>
            <h2 className="text-2xl font-bold mb-2">{currentQ.question}</h2>
            <p className="text-sm opacity-50">Paso {onboardingStep + 1} de {onboardingQuestions.length}</p>
          </div>

          <div className="space-y-3">
            {currentQ.options.map(option => {
              const isSelected = currentQ.multiple 
                ? onboardingData.interests.includes(option)
                : (onboardingData as any)[currentQ.id] === option;

              return (
                <button
                  key={option}
                  onClick={() => {
                    if (currentQ.multiple) {
                      const newInterests = isSelected
                        ? onboardingData.interests.filter(i => i !== option)
                        : [...onboardingData.interests, option];
                      setOnboardingData({ ...onboardingData, interests: newInterests });
                    } else {
                      setOnboardingData({ ...onboardingData, [currentQ.id]: option });
                    }
                  }}
                  className={`w-full p-4 rounded-2xl border-2 transition-colors text-left font-medium flex items-center justify-between ${
                    isSelected 
                      ? 'border-emerald-500 bg-emerald-500/5 text-emerald-500' 
                      : 'border-gray-100 hover:border-emerald-500/30'
                  }`}
                >
                  {option}
                  {isSelected && <CheckCircle2 size={18} />}
                </button>
              );
            })}
          </div>

          <button
            onClick={handleOnboardingNext}
            disabled={loading || (!currentQ.multiple && !(onboardingData as any)[currentQ.id]) || (currentQ.multiple && onboardingData.interests.length === 0)}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold transition-colors flex items-center justify-center gap-2 mt-8 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (onboardingStep === onboardingQuestions.length - 1 ? 'Finalizar' : 'Siguiente')}
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${darkMode ? 'bg-[#0a0a0a] text-white' : 'bg-[#f5f5f0] text-gray-900'}`}>
      <div 
        className={`w-full max-w-md p-8 rounded-3xl shadow-2xl ${darkMode ? 'bg-[#141414] border border-white/10' : 'bg-white border border-black/5'}`}
      >
        <div className="text-center mb-8">
          <div 
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 mb-4"
          >
            <User size={32} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {isLogin ? 'Bienvenido a Deenly' : 'Crea tu cuenta'}
          </h1>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {isLogin ? 'Tu asistente islámico personal te espera' : 'Únete a nuestra comunidad de aprendizaje'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div
              className="space-y-2"
            >
              <label className="text-sm font-medium ml-1">Nombre completo</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  required={!isLogin}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-colors outline-none ${
                    darkMode 
                      ? 'bg-[#1a1a1a] border-white/10 focus:border-emerald-500/50' 
                      : 'bg-gray-50 border-gray-200 focus:border-emerald-500/50'
                  }`}
                  placeholder="Tu nombre"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium ml-1">Correo electrónico</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-colors outline-none ${
                  darkMode 
                    ? 'bg-[#1a1a1a] border-white/10 focus:border-emerald-500/50' 
                    : 'bg-gray-50 border-gray-200 focus:border-emerald-500/50'
                }`}
                placeholder="tu@correo.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium ml-1">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-colors outline-none ${
                  darkMode 
                    ? 'bg-[#1a1a1a] border-white/10 focus:border-emerald-500/50' 
                    : 'bg-gray-50 border-gray-200 focus:border-emerald-500/50'
                }`}
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div 
              className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 text-red-500 text-sm"
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div 
              className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 text-emerald-500 text-sm"
            >
              <CheckCircle2 size={16} />
              <span>{success}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-4 shadow-lg shadow-emerald-500/20"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                {isLogin ? 'Iniciar sesión' : 'Registrarse'}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className={`text-sm font-medium hover:underline ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
          >
            {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
        </div>
      </div>
    </div>
  );
};
