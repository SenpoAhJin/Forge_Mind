/**
 * TintableGarment Component
 * 
 * Renders a 3D garment with color tinting applied to designated regions.
 * Enables reusing one garment mesh for multiple color variations.
 * 
 * APPROACH:
 * - Load GLB asset using useGLTF
 * - Clone the scene to avoid modifying cached copy
 * - Find materials by name and apply tint color
 * - Use Three.js MeshStandardMaterial.color property
 * 
 * LIMITATIONS:
 * - Simple color replacement (no texture blending yet)
 * - Assumes materials use MeshStandardMaterial
 * - Tinting multiplies with base color (works best with white/gray base)
 */

import React, { useMemo } from 'react';
import { useGLTF } from './threeRuntime';
import { Asset } from 'expo-asset';
import * as THREE from 'three';
import type { TintableRegion } from '../data/garmentCatalog';

interface TintableGarmentProps {
  /** Asset module (static import) */
  assetModule: string | number;
  /** Regions to tint with target colors */
  tintRegions?: Array<{ regionName: string; targetColor: string }>;
  /** All tintable region definitions from catalog */
  regionDefinitions?: TintableRegion[];
}

/**
 * Resolve Metro asset module to URI
 */
function resolveAssetUri(assetModule: number | string): string {
  const asset = Asset.fromModule(assetModule as number);
  return asset.localUri ?? asset.uri;
}

/**
 * Apply color tinting to a material.
 * Multiplies the material's base color with the tint color.
 */
function applyTintToMaterial(material: THREE.Material, tintColorHex: string): void {
  if (material instanceof THREE.MeshStandardMaterial) {
    const tintColor = new THREE.Color(tintColorHex);
    material.color = tintColor;
    material.needsUpdate = true;
  }
}

/**
 * Recursively find and tint materials in a scene.
 */
function tintSceneMaterials(
  scene: THREE.Object3D,
  regionDefinitions: TintableRegion[],
  tintRegions: Array<{ regionName: string; targetColor: string }>
): void {
  // Build map of material names to target colors
  const tintMap = new Map<string, string>();
  
  for (const tint of tintRegions) {
    const regionDef = regionDefinitions.find(r => r.name === tint.regionName);
    if (regionDef) {
      tintMap.set(regionDef.materialName, tint.targetColor);
    }
  }
  
  // Traverse scene and apply tints
  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      const material = obj.material;
      
      if (Array.isArray(material)) {
        // Multi-material mesh
        for (const mat of material) {
          if (mat.name && tintMap.has(mat.name)) {
            applyTintToMaterial(mat, tintMap.get(mat.name)!);
          }
        }
      } else {
        // Single material
        if (material.name && tintMap.has(material.name)) {
          applyTintToMaterial(material, tintMap.get(material.name)!);
        }
      }
    }
  });
}

/**
 * TintableGarment Component
 * 
 * Loads a GLB asset and applies color tinting to designated regions.
 */
export default function TintableGarment({ 
  assetModule, 
  tintRegions = [], 
  regionDefinitions = [] 
}: TintableGarmentProps) {
  const uri = resolveAssetUri(assetModule);
  const gltf = useGLTF(uri);
  
  // Clone scene and apply tinting
  const scene = useMemo(() => {
    const clonedScene = gltf.scene.clone(true);
    
    // Apply tinting if regions specified
    if (tintRegions.length > 0 && regionDefinitions.length > 0) {
      tintSceneMaterials(clonedScene, regionDefinitions, tintRegions);
    }
    
    return clonedScene;
  }, [gltf.scene, tintRegions, regionDefinitions]);
  
  return <primitive object={scene} />;
}

/**
 * Simple wrapper for non-tintable garments (backwards compatibility).
 * Just loads and displays the GLB without any tinting.
 */
export function SimpleGarment({ assetModule }: { assetModule: string | number }) {
  const uri = resolveAssetUri(assetModule);
  const gltf = useGLTF(uri);
  
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  
  return <primitive object={scene} />;
}
