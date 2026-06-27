import { motion, AnimatePresence } from 'framer-motion';
import type { UAV } from '../types';

const MODE: Record<UAV['mode'], { c: string; label: string }> = {
  IDLE:       { c: 'var(--t-mid)', label: 'IDLE' },
  TRANSIT:    { c: 'var(--indigo)', label: 'TRANSIT' },
  INSPECT:    { c: 'var(--cyan)', label: 'INSPECT' },
  REVALIDATE: { c: 'var(--violet)', label: 'REVAL' },
  RTB:        { c: 'var(--amber)', label: 'RTB' },
  CHARGE:     { c: 'var(--lime)', label: 'CHARGE' },
};

const SENSOR: Record<UAV['sensor'], string> = {
  EO: 'var(--cyan)', IR: 'var(--amber)', SAR: 'var(--violet)',
};

function Battery({ v }: { v: number }) {
  const c = v > 55 ? 'var(--lime)' : v > 28 ? 'var(--amber)' : 'var(--red)';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${c}, ${c}aa)`, boxShadow: `0 0 8px ${c}66` }}
          animate={{ width: `${v}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} />
      </div>
      <span className="mono text-[10px] tabular-nums" style={{ color: c }}>{Math.round(v)}%</span>
    </div>
  );
}

function Signal({ v }: { v: number }) {
  return (
    <div className="flex items-end gap-[2px] h-3">
      {[25, 50, 75, 100].map((th, i) => (
        <div key={i} className="w-[3px] rounded-sm transition-colors duration-300"
          style={{ height: `${(i + 1) * 25}%`, backgroundColor: v >= th ? 'var(--cyan)' : 'rgba(255,255,255,0.08)' }} />
      ))}
    </div>
  );
}

function Rotor({ c, active }: { c: string; active: boolean }) {
  return (
    <div className="relative w-9 h-9 flex items-center justify-center rounded-lg"
      style={{ background: `${c}14`, border: `1px solid ${c}33` }}>
      <svg viewBox="0 0 24 24" width="18" height="18">
        {[[7,7],[17,7],[7,17],[17,17]].map(([x,y],i)=>(
          <motion.ellipse key={i} cx={x} cy={y} rx="3.2" ry="1.1" fill={c} opacity="0.8"
            animate={active ? { rotate: 360 } : {}}
            transition={{ duration: 0.25, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: `${x}px ${y}px` }} />
        ))}
        <rect x="10.5" y="10.5" width="3" height="3" rx="0.6" fill={c} />
        <line x1="9" y1="9" x2="15" y2="15" stroke={c} strokeWidth="0.8" opacity="0.5" />
        <line x1="15" y1="9" x2="9" y2="15" stroke={c} strokeWidth="0.8" opacity="0.5" />
      </svg>
      {active && (
        <motion.span className="absolute inset-0 rounded-lg" style={{ border: `1px solid ${c}` }}
          animate={{ opacity: [0.6, 0], scale: [1, 1.25] }}
          transition={{ duration: 1.4, repeat: Infinity }} />
      )}
    </div>
  );
}

export default function UAVFleet({ uavs }: { uavs: UAV[] }) {
  const active = uavs.filter(u => u.mode !== 'IDLE' && u.mode !== 'CHARGE').length;
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <span className="label">Fleet Telemetry</span>
        <span className="mono text-[10px] text-[var(--t-lo)]">{active}/{uavs.length} airborne</span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 -mr-1">
        <AnimatePresence>
          {uavs.map((u, i) => {
            const m = MODE[u.mode];
            const flying = u.mode !== 'IDLE' && u.mode !== 'CHARGE';
            return (
              <motion.div key={u.id} layout
                initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, duration: 0.4 }}
                className="glass glass-hover p-2.5">
                <div className="flex items-center gap-2.5 mb-2">
                  <Rotor c={m.c} active={flying} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="mono text-xs font-semibold text-[var(--t-hi)]">{u.id}</span>
                      <span className="text-[10px] text-[var(--t-lo)]">{u.name}</span>
                    </div>
                    <Battery v={u.battery} />
                  </div>
                  <span className="mono text-[9px] font-semibold px-1.5 py-1 rounded-md whitespace-nowrap"
                    style={{ color: m.c, background: `${m.c}1a`, border: `1px solid ${m.c}40` }}>
                    {m.label}
                  </span>
                </div>
                <div className="flex items-center justify-between pl-[46px]">
                  <div className="flex items-center gap-3">
                    <span className="mono text-[10px] text-[var(--t-lo)]">ALT <span className="text-[var(--t-mid)]">{Math.round(u.altitude)}m</span></span>
                    <span className="mono text-[10px] px-1.5 rounded" style={{ color: SENSOR[u.sensor], background: `${SENSOR[u.sensor]}14` }}>{u.sensor}</span>
                    <span className="mono text-[10px] text-[var(--t-lo)]">✓ <span className="text-[var(--t-mid)]">{u.tasksCompleted}</span></span>
                  </div>
                  <Signal v={u.signalStrength} />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
