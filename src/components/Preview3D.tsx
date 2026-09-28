import React, { Suspense, useRef, ErrorInfo, Component } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Box } from '@react-three/drei';
import BodyModel from './BodyModel';
import { BaseBodySelection, DEFAULT_BASE_BODY } from '../constants/bodyType';

/**
 * Error Boundary for 3D Canvas
 * Catches rendering errors and displays fallback UI
 */
class Canvas3DErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('3D Canvas Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>3D Preview Error</Text>
          <Text style={styles.errorDetails}>
            {this.state.error?.message || 'Failed to load 3D preview'}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

/**
 * Preview3D Component
 *
 * 3D renderer using react-three-fiber (no Unity required).
 *
 * What this proves:
 * - 3D rendering works in Expo Go without native code
 * - Same code works on web, iOS, Android
 * - Interactive camera controls (orbit/zoom)
 * - The real Blender base bodies load and render from assets/models/*.glb
 *
 * Two mutually exclusive modes, both reachable from Preview3DTestScreen:
 * - body mode (default): the real base body, at the proportions authored in Blender
 * - test-cubes mode: rotating primitives, kept as a fallback for isolating
 *   renderer/controls problems from asset problems
 *
 * Body-size morphing is not a feature: runtime bone scaling was cancelled and the
 * `morphFactor` / `showBoneDebug` props no longer exist. See CHANGELOG_V2.md.
 *
 * Next steps:
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

interface Preview3DProps {
  bodyType?: BaseBodySelection; // Which base body to render in body mode
  showTestCubes?: boolean; // Falls back to the animated-primitives test mode
}

export default function Preview3D({
  bodyType = DEFAULT_BASE_BODY,
  showTestCubes = false
}: Preview3DProps) {
  return (
    <Canvas3DErrorBoundary>
      <View style={styles.container}>
        <Canvas
          // The real bodies are ~1.89 m tall and sit centred on the origin
          // (feet at y ~= -0.95), so the camera is pulled in from the old
          // placeholder framing of [0, 1, 5]. The ground plane below still lines
          // up with the feet at y = -1.2.
          camera={{ position: [0, 0.2, 4], fov: 50 }}
          style={styles.canvas}
          gl={{
            // Expo GL compatibility settings
            preserveDrawingBuffer: true,
            antialias: true,
            alpha: false,
          }}
        >
          {/* Lighting - Enhanced for full visibility from all angles
              Problem: Model was rendering as near-black silhouette with unreadable back side
              Solution: Stronger ambient + multiple directional lights + hemisphere for fill

              - Ambient: Base fill so nothing is pure black (intensity boosted to 1.0)
              - Hemisphere: Sky/ground gradient fill for natural ambient bounce
              - Directional (Key): Strong main light from front (intensity 2.0)
              - Directional (Back): Light from behind to illuminate back side (intensity 1.5)
              - Directional (Side): Fill light from side to soften shadows (intensity 0.8)
          */}
          <ambientLight intensity={1.0} />
          <hemisphereLight
            args={['#ffffff', '#444444', 0.6]}
            position={[0, 50, 0]}
          />
          <directionalLight
            position={[0, 5, 10]}
            intensity={2.0}
            castShadow={false}
          />
          <directionalLight
            position={[0, 5, -10]}
            intensity={1.5}
            castShadow={false}
          />
          <directionalLight
            position={[10, 3, 0]}
            intensity={0.8}
            castShadow={false}
          />

          {/* Camera controls - OrbitControls is the ONE and ONLY camera control
              mechanism in this scene. No custom controller, no touches override:
              three.js' own defaults are correct (ONE = ROTATE, TWO = DOLLY_PAN).
              - Drag to rotate around model
              - Pinch to zoom
              - minDistance/maxDistance keep model always visible
          */}
          <OrbitControls
            enableDamping
            dampingFactor={0.25}
            minDistance={2.0}
            maxDistance={6.0}
            enablePan={true}
            enableRotate={true}
            enableZoom={true}
          />

          {/* Test mode: show rotating cubes */}
          {showTestCubes && (
            <>
              <RotatingBox position={[-1.5, 0, 0]} color="#e74c3c" />
              <RotatingBox position={[0, 0, 0]} scale={1.5} color="#3498db" />
              <RotatingBox position={[1.5, 0, 0]} color="#2ecc71" />
            </>
          )}

          {/* Body preview mode: the real Blender base body, unmodified.
              useGLTF suspends while the .glb loads. */}
          {!showTestCubes && (
            <Suspense fallback={null}>
              <BodyModel bodyType={bodyType} />
            </Suspense>
          )}

          {/* Ground plane (for reference) */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]}>
            <planeGeometry args={[10, 10]} />
            <meshStandardMaterial color="#95a5a6" opacity={0.3} transparent />
          </mesh>
        </Canvas>
      </View>
    </Canvas3DErrorBoundary>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ecf0f1',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 8,
  },
  errorDetails: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
  },
});
