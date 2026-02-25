/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Moon, Sun, BookOpen, MessageSquare, Info, Sparkles, ChevronRight, History, LogIn, LogOut, User, Brain, Trash2, Plus, Check, X, AlertTriangle, Clock, CreditCard, PauseCircle, ShieldCheck, Bell, Share2, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { getMuftiResponse, type ChatMessage } from './services/geminiService';
import { supabase } from './services/supabaseClient';
import { loadStripe } from '@stripe/stripe-js';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { Logo } from './components/Logo';
import { HADITH_COLLECTIONS, type Hadith } from './data/hadiths';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  user_id?: string;
  is_starred?: boolean;
}

interface Memory {
  id: string;
  content: string;
  created_at: string;
}

interface Reminder {
  id: string;
  text: string;
  dueDate: Date;
  completed: boolean;
  notified: boolean;
}

const COMMON_QUESTIONS = [
  {
    category: "Corán",
    icon: BookOpen,
    questions: [
      "¿Cuál es el mensaje principal del Corán?",
      "¿Cómo se dividen las Suras en el Corán?",
      "¿Qué dice el Corán sobre la creación del universo?",
      "Explícame el concepto de 'Tawhid' en el Corán."
    ]
  },
  {
    category: "Sunnah",
    icon: History,
    questions: [
      "¿Qué es la Sunnah y por qué es importante?",
      "Dime un Hadiz sobre la importancia de la educación.",
      "¿Cómo era el carácter del Profeta Muhammad (SAW)?",
      "¿Cuáles son los beneficios de seguir la Sunnah?"
    ]
  },
  {
    category: "Fiqh",
    icon: Brain,
    questions: [
      "¿Cuáles son los pilares del Islam?",
      "¿Cómo se realiza correctamente el Wudu?",
      "¿Qué invalida el ayuno en Ramadán?",
      "Explícame las reglas básicas del Zakat."
    ]
  }
];

const SUGGESTED_QUESTIONS = [
  "¿Cómo puedo mejorar mi concentración en el Salah?",
  "Explícame la importancia de la paciencia (Sabr) en el Islam.",
  "¿Qué dice el Corán sobre el trato a los padres?",
  "Dime un Hadiz sobre la amabilidad.",
];

const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse bg-deenly-gold/10 rounded-lg", className)} />
);

const PremiumSpinner = () => (
  <div className="flex flex-col items-center justify-center space-y-6">
    <div className="relative">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        className="w-20 h-20 rounded-full border-2 border-deenly-gold/10 border-t-deenly-gold"
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <Logo size={48} />
      </div>
    </div>
    <div className="text-center">
      <Logo showText size={0} className="justify-center" />
      <p className="text-[10px] text-deenly-green/40 mt-2">Preparando tu espacio espiritual...</p>
    </div>
  </div>
);

