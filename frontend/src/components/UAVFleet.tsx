import { motion, AnimatePresence } from 'framer-motion';
import type { UAV } from '../types';

const MODE_COLOR: Record<UAV['mode'], string> = {
  IDLE: '#7ab0cc',
  TRANSIT: '#0066ff',
  INSPECT: '#00c8ff',
  REVALIDATE: '#aa44ff',
  RTB: '#ff8800',
  CHARGE: '#00ff88',
};

const SENSOR_COLOR: Record<UAV['sensor'], string> = {
  EO: '#00c8ff',
  IR: '#ff8800',
  SAR: '#aa44ff',
};

function BatteryBar({ value }: { value: number }) {
  const color = value > 60 ? '#00ff88' : value > 30 ? '#ff8800' : '#ff3344';
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <span className="mono text-xs" style={{ color }}>{Math.round(value)}%</span>
    </div>
  );
}

function SignalBar({ value }: { value: number }) {
  return (
    <div className="flex items-end gap-0.5 h-3">
      {[25, 50, 75, 100].map((threshold, i) => (
        <div
          key={i}
          className="w-1 rounded-sm transition-all duration-300"
          style={{
            height: `${(i + 1) * 25}%`,
            backgroundColor: value >= threshold ? '#00c8ff' : 'rgba(255,255,255,0.1)',
          }}
        />
      ))}
    </div>
  );
}

interface Props { uavs: UAV[]; }

export default function UAVFleet({ uavs }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold tracking-widest text-cyan-400 uppercase">
          UAV Fleet Status
        </h2>
        <span className="mono text-xs text-white/30">{uavs.length} units</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        <AnimatePresence>
          {uavs.map((uav, i) => (
            <motion.div
              key={uav.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              className="panel p-2.5 group hover:border-cyan-400/30 transition-all duration-200 cursor-default"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {/* Drone icon */}
                  <div className="relative">
                    <div
                      className="w-6 h-6 rounded flex items-center justify-center"
                      style={{ backgroundColor: `${MODE_COLOR[uav.mode]}22` }}
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
                        <path d="M12 10a2 2 0 100-4 2 2 0 000 4z" fill={MODE_COLOR[uav.mode]} />
                        <path d="M5 7l3 3M19 7l-3 3M5 17l3-3M19 17l-3-3" stroke={MODE_COLOR[uav.mode]} strokeWidth="1.5" strokeLinecap="round" />
                        <circle cx="5" cy="7" r="1.5" fill={MODE_COLOR[uav.mode]} opacity="0.7" />
                        <circle cx="19" cy="7" r="1.5" fill={MODE_COLOR[uav.mode]} opacity="0.7" />
                        <circle cx="5" cy="17" r="1.5" fill={MODE_COLOR[uav.mode]} opacity="0.7" />
                        <circle cx="19" cy="17" r="1.5" fill={MODE_COLOR[uav.mode]} opacity="0.7" />
                      </svg>
                    </div>
                    {uav.mode !== 'IDLE' && uav.mode !== 'CHARGE' && (
                      <motion.div
                        className="absolute inset-0 rounded"
                        style={{ border: `1px solid ${MODE_COLOR[uav.mode]}` }}
                        animate={{ opacity: [0.6, 0] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                      />
                    )}
                  </div>
                  <div>
                    <p className="mono text-xs font-semibold text-white leading-tight">{uav.id}</p>
                    <p className="text-xs text-white/30 leading-tight">{uav.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span
                    className="mono text-xs px-1.5 py-0.5 rounded font-medium"
                    style={{
                      color: MODE_COLOR[uav.mode],
                      backgroundColor: `${MODE_COLOR[uav.mode]}18`,
                      border: `1px solid ${MODE_COLOR[uav.mode]}33`,
                    }}
                  >
                    {uav.mode}
                  </span>
                </div>
              </div>

              <BatteryBar value={uav.battery} />

              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className="text-white/30 text-xs">ALT</span>
                    <span className="mono text-xs text-white/60">{Math.round(uav.altitude)}m</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span
                      className="mono text-xs px-1 rounded"
                      style={{
                        color: SENSOR_COLOR[uav.sensor],
                        backgroundColor: `${SENSOR_COLOR[uav.sensor]}15`,
                      }}
                    >
                      {uav.sensor}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-white/30 text-xs">✓</span>
                    <span className="mono text-xs text-white/50">{uav.tasksCompleted}</span>
                  </div>
                </div>
                <SignalBar value={uav.signalStrength} />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
