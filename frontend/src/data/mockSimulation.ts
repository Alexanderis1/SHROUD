import type { UAV, Defect, ChainEvent, Building, SimStats } from '../types';

export const BUILDINGS: Building[] = [
  { id: 'B1', name: 'Distillation Tower Alpha', type: 'DISTILLATION', position: { x: -3, y: 0, z: -2 }, status: 'NORMAL' },
  { id: 'B2', name: 'Tank Farm 7', type: 'STORAGE', position: { x: 2, y: 0, z: -3 }, status: 'ALERT' },
  { id: 'B3', name: 'Reactor Unit 3', type: 'REACTOR', position: { x: 0, y: 0, z: 2 }, status: 'CRITICAL' },
  { id: 'B4', name: 'Pipeline Junction C', type: 'PIPELINE', position: { x: -1, y: 0, z: -1 }, status: 'NORMAL' },
  { id: 'B5', name: 'Heat Exchanger 2', type: 'HEAT_EX', position: { x: 3, y: 0, z: 1 }, status: 'NORMAL' },
  { id: 'B6', name: 'Cracking Unit Beta', type: 'CRACKER', position: { x: -2, y: 0, z: 2 }, status: 'ALERT' },
];

const randomHex = (len: number) =>
  Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join('');

export function generateInitialUAVs(): UAV[] {
  const sensors: UAV['sensor'][] = ['EO', 'IR', 'SAR'];
  const modes: UAV['mode'][] = ['INSPECT', 'TRANSIT', 'REVALIDATE', 'IDLE', 'INSPECT', 'TRANSIT'];
  return Array.from({ length: 6 }, (_, i) => ({
    id: `UAV-${String(i + 1).padStart(3, '0')}`,
    name: `Raptor-${i + 1}`,
    mode: modes[i],
    battery: 60 + Math.random() * 38,
    altitude: 80 + Math.random() * 120,
    position: {
      x: (Math.random() - 0.5) * 10,
      y: 1.5 + Math.random() * 2,
      z: (Math.random() - 0.5) * 10,
    },
    velocity: {
      x: (Math.random() - 0.5) * 0.5,
      y: (Math.random() - 0.5) * 0.1,
      z: (Math.random() - 0.5) * 0.5,
    },
    sensor: sensors[i % 3],
    address: `0x${randomHex(40)}`,
    tasksCompleted: Math.floor(Math.random() * 24),
    signalStrength: 70 + Math.random() * 30,
  }));
}

export function generateInitialDefects(): Defect[] {
  const types: Defect['type'][] = ['CORROSION', 'CRACK', 'LEAK', 'THERMAL_ANOMALY', 'COATING_LOSS', 'DEFORMATION'];
  const states: Defect['state'][] = ['VERIFIED', 'IDENTIFIED', 'IN_MAINTENANCE', 'VERIFIED', 'SOLVED', 'IDENTIFIED'];
  return Array.from({ length: 6 }, (_, i) => ({
    id: `DEF-${String(i + 1).padStart(4, '0')}`,
    tokenId: 1000 + i,
    buildingId: BUILDINGS[i % BUILDINGS.length].id,
    buildingName: BUILDINGS[i % BUILDINGS.length].name,
    type: types[i],
    state: states[i],
    confidence: 0.72 + Math.random() * 0.27,
    position: {
      x: (Math.random() - 0.5) * 8,
      y: Math.random() * 3,
      z: (Math.random() - 0.5) * 8,
    },
    reporter: `0x${randomHex(8)}...${randomHex(4)}`,
    confirmations: [3, 1, 3, 3, 3, 2][i],
    rejections: [0, 0, 0, 0, 0, 1][i],
    imageHash: `0x${randomHex(64)}`,
    timestamp: Date.now() - (i + 1) * 180000 + Math.random() * 60000,
    txHash: `0x${randomHex(64)}`,
  }));
}

export function generateInitialChainEvents(): ChainEvent[] {
  const types: ChainEvent['type'][] = [
    'FailureVerified', 'ConfirmationSubmitted', 'FailureIdentified',
    'StateChanged', 'ConfirmationSubmitted', 'FailureIdentified',
    'ConfirmationSubmitted', 'FailureVerified',
  ];
  return types.map((type, i) => ({
    id: `EVT-${i}`,
    type,
    failureId: 1000 + (i % 6),
    from: `0x${randomHex(8)}...${randomHex(4)}`,
    blockNumber: 12345678 - i * 3,
    timestamp: Date.now() - i * 25000,
    data: { block: 12345678 - i * 3 },
  }));
}

export function generateInitialStats(): SimStats {
  return {
    uptime: 0,
    totalDetections: 6,
    verified: 2,
    falsePositives: 0,
    coveragePercent: 67.4,
    activeUAVs: 5,
    chainTx: 24,
    quorumReached: 2,
  };
}
