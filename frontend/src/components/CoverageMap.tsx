import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { UAV, Building } from '../types';

interface Props { uavs: UAV[]; buildings: Building[]; coverage: number; }

export default function CoverageMap({ uavs, buildings, coverage }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const scaleX = W / 12;
    const scaleZ = H / 12;
    const cx = W / 2;
    const cz = H / 2;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      // Background grid
      ctx.strokeStyle = 'rgba(0, 200, 255, 0.06)';
      ctx.lineWidth = 0.5;
      for (let gx = 0; gx <= W; gx += scaleX) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
      }
      for (let gz = 0; gz <= H; gz += scaleZ) {
        ctx.beginPath(); ctx.moveTo(0, gz); ctx.lineTo(W, gz); ctx.stroke();
      }

      // UAV coverage radii
      uavs.forEach(uav => {
        const px = cx + uav.position.x * scaleX;
        const pz = cz + uav.position.z * scaleZ;
        const r = (uav.position.y / 4) * 25;
        const sensorColor = uav.sensor === 'SAR' ? '170,68,255' : uav.sensor === 'IR' ? '255,136,0' : '0,200,255';
        const grad = ctx.createRadialGradient(px, pz, 0, px, pz, r);
        grad.addColorStop(0, `rgba(${sensorColor}, 0.12)`);
        grad.addColorStop(1, `rgba(${sensorColor}, 0)`);
        ctx.beginPath();
        ctx.arc(px, pz, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      });

      // Buildings
      buildings.forEach(b => {
        const px = cx + b.position.x * scaleX;
        const pz = cz + b.position.z * scaleZ;
        const bc = b.status === 'CRITICAL' ? '#ff3344' : b.status === 'ALERT' ? '#ff8800' : '#00c8ff';
        ctx.fillStyle = bc;
        ctx.globalAlpha = 0.8;
        ctx.fillRect(px - 4, pz - 4, 8, 8);
        ctx.globalAlpha = 0.2;
        ctx.strokeStyle = bc;
        ctx.lineWidth = 1;
        ctx.strokeRect(px - 4, pz - 4, 8, 8);
        ctx.globalAlpha = 1;

        // Label
        ctx.fillStyle = bc;
        ctx.font = '6px JetBrains Mono, monospace';
        ctx.fillText(b.id, px + 5, pz - 2);
      });

      // UAVs
      uavs.forEach(uav => {
        const px = cx + uav.position.x * scaleX;
        const pz = cz + uav.position.z * scaleZ;
        const mc = uav.mode === 'IDLE' ? '#7ab0cc' : uav.mode === 'INSPECT' || uav.mode === 'REVALIDATE' ? '#00c8ff' : '#0066ff';

        // Trail dot
        ctx.beginPath();
        ctx.arc(px, pz, 3, 0, Math.PI * 2);
        ctx.fillStyle = mc;
        ctx.fill();

        // Pulse ring for active modes
        if (uav.mode === 'INSPECT' || uav.mode === 'REVALIDATE') {
          ctx.beginPath();
          ctx.arc(px, pz, 7, 0, Math.PI * 2);
          ctx.strokeStyle = `${mc}55`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Label
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '5px JetBrains Mono, monospace';
        ctx.fillText(uav.id.slice(-3), px + 4, pz - 3);
      });
    };

    const loop = () => { draw(); frameRef.current = requestAnimationFrame(loop); };
    loop();
    return () => cancelAnimationFrame(frameRef.current);
  }, [uavs, buildings]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold tracking-widest text-cyan-400 uppercase">
          Tactical Overlay
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-cyan-400 opacity-80" />
            <span className="text-xs text-white/30">UAV</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-red-400 opacity-80" />
            <span className="text-xs text-white/30">CRIT</span>
          </div>
        </div>
      </div>

      <div className="relative flex-1 rounded-md overflow-hidden" style={{ border: '1px solid rgba(0,200,255,0.12)' }}>
        <canvas
          ref={canvasRef}
          width={260}
          height={200}
          className="w-full h-full"
          style={{ imageRendering: 'crisp-edges' }}
        />
        {/* Coverage overlay */}
        <div className="absolute bottom-2 right-2 panel px-2 py-1">
          <div className="flex items-center gap-1.5">
            <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-cyan-400"
                animate={{ width: `${coverage}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
            <span className="mono text-xs text-cyan-400">{coverage.toFixed(1)}%</span>
          </div>
          <p className="text-xs text-white/25 mt-0.5">Coverage</p>
        </div>
      </div>
    </div>
  );
}
