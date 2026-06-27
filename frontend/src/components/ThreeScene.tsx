import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Float, Sparkles, Environment, Trail } from '@react-three/drei';
import * as THREE from 'three';
import type { UAV, Defect, Building } from '../types';

const COL = {
  cyan: '#38e1ff', indigo: '#5b8cff', violet: '#a47bff',
  amber: '#ffb53d', red: '#ff3b4e', lime: '#8fff7a',
};

function statusColor(s: Building['status']) {
  return s === 'CRITICAL' ? COL.red : s === 'ALERT' ? COL.amber : COL.cyan;
}

function RefineryBuilding({ building }: { building: Building }) {
  const ref = useRef<THREE.Group>(null);
  const color = statusColor(building.status);

  const { geom, h } = useMemo(() => {
    let g: THREE.BufferGeometry;
    switch (building.type) {
      case 'DISTILLATION': g = new THREE.CylinderGeometry(0.13, 0.16, 1.3, 10); break;
      case 'STORAGE': g = new THREE.CylinderGeometry(0.36, 0.36, 0.55, 20); break;
      case 'REACTOR': g = new THREE.SphereGeometry(0.24, 16, 12); break;
      case 'HEAT_EX': g = new THREE.BoxGeometry(0.55, 0.32, 0.28); break;
      case 'CRACKER': g = new THREE.BoxGeometry(0.22, 1.0, 0.22); break;
      default: g = new THREE.BoxGeometry(0.32, 0.45, 0.32);
    }
    g.computeBoundingBox();
    return { geom: g, h: g.boundingBox ? g.boundingBox.max.y : 0.5 };
  }, [building.type]);

  useFrame((_, dt) => {
    if (ref.current && building.status !== 'NORMAL') ref.current.rotation.y += dt * 0.25;
  });

  return (
    <group position={[building.position.x, 0, building.position.z]}>
      {/* base pad */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.42, 0.46, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>
      <group ref={ref} position={[0, h + 0.05, 0]}>
        <mesh geometry={geom}>
          <meshStandardMaterial color={color} emissive={color}
            emissiveIntensity={building.status === 'NORMAL' ? 0.12 : 0.5}
            metalness={0.8} roughness={0.25} transparent opacity={0.9} />
        </mesh>
        {/* wireframe overlay */}
        <mesh geometry={geom} scale={1.015}>
          <meshBasicMaterial color={color} wireframe transparent opacity={0.12} />
        </mesh>
      </group>
      {building.status !== 'NORMAL' && (
        <>
          <pointLight color={color} intensity={1} distance={2.5} position={[0, h, 0]} />
          <AlertRing color={color} />
        </>
      )}
    </group>
  );
}

function AlertRing({ color }: { color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      const s = 0.5 + (clock.elapsedTime % 2) * 0.4;
      ref.current.scale.setScalar(s);
      (ref.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.5 - (clock.elapsedTime % 2) * 0.25);
    }
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
      <ringGeometry args={[0.45, 0.5, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} />
    </mesh>
  );
}

function ScanCone({ uav }: { uav: UAV }) {
  const color = uav.sensor === 'SAR' ? COL.violet : uav.sensor === 'IR' ? COL.amber : COL.cyan;
  if (uav.mode === 'IDLE' || uav.mode === 'CHARGE') return null;
  return (
    <mesh position={[0, -uav.position.y / 2, 0]}>
      <coneGeometry args={[uav.position.y * 0.35, uav.position.y, 16, 1, true]} />
      <meshBasicMaterial color={color} transparent opacity={0.06} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

function DroneModel({ uav }: { uav: UAV }) {
  const rotor = useRef<THREE.Group>(null);
  const flying = uav.mode !== 'IDLE' && uav.mode !== 'CHARGE';
  const armColor = uav.mode === 'IDLE' ? '#5b7488'
    : (uav.mode === 'INSPECT' || uav.mode === 'REVALIDATE') ? COL.cyan : COL.indigo;
  const sensorColor = uav.sensor === 'SAR' ? COL.violet : uav.sensor === 'IR' ? COL.amber : COL.cyan;

  useFrame((_, dt) => {
    if (rotor.current) rotor.current.rotation.y += dt * (flying ? 18 : 3);
  });

  return (
    <Float speed={2} rotationIntensity={0.08} floatIntensity={0.12}>
      <group position={[uav.position.x, uav.position.y, uav.position.z]}>
        {/* hull */}
        <mesh>
          <boxGeometry args={[0.14, 0.045, 0.14]} />
          <meshStandardMaterial color="#16243c" metalness={0.95} roughness={0.18} />
        </mesh>
        <mesh position={[0, 0.035, 0]}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshStandardMaterial color={sensorColor} emissive={sensorColor} emissiveIntensity={1.2} />
        </mesh>
        {/* rotors */}
        <group ref={rotor}>
          {[[-0.11,-0.11],[0.11,-0.11],[-0.11,0.11],[0.11,0.11]].map(([x,z],i)=>(
            <group key={i} position={[x, 0.01, z]}>
              <mesh>
                <cylinderGeometry args={[0.012, 0.012, 0.03, 6]} />
                <meshStandardMaterial color={armColor} emissive={armColor} emissiveIntensity={0.5} />
              </mesh>
              <mesh position={[0, 0.02, 0]} rotation={[0, i * 0.5, 0]}>
                <boxGeometry args={[0.085, 0.004, 0.012]} />
                <meshBasicMaterial color={armColor} transparent opacity={flying ? 0.35 : 0.7} />
              </mesh>
            </group>
          ))}
        </group>
        {/* arms */}
        {[[-0.11,-0.11],[0.11,-0.11],[-0.11,0.11],[0.11,0.11]].map(([x,z],i)=>(
          <mesh key={i} position={[x/2, 0, z/2]} rotation={[0, Math.atan2(z, x), 0]}>
            <boxGeometry args={[0.16, 0.012, 0.012]} />
            <meshStandardMaterial color="#2a3d57" metalness={0.7} roughness={0.3} />
          </mesh>
        ))}
        <pointLight color={sensorColor} intensity={flying ? 0.6 : 0.15} distance={1.6} />
        <ScanCone uav={uav} />
      </group>
    </Float>
  );
}

function DroneWithTrail({ uav }: { uav: UAV }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (ref.current) ref.current.position.set(uav.position.x, uav.position.y, uav.position.z);
  });
  const flying = uav.mode !== 'IDLE' && uav.mode !== 'CHARGE';
  const color = uav.sensor === 'SAR' ? COL.violet : uav.sensor === 'IR' ? COL.amber : COL.cyan;
  return (
    <>
      {flying && (
        <Trail width={0.6} length={4} color={new THREE.Color(color)} attenuation={(w) => w * w}>
          <mesh ref={ref} visible={false}>
            <sphereGeometry args={[0.01, 4, 4]} />
            <meshBasicMaterial />
          </mesh>
        </Trail>
      )}
      <DroneModel uav={uav} />
    </>
  );
}

function DefectMarker({ defect }: { defect: Defect }) {
  const core = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const color = defect.state === 'VERIFIED' ? COL.red
    : defect.state === 'IN_MAINTENANCE' ? COL.indigo
    : defect.state === 'SOLVED' ? COL.lime : COL.amber;

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (core.current) {
      core.current.scale.setScalar(0.8 + Math.sin(t * 3) * 0.18);
      core.current.rotation.y += 0.02; core.current.rotation.x += 0.01;
    }
    if (ring.current) {
      const s = 1 + (t % 1.5) * 1.2;
      ring.current.scale.setScalar(s);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.6 - (t % 1.5) * 0.4);
    }
  });

  return (
    <group position={[defect.position.x, defect.position.y + 0.3, defect.position.z]}>
      <mesh ref={core}>
        <octahedronGeometry args={[0.09, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} transparent opacity={0.95} />
      </mesh>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.12, 0.15, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      {/* beam to ground */}
      <mesh position={[0, -(defect.position.y + 0.3) / 2, 0]}>
        <cylinderGeometry args={[0.004, 0.004, defect.position.y + 0.3, 6]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} />
      </mesh>
      <pointLight color={color} intensity={0.5} distance={1.2} />
    </group>
  );
}

