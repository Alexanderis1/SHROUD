import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STEPS = [
  'Initializing message bus · ROS2 topic graph',
  'Linking Avalanche Fuji C-Chain · 43113',
  'Deriving UAV signer identities',
  'Loading ShroudRegistry ABI',
  'Calibrating EO / IR / SAR sensor models',
  'Spawning fleet · 6 units',
  'Coverage planner online',
  'SHROUD operational',
];

export default function BootSequence({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (step >= STEPS.length) {
      const t = setTimeout(() => setDone(true), 700);
      const t2 = setTimeout(onDone, 1350);
      return () => { clearTimeout(t); clearTimeout(t2); };
    }
    const delay = step === 0 ? 420 : 340 + Math.random() * 180;
    const t = setTimeout(() => setStep(s => s + 1), delay);
    return () => clearTimeout(t);
  }, [step, onDone]);

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center app-bg"
          exit={{ opacity: 0, scale: 1.04, filter: 'blur(8px)' }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        >
          <div className="flex flex-col items-center gap-8 w-[440px] max-w-[88vw]">
            {/* Animated emblem */}
            <motion.div
              className="relative"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            >
              <svg viewBox="0 0 120 120" width="108" height="108">
                <motion.circle cx="60" cy="60" r="54" fill="none" stroke="url(#bg1)" strokeWidth="1"
                  strokeDasharray="6 6"
                  animate={{ rotate: 360 }} transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
                  style={{ transformOrigin: '60px 60px' }} />
                <motion.circle cx="60" cy="60" r="40" fill="none" stroke="#38e1ff" strokeWidth="1.5"
                  strokeDasharray="4 10"
                  animate={{ rotate: -360 }} transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                  style={{ transformOrigin: '60px 60px' }} />
                <circle cx="60" cy="60" r="26" fill="none" stroke="#5b8cff" strokeWidth="1" opacity="0.4" />
                <motion.circle cx="60" cy="60" r="8" fill="#38e1ff"
                  animate={{ opacity: [1, 0.4, 1], scale: [1, 1.25, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity }} />
                {[0, 90, 180, 270].map(a => (
                  <circle key={a}
                    cx={60 + 54 * Math.cos(a * Math.PI / 180)}
                    cy={60 + 54 * Math.sin(a * Math.PI / 180)}
                    r="3" fill="#38e1ff" />
                ))}
                <defs>
                  <linearGradient id="bg1" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#38e1ff" />
                    <stop offset="1" stopColor="#a47bff" />
                  </linearGradient>
                </defs>
              </svg>
            </motion.div>

            <motion.h1
              className="display text-3xl font-bold tracking-[0.35em] grad-text"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              SHROUD
            </motion.h1>

            {/* Progress bar */}
            <div className="w-full">
              <div className="h-[3px] w-full rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg,#38e1ff,#5b8cff,#a47bff)' }}
                  animate={{ width: `${(Math.min(step, STEPS.length) / STEPS.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <div className="mt-4 h-5 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    className="mono text-xs text-[var(--t-mid)] flex items-center gap-2"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <span className="text-[var(--cyan)]">›</span>
                    {STEPS[Math.min(step, STEPS.length - 1)]}
                    <span className="text-[var(--cyan)] animate-pulse-soft">_</span>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
