import { motion, AnimatePresence } from 'framer-motion';
import type { ChainEvent } from '../types';

const EVENT_CONFIG: Record<ChainEvent['type'], { color: string; icon: string; label: string }> = {
  FailureIdentified:    { color: '#ffcc00', icon: '◎', label: 'IDENTIFIED' },
  ConfirmationSubmitted:{ color: '#00c8ff', icon: '✦', label: 'CONFIRMED' },
  FailureVerified:      { color: '#ff3344', icon: '◈', label: 'VERIFIED' },
  StateChanged:         { color: '#ff8800', icon: '⟳', label: 'STATE CHG' },
};

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

interface Props { events: ChainEvent[]; }

export default function ChainEvents({ events }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold tracking-widest text-cyan-400 uppercase">
          Chain Events
        </h2>
        <div className="flex items-center gap-1.5">
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-green-400"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span className="mono text-xs text-white/30">FUJI LIVE</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        <AnimatePresence initial={false}>
          {events.map((evt, i) => {
            const cfg = EVENT_CONFIG[evt.type];
            return (
              <motion.div
                key={evt.id}
                layout
                initial={{ opacity: 0, x: 20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, delay: i === 0 ? 0 : 0 }}
                className="panel p-2 group hover:border-white/10 transition-all duration-150"
              >
                <div className="flex items-center gap-2">
                  <motion.span
                    className="text-sm flex-shrink-0"
                    style={{ color: cfg.color }}
                    animate={i === 0 ? { scale: [1, 1.3, 1] } : {}}
                    transition={{ duration: 0.4 }}
                  >
                    {cfg.icon}
                  </motion.span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span
                        className="mono text-xs font-semibold"
                        style={{ color: cfg.color }}
                      >
                        {cfg.label}
                      </span>
                      <span className="mono text-xs text-white/20">{timeAgo(evt.timestamp)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="mono text-xs text-white/30 truncate">
                        #{evt.failureId}
                      </span>
                      <span className="text-white/10">·</span>
                      <span className="mono text-xs text-white/20 truncate">
                        {evt.from}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="mono text-xs text-white/15">blk</span>
                      <span className="mono text-xs text-white/25">{evt.blockNumber.toLocaleString()}</span>
                    </div>
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