interface Props { uavs: UAV[]; defects: Defect[]; buildings: Building[]; }

export default function ThreeScene({ uavs, defects, buildings }: Props) {
  return (
    <Canvas
      camera={{ position: [7, 5.5, 7], fov: 52, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: '#04070f' }}
      dpr={[1, 2]}
    >
      <fog attach="fog" args={['#04070f', 10, 26]} />
      <Environment preset="night" />
      <ambientLight intensity={0.18} />
      <directionalLight position={[6, 12, 6]} intensity={0.5} color="#6aa0ff" />
      <pointLight position={[0, 6, 0]} intensity={0.4} color={COL.cyan} />
      <pointLight position={[-6, 3, -6]} intensity={0.3} color={COL.violet} />

      <Grid
        position={[0, 0, 0]} args={[24, 24]}
        cellSize={1} cellThickness={0.5} cellColor="#0c2138"
        sectionSize={5} sectionThickness={1} sectionColor="#1f5b8a"
        fadeDistance={28} fadeStrength={1.2} infiniteGrid
      />

      <Sparkles count={70} scale={16} size={1} speed={0.25} opacity={0.35} color={COL.cyan} />

      {buildings.map(b => <RefineryBuilding key={b.id} building={b} />)}
      {uavs.map(u => <DroneWithTrail key={u.id} uav={u} />)}
      {defects.filter(d => d.state !== 'SOLVED' && d.state !== 'FALSE_POSITIVE')
        .map(d => <DefectMarker key={d.id} defect={d} />)}

      <OrbitControls
        enablePan={false} minDistance={4} maxDistance={20}
        maxPolarAngle={Math.PI / 2.1} autoRotate autoRotateSpeed={0.5}
      />
    </Canvas>
  );
}
