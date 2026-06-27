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

function SceneLoader() {
  return (
    <div className="flex items-center justify-center h-full" style={{ background: '#04070f' }}>
      <motion.div className="flex flex-col items-center gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <motion.div className="w-9 h-9 border-2 border-[var(--cyan)] border-t-transparent rounded-full"
          animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
        <span className="mono text-[10px] text-[var(--t-lo)] tracking-widest">RENDERING SCENE</span>
      </motion.div>
    </div>
  );
}

const panel = (delay: number, x = 0) => ({
  initial: { opacity: 0, x, y: x === 0 ? 18 : 0 },
  animate: { opacity: 1, x: 0, y: 0 },
  transition: { delay, duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
});

export default function Dashboard() {
  const { uavs, defects, chainEvents, stats } = useSimulation();

  return (
    <div className="flex flex-col h-screen app-bg">
      {/* scan line */}
      <motion.div className="fixed left-0 right-0 h-[2px] pointer-events-none z-30"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(56,225,255,0.18), transparent)' }}
        initial={{ top: '-2px' }} animate={{ top: '100vh' }}
        transition={{ duration: 7, repeat: Infinity, ease: 'linear' }} />

      <Header />

      <div className="px-5 pt-3 flex-shrink-0">
        <StatsBar stats={stats} />
      </div>

      <div className="flex-1 flex gap-3 px-5 py-3 min-h-0">
        {/* Left */}
        <motion.div className="flex flex-col gap-3 flex-shrink-0" style={{ width: '244px' }} {...panel(0.1, -28)}>
          <div className="glass panel-accent p-3.5 flex-1 min-h-0">
            <UAVFleet uavs={uavs} />
          </div>
          <div className="glass panel-accent p-3.5 flex-shrink-0" style={{ height: '236px' }}>
            <CoverageMap uavs={uavs} buildings={BUILDINGS} coverage={stats.coveragePercent} />
          </div>
        </motion.div>

        {/* Center */}
        <motion.div className="flex-1 glass overflow-hidden relative bracket" style={{ background: '#04070f' }} {...panel(0.2)}>
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2.5 glass rounded-full px-4 py-1.5">
            <span className="label">Live 3D Operations Feed</span>
            <motion.span className="w-1.5 h-1.5 rounded-full bg-[var(--cyan)]" style={{ boxShadow: '0 0 8px var(--cyan)' }}
              animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
          </div>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-4 glass rounded-full px-4 py-1.5">
            {[['EO','var(--cyan)'],['IR','var(--amber)'],['SAR','var(--violet)'],['Defect','var(--red)']].map(([l,c])=>(
              <div key={l} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c, boxShadow: `0 0 6px ${c}` }} />
                <span className="mono text-[10px] text-[var(--t-mid)]">{l}</span>
              </div>
            ))}
          </div>
          <Suspense fallback={<SceneLoader />}>
            <ThreeScene uavs={uavs} defects={defects} buildings={BUILDINGS} />
          </Suspense>
        </motion.div>

        {/* Right */}
        <motion.div className="flex flex-col gap-3 flex-shrink-0" style={{ width: '258px' }} {...panel(0.3, 28)}>
          <div className="glass panel-accent p-3.5 min-h-0" style={{ flex: '1.25' }}>
            <DefectPanel defects={defects} />
          </div>
          <div className="glass panel-accent p-3.5 min-h-0" style={{ flex: '1' }}>
            <ChainEvents events={chainEvents} />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
