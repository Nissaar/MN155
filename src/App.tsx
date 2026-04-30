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
      if (window.puter) {
        setIsPuterReady(true);
        clearInterval(checkPuter);
      }
    }, 100);
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
    const models = ['claude-3-5-sonnet', 'gpt-4o', 'claude-opus-4.7'];
    const responses: CouncilMemberResponse[] = [];
    
    // 1. Initial independent thoughts
    for (const model of models) {
      try {
        const res = await window.puter.ai.chat(prompt, { model });
        responses.push({ model, content: res.text, status: 'done' });
      } catch (e) {
        responses.push({ model, content: 'Error retrieving response', status: 'error' });
      }
    }

    // 2. Cross-challenge and synthesis
    const synthesisPrompt = `You are the lead moderator of an AI Council. Below are responses from different models to the prompt: "${prompt}"\n\n` +
      responses.map(r => `[Model ${r.model}]: ${r.content}`).join('\n\n') +
      `\n\nAnalyze these responses, identify conflicts, and provide a single, unified, superior consensus answer that captures the best of all worlds.`;

    const consensusRes = await window.puter.ai.chat(synthesisPrompt, { model: 'claude-opus-4.7' });
    
    return { responses, consensus: consensusRes.text };
  };

  const handleSend = async (e?: React.FormEvent, retryMessageId?: string) => {
    if (e) e.preventDefault();
    if (!user) return;
    if ((!input.trim() && !retryMessageId) || isLoading) return;

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
        const titleResponse = await window.puter.ai.chat(`Short title for: ${userInput}`);
        const newTitle = titleResponse.text.replace(/"/g, '').trim();
        await fetch(`/api/chats/${chatId}/title`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newTitle }),
        });
        setChats(prev => prev.map(c => c.id === chatId ? { ...c, title: newTitle } : c));
      }
    } else {
      const assistantIndex = messages.findIndex(m => m.id === retryMessageId);
      chatHistory = messages.slice(0, assistantIndex);
      setMessages(chatHistory);
    }

    setIsLoading(true);
    abortControllerRef.current = new AbortController();

    try {
      if (!window.puter) throw new Error('Puter AI not available');

      let targetModel = selectedModel;
      if (targetModel === 'auto') {
        const routerPrompt = `Identify the best AI model for this task. 
        Complex logic/coding/strategy = 'claude-opus-4.7'. 
        Fast/general facts = 'gpt-4o-mini'. 
        High-quality creative writing = 'claude-3-5-sonnet'.
        Simple tasks/summarization = 'claude-3-haiku' or 'gemini-flash'.
        User prompt: "${userInput || chatHistory[chatHistory.length-1].content}"
        Return ONLY the model ID name.`;
        const routerRes = await window.puter.ai.chat(routerPrompt);
        targetModel = routerRes.text.trim() as ModelType;
        const validModels = ['claude-opus-4.7', 'gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet', 'claude-3-haiku', 'gemini-flash'];
        if (!validModels.includes(targetModel)) {
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
      <div className="h-screen w-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-blue-600" size={32} />
          <p className="text-xs font-medium text-gray-400 tracking-widest uppercase">Initializing Core</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#ffffff] p-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-10">
            <div className="w-12 h-12 bg-gray-900 flex items-center justify-center mb-6 shadow-xl text-white">
              <Bot size={28} />
            </div>
            <h1 className="text-xl font-black uppercase tracking-[0.2em] text-gray-900">MN155 Terminal</h1>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-2">Advanced Intelligence Interface</p>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            {authError && <div className="bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-widest p-4 border-l-4 border-red-600">{authError}</div>}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
              <input name="email" type="email" required className="architect-input" placeholder="NAME@DOMAIN.COM" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Secure Password</label>
              <input name="password" type="password" required className="architect-input" placeholder="••••••••" />
            </div>
            <button type="submit" className="w-full py-4 bg-gray-900 text-white text-[11px] font-black uppercase tracking-[0.3em] hover:bg-black transition-all active:scale-[0.98]">
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
          <div className="mt-8 text-center">
            <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="text-[10px] text-gray-400 font-bold hover:text-gray-900 transition-colors uppercase tracking-[0.2em]">
              {authMode === 'login' ? "New User? Create Account" : "Existing User? Sign In"}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white font-sans text-gray-900">
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside initial={{ width: 0, opacity: 0 }} animate={{ width: 300, opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="flex flex-col bg-gray-50 border-r border-gray-100 h-full overflow-hidden">
            <div className="p-6 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black tracking-[0.3em] text-gray-400 uppercase">Archive</span>
                <button onClick={createNewChat} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"><Plus size={18} /></button>
              </div>
              <div className="flex-1 space-y-0 max-h-[50vh] overflow-y-auto scrollbar-hide border border-gray-200 bg-white">
                {chats.map(chat => (
                  <div 
                    key={chat.id} 
                    onClick={() => setCurrentChatId(chat.id)} 
                    className={`group flex items-center gap-3 px-4 py-3.5 text-[11px] uppercase tracking-widest transition-all cursor-pointer border-b border-gray-100 last:border-b-0 ${currentChatId === chat.id ? 'bg-gray-900 text-white font-black' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-l-transparent'}`}
                  >
                    <MessageSquare size={14} className={currentChatId === chat.id ? 'text-blue-400' : 'text-gray-300'} />
                    <span className="truncate flex-1">{chat.title}</span>
                    <Trash2 onClick={(e) => deleteChat(e, chat.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all pointer-events-auto" size={12} />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-auto p-6 border-t border-gray-100 bg-white">
              <div className="mb-6 space-y-2">
                {user.is_admin && (
                  <button onClick={() => setIsAdminView(!isAdminView)} className={`w-full flex items-center gap-3 px-3 py-3 border rounded-xl text-xs font-bold transition-all ${isAdminView ? 'bg-red-50 border-red-200 text-red-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    <Shield size={16} />
                    {isAdminView ? 'Exit Control Center' : 'Admin Control Center'}
                  </button>
                )}
                <button onClick={openWorkspace} className="w-full flex items-center gap-3 px-3 py-3 border border-gray-200 rounded-xl text-xs text-gray-600 hover:bg-gray-50 transition-all">
                  <FolderOpen size={16} className="text-amber-500" />
                  Code Workspace
                  {directoryHandle && <div className="w-2 h-2 rounded-full bg-green-500 ml-auto" />}
                </button>
              </div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center text-white text-xs font-black">{user.email[0].toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{user.email}</p>
                  <p className="text-[9px] text-gray-400 uppercase font-black">Authorized</p>
                </div>
                <LogOut onClick={handleLogout} className="text-gray-300 hover:text-red-500 cursor-pointer transition-colors" size={18} />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1">System Engine</label>
                <select 
                  value={selectedModel} 
                  onChange={(e) => setSelectedModel(e.target.value as ModelType)} 
                  className="w-full bg-white border border-gray-200 rounded-none p-3 text-[10px] font-black uppercase tracking-widest outline-none focus:border-gray-900 transition-all cursor-pointer"
                >
                  <option value="auto">Automatic (Dynamic)</option>
                  
                  <optgroup label="Anthropic / Claude">
                    <option value="claude-opus-4.7">Claude Opus 4.7</option>
                    <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                    <option value="claude-3-5-haiku">Claude 3.5 Haiku</option>
                    <option value="claude-3-opus">Claude 3 Opus</option>
                    <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                    <option value="claude-3-haiku">Claude 3 Haiku</option>
                  </optgroup>

                  <optgroup label="OpenAI / GPT">
                    <option value="gpt-4o">GPT-4o (Vision)</option>
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  </optgroup>

                  <optgroup label="Google / Gemini">
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                    <option value="gemini-pro">Gemini Pro</option>
                    <option value="gemini-flash">Gemini Flash</option>
                  </optgroup>

                  <optgroup label="Specialized">
                    <option value="council">AI Council (Consensus)</option>
                  </optgroup>
                </select>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col min-w-0 bg-white relative">
        <header className="h-20 flex items-center justify-between px-8 z-10 sticky top-0 bg-white/80 backdrop-blur-xl border-b border-gray-50">
          <div className="flex items-center gap-6">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors">
              {isSidebarOpen ? <ChevronLeft size={22} /> : <Menu size={22} />}
            </button>
            <div className="flex flex-col">
              <h2 className="text-sm font-black tracking-tight text-gray-900 flex items-center gap-2">
                {chats.find(c => c.id === currentChatId)?.title || 'Global Terminal'}
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-widest">Live</span>
              </h2>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{selectedModel === 'council' ? 'Multi-Agent Network' : selectedModel.replace(/-/g, ' ')}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end mr-4">
              <span className="text-[9px] font-black text-gray-400 uppercase">Uplink Status</span>
              <span className="text-[10px] font-bold text-green-600 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500" />Encrypted</span>
            </div>
            {currentChatId && (
              <button onClick={exportChat} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors" title="Export to Markdown">
                <ArrowRight size={20} className="rotate-[270deg]" />
              </button>
            )}
            <Settings size={20} className="text-gray-300 pointer-events-none" />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-12 scrollbar-hide">
          <div className="max-w-4xl mx-auto space-y-16">
            {isAdminView ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                <div className="flex items-center justify-between border-b border-gray-100 pb-6">
                  <h3 className="text-xl font-black">User Access Control</h3>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Live Directory</span>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-3xl overflow-hidden border border-gray-100">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-gray-100/50">
                        <th className="px-6 py-4 font-black text-gray-400 uppercase">Identity</th>
                        <th className="px-6 py-4 font-black text-gray-400 uppercase">Access Level</th>
                        <th className="px-6 py-4 font-black text-gray-400 uppercase">Status</th>
                        <th className="px-6 py-4 font-black text-gray-400 uppercase text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {adminUsers.map(u => (
                        <tr key={u.id} className="hover:bg-white transition-colors">
                          <td className="px-6 py-4 font-bold">{u.email}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase ${u.is_admin ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-gray-500'}`}>
                              {u.is_admin ? 'Admin' : 'Operator'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase ${u.status === 'approved' ? 'bg-green-50 text-green-600' : u.status === 'denied' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                              {u.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            {u.status !== 'approved' && <button onClick={() => updateUserStatus(u.id, 'approved')} className="p-2 hover:bg-green-50 text-green-600 rounded-lg"><Plus size={14} /></button>}
                            {u.status !== 'denied' && <button onClick={() => updateUserStatus(u.id, 'denied')} className="p-2 hover:bg-red-50 text-red-600 rounded-lg"><X size={14} /></button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center pt-32 space-y-8">
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-24 h-24 bg-gray-50 rounded-[40px] flex items-center justify-center text-gray-200 border border-gray-100">
                  <Brain size={48} />
                </motion.div>
                <div className="space-y-4">
                  <h3 className="text-3xl font-black tracking-tight text-gray-900">TERMINAL MN155 ONLINE.</h3>
                  <p className="text-gray-400 text-sm max-w-md mx-auto leading-relaxed font-medium">Ready to assist with advanced logic, coding, and deliberation via the AI Council protocol.</p>
                </div>
              </div>
            ) : (
              messages.map(m => (
                <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-8 group ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role !== 'user' && (
                    <div className="w-10 h-10 rounded-2xl bg-gray-900 flex items-center justify-center text-white flex-shrink-0 mt-2 shadow-lg">
                      {m.isCouncil ? <Users size={20} /> : <Bot size={20} />}
                    </div>
                  )}
                  <div className={`max-w-[85%] relative ${m.role === 'user' ? 'order-first' : ''}`}>
                    <div className={`flex items-center gap-3 mb-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
                      <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">{m.role === 'user' ? 'Authorized' : m.isCouncil ? 'AI Council' : 'MN155 Compute'}</span>
                      {m.role === 'assistant' && !isLoading && (
                        <button onClick={() => handleSend(undefined, m.id)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-100 rounded-lg text-gray-300 hover:text-blue-600 transition-all"><RotateCcw size={12} /></button>
                      )}
                    </div>
                    <div className={`${m.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}`}>
                      {m.isCouncil && m.councilResponses && (
                        <div className="mb-8 p-6 bg-gray-50 border border-gray-100">
                          <p className="text-[9px] font-black text-gray-400 uppercase mb-6 tracking-[0.3em] border-b border-gray-200 pb-2">Council Deliberation Records</p>
                          <div className="space-y-6">
                            {m.councilResponses.map((cr, idx) => (
                              <div key={idx} className="space-y-2">
                                <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-gray-900" /><span className="text-[9px] font-black text-gray-900 uppercase tracking-widest">{cr.model}</span></div>
                                <div className="text-[11px] text-gray-500 bg-white border border-gray-100 p-4 font-medium italic">"{cr.content.substring(0, 200)}..."</div>
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
                  {m.role === 'user' && (
                    <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0 mt-2 border border-gray-200 shadow-sm">
                      <User size={20} />
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </div>
          <div ref={messagesEndRef} />
        </div>

        <div className="p-8 bg-white border-t border-gray-100">
          <form onSubmit={handleSend} className="max-w-4xl mx-auto flex items-center gap-0 border border-gray-900 overflow-hidden">
            <div className="pl-6 pr-2 text-gray-400 bg-white border-r border-gray-100 flex items-center justify-center"><Terminal size={18} /></div>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isLoading ? "SYSTEM PROCESSING..." : "ENTER COMMAND..."}
              disabled={isLoading}
              className="flex-1 bg-white py-6 px-6 text-[13px] font-medium focus:outline-none placeholder:text-gray-300 uppercase tracking-widest"
            />
            <button
              type="submit"
              onClick={(e) => { if (isLoading) { e.preventDefault(); stopGeneration(); }}}
              className={`px-10 h-[68px] transition-all font-black text-[10px] tracking-[0.3em] uppercase ${isLoading ? 'bg-red-600 text-white' : input.trim() ? 'bg-gray-900 text-white hover:bg-black' : 'bg-gray-50 text-gray-300'}`}
            >
              {isLoading ? <Square size={16} fill="currentColor" /> : "Execute"}
            </button>
          </form>
          <div className="text-center mt-6 flex items-center justify-center gap-6 text-[8px] font-black text-gray-300 uppercase tracking-[0.4em]">
            <span className="flex items-center gap-2"><Lock size={8} /> Secure Uplink</span>
            <div className="w-1.5 h-[1px] bg-gray-100" />
            <span>Architecture v2.0.4</span>
          </div>
        </div>
      </main>
    </div>
  );
}
