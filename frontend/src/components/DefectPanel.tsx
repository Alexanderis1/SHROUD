import { motion, AnimatePresence } from 'framer-motion';
import type { Defect } from '../types';

const STATE_CONFIG: Record<Defect['state'], { color: string; label: string; step: number }> = {
  IDENTIFIED: { color: '#ffcc00', label: 'IDENTIFIED', step: 1 },
  VERIFIED:   { color: '#ff3344', label: 'VERIFIED',   step: 2 },
  IN_MAINTENANCE: { color: '#ff8800', label: 'MAINTENANCE', step: 3 },
  SOLVED:     { color: '#00ff88', label: 'SOLVED',     step: 4 },
  FALSE_POSITIVE: { color: '#7ab0cc', label: 'FALSE POS.', step: 0 },
};

const TYPE_ICON: Record<Defect['type'], string> = {
  CORROSION: '⬡',
  CRACK: '⚡',
  LEAK: '◉',
  COATING_LOSS: '▣',
  DEFORMATION: '◈',
  THERMAL_ANOMALY: '◈',
  UNKNOWN: '?',
};

function QuorumProgress({ confirmations }: { confirmations: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3].map(i => (
        <motion.div
          key={i}
          className="w-4 h-1.5 rounded-sm"
          initial={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
          animate={{
            backgroundColor: confirmations >= i ? '#00c8ff' : 'rgba(255,255,255,0.08)',
            boxShadow: confirmations >= i ? '0 0 6px rgba(0,200,255,0.5)' : 'none',
          }}
          transition={{ duration: 0.4, delay: i * 0.1 }}
        />
      ))}
      <span className="mono text-xs text-white/30 ml-0.5">{confirmations}/3</span>
    </div>
  );
}

function LifecycleBar({ state }: { state: Defect['state'] }) {
  const steps = ['IDENTIFIED', 'VERIFIED', 'MAINTENANCE', 'SOLVED'] as const;
  const config = STATE_CONFIG[state];
  if (state === 'FALSE_POSITIVE') {
    return (
      <div className="flex items-center gap-1 mt-1.5">
        <div className="px-2 py-0.5 rounded text-xs mono bg-white/5 text-white/30">FALSE POSITIVE</div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-0.5 mt-1.5">
      {steps.map((s, i) => {
        const active = config.step >= i + 1;
        const current = config.step === i + 1;
        return (
          <div key={s} className="flex items-center gap-0.5">
            <motion.div
              className="h-1 rounded-full"
              animate={{
                backgroundColor: active ? config.color : 'rgba(255,255,255,0.06)',
                boxShadow: current ? `0 0 8px ${config.color}80` : 'none',
              }}
              style={{ width: current ? '40px' : '20px' }}
              transition={{ duration: 0.4 }}
            />
            {i < steps.length - 1 && (
              <div className="w-1 h-px bg-white/10" />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface Props { defects: Defect[]; }

export default function DefectPanel({ defects }: Props) {
  const active = defects.filter(d => d.state !== 'SOLVED' && d.state !== 'FALSE_POSITIVE');
  const resolved = defects.filter(d => d.state === 'SOLVED' || d.state === 'FALSE_POSITIVE');

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold tracking-widest text-cyan-400 uppercase">
          Failure Registry
        </h2>
        <div className="flex items-center gap-2">
          <span className="mono text-xs px-1.5 py-0.5 rounded" style={{ color: '#ff3344', backgroundColor: '#ff334418', border: '1px solid #ff334433' }}>
            {active.length} active
          </span>
          <span className="mono text-xs px-1.5 py-0.5 rounded" style={{ color: '#00ff88', backgroundColor: '#00ff8818', border: '1px solid #00ff8833' }}>
            {resolved.length} resolved
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        <AnimatePresence>
          {defects.map((defect, i) => {
            const cfg = STATE_CONFIG[defect.state];
            return (
              <motion.div
                key={defect.id}
                layout
                initial={{ opacity: 0, y: -12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ delay: i * 0.03, duration: 0.35 }}
                className="panel p-2.5 cursor-default hover:border-white/10 transition-all duration-200"
                style={{ borderLeftColor: `${cfg.color}66`, borderLeftWidth: '2px' }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base" style={{ color: cfg.color, lineHeight: 1 }}>
                      {TYPE_ICON[defect.type]}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="mono text-xs font-semibold text-white">{defect.id}</span>
                        <span className="mono text-xs" style={{ color: cfg.color }}>#{defect.tokenId}</span>
                      </div>
                      <p className="text-xs text-white/40 leading-tight truncate max-w-[140px]">{defect.buildingName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <motion.span
                      className="mono text-xs font-semibold px-1.5 py-0.5 rounded block"
                      style={{ color: cfg.color, backgroundColor: `${cfg.color}18`, border: `1px solid ${cfg.color}33` }}
                      animate={defect.state === 'IDENTIFIED' ? { opacity: [1, 0.6, 1] } : {}}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      {cfg.label}
                    </motion.span>
                    <p className="mono text-xs text-white/30 mt-0.5">{defect.type.replace('_', ' ')}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2">
                  <QuorumProgress confirmations={defect.confirmations} />
                  <div className="flex items-center gap-1">
                    <div
                      className="h-1 rounded-full"
                      style={{
                        width: `${defect.confidence * 40}px`,
                        backgroundColor: defect.confidence > 0.85 ? '#00ff88' : defect.confidence > 0.70 ? '#ff8800' : '#ff3344',
                      }}
                    />
                    <span className="mono text-xs text-white/30">{Math.round(defect.confidence * 100)}%</span>
                  </div>
                </div>

                <LifecycleBar state={defect.state} />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
