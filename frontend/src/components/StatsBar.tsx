import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import type { SimStats } from '../types';

function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const prevRef = useRef(value);

  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;
    const start = prevRef.current;
    const end = value;
    const duration = 400;
    const startTime = performance.now();

    const animate = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      const current = start + (end - start) * ease;
      el.textContent = current.toFixed(decimals);
      if (t < 1) requestAnimationFrame(animate);
      else prevRef.current = end;
    };
    requestAnimationFrame(animate);
  }, [value, decimals]);

  return <span ref={spanRef}>{value.toFixed(decimals)}</span>;
}

function StatCard({
  label, value, unit, color, decimals = 0,
}: {
  label: string; value: number; unit?: string; color: string; decimals?: number;
}) {
  return (
    <motion.div
      className="panel px-3 py-2 flex-1 min-w-0"
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.15 }}
    >
      <p className="text-xs text-white/30 uppercase tracking-wider mb-0.5 truncate">{label}</p>
      <p className="mono font-bold text-lg leading-tight" style={{ color }}>
        <AnimatedNumber value={value} decimals={decimals} />
        {unit && <span className="text-xs font-normal text-white/30 ml-0.5">{unit}</span>}
      </p>
    </motion.div>
  );
}

function UptimeClock({ seconds }: { seconds: number }) {
  const h = Math.floor(seconds / 18000);
  const m = Math.floor((seconds % 18000) / 300);
  const s = Math.floor(seconds % 300 / 5);
  const fmt = (n: number) => String(n).padStart(2, '0');
  return (
    <div className="panel px-3 py-2 flex-1 min-w-0">
      <p className="text-xs text-white/30 uppercase tracking-wider mb-0.5">Uptime</p>
      <p className="mono font-bold text-lg leading-tight text-cyan-400">
        {fmt(h)}:{fmt(m)}:{fmt(s)}
      </p>
    </div>
  );
}

interface Props { stats: SimStats; }

export default function StatsBar({ stats }: Props) {
  return (
    <div className="flex gap-2">
      <UptimeClock seconds={stats.uptime} />
      <StatCard label="Detections" value={stats.totalDetections} color="#ffcc00" />
      <StatCard label="Verified" value={stats.verified} color="#ff3344" />
      <StatCard label="Quorum Hit" value={stats.quorumReached} color="#aa44ff" />
      <StatCard label="Coverage" value={stats.coveragePercent} unit="%" color="#00c8ff" decimals={1} />
      <StatCard label="Active UAVs" value={stats.activeUAVs} color="#00ff88" />
      <StatCard label="Chain Txns" value={stats.chainTx} color="#0066ff" />
      <StatCard label="False Pos." value={stats.falsePositives} color="#7ab0cc" />
    </div>
  );
}
