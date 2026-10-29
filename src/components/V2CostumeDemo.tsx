/**
 * V2 Costume Demo Component
 *
 * Renders runtime-derived costume pieces on V2 bodies.
 * Pieces are built from the body mesh at runtime (no asset pipeline).
 *
 * COSTUME-1: Visible result first.
 */

import React, { useEffect, useRef, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { getActiveBodyAsset } from '../config/bodyAssets';
import { BaseBodySelection } from '../constants/bodyType';
import {
  buildCostumePiece,
  setPieceColor,
  disposeCachedPieces,
  computePieceDebugInfo,
  type PieceDefinition,
  type CostumePiecesData,
  type PieceDebugInfo,
} from '../utils/costumeBuilder';

// Import the pieces data
const costumePiecesData: CostumePiecesData = require('../data/costumePieces.json');

interface V2CostumeDemoProps {
  bodyType: BaseBodySelection;
  enabledPieces: Set<string>;
  pieceColors: Map<string, string>;
  debugMode?: boolean;
  onDebugInfo?: (info: Map<string, PieceDebugInfo>) => void;
}

/**
 * Renders costume pieces on the V2 body.
 * Builds pieces on mount and when bodyType or enabledPieces change.
 */
const DEBUG_COLORS = [
  '#FF0000', // red - top
  '#00FF00', // green - bottom
  '#0000FF', // blue - shoes
  '#FFFF00', // yellow - gloves
  '#FF00FF', // magenta - wig
  '#00FFFF', // cyan - belt
];

export default function V2CostumeDemo({
  bodyType,
  enabledPieces,
  pieceColors,
  debugMode = false,
  onDebugInfo,
}: V2CostumeDemoProps) {
  const bodyAsset = getActiveBodyAsset(bodyType);
  const gltf = useGLTF(bodyAsset.glb as any) as any;
  const contract = bodyAsset.contract;

  const scene = useThree((state) => state.scene);
  const pieceMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const debugPointsRef = useRef<Map<string, THREE.Points>>(new Map());

  // Find body scene root
  const bodyScene = useMemo(() => {
    return gltf?.scene?.clone(true) || new THREE.Scene();
  }, [gltf]);

  useEffect(() => {
    if (!contract) {
      console.warn('[V2CostumeDemo] No contract found for body');
      return;
    }

    // Clean up old pieces and debug points
    pieceMeshesRef.current.forEach((mesh) => {
      bodyScene.remove(mesh);
    });
    pieceMeshesRef.current.clear();
    
    debugPointsRef.current.forEach((points) => {
      bodyScene.remove(points);
      points.geometry.dispose();
      if (Array.isArray(points.material)) {
        points.material.forEach(m => m.dispose());
      } else {
        points.material.dispose();
      }
    });
    debugPointsRef.current.clear();

    // Collect debug info
    const debugInfo = new Map<string, PieceDebugInfo>();

    // Build enabled pieces
    for (let pieceIdx = 0; pieceIdx < costumePiecesData.pieces.length; pieceIdx++) {
      const pieceDef = costumePiecesData.pieces[pieceIdx];
      
      if (enabledPieces.has(pieceDef.id)) {
        try {
          // Compute debug info before building
          const info = computePieceDebugInfo(bodyScene, contract, pieceDef, costumePiecesData);
          if (info) {
            debugInfo.set(pieceDef.id, info);
            
            // In debug mode, render missing vertices as red points (top and wig only)
            if (debugMode && (pieceDef.id === 'top' || pieceDef.id === 'wig') && info.missingVertexPositions && info.missingVertexPositions.length > 0) {
              const pointsGeometry = new THREE.BufferGeometry();
              pointsGeometry.setAttribute('position', new THREE.BufferAttribute(info.missingVertexPositions, 3));
              
              const pointsMaterial = new THREE.PointsMaterial({
                color: 0xff0000,
                size: 0.005,
                sizeAttenuation: true,
              });
              
              const points = new THREE.Points(pointsGeometry, pointsMaterial);
              bodyScene.add(points);
              debugPointsRef.current.set(`${pieceDef.id}-missing`, points);
              
              // Log missing vertex details
              console.log(`[${pieceDef.id}] Missing ${info.missingVertexPositions.length / 3} vertices:`);
              if (info.missingVertexInfo && info.missingVertexInfo.length <= 20) {
                // Log details for first 20 missing vertices
                const sampleCount = Math.min(20, info.missingVertexInfo.length);
                for (let i = 0; i < sampleCount; i++) {
                  const v = info.missingVertexInfo[i];
                  console.log(`  v${v.index}: bone=${v.dominantBone}, reason=${v.reason}`);
                }
                if (info.missingVertexInfo.length > 20) {
                  console.log(`  ... and ${info.missingVertexInfo.length - 20} more`);
                }
              } else if (info.missingVertexInfo) {
                // Summarize by reason
                const reasonCounts = new Map<string, number>();
                for (const v of info.missingVertexInfo) {
                  const key = v.reason.includes('y-band') ? 'y-band' : v.reason.includes('weight') ? 'weight' : 'clip/2-of-3';
                  reasonCounts.set(key, (reasonCounts.get(key) || 0) + 1);
                }
                console.log(`  Summary by reason:`);
                reasonCounts.forEach((count, reason) => {
                  console.log(`    ${reason}: ${count} vertices`);
                });
              }
            }
          }

          // Use debug color or user color
          const color = debugMode ? DEBUG_COLORS[pieceIdx % DEBUG_COLORS.length] : pieceColors.get(pieceDef.id);
          
          const mesh = buildCostumePiece(
            bodyScene,
            contract,
            pieceDef,
            costumePiecesData,
            color
          );
          
          // Add to body scene (same transform as body)
          bodyScene.add(mesh);
          pieceMeshesRef.current.set(pieceDef.id, mesh);
        } catch (error) {
          console.error(`[V2CostumeDemo] Failed to build piece ${pieceDef.id}:`, error);
          // Still collect debug info on failure
          const info = computePieceDebugInfo(bodyScene, contract, pieceDef, costumePiecesData);
          if (info) {
            debugInfo.set(pieceDef.id, { ...info, triangleCount: 0 });
          }
        }
      }
    }

    // Report debug info
    if (onDebugInfo && debugInfo.size > 0) {
      onDebugInfo(debugInfo);
    }

    // Add body scene to main scene
    scene.add(bodyScene);

    return () => {
      scene.remove(bodyScene);
      disposeCachedPieces(bodyScene);
      
      // Clean up debug points
      debugPointsRef.current.forEach((points) => {
        points.geometry.dispose();
        if (Array.isArray(points.material)) {
          points.material.forEach(m => m.dispose());
        } else {
          points.material.dispose();
        }
      });
      debugPointsRef.current.clear();
    };
  }, [bodyType, enabledPieces, pieceColors, debugMode, contract, bodyScene, scene, onDebugInfo]);

  // Update colors without rebuilding geometry (skip in debug mode)
  useEffect(() => {
    if (!debugMode) {
      pieceColors.forEach((color, pieceId) => {
        if (enabledPieces.has(pieceId)) {
          setPieceColor(bodyScene, pieceId, color);
        }
      });
    }
  }, [pieceColors, enabledPieces, bodyScene, debugMode]);

  return null; // No JSX, renders directly to three.js scene
}
