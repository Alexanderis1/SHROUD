import { Suspense } from 'react';
import { motion } from 'framer-motion';
import { useSimulation } from '../hooks/useSimulation';
import { BUILDINGS } from '../data/mockSimulation';
import Header from './Header';
import StatsBar from './StatsBar';
import UAVFleet from './UAVFleet';
import DefectPanel from './DefectPanel';
import ChainEvents from './ChainEvents';
import CoverageMap from './CoverageMap';
import ThreeScene from './ThreeScene';

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full" style={{ background: '#050b14' }}>
      <motion.div
        className="flex flex-col items-center gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
        <span className="mono text-xs text-white/30">Initializing 3D scene…</span>
      </motion.div>
    </div>
  );
}

function ScanLine() {
  return (
    <motion.div
      className="fixed left-0 right-0 h-px pointer-events-none z-50"
      style={{ background: 'linear-gradient(90deg, transparent, rgba(0,200,255,0.15), transparent)' }}
      initial={{ top: '-1px' }}
      animate={{ top: '100vh' }}
      transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
    />
  );
}

export default function Dashboard() {
  const { uavs, defects, chainEvents, stats } = useSimulation();

  return (
    <div className="flex flex-col h-screen hex-bg" style={{ background: 'var(--bg-primary)' }}>
      <ScanLine />

      {/* Header */}
      <Header />

      {/* Stats bar */}
      <div className="px-4 py-2 flex-shrink-0">
        <StatsBar stats={stats} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex gap-2 px-4 pb-4 min-h-0">

        {/* Left column: UAV Fleet + Coverage */}
        <motion.div
          className="flex flex-col gap-2 flex-shrink-0"
          style={{ width: '220px' }}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <div className="panel p-3 flex-1 min-h-0">
            <UAVFleet uavs={uavs} />
          </div>
          <div className="panel p-3 flex-shrink-0" style={{ height: '220px' }}>
            <CoverageMap uavs={uavs} buildings={BUILDINGS} coverage={stats.coveragePercent} />
          </div>
        </motion.div>

        {/* Center: 3D scene */}
        <motion.div
          className="flex-1 panel overflow-hidden relative"
          style={{ background: '#050b14' }}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          {/* Corner decorations */}
          {[
            'top-2 left-2 border-t border-l',
            'top-2 right-2 border-t border-r',
            'bottom-2 left-2 border-b border-l',
            'bottom-2 right-2 border-b border-r',
          ].map((cls, i) => (
            <div
              key={i}
              className={`absolute w-4 h-4 ${cls} pointer-events-none z-10`}
              style={{ borderColor: 'rgba(0,200,255,0.4)' }}
            />
          ))}

          {/* Legend */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 panel px-3 py-1.5">
            <span className="mono text-xs text-white/40 uppercase tracking-widest">Live 3D Feed</span>
            <motion.span
              className="w-1.5 h-1.5 rounded-full bg-cyan-400"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
          </div>

          {/* Sensor legend bottom */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-4 panel px-3 py-1.5">
            {[
              { label: 'EO', color: '#00c8ff' },
              { label: 'IR', color: '#ff8800' },
              { label: 'SAR', color: '#aa44ff' },
              { label: 'Defect', color: '#ff3344' },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="mono text-xs text-white/40">{label}</span>
              </div>
            ))}
          </div>

          <Suspense fallback={<LoadingFallback />}>
            <ThreeScene uavs={uavs} defects={defects} buildings={BUILDINGS} />
          </Suspense>
        </motion.div>

        {/* Right column: Defects + Chain events */}
        <motion.div
          className="flex flex-col gap-2 flex-shrink-0"
          style={{ width: '240px' }}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <div className="panel p-3 flex-1 min-h-0" style={{ maxHeight: '60%' }}>
            <DefectPanel defects={defects} />
          </div>
          <div className="panel p-3 flex-1 min-h-0">
            <ChainEvents events={chainEvents} />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
