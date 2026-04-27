
import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  ChevronRight, 
  Zap, 
  Target, 
  BookOpen,
  Trophy,
  History,
  Send,
  Loader2,
  Trash2,
  Clock,
  User as UserIcon,
  CheckCircle2,
  Circle,
  Play,
  Pause,
  RotateCcw,
  Mic,
  MicOff,
  LogOut,
  LogIn,
  Activity,
  BrainCircuit,
  RefreshCw,
  Cpu,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from './lib/utils';
import { 
  auth, 
  db, 
  getUserStats, 
  syncUserStats, 
  saveMessage, 
  subscribeToMessages,
  signInWithGoogle,
  linkWithGoogle,
  UserStats,
  ChatMessage as FirebaseChatMessage
} from './lib/firebase';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { getStudyBotResponse, ChatMessage } from './lib/gemini';
import { CURRICULUM, INITIAL_STATS } from './constants';
import { LoginPage } from './components/LoginPage';

type Tab = 'dashboard' | 'session' | 'curriculum' | 'history';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [user, setUser] = useState<any>(null);
  const [chatStep, setChatStep] = useState(1);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [stats, setStats] = useState<UserStats>(INITIAL_STATS as any);
  const [inputTerm, setInputTerm] = useState('');
  const [newTaskName, setNewTaskName] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCountdown, setRetryCountdown] = useState(0); // seconds left before retry
  
  // Timer State
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Extract latest tip
  const latestTip = React.useMemo(() => {
    const allText = messages.map(m => m.content).join('\n');
    const tips = allText.split(/TIP OF THE DAY:/gi).filter(Boolean);
    if (tips.length === 0) return '';
    return tips[tips.length - 1].split('\n')[0].trim();
  }, [messages]);
  
  // Voice State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputTerm(prev => prev + (prev ? ' ' : '') + transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (!recognitionRef.current) {
        alert("Speech recognition not supported in this browser.");
        return;
      }
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    try {
      if (user?.isAnonymous) {
        // Link existing anonymous data to Google
        await linkWithGoogle();
      } else {
        await signInWithGoogle();
      }
    } catch (error: any) {
      setIsLoading(false);
      if (error.code === 'auth/credential-already-in-use') {
        // If already in use, just sign in (will lose anon data but that's standard linking issue)
        await signInWithGoogle();
      } else {
        alert("Authentication error: " + error.message);
      }
    }
  };

  const logout = async () => {
    await auth.signOut();
    window.location.reload(); // Reset state
  };
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const toggleTask = async (taskId: string) => {
    if (!user) return;
    const updatedTasks = (stats.todayTasks || []).map(t => 
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    
    const task = updatedTasks.find(t => t.id === taskId);
    let updatedStats = { ...stats, todayTasks: updatedTasks };

    if (task && task.completed) {
      // Add to history and completed list if marking as done
      const historyItem = {
        id: Math.random().toString(36).substr(2, 9),
        topic: task.name,
        date: new Date().toISOString(),
        day: new Date().toLocaleDateString('en-IN', { weekday: 'long' }),
        formattedDate: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        duration: timerSeconds > 0 ? timerSeconds : 0
      };
      
      updatedStats = {
        ...updatedStats,
        completedThisWeek: [...(stats.completedThisWeek || []), task.name],
        studyHistory: [historyItem, ...(stats.studyHistory || [])],
        // Small coverage boost
        gateCoverage: Math.min(100, stats.gateCoverage + 0.5),
        placementCoverage: Math.min(100, stats.placementCoverage + 0.3)
      };
    }

    setStats(updatedStats);
    await syncUserStats(user.uid, updatedStats);
  };

  const addTask = async () => {
    if (!newTaskName.trim() || !user) return;
    const newTask = {
      id: Math.random().toString(36).substr(2, 9),
      name: newTaskName,
      completed: false
    };
    const updatedStats = {
      ...stats,
      todayTasks: [...(stats.todayTasks || []), newTask]
    };
    setStats(updatedStats);
    setNewTaskName('');
    await syncUserStats(user.uid, updatedStats);
  };

  const removeTask = async (taskId: string) => {
    if (!user) return;
    const updatedStats = {
      ...stats,
      todayTasks: (stats.todayTasks || []).filter(t => t.id !== taskId)
    };
    setStats(updatedStats);
    await syncUserStats(user.uid, updatedStats);
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auth & Data Subscription
  useEffect(() => {
    setIsLoading(true);
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        try {
          // Load stats
          const existingStats = await getUserStats(u.uid);
          if (existingStats) {
            setStats(existingStats);
          } else {
            // Initialize new user
            await syncUserStats(u.uid, INITIAL_STATS as any);
            setStats(INITIAL_STATS as any);
          }
          
          // Subscribe to messages
          const unsubMessages = subscribeToMessages(u.uid, (msgs) => {
            if (msgs.length === 0) {
              const initialMsg: ChatMessage = {
                role: 'bot',
                content: "Hi! Let's log today's study session.\n\nPlease tell me:\n1. **What topics** did you study TODAY?\n2. How **confident** do you feel (1-5)?\n3. How many **hours** did you study?"
              };
              setMessages([initialMsg]);
            } else {
              setMessages(msgs.map(m => ({ role: m.role, content: m.content })));
            }
            setIsLoading(false);
          });

          return () => unsubMessages();
        } catch (error) {
          console.error("Error fetching user data:", error);
          setIsLoading(false);
        }
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => unsubAuth();
  }, []);

  const extractTasksFromPlan = (content: string) => {
    const lines = content.split('\n');
    const tasks: any[] = [];
    // More flexible regex for Markdown table rows
    const tableRowRegex = /^\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*$/;

    lines.forEach((line) => {
      const match = line.match(tableRowRegex);
      if (match) {
        const topic = match[2].trim();
        const taskDescription = match[3].trim();
        // Skip header and separator rows
        if (
          topic.toLowerCase().includes('topic') || 
          topic.includes('---') || 
          topic.toLowerCase().includes('subject') ||
          taskDescription.toLowerCase().includes('task')
        ) return;

        tasks.push({
          id: Math.random().toString(36).substr(2, 9),
          name: `${topic}: ${taskDescription}`,
          completed: false
        });
      }
    });
    return tasks;
  };

  const handleSend = async () => {
    if (!inputTerm.trim() || isTyping || !user) return;

    const currentInput = inputTerm;
    const userMsg: ChatMessage = { role: 'user', content: currentInput };

    // ✅ IMMEDIATELY clear input and lock form — prevents duplicate sends
    setInputTerm('');
    setIsTyping(true);

    try {
      // Save user message to Firestore
      await saveMessage(user.uid, userMsg);
      
      const contextMessages = [...messages, userMsg];

      const botResponse = await getStudyBotResponse(
        contextMessages,
        stats,
        chatStep,
        (secsLeft) => setRetryCountdown(secsLeft) // live countdown callback
      );
      setRetryCountdown(0); // clear countdown after response
      
      // Save bot response to Firestore
      const botMsg: ChatMessage = { role: 'bot', content: botResponse };
      await saveMessage(user.uid, botMsg);

      // If we are at Step 3 (Generate Study Plan), sync the tasks to Tactical Objectives
      if (chatStep === 3) {
        const newTasks = extractTasksFromPlan(botResponse);
        if (newTasks.length > 0) {
          const updatedStats = {
            ...stats,
            todayTasks: newTasks,
          };
          setStats(updatedStats);
          await syncUserStats(user.uid, updatedStats);
        }
      }

      // Advance step
      if (chatStep < 4) setChatStep(prev => prev + 1);
      else if (chatStep === 4) setChatStep(1);

    } catch (err) {
      console.error("handleSend error:", err);
    } finally {
      setIsTyping(false); // ✅ always unlock form even if error occurs
    }
  };


  const clearChat = async () => {
    if (!user) return;
    // For simplicity, we'll just reset the session UI. Real app might delete the subcollection.
    setChatStep(1);
    setMessages([{
      role: 'bot',
      content: "Session reset. Let's start a fresh log for TODAY.\n\n1. What topics did you study?\n2. Confidence level?\n3. Hours spent?"
    }]);
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-white dark:bg-slate-950 flex flex-col items-center justify-center gap-4 transition-colors">
        <Loader2 className="w-12 h-12 text-accent animate-spin" />
        <span className="text-xs font-black uppercase tracking-[0.4em] text-slate-500 dark:text-slate-500">Initializing Strategic Hub</span>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginPage 
        onLogin={handleGoogleAuth} 
        onContinueAsGuest={async () => {
          setIsLoading(true);
          try {
            await signInAnonymously(auth);
          } catch (e) {
            console.error("Guest login failed:", e);
            setIsLoading(false);
          }
        }}
      />
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen font-sans selection:bg-accent/30 technical-grid bg-cosmic text-slate-100 overflow-hidden relative">
      {/* Immersive Cosmic Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-blue-600/10 blur-[100px] rounded-full" />
        <div className="cosmic-ring w-[600px] h-[600px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20" />
        <div className="cosmic-ring w-[800px] h-[800px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10" />
      </div>

      <nav className="hidden lg:flex w-72 border-r border-white/5 flex-col p-8 bg-slate-950/40 backdrop-blur-3xl z-50">
        <div className="flex items-center gap-3 mb-12 px-2">
          <div className="bg-accent p-2.5 rounded-2xl glow-accent shadow-xl shadow-accent/20">
            <Zap className="text-white w-6 h-6 fill-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black tracking-tighter uppercase leading-none">StudyBot <span className="text-accent">Pro</span></span>
            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-1 font-mono">Cosmic Intelligence Hub</span>
          </div>
        </div>

        <div className="flex-1 space-y-4">
          <NavItem active={activeTab === 'dashboard'} icon={LayoutDashboard} label="Dashboard" onClick={() => setActiveTab('dashboard')} />
          <NavItem active={activeTab === 'session'} icon={MessageSquare} label="Strategic Flow" onClick={() => setActiveTab('session')} />
          <NavItem active={activeTab === 'curriculum'} icon={BookOpen} label="Curriculum" onClick={() => setActiveTab('curriculum')} />
          <NavItem active={activeTab === 'history'} icon={History} label="History" onClick={() => setActiveTab('history')} />
        </div>

        <div className="mt-auto space-y-4 px-2">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900 border border-white/5 group">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Operational Hub
            </span>
          </div>

          <div className="p-4 glass-panel bg-slate-900/50 border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-4 h-4 text-accent" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Global Streak</span>
            </div>
            <div className="text-2xl font-black text-white">{stats.streak} Days</div>
          </div>
          <div className="pt-4 border-t border-white/5">
             {user?.isAnonymous ? (
               <div className="space-y-3">
                 <div className="flex items-center gap-3 px-1 mb-2">
                    <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center border border-white/5">
                       <UserIcon className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                       <div className="text-[10px] font-black text-slate-500 uppercase">Guest Profile</div>
                    </div>
                 </div>
                 <button 
                   onClick={handleGoogleAuth}
                   className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-accent text-white hover:bg-accent/80 transition-all shadow-lg shadow-accent/20"
                 >
                   <LogIn className="w-3.5 h-3.5" />
                   <span className="hidden lg:block text-[9px] font-black uppercase tracking-widest">Upgrade to Cloud</span>
                 </button>
                 <button 
                   onClick={logout}
                   className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-900 text-slate-500 hover:text-red-500 transition-all border border-white/5"
                 >
                   <LogOut className="w-3.5 h-3.5" />
                   <span className="hidden lg:block text-[9px] font-black uppercase tracking-widest">Purge Session</span>
                 </button>
               </div>
             ) : (
               <div className="space-y-4">
                 <div className="flex items-center gap-3 px-1">
                   <div className="w-10 h-10 rounded-full border-2 border-accent p-0.5 shrink-0 overflow-hidden shadow-lg shadow-accent/10">
                     {user?.photoURL ? (
                       <img src={user.photoURL} alt="Profile" className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                     ) : (
                       <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center">
                         <UserIcon className="w-5 h-5 text-slate-500" />
                       </div>
                     )}
                   </div>
                   <div className="hidden lg:block flex-1 min-w-0">
                      <div className="text-[10px] font-black text-slate-200 truncate pr-2">{user?.displayName || user?.email || 'User'}</div>
                      <div className="text-[8px] font-mono text-slate-500 uppercase tracking-tighter">Certified AI Strategy Agent</div>
                   </div>
                 </div>
                 <button 
                   onClick={logout}
                   className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-500/20 group hover:border-transparent font-bold"
                 >
                   <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                   <span className="hidden lg:block text-[10px] font-black uppercase tracking-widest">Secure Exit</span>
                 </button>
               </div>
             )}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-20 bg-slate-950/80 backdrop-blur-3xl border-t border-white/5 z-[100] px-6 flex items-center justify-between pb-4">
        <NavItem active={activeTab === 'dashboard'} icon={LayoutDashboard} label="Dash" onClick={() => setActiveTab('dashboard')} />
        <NavItem active={activeTab === 'session'} icon={MessageSquare} label="Flow" onClick={() => setActiveTab('session')} />
        <NavItem active={activeTab === 'curriculum'} icon={BookOpen} label="Study" onClick={() => setActiveTab('curriculum')} />
        <NavItem active={activeTab === 'history'} icon={History} label="Logs" onClick={() => setActiveTab('history')} />
      </nav>

      {/* Main Panel */}
      <main className="flex-1 flex flex-col relative z-10 w-full overflow-hidden pb-20 lg:pb-0">
        <header className="px-8 py-3 border-b border-white/5 flex items-center justify-between bg-slate-900/20 backdrop-blur-sm">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3 text-accent" />
              <span className="text-[9px] font-mono text-accent uppercase tracking-widest font-bold">
                 System Time: {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <h2 className="text-xl font-black tracking-tight uppercase mt-1">
              {activeTab === 'dashboard' ? 'Insight Dashboard' : 
               activeTab === 'session' ? 'Strategic Session' : 
               'Knowledge Architecture'}
            </h2>
          </div>

          {activeTab === 'session' && (
            <button 
              onClick={clearChat}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all text-[10px] font-bold uppercase tracking-widest border border-red-500/20"
            >
              <Trash2 className="w-3.5 h-3.5" /> Restart Session
            </button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 scrollbar-hide">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto"
              >
                <div className="lg:col-span-2 space-y-8">
                   <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="glass-panel p-6 flex flex-col items-center justify-center gap-2 border-white/5 bg-slate-900/40 hover:bg-slate-900/60 transition-all">
                         <ProgressRing value={stats.gateCoverage} size={90} color="text-blue-500" label="GATE DA" />
                      </div>
                      <div className="glass-panel p-6 flex flex-col items-center justify-center gap-2 border-white/5 bg-slate-900/40 hover:bg-slate-900/60 transition-all">
                         <ProgressRing value={stats.placementCoverage} size={90} color="text-purple-500" label="Placement" />
                      </div>
                      <div className="glass-panel p-6 flex flex-col items-center justify-center gap-2 border-white/5 bg-slate-900/40 hover:bg-slate-900/60 transition-all col-span-2 lg:col-span-1">
                         <ProgressRing value={stats.mlAiCoverage} size={90} color="text-emerald-500" label="ML & AI" />
                      </div>
                   </div>

                   <TipCard tip={latestTip || "Consistent application of algorithms to real-world datasets is the hallmark of a Senior AI Engineer."} />

                  <div className="glass-panel p-10 glass-surface">
                    <div className="flex items-center justify-between mb-10">
                      <div className="flex flex-col">
                        <h3 className="text-[10px] font-black uppercase tracking-micro text-slate-500">Focus Protocol</h3>
                        <span className="text-[8px] font-mono text-accent uppercase tracking-widest mt-1">Live Telemetry</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setIsTimerRunning(!isTimerRunning)}
                          className={cn(
                            "flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg",
                            isTimerRunning 
                              ? "bg-amber-500 text-white shadow-amber-500/20" 
                              : "bg-emerald-500 text-white shadow-emerald-500/20"
                          )}
                        >
                          {isTimerRunning ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                          {isTimerRunning ? 'Hold' : 'Execute'}
                        </button>
                        <button 
                          onClick={() => { setIsTimerRunning(false); setTimerSeconds(0); }}
                          className="p-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-200 transition-all border border-white/5"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-center justify-center py-10 border-y border-white/5 mb-10 group relative">
                      <div className="absolute inset-0 bg-accent/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                      <div className="text-7xl font-black text-white tracking-tighter mb-4 font-mono relative z-10 tabular-nums">
                        {formatTime(timerSeconds)}
                      </div>
                      <div className="flex items-center gap-2 opacity-40 relative z-10">
                        <div className={cn("w-1.5 h-1.5 rounded-full", isTimerRunning ? "bg-amber-500 animate-pulse" : "bg-slate-400")} />
                        <span className="text-[9px] uppercase font-bold tracking-micro">Strategic Focus Hours</span>
                      </div>
                    </div>

                    {/* Today's Tasks */}
                    <div className="space-y-6">
                       <div className="flex items-center justify-between">
                          <h4 className="text-[10px] font-black uppercase tracking-micro text-slate-400">Tactical Objectives</h4>
                          <span className="text-[8px] font-mono text-slate-400 dark:text-slate-600">UNSTABLE ENVIRONMENT</span>
                       </div>
                       <div className="grid grid-cols-1 gap-3">
                          <div className="flex gap-2 group">
                            <input 
                              type="text" 
                              value={newTaskName}
                              onChange={(e) => setNewTaskName(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && addTask()}
                              placeholder="Define new trajectory..."
                              className="flex-1 bg-slate-900/50 border border-white/5 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-accent outline-none text-white transition-all focus:bg-slate-900"
                            />
                            <button 
                              onClick={addTask}
                              disabled={!newTaskName.trim()}
                              className="px-5 py-2 bg-accent text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-30 shadow-xl shadow-accent/20"
                            >
                              Deploy
                            </button>
                          </div>
                          <div className="space-y-2 mt-2">
                             {(stats.todayTasks || []).map((task) => (
                               <motion.div 
                                 initial={{ opacity: 0, x: -10 }}
                                 animate={{ opacity: 1, x: 0 }}
                                 key={task.id} 
                                 className="relative group"
                               >
                                 <button 
                                   onClick={() => toggleTask(task.id)}
                                   className={cn(
                                     "w-full flex items-center gap-4 p-5 rounded-2xl border transition-all text-left group/task",
                                     task.completed 
                                       ? "bg-slate-900/20 border-white/5 opacity-50" 
                                       : "bg-slate-900/40 border-white/5 hover:border-accent/30 shadow-sm"
                                   )}
                                 >
                                   <div className={cn(
                                     "w-6 h-6 rounded-lg flex items-center justify-center transition-all",
                                     task.completed ? "bg-emerald-500 text-white" : "bg-slate-800 text-slate-500 group-hover/task:text-accent"
                                   )}>
                                     {task.completed ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                                   </div>
                                   <div className="flex-1 min-w-0">
                                     <span className={cn(
                                       "text-[13px] font-bold block truncate tracking-premium",
                                       task.completed ? "text-slate-500 line-through" : "text-slate-200"
                                     )}>
                                       {task.name}
                                     </span>
                                     <span className="text-[8px] uppercase tracking-micro text-slate-400 font-bold block mt-1">
                                       {task.completed ? "Mission Success" : "High Priority"}
                                     </span>
                                   </div>
                                 </button>
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); removeTask(task.id); }}
                                   className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                 >
                                   <Trash2 className="w-4 h-4" />
                                 </button>
                               </motion.div>
                             ))}
                          </div>
                       </div>
                    </div>

                    {/* Completed History (Simplified for Home) */}
                    {stats.studyHistory?.length > 0 && (
                      <div className="mt-12 pt-12 border-t border-slate-200 dark:border-slate-800/50">
                        <div className="flex items-center justify-between mb-6">
                           <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Recent Engagement History</h4>
                           <History className="w-3 h-3 text-slate-400 dark:text-slate-600" />
                        </div>
                        <div className="space-y-3">
                           {stats.studyHistory.slice(0, 3).map((item) => (
                             <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/50 text-[10px]">
                                <div className="flex flex-col gap-0.5">
                                   <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[150px]">{item.topic}</span>
                                   <span className="text-slate-500 dark:text-slate-600 font-mono text-[9px]">
                                      {item.day ? `${item.day}, ` : ''}{item.formattedDate || new Date(item.date).toLocaleDateString()}
                                   </span>
                                </div>
                                <div className="text-accent font-black tracking-widest">
                                   {formatTime(item.duration)}
                                </div>
                             </div>
                           ))}
                        </div>
                      </div>
                    )}

                    {/* Progress Metrics */}
                    <div className="mt-12 pt-10 border-t border-white/5">
                      <h3 className="text-[10px] font-black uppercase tracking-micro text-slate-500 mb-8 font-mono">System Analytics</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                             Validated Milestones
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {(stats.completedThisWeek || []).slice(0, 5).map((t, idx) => (
                              <span key={`completed-${idx}-${t}`} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold tracking-tight">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-4">
                          <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                             Reschedule Protocol
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {(stats.rescheduleQueue || []).length > 0 ? (stats.rescheduleQueue || []).map((t: string, idx: number) => (
                              <span key={`resched-${idx}-${t}`} className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] font-bold tracking-tight">
                                {t}
                              </span>
                            )) : (
                              <div className="p-4 rounded-xl bg-slate-900/50 border border-dashed border-white/10 w-full text-center">
                                <span className="text-[10px] text-slate-600 italic">Queue Empty. Operational Integrity Verified.</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                   <div className="glass-panel p-8 glass-surface glow-accent border-red-500/20 bg-red-950/10">
                      <div className="flex items-center justify-between mb-8">
                        <h3 className="text-[10px] font-black uppercase tracking-micro text-red-500">Anomaly Detected</h3>
                        <Activity className="w-3.5 h-3.5 text-red-500/40 animate-pulse" />
                      </div>
                      <div className="space-y-4">
                        {(stats.weakAreas || []).map((area: string, idx: number) => (
                          <div key={`weak-${idx}-${area}`} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-900/50 border border-red-500/10 group hover:border-red-500/30 transition-all cursor-default shadow-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 glow-accent shadow-red-500/50" />
                            <span className="text-[11px] font-bold text-slate-300 group-hover:text-red-500 transition-colors uppercase tracking-tight">{area}</span>
                          </div>
                        ))}
                      </div>
                   </div>

                   <div className="glass-panel p-8 glass-surface bg-slate-900/40 border-white/5 transition-all">
                      <div className="flex items-center gap-3 mb-6">
                        <BrainCircuit className="w-4 h-4 text-accent/50" />
                        <h3 className="text-[10px] font-black uppercase tracking-micro text-slate-500 font-mono">Cognitive Insight</h3>
                      </div>
                      <p className="text-[12px] text-slate-300 leading-relaxed italic font-serif opacity-80 border-l-2 border-accent/20 pl-4 py-1">
                        "Your recent performance indicates high retention in Machine Learning concepts. However, the GATE DA roadmap requires immediate focus on Linear Algebra to maintain a balanced score trajectory."
                      </p>
                   </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'session' && (
              <motion.div 
                key="session"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-180px)]"
              >
                {/* Visual Step Tracker */}
                <div className="flex items-center gap-4 mb-5 justify-center">
                  {[1, 2, 3, 4].map(s => (
                    <div key={s} className="flex flex-col items-center group cursor-default">
                       <div className={cn(
                        "h-1.5 rounded-full transition-all duration-500",
                        s === chatStep ? "w-12 bg-accent glow-accent" : "w-6 bg-slate-800",
                        s < chatStep ? "bg-emerald-500" : ""
                      )} />
                      <span className={cn(
                        "text-[8px] font-black uppercase tracking-widest mt-2 transition-colors",
                        s === chatStep ? "text-accent" : "text-slate-600"
                      )}>
                        {s === 1 ? 'Review' : s === 2 ? 'Schedule' : s === 3 ? 'Execute' : 'Track'}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto space-y-8 pr-4 pb-12 scrollbar-hide">
                  {messages.map((msg, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex flex-col gap-2 max-w-[85%]",
                        msg.role === 'user' ? "ml-auto items-end text-right" : "items-start"
                      )}
                    >
                      <div className={cn(
                        "text-[10px] font-black uppercase tracking-micro mb-0.5",
                        msg.role === 'user' ? "text-slate-400" : "text-accent font-serif italic"
                      )}>
                        {msg.role === 'user' ? 'Transmission' : 'Intelligence'}
                      </div>
                      <div className={cn(
                        "p-6 rounded-3xl text-[13px] leading-relaxed shadow-sm transition-all",
                        msg.role === 'user' 
                          ? "bg-slate-900 text-white rounded-tr-none shadow-xl shadow-black/40" 
                          : "glass-panel glass-surface border-white/5 rounded-tl-none text-slate-200"
                      )}>
                        {msg.role === 'bot' ? (
                          <div className={cn(
                            "markdown-content prose prose-xs max-w-none transition-colors prose-invert text-slate-300"
                          )}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap font-medium">{msg.content}</div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  {isTyping && (
                    <div className="flex flex-col gap-2 items-start">
                      <div className="text-[10px] font-black uppercase tracking-micro text-accent animate-pulse">
                        {retryCountdown > 0 ? '⏳ Rate Limited — Auto-retrying...' : 'Processing...'}
                      </div>
                      <div className="glass-panel p-6 rounded-3xl rounded-tl-none flex flex-col gap-3">
                        <div className="flex gap-2">
                          <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:-0.3s]" />
                          <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:-0.15s]" />
                          <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" />
                        </div>
                        {retryCountdown > 0 && (
                          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                            <span className="text-amber-400 text-xl font-black font-mono tabular-nums w-8 text-center">{retryCountdown}</span>
                            <div className="flex flex-col">
                              <span className="text-[11px] font-bold text-amber-300">Rate limited — waiting to retry</span>
                              <span className="text-[9px] text-amber-500/70 font-mono uppercase tracking-widest">Auto-retry in {retryCountdown}s · Do not close this tab</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="pt-3 border-t border-white/5 bg-slate-950/20 backdrop-blur-3xl sticky bottom-0 z-10 p-2 lg:p-3">
                  <div className="relative flex items-end gap-3 max-w-2xl mx-auto">
                      <button 
                        onClick={toggleListening}
                        className={cn(
                          "p-3 rounded-xl transition-all flex items-center justify-center shrink-0 border shadow-sm",
                          isListening ? "bg-red-500 text-white animate-pulse border-red-500" : "bg-slate-900 text-slate-500 hover:text-accent border-white/5"
                        )}
                      >
                        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </button>
                      <div className="flex-1 relative group">
                        <textarea 
                          value={inputTerm}
                          onChange={(e) => !isTyping && setInputTerm(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              if (!isTyping) handleSend();
                            }
                          }}
                          disabled={isTyping}
                          placeholder={isTyping ? "Waiting for response..." : isListening ? "Listening..." : "Log strategic progress..."}
                          className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-2 text-[12px] outline-none ring-0 focus:ring-1 focus:ring-accent transition-all shadow-sm focus:shadow-xl focus:shadow-accent/5 text-white placeholder:text-slate-700 resize-none min-h-[40px] max-h-24 scrollbar-hide disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <button 
                          onClick={handleSend}
                          disabled={!inputTerm.trim() || isTyping}
                          className="absolute right-2 bottom-2 p-1.5 bg-accent text-white rounded-lg shadow-lg shadow-accent/20 hover:bg-accent/80 transition-all disabled:opacity-0 disabled:scale-95 duration-300"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                     </div>
                     <button 
                       onClick={clearChat}
                       className="p-3 rounded-xl bg-slate-900 border border-white/5 text-slate-400 hover:text-red-500 transition-all shadow-sm"
                     >
                        <RefreshCw className="w-4 h-4" />
                     </button>
                  </div>
                  <div className="flex items-center justify-center gap-10 mt-3 pb-1 opacity-40">
                     <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <Cpu className="w-3 h-3" /> System: Gemini Flash 2.0
                     </span>
                     <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <ShieldCheck className="w-3 h-3" /> Status: Operational
                     </span>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'curriculum' && (
              <motion.div 
                key="curriculum"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 pb-12"
              >
                <CurriculumCard title="GATE DA Path" items={CURRICULUM.GATE_DA} color="text-blue-500" glowClass="glow-blue" progress={stats.gateCoverage} />
                <CurriculumCard title="Placement Prep" items={CURRICULUM.PLACEMENT} color="text-purple-500" glowClass="glow-purple" progress={stats.placementCoverage} />
                <CurriculumCard title="ML Engineering" items={CURRICULUM.ML_AI} color="text-emerald-500" glowClass="glow-emerald" progress={stats.mlAiCoverage} />
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div 
                key="history"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-4xl mx-auto pb-24"
              >
                <div className="flex items-center justify-between mb-12">
                   <div className="flex flex-col gap-1">
                      <h2 className="text-3xl font-black tracking-tighter uppercase italic">Mission <span className="text-accent underline underline-offset-8">Archives</span></h2>
                      <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mt-2 flex items-center gap-2">
                         <div className="w-2 h-0.5 bg-accent" />
                         Every session logged. Every boundary pushed.
                      </span>
                   </div>
                   <div className="p-4 bg-slate-900/50 rounded-2xl border border-white/5 flex items-center gap-6">
                      <div className="flex flex-col items-center">
                         <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Total Logs</span>
                         <span className="text-xl font-black text-white">{stats.studyHistory?.length || 0}</span>
                      </div>
                      <div className="w-px h-8 bg-white/5" />
                      <div className="flex flex-col items-center">
                         <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Weekly Focus</span>
                         <span className="text-xl font-black text-accent">{stats.completedThisWeek?.length || 0}</span>
                      </div>
                   </div>
                </div>

                <div className="space-y-6">
                   {stats.studyHistory?.length > 0 ? (
                     [...stats.studyHistory].map((item, idx) => (
                       <motion.div 
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
                         transition={{ delay: idx * 0.05 }}
                         key={item.id} 
                         className="glass-panel p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-slate-900/50 transition-all border-white/5 group"
                       >
                          <div className="flex items-start gap-6">
                             <div className="w-12 h-12 rounded-2xl bg-slate-800/50 flex flex-col items-center justify-center border border-white/5 group-hover:border-accent/30 transition-all group-hover:scale-105">
                                <span className="text-[10px] font-black text-slate-500 uppercase">{item.day?.slice(0, 3)}</span>
                                <span className="text-lg font-black text-white leading-none">{new Date(item.date).getDate()}</span>
                             </div>
                             <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-mono text-accent font-bold uppercase tracking-widest">{item.day || 'N/A'}</span>
                                <h4 className="text-[15px] font-black text-slate-200 tracking-tight">{item.topic}</h4>
                                <div className="flex items-center gap-4 mt-2">
                                   <div className="flex items-center gap-1.5">
                                      <Clock className="w-3 h-3 text-slate-600" />
                                      <span className="text-[10px] text-slate-500 font-bold">{new Date(item.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                                   </div>
                                   <div className="w-1 h-1 rounded-full bg-slate-800" />
                                   <span className="text-[10px] text-slate-500 font-bold uppercase tracking-micro">{item.formattedDate}</span>
                                </div>
                             </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                             <div className="text-right">
                                <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-0.5">Focus Time</div>
                                <div className="text-lg font-mono font-black text-slate-300">
                                   {formatTime(item.duration)}
                                </div>
                             </div>
                             <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                             </div>
                          </div>
                       </motion.div>
                     ))
                   ) : (
                     <div className="flex flex-col items-center justify-center py-24 opacity-20 grayscale scale-95 transition-all">
                        <History className="w-24 h-24 mb-6 stroke-[1]" />
                        <h3 className="text-2xl font-black uppercase tracking-widest">Archives Empty</h3>
                        <p className="text-xs font-bold uppercase tracking-micro mt-2">The journey is just beginning. Start your first log.</p>
                     </div>
                   )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function NavItem({ active, icon: Icon, label, onClick }: any) {
  return (
    <div className="relative group/nav">
      <button 
        onClick={onClick}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group relative",
          active 
            ? "text-accent" 
            : "text-slate-500 hover:text-slate-200"
        )}
      >
        {active && (
          <motion.div 
            layoutId="nav-pill"
            className="absolute inset-0 bg-accent/20 rounded-2xl ring-1 ring-accent/50 glow-accent"
            initial={false}
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}
        <Icon className={cn(
          "w-4.5 h-4.5 transition-transform duration-300", 
          active ? "text-accent scale-110" : "text-slate-400 group-hover:scale-110"
        )} />
        <span className="hidden lg:block text-[11px] font-bold uppercase tracking-micro relative z-10">{label}</span>
      </button>

        <div className="lg:hidden absolute left-full ml-4 px-3 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 pointer-events-none group-hover/nav:opacity-100 transition-all translate-x-[-10px] group-hover/nav:translate-x-0 z-[100] whitespace-nowrap shadow-xl border border-accent/20">
          {label}
          <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-4 border-transparent border-r-slate-900" />
        </div>
      </div>
  );
}

function StatBox({ label, value, unit, color, icon: Icon, glowClass }: any) {
  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className={cn(
        "glass-panel p-6 glass-surface flex flex-col gap-4 group cursor-default",
        glowClass
      )}
    >
      <div className="flex items-center justify-between">
        <div className={cn("p-2.5 rounded-xl transition-colors", color)}>
          <Icon className="w-5 h-5" />
        </div>
        <ChevronRight className="w-3 h-3 opacity-20 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
      </div>
      <div>
        <div className="flex items-baseline gap-1">
          <AnimatedNumber value={value} />
          <span className="text-xs font-bold opacity-30 tracking-widest uppercase">{unit}</span>
        </div>
        <div className="text-[10px] font-black uppercase tracking-micro opacity-40 mt-1">{label}</div>
      </div>
    </motion.div>
  );
}

function AnimatedNumber({ value }: { value: string | number }) {
  const num = parseFloat(String(value)) || 0;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const duration = 1500;
    const startValue = display;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easeOutExpo = 1 - Math.pow(2, -10 * progress);
      const current = startValue + (num - startValue) * easeOutExpo;
      
      setDisplay(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [num]);

  return (
    <span className="text-3xl font-black tracking-premium">
      {display.toFixed(1)}
    </span>
  );
}

function CurriculumCard({ title, items, color, glowClass, progress = 0 }: any) {
  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className={cn("glass-panel p-8 glass-surface border-white/5", glowClass)}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className={cn("w-1 h-4 rounded-full", color.replace('text-', 'bg-'))} />
          <h3 className={cn("text-[11px] font-black uppercase tracking-micro", color)}>{title}</h3>
        </div>
        <span className="text-[9px] font-mono font-black text-slate-500">
          {progress.toFixed(0)}%
        </span>
      </div>

      <div className="h-0.5 w-full bg-slate-900 rounded-full mb-8 overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1.5, ease: "circOut" }}
          className={cn("h-full", color.replace('text-', 'bg-'))}
        />
      </div>

      <div className="space-y-5">
        {items.map((item: string, idx: number) => (
          <div key={`${title}-${idx}`} className="flex gap-4 group">
            <span className="text-[10px] font-mono text-slate-700 font-bold mt-0.5">
              {String(idx + 1).padStart(2, '0')}
            </span>
            <div className="flex-1">
              <span className="text-[12px] font-bold text-slate-300 group-hover:text-accent transition-colors block leading-snug tracking-premium">
                {item.split('(')[0]}
              </span>
              {item.includes('(') && (
                <span className="text-[10px] text-slate-600 block mt-1 leading-relaxed">
                  {item.split('(')[1].replace(')', '')}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function ProgressRing({ value, size = 120, color = "text-accent", label }: any) {
  const radius = size * 0.4;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className="stroke-slate-900 fill-none"
            strokeWidth={size * 0.08}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className={cn("fill-none", color)}
            strokeWidth={size * 0.08}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 2, ease: "easeOut" }}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-black text-white">{Math.round(value)}%</span>
        </div>
      </div>
      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</span>
    </div>
  );
}

function TipCard({ tip }: { tip: string }) {
  if (!tip) return null;
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-6 bg-accent/5 border-accent/20 relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
        <Target className="w-12 h-12 text-accent" />
      </div>
      <div className="flex items-center gap-3 mb-4">
        <Zap className="w-4 h-4 text-accent animate-pulse" />
        <h3 className="text-[10px] font-black uppercase tracking-micro text-accent-light">Strategic Insight</h3>
      </div>
      <p className="text-[13px] text-slate-100 font-bold leading-relaxed tracking-tight relative z-10">
        {tip.replace('TIP OF THE DAY:', '').trim()}
      </p>
    </motion.div>
  );
}
