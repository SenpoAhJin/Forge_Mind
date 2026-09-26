import React, { useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Box, Sphere, Cylinder } from '@react-three/drei';

/**
 * Preview3D Component
 * 
 * Proof-of-concept 3D renderer using react-three-fiber (no Unity required).
 * 
 * What this proves:
 * - 3D rendering works in Expo Go without native code
 * - Same code works on web, iOS, Android
 * - Interactive camera controls (orbit/zoom)
 * - Can animate and morph 3D objects
 * 
 * Next steps:
 * - Replace primitives with GLTF body mesh
 * - Add body morphing slider (scale/morph targets)
 * - Load garment meshes dynamically
 * - Implement garment layering
 */

interface RotatingBoxProps {
  position: [number, number, number];
  scale?: number;
  color: string;
}

/**
 * Simple rotating box to prove rendering + animation works
 */
function RotatingBox({ position, scale = 1, color }: RotatingBoxProps) {
  const meshRef = useRef<any>(null);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.5;
      meshRef.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <Box ref={meshRef} position={position} scale={scale} args={[1, 1, 1]}>
      <meshStandardMaterial color={color} />
    </Box>
  );
}

/**
 * Simple body-like shape to prove concept
 * (This will be replaced with actual body mesh from Blender)
 */
function SimpleBody({ morphFactor }: { morphFactor: number }) {
  // morphFactor: 0.0 = slim, 1.0 = plus-size
  const bodyScale = 1 + (morphFactor * 0.5); // Scale body based on slider
  
  return (
    <group>
      {/* Head */}
      <Sphere position={[0, 1.5, 0]} scale={0.3}>
        <meshStandardMaterial color="#ffdbac" />
      </Sphere>
      
      {/* Torso */}
      <Cylinder 
        position={[0, 0.5, 0]} 
        scale={[bodyScale * 0.4, 0.8, bodyScale * 0.3]}
        args={[1, 1, 1, 32]}
      >
        <meshStandardMaterial color="#4a90e2" />
      </Cylinder>
      
      {/* Legs (left) */}
      <Cylinder 
        position={[-0.2 * bodyScale, -0.5, 0]} 
        scale={[0.15 * bodyScale, 0.6, 0.15 * bodyScale]}
        args={[1, 1, 1, 32]}
      >
        <meshStandardMaterial color="#2c3e50" />
      </Cylinder>
      
      {/* Legs (right) */}
      <Cylinder 
        position={[0.2 * bodyScale, -0.5, 0]} 
        scale={[0.15 * bodyScale, 0.6, 0.15 * bodyScale]}
        args={[1, 1, 1, 32]}
      >
        <meshStandardMaterial color="#2c3e50" />
      </Cylinder>
      
      {/* Arms (left) */}
      <Cylinder 
        position={[-0.5 * bodyScale, 0.5, 0]} 
        scale={[0.1, 0.6, 0.1]}
        rotation={[0, 0, Math.PI / 6]}
        args={[1, 1, 1, 32]}
      >
        <meshStandardMaterial color="#ffdbac" />
      </Cylinder>
      
      {/* Arms (right) */}
      <Cylinder 
        position={[0.5 * bodyScale, 0.5, 0]} 
        scale={[0.1, 0.6, 0.1]}
        rotation={[0, 0, -Math.PI / 6]}
        args={[1, 1, 1, 32]}
      >
        <meshStandardMaterial color="#ffdbac" />
      </Cylinder>
    </group>
  );
}

interface Preview3DProps {
  morphFactor?: number; // 0.0 to 1.0, body size slider
  showTestCubes?: boolean; // For initial testing
}

export default function Preview3D({ 
  morphFactor = 0.5,
  showTestCubes = false 
}: Preview3DProps) {
  return (
    <View style={styles.container}>
      <Canvas
        camera={{ position: [0, 1, 5], fov: 50 }}
        style={styles.canvas}
      >
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <pointLight position={[-10, -10, -5]} intensity={0.5} />
        
        {/* Camera controls (orbit, zoom, pan) */}
        <OrbitControls 
          enableDamping
          dampingFactor={0.05}
          minDistance={2}
          maxDistance={10}
        />
        
        {/* Test mode: show rotating cubes */}
        {showTestCubes && (
          <>
            <RotatingBox position={[-1.5, 0, 0]} color="#e74c3c" />
            <RotatingBox position={[0, 0, 0]} scale={1.5} color="#3498db" />
            <RotatingBox position={[1.5, 0, 0]} color="#2ecc71" />
          </>
        )}
        
        {/* Body preview mode */}
        {!showTestCubes && (
          <SimpleBody morphFactor={morphFactor} />
        )}
        
        {/* Ground plane (for reference) */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]}>
          <planeGeometry args={[10, 10]} />
          <meshStandardMaterial color="#95a5a6" opacity={0.3} transparent />
        </mesh>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ecf0f1',
  },
  canvas: {
    flex: 1,
  },
});
