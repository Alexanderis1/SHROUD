export type DefectType =
  | 'UNKNOWN' | 'CORROSION' | 'CRACK' | 'LEAK'
  | 'COATING_LOSS' | 'DEFORMATION' | 'THERMAL_ANOMALY';

export type FailureState =
  | 'IDENTIFIED' | 'VERIFIED' | 'IN_MAINTENANCE' | 'SOLVED' | 'FALSE_POSITIVE';

export type SensorModality = 'EO' | 'IR' | 'SAR';

export type UavMode =
  | 'IDLE' | 'TRANSIT' | 'INSPECT' | 'REVALIDATE' | 'RTB' | 'CHARGE';

export interface Vec3 { x: number; y: number; z: number; }

export interface UAV {
  id: string;
  name: string;
  mode: UavMode;
  battery: number;
  altitude: number;
  position: Vec3;
  velocity: Vec3;
  sensor: SensorModality;
  address: string;
  tasksCompleted: number;
  signalStrength: number;
}

export interface Defect {
  id: string;
  tokenId: number;
  buildingId: string;
  buildingName: string;
  type: DefectType;
  state: FailureState;
  confidence: number;
  position: Vec3;
  reporter: string;
  confirmations: number;
  rejections: number;
  imageHash: string;
  timestamp: number;
  txHash?: string;
}

export interface ChainEvent {
  id: string;
  type: 'FailureIdentified' | 'FailureVerified' | 'ConfirmationSubmitted' | 'StateChanged';
  failureId: number;
  from: string;
  blockNumber: number;
  timestamp: number;
  data: Record<string, string | number>;
}

export interface Building {
  id: string;
  name: string;
  type: string;
  position: Vec3;
  status: 'NORMAL' | 'ALERT' | 'CRITICAL';
}

export interface SimStats {
  uptime: number;
  totalDetections: number;
  verified: number;
  falsePositives: number;
  coveragePercent: number;
  activeUAVs: number;
  chainTx: number;
  quorumReached: number;
}
