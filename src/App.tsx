import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Search, 
  Menu, 
  X, 
  Moon, 
  Sun, 
  User, 
  Bell,
  Settings, 
  Sparkles, 
  ChevronRight,
  MessageSquare,
  BookOpen,
  Loader2,
  Plus,
  History,
  ShieldCheck,
  Zap,
  Info,
  Calendar,
  Clock,
  Book,
  Trash2,
  Edit2,
  Check
} from 'lucide-react';
import { Logo } from './components/Logo';
import { QuranSearchModal } from './components/QuranSearchModal';
import { SurahLibrary } from './components/SurahLibrary';
import { Auth } from './components/Auth';
import { ProfileModal } from './components/ProfileModal';
import { SettingsModal } from './components/SettingsModal';
import { AboutModal } from './components/AboutModal';
import { PlansModal } from './components/PlansModal';
import { IslamicCalendarModal } from './components/IslamicCalendarModal';
import { HadithModal } from './components/HadithModal';
import { PrayerTimesModal } from './components/PrayerTimesModal';
import AyahOfTheDay from './components/AyahOfTheDay';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { getMuftiResponse, type ChatMessage as GeminiChatMessage } from './services/geminiService';
import { chatService, type Chat, type Message as DbMessage } from './services/chatService';
import ReactMarkdown from 'react-markdown';
import type { Session } from '@supabase/supabase-js';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  lastUpdated: Date;
}

