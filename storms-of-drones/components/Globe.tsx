"use client";

import { useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, Stars, Line } from "@react-three/drei";
import * as THREE from "three";

function Earth() {
  const meshRef = useRef<THREE.Mesh>(null);
  const cloudRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  // Create Earth texture programmatically with canvas
  const earthTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d")!;

    // Deep ocean background
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, "#0a1628");
    grad.addColorStop(0.5, "#0d2040");
    grad.addColorStop(1, "#071320");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);

    // Draw simplified continents
    ctx.fillStyle = "#1a3a2a";

    // Europe/Italy area (key focus)
    ctx.beginPath();
    ctx.ellipse(540, 190, 55, 40, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Italy boot shape (approximate)
    ctx.fillStyle = "#1e4a30";
    ctx.beginPath();
    ctx.ellipse(548, 198, 12, 28, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Glowing dot on Italy
    const italyGrad = ctx.createRadialGradient(550, 200, 0, 550, 200, 18);
    italyGrad.addColorStop(0, "rgba(59, 130, 246, 0.9)");
    italyGrad.addColorStop(0.4, "rgba(59, 130, 246, 0.4)");
    italyGrad.addColorStop(1, "rgba(59, 130, 246, 0)");
    ctx.fillStyle = italyGrad;
    ctx.beginPath();
    ctx.arc(550, 200, 18, 0, Math.PI * 2);
    ctx.fill();

    // North Africa
    ctx.fillStyle = "#2a3a20";
    ctx.beginPath();
    ctx.ellipse(530, 240, 80, 25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Asia
    ctx.fillStyle = "#1a3a2a";
    ctx.beginPath();
    ctx.ellipse(680, 180, 120, 60, -0.1, 0, Math.PI * 2);
    ctx.fill();

    // Americas
    ctx.beginPath();
    ctx.ellipse(260, 180, 55, 70, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(275, 300, 35, 55, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Grid lines
    ctx.strokeStyle = "rgba(59, 130, 246, 0.12)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 12; i++) {
      const x = (i / 12) * 1024;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }
    for (let i = 0; i <= 6; i++) {
      const y = (i / 6) * 512;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();
    }

    // Scatter data points
    ctx.fillStyle = "rgba(59, 130, 246, 0.8)";
    const points = [
      [550, 200], [520, 185], [535, 215], [560, 195],
      [530, 205], [545, 180], [555, 210],
    ];
    for (const [px, py] of points) {
      ctx.beginPath();
      ctx.arc(px, py, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }, []);

  // Atmosphere glow shader
  const atmosphereMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          c: { value: 0.5 },
          p: { value: 4.5 },
          glowColor: { value: new THREE.Color(0x0066ff) },
          viewVector: { value: new THREE.Vector3(0, 0, 1) },
        },
        vertexShader: `
          uniform vec3 viewVector;
          uniform float c;
          uniform float p;
          varying float intensity;
          void main() {
            vec3 vNormal = normalize(normalMatrix * normal);
            vec3 vNormel = normalize(normalMatrix * viewVector);
            intensity = pow(c - dot(vNormal, vNormel), p);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 glowColor;
          varying float intensity;
          void main() {
            vec3 glow = glowColor * intensity;
            gl_FragColor = vec4(glow, intensity * 0.6);
          }
        `,
        side: THREE.FrontSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    []
  );

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.0015;
    }
    if (cloudRef.current) {
      cloudRef.current.rotation.y += 0.002;
    }
    if (glowRef.current) {
      const viewVector = new THREE.Vector3().subVectors(
        state.camera.position,
        glowRef.current.position
      );
      atmosphereMaterial.uniforms.viewVector.value = viewVector;
    }
  });

  return (
    <group>
      {/* Core Earth */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshPhongMaterial
          map={earthTexture}
          color={0x112244}
          emissive={0x001133}
          specular={0x4488cc}
          shininess={20}
        />
      </mesh>

      {/* Atmosphere glow */}
      <mesh ref={glowRef} scale={[1.15, 1.15, 1.15]} material={atmosphereMaterial}>
        <sphereGeometry args={[2, 32, 32]} />
      </mesh>

      {/* Wireframe grid overlay */}
      <mesh rotation={[0, 0, 0]}>
        <sphereGeometry args={[2.02, 24, 24]} />
        <meshBasicMaterial
          color={0x1155ff}
          wireframe
          transparent
          opacity={0.06}
        />
      </mesh>
    </group>
  );
}

function Drone({ orbitRadius, orbitSpeed, orbitTilt, initialAngle, scale = 1 }: {
  orbitRadius: number;
  orbitSpeed: number;
  orbitTilt: number;
  initialAngle: number;
  scale?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const angleRef = useRef(initialAngle);
  const trailRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    angleRef.current += orbitSpeed * delta;
    if (groupRef.current) {
      const x = Math.cos(angleRef.current) * orbitRadius;
      const z = Math.sin(angleRef.current) * orbitRadius;
      const y = Math.sin(angleRef.current * 0.5 + orbitTilt) * orbitRadius * 0.3;
      groupRef.current.position.set(x, y, z);
      groupRef.current.rotation.y = -angleRef.current + Math.PI / 2;
      groupRef.current.rotation.z = Math.sin(angleRef.current) * 0.2;
    }
  });

  return (
    <group ref={groupRef} scale={[scale, scale, scale]}>
      {/* Drone body */}
      <mesh>
        <boxGeometry args={[0.18, 0.04, 0.18]} />
        <meshPhongMaterial color={0x334466} emissive={0x001133} shininess={80} />
      </mesh>
      {/* Drone arms */}
      {[[-0.12, 0, -0.12], [0.12, 0, -0.12], [-0.12, 0, 0.12], [0.12, 0, 0.12]].map((pos, i) => (
        <group key={i}>
          <mesh position={pos as [number, number, number]}>
            <cylinderGeometry args={[0.025, 0.025, 0.02, 8]} />
            <meshPhongMaterial color={0x223355} />
          </mesh>
          {/* Rotor blur */}
          <mesh position={[pos[0], 0.015, pos[2]] as [number, number, number]}>
            <cylinderGeometry args={[0.07, 0.07, 0.002, 16]} />
            <meshBasicMaterial color={0x4488ff} transparent opacity={0.3} />
          </mesh>
        </group>
      ))}
      {/* Status light */}
      <mesh position={[0, 0.04, 0]}>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshBasicMaterial color={0x00ffaa} />
      </mesh>
      {/* Downward scan beam */}
      <mesh position={[0, -0.1, 0]}>
        <coneGeometry args={[0.05, 0.2, 8, 1, true]} />
        <meshBasicMaterial color={0x0066ff} transparent opacity={0.15} side={THREE.DoubleSide} />
      </mesh>
      <pointLight color={0x0044ff} intensity={0.3} distance={1.5} />
    </group>
  );
}

