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
  type PieceDefinition,
  type CostumePiecesData,
} from '../utils/costumeBuilder';

// Import the pieces data
const costumePiecesData: CostumePiecesData = require('../data/costumePieces.json');

interface V2CostumeDemoProps {
  bodyType: BaseBodySelection;
  enabledPieces: Set<string>;
  pieceColors: Map<string, string>;
}

/**
 * Renders costume pieces on the V2 body.
 * Builds pieces on mount and when bodyType or enabledPieces change.
 */
export default function V2CostumeDemo({
  bodyType,
  enabledPieces,
  pieceColors,
}: V2CostumeDemoProps) {
  const bodyAsset = getActiveBodyAsset(bodyType);
  const gltf = useGLTF(bodyAsset.glb as any) as any;
  const contract = bodyAsset.contract;

  const scene = useThree((state) => state.scene);
  const pieceMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());

  // Find body scene root
  const bodyScene = useMemo(() => {
    return gltf?.scene?.clone(true) || new THREE.Scene();
  }, [gltf]);

  useEffect(() => {
    if (!contract) {
      console.warn('[V2CostumeDemo] No contract found for body');
      return;
    }

    // Clean up old pieces
    pieceMeshesRef.current.forEach((mesh) => {
      bodyScene.remove(mesh);
    });
    pieceMeshesRef.current.clear();

    // Build enabled pieces
    for (const pieceDef of costumePiecesData.pieces) {
      if (enabledPieces.has(pieceDef.id)) {
        try {
          const color = pieceColors.get(pieceDef.id);
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
        }
      }
    }

    // Add body scene to main scene
    scene.add(bodyScene);

    return () => {
      scene.remove(bodyScene);
      disposeCachedPieces(bodyScene);
    };
  }, [bodyType, enabledPieces, pieceColors, contract, bodyScene, scene]);

  // Update colors without rebuilding geometry
  useEffect(() => {
    pieceColors.forEach((color, pieceId) => {
      if (enabledPieces.has(pieceId)) {
        setPieceColor(bodyScene, pieceId, color);
      }
    });
  }, [pieceColors, enabledPieces, bodyScene]);

  return null; // No JSX, renders directly to three.js scene
}
