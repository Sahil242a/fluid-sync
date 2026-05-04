// client/src/components/ModeSelector.jsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Cloud } from 'lucide-react';

const MODES = [
  {
    id:    'p2p',
    icon:  Zap,
    label: 'P2P Direct',
    desc:  'Real-time peer transfer • Up to 2GB',
    gradient: 'from-cyan-500 to-indigo-500',
    glow:   'rgba(6,182,212,0.2)',
    activeBg:   'bg-cyan-500/10',
    activeBorder: 'border-cyan-500/30',
    activeText: 'text-cyan-400',
    dotColor:   'bg-cyan-400',
  },
  {
    id:    'cloud',
    icon:  Cloud,
    label: 'Cloud Upload',
    desc:  'Share via link • Up to 2GB • 7 days',
    gradient: 'from-violet-500 to-purple-500',
    glow:   'rgba(139,92,246,0.2)',
    activeBg:   'bg-violet-500/10',
    activeBorder: 'border-violet-500/30',
    activeText: 'text-violet-400',
    dotColor:   'bg-violet-400',
  },
];

const ModeSelector = ({ mode, setMode }) => (
  <div className="flex items-center gap-4">
    {MODES.map((m) => {
      const Icon = m.icon;
      const isActive = mode === m.id;

      return (
        <motion.button
          key={m.id}
          onClick={() => setMode(m.id)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`
            relative flex items-center gap-3 px-5 py-3.5 rounded-2xl border
            transition-all duration-300 flex-1 text-left
            ${isActive
              ? `${m.activeBg} ${m.activeBorder} shadow-lg`
              : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.1] hover:bg-white/[0.04]'
            }
          `}
          style={{
            boxShadow: isActive ? `0 0 30px ${m.glow}` : 'none',
          }}
        >
          {/* Active dot */}
          <AnimatePresence>
            {isActive && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className={`absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full ${m.dotColor} shadow-[0_0_6px_currentColor]`}
              />
            )}
          </AnimatePresence>

          {/* Icon */}
          <div className={`
            w-10 h-10 rounded-xl flex items-center justify-center shrink-0
            transition-all duration-300
            ${isActive
              ? `bg-gradient-to-br ${m.gradient} shadow-md`
              : 'bg-white/[0.04]'
            }
          `}>
            <Icon size={18} className={isActive ? 'text-white' : 'text-slate-600'} />
          </div>

          {/* Text */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className={`text-sm font-bold transition-colors ${isActive ? 'text-white' : 'text-slate-400'}`}>
                {m.label}
              </h3>
              {isActive && (
                <motion.span
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-gradient-to-r ${m.gradient} text-white/80`}
                >
                  Active
                </motion.span>
              )}
            </div>
            <p className={`text-[10px] font-semibold transition-colors truncate ${
              isActive ? m.activeText : 'text-slate-600'
            }`}>
              {m.desc}
            </p>
          </div>
        </motion.button>
      );
    })}
  </div>
);

export default ModeSelector;