import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import type { SimStats } from '../types';

function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const start = prev.current, end = value, startT = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - startT) / 450, 1);
      const e = 1 - Math.pow(1 - t, 3);
      el.textContent = (start + (end - start) * e).toFixed(decimals);
      if (t < 1) requestAnimationFrame(step); else prev.current = end;
    };
    requestAnimationFrame(step);
  }, [value, decimals]);
  return <span ref={ref}>{value.toFixed(decimals)}</span>;
}

function Sparkbars({ color }: { color: string }) {
  const bars = useRef<number[]>(Array.from({ length: 7 }, () => 0.3 + Math.random() * 0.7));
  return (
    <div className="flex items-end gap-[2px] h-4">
      {bars.current.map((h, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-sm"
          style={{ backgroundColor: color, opacity: 0.5 }}
          animate={{ height: [`${h * 100}%`, `${(0.3 + Math.random() * 0.7) * 100}%`, `${h * 100}%`] }}
          transition={{ duration: 2 + i * 0.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

function StatCard({
  label, value, unit, color, decimals = 0, icon, delay,
}: {
  label: string; value: number; unit?: string; color: string; decimals?: number; icon: string; delay: number;
}) {
  return (
    <motion.div
      className="glass glass-hover panel-accent relative flex-1 min-w-0 px-3.5 py-2.5 overflow-hidden"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: 'easeOut' }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="label">{label}</span>
        <span className="text-sm" style={{ color }}>{icon}</span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <p className="mono font-bold text-xl leading-none tracking-tight" style={{ color }}>
          <AnimatedNumber value={value} decimals={decimals} />
          {unit && <span className="text-[11px] font-normal text-[var(--t-lo)] ml-0.5">{unit}</span>}
        </p>
        <Sparkbars color={color} />
      </div>
    </motion.div>
  );
}

function UptimeCard({ seconds, delay }: { seconds: number; delay: number }) {
  const h = Math.floor(seconds / 18000);
  const m = Math.floor((seconds % 18000) / 300);
  const s = Math.floor((seconds % 300) / 5);
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    <motion.div
      className="glass glass-hover panel-accent relative flex-1 min-w-0 px-3.5 py-2.5"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="label">Uptime</span>
        <motion.span className="w-1.5 h-1.5 rounded-full bg-[var(--cyan)]"
          animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} />
      </div>
      <p className="mono font-bold text-xl leading-none tracking-tight text-[var(--cyan)]">
        {p(h)}:{p(m)}:{p(s)}
      </p>
    </motion.div>
  );
}

export default function StatsBar({ stats }: { stats: SimStats }) {
  return (
    <div className="flex gap-2.5">
      <UptimeCard seconds={stats.uptime} delay={0} />
      <StatCard label="Detections" value={stats.totalDetections} color="var(--amber)" icon="◎" delay={0.05} />
      <StatCard label="Verified" value={stats.verified} color="var(--red)" icon="◈" delay={0.1} />
      <StatCard label="Quorum Hit" value={stats.quorumReached} color="var(--violet)" icon="✦" delay={0.15} />
      <StatCard label="Coverage" value={stats.coveragePercent} unit="%" color="var(--cyan)" icon="◉" decimals={1} delay={0.2} />
      <StatCard label="Active UAV" value={stats.activeUAVs} color="var(--lime)" icon="▲" delay={0.25} />
      <StatCard label="Chain Tx" value={stats.chainTx} color="var(--indigo)" icon="⬡" delay={0.3} />
      <StatCard label="False Pos" value={stats.falsePositives} color="var(--t-mid)" icon="○" delay={0.35} />
    </div>
  );
}
