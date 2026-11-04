import React, { useState, useEffect, useRef } from 'react';
import { supabase, UserProfile, Conversation, ChatMessage } from './lib/supabase';
import { VoiceAssistantController, VoiceState } from './lib/voice';
import { AudioWaveform } from './components/AudioWaveform';
import { ProviderBadge, PROVIDER_CATALOG } from './components/ProviderBadge';
import AdminDashboard from './components/AdminDashboard';
import {
  Mic,
  MicOff,
  Send,
  Plus,
  Volume2,
  VolumeX,
  Languages,
  Sparkles,
  Trash2,
  Menu,
  X,
  User,
  LogOut,
  LogIn,
  Bot,
  AlertCircle,
  HelpCircle,
  Check,
  Cpu,
} from 'lucide-react';

function SoraChat() {
  // Authentication & Profile
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Language & Provider
  const [language, setLanguage] = useState<'bn' | 'en'>('bn');
  const [selectedProviderId, setSelectedProviderId] = useState<string>('auto');
  const [publicProviders, setPublicProviders] = useState<any[]>([]);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'degraded' | 'offline'>('checking');

  // Voice Assistant State
  const [voiceState, setVoiceState] = useState<VoiceState>({
    isListening: false,
    isSpeaking: false,
    permissionGranted: null,
    audioLevel: 0,
    error: null,
    transcript: '',
  });
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [collaborate, setCollaborate] = useState(false);

  // Chat & Conversations
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const voiceControllerRef = useRef<VoiceAssistantController | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // 1. Initialize Voice Controller
  useEffect(() => {
    const controller = new VoiceAssistantController(
      (updatedState) => {
        setVoiceState((prev) => ({ ...prev, ...updatedState }));
      },
      (finalTranscript) => {
        // When speech recognition produces a final speech transcript, automatically submit
        if (finalTranscript.trim().length > 0) {
          handleSendMessage(finalTranscript.trim());
        }
      }
    );

    controller.setLanguage(language === 'bn' ? 'bn-BD' : 'en-US');
    voiceControllerRef.current = controller;

    return () => {
      controller.stopListening();
      controller.stopSpeaking();
    };
  }, []);

  // Update language in controller
  useEffect(() => {
    if (voiceControllerRef.current) {
      voiceControllerRef.current.setLanguage(language === 'bn' ? 'bn-BD' : 'en-US');
    }
  }, [language]);

  // 2. Fetch Public Providers & Auth Session
  useEffect(() => {
    fetch('/api/providers/public')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setPublicProviders(data);
      })
      .catch((err) => console.warn('Could not fetch providers', err));
    fetch('/api/health')
      .then(async (res) => {
        const data = await res.json();
        setBackendStatus(res.ok && data.status === 'healthy' ? 'connected' : 'degraded');
      })
      .catch(() => setBackendStatus('offline'));

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserProfile(session.user.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 3. Load or initialize default conversation
  useEffect(() => {
    if (messages.length === 0) {
      // Seed welcome greeting based on language
      const greeting: ChatMessage = {
        id: 'welcome',
        conversation_id: 'default',
        role: 'assistant',
        content:
          language === 'bn'
            ? 'নমস্কার! আমি সোরা (SORA), আপনার ব্যক্তিগত মাল্টি-এআই ভয়েস অ্যাসিস্ট্যান্ট। মাইক্রোফোন বাটনে ক্লিক করে কথা বলুন অথবা নিচে টেক্সট টাইপ করুন।'
            : "Hello! I am SORA, your multi-AI personal voice assistant. Press the microphone button to start speaking, or type your query below.",
        provider_used: 'gemini',
        created_at: new Date().toISOString(),
      };
      setMessages([greeting]);
    }
  }, [language]);

  // Scroll to bottom on new message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, voiceState.transcript]);

  useEffect(() => {
    if (!session?.access_token) {
      setConversations([]);
      return;
    }
    const loadConversations = async () => {
      try {
        const response = await fetch('/api/conversations?limit=50', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!response.ok) return;
        const data = await response.json();
        setConversations(Array.isArray(data.conversations) ? data.conversations : []);
      } catch (error) {
        console.warn('Conversation history is unavailable', error);
      }
    };
    loadConversations();
  }, [session]);

  const openConversation = async (conversationId: string) => {
    if (!session?.access_token) return;
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load conversation');
      setCurrentConversationId(conversationId);
      setMessages((data.messages || []).map((message: any) => ({
        ...message,
        conversation_id: conversationId,
      })));
      setSidebarOpen(false);
    } catch (error: any) {
      setChatError(error.message || 'Could not load conversation history.');
    }
  };

  const deleteConversation = async (conversationId: string) => {
    if (!session?.access_token) return;
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!response.ok) throw new Error('Could not delete conversation');
      setConversations((items) => items.filter((item) => item.id !== conversationId));
      if (currentConversationId === conversationId) handleNewChat();
    } catch (error: any) {
      setChatError(error.message || 'Could not delete conversation.');
    }
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (data) setProfile(data);
    } catch {}
  };

  // Voice Toggle Controls (Explicit start/stop per requirement)
  const toggleVoiceListening = async () => {
    if (!voiceControllerRef.current) return;

    if (voiceState.isListening) {
      voiceControllerRef.current.stopListening();
    } else {
      setChatError(null);
      await voiceControllerRef.current.startListening();
    }
  };

  // Send Message Logic
  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text || text.trim() === '' || isGenerating) return;

    setInputText('');
    setChatError(null);

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      conversation_id: currentConversationId || 'temp',
      role: 'user',
      content: text.trim(),
      created_at: new Date().toISOString(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setIsGenerating(true);

    try {
      // Call backend API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          messages: newHistory
            .filter((m) => m.id !== 'welcome')
            .map((m) => ({ role: m.role, content: m.content }))
            .slice(-40),
          providerId: selectedProviderId === 'auto' ? undefined : selectedProviderId,
          language,
          ...(currentConversationId ? { conversationId: currentConversationId } : {}),
          collaborate,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to get response from AI');
      }

      if (data.conversationId) {
        setCurrentConversationId(data.conversationId);
        if (session?.access_token) {
          fetch('/api/conversations?limit=50', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }).then((res) => res.ok ? res.json() : null)
            .then((history) => { if (history?.conversations) setConversations(history.conversations); })
            .catch(() => undefined);
        }
      }

      const assistantMsg: ChatMessage = {
        id: `ast-${Date.now()}`,
        conversation_id: currentConversationId || 'temp',
        role: 'assistant',
        content: data.text,
        provider_used: data.providerId,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Speak aloud if TTS is enabled
      if (ttsEnabled && voiceControllerRef.current) {
        voiceControllerRef.current.speak(
          data.text,
          data.language || language,
          () => {},
          () => {}
        );
      }
    } catch (err: any) {
      setChatError(err.message || 'Error communicating with AI service.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNewChat = () => {
    setCurrentConversationId(null);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        conversation_id: 'new',
        role: 'assistant',
        content:
          language === 'bn'
            ? 'নতুন কথোপকথন শুরু হলো। আমি আপনাকে কীভাবে সাহায্য করতে পারি?'
            : 'New conversation started. How can I assist you today?',
        provider_used: 'gemini',
        created_at: new Date().toISOString(),
      },
    ]);
    if (voiceControllerRef.current) {
      voiceControllerRef.current.stopSpeaking();
    }
    setSidebarOpen(false);
  };



  return (
    <div className="sora-hud flex h-screen w-full bg-[#07090e] text-slate-100 overflow-hidden font-sans">
      {/* Sidebar for Conversation History & Profile (Responsive) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-slate-950/95 border-r border-slate-800/80 p-4 flex flex-col justify-between transition-transform duration-300 md:static md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Logo */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Sparkles className="w-5 h-5 text-slate-950" />
              </div>
              <div>
                <h1 className="font-extrabold tracking-wider font-mono text-lg bg-gradient-to-r from-cyan-300 via-white to-blue-400 bg-clip-text text-transparent">
                  SORA
                </h1>
                <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">
                  Voice Assistant
                </p>
              </div>
            </div>

            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* New Chat Button */}
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/40 text-cyan-300 font-medium text-xs transition glow-cyan mb-4"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'bn' ? 'নতুন কথোপকথন' : 'New Conversation'}</span>
          </button>

          {/* Provider Selection Info */}
          <div className="mb-4 p-3 rounded-xl bg-slate-900/60 border border-slate-800/60">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-mono text-slate-400 uppercase text-[10px]">
                {language === 'bn' ? 'সক্রিয় এআই মডেল' : 'Active Model'}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/50 font-mono">
                {selectedProviderId === 'auto' ? 'Auto-Routing' : selectedProviderId.toUpperCase()}
              </span>
            </div>
            <select
              value={selectedProviderId}
              onChange={(e) => setSelectedProviderId(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
            >
              <option value="auto">⚡ Auto Router (Smart Fallback)</option>
              {publicProviders.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName} {p.enabled ? '✓' : '(Not configured)'}
                </option>
              ))}
            </select>
          </div>

          {session && (
            <section className="mt-4">
              <div className="flex items-center justify-between px-1 mb-2">
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">
                  {language === 'bn' ? 'আগের কথোপকথন' : 'Recent conversations'}
                </span>
                <span className="text-[10px] text-slate-600">{conversations.length}</span>
              </div>
              <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                {conversations.length === 0 ? (
                  <p className="px-2 py-3 text-[11px] text-slate-600">
                    {language === 'bn' ? 'এখনও কোনো সংরক্ষিত চ্যাট নেই' : 'No saved chats yet'}
                  </p>
                ) : conversations.slice(0, 30).map((conversation) => (
                  <div key={conversation.id} className={`group flex items-center gap-1 rounded-lg ${currentConversationId === conversation.id ? 'bg-cyan-950/50 border border-cyan-900/60' : 'hover:bg-slate-900'}`}>
                    <button onClick={() => openConversation(conversation.id)} className="min-w-0 flex-1 text-left px-2.5 py-2 text-xs text-slate-300 truncate">
                      {conversation.title || (language === 'bn' ? 'নতুন কথোপকথন' : 'New conversation')}
                    </button>
                    <button onClick={() => deleteConversation(conversation.id)} title={language === 'bn' ? 'মুছুন' : 'Delete'} className="opacity-60 hover:opacity-100 p-2 text-slate-500 hover:text-rose-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* User Auth & Profile Footer */}
        <div className="pt-4 border-t border-slate-800/80">
          {session ? (
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-2.5 truncate">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-bold text-xs uppercase">
                  {profile?.full_name ? profile.full_name[0] : session.user.email[0]}
                </div>
                <div className="truncate">
                  <div className="text-xs font-semibold text-white truncate">
                    {profile?.full_name || session.user.email.split('@')[0]}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">
                    {session.user.email}
                  </div>
                </div>
              </div>
              <button
                onClick={() => supabase.auth.signOut()}
                title="Sign out"
                className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="w-full text-center py-2.5 px-3 rounded-xl bg-slate-900/70 border border-slate-800 text-slate-400 text-xs">
              {language === 'bn' ? 'Guest Mode · লগইন ছাড়াই ব্যবহার করুন' : 'Guest Mode · No login required'}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Header */}
        <header className="h-16 px-4 sm:px-6 bg-slate-950/40 border-b border-slate-800/60 backdrop-blur-md flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-850"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-wide text-white">SORA Voice Hub</span>
              <span className={`h-2 w-2 rounded-full ${backendStatus === 'connected' ? 'bg-emerald-400' : backendStatus === 'degraded' ? 'bg-amber-400' : backendStatus === 'offline' ? 'bg-rose-400' : 'bg-slate-500 animate-pulse'}`} />
              <span className="hidden sm:inline-block text-xs text-slate-500 font-mono">
                {backendStatus === 'connected' ? 'Backend Connected' : backendStatus === 'degraded' ? 'Backend Degraded' : backendStatus === 'offline' ? 'Backend Offline' : 'Connecting to Backend…'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Language Switcher */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5 text-xs font-mono">
              <button
                onClick={() => setLanguage('bn')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  language === 'bn'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                বাংলা
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  language === 'en'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ENG
              </button>
            </div>

            {/* TTS Toggle Button */}
            <button
              onClick={() => {
                if (voiceState.isSpeaking && voiceControllerRef.current) {
                  voiceControllerRef.current.stopSpeaking();
                }
                setTtsEnabled(!ttsEnabled);
              }}
              title={ttsEnabled ? 'Spoken Voice: Enabled' : 'Spoken Voice: Muted'}
              className={`p-2 rounded-xl border text-xs transition ${
                ttsEnabled
                  ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>


          </div>
        </header>

        {/* Chat Stream & Visualizer Container */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
          {/* Audio Waveform Visualizer & Microphone Active Status */}
          <div className="max-w-2xl mx-auto sora-voice-panel">
            <AudioWaveform
              isListening={voiceState.isListening}
              isSpeaking={voiceState.isSpeaking}
              audioLevel={voiceState.audioLevel}
            />

            {/* Live speech transcription display */}
            {voiceState.transcript && (
              <div className="mt-3 p-3 rounded-xl bg-cyan-950/40 border border-cyan-800/40 text-cyan-200 text-xs font-mono animate-fadeIn flex items-start gap-2">
                <Mic className="w-4 h-4 shrink-0 text-cyan-400 animate-pulse mt-0.5" />
                <div>
                  <span className="font-semibold text-cyan-300">
                    {language === 'bn' ? 'শুনছি: ' : 'Recognized Speech: '}
                  </span>
                  <span>{voiceState.transcript}</span>
                </div>
              </div>
            )}

            {/* Microphone Permission Warning / Error */}
            {voiceState.error && (
              <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{voiceState.error}</span>
              </div>
            )}

            {/* Chat API Error */}
            {chatError && (
              <div className="mt-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <div className="flex-1">
                    <span className="font-semibold">{chatError}</span>
                  </div>
                  <button
                    onClick={() => setChatError(null)}
                    className="text-slate-400 hover:text-white text-xs font-mono"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Messages Stream */}
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={m.id}
                  className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar */}
                  <div
                    className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 text-xs ${
                      isUser
                        ? 'bg-blue-600 text-white'
                        : 'bg-gradient-to-tr from-cyan-500 to-purple-600 text-slate-950 font-bold'
                    }`}
                  >
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 shadow-lg text-sm leading-relaxed ${
                      isUser
                        ? 'bg-blue-600/90 text-white rounded-tr-sm'
                        : 'bg-slate-900/80 border border-slate-800 text-slate-100 rounded-tl-sm backdrop-blur-md'
                    }`}
                  >
                    {/* Assistant metadata header */}
                    {!isUser && (
                      <div className="mb-2 flex items-center justify-between gap-2 border-b border-slate-800/80 pb-1.5">
                        <ProviderBadge
                          providerId={m.provider_used || 'gemini'}
                          autoSelected={selectedProviderId === 'auto'}
                        />

                        {ttsEnabled && (
                          <button
                            onClick={() => {
                              if (voiceControllerRef.current) {
                                voiceControllerRef.current.speak(m.content, language);
                              }
                            }}
                            title="Replay Voice Audio"
                            className="text-slate-400 hover:text-cyan-300 transition"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Content */}
                    <div className="whitespace-pre-wrap sora-message-text">{m.content}</div>

                    <div
                      className={`mt-2 text-[10px] font-mono ${
                        isUser ? 'text-blue-200' : 'text-slate-500'
                      }`}
                    >
                      {new Date(m.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Generating Skeleton */}
            {isGenerating && (
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 text-slate-950 flex items-center justify-center font-bold text-xs">
                  <Bot className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl rounded-tl-sm p-4 backdrop-blur-md">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.4s]" />
                    <span className="text-xs text-slate-400 font-mono ml-2">
                      {language === 'bn' ? 'সোরা ভাবছে...' : 'SORA is thinking...'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>
        </div>

        {/* Voice and Text Input Dock */}
        <div className="p-3 sm:p-4 bg-slate-950/80 border-t border-slate-800/80 backdrop-blur-xl">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            {/* Explicit Microphone Start/Stop Button */}
            <button
              onClick={toggleVoiceListening}
              title={
                voiceState.isListening
                  ? 'Click to STOP voice recording'
                  : 'Click to START voice conversation'
              }
              className={`p-3.5 rounded-2xl transition-all duration-300 flex items-center justify-center shrink-0 shadow-lg ${
                voiceState.isListening
                  ? 'bg-rose-500 text-white animate-pulse shadow-rose-500/50 glow-cyan ring-4 ring-rose-500/20'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20'
              }`}
            >
              {voiceState.isListening ? (
                <MicOff className="w-5 h-5 text-white" />
              ) : (
                <Mic className="w-5 h-5 text-slate-950" />
              )}
            </button>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex-1 flex items-center gap-2 relative"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  voiceState.isListening
                    ? language === 'bn'
                      ? 'মাইক্রোফোন চালু আছে... কথা বলুন...'
                      : 'Listening... Speak now...'
                    : language === 'bn'
                    ? 'সোরাকে কিছু জিজ্ঞাসা করুন...'
                    : 'Ask SORA anything or press the microphone...'
                }
                className="w-full px-4 py-3 bg-slate-900/90 border border-slate-700/80 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-sans"
              />

              <button
                type="submit"
                disabled={!inputText.trim() || isGenerating}
                className="absolute right-2 p-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 border border-cyan-500/30 transition disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>


    </div>
  );
}


export default function App() {
  if (window.location.pathname.replace(/\/$/, '') === '/admin') return <AdminDashboard />;
  return <SoraChat />;
}
