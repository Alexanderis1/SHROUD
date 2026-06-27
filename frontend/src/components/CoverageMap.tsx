import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { UAV, Building } from '../types';

interface Props { uavs: UAV[]; buildings: Building[]; coverage: number; }

export default function CoverageMap({ uavs, buildings, coverage }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frame = useRef(0);
  const angle = useRef(0);
  const dataRef = useRef({ uavs, buildings });
  dataRef.current = { uavs, buildings };

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 1, H = 1, cx = 0, cz = 0, sx = 1, sz = 1;

    const resize = () => {
      const w = canvas.clientWidth || 240;
      const h = canvas.clientHeight || 180;
      canvas.width = W = Math.max(1, Math.floor(w * dpr));
      canvas.height = H = Math.max(1, Math.floor(h * dpr));
      cx = W / 2; cz = H / 2; sx = W / 13; sz = H / 13;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = () => {
      const { uavs, buildings } = dataRef.current;
      ctx.clearRect(0, 0, W, H);

      // concentric range rings
      ctx.strokeStyle = 'rgba(56,225,255,0.10)';
      ctx.lineWidth = 1;
      for (let r = 1; r <= 4; r++) {
        ctx.beginPath(); ctx.arc(cx, cz, (Math.min(W, H) / 2) * (r / 4.4), 0, Math.PI * 2); ctx.stroke();
      }
      // cross hairs
      ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H);
      ctx.moveTo(0, cz); ctx.lineTo(W, cz);
      ctx.strokeStyle = 'rgba(56,225,255,0.07)'; ctx.stroke();

      // radar sweep
      angle.current += 0.02;
      const grad = ctx.createConicGradient(angle.current, cx, cz);
      grad.addColorStop(0, 'rgba(56,225,255,0.22)');
      grad.addColorStop(0.08, 'rgba(56,225,255,0.0)');
      grad.addColorStop(1, 'rgba(56,225,255,0.0)');
      ctx.beginPath(); ctx.moveTo(cx, cz);
      ctx.arc(cx, cz, Math.min(W, H) / 2, angle.current - 0.6, angle.current);
      ctx.closePath(); ctx.fillStyle = grad; ctx.fill();

      // UAV coverage radii
      uavs.forEach(u => {
        const px = cx + u.position.x * sx, pz = cz + u.position.z * sz;
        const rad = (u.position.y / 4) * 26 * dpr;
        const col = u.sensor === 'SAR' ? '164,123,255' : u.sensor === 'IR' ? '255,181,61' : '56,225,255';
        const g = ctx.createRadialGradient(px, pz, 0, px, pz, rad);
        g.addColorStop(0, `rgba(${col},0.14)`); g.addColorStop(1, `rgba(${col},0)`);
        ctx.beginPath(); ctx.arc(px, pz, rad, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
      });

      // buildings
      buildings.forEach(b => {
        const px = cx + b.position.x * sx, pz = cz + b.position.z * sz;
        const col = b.status === 'CRITICAL' ? '#ff3b4e' : b.status === 'ALERT' ? '#ffb53d' : '#38e1ff';
        ctx.fillStyle = col; ctx.globalAlpha = 0.85;
        ctx.fillRect(px - 4 * dpr, pz - 4 * dpr, 8 * dpr, 8 * dpr);
        ctx.globalAlpha = 1;
        ctx.fillStyle = col; ctx.font = `${7 * dpr}px JetBrains Mono`;
        ctx.fillText(b.id, px + 6 * dpr, pz - 3 * dpr);
        if (b.status === 'CRITICAL') {
          const pr = 6 + Math.sin(Date.now() / 250) * 4;
          ctx.beginPath(); ctx.arc(px, pz, pr * dpr, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255,59,78,0.5)`; ctx.lineWidth = 1; ctx.stroke();
        }
      });

      // UAVs
      uavs.forEach(u => {
        const px = cx + u.position.x * sx, pz = cz + u.position.z * sz;
        const col = u.mode === 'IDLE' ? '#93b3cf' : (u.mode === 'INSPECT' || u.mode === 'REVALIDATE') ? '#38e1ff' : '#5b8cff';
        ctx.beginPath(); ctx.arc(px, pz, 3 * dpr, 0, Math.PI * 2); ctx.fillStyle = col;
        ctx.shadowColor = col; ctx.shadowBlur = 8 * dpr; ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(234,245,255,0.5)'; ctx.font = `${6 * dpr}px JetBrains Mono`;
        ctx.fillText(u.id.slice(-3), px + 5 * dpr, pz - 4 * dpr);
      });
    };

    const loop = () => { draw(); frame.current = requestAnimationFrame(loop); };
    loop();
    return () => { cancelAnimationFrame(frame.current); ro.disconnect(); };
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <span className="label">Tactical Radar</span>
        <div className="flex items-center gap-2">
          {[['UAV','var(--cyan)'],['ALERT','var(--amber)'],['CRIT','var(--red)']].map(([l,c])=>(
            <div key={l} className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-sm" style={{ backgroundColor: c }} />
              <span className="mono text-[9px] text-[var(--t-lo)]">{l}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="relative flex-1 rounded-xl overflow-hidden bracket" style={{ border: '1px solid var(--hair)', background: 'radial-gradient(circle at center, rgba(56,225,255,0.04), transparent 70%)' }}>
        <canvas ref={canvasRef} className="w-full h-full block" />
        <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 glass rounded-lg px-2.5 py-1.5">
          <span className="mono text-[9px] text-[var(--t-lo)]">COVERAGE</span>
          <div className="flex-1 h-1 rounded-full bg-white/[0.07] overflow-hidden">
            <motion.div className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg,var(--cyan),var(--indigo))' }}
              animate={{ width: `${coverage}%` }} transition={{ duration: 1 }} />
          </div>
          <span className="mono text-[10px] text-[var(--cyan)] tabular-nums">{coverage.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}
