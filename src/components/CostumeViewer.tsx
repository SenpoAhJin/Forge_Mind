/**
 * CostumeViewer Component
 *
 * Shared 3D viewer for costume pieces on V2 bodies.
 * Presentation-only component - outfit state management stays in calling screens.
 *
 * COSTUME-2 Step 5: One shared viewer for all consumers.
 */

import React, { useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense } from 'react';
import V2CostumeDemo from './V2CostumeDemo';
import { BaseBodySelection } from '../constants/bodyType';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

// Camera positions
const CAMERA_POSITIONS = {
  front: [0, 0.95, 3.5] as [number, number, number],
  side: [3.5, 0.95, 0] as [number, number, number],
  back: [0, 0.95, -3.5] as [number, number, number],
};

// Body bounds for camera fitting
const BODY_BOUNDS = {
  yMin: 0,
  yMax: 1.8,
  width: 0.8,
};

// Calculate camera distance to fit body with margin
const fitCameraDistance = () => {
  const bodyHeight = BODY_BOUNDS.yMax - BODY_BOUNDS.yMin;
  const bodyWidth = BODY_BOUNDS.width;
  const fov = 50;
  const margin = 1.3; // 30% margin
  const aspect = 1; // Assume roughly square viewport
  
  const vFov = (fov * Math.PI) / 180;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
  
  const distanceV = (bodyHeight / 2) / Math.tan(vFov / 2);
  const distanceH = (bodyWidth / 2) / Math.tan(hFov / 2);
  
  return Math.max(distanceV, distanceH) * margin;
};

const CAMERA_DISTANCE = fitCameraDistance();

export interface CostumeViewerProps {
  bodyType: BaseBodySelection;
  enabledPieces: Set<string>;
  pieceColors: Map<string, string>;
  pieceStyles?: Map<string, Record<string, string>>;
  debugMode?: boolean;
  showCameraControls?: boolean;
  onDebugInfo?: (info: Map<string, any>) => void;
}

/**
 * CostumeViewer
 * 
 * Renders V2 body with costume pieces in a 3D canvas.
 * Provides camera controls and handles body type switching cleanly.
 */
export default function CostumeViewer({
  bodyType,
  enabledPieces,
  pieceColors,
  pieceStyles = new Map(),
  debugMode = false,
  showCameraControls = true,
  onDebugInfo,
}: CostumeViewerProps) {
  const orbitControlsRef = useRef<OrbitControlsImpl>(null);
  const [cameraPosition, setCameraPosition] = useState<'front' | 'side' | 'back'>('front');

  const handleCameraPositionChange = (position: 'front' | 'side' | 'back') => {
    setCameraPosition(position);
    
    // Update OrbitControls target and camera position
    if (orbitControlsRef.current) {
      const controls = orbitControlsRef.current;
      const targetY = (BODY_BOUNDS.yMin + BODY_BOUNDS.yMax) / 2;
      const newCameraPos = CAMERA_POSITIONS[position];
      
      // Set new camera position
      controls.object.position.set(newCameraPos[0], newCameraPos[1], newCameraPos[2]);
      controls.target.set(0, targetY, 0);
      controls.update();
    }
  };

  return (
    <View style={styles.container}>
      {/* 3D Canvas */}
      <View style={styles.canvasContainer}>
        <Canvas
          camera={{ 
            position: CAMERA_POSITIONS[cameraPosition], 
            fov: 50 
          }}
          style={{ width: '100%', height: '100%' }}
          gl={{
            preserveDrawingBuffer: true,
            antialias: true,
            alpha: false,
          }}
        >
          <ambientLight intensity={1.0} />
          <directionalLight position={[0, 5, 10]} intensity={2.0} />
          <directionalLight position={[0, 5, -10]} intensity={1.5} />
          <directionalLight position={[10, 3, 0]} intensity={0.8} />
          
          <OrbitControls
            ref={orbitControlsRef}
            target={[0, (BODY_BOUNDS.yMin + BODY_BOUNDS.yMax) / 2, 0]}
            enableDamping
            dampingFactor={0.25}
            minDistance={2.0}
            maxDistance={6.0}
          />

          <Suspense fallback={null}>
            <V2CostumeDemo
              bodyType={bodyType}
              enabledPieces={enabledPieces}
              pieceColors={pieceColors}
              pieceStyles={pieceStyles}
              debugMode={debugMode}
              onDebugInfo={onDebugInfo}
            />
          </Suspense>

          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            <planeGeometry args={[10, 10]} />
            <meshStandardMaterial color="#95a5a6" opacity={0.3} transparent />
          </mesh>
        </Canvas>
      </View>

      {/* Camera Controls */}
      {showCameraControls && (
        <View style={styles.cameraControls}>
          <TouchableOpacity
            style={[
              styles.cameraButton,
              cameraPosition === 'front' && styles.cameraButtonActive,
            ]}
            onPress={() => handleCameraPositionChange('front')}
          >
            <Text
              style={[
                styles.cameraButtonText,
                cameraPosition === 'front' && styles.cameraButtonTextActive,
              ]}
            >
              Front
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.cameraButton,
              cameraPosition === 'side' && styles.cameraButtonActive,
            ]}
            onPress={() => handleCameraPositionChange('side')}
          >
            <Text
              style={[
                styles.cameraButtonText,
                cameraPosition === 'side' && styles.cameraButtonTextActive,
              ]}
            >
              Side
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.cameraButton,
              cameraPosition === 'back' && styles.cameraButtonActive,
            ]}
            onPress={() => handleCameraPositionChange('back')}
          >
            <Text
              style={[
                styles.cameraButtonText,
                cameraPosition === 'back' && styles.cameraButtonTextActive,
              ]}
            >
              Back
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  canvasContainer: {
    flex: 1,
    backgroundColor: '#ecf0f1',
  },
  cameraControls: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  cameraButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d0d0d0',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  cameraButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  cameraButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  cameraButtonTextActive: {
    color: '#fff',
  },
});
