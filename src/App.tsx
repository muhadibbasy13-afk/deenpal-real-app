/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Moon, Sun, BookOpen, MessageSquare, Info, Sparkles, ChevronRight, History, LogIn, LogOut, User, Brain, Trash2, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { getMuftiResponse, type ChatMessage } from './services/geminiService';
import { supabase } from './services/supabaseClient';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  user_id?: string;
}

interface Memory {
  id: string;
  content: string;
  created_at: string;
}

const SUGGESTED_QUESTIONS = [
  "¿Cómo puedo mejorar mi concentración en el Salah?",
  "Explícame la importancia de la paciencia (Sabr) en el Islam.",
  "¿Qué dice el Corán sobre el trato a los padres?",
  "Dime un Hadiz sobre la amabilidad.",
];

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [newMemory, setNewMemory] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authSurname, setAuthSurname] = useState('');
  const [authAge, setAuthAge] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [questionsToday, setQuestionsToday] = useState(0);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setIsPremium(session.user.user_metadata?.is_premium || false);
        loadMessages(session.user.id);
        loadMemories(session.user.id);
        loadDailyCount(session.user.id);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setIsPremium(session.user.user_metadata?.is_premium || false);
        loadMessages(session.user.id);
        loadMemories(session.user.id);
        loadDailyCount(session.user.id);
      } else {
        setIsPremium(false);
        setMessages([]);
        setMemories([]);
        setQuestionsToday(0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadDailyCount = async (userId: string) => {
    if (userId === 'guest') return;
    const stored = localStorage.getItem(`deenly_count_${userId}_${new Date().toDateString()}`);
    setQuestionsToday(stored ? parseInt(stored) : 0);
  };

  const incrementDailyCount = (userId: string) => {
    if (userId === 'guest') return;
    const newCount = questionsToday + 1;
    setQuestionsToday(newCount);
    localStorage.setItem(`deenly_count_${userId}_${new Date().toDateString()}`, newCount.toString());
  };

  const loadMessages = async (userId: string) => {
    if (userId === 'guest') return;
    setIsHistoryLoading(true);
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
    } else if (data) {
      setMessages(data.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: new Date(m.created_at),
        user_id: m.user_id
      })));
    }
    setIsHistoryLoading(false);
  };

  const loadMemories = async (userId: string) => {
    if (userId === 'guest') return;
    const { data, error } = await supabase
      .from('user_memories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading memories:', error);
    } else if (data) {
      setMemories(data);
    }
  };

  const addMemory = async () => {
    if (!newMemory.trim() || !user) return;
    if (user.id === 'guest') {
      const tempMemory: Memory = {
        id: crypto.randomUUID(),
        content: newMemory,
        created_at: new Date().toISOString()
      };
      setMemories(prev => [tempMemory, ...prev]);
      setNewMemory('');
      return;
    }
    const { data, error } = await supabase
      .from('user_memories')
      .insert([{ content: newMemory, user_id: user.id }])
      .select();

    if (error) {
      console.error('Error adding memory:', error);
    } else if (data) {
      setMemories(prev => [data[0], ...prev]);
      setNewMemory('');
    }
  };

  const deleteMemory = async (id: string) => {
    if (user?.id === 'guest') {
      setMemories(prev => prev.filter(m => m.id !== id));
      return;
    }
    const { error } = await supabase
      .from('user_memories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting memory:', error);
    } else {
      setMemories(prev => prev.filter(m => m.id !== id));
    }
  };

  const saveMessage = async (msg: Omit<Message, 'timestamp'>) => {
    if (!user || user.id === 'guest') return;
    const { error } = await supabase
      .from('messages')
      .insert([{
        id: msg.id,
        role: msg.role,
        content: msg.content,
        user_id: user.id
      }]);
    
    if (error) console.error('Error saving message:', error);
  };

  const clearMessages = async () => {
    if (!user) {
      setMessages([]);
      return;
    }

    if (user.id !== 'guest') {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error clearing messages:', error);
        return;
      }
    }
    
    setMessages([]);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const groupMessagesIntoThreads = (msgs: Message[]) => {
    const threads: { id: string, title: string, date: Date, messageCount: number }[] = [];
    if (msgs.length === 0) return threads;

    let currentThreadMsgs: Message[] = [msgs[0]];
    
    const pushThread = (msgs: Message[]) => {
      const userMsg = msgs.find(m => m.role === 'user');
      threads.push({
        id: msgs[0].id,
        title: userMsg ? userMsg.content.substring(0, 40) + (userMsg.content.length > 40 ? '...' : '') : 'Conversación',
        date: msgs[0].timestamp,
        messageCount: msgs.length
      });
    };

    for (let i = 1; i < msgs.length; i++) {
      const prev = msgs[i-1];
      const curr = msgs[i];
      const diff = curr.timestamp.getTime() - prev.timestamp.getTime();
      
      if (diff > 1000 * 60 * 60 * 2) { // 2 hours gap
        pushThread(currentThreadMsgs);
        currentThreadMsgs = [curr];
      } else {
        currentThreadMsgs.push(curr);
      }
    }
    
    pushThread(currentThreadMsgs);
    return threads.reverse(); // Newest first
  };

  const chatThreads = groupMessagesIntoThreads(messages);
  
  const filteredMessages = activeThreadId 
    ? (() => {
        const threadIndex = chatThreads.findIndex(t => t.id === activeThreadId);
        if (threadIndex === -1) return messages;
        
        // Find the messages belonging to this thread
        const allThreads = [...chatThreads].reverse(); // Oldest first
        const targetThread = allThreads.find(t => t.id === activeThreadId);
        if (!targetThread) return messages;

        // Re-calculate the clusters to find the exact messages
        let currentThreadMsgs: Message[] = [messages[0]];
        const clusters: Message[][] = [];
        for (let i = 1; i < messages.length; i++) {
          const prev = messages[i-1];
          const curr = messages[i];
          const diff = curr.timestamp.getTime() - prev.timestamp.getTime();
          if (diff > 1000 * 60 * 60 * 2) {
            clusters.push(currentThreadMsgs);
            currentThreadMsgs = [curr];
          } else {
            currentThreadMsgs.push(currentThreadMsgs); // This is wrong, fixing below
          }
        }
        // Actually, let's just use a simpler filtering logic:
        // Find the start message and end message of the thread.
        const threadStartMsg = messages.find(m => m.id === activeThreadId);
        if (!threadStartMsg) return messages;
        const startIndex = messages.indexOf(threadStartMsg);
        let endIndex = messages.length;
        for (let i = startIndex + 1; i < messages.length; i++) {
          if (messages[i].timestamp.getTime() - messages[i-1].timestamp.getTime() > 1000 * 60 * 60 * 2) {
            endIndex = i;
            break;
          }
        }
        return messages.slice(startIndex, endIndex);
      })()
    : messages;

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    setAuthMessage(null);
  }, [isRegistering]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword.trim()) return;
    if (isRegistering && (!authName.trim() || !authSurname.trim() || !authAge.trim())) return;
    
    setAuthLoading(true);
    setAuthMessage(null);
    
    try {
      if (isRegistering) {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
          options: {
            data: {
              first_name: authName,
              last_name: authSurname,
              age: parseInt(authAge),
            }
          }
        });
        if (error) throw error;
        setAuthMessage({ 
          type: 'success', 
          text: '¡Cuenta creada! Revisa tu email para confirmar tu cuenta e iniciar sesión.' 
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
        setShowAuthModal(false);
      }
    } catch (error: any) {
      setAuthMessage({ 
        type: 'error', 
        text: error.message || 'Error en la autenticación.' 
      });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setMessages([]);
  };

  const togglePremium = async () => {
    if (!user) return;
    const newStatus = !isPremium;
    const { error } = await supabase.auth.updateUser({
      data: { is_premium: newStatus }
    });
    if (!error) {
      setIsPremium(newStatus);
      setShowPremiumModal(false);
    }
  };

  const handleSend = async (text: string = input) => {
    if (!text.trim() || isLoading) return;

    // Check limits for free users
    if (!isPremium && questionsToday >= 30) {
      setShowLimitModal(true);
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
      user_id: user?.id
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    if (user) {
      await saveMessage(userMessage);
      if (!isPremium) incrementDailyCount(user.id);
    }

    try {
      // Prepare history for Gemini (last 10 messages for context)
      const history: ChatMessage[] = messages.slice(-10).map(m => ({
        role: m.role === 'user' ? 'user' as const : 'model' as const,
        parts: [{ text: m.content }]
      }));

      // Prepare memories for Gemini
      const memoryList = memories.map(m => m.content);

      const response = await getMuftiResponse(text, history, memoryList, isPremium);
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response || 'Lo siento, no pude procesar tu solicitud en este momento.',
        timestamp: new Date(),
        user_id: user?.id
      };
      setMessages(prev => [...prev, assistantMessage]);
      if (user) await saveMessage(assistantMessage);
    } catch (error: any) {
      console.error('Error fetching response:', error);
      let errorMessageText = 'Hubo un error al conectar con Deenly.';
      
      if (error.message?.includes('Failed to fetch')) {
        errorMessageText += ' Error de conexión (Failed to fetch). Por favor, verifica tu conexión a internet o la configuración de las claves API.';
      } else {
        errorMessageText += ` Detalle: ${error.message || 'Error desconocido'}`;
      }

      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: errorMessageText,
        timestamp: new Date(),
        user_id: user?.id
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {showSplash && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-deenly-cream flex flex-col items-center justify-center p-8 text-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="space-y-6"
            >
              <div className="w-32 h-32 bg-deenly-green rounded-full flex items-center justify-center text-deenly-cream mx-auto shadow-2xl relative">
                <Sparkles size={64} />
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 border-2 border-deenly-gold/30 rounded-full border-dashed"
                />
              </div>
              <div className="space-y-2">
                <h1 className="text-6xl font-serif font-bold text-deenly-green tracking-tight">Deenly</h1>
                <p className="text-deenly-gold font-medium tracking-widest uppercase text-xs">Tu guía espiritual IA</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={cn(
        "flex h-screen w-full transition-colors duration-300 overflow-hidden",
        darkMode ? "bg-deenly-dark-bg text-deenly-dark-text" : "bg-deenly-cream text-deenly-green"
      )}>
      <AnimatePresence>
        {showPremiumModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-deenly-green/60 backdrop-blur-md"
            onClick={() => setShowPremiumModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={cn(
                "p-8 rounded-[2.5rem] max-w-md w-full shadow-2xl border border-deenly-gold/30 relative overflow-hidden",
                darkMode ? "bg-deenly-dark-surface" : "bg-white"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Decorative background */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-deenly-gold/10 rounded-full -mr-16 -mt-16 blur-3xl" />
              
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-deenly-gold flex items-center justify-center text-white mb-6 shadow-lg rotate-3">
                  <Sparkles size={32} />
                </div>
                
                <h3 className="text-3xl font-serif font-bold mb-2">Deenly Premium</h3>
                <p className="text-sm opacity-70 mb-8">Apoya la tecnología que guía tu camino espiritual.</p>
                
                <div className="space-y-4 mb-8">
                  {[
                    { icon: <Sparkles size={18} />, text: "Preguntas ilimitadas" },
                    { icon: <BookOpen size={18} />, text: "Respuestas con referencias" },
                    { icon: <History size={18} />, text: "Historial completo" },
                    { icon: <Send size={18} />, text: "Respuesta prioritaria" },
                    { icon: <Trash2 size={18} />, text: "Sin anuncios" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="text-deenly-gold">{item.icon}</div>
                      <span className="text-sm font-medium">{item.text}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-deenly-gold/10 p-4 rounded-2xl mb-8 border border-deenly-gold/20">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-deenly-gold mb-1">Inversión Sugerida</p>
                  <p className="text-2xl font-serif font-bold">$6.99 <span className="text-sm font-sans opacity-60">/ mes</span></p>
                  <p className="text-[10px] opacity-60 mt-1 italic">* Puedes cancelar en cualquier momento.</p>
                </div>

                <button 
                  onClick={togglePremium}
                  className="w-full py-4 bg-deenly-green text-deenly-cream rounded-full font-bold shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  {isPremium ? 'Gestionar Suscripción' : 'Obtener Premium'}
                  <ChevronRight size={20} />
                </button>
                
                <button 
                  onClick={() => setShowPremiumModal(false)}
                  className="w-full mt-4 py-2 text-xs opacity-40 hover:opacity-100 transition-opacity font-bold uppercase tracking-widest"
                >
                  Quizás más tarde
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLimitModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[65] flex items-center justify-center p-6 bg-deenly-green/40 backdrop-blur-sm"
            onClick={() => setShowLimitModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={cn(
                "p-8 rounded-[2.5rem] max-w-md w-full shadow-2xl border border-deenly-gold/30 text-center",
                darkMode ? "bg-deenly-dark-surface text-deenly-dark-text" : "bg-white text-deenly-green"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-20 h-20 bg-deenly-gold/10 rounded-full flex items-center justify-center text-deenly-gold mx-auto mb-6">
                <Sparkles size={40} />
              </div>
              <h3 className="text-2xl font-serif font-bold mb-3">Has alcanzado tus 30 preguntas gratuitas de hoy</h3>
              <p className="text-sm opacity-60 mb-8 leading-relaxed">
                Actualiza a Premium para preguntas ilimitadas y respuestas más detalladas.
              </p>
              
              <div className="space-y-3">
                <button 
                  onClick={() => { setShowLimitModal(false); setShowPremiumModal(true); }}
                  className="w-full py-4 bg-deenly-green text-deenly-cream rounded-full font-bold shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Actualizar a Premium
                </button>
                <button 
                  onClick={() => setShowLimitModal(false)}
                  className="w-full py-4 border border-deenly-gold/20 text-deenly-gold rounded-full font-bold hover:bg-deenly-gold/5 transition-all"
                >
                  Volver mañana
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMemoryModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-deenly-green/40 backdrop-blur-sm"
            onClick={() => setShowMemoryModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={cn(
                "p-8 rounded-3xl max-w-md w-full shadow-2xl border border-deenly-gold/20 flex flex-col max-h-[80vh]",
                darkMode ? "bg-deenly-dark-surface text-deenly-dark-text" : "bg-deenly-cream text-deenly-green"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-full bg-deenly-gold/10 text-deenly-gold">
                  <Brain size={24} />
                </div>
                <h3 className="text-3xl font-serif text-deenly-green">Memoria de Deenly</h3>
              </div>
              
              <p className="text-deenly-green/60 text-sm mb-6">
                Aquí puedes guardar datos sobre ti que Deenly recordará en todas tus conversaciones (ej: "Soy estudiante", "Vivo en México").
              </p>

              <div className="flex gap-2 mb-6">
                <input 
                  type="text" 
                  value={newMemory}
                  onChange={(e) => setNewMemory(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addMemory()}
                  placeholder="Añadir algo para recordar..."
                  className="flex-1 bg-white border border-deenly-gold/20 rounded-xl py-2 px-4 focus:outline-none focus:ring-2 focus:ring-deenly-gold/30 text-sm"
                />
                <button 
                  onClick={addMemory}
                  className="p-2 bg-deenly-green text-deenly-cream rounded-xl hover:bg-deenly-green/90 transition-all"
                >
                  <Plus size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
                {memories.length === 0 ? (
                  <div className="text-center py-8 text-deenly-green/30 italic text-sm">
                    No hay memorias guardadas aún.
                  </div>
                ) : (
                  memories.map((m) => (
                    <motion.div 
                      key={m.id}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border border-deenly-gold/10 group",
                        darkMode ? "bg-deenly-dark-bg" : "bg-white"
                      )}
                    >
                      <span className="text-sm text-deenly-green/80">{m.content}</span>
                      <button 
                        onClick={() => deleteMemory(m.id)}
                        className="p-1 text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-600 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </motion.div>
                  ))
                )}
              </div>

              <button 
                onClick={() => setShowMemoryModal(false)}
                className="w-full mt-6 py-3 bg-deenly-green text-deenly-cream rounded-full font-medium hover:bg-deenly-green/90 transition-all"
              >
                Cerrar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Modal */}
      <AnimatePresence>
        {showProfileModal && user && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-deenly-green/40 backdrop-blur-sm"
            onClick={() => setShowProfileModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={cn(
                "p-8 rounded-[2.5rem] max-w-md w-full shadow-2xl border border-deenly-gold/20",
                darkMode ? "bg-deenly-dark-surface text-deenly-dark-text" : "bg-white text-deenly-green"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-24 h-24 rounded-full bg-deenly-gold/10 flex items-center justify-center text-deenly-gold mb-4 border-2 border-deenly-gold/20">
                  <User size={48} />
                </div>
                <h3 className="text-2xl font-serif font-bold">{user.user_metadata?.name || 'Usuario'}</h3>
                <p className="text-sm opacity-50">{user.email}</p>
                <div className="mt-3 px-3 py-1 rounded-full bg-deenly-gold/10 text-deenly-gold text-[10px] font-bold uppercase tracking-widest border border-deenly-gold/20">
                  Plan {isPremium ? 'Premium' : 'Gratuito'}
                </div>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={() => { setShowProfileModal(false); scrollToBottom(); }}
                  className="w-full p-4 rounded-2xl border border-deenly-gold/10 flex items-center gap-3 hover:bg-deenly-gold/5 transition-all group"
                >
                  <History size={20} className="text-deenly-gold" />
                  <span className="flex-1 text-left font-medium">Ver historial de chat</span>
                  <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                <button 
                  onClick={() => { setShowProfileModal(false); setShowMemoryModal(true); }}
                  className="w-full p-4 rounded-2xl border border-deenly-gold/10 flex items-center gap-3 hover:bg-deenly-gold/5 transition-all group"
                >
                  <Brain size={20} className="text-deenly-gold" />
                  <span className="flex-1 text-left font-medium">Ver historial de memoria</span>
                  <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                
                <button 
                  onClick={() => { setShowProfileModal(false); setShowPremiumModal(true); }}
                  className="w-full p-4 rounded-2xl border border-deenly-gold/10 flex items-center gap-3 hover:bg-deenly-gold/5 transition-all group"
                >
                  <Sparkles size={20} className="text-deenly-gold" />
                  <span className="flex-1 text-left font-medium">{isPremium ? 'Gestionar plan' : 'Cambiar a Premium'}</span>
                  <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                <button 
                  onClick={() => { setShowProfileModal(false); handleLogout(); }}
                  className="w-full p-4 rounded-2xl border border-red-100 text-red-500 flex items-center gap-3 hover:bg-red-50 transition-all group"
                >
                  <LogOut size={20} />
                  <span className="flex-1 text-left font-medium">Cerrar sesión</span>
                </button>
              </div>

              <button 
                onClick={() => setShowProfileModal(false)}
                className="w-full mt-8 py-4 bg-deenly-green text-deenly-cream rounded-full font-bold shadow-lg hover:bg-deenly-green/90 transition-all"
              >
                Aceptar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-deenly-green/40 backdrop-blur-sm"
            onClick={() => setShowAuthModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={cn(
                "p-8 rounded-[2.5rem] max-w-md w-full shadow-2xl border border-deenly-gold/20",
                darkMode ? "bg-deenly-dark-surface text-deenly-dark-text" : "bg-white text-deenly-green"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-deenly-green rounded-2xl flex items-center justify-center text-deenly-cream mx-auto mb-6 shadow-xl rotate-3">
                  <Sparkles size={32} />
                </div>
                <h3 className="text-3xl font-serif font-bold">
                  {isRegistering ? 'Crear cuenta' : 'Bienvenido a Deenly'}
                </h3>
                <p className="text-sm opacity-50 mt-2">
                  {isRegistering 
                    ? 'Únete a nuestra comunidad espiritual.' 
                    : 'Tu guía islámica con inteligencia artificial.'}
                </p>
              </div>

              {authMessage ? (
                <div className={cn(
                  "p-4 rounded-2xl mb-6 text-sm text-center",
                  authMessage.type === 'success' ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-700 border border-red-100"
                )}>
                  <p className="font-bold mb-1">{authMessage.type === 'success' ? '¡Éxito!' : 'Atención'}</p>
                  <p className="opacity-90 leading-relaxed">
                    {authMessage.text === 'Invalid login credentials' 
                      ? 'Email o contraseña incorrectos. Si no tienes cuenta, pulsa en "Soy nuevo" arriba.' 
                      : authMessage.text}
                  </p>
                  {authMessage.type === 'success' && (
                    <button 
                      onClick={() => {
                        setShowAuthModal(false);
                        setAuthMessage(null);
                      }}
                      className="block w-full mt-4 py-2 bg-emerald-600 text-white rounded-full font-medium"
                    >
                      Entendido
                    </button>
                  )}
                  {authMessage.type === 'error' && (
                    <button 
                      onClick={() => setAuthMessage(null)}
                      className="block w-full mt-4 py-2 bg-red-600 text-white rounded-full font-medium"
                    >
                      Reintentar
                    </button>
                  )}
                </div>
              ) : (
                <form onSubmit={handleAuth} className="space-y-4">
                  {isRegistering && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest font-bold text-deenly-green/40 mb-1 ml-2">Nombre</label>
                        <input 
                          type="text" 
                          required
                          value={authName}
                          onChange={(e) => setAuthName(e.target.value)}
                          placeholder="Tu nombre"
                          className="w-full bg-white border border-deenly-gold/20 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-deenly-gold/30 text-deenly-green text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest font-bold text-deenly-green/40 mb-1 ml-2">Apellido</label>
                        <input 
                          type="text" 
                          required
                          value={authSurname}
                          onChange={(e) => setAuthSurname(e.target.value)}
                          placeholder="Tu apellido"
                          className="w-full bg-white border border-deenly-gold/20 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-deenly-gold/30 text-deenly-green text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] uppercase tracking-widest font-bold text-deenly-green/40 mb-1 ml-2">Edad</label>
                        <input 
                          type="number" 
                          required
                          min="1"
                          max="120"
                          value={authAge}
                          onChange={(e) => setAuthAge(e.target.value)}
                          placeholder="Tu edad"
                          className="w-full bg-white border border-deenly-gold/20 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-deenly-gold/30 text-deenly-green text-sm"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-bold text-deenly-green/40 mb-1 ml-2">Email</label>
                    <input 
                      type="email" 
                      required
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="tu@email.com"
                      className="w-full bg-white border border-deenly-gold/20 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-deenly-gold/30 text-deenly-green text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-bold text-deenly-green/40 mb-1 ml-2">Contraseña</label>
                    <input 
                      type="password" 
                      required
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-white border border-deenly-gold/20 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-deenly-gold/30 text-deenly-green text-sm"
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3 bg-deenly-green text-deenly-cream rounded-full font-medium hover:bg-deenly-green/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {authLoading ? 'Procesando...' : (isRegistering ? 'Crear cuenta' : 'Entrar')}
                    {!authLoading && <ChevronRight size={18} />}
                  </button>

                  <div className="flex flex-col gap-3 mt-4">
                    <button
                      type="button"
                      onClick={() => setIsRegistering(!isRegistering)}
                      className="text-xs text-deenly-green/60 hover:text-deenly-green transition-colors font-medium"
                    >
                      {isRegistering ? '¿Ya tienes cuenta? Iniciar sesión' : '¿No tienes cuenta? Crear cuenta'}
                    </button>

                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-px bg-deenly-gold/10" />
                      <span className="text-[10px] text-deenly-green/20 font-bold uppercase tracking-widest">O</span>
                      <div className="flex-1 h-px bg-deenly-gold/10" />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setUser({ id: 'guest', email: 'invitado@deenly.app', is_guest: true });
                        setShowAuthModal(false);
                      }}
                      className="text-xs text-deenly-green/40 font-bold hover:text-deenly-green transition-colors"
                    >
                      Continuar como Invitado (Sin guardado)
                    </button>
                  </div>
                </form>
              )}
              
              <button 
                onClick={() => setShowAuthModal(false)}
                className="w-full mt-4 py-2 text-deenly-green/40 text-xs hover:text-deenly-green transition-colors"
              >
                Cancelar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Modal */}
      <AnimatePresence>
        {showInfo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-deenly-green/40 backdrop-blur-sm"
            onClick={() => setShowInfo(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-deenly-cream p-8 rounded-3xl max-w-md w-full shadow-2xl border border-deenly-gold/20"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-3xl font-serif text-deenly-green mb-4">Sobre Deenly</h3>
              <div className="space-y-4 text-deenly-green/80 leading-relaxed">
                <p>
                  Deenly es tu compañero digital para explorar la sabiduría del Islam. 
                  Utilizamos inteligencia artificial avanzada para proporcionar respuestas basadas en el Corán y la Sunnah.
                </p>
                <div className="p-4 bg-deenly-gold/10 rounded-2xl border border-deenly-gold/20">
                  <p className="text-xs font-semibold text-deenly-gold uppercase tracking-wider mb-2">Aviso Importante</p>
                  <p className="text-sm italic">
                    Aunque Deenly se esfuerza por ser preciso, no es un sustituto de un erudito calificado. 
                    Para asuntos legales complejos o decisiones de vida críticas, por favor consulta con tu imán local.
                  </p>
                </div>
                <button 
                  onClick={() => setShowInfo(false)}
                  className="w-full py-3 bg-deenly-green text-deenly-cream rounded-full font-medium hover:bg-deenly-green/90 transition-all"
                >
                  Entendido
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

        {/* Main Chat Area */}
        <div className={cn(
          "flex-1 flex flex-col h-full transition-all duration-300 relative",
          showSidebar ? "mr-0" : "mr-0"
        )}>
          {/* Header */}
          <header className={cn(
            "px-6 py-4 border-b border-deenly-gold/20 flex items-center justify-between backdrop-blur-md sticky top-0 z-10 transition-colors",
            darkMode ? "bg-deenly-dark-surface/80" : "bg-white/50"
          )}>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowSidebar(!showSidebar)}
                className="p-2 hover:bg-deenly-gold/10 rounded-lg transition-colors text-deenly-gold"
                title="Toggle Sidebar"
              >
                <Plus size={20} className={cn("transition-transform", showSidebar && "rotate-45")} />
              </button>
              <div className="w-10 h-10 rounded-full bg-deenly-green flex items-center justify-center text-deenly-cream shadow-lg shadow-deenly-green/20">
                <Sparkles size={20} />
              </div>
              <div>
                <h1 className="text-2xl font-serif font-bold text-deenly-green leading-none flex items-center gap-2">
                  Deenly
                  {isPremium && (
                    <span className="text-[10px] bg-deenly-gold text-white px-2 py-0.5 rounded-full font-sans uppercase tracking-widest">Premium</span>
                  )}
                </h1>
                <p className="text-[10px] uppercase tracking-widest text-deenly-gold font-semibold">Tu Guía Espiritual IA</p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              {isPremium && (
                <button 
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-2 text-deenly-green/60 hover:text-deenly-green transition-colors"
                  title="Cambiar tema"
                >
                  {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
              )}
              
              {!isPremium && user && (
                <button 
                  onClick={() => setShowPremiumModal(true)}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-deenly-gold/10 text-deenly-gold hover:bg-deenly-gold/20 transition-all text-[10px] font-bold border border-deenly-gold/20 uppercase tracking-widest"
                >
                  <Sparkles size={12} />
                  Premium
                </button>
              )}

              {user ? (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowProfileModal(true)}
                    className="w-8 h-8 rounded-full bg-deenly-gold/20 flex items-center justify-center text-deenly-gold border border-deenly-gold/30 overflow-hidden hover:bg-deenly-gold/30 transition-all"
                    title="Perfil"
                  >
                    <User size={16} />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-deenly-gold/10 text-deenly-gold hover:bg-deenly-gold/20 transition-all text-sm font-medium border border-deenly-gold/20"
                >
                  <LogIn size={16} />
                  <span className="hidden sm:inline">Entrar</span>
                </button>
              )}
              <div className="w-px h-6 bg-deenly-gold/20 mx-1" />
              <button 
                onClick={() => setShowInfo(true)}
                className="p-2 text-deenly-green/60 hover:text-deenly-green transition-colors"
                title="Información"
              >
                <Info size={20} />
              </button>
            </div>
          </header>

      {/* Main Content */}
      <main className={cn(
        "flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide relative",
        darkMode ? "bg-deenly-dark-bg" : "bg-deenly-cream"
      )}>
        {isHistoryLoading ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4 opacity-40">
            <div className="w-12 h-12 border-4 border-deenly-gold/20 border-t-deenly-gold rounded-full animate-spin" />
            <p className="text-xs font-bold uppercase tracking-widest">Cargando historial...</p>
          </div>
        ) : (
          <>
            {!isPremium && user && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
                <div className="px-4 py-1.5 rounded-full bg-white/80 backdrop-blur-sm border border-deenly-gold/20 shadow-sm flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-deenly-gold animate-pulse" />
                  <span className="text-[10px] font-bold text-deenly-green/60 uppercase tracking-widest">
                    Preguntas hoy: {questionsToday} / 30
                  </span>
                  <button 
                    onClick={() => setShowPremiumModal(true)}
                    className="text-[10px] font-bold text-deenly-gold hover:underline uppercase tracking-widest"
                  >
                    Ilimitado
                  </button>
                </div>
              </div>
            )}
            {!user && (
              <div className="absolute inset-0 z-20 bg-deenly-cream/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="max-w-sm space-y-6"
                >
                  <div className="w-20 h-20 bg-deenly-gold/10 rounded-full flex items-center justify-center text-deenly-gold mx-auto">
                    <LogIn size={40} />
                  </div>
                  <h2 className="text-3xl font-serif text-deenly-green">Acceso Requerido</h2>
                  <p className="text-deenly-green/60 leading-relaxed">
                    Para garantizar la privacidad y permitir que Deenly recuerde tus conversaciones, por favor inicia sesión.
                  </p>
                  <button 
                    onClick={() => setShowAuthModal(true)}
                    className="w-full py-4 bg-deenly-green text-deenly-cream rounded-full font-bold shadow-xl hover:bg-deenly-green/90 transition-all flex items-center justify-center gap-2"
                  >
                    Iniciar Sesión / Registrarse
                    <ChevronRight size={20} />
                  </button>
                </motion.div>
              </div>
            )}
            {filteredMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center space-y-8 py-12">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center space-y-4 max-w-md"
                >
                  <div className="inline-block p-4 rounded-full bg-deenly-gold/10 text-deenly-gold mb-2">
                    <BookOpen size={48} strokeWidth={1.5} />
                  </div>
                  <h2 className="text-4xl font-serif text-deenly-green italic">As-salamu alaykum</h2>
                  <p className="text-deenly-green/70 leading-relaxed">
                    Bienvenido a Deenly. Soy tu asistente digital para consultas sobre el Islam. ¿En qué puedo ayudarte hoy?
                  </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                  {SUGGESTED_QUESTIONS.map((q, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      onClick={() => handleSend(q)}
                      className="text-left p-4 rounded-2xl border border-deenly-gold/20 bg-white hover:bg-deenly-gold/5 hover:border-deenly-gold/40 transition-all group flex items-center justify-between"
                    >
                      <span className="text-sm text-deenly-green/80 group-hover:text-deenly-green">{q}</span>
                      <ChevronRight size={16} className="text-deenly-gold opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6 pb-4">
                <AnimatePresence initial={false}>
                  {filteredMessages.map((m) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex w-full",
                        m.role === 'user' ? "justify-end" : "justify-start"
                      )}
                    >
                      <div className={cn(
                        "max-w-[85%] p-5 rounded-3xl shadow-sm",
                        m.role === 'user' 
                          ? "bg-deenly-green text-deenly-cream rounded-tr-none" 
                          : cn(
                              "rounded-tl-none border border-deenly-gold/10",
                              darkMode ? "bg-deenly-dark-surface text-deenly-dark-text" : "bg-white text-deenly-green"
                            )
                      )}>
                        <div className="markdown-body text-sm md:text-base">
                          <Markdown>{m.content}</Markdown>
                        </div>
                        <div className={cn(
                          "text-[10px] mt-2 opacity-50",
                          m.role === 'user' ? "text-right" : "text-left"
                        )}>
                          {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {isLoading && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="bg-white p-4 rounded-3xl border border-deenly-gold/10 flex items-center gap-2">
                      <div className="w-2 h-2 bg-deenly-gold rounded-full animate-bounce" style={{ animationDelay: '0ms' }} style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-deenly-gold rounded-full animate-bounce" style={{ animationDelay: '150ms' }} style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-deenly-gold rounded-full animate-bounce" style={{ animationDelay: '300ms' }} style={{ animationDelay: '300ms' }} />
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </>
        )}
      </main>

      {/* Input Area */}
      <footer className={cn(
        "p-6 border-t border-deenly-gold/10 transition-all",
        darkMode ? "bg-deenly-dark-surface/80" : "bg-white/80",
        "backdrop-blur-md",
        !user && "opacity-50 pointer-events-none grayscale"
      )}>
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="relative flex items-center max-w-4xl mx-auto w-full"
        >
          <input
            type="text"
            disabled={!user}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={user ? "Escribe tu pregunta sobre Islam..." : "Inicia sesión para preguntar"}
            className={cn(
              "w-full border border-deenly-gold/20 rounded-full py-4 pl-6 pr-14 focus:outline-none focus:ring-2 focus:ring-deenly-gold/30 focus:border-deenly-gold/50 transition-all placeholder:text-deenly-green/40",
              darkMode ? "bg-deenly-dark-bg text-deenly-dark-text" : "bg-deenly-cream/50 text-deenly-green"
            )}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 p-3 bg-deenly-green text-deenly-cream rounded-full hover:bg-deenly-green/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
          >
            <Send size={20} />
          </button>
        </form>
        <p className="text-center text-[10px] text-deenly-green/40 mt-4 uppercase tracking-widest font-medium">
          Deenly es una IA. Consulta con un erudito para asuntos legales críticos.
        </p>
      </footer>
    </div>

    {/* Right Sidebar (History) */}
    <AnimatePresence>
      {showSidebar && (
        <motion.aside
          initial={{ x: 320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 320, opacity: 0 }}
          className={cn(
            "w-80 border-l border-deenly-gold/20 flex flex-col h-full transition-colors",
            darkMode ? "bg-deenly-dark-surface" : "bg-white"
          )}
        >
          <div className="p-6 flex-1 flex flex-col overflow-hidden">
            <button 
              onClick={clearMessages}
              className="w-full py-3 px-4 rounded-xl border border-deenly-gold/20 flex items-center gap-3 hover:bg-deenly-gold/5 transition-all mb-6 group"
            >
              <Plus size={18} className="text-deenly-gold" />
              <span className="text-sm font-bold uppercase tracking-widest">Nuevo Chat</span>
            </button>

            <div className="relative mb-6">
              <input 
                type="text" 
                placeholder="Buscar en los chats"
                className={cn(
                  "w-full py-2 pl-10 pr-4 rounded-xl text-xs border border-deenly-gold/10 focus:outline-none focus:ring-1 focus:ring-deenly-gold/30",
                  darkMode ? "bg-deenly-dark-bg" : "bg-deenly-cream"
                )}
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-deenly-gold/40">
                <History size={14} />
              </div>
            </div>

            <div className="space-y-1 mb-8">
              <button className="w-full p-3 rounded-xl flex items-center gap-3 hover:bg-deenly-gold/5 transition-all text-sm opacity-70 hover:opacity-100">
                <div className="text-deenly-gold"><BookOpen size={16} /></div>
                <span className="font-medium">Corán</span>
              </button>
              <button className="w-full p-3 rounded-xl flex items-center gap-3 hover:bg-deenly-gold/5 transition-all text-sm opacity-70 hover:opacity-100">
                <div className="text-deenly-gold"><MessageSquare size={16} /></div>
                <span className="font-medium">Hadices</span>
              </button>
              <button 
                onClick={() => setShowMemoryModal(true)}
                className="w-full p-3 rounded-xl flex items-center gap-3 hover:bg-deenly-gold/5 transition-all text-sm opacity-70 hover:opacity-100"
              >
                <div className="text-deenly-gold"><Brain size={16} /></div>
                <span className="font-medium">Memoria</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide">
              <h4 className="text-[10px] uppercase tracking-widest font-bold text-deenly-gold/40 mb-4 px-2">Tus chats</h4>
              <div className="space-y-2">
                {messages.length > 0 ? (
                  <button className="w-full p-3 rounded-xl bg-deenly-gold/10 border border-deenly-gold/20 text-left transition-all">
                    <p className="text-sm font-bold truncate">Chat actual</p>
                    <p className="text-[10px] opacity-50 mt-1">{messages.length} mensajes</p>
                  </button>
                ) : (
                  <p className="text-xs text-center opacity-30 py-8">No hay chats recientes</p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Footer */}
          <div className="p-6 border-t border-deenly-gold/10">
            {user ? (
              <button 
                onClick={() => setShowProfileModal(true)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-deenly-gold/5 transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-deenly-gold/20 flex items-center justify-center text-deenly-gold border border-deenly-gold/30">
                  <User size={20} />
                </div>
                <div className="flex-1 text-left overflow-hidden">
                  <p className="text-sm font-bold truncate">{user.user_metadata?.name || 'Usuario'}</p>
                  <p className="text-[10px] opacity-50 uppercase tracking-widest">{isPremium ? 'Premium' : 'Gratis'}</p>
                </div>
              </button>
            ) : (
              <button 
                onClick={() => setShowAuthModal(true)}
                className="w-full py-3 bg-deenly-green text-deenly-cream rounded-xl font-bold text-sm shadow-lg"
              >
                Iniciar Sesión
              </button>
            )}
            
            {!isPremium && user && (
              <button 
                onClick={() => setShowPremiumModal(true)}
                className="w-full mt-4 py-3 border border-deenly-gold/30 rounded-xl text-deenly-gold font-bold text-xs uppercase tracking-widest hover:bg-deenly-gold/5 transition-all"
              >
                Actualizar
              </button>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  </div>
    </>
  );
}
