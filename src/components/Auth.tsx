import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Mail, Lock, User, ArrowRight, Loader2, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [showPassword, setShowPassword] = useState(false);
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
    console.log('Iniciando proceso de autenticación...', { isLogin, email });

    try {
      // Timeout de 15 segundos para evitar que se quede cargando infinitamente
      const authPromise = isLogin 
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({
            email,
            password,
            options: {
              data: { full_name: fullName },
            },
          });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('La conexión con el servidor ha tardado demasiado. Por favor, verifica tu conexión a internet y las credenciales de Supabase.')), 15000)
      );

      const { data, error }: any = await Promise.race([authPromise, timeoutPromise]);
      
      if (error) {
        console.error('Error de Supabase:', error);
        throw error;
      }

      console.log('Respuesta de Supabase recibida:', data);
      
      if (!isLogin) {
        if (data?.user) {
          console.log('Usuario creado, iniciando onboarding...');
          setShowOnboarding(true);
        } else {
          console.log('Registro exitoso, esperando confirmación de email.');
          setSuccess('¡Registro exitoso! Por favor, revisa tu correo para confirmar tu cuenta.');
        }
      }
    } catch (err: any) {
      console.error('Error en handleAuth:', err);
      setError(err.message || 'Ocurrió un error inesperado al conectar con Supabase');
    } finally {
      setLoading(false);
      console.log('Proceso de autenticación finalizado.');
    }
  };

  const handleOnboardingNext = async () => {
    if (onboardingStep < onboardingQuestions.length - 1) {
      setOnboardingStep(prev => prev + 1);
    } else {
      setLoading(true);
      setError(null);
      try {
        console.log('Finalizando onboarding...', onboardingData);
        
        // Intentar actualizar el usuario en Supabase
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (!sessionData.session) {
          // Si no hay sesión, es probable que necesite confirmar email
          throw new Error('Para finalizar, por favor confirma tu correo electrónico primero. Revisa tu bandeja de entrada (y SPAM).');
        }

        const { error: updateError } = await supabase.auth.updateUser({
          data: { 
            onboarding: onboardingData,
            is_onboarded: true
          }
        });

        if (updateError) throw updateError;

        setSuccess('¡Perfil completado! Redirigiendo...');
        setTimeout(() => window.location.reload(), 1500);
      } catch (err: any) {
        console.error('Error al finalizar onboarding:', err);
        
        // Fallback: Si es un error de sesión/permisos, guardamos localmente y permitimos continuar
        if (err.message.includes('confirm') || err.status === 401) {
          setError(err.message);
        } else {
          // Error genérico, intentamos forzar la entrada
          setError('Hubo un pequeño problema al guardar en la nube, pero no te preocupes. Haz clic en Finalizar de nuevo para entrar.');
          // Guardamos en localStorage como respaldo
          localStorage.setItem('deenly_onboarding_fallback', JSON.stringify(onboardingData));
          setTimeout(() => window.location.reload(), 3000);
        }
      } finally {
        setLoading(false);
      }
    }
  };

  if (showOnboarding) {
    const currentQ = onboardingQuestions[onboardingStep];
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a2e24] relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a2e24] via-[#1a4d3e] to-[#0a2e24]" />
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md p-8 rounded-[40px] shadow-2xl bg-white/10 backdrop-blur-xl border border-white/20 text-white relative z-10"
        >
          <div className="text-center mb-8">
            <div className="flex justify-center gap-2 mb-6">
              {onboardingQuestions.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1.5 rounded-full transition-all duration-500 ${i <= onboardingStep ? 'w-8 bg-emerald-400' : 'w-2 bg-white/20'}`} 
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
                  className={`w-full p-4 rounded-2xl border-2 transition-all text-left font-medium flex items-center justify-between ${
                    isSelected 
                      ? 'border-emerald-400 bg-emerald-400/20 text-white shadow-[0_0_15px_rgba(52,211,153,0.3)]' 
                      : 'border-white/10 bg-white/5 hover:border-white/30'
                  }`}
                >
                  {option}
                  {isSelected && <CheckCircle2 size={18} className="text-emerald-400" />}
                </button>
              );
            })}
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col gap-2 p-4 rounded-2xl bg-red-500/20 border border-red-500/30 text-red-200 text-sm mt-4"
            >
              <div className="flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
              {error.includes('confirm') && (
                <button 
                  onClick={() => window.location.reload()}
                  className="text-xs font-bold underline hover:text-white text-left"
                >
                  ¿Ya lo has confirmado? Haz clic aquí para entrar.
                </button>
              )}
            </motion.div>
          )}

          <button
            onClick={handleOnboardingNext}
            disabled={loading || (!currentQ.multiple && !(onboardingData as any)[currentQ.id]) || (currentQ.multiple && onboardingData.interests.length === 0)}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 mt-8 shadow-lg shadow-emerald-500/20 disabled:opacity-50 active:scale-[0.98]"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (onboardingStep === onboardingQuestions.length - 1 ? 'Finalizar' : 'Siguiente')}
            <ArrowRight size={18} />
          </button>
          
          {onboardingStep === onboardingQuestions.length - 1 && error && (
            <button
              onClick={() => window.location.reload()}
              className="w-full mt-4 py-2 text-xs text-white/40 hover:text-white transition-colors"
            >
              Saltar y entrar de todos modos
            </button>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#0a2e24] relative overflow-hidden font-sans">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a2e24] via-[#1a4d3e] to-[#0a2e24]" />
      
      {/* Stars/Particles Effect */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        {[...Array(20)].map((_, i) => (
          <div 
            key={i}
            className="absolute bg-white rounded-full animate-pulse"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              width: `${Math.random() * 3}px`,
              height: `${Math.random() * 3}px`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>

      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10 relative z-10"
      >
        <div className="relative inline-block mb-4">
          <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full" />
          <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
            <path d="M58 42C58 42 54 38 48 38C41.3726 38 36 43.3726 36 50C36 56.6274 41.3726 62 48 62C54 62 58 58 58 58C54 58 51 55 51 50C51 45 54 42 58 42Z" fill="#F0E68C" />
            <path d="M50 20L53 28L62 28L55 33L58 41L50 36L42 41L45 33L38 28L47 28L50 20Z" fill="#F0E68C" />
          </svg>
        </div>
        <h1 className="text-5xl font-bold tracking-[0.2em] text-white mb-2 drop-shadow-lg">DEENLY</h1>
        <p className="text-emerald-100/70 text-sm tracking-widest uppercase font-medium">Tu compañero espiritual en el camino del conocimiento</p>
      </motion.div>

      {/* Glassmorphism Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md p-10 rounded-[40px] shadow-2xl bg-white/10 backdrop-blur-2xl border border-white/20 relative z-10 overflow-hidden"
      >
        {/* Subtle inner glow */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-white mb-2">
            {isLogin ? 'Bienvenido a Deenly' : 'Crea tu cuenta'}
          </h2>
          <p className="text-white/60 text-sm">
            {isLogin ? 'Accede a tu espacio espiritual personalizado' : 'Únete a nuestra comunidad de aprendizaje'}
          </p>
          <div className="flex justify-center mt-4">
            <div className="h-px w-12 bg-white/20" />
            <div className="mx-2 text-white/20 text-[10px]">✦</div>
            <div className="h-px w-12 bg-white/20" />
          </div>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          <AnimatePresence mode="wait">
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <label className="text-xs font-bold uppercase tracking-widest text-white/70 ml-1">Nombre completo</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-emerald-400 transition-colors" size={18} />
                  <input
                    type="text"
                    required={!isLogin}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:bg-white/10 focus:border-emerald-400/50 focus:ring-4 focus:ring-emerald-400/10 outline-none transition-all"
                    placeholder="Tu nombre"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-white/70 ml-1">Correo electrónico</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-emerald-400 transition-colors" size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:bg-white/10 focus:border-emerald-400/50 focus:ring-4 focus:ring-emerald-400/10 outline-none transition-all"
                placeholder="Tu correo electrónico"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-white/70 ml-1">Contraseña</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-emerald-400 transition-colors" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:bg-white/10 focus:border-emerald-400/50 focus:ring-4 focus:ring-emerald-400/10 outline-none transition-all"
                placeholder="Tu contraseña"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {isLogin && (
            <div className="text-right">
              <button type="button" className="text-xs text-white/40 hover:text-white transition-colors">
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          )}

          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 p-4 rounded-2xl bg-red-500/20 border border-red-500/30 text-red-200 text-sm"
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </motion.div>
          )}

          {success && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 text-sm"
            >
              <CheckCircle2 size={16} />
              <span>{success}</span>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-4 shadow-xl shadow-emerald-900/40 active:scale-[0.98]"
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

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#1a4d3e] px-2 text-white/30">o</span>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="w-full py-4 rounded-2xl border border-white/10 text-white/80 font-medium hover:bg-white/5 transition-all active:scale-[0.98]"
          >
            {isLogin ? 'Crear cuenta nueva' : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
        </div>

        <div className="mt-8 text-center">
          <p className="text-[10px] text-white/30 leading-relaxed">
            Al continuar, aceptas nuestros <button className="underline hover:text-white">Términos</button> y <button className="underline hover:text-white">Política de Privacidad</button>
          </p>
        </div>
      </motion.div>

      {/* Footer Quote */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-12 text-center relative z-10 max-w-lg"
      >
        <p className="text-white/80 text-xl font-serif mb-2" dir="rtl">
          وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ
        </p>
        <p className="text-white/40 text-xs italic">
          "Y cuando mis siervos te pregunten por Mí, diles que estoy cerca..." (Corán 2:186)
        </p>
      </motion.div>
    </div>
  );
};
