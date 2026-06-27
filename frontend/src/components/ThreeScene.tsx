import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Float, Sparkles, Environment } from '@react-three/drei';
import * as THREE from 'three';
import type { UAV, Defect, Building } from '../types';

function RefineryBuilding({ building }: { building: Building }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const color = building.status === 'CRITICAL' ? '#ff3344'
    : building.status === 'ALERT' ? '#ff8800' : '#00c8ff';

  const geometry = useMemo(() => {
    if (building.type === 'DISTILLATION') return new THREE.CylinderGeometry(0.12, 0.15, 1.2, 8);
    if (building.type === 'STORAGE') return new THREE.CylinderGeometry(0.35, 0.35, 0.5, 16);
    if (building.type === 'REACTOR') return new THREE.SphereGeometry(0.22, 12, 8);
    if (building.type === 'HEAT_EX') return new THREE.BoxGeometry(0.5, 0.3, 0.25);
    if (building.type === 'CRACKER') return new THREE.BoxGeometry(0.2, 0.9, 0.2);
    return new THREE.BoxGeometry(0.3, 0.4, 0.3);
  }, [building.type]);

  useFrame((_, delta) => {
    if (meshRef.current && building.status !== 'NORMAL') {
      meshRef.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <group position={[building.position.x, building.position.y, building.position.z]}>
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={building.status === 'NORMAL' ? 0.1 : 0.4}
          metalness={0.7}
          roughness={0.3}
          transparent
          opacity={0.85}
        />
      </mesh>
      {building.status !== 'NORMAL' && (
        <pointLight color={color} intensity={0.8} distance={2} />
      )}
    </group>
  );
}

function DroneModel({ uav }: { uav: UAV }) {
  const groupRef = useRef<THREE.Group>(null);
  const armColor = uav.mode === 'IDLE' ? '#334455'
    : uav.mode === 'INSPECT' || uav.mode === 'REVALIDATE' ? '#00c8ff'
    : '#0066ff';

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * (uav.mode === 'IDLE' ? 0.2 : 0.8);
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.1} floatIntensity={0.15}>
      <group
        ref={groupRef}
        position={[uav.position.x, uav.position.y, uav.position.z]}
      >
        {/* Body */}
        <mesh>
          <boxGeometry args={[0.12, 0.04, 0.12]} />
          <meshStandardMaterial color="#1a2840" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Arms */}
        {[[-0.1, 0, -0.1], [0.1, 0, -0.1], [-0.1, 0, 0.1], [0.1, 0, 0.1]].map(([ax, ay, az], i) => (
          <group key={i} position={[ax, ay, az]}>
            <mesh>
              <cylinderGeometry args={[0.025, 0.025, 0.02, 8]} />
              <meshStandardMaterial color={armColor} emissive={armColor} emissiveIntensity={0.6} metalness={0.5} />
            </mesh>
          </group>
        ))}
        {/* Sensor glow */}
        <pointLight
          color={uav.sensor === 'SAR' ? '#aa44ff' : uav.sensor === 'IR' ? '#ff8800' : '#00c8ff'}
          intensity={uav.mode === 'IDLE' ? 0.1 : 0.5}
          distance={1.5}
        />
      </group>
    </Float>
  );
}

function DefectMarker({ defect }: { defect: Defect }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const color = defect.state === 'VERIFIED' ? '#ff3344'
    : defect.state === 'IN_MAINTENANCE' ? '#ff8800'
    : defect.state === 'SOLVED' ? '#00ff88'
    : '#ffff00';

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(0.8 + Math.sin(clock.elapsedTime * 3) * 0.2);
    }
  });

  return (
    <group position={[defect.position.x, defect.position.y + 0.2, defect.position.z]}>
      <mesh ref={meshRef}>
        <octahedronGeometry args={[0.08, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
          transparent
          opacity={0.9}
        />
      </mesh>
      <pointLight color={color} intensity={0.4} distance={1} />
    </group>
  );
}

function FlightPath({ uav }: { uav: UAV }) {
  const points = useMemo(() => [
    new THREE.Vector3(uav.position.x, uav.position.y, uav.position.z),
    new THREE.Vector3(
      uav.position.x + uav.velocity.x * 8,
      uav.position.y,
      uav.position.z + uav.velocity.z * 8
    ),
  ], [uav.position, uav.velocity]);

  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);

  if (uav.mode === 'IDLE' || uav.mode === 'CHARGE') return null;
  return (
    // @ts-expect-error drei/fiber line primitive
    <line geometry={geometry}>
      <lineBasicMaterial color="#00c8ff" transparent opacity={0.15} />
    </line>
  );
}

function GroundGrid() {
  return (
    <Grid
      position={[0, 0, 0]}
      args={[20, 20]}
      cellSize={1}
      cellThickness={0.5}
      cellColor="#0a2040"
      sectionSize={5}
      sectionThickness={1}
      sectionColor="#00c8ff"
      fadeDistance={25}
      fadeStrength={1}
      infiniteGrid
    />
  );
}

interface Props {
  uavs: UAV[];
  defects: Defect[];
  buildings: Building[];
}

export default function ThreeScene({ uavs, defects, buildings }: Props) {
  return (
    <Canvas
      camera={{ position: [8, 6, 8], fov: 55, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: '#050b14' }}
    >
      <Environment preset="night" />
      <ambientLight intensity={0.15} />
      <directionalLight position={[5, 10, 5]} intensity={0.4} color="#4488cc" />
      <pointLight position={[0, 5, 0]} intensity={0.3} color="#00c8ff" />

      <GroundGrid />

      <Sparkles
        count={60}
        scale={14}
        size={0.6}
        speed={0.2}
        opacity={0.3}
        color="#00c8ff"
      />

      {buildings.map(b => <RefineryBuilding key={b.id} building={b} />)}
      {uavs.map(uav => (
        <group key={uav.id}>
          <DroneModel uav={uav} />
          <FlightPath uav={uav} />
        </group>
      ))}
      {defects
        .filter(d => d.state !== 'SOLVED' && d.state !== 'FALSE_POSITIVE')
        .map(d => <DefectMarker key={d.id} defect={d} />)
      }

      <OrbitControls
        enablePan={false}
        minDistance={4}
        maxDistance={20}
        maxPolarAngle={Math.PI / 2.1}
        autoRotate
        autoRotateSpeed={0.4}
      />
    </Canvas>
  );
}
