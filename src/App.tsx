import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Bot, 
  User, 
  Trash2, 
  LogOut,
  Plus,
  MessageSquare,
  Settings,
  X,
  Lock,
  Mail,
  Loader2,
  ChevronLeft,
  Menu,
  RotateCcw,
  Square,
  Users,
  Code,
  FolderOpen,
  ArrowRight,
  Terminal,
  Brain,
  Shield
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message, ModelType, ChatSession, User as UserType, CouncilMemberResponse } from './types.ts';

export default function App() {
  const [user, setUser] = useState<UserType | null>(null);
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isPuterReady, setIsPuterReady] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authError, setAuthError] = useState('');
  const [selectedModel, setSelectedModel] = useState<ModelType>('auto');
  const [isAdminView, setIsAdminView] = useState(false);
  const [adminUsers, setAdminUsers] = useState<UserType[]>([]);
  
  // Workspace state
  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.is_admin && isAdminView) {
      fetch('/api/admin/users')
        .then(res => res.json())
        .then(data => setAdminUsers(data));
    }
  }, [user, isAdminView]);

  const updateUserStatus = async (userId: number, status: string) => {
    await fetch(`/api/admin/users/${userId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setAdminUsers(adminUsers.map(u => u.id === userId ? { ...u, status: status as any } : u));
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const checkPuter = setInterval(() => {
      if (window.puter && window.puter.ai) {
        setIsPuterReady(true);
        clearInterval(checkPuter);
      }
    }, 200);
    return () => clearInterval(checkPuter);
  }, []);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) setUser(data.user);
      })
      .finally(() => setIsAuthLoading(false));
  }, []);

  useEffect(() => {
    if (user) {
      fetch('/api/chats')
        .then(res => res.json())
        .then(data => setChats(data));
    }
  }, [user]);

  useEffect(() => {
    if (currentChatId) {
      fetch(`/api/chats/${currentChatId}/messages`)
        .then(res => res.json())
        .then(data => {
          setMessages(data.map((m: any) => ({
            id: m.id.toString(),
            role: m.role,
            content: m.content,
            timestamp: parseInt(m.timestamp),
            isCouncil: m.isCouncil,
            councilResponses: m.councilResponses
          })));
        });
    } else {
      setMessages([]);
    }
  }, [currentChatId]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const formData = new FormData(e.target as HTMLFormElement);
    const email = formData.get('email');
    const password = formData.get('password');

    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/signup';
      console.log(`[AUTH] Path: ${endpoint}, Mode: ${authMode}`);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await res.json().catch(() => ({ error: 'Invalid response from server' }));
      
      if (res.ok) {
        setUser(data.user);
      } else {
        console.error(`[AUTH] Error ${res.status}:`, data);
        setAuthError(data.error || `Server returned error ${res.status}`);
      }
    } catch (err) {
      console.error('[AUTH] Fetch Exception:', err);
      setAuthError('Connection failure. The secure terminal is unreachable.');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setChats([]);
    setCurrentChatId(null);
  };

  const createNewChat = async () => {
    const title = prompt('Chat Name:', 'New Conversation') || 'New Conversation';
    const res = await fetch('/api/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, model: selectedModel }),
    });
    const newChat = await res.json();
    setChats([newChat, ...chats]);
    setCurrentChatId(newChat.id);
  };

  const openWorkspace = async () => {
    try {
      if ('showDirectoryPicker' in window) {
        // @ts-ignore
        const handle = await window.showDirectoryPicker();
        setDirectoryHandle(handle);
        alert(`Workspace linked: ${handle.name}`);
      } else {
        // Fallback for Firefox/Safari
        const input = document.createElement('input');
        input.type = 'file';
        // @ts-ignore
        input.webkitdirectory = true;
        input.onchange = (e: any) => {
          const files = e.target.files;
          if (files.length > 0) {
            alert(`Workspace linked: ${files[0].webkitRelativePath.split('/')[0]} (${files.length} files tracked)`);
            // Note: We can't get a directory handle here, but we can access the file list
          }
        };
        input.click();
      }
    } catch (e) {
      console.error('Workspace access denied');
    }
  };

  const deleteChat = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Delete this chat?')) {
      await fetch(`/api/chats/${id}`, { method: 'DELETE' });
      setChats(chats.filter(c => c.id !== id));
      if (currentChatId === id) setCurrentChatId(null);
    }
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  };

  const exportChat = () => {
    const chat = chats.find(c => c.id === currentChatId);
    if (!chat) return;
    const content = messages.map(m => `### ${m.role.toUpperCase()}\n${m.content}\n`).join('\n---\n\n');
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chat.title.replace(/\s+/g, '_')}.md`;
    a.click();
  };

  const performDeliberation = async (prompt: string): Promise<{ responses: CouncilMemberResponse[], consensus: string }> => {
    if (!window.puter || !window.puter.ai) {
      throw new Error('Neural core offline. Re-establishing link...');
    }
    const models = ['claude-3-5-sonnet', 'gpt-4o', 'claude-opus-4.7'];
    const responses: CouncilMemberResponse[] = [];
    
    // 1. Initial independent thoughts
    for (const model of models) {
      try {
        const res = await window.puter.ai.chat(prompt, { model });
        responses.push({ model, content: res.text, status: 'done' });
      } catch (e: any) {
        responses.push({ model, content: `Interference detected: ${e.message}`, status: 'error' });
      }
    }

    // 2. Cross-challenge and synthesis
    const synthesisPrompt = `You are the lead moderator of an AI Council. Below are responses from different models to the prompt: "${prompt}"\n\n` +
      responses.map(r => `[Model ${r.model}]: ${r.content}`).join('\n\n') +
      `\n\nAnalyze these responses, identify conflicts, and provide a single, unified, superior consensus answer that captures the best of all worlds.`;

    try {
      const consensusRes = await window.puter.ai.chat(synthesisPrompt, { model: 'claude-opus-4.7' });
      return { responses, consensus: consensusRes.text };
    } catch (e) {
      return { responses, consensus: "Deliberation failed due to node instability. Please retry sequence." };
    }
  };

  const handleSend = async (e?: React.FormEvent, retryMessageId?: string) => {
    if (e) e.preventDefault();
    if (!user) return;
    if ((!input.trim() && !retryMessageId) || isLoading) return;

    if (!window.puter || !window.puter.ai) {
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'assistant', 
        content: "### [!] ERROR: NEURAL CORE OFFLINE\nThe connection to the Puter AI cloud was interrupted. Please wait for the 'Reconnect AI' indicator in the header or refresh the terminal.", 
        timestamp: Date.now() 
      }]);
      return;
    }

    let chatId = currentChatId;
    if (!chatId) {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: input.trim().substring(0, 30) || 'New Chat', model: selectedModel }),
      });
      const newChat = await res.json();
      chatId = newChat.id;
      setChats([newChat, ...chats]);
      setCurrentChatId(chatId);
    }

    const userInput = input.trim();
    let chatHistory = [...messages];

    if (!retryMessageId) {
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: userInput,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, userMessage]);
      setInput('');
      chatHistory = [...messages, userMessage];
      await fetch(`/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userMessage),
      });

      if (chatHistory.length === 1) {
        try {
          const titleResponse = await window.puter.ai.chat(`Short title (max 20 chars) for: ${userInput}`);
          const newTitle = titleResponse.text.replace(/"/g, '').trim().toUpperCase();
          await fetch(`/api/chats/${chatId}/title`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: newTitle }),
          });
          setChats(prev => prev.map(c => c.id === chatId ? { ...c, title: newTitle } : c));
        } catch (e) {
          console.warn("Title auto-generation failed", e);
        }
      }
    } else {
      const assistantIndex = messages.findIndex(m => m.id === retryMessageId);
      chatHistory = messages.slice(0, assistantIndex);
      setMessages(chatHistory);
    }

    setIsLoading(true);
    abortControllerRef.current = new AbortController();

    try {
      if (!window.puter || !window.puter.ai) throw new Error('Puter AI cloud service is not responding. Please check your network or try again.');

      let targetModel = selectedModel;
      if (targetModel === 'auto') {
        try {
          const routerPrompt = `Task analysis: Recommend best model. 
          Models: 'claude-opus-4.7' (complex/code), 'gpt-4o' (multimodal), 'claude-3-5-sonnet' (creative), 'gemini-1.5-flash' (speed).
          Prompt: "${userInput || chatHistory[chatHistory.length-1].content}"
          Return ID only.`;
          const routerRes = await window.puter.ai.chat(routerPrompt);
          targetModel = routerRes.text.trim() as ModelType;
          const validModels = ['claude-opus-4.7', 'gpt-4o', 'gemini-1.5-flash', 'claude-3-5-sonnet'];
          if (!validModels.includes(targetModel)) targetModel = 'claude-3-5-sonnet';
        } catch (e) {
          targetModel = 'claude-3-5-sonnet';
        }
      }

      const assistantId = (Date.now() + 1).toString();

      if (targetModel === 'council') {
        const { responses, consensus } = await performDeliberation(userInput || chatHistory[chatHistory.length-1].content);
        const councilMsg: Message = {
          id: assistantId,
          role: 'assistant',
          content: consensus,
          timestamp: Date.now(),
          isCouncil: true,
          councilResponses: responses
        };
        setMessages(prev => [...prev, councilMsg]);
        await fetch(`/api/chats/${chatId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(councilMsg),
        });
      } else {
        setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', timestamp: Date.now() }]);
        let fullContent = '';
        const response = await window.puter.ai.chat(
          chatHistory.map(m => ({ role: m.role, content: m.content })),
          { model: targetModel, stream: true }
        );
        for await (const part of response) {
          if (abortControllerRef.current?.signal.aborted) break;
          if (part?.text) {
            fullContent += part.text;
            setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: fullContent } : m));
          }
        }
        await fetch(`/api/chats/${chatId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'assistant', content: fullContent, timestamp: Date.now() }),
        });
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: `Error: ${error.message}`, timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  if (isAuthLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-blue-600" size={32} />
          <p className="text-sm font-medium text-gray-400">Starting Chat...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-10">
            <div className="w-12 h-12 bg-blue-600 flex items-center justify-center mb-6 shadow-xl rounded-2xl text-white">
              <Bot size={28} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Chat AI</h1>
            <p className="text-gray-500 text-sm mt-1">Simple, smart conversations</p>
          </div>
          
          <div className="bg-white border border-gray-200 p-8 rounded-3xl shadow-sm">
            <form onSubmit={handleAuth} className="space-y-5">
              {authError && (
                <div className="bg-red-50 text-red-600 text-xs font-medium p-4 rounded-xl border border-red-100 flex items-center gap-2">
                  <X size={14} />
                  {authError}
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600 ml-1">Email Address</label>
                <input name="email" type="email" required className="app-input shadow-none" placeholder="name@example.com" />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600 ml-1">Password</label>
                <input name="password" type="password" required className="app-input shadow-none" placeholder="••••••••" />
              </div>
              
              <button type="submit" className="w-full py-4 bg-blue-600 text-white text-sm font-bold rounded-2xl hover:bg-blue-700 transition-all active:scale-[0.98] shadow-lg shadow-blue-600/20">
                {authMode === 'login' ? 'Log In' : 'Sign Up'}
              </button>
            </form>
            
            <div className="mt-8 text-center">
              <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="text-xs text-gray-500 font-medium hover:text-blue-600 transition-colors">
                {authMode === 'login' ? "New here? Create an account" : "Already have an account? Log in"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white font-sans text-gray-900 overflow-hidden">
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside initial={{ width: 0, opacity: 0 }} animate={{ width: 300, opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="flex flex-col bg-gray-50 border-r border-gray-100 h-full overflow-hidden relative z-20">
            <div className="p-6 flex flex-col gap-6 h-full">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Conversations</span>
                <button onClick={createNewChat} className="p-2 hover:bg-gray-200 rounded-xl text-gray-500 transition-all"><Plus size={18} /></button>
              </div>
              
              <div className="flex-1 space-y-1 overflow-y-auto pr-2 scrollbar-hide">
                {chats.length === 0 ? (
                  <div className="py-20 text-center space-y-3">
                    <p className="text-xs text-gray-400 font-medium tracking-wide">No conversations yet</p>
                  </div>
                ) : (
                  chats.map(chat => (
                    <div 
                      key={chat.id} 
                      onClick={() => setCurrentChatId(chat.id)} 
                      className={`group flex items-center gap-3 px-4 py-3.5 rounded-2xl text-[13px] font-medium transition-all cursor-pointer border ${currentChatId === chat.id ? 'bg-white text-blue-600 border-gray-100 shadow-sm' : 'text-gray-500 hover:bg-gray-100 border-transparent'}`}
                    >
                      <MessageSquare size={16} className={currentChatId === chat.id ? 'text-blue-600' : 'text-gray-400'} />
                      <span className="truncate flex-1">{chat.title}</span>
                      <Trash2 onClick={(e) => deleteChat(e, chat.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all active:scale-90" size={14} />
                    </div>
                  ))
                )}
              </div>

              <div className="mt-auto pt-6 space-y-6">
                <div className="space-y-3">
                  {user.is_admin && (
                    <button onClick={() => setIsAdminView(!isAdminView)} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-xs font-bold transition-all border ${isAdminView ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-100'}`}>
                      <Shield size={16} />
                      {isAdminView ? 'Exit Control' : 'Admin Panel'}
                    </button>
                  )}
                  <button onClick={openWorkspace} className="w-full flex items-center gap-3 px-4 py-3.5 bg-white border border-gray-100 rounded-2xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-all">
                    <FolderOpen size={16} className="text-amber-500" />
                    Code Workspace
                    {directoryHandle && <div className="w-2 h-2 rounded-full bg-green-500 ml-auto shadow-[0_0_8px_rgba(34,197,94,0.3)]" />}
                  </button>
                </div>

                <div className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-[24px] shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-blue-500/20">
                    {user.email[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-gray-900 truncate">{user.email.split('@')[0]}</p>
                    <p className="text-[10px] text-gray-400 font-medium tracking-tight">Active Session</p>
                  </div>
                  <button onClick={handleLogout} className="p-2.5 hover:bg-red-50 rounded-xl text-gray-400 hover:text-red-500 transition-all">
                    <LogOut size={16} />
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] block ml-1 text-center">Intelligence Engine</label>
                  <select 
                    value={selectedModel} 
                    onChange={(e) => setSelectedModel(e.target.value as ModelType)} 
                    className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-3.5 text-xs font-bold text-gray-700 outline-none focus:border-blue-500 transition-all cursor-pointer appearance-none shadow-sm text-center"
                  >
                    <option value="auto">Neural Auto-route</option>
                    <optgroup label="High Power">
                      <option value="claude-opus-4.7">Claude Opus</option>
                      <option value="gpt-4o">GPT-4o</option>
                    </optgroup>
                    <optgroup label="Lightning Fast">
                      <option value="gemini-1.5-flash">Gemini Flash</option>
                      <option value="claude-3-5-sonnet">Claude Sonnet</option>
                    </optgroup>
                    <option value="council">AI Council (Consensus)</option>
                  </select>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col min-w-0 bg-white relative">
        <header className="h-20 flex items-center justify-between px-8 z-10 sticky top-0 bg-white/80 backdrop-blur-xl border-b border-gray-100">
          <div className="flex items-center gap-6">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2.5 hover:bg-gray-100 rounded-xl text-gray-400 transition-all active:scale-95">
              {isSidebarOpen ? <ChevronLeft size={22} /> : <Menu size={22} />}
            </button>
            <div className="flex flex-col">
              <h2 className="text-base font-bold tracking-tight text-gray-900 flex items-center gap-2">
                {chats.find(c => c.id === currentChatId)?.title || 'New Chat'}
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 rounded-full border border-green-100">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[9px] font-bold text-green-600 uppercase tracking-widest">Secure</span>
                </div>
              </h2>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{selectedModel === 'council' ? 'Dynamic Consensus Node' : selectedModel.replace(/-/g, ' ')}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {!isPuterReady && (
              <button onClick={() => window.location.reload()} className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-xl text-[10px] font-bold border border-amber-100 shadow-sm animate-pulse">
                <RotateCcw size={14} /> Reconnect AI
              </button>
            )}
            {currentChatId && (
              <button onClick={exportChat} className="p-2.5 hover:bg-gray-50 rounded-xl text-gray-400 transition-all hover:text-blue-600" title="Secure Export">
                <ArrowRight size={22} className="rotate-[270deg]" />
              </button>
            )}
            <div className="w-10 h-10 flex items-center justify-center text-gray-300">
              <Settings size={22} />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-12 scrollbar-hide">
          <div className="max-w-3xl mx-auto">
            {isAdminView ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                <div className="flex items-center justify-between border-b border-gray-100 pb-6">
                  <h3 className="text-xl font-bold text-gray-900">User Management</h3>
                </div>
                <div className="bg-gray-50 rounded-3xl overflow-hidden border border-gray-100">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-gray-100/50">
                        <th className="px-6 py-4 font-bold text-gray-500 text-xs uppercase tracking-wider">User</th>
                        <th className="px-6 py-4 font-bold text-gray-500 text-xs uppercase tracking-wider">Role</th>
                        <th className="px-6 py-4 font-bold text-gray-500 text-xs uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 font-bold text-gray-500 text-xs uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {adminUsers.map(u => (
                        <tr key={u.id} className="hover:bg-white transition-colors">
                          <td className="px-6 py-4 font-medium text-gray-900">{u.email}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${u.is_admin ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                              {u.is_admin ? 'Admin' : 'User'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${u.status === 'approved' ? 'bg-green-50 text-green-600' : u.status === 'denied' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                              {u.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            {u.status !== 'approved' && <button onClick={() => updateUserStatus(u.id, 'approved')} className="p-1.5 hover:bg-green-50 text-green-600 rounded-lg"><Plus size={16} /></button>}
                            {u.status !== 'denied' && <button onClick={() => updateUserStatus(u.id, 'denied')} className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg"><X size={16} /></button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center pt-32 space-y-10">
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }} 
                  animate={{ scale: 1, opacity: 1 }} 
                  className="w-24 h-24 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-500"
                >
                  <Bot size={48} />
                </motion.div>
                <div className="space-y-4">
                  <h3 className="text-3xl font-bold text-gray-900">How can I help you today?</h3>
                  <p className="text-gray-500 text-base max-w-md mx-auto leading-relaxed">I'm your personal AI assistant, ready to help with tasks, questions, or just a friendly chat.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-12 pb-10">
                {messages.map((m, idx) => (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className={`flex gap-6 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 mt-1 shadow-sm ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                      {m.role === 'user' ? <User size={20} /> : m.isCouncil ? <Users size={20} /> : <Bot size={20} />}
                    </div>
                    <div className={`max-w-[75%] space-y-2 ${m.role === 'user' ? 'text-right' : ''}`}>
                      <div className="flex items-center gap-2 mb-1 justify-start">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{m.role === 'user' ? 'You' : m.isCouncil ? 'Council' : 'AI'}</span>
                        {m.role === 'assistant' && !isLoading && (
                          <button onClick={() => handleSend(undefined, m.id)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-300 hover:text-blue-600 transition-all"><RotateCcw size={12} /></button>
                        )}
                      </div>
                      <div className={m.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}>
                        {m.isCouncil && m.councilResponses && (
                          <div className="council-card">
                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-50">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Collective Deliberation Evidence</span>
                              <Brain size={18} className="text-blue-500/30" />
                            </div>
                            <div className="space-y-6">
                              {m.councilResponses.map((cr, cidx) => (
                                <div key={cidx} className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-1 h-1 bg-blue-500 rounded-full" />
                                    <span className="council-member-tag">{cr.model}</span>
                                  </div>
                                  <div className="text-[13px] text-gray-500 bg-gray-50/50 p-4 rounded-2xl italic font-medium leading-relaxed border border-gray-100">
                                    {cr.content.length > 250 ? cr.content.substring(0, 250) + '...' : cr.content}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="markdown-body">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </div>

        <div className="p-8 bg-white border-t border-gray-100">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSend} className="flex items-center gap-2">
              <div className="flex-1 relative group">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={!isPuterReady ? "Connecting to AI..." : isLoading ? "Thinking..." : "Type a message..."}
                  disabled={isLoading || !isPuterReady}
                  className="app-input shadow-sm pr-12"
                />
              </div>
              <button
                type="submit"
                onClick={(e) => { if (isLoading) { e.preventDefault(); stopGeneration(); }}}
                className={`w-14 h-14 flex items-center justify-center rounded-2xl transition-all shadow-lg ${!isPuterReady ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : isLoading ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'}`}
              >
                {isLoading ? <Square size={20} fill="currentColor" /> : <Send size={22} />}
              </button>
            </form>
            <p className="text-center mt-6 text-[10px] font-medium text-gray-400 uppercase tracking-widest">Powered by AI Council v2.0</p>
          </div>
        </div>
      </main>
    </div>
  );
}
