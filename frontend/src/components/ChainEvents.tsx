import { motion, AnimatePresence } from 'framer-motion';
import type { ChainEvent } from '../types';

const CFG: Record<ChainEvent['type'], { c: string; icon: string; label: string }> = {
  FailureIdentified:     { c: 'var(--amber)', icon: '◎', label: 'IDENTIFY' },
  ConfirmationSubmitted: { c: 'var(--cyan)', icon: '✦', label: 'CONFIRM' },
  FailureVerified:       { c: 'var(--red)', icon: '◈', label: 'VERIFY' },
  StateChanged:          { c: 'var(--indigo)', icon: '⟳', label: 'STATE' },
};

function ago(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 4) return 'now';
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m`;
}

export default function ChainEvents({ events }: { events: ChainEvent[] }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <span className="label">Chain Ledger</span>
        <div className="flex items-center gap-1.5">
          <motion.span className="w-1.5 h-1.5 rounded-full bg-[var(--lime)]"
            style={{ boxShadow: '0 0 8px var(--lime)' }}
            animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} />
          <span className="mono text-[9px] text-[var(--t-lo)]">FUJI STREAM</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 -mr-1 relative">
        {/* vertical timeline rail */}
        <div className="absolute left-[13px] top-1 bottom-1 w-px bg-gradient-to-b from-[var(--cyan)]/30 via-[var(--hair)] to-transparent" />
        <AnimatePresence initial={false}>
          {events.map((e, i) => {
            const c = CFG[e.type];
            return (
              <motion.div key={e.id} layout
                initial={{ opacity: 0, x: 18, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="relative pl-7">
                {/* node */}
                <motion.span className="absolute left-[9px] top-2.5 w-2 h-2 rounded-full z-10"
                  style={{ backgroundColor: c.c, boxShadow: `0 0 8px ${c.c}` }}
                  animate={i === 0 ? { scale: [1, 1.6, 1] } : {}}
                  transition={{ duration: 0.5 }} />
                <div className="glass glass-hover p-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs" style={{ color: c.c }}>{c.icon}</span>
                      <span className="mono text-[10px] font-semibold tracking-wider" style={{ color: c.c }}>{c.label}</span>
                      <span className="mono text-[10px] text-[var(--t-lo)]">#{e.failureId}</span>
                    </div>
                    <span className="mono text-[9px] text-[var(--t-dim)]">{ago(e.timestamp)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="mono text-[9px] text-[var(--t-lo)] truncate max-w-[120px]">{e.from}</span>
                    <span className="mono text-[9px] text-[var(--t-dim)]">blk {e.blockNumber.toLocaleString()}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