function OrbitRing({ radius, tilt, color }: { radius: number; tilt: number; color: string }) {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 128; i++) {
      const angle = (i / 128) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
    }
    return pts;
  }, [radius]);

  return (
    <group rotation={[tilt, 0, 0]}>
      <Line points={points} color={color} transparent opacity={0.15} lineWidth={0.5} />
    </group>
  );
}

function ScanRings() {
  const ring1 = useRef<THREE.Mesh>(null);
  const ring2 = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ring1.current) {
      const scale = 1 + ((t * 0.4) % 1) * 1.2;
      ring1.current.scale.setScalar(scale);
      (ring1.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.4 - ((t * 0.4) % 1) * 0.4);
    }
    if (ring2.current) {
      const scale2 = 1 + ((t * 0.4 + 0.5) % 1) * 1.2;
      ring2.current.scale.setScalar(scale2);
      (ring2.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.4 - ((t * 0.4 + 0.5) % 1) * 0.4);
    }
  });

  return (
    <>
      <mesh ref={ring1} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.1, 2.15, 64]} />
        <meshBasicMaterial color={0x0066ff} transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ring2} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.1, 2.15, 64]} />
        <meshBasicMaterial color={0x0066ff} transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}

function ItalyPing() {
  const pingRef = useRef<THREE.Mesh>(null);
  const ping2Ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (pingRef.current) {
      const scale = 1 + ((t * 0.6) % 1) * 2;
      pingRef.current.scale.setScalar(scale);
      (pingRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.8 - ((t * 0.6) % 1) * 0.8);
    }
    if (ping2Ref.current) {
      const scale2 = 1 + ((t * 0.6 + 0.5) % 1) * 2;
      ping2Ref.current.scale.setScalar(scale2);
      (ping2Ref.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.8 - ((t * 0.6 + 0.5) % 1) * 0.8);
    }
  });

  // Italy is roughly at lon=12°E, lat=42°N on the globe
  const phi = (90 - 42) * (Math.PI / 180);
  const theta = (12 + 180) * (Math.PI / 180);
  const x = 2.05 * Math.sin(phi) * Math.cos(theta);
  const y = 2.05 * Math.cos(phi);
  const z = 2.05 * Math.sin(phi) * Math.sin(theta);

  return (
    <group position={[x, y, z]}>
      <mesh ref={pingRef}>
        <ringGeometry args={[0.02, 0.04, 16]} />
        <meshBasicMaterial color={0xff3300} transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ping2Ref}>
        <ringGeometry args={[0.02, 0.04, 16]} />
        <meshBasicMaterial color={0xff3300} transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshBasicMaterial color={0xff4400} />
      </mesh>
      <pointLight color={0xff3300} intensity={0.5} distance={0.5} />
    </group>
  );
}

export default function Globe() {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 55 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.15} />
        <directionalLight position={[5, 3, 5]} intensity={1.2} color={0xffffff} />
        <pointLight position={[-5, -3, -5]} intensity={0.3} color={0x002244} />
        <pointLight position={[0, 5, 0]} intensity={0.2} color={0x0044ff} />

        <Stars radius={100} depth={50} count={4000} factor={3} saturation={0.5} fade speed={0.5} />

        <Suspense fallback={null}>
          <Earth />
          <ItalyPing />
          <ScanRings />

          <OrbitRing radius={3.2} tilt={0.3} color="#3b82f6" />
          <OrbitRing radius={3.8} tilt={-0.5} color="#06b6d4" />
          <OrbitRing radius={2.9} tilt={1.1} color="#8b5cf6" />

          <Drone orbitRadius={3.2} orbitSpeed={0.7} orbitTilt={0.3} initialAngle={0} scale={0.9} />
          <Drone orbitRadius={3.2} orbitSpeed={0.7} orbitTilt={0.3} initialAngle={2.1} scale={0.9} />
          <Drone orbitRadius={3.2} orbitSpeed={0.7} orbitTilt={0.3} initialAngle={4.2} scale={0.9} />

          <Drone orbitRadius={3.8} orbitSpeed={-0.5} orbitTilt={-0.5} initialAngle={1.0} scale={0.75} />
          <Drone orbitRadius={3.8} orbitSpeed={-0.5} orbitTilt={-0.5} initialAngle={3.2} scale={0.75} />

          <Drone orbitRadius={2.9} orbitSpeed={1.1} orbitTilt={1.1} initialAngle={0.5} scale={0.65} />
          <Drone orbitRadius={2.9} orbitSpeed={1.1} orbitTilt={1.1} initialAngle={3.6} scale={0.65} />
        </Suspense>

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate={false}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI * 0.65}
        />
      </Canvas>
    </div>
  );
}
