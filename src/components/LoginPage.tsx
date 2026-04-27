
import React from 'react';
import { 
  Zap, 
  LogIn, 
  Moon, 
  ShieldCheck, 
  Database, 
  Target 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

interface LoginPageProps {
  onLogin: () => void;
  onContinueAsGuest: () => void;
}

export function LoginPage({ onLogin, onContinueAsGuest }: LoginPageProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 transition-all duration-500 technical-grid relative overflow-hidden text-slate-200 bg-cosmic">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-blue-500/10 rounded-full blur-[100px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 w-full max-w-md"
      >
        <div className="flex flex-col items-center text-center mb-12">
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="bg-accent p-4 rounded-3xl glow-accent mb-6 shadow-2xl shadow-accent/40 cursor-pointer"
          >
            <Zap className="w-10 h-10 text-white fill-white" />
          </motion.div>
          
          <h1 className="text-5xl font-black tracking-tighter uppercase mb-3">
             StudyBot <span className="text-accent">Pro</span>
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 dark:text-slate-500 mb-8 max-w-[200px]">
            Strategic Intelligence & Academic Optimization
          </p>
        </div>

        <div className="glass-panel p-8 bg-slate-900/30 border-white/5 backdrop-blur-3xl space-y-8">
          <div className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 text-center">Authentication Required</h2>
            <button 
              onClick={onLogin}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-accent text-white hover:bg-accent/80 transition-all shadow-xl shadow-accent/20 group font-bold"
            >
              <LogIn className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              Sign in with Google
            </button>
            
            <button 
              onClick={onContinueAsGuest}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-slate-900 text-slate-300 hover:bg-slate-800 transition-all font-bold border border-white/5"
            >
              Continue as Guest
            </button>
            <p className="text-[9px] text-center text-slate-600 leading-relaxed font-mono px-4">
               SECURE CONNECTION: All progress syncing to encrypted cloud infrastructure.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
            <FeatureIcon icon={Database} label="Sync History" />
            <FeatureIcon icon={Target} label="Set Milestones" />
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center gap-6">
          <div className="flex items-center gap-3 px-6 py-2 rounded-full bg-slate-900 border border-white/5">
            <Moon className="w-4 h-4 text-accent" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Cosmic Atmospheric Mode
            </span>
          </div>
          
          <div className="flex items-center gap-2 opacity-30 grayscale">
            <ShieldCheck className="w-3 h-3" />
            <span className="text-[8px] font-mono tracking-widest uppercase">Encrypted Core v2.4</span>
          </div>
        </div>
      </motion.div>

      {/* Footer Decoration */}
      <div className="absolute bottom-8 left-8 hidden lg:flex items-center gap-4 opacity-20">
         <div className="w-px h-12 bg-slate-500" />
         <div className="flex flex-col gap-1">
            <span className="text-[10px] font-mono font-bold tracking-tighter uppercase whitespace-nowrap">Node ID: AIS-PRO-01</span>
            <span className="text-[8px] font-mono tracking-widest uppercase text-slate-500">Stability: 99.98%</span>
         </div>
      </div>
    </div>
  );
}

function FeatureIcon({ icon: Icon, label }: { icon: any, label: string }) {
  return (
    <div className="flex items-center gap-3 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
      <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
        <Icon className="w-4 h-4 text-accent" />
      </div>
      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{label}</span>
    </div>
  );
}