const STRIPE_PRICE_MONTHLY = 'price_1T40qMDlissxr9xdar8montv';
const STRIPE_PRICE_YEARLY = 'price_1T40s4Dlissxr9xdjnhaHivD';

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Assalamu alaikum. Soy Deenly, tu asistente educativo islámico. Puedo ayudarte a entender el Islam con claridad y respeto. Para asuntos personales o legales, consulta siempre a un erudito cualificado.',
      timestamp: new Date()
    }
  ]);
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
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [questionsToday, setQuestionsToday] = useState(0);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelStep, setCancelStep] = useState<'reason' | 'offer' | 'confirm'>('reason');
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [threadToDelete, setThreadToDelete] = useState<string | null>(null);
  const [showHadithLibrary, setShowHadithLibrary] = useState(false);
  const [selectedHadith, setSelectedHadith] = useState<Hadith | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showRemindersModal, setShowRemindersModal] = useState(false);
  const [newReminderText, setNewReminderText] = useState('');
  const [newReminderDate, setNewReminderDate] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get('success') === 'true') {
      const sessionId = query.get('session_id');
      if (sessionId) {
        // Refresh session to get updated metadata
        supabase.auth.refreshSession().then(({ data }) => {
          if (data.user?.user_metadata?.is_premium) {
            setIsPremium(true);
          } else {
            // Fallback to optimistic update if refresh hasn't caught up yet
            setIsPremium(true);
          }
        });
        alert('¡Bienvenido a Deenly Premium! Tu suscripción ha sido activada.');
        // Clean up URL
        window.history.replaceState({}, document.title, "/");
      }
    } else if (query.get('success') === 'false') {
      alert('El pago fue cancelado. Puedes intentarlo de nuevo cuando quieras.');
      window.history.replaceState({}, document.title, "/");
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      setReminders(prev => prev.map(reminder => {
        if (!reminder.completed && !reminder.notified && new Date(reminder.dueDate) <= now) {
          if (Notification.permission === "granted") {
            new Notification("Recordatorio de Deenly", {
              body: reminder.text,
              icon: "/favicon.ico"
            });
          }
          return { ...reminder, notified: true };
        }
        return reminder;
      }));
    };

    const interval = setInterval(checkReminders, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [reminders]);

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

  const addReminder = () => {
    if (!newReminderText || !newReminderDate || !newReminderTime) return;
    
    const dueDate = new Date(`${newReminderDate}T${newReminderTime}`);
    const reminder: Reminder = {
      id: crypto.randomUUID(),
      text: newReminderText,
      dueDate,
      completed: false,
      notified: false
    };
    
    setReminders(prev => [...prev, reminder]);
    setNewReminderText('');
    setNewReminderDate('');
    setNewReminderTime('');
  };

  const toggleReminder = (id: string) => {
    setReminders(prev => prev.map(r => r.id === id ? { ...r, completed: !r.completed } : r));
  };

  const deleteReminder = (id: string) => {
    setReminders(prev => prev.filter(r => r.id !== id));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleShare = async (text: string, id: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Respuesta de Deenly',
          text: text,
          url: window.location.href
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          copyToClipboard(text, id);
        }
      }
    } else {
      copyToClipboard(text, id);
    }
  };

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
      const loadedMessages = data.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: new Date(m.created_at),
        user_id: m.user_id
      }));
      
      if (loadedMessages.length === 0) {
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: 'Assalamu alaikum. Soy Deenly, tu asistente educativo islámico. Puedo ayudarte a entender el Islam con claridad y respeto. Para asuntos personales o legales, consulta siempre a un erudito cualificado.',
          timestamp: new Date()
        }]);
      } else {
        setMessages(loadedMessages);
      }
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
    const welcomeMsg: Message = {
      id: 'welcome',
      role: 'assistant',
      content: 'Assalamu alaikum. Soy Deenly, tu asistente educativo islámico. Puedo ayudarte a entender el Islam con claridad y respeto. Para asuntos personales o legales, consulta siempre a un erudito cualificado.',
      timestamp: new Date()
    };

    if (!user) {
      setMessages([welcomeMsg]);
      setShowClearAllConfirm(false);
      return;
    }

    if (user.id !== 'guest') {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error clearing messages:', error);
        setShowClearAllConfirm(false);
        return;
      }
    }
    
    setMessages([welcomeMsg]);
    setShowClearAllConfirm(false);
  };

  const deleteThread = (threadId: string) => {
    setThreadToDelete(threadId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteThread = async () => {
    if (!threadToDelete) return;

    const threadStartMsg = messages.find(m => m.id === threadToDelete);
    if (!threadStartMsg) {
      setShowDeleteConfirm(false);
      setThreadToDelete(null);
      return;
    }

    const startIndex = messages.indexOf(threadStartMsg);
    let endIndex = messages.length;
    for (let i = startIndex + 1; i < messages.length; i++) {
      if (messages[i].timestamp.getTime() - messages[i-1].timestamp.getTime() > 1000 * 60 * 60 * 2) {
        endIndex = i;
        break;
      }
    }

    const threadMessages = messages.slice(startIndex, endIndex);
    const messageIds = threadMessages.map(m => m.id);

    if (user && user.id !== 'guest') {
      const { error } = await supabase
        .from('messages')
        .delete()
        .in('id', messageIds);
      
      if (error) {
        console.error('Error deleting thread:', error);
        setShowDeleteConfirm(false);
        setThreadToDelete(null);
        return;
      }
    }

    setMessages(prev => prev.filter(m => !messageIds.includes(m.id)));
    if (activeThreadId === threadToDelete) {
      setActiveThreadId(null);
    }
    setShowDeleteConfirm(false);
    setThreadToDelete(null);
  };

  const toggleStarThread = async (threadId: string) => {
    const threadStartMsg = messages.find(m => m.id === threadId);
    if (!threadStartMsg) return;

    const isCurrentlyStarred = threadStartMsg.is_starred;
    const startIndex = messages.indexOf(threadStartMsg);
    let endIndex = messages.length;
    for (let i = startIndex + 1; i < messages.length; i++) {
      if (messages[i].timestamp.getTime() - messages[i-1].timestamp.getTime() > 1000 * 60 * 60 * 2) {
        endIndex = i;
        break;
      }
    }

    const threadMessages = messages.slice(startIndex, endIndex);
    const messageIds = threadMessages.map(m => m.id);

    if (user && user.id !== 'guest') {
      const { error } = await supabase
        .from('messages')
        .update({ is_starred: !isCurrentlyStarred })
        .in('id', messageIds);
      
      if (error) {
        console.error('Error toggling star:', error);
        // Continue anyway to update local state
      }
    }

    setMessages(prev => prev.map(m => 
      messageIds.includes(m.id) ? { ...m, is_starred: !isCurrentlyStarred } : m
    ));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const groupMessagesIntoThreads = (msgs: Message[]) => {
    const threads: { id: string, title: string, date: Date, messageCount: number, isStarred: boolean }[] = [];
    if (msgs.length === 0) return threads;

    let currentThreadMsgs: Message[] = [msgs[0]];
    
    const pushThread = (msgs: Message[]) => {
      const userMsg = msgs.find(m => m.role === 'user');
      threads.push({
        id: msgs[0].id,
        title: userMsg ? userMsg.content.substring(0, 40) + (userMsg.content.length > 40 ? '...' : '') : 'Conversación',
        date: msgs[0].timestamp,
        messageCount: msgs.length,
        isStarred: msgs.some(m => m.is_starred)
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

  const chatThreads = groupMessagesIntoThreads(messages)
    .filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (a.isStarred && !b.isStarred) return -1;
      if (!a.isStarred && b.isStarred) return 1;
      return 0; // Maintain date sorting within groups
    });
  
  const filteredMessages = activeThreadId 
    ? (() => {
        if (activeThreadId === 'new') return [];
        
        const threadStartMsg = messages.find(m => m.id === activeThreadId);
        if (!threadStartMsg) return [];
        
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
    : (() => {
        if (messages.length === 0) return [];
        
        // Check if latest thread is "active" (last message < 2h ago)
        const lastMsg = messages[messages.length - 1];
        const now = new Date();
        if (now.getTime() - lastMsg.timestamp.getTime() > 1000 * 60 * 60 * 2) {
          return [];
        }

        let lastThreadStart = 0;
        for (let i = 1; i < messages.length; i++) {
          if (messages[i].timestamp.getTime() - messages[i-1].timestamp.getTime() > 1000 * 60 * 60 * 2) {
            lastThreadStart = i;
          }
        }
        return messages.slice(lastThreadStart);
      })();

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
    
    const priceId = billingCycle === 'monthly' ? STRIPE_PRICE_MONTHLY : STRIPE_PRICE_YEARLY;
    
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          userId: user.id,
          userEmail: user.email,
        }),
      });

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          throw new Error(data.error || 'No se pudo crear la sesión de pago');
        }
      } else {
        const text = await response.text();
        throw new Error(text || `Error del servidor (${response.status})`);
      }
    } catch (error: any) {
      console.error('Error in Stripe checkout:', error);
      alert(`Error al iniciar el pago: ${error.message}`);
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
    setActiveThreadId(null);

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
        "flex h-screen w-full transition-colors duration-300 overflow-hidden relative",
        darkMode ? "bg-deenly-dark-bg text-deenly-dark-text" : "bg-deenly-cream text-deenly-green"
      )}>
      <AnimatePresence>
        {showPremiumModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-deenly-green/80 backdrop-blur-md overflow-y-auto"
            onClick={() => setShowPremiumModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={cn(
                "max-w-4xl w-full shadow-2xl rounded-[2.5rem] overflow-hidden relative",
                darkMode ? "bg-deenly-dark-surface" : "bg-white"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Section */}
              <div className="bg-deenly-green p-8 sm:p-12 text-center text-deenly-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full islamic-pattern opacity-10" />
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="relative z-10"
                >
                  <h3 className="text-3xl sm:text-4xl font-serif font-bold mb-4">Accede al conocimiento sin límites</h3>
                  <p className="text-deenly-white/80 max-w-xl mx-auto text-sm sm:text-base">
                    Profundiza en tu fe con respuestas más detalladas, sin límites diarios.
                  </p>
                  <div className="mt-6 flex items-center justify-center gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-deenly-gold">
                    <Sparkles size={14} />
                    <span>Más claridad. Más aprendizaje. Más crecimiento espiritual.</span>
                  </div>
                </motion.div>
              </div>

              {/* Comparison Section */}
              <div className="p-6 sm:p-10">
                {/* Billing Toggle */}
                <div className="flex justify-center mb-10">
                  <div className={cn(
                    "p-1 rounded-2xl flex items-center gap-1 border border-deenly-gold/20",
                    darkMode ? "bg-deenly-dark-bg" : "bg-deenly-cream/50"
                  )}>
                    <button
                      onClick={() => setBillingCycle('monthly')}
                      className={cn(
                        "px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                        billingCycle === 'monthly' 
                          ? "bg-deenly-green text-deenly-white shadow-lg" 
                          : "text-deenly-green/40 hover:text-deenly-green"
                      )}
                    >
                      Mensual
                    </button>
                    <button
                      onClick={() => setBillingCycle('yearly')}
                      className={cn(
                        "px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all relative",
                        billingCycle === 'yearly' 
                          ? "bg-deenly-green text-deenly-white shadow-lg" 
                          : "text-deenly-green/40 hover:text-deenly-green"
                      )}
                    >
                      Anual
                      <span className="absolute -top-2 -right-2 bg-deenly-gold text-white text-[8px] px-1.5 py-0.5 rounded-full animate-pulse">
                        -30%
                      </span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                  {/* Free Plan */}
                  <div className={cn(
                    "p-8 rounded-3xl border border-deenly-gold/10 flex flex-col",
                    darkMode ? "bg-deenly-dark-bg/50" : "bg-deenly-cream/30"
                  )}>
                    <h4 className="text-xl font-serif text-deenly-green mb-6">Plan Gratuito</h4>
                    <ul className="space-y-4 mb-8 flex-1">
                      {[
                        { text: "30 preguntas al día", included: true },
                        { text: "Respuestas estándar", included: true },
                        { text: "Sin historial ilimitado", included: false },
                        { text: "Publicidad futura", included: false },
                      ].map((item, i) => (
                        <li key={i} className="flex items-center gap-3 text-sm">
                          {item.included ? <Check size={16} className="text-deenly-green" /> : <X size={16} className="text-deenly-green/30" />}
                          <span className={cn(item.included ? "text-deenly-green" : "text-deenly-green/40")}>{item.text}</span>
                        </li>
                      ))}
                    </ul>
                    <button 
                      onClick={() => setShowPremiumModal(false)}
                      className="w-full py-3 text-xs font-bold uppercase tracking-widest text-deenly-green/40 hover:text-deenly-green transition-colors"
                    >
                      Seguir gratis
                    </button>
                  </div>

                  {/* Premium Plan */}
                  <div className={cn(
                    "p-8 rounded-3xl border-2 border-deenly-gold shadow-2xl relative flex flex-col transform md:scale-105 z-10",
                    darkMode ? "bg-deenly-dark-surface" : "bg-white"
                  )}>
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-deenly-gold text-white px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg">
                      ⭐ Más Popular
                    </div>
                    <h4 className="text-xl font-serif text-deenly-green mb-6 flex items-center gap-2">
                      Plan Premium
                    </h4>
                    <ul className="space-y-4 mb-8 flex-1">
                      {[
                        "Preguntas ilimitadas",
                        "Respuestas más detalladas",
                        "Prioridad en generación",
                        "Historial completo",
                        "Sin anuncios",
                        "Funciones exclusivas",
                      ].map((text, i) => (
                        <li key={i} className="flex items-center gap-3 text-sm">
                          <Check size={16} className="text-deenly-gold" />
                          <span className="text-deenly-green font-medium">{text}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <div className="mb-8 text-center">
                      <AnimatePresence mode="wait">
                        <motion.div 
                          key={billingCycle}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="flex flex-col items-center"
                        >
                          <div className="flex items-baseline justify-center gap-1">
                            <span className="text-4xl font-serif font-bold text-deenly-green">
                              {billingCycle === 'monthly' ? '4,99 €' : '39,99 €'}
                            </span>
                            <span className="text-sm text-deenly-green/40">
                              {billingCycle === 'monthly' ? '/ mes' : '/ año'}
                            </span>
                          </div>
                          <p className="text-[10px] font-bold text-deenly-gold uppercase tracking-widest mt-1">
                            {billingCycle === 'monthly' 
                              ? 'Cobrado mensualmente' 
                              : 'Ahorra 30% con el plan anual'}
                          </p>
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    <button 
                      onClick={togglePremium}
                      className="w-full py-4 bg-deenly-green text-deenly-white rounded-2xl font-bold shadow-xl hover:bg-deenly-green/90 transition-all flex items-center justify-center gap-2"
                    >
                      {isPremium ? 'Gestionar Suscripción' : 'Activar Premium'}
                    </button>
                  </div>
                </div>

                {/* Trust Triggers */}
                <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  {[
                    { icon: <Check size={14} />, text: "Cancelar cuando quieras" },
                    { icon: <Moon size={14} />, text: "Diseñado para la Ummah" },
                    { icon: <BookOpen size={14} />, text: "Basado en principios" },
                    { icon: <Sparkles size={14} />, text: "Consultas ilimitadas" },
                  ].map((item, i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                      <div className="text-deenly-gold">{item.icon}</div>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-deenly-green/40">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <button 
                onClick={() => setShowPremiumModal(false)}
                className="absolute top-6 right-6 p-2 text-deenly-white/60 hover:text-deenly-white transition-colors"
              >
                <X size={24} />
              </button>
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

                {isPremium && (
                  <button 
                    onClick={() => { setShowProfileModal(false); setShowCancelModal(true); setCancelStep('reason'); }}
                    className="w-full p-4 rounded-2xl border border-deenly-gold/5 flex items-center gap-3 hover:bg-red-50 hover:text-red-500 transition-all group opacity-40 hover:opacity-100"
                  >
                    <AlertTriangle size={20} />
                    <span className="flex-1 text-left font-medium">Cancelar suscripción</span>
                  </button>
                )}

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

      {/* Cancellation Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center p-6 bg-deenly-green/60 backdrop-blur-md"
            onClick={() => setShowCancelModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={cn(
                "p-8 rounded-[2.5rem] max-w-lg w-full shadow-2xl border border-deenly-gold/20 relative overflow-hidden",
                darkMode ? "bg-deenly-dark-surface text-deenly-dark-text" : "bg-white text-deenly-green"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-deenly-gold/5 rounded-full -mr-16 -mt-16 blur-3xl" />
              
              {cancelStep === 'reason' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h3 className="text-3xl font-serif font-bold mb-2">Antes de irte...</h3>
                  <p className="text-sm opacity-60 mb-8">Lamentamos mucho que quieras dejarnos. Tu apoyo ayuda a mantener Deenly para toda la Ummah.</p>
                  
                  <div className="bg-deenly-gold/5 p-6 rounded-3xl mb-8 border border-deenly-gold/10">
                    <p className="text-xs font-bold uppercase tracking-widest text-deenly-gold mb-4">Perderás estos beneficios:</p>
                    <div className="space-y-3">
                      {[
                        "Preguntas ilimitadas diarias",
                        "Historial completo de conversaciones",
                        "Prioridad en respuestas de la IA",
                        "Acceso a funciones exclusivas"
                      ].map((benefit, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm">
                          <X size={14} className="text-red-400" />
                          <span className="opacity-70">{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className="text-xs font-bold uppercase tracking-widest text-deenly-gold mb-4">¿Por qué quieres cancelar?</p>
                  <div className="grid grid-cols-1 gap-2 mb-8">
                    {[
                      { id: 'price', label: 'Es demasiado caro' },
                      { id: 'usage', label: 'No lo uso lo suficiente' },
                      { id: 'features', label: 'Faltan funciones' },
                      { id: 'technical', label: 'Problemas técnicos' },
                      { id: 'other', label: 'Otro motivo' }
                    ].map((reason) => (
                      <button
                        key={reason.id}
                        onClick={() => setSelectedReason(reason.id)}
                        className={cn(
                          "w-full p-4 rounded-xl border text-left text-sm transition-all",
                          selectedReason === reason.id 
                            ? "border-deenly-gold bg-deenly-gold/10 text-deenly-gold" 
                            : "border-deenly-gold/10 hover:bg-deenly-gold/5"
                        )}
                      >
                        {reason.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-col gap-3">
                    <button 
                      disabled={!selectedReason}
                      onClick={() => setCancelStep('offer')}
                      className="w-full py-4 bg-deenly-green text-deenly-cream rounded-full font-bold shadow-xl hover:bg-deenly-green/90 transition-all disabled:opacity-50"
                    >
                      Continuar
                    </button>
                    <button 
                      onClick={() => setShowCancelModal(false)}
                      className="w-full py-2 text-xs font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
                    >
                      Mantener mi suscripción
                    </button>
                  </div>
                </motion.div>
              )}

              {cancelStep === 'offer' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="w-16 h-16 rounded-2xl bg-deenly-gold/10 flex items-center justify-center text-deenly-gold mb-6">
                    <Sparkles size={32} />
                  </div>
                  <h3 className="text-3xl font-serif font-bold mb-2">Tenemos una propuesta para ti</h3>
                  <p className="text-sm opacity-60 mb-8">Queremos que sigas creciendo espiritualmente con nosotros. Mira lo que podemos ofrecerte:</p>
                  
                  <div className="space-y-4 mb-8">
                    {selectedReason === 'price' && (
                      <div className="p-6 rounded-3xl border-2 border-deenly-gold bg-deenly-gold/5 text-center">
                        <p className="text-xs font-bold uppercase tracking-widest text-deenly-gold mb-2">Oferta Especial</p>
                        <p className="text-xl font-serif font-bold mb-2">50% de descuento por 3 meses</p>
                        <p className="text-sm opacity-60">Paga solo €2.49/mes y mantén todos tus beneficios.</p>
                      </div>
                    )}
                    {selectedReason === 'usage' && (
                      <div className="p-6 rounded-3xl border-2 border-deenly-gold bg-deenly-gold/5 text-center">
                        <PauseCircle size={32} className="mx-auto text-deenly-gold mb-4" />
                        <p className="text-xs font-bold uppercase tracking-widest text-deenly-gold mb-2">Pausar Suscripción</p>
                        <p className="text-xl font-serif font-bold mb-2">Pausa por 1 mes gratis</p>
                        <p className="text-sm opacity-60">No pierdas tu historial ni tus beneficios. Vuelve cuando estés listo.</p>
                      </div>
                    )}
                    {(selectedReason === 'features' || selectedReason === 'technical' || selectedReason === 'other') && (
                      <div className="p-6 rounded-3xl border-2 border-deenly-gold bg-deenly-gold/5 text-center">
                        <ShieldCheck size={32} className="mx-auto text-deenly-gold mb-4" />
                        <p className="text-xs font-bold uppercase tracking-widest text-deenly-gold mb-2">Soporte Prioritario</p>
                        <p className="text-xl font-serif font-bold mb-2">Habla con nuestro equipo</p>
                        <p className="text-sm opacity-60">Cuéntanos qué necesitas y lo priorizaremos en nuestra hoja de ruta.</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={() => setShowCancelModal(false)}
                      className="w-full py-4 bg-deenly-green text-deenly-cream rounded-full font-bold shadow-xl hover:bg-deenly-green/90 transition-all"
                    >
                      Aceptar oferta y seguir
                    </button>
                    <button 
                      onClick={() => setCancelStep('confirm')}
                      className="w-full py-2 text-xs font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
                    >
                      No, prefiero cancelar
                    </button>
                  </div>
                </motion.div>
              )}

              {cancelStep === 'confirm' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                  <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-red-500 mx-auto mb-6">
                    <AlertTriangle size={32} />
                  </div>
                  <h3 className="text-3xl font-serif font-bold mb-2">¿Estás seguro?</h3>
                  <p className="text-sm opacity-60 mb-8">Tu suscripción finalizará al terminar el periodo actual. Perderás el acceso a todas las funciones Premium.</p>
                  
                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={() => setShowCancelModal(false)}
                      className="w-full py-4 bg-deenly-green text-deenly-cream rounded-full font-bold shadow-xl hover:bg-deenly-green/90 transition-all"
                    >
                      Seguir con Premium
                    </button>
                    <button 
                      onClick={() => { setIsPremium(false); setShowCancelModal(false); }}
                      className="w-full py-2 text-xs font-bold uppercase tracking-widest text-red-500 font-bold hover:underline"
                    >
                      Confirmar cancelación
                    </button>
                  </div>
                </motion.div>
              )}
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

      {/* Reminders Modal */}
      <AnimatePresence>
        {showRemindersModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-deenly-green/40 backdrop-blur-sm"
            onClick={() => setShowRemindersModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={cn(
                "p-8 rounded-3xl max-w-lg w-full shadow-2xl border border-deenly-gold/20",
                darkMode ? "bg-deenly-dark-surface" : "bg-deenly-cream"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-serif text-deenly-green">Recordatorios Espirituales</h3>
                <button onClick={() => setShowRemindersModal(false)} className="text-deenly-green/40 hover:text-deenly-green">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4 mb-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-deenly-gold">Tarea / Recordatorio</label>
                  <input 
                    type="text" 
                    value={newReminderText}
                    onChange={(e) => setNewReminderText(e.target.value)}
                    placeholder="Ej: Leer Surah Al-Kahf"
                    className={cn(
                      "w-full p-3 rounded-xl border border-deenly-gold/20 focus:outline-none focus:ring-2 focus:ring-deenly-gold/30",
                      darkMode ? "bg-deenly-dark-bg text-deenly-dark-text" : "bg-white text-deenly-green"
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-deenly-gold">Fecha</label>
                    <input 
                      type="date" 
                      value={newReminderDate}
                      onChange={(e) => setNewReminderDate(e.target.value)}
                      className={cn(
                        "w-full p-3 rounded-xl border border-deenly-gold/20 focus:outline-none focus:ring-2 focus:ring-deenly-gold/30",
                        darkMode ? "bg-deenly-dark-bg text-deenly-dark-text" : "bg-white text-deenly-green"
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-deenly-gold">Hora</label>
                    <input 
                      type="time" 
                      value={newReminderTime}
                      onChange={(e) => setNewReminderTime(e.target.value)}
                      className={cn(
                        "w-full p-3 rounded-xl border border-deenly-gold/20 focus:outline-none focus:ring-2 focus:ring-deenly-gold/30",
                        darkMode ? "bg-deenly-dark-bg text-deenly-dark-text" : "bg-white text-deenly-green"
                      )}
                    />
                  </div>
                </div>
                <button 
                  onClick={addReminder}
                  className="w-full py-3 bg-deenly-gold text-white rounded-xl font-bold text-sm shadow-lg hover:bg-deenly-gold/90 transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={18} />
                  Añadir Recordatorio
                </button>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-deenly-gold mb-2">Tus Recordatorios</h4>
                {reminders.length > 0 ? (
                  reminders.map((reminder) => (
                    <div 
                      key={reminder.id}
                      className={cn(
                        "p-4 rounded-2xl border border-deenly-gold/10 flex items-center justify-between group",
                        reminder.completed ? "opacity-50" : "opacity-100",
                        darkMode ? "bg-deenly-dark-bg/50" : "bg-white"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => toggleReminder(reminder.id)}
                          className={cn(
                            "w-5 h-5 rounded-full border flex items-center justify-center transition-all",
                            reminder.completed ? "bg-deenly-green border-deenly-green text-white" : "border-deenly-gold/30"
                          )}
                        >
                          {reminder.completed && <Check size={12} />}
                        </button>
                        <div>
                          <p className={cn("text-sm font-medium", reminder.completed && "line-through")}>{reminder.text}</p>
                          <p className="text-[10px] opacity-40 flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(reminder.dueDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => deleteReminder(reminder.id)}
                        className="p-2 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 opacity-30">
                    <Bell size={32} className="mx-auto mb-2" />
                    <p className="text-xs">No tienes recordatorios activos</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clear All Confirmation Modal */}
      <AnimatePresence>
        {showClearAllConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-deenly-green/40 backdrop-blur-sm"
            onClick={() => setShowClearAllConfirm(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={cn(
                "p-8 rounded-3xl max-w-sm w-full shadow-2xl border border-deenly-gold/20 text-center",
                darkMode ? "bg-deenly-dark-surface" : "bg-deenly-cream"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                <Trash2 size={32} />
              </div>
              <h3 className={cn(
                "text-xl font-bold mb-2",
                darkMode ? "text-deenly-dark-text" : "text-deenly-green"
              )}>¿Borrar todo el historial?</h3>
              <p className={cn(
                "text-sm mb-8 leading-relaxed",
                darkMode ? "text-deenly-dark-text/60" : "text-deenly-green/60"
              )}>
                ¿Estás seguro de que quieres limpiar todo el historial de chat? Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowClearAllConfirm(false)}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-bold text-sm transition-all",
                    darkMode ? "bg-deenly-gold/10 text-deenly-gold hover:bg-deenly-gold/20" : "bg-deenly-gold/10 text-deenly-gold hover:bg-deenly-gold/20"
                  )}
                >
                  Cancelar
                </button>
                <button 
                  onClick={clearMessages}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-red-600 transition-all"
                >
                  Borrar todo
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-deenly-green/40 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={cn(
                "p-8 rounded-3xl max-w-sm w-full shadow-2xl border border-deenly-gold/20 text-center",
                darkMode ? "bg-deenly-dark-surface" : "bg-deenly-cream"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                <AlertTriangle size={32} />
              </div>
              <h3 className={cn(
                "text-xl font-bold mb-2",
                darkMode ? "text-deenly-dark-text" : "text-deenly-green"
              )}>¿Eliminar chat?</h3>
              <p className={cn(
                "text-sm mb-8 leading-relaxed",
                darkMode ? "text-deenly-dark-text/60" : "text-deenly-green/60"
              )}>
                ¿Seguro que quieres eliminar este chat? Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-bold text-sm transition-all",
                    darkMode ? "bg-deenly-gold/10 text-deenly-gold hover:bg-deenly-gold/20" : "bg-deenly-gold/10 text-deenly-gold hover:bg-deenly-gold/20"
                  )}
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmDeleteThread}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-red-600 transition-all"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hadith Library Modal */}
      <AnimatePresence>
        {showHadithLibrary && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-deenly-green/40 backdrop-blur-sm"
            onClick={() => {
              if (selectedHadith) setSelectedHadith(null);
              else if (selectedCollection) setSelectedCollection(null);
              else setShowHadithLibrary(false);
            }}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={cn(
                "w-full max-w-4xl h-[80vh] flex flex-col rounded-3xl shadow-2xl border border-deenly-gold/20 overflow-hidden",
                darkMode ? "bg-deenly-dark-surface" : "bg-deenly-cream"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-deenly-gold/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-deenly-gold/10 flex items-center justify-center text-deenly-gold">
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <h3 className={cn("text-xl font-bold", darkMode ? "text-deenly-dark-text" : "text-deenly-green")}>
                      {selectedHadith ? "Detalle del Hadiz" : selectedCollection ? HADITH_COLLECTIONS.find(c => c.id === selectedCollection)?.name : "Biblioteca de Hadices"}
                    </h3>
                    <p className="text-[10px] uppercase tracking-widest font-bold opacity-40">Explora la Sunnah</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    if (selectedHadith) setSelectedHadith(null);
                    else if (selectedCollection) setSelectedCollection(null);
                    else setShowHadithLibrary(false);
                  }}
                  className="p-2 hover:bg-deenly-gold/10 rounded-full transition-colors text-deenly-gold"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                {!selectedCollection ? (
                  /* Collections Grid */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {HADITH_COLLECTIONS.map((collection) => (
                      <button
                        key={collection.id}
                        onClick={() => setSelectedCollection(collection.id)}
                        className={cn(
                          "p-6 rounded-2xl border border-deenly-gold/10 text-left transition-all hover:scale-[1.02] hover:shadow-lg group",
                          darkMode ? "bg-deenly-dark-bg/50 hover:bg-deenly-dark-bg" : "bg-white hover:bg-deenly-gold/5"
                        )}
                      >
                        <h4 className="text-lg font-bold text-deenly-green mb-1 group-hover:text-deenly-gold transition-colors">{collection.name}</h4>
                        <p className="text-xs opacity-50 mb-4">{collection.hadiths.length} hadices disponibles</p>
                        <div className="flex items-center text-deenly-gold text-[10px] font-bold uppercase tracking-widest">
                          <span>Explorar colección</span>
                          <ChevronRight size={14} />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : !selectedHadith ? (
                  /* Hadith List */
                  <div className="space-y-4">
                    <button 
                      onClick={() => setSelectedCollection(null)}
                      className="text-xs font-bold text-deenly-gold uppercase tracking-widest flex items-center gap-1 mb-4 hover:opacity-70 transition-opacity"
                    >
                      <Plus size={14} className="rotate-45" /> Volver a colecciones
                    </button>
                    <div className="grid grid-cols-1 gap-4">
                      {HADITH_COLLECTIONS.find(c => c.id === selectedCollection)?.hadiths.map((hadith) => (
                        <button
                          key={hadith.id}
                          onClick={() => setSelectedHadith(hadith)}
                          className={cn(
                            "p-5 rounded-2xl border border-deenly-gold/10 text-left transition-all hover:bg-deenly-gold/5",
                            darkMode ? "bg-deenly-dark-bg/30" : "bg-white"
                          )}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-[10px] font-bold bg-deenly-gold/10 text-deenly-gold px-2 py-1 rounded-full uppercase tracking-tighter">
                              Hadiz #{hadith.number}
                            </span>
                            <span className="text-[10px] opacity-40 font-medium italic">Narrado por {hadith.narrator}</span>
                          </div>
                          <p className="text-sm line-clamp-2 opacity-80 leading-relaxed mb-3">{hadith.text}</p>
                          <p className="text-[10px] font-bold text-deenly-gold uppercase tracking-widest">Ver texto completo</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Hadith Detail */
                  <div className="max-w-2xl mx-auto py-8">
                    <button 
                      onClick={() => setSelectedHadith(null)}
                      className="text-xs font-bold text-deenly-gold uppercase tracking-widest flex items-center gap-1 mb-8 hover:opacity-70 transition-opacity"
                    >
                      <Plus size={14} className="rotate-45" /> Volver a la lista
                    </button>
                    
                    <div className="space-y-8">
                      <div className="text-center space-y-2">
                        <span className="text-xs font-bold text-deenly-gold uppercase tracking-[0.2em]">Referencia</span>
                        <h4 className="text-2xl font-serif text-deenly-green">{selectedHadith.reference}</h4>
                      </div>

                      <div className={cn(
                        "p-8 rounded-3xl border border-deenly-gold/10 shadow-inner relative",
                        darkMode ? "bg-deenly-dark-bg/50" : "bg-white"
                      )}>
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-deenly-gold text-white px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                          Texto Completo
                        </div>
                        <p className="text-lg leading-relaxed text-deenly-green/90 font-serif italic text-center">
                          "{selectedHadith.text}"
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-deenly-gold/5 border border-deenly-gold/10">
                          <p className="text-[10px] uppercase tracking-widest font-bold opacity-40 mb-1">Narrador</p>
                          <p className="text-sm font-bold text-deenly-green">{selectedHadith.narrator}</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-deenly-gold/5 border border-deenly-gold/10">
                          <p className="text-[10px] uppercase tracking-widest font-bold opacity-40 mb-1">Libro/Sección</p>
                          <p className="text-sm font-bold text-deenly-green">{selectedHadith.book}</p>
                        </div>
                      </div>

                      <div className="flex justify-center gap-4 pt-8">
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(`${selectedHadith.text}\n\n— ${selectedHadith.reference}`);
                            alert('Hadiz copiado al portapapeles');
                          }}
                          className="flex items-center gap-2 px-6 py-3 rounded-full border border-deenly-gold/30 text-deenly-gold font-bold text-xs uppercase tracking-widest hover:bg-deenly-gold/5 transition-all"
                        >
                          <Share2 size={16} />
                          Copiar
                        </button>
                        <button 
                          onClick={() => {
                            setShowHadithLibrary(false);
                            setSelectedHadith(null);
                            setSelectedCollection(null);
                            setInput(`Explícame el significado del Hadiz: "${selectedHadith.text}"`);
                            inputRef.current?.focus();
                          }}
                          className="flex items-center gap-2 px-6 py-3 rounded-full bg-deenly-green text-white font-bold text-xs uppercase tracking-widest shadow-lg hover:bg-deenly-green/90 transition-all"
                        >
                          <Sparkles size={16} />
                          Preguntar a Deenly
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
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
            "h-16 sm:h-20 px-4 sm:px-6 flex items-center justify-between border-b border-deenly-gold/10 z-30 transition-all sticky top-0 backdrop-blur-md",
            darkMode ? "bg-deenly-dark-surface/90" : "bg-white/90"
          )}>
            <div className="flex items-center gap-2 sm:gap-4">
              <button 
                onClick={() => setShowSidebar(!showSidebar)}
                className="p-2 hover:bg-deenly-gold/10 rounded-full transition-colors text-deenly-gold"
                title="Menu"
              >
                <Plus size={20} className={cn("sm:w-6 sm:h-6 transition-transform duration-300", showSidebar && "rotate-45")} />
              </button>
              <div className="flex items-center gap-2 sm:gap-3">
                <Logo size={40} showText />
                {isPremium && (
                  <span className="text-[8px] sm:text-[9px] bg-deenly-gold text-white px-1.5 sm:px-2 py-0.5 rounded-full font-sans uppercase tracking-widest font-bold">Premium</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {!isPremium && user && (
                <button 
                  onClick={() => setShowPremiumModal(true)}
                  className="hidden sm:flex items-center gap-2 px-4 py-2 bg-deenly-gold text-white rounded-full text-xs font-bold uppercase tracking-widest shadow-md hover:bg-deenly-gold/90 transition-all"
                >
                  <Sparkles size={14} />
                  Actualizar
                </button>
              )}

              {user ? (
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setShowProfileModal(true)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-deenly-gold/20 hover:bg-deenly-gold/5 transition-all"
                  >
                    <div className="w-8 h-8 rounded-full bg-deenly-gold/20 flex items-center justify-center text-deenly-gold border border-deenly-gold/10">
                      <User size={16} />
                    </div>
                    <div className="hidden md:flex flex-col items-start leading-none">
                      <span className="text-xs font-bold text-deenly-green">
                        {user.user_metadata?.name || 'Mi Perfil'}
                      </span>
                      <span className="text-[9px] opacity-40 uppercase tracking-tighter font-bold">
                        {isPremium ? 'Premium' : 'Gratis'}
                      </span>
                    </div>
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setShowAuthModal(true)}
                  className="px-5 py-2 rounded-full bg-deenly-green text-deenly-cream hover:bg-deenly-green/90 transition-all text-sm font-bold uppercase tracking-widest shadow-lg"
                >
                  Entrar
                </button>
              )}
              
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 text-deenly-green/40 hover:text-deenly-green transition-colors"
                title={darkMode ? "Modo claro" : "Modo oscuro"}
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              {messages.length > 0 && (
                <button 
                  onClick={() => setShowClearAllConfirm(true)}
                  className="p-2 text-red-400 hover:text-red-500 transition-colors"
                  title="Limpiar historial"
                >
                  <Trash2 size={20} />
                </button>
              )}
              
              <button 
                onClick={() => setShowInfo(true)}
                className="p-2 text-deenly-green/40 hover:text-deenly-green transition-colors"
              >
                <Info size={20} />
              </button>
            </div>
          </header>

      {/* Main Content */}
      <main className={cn(
        "flex-1 overflow-y-auto scrollbar-hide relative islamic-pattern",
        darkMode ? "bg-deenly-dark-bg" : "bg-deenly-cream"
      )}>
        {isHistoryLoading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <PremiumSpinner />
          </div>
        ) : (
          <div className="max-w-5xl mx-auto w-full px-6 py-12">
            {!isPremium && user && (
              <div className="flex justify-center mb-8">
                <div className="px-4 py-1.5 rounded-full bg-white/80 backdrop-blur-sm border border-deenly-gold/20 shadow-sm flex items-center gap-3">
                  <motion.div 
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-2 h-2 rounded-full bg-deenly-gold shadow-[0_0_8px_rgba(200,169,81,0.5)]" 
                  />
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

            {filteredMessages.length === 0 ? (
              <div className="space-y-8 sm:space-y-16 py-4 sm:py-8">
                {/* Hero Section */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center space-y-4 sm:space-y-6 max-w-3xl mx-auto"
                >
                  <h2 className="text-3xl sm:text-5xl md:text-6xl font-serif text-deenly-green leading-tight">
                    Pregunta con confianza.<br />
                    <span className="italic text-deenly-gold">Aprende con claridad.</span>
                  </h2>
                  <p className="text-sm sm:text-lg text-deenly-green/60 leading-relaxed max-w-2xl mx-auto px-4 sm:px-0">
                    Consulta sobre el Corán, la Sunnah y Fiqh con inteligencia artificial diseñada para la Ummah.
                  </p>
                </motion.div>

                {/* Main Input Box */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="max-w-2xl mx-auto relative group px-2 sm:px-0"
                >
                  <div className="absolute -inset-1 bg-deenly-gold/10 rounded-[1.5rem] sm:rounded-[2rem] blur-xl group-hover:bg-deenly-gold/20 transition-all duration-500" />
                  <div className={cn(
                    "relative p-1.5 sm:p-2 rounded-[1.5rem] sm:rounded-[2rem] border border-deenly-gold/20 shadow-2xl transition-all",
                    darkMode ? "bg-deenly-dark-surface" : "bg-white"
                  )}>
                    <form 
                      onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                      className="flex items-center"
                    >
                      <input
                        ref={inputRef as any}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Escribe tu pregunta..."
                        className={cn(
                          "flex-1 bg-transparent py-3 sm:py-5 px-4 sm:px-6 focus:outline-none text-base sm:text-lg placeholder:text-deenly-green/30",
                          darkMode ? "text-deenly-dark-text" : "text-deenly-green"
                        )}
                      />
                      <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="p-3 sm:p-4 bg-deenly-green text-deenly-white rounded-xl sm:rounded-2xl hover:bg-deenly-green/90 disabled:opacity-50 transition-all shadow-lg shadow-deenly-green/20 min-w-[48px] sm:min-w-[64px] flex items-center justify-center"
                      >
                        {isLoading ? (
                          <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-deenly-white/20 border-t-deenly-white rounded-full animate-spin" />
                        ) : (
                          <Send size={20} className="sm:w-6 sm:h-6" strokeWidth={1.5} />
                        )}
                      </button>
                    </form>
                  </div>

                  {!user && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="mt-4 sm:mt-6 p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-deenly-gold/5 border border-deenly-gold/10 text-center space-y-3 sm:space-y-4"
                    >
                      <p className="text-xs sm:text-sm text-deenly-green/70">
                        Para guardar tus conversaciones y continuar, inicia sesión.
                      </p>
                      <button 
                        onClick={() => {
                          if (user) {
                            inputRef.current?.focus();
                          } else {
                            setShowAuthModal(true);
                          }
                        }}
                        className="px-6 sm:px-8 py-2.5 sm:py-3 bg-deenly-green text-deenly-white rounded-full font-bold uppercase tracking-widest text-[10px] sm:text-xs hover:bg-deenly-green/90 transition-all shadow-lg shadow-deenly-green/20"
                      >
                        Comenzar Gratis
                      </button>
                    </motion.div>
                  )}

                  {/* Suggested Questions Pills */}
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {SUGGESTED_QUESTIONS.map((q, i) => (
                      <motion.button
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + (i * 0.05) }}
                        onClick={() => {
                          setInput(q);
                          handleSend(q);
                        }}
                        className="px-4 py-2 rounded-full bg-white border border-deenly-gold/10 text-[10px] sm:text-xs text-deenly-green/60 hover:bg-deenly-gold/5 hover:text-deenly-green transition-all shadow-sm"
                      >
                        {q}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>

                {/* Common Questions Section */}
                <div className="space-y-12 pt-8">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <h3 className="text-2xl font-serif text-deenly-green">Explora Temas Comunes</h3>
                      {isPremium && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="px-2 py-0.5 rounded-full bg-deenly-gold/20 text-deenly-gold text-[8px] font-bold uppercase tracking-widest flex items-center gap-1"
                        >
                          <Sparkles size={10} />
                          <span>Premium</span>
                        </motion.div>
                      )}
                    </div>
                    <p className="text-sm text-deenly-green/40 uppercase tracking-widest font-bold">Selecciona una categoría para ver preguntas frecuentes</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {COMMON_QUESTIONS.map((cat, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 + (i * 0.1) }}
                        className={cn(
                          "p-6 rounded-[2rem] border shadow-sm flex flex-col transition-all duration-500",
                          isPremium 
                            ? "border-deenly-gold/30 shadow-lg shadow-deenly-gold/5" 
                            : "border-deenly-gold/10",
                          darkMode ? "bg-deenly-dark-surface" : "bg-white"
                        )}
                      >
                        <div className="flex items-center gap-4 mb-6">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                            isPremium ? "bg-deenly-gold/30 text-deenly-gold" : (darkMode ? "bg-deenly-gold/20 text-deenly-gold" : "bg-deenly-gold/10 text-deenly-gold")
                          )}>
                            <cat.icon size={24} strokeWidth={1.5} />
                          </div>
                          <h4 className="text-xl font-serif text-deenly-green">{cat.category}</h4>
                        </div>
                        
                        <div className="space-y-2 flex-1">
                          {cat.questions.map((q, j) => (
                            <button
                              key={j}
                              onClick={() => {
                                setInput(q);
                                handleSend(q);
                              }}
                              className={cn(
                                "w-full text-left p-3 rounded-xl text-xs transition-all border border-transparent hover:border-deenly-gold/20 hover:bg-deenly-gold/5",
                                darkMode ? "text-deenly-dark-text/70 hover:text-deenly-dark-text" : "text-deenly-green/60 hover:text-deenly-green"
                              )}
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-8 pb-32">
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
                        "max-w-[90%] sm:max-w-[85%] p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] shadow-sm",
                        m.role === 'user' 
                          ? "bg-deenly-green text-deenly-white rounded-tr-none" 
                          : cn(
                              "rounded-tl-none border border-deenly-gold/10",
                              darkMode ? "bg-deenly-dark-surface text-deenly-dark-text" : "bg-white text-deenly-green"
                            )
                      )}>
                        <div className="markdown-body text-sm sm:text-base">
                          <Markdown>{m.content}</Markdown>
                        </div>
                        <div className={cn(
                          "text-[10px] mt-3 opacity-40 font-bold uppercase tracking-widest flex items-center justify-between",
                          m.role === 'user' ? "flex-row-reverse" : "flex-row"
                        )}>
                          <span>{m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {m.role === 'assistant' && (
                            <button 
                              onClick={() => handleShare(m.content, m.id)}
                              className={cn(
                                "flex items-center gap-1.5 px-3 py-1 rounded-full transition-all duration-300",
                                "border border-deenly-gold/30 bg-deenly-gold/5 hover:bg-deenly-gold/20 hover:border-deenly-gold/60 hover:opacity-100",
                                darkMode ? "text-deenly-gold" : "text-deenly-green"
                              )}
                              title="Compartir respuesta"
                            >
                              {copiedId === m.id ? (
                                <>
                                  <Check size={12} className="text-deenly-gold" />
                                  <span className="text-[9px]">Copiado</span>
                                </>
                              ) : (
                                <>
                                  <Share2 size={12} className="text-deenly-gold" />
                                  <span className="text-[9px]">Compartir</span>
                                </>
                              )}
                            </button>
                          )}
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
                    <div className="bg-white p-5 rounded-3xl border border-deenly-gold/10 flex items-center gap-2 shadow-sm">
                      <div className="w-2 h-2 bg-deenly-gold rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-deenly-gold rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-deenly-gold rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer sutil */}
      <motion.footer 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className={cn(
          "p-8 border-t border-deenly-gold/10 transition-all text-center islamic-pattern",
          darkMode ? "bg-deenly-dark-surface/80" : "bg-white/80",
          "backdrop-blur-md"
        )}
      >
        <p className="text-[10px] text-deenly-green/40 uppercase tracking-[0.2em] font-bold">
          Deenly es una herramienta educativa basada en principios islámicos.
        </p>
      </motion.footer>
    </div>

      {/* Floating Input Area (only when chatting) */}
      {filteredMessages.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 z-40 pointer-events-none">
          <div className="max-w-4xl mx-auto w-full pointer-events-auto">
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              className={cn(
                "p-1.5 sm:p-2 rounded-[1.5rem] sm:rounded-[2rem] border border-deenly-gold/20 shadow-2xl backdrop-blur-xl",
                darkMode ? "bg-deenly-dark-surface/90" : "bg-white/90"
              )}
            >
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="flex items-center"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Escribe tu pregunta..."
                  className={cn(
                    "flex-1 bg-transparent py-3 sm:py-4 px-4 sm:px-6 focus:outline-none text-sm sm:text-base placeholder:text-deenly-green/30",
                    darkMode ? "text-deenly-dark-text" : "text-deenly-green"
                  )}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="p-2.5 sm:p-3 bg-deenly-green text-deenly-white rounded-xl sm:rounded-2xl hover:bg-deenly-green/90 disabled:opacity-50 transition-all shadow-lg min-w-[40px] sm:min-w-[48px] flex items-center justify-center"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-deenly-white/20 border-t-deenly-white rounded-full animate-spin" />
                  ) : (
                    <Send size={18} className="sm:w-5 sm:h-5" strokeWidth={1.5} />
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        </div>
      )}
      <AnimatePresence>
        {showSidebar && (
          <>
            {/* Mobile Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSidebar(false)}
              className="fixed inset-0 bg-deenly-green/20 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: 320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 320, opacity: 0 }}
              className={cn(
                "fixed lg:relative inset-y-0 right-0 z-50 lg:z-0 w-[280px] sm:w-80 border-l border-deenly-gold/20 flex flex-col h-full transition-colors shadow-2xl lg:shadow-none",
                darkMode ? "bg-deenly-dark-surface" : "bg-white"
              )}
            >
              <div className="p-6 flex-1 flex flex-col overflow-hidden">
                <div className="mb-10 flex justify-center">
                  <Logo size={60} showText />
                </div>
                
                <button 
                  onClick={() => setActiveThreadId('new')}
                  className="w-full py-3 px-6 rounded-2xl border border-deenly-gold/20 flex items-center justify-center gap-3 hover:bg-deenly-gold/5 transition-all mb-4 group"
                >
                  <Plus size={18} className="text-deenly-gold" />
                  <span className="text-sm font-bold uppercase tracking-widest text-deenly-green">Nuevo Chat</span>
                </button>

                <div className="relative mb-6">
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar en los chats"
                    className={cn(
                      "w-full py-2.5 pl-10 pr-4 rounded-2xl text-xs border border-deenly-gold/10 focus:outline-none focus:ring-1 focus:ring-deenly-gold/30",
                      darkMode ? "bg-deenly-dark-bg text-deenly-dark-text" : "bg-[#F7F5F2] text-deenly-green"
                    )}
                  />
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-deenly-gold/40">
                    <History size={14} />
                  </div>
                </div>

                <div className="space-y-1 mb-6">
                  <button 
                    onClick={() => {
                      setInput("¿Qué dice el Corán sobre ");
                      setShowSidebar(window.innerWidth < 1024 ? false : showSidebar);
                      inputRef.current?.focus();
                    }}
                    className="w-full p-2 rounded-xl flex items-center gap-3 hover:bg-deenly-gold/5 transition-all text-sm text-deenly-green/70 hover:text-deenly-green"
                  >
                    <div className="text-deenly-gold/60"><BookOpen size={18} /></div>
                    <span className="font-medium">Corán</span>
                  </button>
                  <button 
                    onClick={() => setShowHadithLibrary(true)}
                    className="w-full p-2 rounded-xl flex items-center gap-3 hover:bg-deenly-gold/5 transition-all text-sm text-deenly-green/70 hover:text-deenly-green"
                  >
                    <div className="text-deenly-gold/60"><MessageSquare size={18} /></div>
                    <span className="font-medium">Hadices</span>
                  </button>
                  <button 
                    onClick={() => setShowRemindersModal(true)}
                    className="w-full p-2 rounded-xl flex items-center gap-3 hover:bg-deenly-gold/5 transition-all text-sm text-deenly-green/70 hover:text-deenly-green"
                  >
                    <div className="text-deenly-gold/60"><Bell size={18} /></div>
                    <span className="font-medium">Recordatorios</span>
                  </button>
                  <button 
                    onClick={() => setShowMemoryModal(true)}
                    className="w-full p-2 rounded-xl flex items-center gap-3 hover:bg-deenly-gold/5 transition-all text-sm text-deenly-green/70 hover:text-deenly-green"
                  >
                    <div className="text-deenly-gold/60"><Brain size={18} /></div>
                    <span className="font-medium">Memoria</span>
                  </button>
                  <button 
                    onClick={() => setShowInfo(true)}
                    className="w-full p-2 rounded-xl flex items-center gap-3 hover:bg-deenly-gold/5 transition-all text-sm text-deenly-green/70 hover:text-deenly-green"
                  >
                    <div className="text-deenly-gold/60"><Info size={18} /></div>
                    <span className="font-medium">Ayuda</span>
                  </button>
                </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide">
              <div className="px-2 mb-6">
                <p className="text-[11px] leading-relaxed opacity-50 italic">
                  Aquí encontrarás todas tus conversaciones anteriores. Deenly guarda tu historial para que puedas volver a cualquier chat cuando quieras. Nada se elimina automáticamente: tú decides qué conservar y qué borrar.
                </p>
              </div>
              <div className="flex items-center justify-between mb-4 px-2">
                <h4 className="text-[10px] uppercase tracking-widest font-bold text-deenly-gold/40">Tus chats</h4>
                {chatThreads.length > 0 && (
                  <button 
                    onClick={() => setShowClearAllConfirm(true)}
                    className="text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-500 transition-colors flex items-center gap-1"
                  >
                    <Trash2 size={10} />
                    <span>Borrar</span>
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {isHistoryLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="p-3 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <div className="flex justify-between">
                        <Skeleton className="h-3 w-1/4" />
                        <Skeleton className="h-3 w-1/4" />
                      </div>
                    </div>
                  ))
                ) : chatThreads.length > 0 ? (
                  chatThreads.map((thread) => (
                    <div key={thread.id} className="group relative">
                      <button 
                        key={thread.id}
                        onClick={() => setActiveThreadId(thread.id)}
                        className={cn(
                          "w-full p-3 pr-10 rounded-xl text-left transition-all border",
                          activeThreadId === thread.id 
                            ? "bg-deenly-gold/10 border-deenly-gold/30" 
                            : "border-transparent hover:bg-deenly-gold/5"
                        )}
                      >
                        <p className={cn(
                          "text-sm truncate font-medium",
                          activeThreadId === thread.id ? "text-deenly-green" : "opacity-70"
                        )}>
                          {thread.title}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-[10px] opacity-40">
                            {thread.date.toLocaleDateString([], { day: 'numeric', month: 'short' })}
                          </p>
                          <p className="text-[10px] opacity-40">{thread.messageCount} msgs</p>
                        </div>
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStarThread(thread.id);
                        }}
                        className={cn(
                          "absolute right-10 top-1/2 -translate-y-1/2 p-2 transition-all rounded-lg",
                          thread.isStarred 
                            ? "text-deenly-gold opacity-100" 
                            : "text-deenly-gold/40 opacity-0 group-hover:opacity-100 hover:bg-deenly-gold/5"
                        )}
                        title={thread.isStarred ? "Quitar de destacados" : "Marcar como destacado"}
                      >
                        <Star size={14} fill={thread.isStarred ? "currentColor" : "none"} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteThread(thread.id);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 rounded-lg"
                        title="Eliminar chat"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-center opacity-30 py-8">No hay chats recientes</p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Footer */}
          <div className="p-6 border-t border-deenly-gold/10">
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-deenly-gold/5 transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-deenly-gold/5 flex items-center justify-center text-deenly-gold">
                {darkMode ? <Sun size={24} /> : <Moon size={24} />}
              </div>
              <span className="text-base font-medium text-deenly-gold">Modo Oscuro</span>
            </button>
          </div>
        </motion.aside>
      </>
    )}
  </AnimatePresence>
  </div>
    </>
  );
}
