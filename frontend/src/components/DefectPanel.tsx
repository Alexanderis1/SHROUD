import { motion, AnimatePresence } from 'framer-motion';
import type { Defect } from '../types';

const STATE: Record<Defect['state'], { c: string; label: string; step: number }> = {
  IDENTIFIED:     { c: 'var(--amber)', label: 'IDENTIFIED', step: 1 },
  VERIFIED:       { c: 'var(--red)', label: 'VERIFIED', step: 2 },
  IN_MAINTENANCE: { c: 'var(--indigo)', label: 'MAINTENANCE', step: 3 },
  SOLVED:         { c: 'var(--lime)', label: 'SOLVED', step: 4 },
  FALSE_POSITIVE: { c: 'var(--t-mid)', label: 'FALSE POS', step: 0 },
};

const TYPE_ICON: Record<Defect['type'], string> = {
  CORROSION: '⬡', CRACK: '⚡', LEAK: '◉', COATING_LOSS: '▣',
  DEFORMATION: '◈', THERMAL_ANOMALY: '☀', UNKNOWN: '?',
};

const STEPS = ['ID', 'VRF', 'MNT', 'SLV'];

function Lifecycle({ state }: { state: Defect['state'] }) {
  const cfg = STATE[state];
  if (state === 'FALSE_POSITIVE') {
    return <div className="mono text-[9px] text-[var(--t-lo)] mt-1.5">✕ DISMISSED · FALSE POSITIVE</div>;
  }
  return (
    <div className="flex items-center gap-1 mt-2">
      {STEPS.map((s, i) => {
        const active = cfg.step >= i + 1;
        const current = cfg.step === i + 1;
        return (
          <div key={s} className="flex items-center flex-1 gap-1">
            <motion.div className="h-1 rounded-full flex-1"
              animate={{
                backgroundColor: active ? cfg.c : 'rgba(255,255,255,0.07)',
                boxShadow: current ? `0 0 8px ${cfg.c}` : 'none',
              }} transition={{ duration: 0.4 }} />
            <span className="mono text-[8px]" style={{ color: active ? cfg.c : 'var(--t-dim)' }}>{s}</span>
          </div>
        );
      })}
    </div>
  );
}

function Quorum({ n }: { n: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3].map(i => (
        <motion.div key={i} className="h-1.5 w-4 rounded-sm"
          initial={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
          animate={{
            backgroundColor: n >= i ? 'var(--cyan)' : 'rgba(255,255,255,0.08)',
            boxShadow: n >= i ? '0 0 6px var(--cyan)' : 'none',
          }} transition={{ duration: 0.35, delay: i * 0.08 }} />
      ))}
      <span className="mono text-[9px] text-[var(--t-lo)] ml-0.5">{n}/3</span>
    </div>
  );
}

export default function DefectPanel({ defects }: { defects: Defect[] }) {
  const active = defects.filter(d => d.state !== 'SOLVED' && d.state !== 'FALSE_POSITIVE').length;
  const resolved = defects.length - active;
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <span className="label">Failure Registry</span>
        <div className="flex items-center gap-1.5">
          <span className="mono text-[9px] px-1.5 py-0.5 rounded" style={{ color: 'var(--red)', background: 'var(--red)1a' }}>{active} active</span>
          <span className="mono text-[9px] px-1.5 py-0.5 rounded" style={{ color: 'var(--lime)', background: 'rgba(143,255,122,0.12)' }}>{resolved} resolved</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 -mr-1">
        <AnimatePresence>
          {defects.map((d, i) => {
            const cfg = STATE[d.state];
            return (
              <motion.div key={d.id} layout
                initial={{ opacity: 0, y: -12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.02, duration: 0.35 }}
                className="glass glass-hover p-2.5 relative overflow-hidden"
                style={{ borderLeft: `2px solid ${cfg.c}` }}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base leading-none" style={{ color: cfg.c }}>{TYPE_ICON[d.type]}</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="mono text-xs font-semibold text-[var(--t-hi)]">{d.id}</span>
                        <span className="mono text-[10px]" style={{ color: cfg.c }}>#{d.tokenId}</span>
                      </div>
                      <p className="text-[10px] text-[var(--t-lo)] truncate max-w-[130px]">{d.buildingName}</p>
                    </div>
                  </div>
                  <motion.span className="mono text-[9px] font-semibold px-1.5 py-0.5 rounded-md"
                    style={{ color: cfg.c, background: `${cfg.c}1a`, border: `1px solid ${cfg.c}40` }}
                    animate={d.state === 'IDENTIFIED' ? { opacity: [1, 0.55, 1] } : {}}
                    transition={{ duration: 1.5, repeat: Infinity }}>
                    {cfg.label}
                  </motion.span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <Quorum n={d.confirmations} />
                  <div className="flex items-center gap-1.5">
                    <span className="mono text-[9px] text-[var(--t-lo)]">{d.type.replace('_', ' ')}</span>
                    <div className="h-1 rounded-full" style={{
                      width: `${d.confidence * 36}px`,
                      backgroundColor: d.confidence > 0.85 ? 'var(--lime)' : d.confidence > 0.7 ? 'var(--amber)' : 'var(--red)',
                    }} />
                    <span className="mono text-[9px] text-[var(--t-mid)]">{Math.round(d.confidence * 100)}%</span>
                  </div>
                </div>
                <Lifecycle state={d.state} />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
