import React, { useRef, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface BodyGeometry {
  torso: { radiusTop: number; radiusBottom: number; height: number };
  head: { radius: number; position: [number, number, number] };
  shoulders: { radius: number; positions: [[number, number, number], [number, number, number]] };
  hips: { radius: number; positions: [[number, number, number], [number, number, number]] };
}

interface ThreeDPreviewProps {
  bodySizeValue: number; // 0.0 = thin, 1.0 = heavy
  width?: number;
  height?: number;
}

// Two procedural geometry states
const THIN_STATE: BodyGeometry = {
  torso: { radiusTop: 0.35, radiusBottom: 0.3, height: 1.5 },
  head: { radius: 0.25, position: [0, 1.2, 0] },
  shoulders: {
    radius: 0.12,
    positions: [[-0.5, 0.7, 0], [0.5, 0.7, 0]]
  },
  hips: {
    radius: 0.12,
    positions: [[-0.2, -0.8, 0], [0.2, -0.8, 0]]
  }
};

const HEAVY_STATE: BodyGeometry = {
  torso: { radiusTop: 0.55, radiusBottom: 0.5, height: 1.5 },
  head: { radius: 0.28, position: [0, 1.25, 0] },
  shoulders: {
    radius: 0.16,
    positions: [[-0.65, 0.7, 0], [0.65, 0.7, 0]]
  },
  hips: {
    radius: 0.16,
    positions: [[-0.3, -0.8, 0], [0.3, -0.8, 0]]
  }
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpVector3(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  return [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t)
  ];
}

function CharacterBody({ bodySizeValue }: { bodySizeValue: number }) {
  const groupRef = useRef<THREE.Group>(null);

  // Interpolate geometry based on slider
  const interpolatedGeometry = useMemo(() => {
    const t = Math.max(0, Math.min(1, bodySizeValue)); // Clamp 0-1
    
    return {
      torso: {
        radiusTop: lerp(THIN_STATE.torso.radiusTop, HEAVY_STATE.torso.radiusTop, t),
        radiusBottom: lerp(THIN_STATE.torso.radiusBottom, HEAVY_STATE.torso.radiusBottom, t),
        height: lerp(THIN_STATE.torso.height, HEAVY_STATE.torso.height, t)
      },
      head: {
        radius: lerp(THIN_STATE.head.radius, HEAVY_STATE.head.radius, t),
        position: lerpVector3(THIN_STATE.head.position, HEAVY_STATE.head.position, t)
      },
      shoulders: {
        radius: lerp(THIN_STATE.shoulders.radius, HEAVY_STATE.shoulders.radius, t),
        positions: [
          lerpVector3(THIN_STATE.shoulders.positions[0], HEAVY_STATE.shoulders.positions[0], t),
          lerpVector3(THIN_STATE.shoulders.positions[1], HEAVY_STATE.shoulders.positions[1], t)
        ] as [[number, number, number], [number, number, number]]
      },
      hips: {
        radius: lerp(THIN_STATE.hips.radius, HEAVY_STATE.hips.radius, t),
        positions: [
          lerpVector3(THIN_STATE.hips.positions[0], HEAVY_STATE.hips.positions[0], t),
          lerpVector3(THIN_STATE.hips.positions[1], HEAVY_STATE.hips.positions[1], t)
        ] as [[number, number, number], [number, number, number]]
      }
    };
  }, [bodySizeValue]);

  // Gentle rotation for visual interest
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.003;
    }
  });

  const { torso, head, shoulders, hips } = interpolatedGeometry;

  return (
    <group ref={groupRef}>
      {/* Torso - capsule approximation with cylinder */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[torso.radiusTop, torso.radiusBottom, torso.height, 16]} />
        <meshStandardMaterial color="#e8d4c0" />
      </mesh>

      {/* Head */}
      <mesh position={head.position}>
        <sphereGeometry args={[head.radius, 16, 16]} />
        <meshStandardMaterial color="#f5e6d3" />
      </mesh>

      {/* Shoulders */}
      <mesh position={shoulders.positions[0]}>
        <sphereGeometry args={[shoulders.radius, 12, 12]} />
        <meshStandardMaterial color="#e8d4c0" />
      </mesh>
      <mesh position={shoulders.positions[1]}>
        <sphereGeometry args={[shoulders.radius, 12, 12]} />
        <meshStandardMaterial color="#e8d4c0" />
      </mesh>

      {/* Hips */}
      <mesh position={hips.positions[0]}>
        <sphereGeometry args={[hips.radius, 12, 12]} />
        <meshStandardMaterial color="#e8d4c0" />
      </mesh>
      <mesh position={hips.positions[1]}>
        <sphereGeometry args={[hips.radius, 12, 12]} />
        <meshStandardMaterial color="#e8d4c0" />
      </mesh>

      {/* Placeholder garment - simple box attached to torso */}
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[torso.radiusTop * 2 + 0.1, 0.8, 0.3]} />
        <meshStandardMaterial color="#4a5568" opacity={0.7} transparent />
      </mesh>
    </group>
  );
}

export function ThreeDPreview({ bodySizeValue, width = 300, height = 400 }: ThreeDPreviewProps) {
  return (
    <View style={[styles.container, { width, height }]}>
      <Canvas
        camera={{ position: [0, 0.5, 3], fov: 50 }}
        gl={{ preserveDrawingBuffer: true }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <directionalLight position={[-5, 3, -5]} intensity={0.4} />
        
        <CharacterBody bodySizeValue={bodySizeValue} />
        
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={2}
          maxDistance={5}
          maxPolarAngle={Math.PI / 1.8}
          minPolarAngle={Math.PI / 4}
        />
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden'
  }
});
