import { motion } from 'framer-motion';

export default function Header() {
  const now = new Date();
  const timeStr = now.toUTCString().replace('GMT', 'UTC');

  return (
    <header className="flex items-center justify-between px-4 py-2 flex-shrink-0"
      style={{ borderBottom: '1px solid rgba(0,200,255,0.1)' }}>
      {/* Logo */}
      <div className="flex items-center gap-3">
        <motion.div
          className="relative"
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        >
          <svg viewBox="0 0 32 32" width="28" height="28">
            <circle cx="16" cy="16" r="14" fill="none" stroke="#00c8ff" strokeWidth="1" strokeDasharray="4 2" />
            <circle cx="16" cy="16" r="8" fill="none" stroke="#0066ff" strokeWidth="1.5" />
            <circle cx="16" cy="16" r="3" fill="#00c8ff" />
            <circle cx="16" cy="2" r="2" fill="#00c8ff" />
            <circle cx="16" cy="30" r="2" fill="#00c8ff" opacity="0.5" />
            <circle cx="2" cy="16" r="2" fill="#00c8ff" opacity="0.5" />
            <circle cx="30" cy="16" r="2" fill="#00c8ff" opacity="0.5" />
          </svg>
        </motion.div>
        <div>
          <h1 className="mono font-bold text-sm tracking-widest" style={{
            background: 'linear-gradient(90deg, #00c8ff, #0066ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            SHROUD
          </h1>
          <p className="mono text-xs text-white/25 leading-tight">Cooperative UAV Infrastructure Monitor</p>
        </div>
      </div>

      {/* Center indicators */}
      <div className="flex items-center gap-4">
        {[
          { label: 'SIM', color: '#00ff88', active: true },
          { label: 'CHAIN', color: '#0066ff', active: true },
          { label: 'C2', color: '#00c8ff', active: true },
          { label: 'MESH', color: '#aa44ff', active: true },
        ].map(({ label, color, active }) => (
          <div key={label} className="flex items-center gap-1.5">
            <motion.div
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: active ? color : '#334455' }}
              animate={active ? { opacity: [1, 0.4, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: Math.random() * 1 }}
            />
            <span className="mono text-xs" style={{ color: active ? color : '#334455' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Time / network */}
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="mono text-xs text-white/50">{timeStr.split(',')[1]?.trim().slice(0, 12) ?? ''}</p>
          <p className="mono text-xs text-white/25">Avalanche Fuji C-Chain · 43113</p>
        </div>
        <div className="panel px-2 py-1 flex items-center gap-1.5">
          <motion.div
            className="w-2 h-2 rounded-full bg-green-400"
            animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <span className="mono text-xs text-green-400">ONLINE</span>
        </div>
      </div>
    </header>
  );
}
