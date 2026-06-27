import { useState, useEffect, useCallback, useRef } from 'react';
import type { UAV, Defect, ChainEvent, SimStats } from '../types';
import {
  generateInitialUAVs,
  generateInitialDefects,
  generateInitialChainEvents,
  generateInitialStats,
} from '../data/mockSimulation';

const UAV_MODES: UAV['mode'][] = ['IDLE', 'TRANSIT', 'INSPECT', 'REVALIDATE', 'RTB', 'CHARGE'];
const DEFECT_TYPES: Defect['type'][] = ['CORROSION', 'CRACK', 'LEAK', 'COATING_LOSS', 'DEFORMATION', 'THERMAL_ANOMALY'];
const BUILDINGS_IDS = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'];
const BUILDINGS_NAMES = [
  'Distillation Tower Alpha', 'Tank Farm 7', 'Reactor Unit 3',
  'Pipeline Junction C', 'Heat Exchanger 2', 'Cracking Unit Beta',
];
const randomHex = (len: number) =>
  Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join('');

export function useSimulation() {
  const [uavs, setUAVs] = useState<UAV[]>(generateInitialUAVs);
  const [defects, setDefects] = useState<Defect[]>(generateInitialDefects);
  const [chainEvents, setChainEvents] = useState<ChainEvent[]>(generateInitialChainEvents);
  const [stats, setStats] = useState<SimStats>(generateInitialStats);
  const [time, setTime] = useState(0);
  const tickRef = useRef(0);
  const defectCounterRef = useRef(6);
  const eventCounterRef = useRef(8);

  const tick = useCallback(() => {
    tickRef.current += 1;
    const t = tickRef.current;

    setTime(t);

    // Move UAVs
    setUAVs(prev => prev.map(uav => {
      const nx = uav.position.x + uav.velocity.x + (Math.random() - 0.5) * 0.08;
      const nz = uav.position.z + uav.velocity.z + (Math.random() - 0.5) * 0.08;
      const ny = uav.position.y + uav.velocity.y * 0.5;
      const newBattery = Math.max(10, uav.battery - 0.015);
      // Bounce
      const vx = Math.abs(nx) > 5 ? -uav.velocity.x : uav.velocity.x + (Math.random() - 0.5) * 0.04;
      const vz = Math.abs(nz) > 5 ? -uav.velocity.z : uav.velocity.z + (Math.random() - 0.5) * 0.04;
      const vy = Math.abs(ny - 2) > 1.5 ? -uav.velocity.y : uav.velocity.y;

      // Mode occasionally changes
      const newMode = (t % 120 === parseInt(uav.id.slice(-3)) % 120)
        ? UAV_MODES[Math.floor(Math.random() * UAV_MODES.length)]
        : uav.mode;

      return {
        ...uav,
        position: { x: Math.max(-5, Math.min(5, nx)), y: Math.max(1, Math.min(4, ny)), z: Math.max(-5, Math.min(5, nz)) },
        velocity: { x: vx * 0.97, y: vy * 0.97, z: vz * 0.97 },
        battery: newBattery,
        altitude: Math.max(1, Math.min(4, ny)) * 50,
        mode: newMode,
        signalStrength: Math.max(40, Math.min(100, uav.signalStrength + (Math.random() - 0.5) * 2)),
      };
    }));

    // Occasionally add a new defect detection
    if (t % 80 === 0) {
      const idx = defectCounterRef.current;
      defectCounterRef.current += 1;
      const bIdx = Math.floor(Math.random() * BUILDINGS_IDS.length);
      const newDefect: Defect = {
        id: `DEF-${String(idx + 1).padStart(4, '0')}`,
        tokenId: 1000 + idx,
        buildingId: BUILDINGS_IDS[bIdx],
        buildingName: BUILDINGS_NAMES[bIdx],
        type: DEFECT_TYPES[Math.floor(Math.random() * DEFECT_TYPES.length)],
        state: 'IDENTIFIED',
        confidence: 0.65 + Math.random() * 0.3,
        position: { x: (Math.random() - 0.5) * 8, y: Math.random() * 3, z: (Math.random() - 0.5) * 8 },
        reporter: `0x${randomHex(8)}...${randomHex(4)}`,
        confirmations: 1,
        rejections: 0,
        imageHash: `0x${randomHex(64)}`,
        timestamp: Date.now(),
        txHash: `0x${randomHex(64)}`,
      };
      setDefects(prev => [newDefect, ...prev].slice(0, 20));

      const evtId = eventCounterRef.current++;
      const newEvt: ChainEvent = {
        id: `EVT-${evtId}`,
        type: 'FailureIdentified',
        failureId: newDefect.tokenId,
        from: newDefect.reporter,
        blockNumber: 12345678 + evtId,
        timestamp: Date.now(),
        data: { tokenId: newDefect.tokenId },
      };
      setChainEvents(prev => [newEvt, ...prev].slice(0, 30));
      setStats(s => ({ ...s, totalDetections: s.totalDetections + 1, chainTx: s.chainTx + 1 }));
    }

    // Occasionally advance a defect state (confirmation)
    if (t % 45 === 0) {
      setDefects(prev => {
        const candidates = prev.filter(d => d.state === 'IDENTIFIED' && d.confirmations < 3);
        if (candidates.length === 0) return prev;
        const target = candidates[Math.floor(Math.random() * candidates.length)];
        const newConf = target.confirmations + 1;
        const newState: Defect['state'] = newConf >= 3 ? 'VERIFIED' : 'IDENTIFIED';
        const updated = prev.map(d => d.id === target.id
          ? { ...d, confirmations: newConf, state: newState }
          : d
        );

        const evtId = eventCounterRef.current++;
        if (newState === 'VERIFIED') {
          const newEvt: ChainEvent = {
            id: `EVT-${evtId}`,
            type: 'FailureVerified',
            failureId: target.tokenId,
            from: `0x${randomHex(8)}...${randomHex(4)}`,
            blockNumber: 12345678 + evtId,
            timestamp: Date.now(),
            data: { tokenId: target.tokenId },
          };
          setChainEvents(c => [newEvt, ...c].slice(0, 30));
          setStats(s => ({ ...s, verified: s.verified + 1, quorumReached: s.quorumReached + 1, chainTx: s.chainTx + 1 }));
        } else {
          const newEvt: ChainEvent = {
            id: `EVT-${evtId}`,
            type: 'ConfirmationSubmitted',
            failureId: target.tokenId,
            from: `0x${randomHex(8)}...${randomHex(4)}`,
            blockNumber: 12345678 + evtId,
            timestamp: Date.now(),
            data: { confirmations: newConf },
          };
          setChainEvents(c => [newEvt, ...c].slice(0, 30));
          setStats(s => ({ ...s, chainTx: s.chainTx + 1 }));
        }
        return updated;
      });
    }

    // Occasionally transition IN_MAINTENANCE → SOLVED
    if (t % 200 === 0) {
      setDefects(prev => {
        const target = prev.find(d => d.state === 'IN_MAINTENANCE');
        if (!target) {
          const verified = prev.find(d => d.state === 'VERIFIED');
          if (!verified) return prev;
          return prev.map(d => d.id === verified.id ? { ...d, state: 'IN_MAINTENANCE' } : d);
        }
        return prev.map(d => d.id === target.id ? { ...d, state: 'SOLVED' } : d);
      });
    }

    // Coverage drift
    setStats(s => ({
      ...s,
      uptime: t,
      coveragePercent: Math.min(100, s.coveragePercent + (Math.random() - 0.3) * 0.1),
      activeUAVs: Math.floor(4 + Math.random() * 2),
    }));
  }, []);

  useEffect(() => {
    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [tick]);

  return { uavs, defects, chainEvents, stats, time };
}
