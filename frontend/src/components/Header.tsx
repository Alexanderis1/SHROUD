import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

function Emblem() {
  return (
    <svg viewBox="0 0 40 40" width="34" height="34">
      <motion.circle cx="20" cy="20" r="17" fill="none" stroke="#38e1ff" strokeWidth="1"
        strokeDasharray="3 4" opacity="0.7"
        animate={{ rotate: 360 }} transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: '20px 20px' }} />
      <circle cx="20" cy="20" r="10" fill="none" stroke="#5b8cff" strokeWidth="1.5" />
      <motion.circle cx="20" cy="20" r="4" fill="#38e1ff"
        animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.6, repeat: Infinity }} />
      <circle cx="20" cy="3" r="2" fill="#38e1ff" />
      <circle cx="37" cy="20" r="2" fill="#a47bff" opacity="0.7" />
      <circle cx="3" cy="20" r="2" fill="#5b8cff" opacity="0.7" />
    </svg>
  );
}

const LINKS = [
  { id: 'SIM', color: 'var(--lime)' },
  { id: 'CHAIN', color: 'var(--indigo)' },
  { id: 'C2', color: 'var(--cyan)' },
  { id: 'MESH', color: 'var(--violet)' },
  { id: 'SAR', color: 'var(--amber)' },
];

export default function Header() {
  const [clock, setClock] = useState('');
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const p = (n: number) => String(n).padStart(2, '0');
      setClock(`${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} UTC`);
    };
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, []);

  return (
    <motion.header
      className="flex items-center justify-between px-5 h-16 flex-shrink-0 relative z-20"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      style={{ borderBottom: '1px solid var(--hair)' }}
    >
      {/* Left: brand */}
      <div className="flex items-center gap-3 no-select">
        <Emblem />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="display text-lg font-bold tracking-[0.28em] grad-text leading-none">SHROUD</h1>
            <span className="mono text-[9px] px-1.5 py-0.5 rounded border border-[var(--hair-strong)] text-[var(--t-mid)]">v0.1.0</span>
          </div>
          <p className="mono text-[10px] text-[var(--t-lo)] tracking-wider mt-0.5">
            COOPERATIVE UAV INFRASTRUCTURE MONITOR
          </p>
        </div>
      </div>

      {/* Center: subsystem links */}
      <div className="hidden md:flex items-center gap-5 px-5 py-2 glass rounded-full">
        {LINKS.map(({ id, color }, i) => (
          <div key={id} className="flex items-center gap-1.5">
            <motion.span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
              animate={{ opacity: [1, 0.35, 1] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.25 }}
            />
            <span className="mono text-[10px] tracking-wider" style={{ color }}>{id}</span>
          </div>
        ))}
      </div>

      {/* Right: clock + status */}
      <div className="flex items-center gap-4 no-select">
        <div className="text-right">
          <p className="mono text-sm text-[var(--t-hi)] leading-none tracking-wide">{clock}</p>
          <p className="mono text-[10px] text-[var(--t-lo)] mt-1">AVALANCHE FUJI · 43113</p>
        </div>
        <div className="glass rounded-full px-3 py-1.5 flex items-center gap-2">
          <motion.span
            className="w-2 h-2 rounded-full bg-[var(--lime)]"
            style={{ boxShadow: '0 0 10px var(--lime)' }}
            animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <span className="mono text-[10px] tracking-widest text-[var(--lime)]">LIVE</span>
        </div>
      </div>
    </motion.header>
  );
}