const Splash = () => (
  <div className="fixed inset-0 z-[100] bg-deenly-cream flex flex-col items-center justify-center p-8 text-center">
    <div className="mb-8 relative">
      <div className="absolute inset-0 bg-deenly-gold/20 blur-3xl rounded-full animate-pulse" />
      <div className="relative">
        <Logo size={80} />
      </div>
    </div>
    <div className="text-center space-y-3">
      <Logo showText size={0} className="justify-center" />
      <p className="text-[10px] uppercase tracking-[0.4em] font-bold text-deenly-gold/60">Eleva tu conocimiento espiritual</p>
      <div className="mt-8 flex gap-1 justify-center">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-deenly-gold opacity-50 animate-pulse"
          />
        ))}
      </div>
    </div>
  </div>
);

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isSurahLibraryOpen, setIsSurahLibraryOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isPlansModalOpen, setIsPlansModalOpen] = useState(false);
  const [isIslamicCalendarOpen, setIsIslamicCalendarOpen] = useState(false);
  const [isHadithModalOpen, setIsHadithModalOpen] = useState(false);
  const [isPrayerTimesModalOpen, setIsPrayerTimesModalOpen] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [cardStyle, setCardStyle] = useState<'compact' | 'wide'>('wide');
  const [language, setLanguage] = useState('Español');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [isPremium, setIsPremium] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      loadSessions();
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.user_metadata?.is_premium) {
        setIsPremium(true);
      }
      if (session?.user?.user_metadata?.settings?.darkMode !== undefined) {
        setDarkMode(session.user.user_metadata.settings.darkMode);
      }
      if (session?.user?.user_metadata?.settings?.fontSize) {
        setFontSize(session.user.user_metadata.settings.fontSize);
      }
      if (session?.user?.user_metadata?.settings?.cardStyle) {
        setCardStyle(session.user.user_metadata.settings.cardStyle);
      }
      if (session?.user?.user_metadata?.settings?.language) {
        setLanguage(session.user.user_metadata.settings.language);
      }
      if (session?.user?.user_metadata?.settings?.dateFormat) {
        setDateFormat(session.user.user_metadata.settings.dateFormat);
      }
    });

    const {
      data: { subscription },
    } = isSupabaseConfigured 
      ? supabase.auth.onAuthStateChange((_event, session) => {
          setSession(session);
          if (!session) {
            setMessages([]);
            setSessions([]);
            setCurrentSessionId(null);
            setIsPremium(false);
          } else {
            if (session?.user?.user_metadata?.is_premium) {
              setIsPremium(true);
            } else {
              setIsPremium(false);
            }
          }
          
          if (session?.user?.user_metadata?.settings?.darkMode !== undefined) {
            setDarkMode(session.user.user_metadata.settings.darkMode);
          }
          if (session?.user?.user_metadata?.settings?.fontSize) {
            setFontSize(session.user.user_metadata.settings.fontSize);
          }
          if (session?.user?.user_metadata?.settings?.cardStyle) {
            setCardStyle(session.user.user_metadata.settings.cardStyle);
          }
          if (session?.user?.user_metadata?.settings?.language) {
            setLanguage(session.user.user_metadata.settings.language);
          }
          if (session?.user?.user_metadata?.settings?.dateFormat) {
            setDateFormat(session.user.user_metadata.settings.dateFormat);
          }
        })
      : { data: { subscription: { unsubscribe: () => {} } } };

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2500);
    
    // Clear state immediately if session is null (logout)
    if (!session) {
      setSessions([]);
      setMessages([]);
      setCurrentSessionId(null);
    }
    
    // Load sessions from Supabase or LocalStorage when session changes
    loadSessions(!!currentSessionId);

    return () => clearTimeout(timer);
  }, [session]);

  const translations: any = {
    'Español': {
      welcomeBrother: '¡As-salamu alaykum! Bienvenido de nuevo, hermano. ¿En qué puedo ayudarte hoy?',
      welcomeSister: '¡As-salamu alaykum! Bienvenida de nuevo, hermana. ¿En qué puedo ayudarte hoy?',
      error: 'Lo siento, ha ocurrido un error al procesar tu solicitud. Por favor, inténtalo de nuevo.',
      newChat: 'Nueva conversación',
      placeholder: 'Pregunta sobre el Islam...',
      searchQuran: 'Buscar Corán',
      you: 'Tú',
      history: 'Historial de Chats',
      noHistory: 'Sin historial',
      explore: 'Explorar',
      surahLib: 'Biblioteca de Suras',
      quranSearch: 'Buscador del Corán',
      islamicCalendar: 'Calendario Islámico',
      hadith: 'Hadith',
      prayerTimes: 'Oraciones',
      clearHistory: 'Borrar Historial',
      confirmClear: '¿Estás seguro de que quieres borrar todos los chats?',
      premium: 'Premium',
      proDesc: 'Acceso ilimitado, respuestas profundas y soporte prioritario.',
      upgrade: 'Mejorar Ahora',
      viewPlan: 'Ver Plan',
      settings: 'Ajustes',
      about: 'Sobre Deenly',
      logout: 'Cerrar Sesión',
      disclaimer: 'Deenly puede cometer errores. Considera verificar la información.',
      dailyInspiration: 'Inspiración Diaria'
    },
    'English': {
      welcomeBrother: 'As-salamu alaykum! Welcome back, brother. How can I help you today?',
      welcomeSister: 'As-salamu alaykum! Welcome back, sister. How can I help you today?',
      error: 'I am sorry, an error occurred while processing your request. Please try again.',
      newChat: 'New Conversation',
      placeholder: 'Ask about Islam...',
      searchQuran: 'Search Quran',
      you: 'You',
      history: 'Chat History',
      noHistory: 'No history',
      explore: 'Explore',
      surahLib: 'Surah Library',
      quranSearch: 'Quran Search',
      islamicCalendar: 'Islamic Calendar',
      hadith: 'Hadith',
      prayerTimes: 'Prayer Times',
      clearHistory: 'Clear History',
      confirmClear: 'Are you sure you want to clear all chats?',
      premium: 'Premium',
      proDesc: 'Unlimited access, deep answers, and priority support.',
      upgrade: 'Upgrade Now',
      viewPlan: 'View Plan',
      settings: 'Settings',
      about: 'About Deenly',
      logout: 'Log Out',
      disclaimer: 'Deenly can make mistakes. Consider verifying the information.',
      dailyInspiration: 'Daily Inspiration'
    },
    'Français': {
      welcomeBrother: 'As-salamu alaykum ! Bon retour, mon frère. Comment puis-je t\'aider aujourd\'hui ?',
      welcomeSister: 'As-salamu alaykum ! Bon retour, ma sœur. Comment puis-je t\'aider aujourd\'hui ?',
      error: 'Désolé, une erreur s\'est produite lors du traitement de votre demande. Veuillez réessayer.',
      newChat: 'Nouvelle conversation',
      placeholder: 'Posez une question sur l\'Islam...',
      searchQuran: 'Chercher dans le Coran',
      you: 'Vous',
      history: 'Historique des discussions',
      noHistory: 'Aucun historique',
      explore: 'Explorer',
      surahLib: 'Bibliothèque de Sourates',
      quranSearch: 'Recherche Coran',
      islamicCalendar: 'Calendrier Islamique',
      hadith: 'Hadith',
      prayerTimes: 'Prières',
      clearHistory: 'Effacer l\'historique',
      confirmClear: 'Êtes-vous sûr de vouloir effacer tous les chats ?',
      premium: 'Premium',
      proDesc: 'Accès illimité, réponses approfondies et support prioritaire.',
      upgrade: 'Améliorer maintenant',
      viewPlan: 'Voir le plan',
      settings: 'Paramètres',
      about: 'À propos de Deenly',
      logout: 'Déconnexion',
      disclaimer: 'Deenly peut faire des erreurs. Pensez à vérifier les informations.',
      dailyInspiration: 'Inspiration Quotidienne'
    },
    'العربية': {
      welcomeBrother: 'السلام عليكم! أهلاً بك من جديد يا أخي. كيف يمكنني مساعدتك اليوم؟',
      welcomeSister: 'السلام عليكم! أهلاً بكِ من جديد يا أختي. كيف يمكنني مساعدتك اليوم؟',
      error: 'عذرًا، حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى.',
      newChat: 'محادثة جديدة',
      placeholder: 'اسأل عن الإسلام...',
      searchQuran: 'البحث في القرآن',
      you: 'أنت',
      history: 'سجل الدردشة',
      noHistory: 'لا يوجد سجل',
      explore: 'استكشاف',
      surahLib: 'مكتبة السور',
      quranSearch: 'البحث في القرآن',
      islamicCalendar: 'التقويم الهجري',
      hadith: 'الحديث',
      prayerTimes: 'مواقيت الصلاة',
      clearHistory: 'مسح السجل',
      confirmClear: 'هل أنت متأكد أنك تريد مسح جميع المحادثات؟',
      premium: 'بريميوم',
      proDesc: 'وصول غير محدود، إجابات عميقة، ودعم ذو أولوية.',
      upgrade: 'ترقية الآن',
      viewPlan: 'عرض الخطة',
      settings: 'الإعدادات',
      about: 'حول Deenly',
      logout: 'تسجيل الخروج',
      disclaimer: 'قد يرتكب Deenly أخطاء. يرجى التحقق من المعلومات.',
      dailyInspiration: 'إلهام يومي'
    }
  };

  const t = translations[language] || translations['Español'];

  const showToast = (message: string, type: 'error' | 'success' = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const loadSessions = async (preserveActive = false) => {
    try {
      const chats = await chatService.getChats();
      if (chats && chats.length > 0) {
        const formattedSessions: ChatSession[] = await Promise.all(chats.map(async (chat) => {
          try {
            const dbMessages = await chatService.getMessages(chat.id);
            return {
              id: chat.id,
              title: chat.title,
              lastUpdated: new Date(chat.created_at),
              messages: dbMessages.map(m => ({
                id: m.id,
                role: m.role,
                text: m.content,
                timestamp: new Date(m.created_at)
              }))
            };
          } catch (e) {
            console.error(`Error loading messages for chat ${chat.id}:`, e);
            return {
              id: chat.id,
              title: chat.title,
              lastUpdated: new Date(chat.created_at),
              messages: []
            };
          }
        }));
        
        setSessions(formattedSessions);
        
        // If we want to preserve the active session, check if it still exists
        if (preserveActive && currentSessionId) {
          const current = formattedSessions.find(s => s.id === currentSessionId);
          if (current) {
            setMessages(current.messages);
            return;
          }
        }

        // Default to the most recent session
        setCurrentSessionId(formattedSessions[0].id);
        setMessages(formattedSessions[0].messages);
      } else {
        // Check if there are local sessions to migrate or just start fresh
        const localSessions = localStorage.getItem('deenly_local_sessions');
        if (localSessions) {
          try {
            const parsed = JSON.parse(localSessions).map((s: any) => ({
              ...s,
              lastUpdated: new Date(s.lastUpdated),
              messages: s.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
            }));
            
            if (parsed.length > 0) {
              if (session && isSupabaseConfigured) {
                // Migrate local sessions to Supabase
                showToast('Sincronizando historial local...', 'success');
                try {
                  for (const s of parsed) {
                    // Create the chat in Supabase
                    const newChat = await chatService.createChat(s.title);
                    // Add all messages to the new chat
                    for (const m of s.messages) {
                      await chatService.addMessage(newChat.id, m.role, m.text);
                    }
                  }
                  // Clear local sessions after successful migration
                  localStorage.removeItem('deenly_local_sessions');
                  // Reload from Supabase to get the real IDs and associated data
                  await loadSessions(preserveActive);
                  return;
                } catch (migrateError: any) {
                  console.error('Error migrating sessions:', migrateError);
                  showToast('Error al sincronizar historial: ' + migrateError.message);
                }
              }
              
              setSessions(parsed);
              setCurrentSessionId(parsed[0].id);
              setMessages(parsed[0].messages);
              return;
            }
          } catch (e) {
            console.error('Error parsing local sessions:', e);
            localStorage.removeItem('deenly_local_sessions');
          }
        }
        await createInitialChat();
      }
    } catch (error: any) {
      console.error('Error loading sessions:', error);
      showToast(error.message || 'Error al cargar las conversaciones');
      
      // ONLY fallback to local storage if NOT logged in
      if (!session) {
        const localSessions = localStorage.getItem('deenly_local_sessions');
        if (localSessions) {
          const parsed = JSON.parse(localSessions).map((s: any) => ({
            ...s,
            lastUpdated: new Date(s.lastUpdated),
            messages: s.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
          }));
          setSessions(parsed);
          if (parsed.length > 0) {
            setCurrentSessionId(parsed[0].id);
            setMessages(parsed[0].messages);
          }
        } else {
          startInitialChat();
        }
      } else {
        // If logged in and cloud fetch fails, show empty state for safety
        setSessions([]);
        setMessages([]);
        setCurrentSessionId(null);
      }
    }
  };

  // Save sessions to localStorage as backup ONLY if not logged in
  useEffect(() => {
    if (sessions.length > 0 && !session) {
      localStorage.setItem('deenly_local_sessions', JSON.stringify(sessions));
    }
  }, [sessions, session]);

  const getWelcomeMessage = () => {
    const gender = session?.user?.user_metadata?.settings?.gender || session?.user?.user_metadata?.onboarding?.gender || 'Hermano';
    return gender === 'Hermana' ? t.welcomeSister : t.welcomeBrother;
  };

  const createInitialChat = async () => {
    try {
      const newChat = await chatService.createChat(t.newChat);
      const initialMessageText = getWelcomeMessage();
      const dbMsg = await chatService.addMessage(newChat.id, 'assistant', initialMessageText);
      
      const initialMessage: Message = {
        id: dbMsg.id,
        role: 'assistant',
        text: initialMessageText,
        timestamp: new Date(dbMsg.created_at)
      };

      const initialSession: ChatSession = {
        id: newChat.id,
        title: newChat.title,
        messages: [initialMessage],
        lastUpdated: new Date(newChat.created_at)
      };

      setSessions([initialSession]);
      setCurrentSessionId(initialSession.id);
      setMessages([initialMessage]);
    } catch (error: any) {
      console.error('Error creating initial chat:', error);
      showToast(error.message || 'Error al iniciar la conversación');
      startInitialChat();
    }
  };

  const startInitialChat = () => {
    const initialMessage: Message = {
      id: '1',
      role: 'assistant',
      text: getWelcomeMessage(),
      timestamp: new Date()
    };
    const initialSession: ChatSession = {
      id: Date.now().toString(),
      title: t.newChat,
      messages: [initialMessage],
      lastUpdated: new Date()
    };
    setSessions([initialSession]);
    setCurrentSessionId(initialSession.id);
    setMessages([initialMessage]);
  };

  const createNewChat = async () => {
    try {
      const newChat = await chatService.createChat(t.newChat);
      const initialMessageText = getWelcomeMessage();
      const dbMsg = await chatService.addMessage(newChat.id, 'assistant', initialMessageText);

      const initialMessage: Message = {
        id: dbMsg.id,
        role: 'assistant',
        text: initialMessageText,
        timestamp: new Date(dbMsg.created_at)
      };

      const newSession: ChatSession = {
        id: newChat.id,
        title: newChat.title,
        messages: [initialMessage],
        lastUpdated: new Date(newChat.created_at)
      };

      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
      setMessages([initialMessage]);
      setIsSidebarOpen(false);
    } catch (error: any) {
      console.error('Error creating new chat:', error);
      showToast(error.message || 'Error al crear nueva conversación');
    }
  };

  const switchChat = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setMessages(session.messages);
    }
    setIsSidebarOpen(false);
  };

  const deleteChat = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (!confirm(t.confirmClear)) return;
    try {
      await chatService.deleteChat(sessionId);
      const newSessions = sessions.filter(s => s.id !== sessionId);
      setSessions(newSessions);
      if (currentSessionId === sessionId) {
        if (newSessions.length > 0) {
          switchChat(newSessions[0].id);
        } else {
          await createInitialChat();
        }
      }
      showToast('Conversación eliminada correctamente', 'success');
    } catch (error: any) {
      console.error('Error deleting chat:', error);
      showToast(error.message || 'Error al eliminar la conversación');
    }
  };

  const clearAllChats = async () => {
    if (!confirm(t.confirmClear)) return;
    try {
      await chatService.clearAllChats();
      setSessions([]);
      setMessages([]);
      setCurrentSessionId(null);
      await createInitialChat();
      showToast('Historial limpiado correctamente', 'success');
    } catch (error: any) {
      console.error('Error clearing all chats:', error);
      showToast(error.message || 'Error al limpiar el historial');
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      await chatService.deleteMessage(messageId);
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (error: any) {
      console.error('Error deleting message:', error);
      showToast(error.message || 'Error al eliminar el mensaje');
    }
  };

  const startEditing = (message: Message) => {
    setEditingMessageId(message.id);
    setEditValue(message.text);
  };

  const saveEdit = async (messageId: string) => {
    try {
      await chatService.updateMessage(messageId, editValue);
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, text: editValue } : m));
      setEditingMessageId(null);
    } catch (error: any) {
      console.error('Error updating message:', error);
      showToast(error.message || 'Error al actualizar el mensaje');
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !currentSessionId) return;

    const activeSessionId = currentSessionId;
    const tempId = Date.now().toString();
    const userMessage: Message = {
      id: tempId,
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    
    // Update session title if it's the first user message
    let updatedTitle = sessions.find(s => s.id === activeSessionId)?.title || 'Nueva conversación';
    if (messages.length <= 1) {
      updatedTitle = input.slice(0, 30) + (input.length > 30 ? '...' : '');
      await chatService.updateChatTitle(activeSessionId, updatedTitle);
    }

    setSessions(prev => prev.map(s => 
      s.id === activeSessionId 
        ? { ...s, messages: updatedMessages, title: updatedTitle, lastUpdated: new Date() } 
        : s
    ));

    setInput('');
    setIsLoading(true);

    try {
      // Save user message to DB
      const dbUserMsg = await chatService.addMessage(activeSessionId, 'user', input);
      
      const history: GeminiChatMessage[] = updatedMessages.slice(-6).map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      
      const response = await getMuftiResponse(input, history, [], isPremium, session?.user?.user_metadata);
      
      // Save model response to DB
      const dbModelMsg = await chatService.addMessage(activeSessionId, 'assistant', response);

      const modelMessage: Message = {
        id: dbModelMsg.id,
        role: 'assistant',
        text: response,
        timestamp: new Date(dbModelMsg.created_at)
      };
      
      const finalMessages = [...updatedMessages.filter(m => m.id !== tempId), { ...userMessage, id: dbUserMsg.id }, modelMessage];
      
      // Only update current messages if we are still on the same session
      setCurrentSessionId(prev => {
        if (prev === activeSessionId) {
          setMessages(finalMessages);
        }
        return prev;
      });

      setSessions(prev => prev.map(s => 
        s.id === activeSessionId 
          ? { ...s, messages: finalMessages, lastUpdated: new Date() } 
          : s
      ));
    } catch (error: any) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: error.message || t.error,
        timestamp: new Date()
      };
      const finalMessages = [...updatedMessages, errorMessage];
      
      setCurrentSessionId(prev => {
        if (prev === activeSessionId) {
          setMessages(finalMessages);
        }
        return prev;
      });

      setSessions(prev => prev.map(s => 
        s.id === activeSessionId 
          ? { ...s, messages: finalMessages, lastUpdated: new Date() } 
          : s
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!session?.user) return;
    
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: import.meta.env.VITE_STRIPE_PRICE_ID_PREMIUM || 'price_1T40qMDlissxr9xdar8montv',
          userId: session.user.id,
          userEmail: session.user.email,
        }),
      });
      
      const { url, error } = await response.json();
      if (error) throw new Error(error);
      if (url) window.location.href = url;
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      alert('Error al iniciar el proceso de pago. Por favor, inténtalo de nuevo.');
    }
  };

  if (!session) {
    return <Auth darkMode={darkMode} />;
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500 ${
      darkMode ? 'bg-deenly-dark-bg text-deenly-dark-text' : 'bg-deenly-cream text-deenly-green'
    } ${
      fontSize === 'small' ? 'text-sm' : fontSize === 'large' ? 'text-lg' : 'text-base'
    }`}>
      {showSplash && <Splash />}

      {/* Header */}
      <header className={`sticky top-0 z-40 border-b transition-colors duration-300 ${darkMode ? 'bg-deenly-dark-surface/90 border-deenly-gold/10' : 'bg-white/90 border-deenly-gold/10'} backdrop-blur-md`}>
        <div className="max-w-7xl mx-auto px-2 sm:px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-deenly-gold/10 rounded-xl transition-colors text-deenly-gold"
            >
              <Menu size={24} />
            </button>
            <Logo showText size={28} variant={darkMode ? 'gold' : 'default'} className="sm:scale-110" />
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <button 
              onClick={() => setIsSearchModalOpen(true)}
              className="flex items-center gap-2 p-2 sm:px-4 sm:py-2 bg-deenly-gold/10 text-deenly-gold rounded-full hover:bg-deenly-gold/20 transition-colors group"
            >
              <Search size={18} className="group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold uppercase tracking-widest hidden md:inline">{t.searchQuran}</span>
            </button>
            
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 hover:bg-deenly-gold/10 rounded-full transition-colors text-deenly-gold"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            
            <button 
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-2 hover:bg-deenly-gold/10 rounded-full transition-colors text-deenly-gold relative"
            >
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-[#141414]"></span>
            </button>

            <button 
              onClick={() => setIsProfileModalOpen(true)}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-deenly-gold/10 flex items-center justify-center text-deenly-gold border border-deenly-gold/20 hover:bg-deenly-gold/20 transition-colors"
            >
              <User size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full relative overflow-hidden h-[calc(100vh-64px)]">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide pb-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`${
                cardStyle === 'compact' ? 'max-w-[70%] sm:max-w-[60%]' : 'max-w-[90%] sm:max-w-[85%]'
              } p-4 rounded-3xl shadow-sm ${
                message.role === 'user' 
                  ? 'bg-deenly-gold text-white rounded-tr-none' 
                  : darkMode 
                    ? 'bg-deenly-dark-surface border border-deenly-gold/10 rounded-tl-none' 
                    : 'bg-white border border-deenly-gold/10 rounded-tl-none'
              }`}>
                <div className="flex items-center justify-between mb-2 opacity-60">
                  <div className="flex items-center gap-2">
                    {message.role === 'assistant' ? <Sparkles size={14} /> : <User size={14} />}
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      {message.role === 'assistant' ? 'Deenly' : t.you}
                    </span>
                  </div>
                </div>
                <div className="markdown-body">
                  {editingMessageId === message.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className={`w-full p-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-deenly-gold/30 ${
                          darkMode ? 'bg-deenly-dark-bg border-deenly-gold/20 text-white' : 'bg-white border-deenly-gold/10 text-deenly-green'
                        }`}
                        rows={3}
                      />
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => setEditingMessageId(null)}
                          className="p-1.5 rounded-lg hover:bg-black/5 text-[10px] font-bold uppercase tracking-widest"
                        >
                          {t.cancel}
                        </button>
                        <button 
                          onClick={() => saveEdit(message.id)}
                          className="p-1.5 rounded-lg bg-deenly-gold text-white text-[10px] font-bold uppercase tracking-widest"
                        >
                          <Check size={12} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <ReactMarkdown>{message.text}</ReactMarkdown>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {message.role === 'user' && (
                      <button 
                        onClick={() => startEditing(message)}
                        className={`p-1 rounded-md hover:bg-deenly-gold/10 ${message.role === 'user' ? 'text-white/60 hover:text-white' : 'text-deenly-gold/60 hover:text-deenly-gold'}`}
                      >
                        <Edit2 size={12} />
                      </button>
                    )}
                    <button 
                      onClick={() => deleteMessage(message.id)}
                      className={`p-1 rounded-md hover:bg-deenly-gold/10 ${message.role === 'user' ? 'text-white/60 hover:text-white' : 'text-deenly-gold/60 hover:text-deenly-gold'}`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="text-[8px] opacity-40 uppercase tracking-tighter">
                      {new Date(message.timestamp).toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' })} {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className={`p-4 rounded-3xl rounded-tl-none ${darkMode ? 'bg-deenly-dark-surface' : 'bg-white'} border border-deenly-gold/10`}>
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full bg-deenly-gold animate-pulse"
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className={`p-4 pb-6 sm:pb-8 ${darkMode ? 'bg-deenly-dark-bg' : 'bg-deenly-cream'} border-t border-deenly-gold/5`}>
          <div className={`max-w-3xl mx-auto relative group transition-opacity ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={t.placeholder}
              className={`w-full py-4 pl-6 pr-14 rounded-3xl text-sm border border-deenly-gold/20 focus:outline-none focus:ring-2 focus:ring-deenly-gold/30 shadow-lg resize-none transition-colors ${
                darkMode ? 'bg-deenly-dark-surface text-deenly-dark-text' : 'bg-white text-deenly-green'
              }`}
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-deenly-gold text-white rounded-2xl hover:bg-deenly-gold/90 transition-colors disabled:opacity-30 shadow-md"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
          <p className="text-center text-[7px] sm:text-[8px] mt-3 opacity-30 uppercase tracking-[0.2em] font-medium">
            {t.disclaimer}
          </p>
        </div>
      </main>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <>
          <div 
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          />
          <div 
            className={`fixed top-0 left-0 bottom-0 z-50 w-72 shadow-2xl flex flex-col ${darkMode ? 'bg-deenly-dark-surface' : 'bg-deenly-cream'}`}
          >
            <div className="p-6 border-b border-deenly-gold/10 flex items-center justify-between">
              <Logo showText size={28} variant={darkMode ? 'gold' : 'default'} />
              <button onClick={() => setIsSidebarOpen(false)} className="text-deenly-gold">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <button 
                onClick={createNewChat}
                className="w-full flex items-center gap-3 px-4 py-3 bg-deenly-gold text-white rounded-xl hover:bg-deenly-gold/90 transition-colors shadow-md mb-6"
              >
                <Plus size={18} />
                <span className="text-xs font-bold uppercase tracking-widest">{t.newChat}</span>
              </button>

              <div className="text-[10px] font-bold text-deenly-gold uppercase tracking-widest mb-4 px-2">{t.history}</div>
              
              <div className="space-y-1 mb-8">
                {sessions.map(s => (
                  <div 
                    key={s.id}
                    onClick={() => switchChat(s.id)}
                    className={`group flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-colors ${
                      currentSessionId === s.id 
                        ? 'bg-deenly-gold/20 text-deenly-gold' 
                        : 'hover:bg-deenly-gold/5 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <MessageSquare size={16} className="shrink-0" />
                      <span className="text-xs font-medium truncate">{s.title}</span>
                    </div>
                    <button 
                      onClick={(e) => deleteChat(e, s.id)}
                      className="opacity-0 group-hover:opacity-50 hover:!opacity-100 p-1 hover:bg-deenly-gold/10 rounded-md transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {sessions.length === 0 && (
                  <div className="px-4 py-8 text-center opacity-30">
                    <History size={32} className="mx-auto mb-2" />
                    <p className="text-[10px] uppercase tracking-widest">{t.noHistory}</p>
                  </div>
                )}
              </div>

                <div className="text-[10px] font-bold text-deenly-gold uppercase tracking-widest mb-4 px-2">{t.explore}</div>
                
                <div className="space-y-1">
                  <button 
                    onClick={() => {
                      setIsSettingsModalOpen(true);
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-colors ${darkMode ? 'hover:bg-deenly-gold/10 text-deenly-dark-text' : 'hover:bg-deenly-gold/5 text-deenly-green'}`}
                  >
                    <Sparkles size={18} className="text-deenly-gold" />
                    <span className="text-sm font-medium">{t.dailyInspiration}</span>
                  </button>

                  <button 
                    onClick={() => {
                      setIsSurahLibraryOpen(true);
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-colors ${darkMode ? 'hover:bg-deenly-gold/10 text-deenly-dark-text' : 'hover:bg-deenly-gold/5 text-deenly-green'}`}
                  >
                    <BookOpen size={18} className="text-deenly-gold" />
                    <span className="text-sm font-medium">{t.surahLib}</span>
                  </button>

                  <button 
                    onClick={() => {
                      setIsSearchModalOpen(true);
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-colors ${darkMode ? 'hover:bg-deenly-gold/10 text-deenly-dark-text' : 'hover:bg-deenly-gold/5 text-deenly-green'}`}
                  >
                    <Search size={18} className="text-deenly-gold" />
                    <span className="text-sm font-medium">{t.quranSearch}</span>
                  </button>

                  <button 
                    onClick={() => {
                      setIsIslamicCalendarOpen(true);
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-colors ${darkMode ? 'hover:bg-deenly-gold/10 text-deenly-dark-text' : 'hover:bg-deenly-gold/5 text-deenly-green'}`}
                  >
                    <Calendar size={18} className="text-deenly-gold" />
                    <span className="text-sm font-medium">{t.islamicCalendar}</span>
                  </button>

                  <button 
                    onClick={() => {
                      setIsHadithModalOpen(true);
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-colors ${darkMode ? 'hover:bg-deenly-gold/10 text-deenly-dark-text' : 'hover:bg-deenly-gold/5 text-deenly-green'}`}
                  >
                    <Book size={18} className="text-deenly-gold" />
                    <span className="text-sm font-medium">{t.hadith}</span>
                  </button>

                  <button 
                    onClick={() => {
                      setIsPrayerTimesModalOpen(true);
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-colors ${darkMode ? 'hover:bg-deenly-gold/10 text-deenly-dark-text' : 'hover:bg-deenly-gold/5 text-deenly-green'}`}
                  >
                    <Clock size={18} className="text-deenly-gold" />
                    <span className="text-sm font-medium">{t.prayerTimes}</span>
                  </button>

                  <button 
                    onClick={() => {
                      clearAllChats();
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-colors text-red-500 hover:bg-red-500/10`}
                  >
                    <Trash2 size={18} />
                    <span className="text-sm font-medium">{t.clearHistory}</span>
                  </button>
                </div>

                <div className="pt-6">
                  <div className="text-[10px] font-bold text-deenly-gold uppercase tracking-widest mb-4 px-2">{t.premium}</div>
                  <div className={`p-4 rounded-3xl border border-deenly-gold/20 relative overflow-hidden ${darkMode ? 'bg-deenly-gold/5' : 'bg-deenly-gold/5'}`}>
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap size={16} className="text-deenly-gold fill-deenly-gold" />
                        <span className="text-xs font-bold uppercase tracking-wider text-deenly-gold">Deenly Pro</span>
                      </div>
                      <p className="text-[10px] opacity-60 mb-4">{t.proDesc}</p>
                <button 
                  onClick={() => {
                    setIsPlansModalOpen(true);
                    setIsSidebarOpen(false);
                  }}
                  className="w-full py-2 bg-deenly-gold text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-deenly-gold/90 transition-colors"
                >
                  {isPremium ? t.viewPlan : t.upgrade}
                </button>
                    </div>
                    <div className="absolute -right-4 -bottom-4 opacity-10">
                      <Logo size={80} variant="gold" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-deenly-gold/10 space-y-4">
                <button 
                  onClick={() => {
                    setIsSettingsModalOpen(true);
                    setIsSidebarOpen(false);
                  }}
                  className="w-full flex items-center gap-3 text-deenly-gold hover:opacity-80 transition-opacity"
                >
                  <Settings size={18} />
                  <span className="text-sm font-medium">{t.settings}</span>
                </button>
                <button 
                  onClick={() => {
                    setIsAboutModalOpen(true);
                    setIsSidebarOpen(false);
                  }}
                  className="w-full flex items-center gap-3 text-deenly-gold hover:opacity-80 transition-opacity"
                >
                  <Info size={18} />
                  <span className="text-sm font-medium">{t.about}</span>
                </button>
                <button 
                  onClick={() => supabase.auth.signOut()}
                  className="w-full flex items-center gap-3 text-red-500 hover:opacity-80 transition-opacity pt-4 border-t border-deenly-gold/10"
                >
                  <X size={18} />
                  <span className="text-sm font-medium">{t.logout}</span>
                </button>
              </div>
            </div>
          </>
        )}

      {/* Quran Search Modal */}
      <QuranSearchModal 
        isOpen={isSearchModalOpen} 
        onClose={() => setIsSearchModalOpen(false)} 
        darkMode={darkMode}
        isPremium={isPremium}
        session={session}
      />

      {/* Surah Library Modal */}
      <SurahLibrary
        isOpen={isSurahLibraryOpen}
        onClose={() => setIsSurahLibraryOpen(false)}
        darkMode={darkMode}
        session={session}
      />

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        session={session}
        darkMode={darkMode}
        isPremium={isPremium}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        isPremium={isPremium}
        session={session}
      />

      {/* About Modal */}
      <IslamicCalendarModal 
        isOpen={isIslamicCalendarOpen} 
        onClose={() => setIsIslamicCalendarOpen(false)} 
        darkMode={darkMode} 
      />

      <HadithModal
        isOpen={isHadithModalOpen}
        onClose={() => setIsHadithModalOpen(false)}
        darkMode={darkMode}
      />

      <PrayerTimesModal
        isOpen={isPrayerTimesModalOpen}
        onClose={() => setIsPrayerTimesModalOpen(false)}
        darkMode={darkMode}
        language={language}
      />

      <AboutModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
        darkMode={darkMode}
      />

      {/* Toast Notifications */}
      {toast && (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 ${
          toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-deenly-gold text-deenly-ink'
        }`}>
          {toast.type === 'error' ? <Info size={18} /> : <Check size={18} />}
          <p className="text-sm font-medium">{toast.message}</p>
          <button onClick={() => setToast(null)} className="p-1 hover:bg-black/10 rounded-full transition-colors">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Plans Modal */}
      <PlansModal
        isOpen={isPlansModalOpen}
        onClose={() => setIsPlansModalOpen(false)}
        darkMode={darkMode}
        isPremium={isPremium}
        onUpgrade={handleUpgrade}
      />
    </div>
  );
}
