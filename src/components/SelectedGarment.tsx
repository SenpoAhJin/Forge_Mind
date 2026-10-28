/**
 * Selected Garment Component
 * 
 * Renders a 3D garment on the body model based on an owned inventory item.
 * Maps the item to a procedural GLB model and applies color tinting.
 * 
 * FEATURES:
 * - Automatic item-to-model mapping
 * - Color tinting from item's auto_categorized_color
 * - Suspense loading (doesn't block body rendering)
 * - Error boundary (failed loads don't crash app)
 * - Null handling (no model available = invisible)
 * 
 * USAGE:
 *   <SelectedGarment item={ownedItem} bodyType={bodyType} />
 */

import React, { Suspense, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { Asset } from 'expo-asset';
import type { OwnedAttire } from '../types/owned-attire';
import type { BodyType } from '../data/garmentCatalog';
import { mapItemToGarmentModel } from '../utils/itemToModelMapper';
import * as THREE from 'three';

interface SelectedGarmentProps {
  item: OwnedAttire;
  bodyType: BodyType;
}

/**
 * Resolves Metro asset module to URI
 * Same pattern as BodyModel.tsx with added safety checks
 */
function resolveAssetUri(assetModule: number | string): string {
  try {
    if (!assetModule) {
      console.error('[SelectedGarment] Asset module is undefined');
      throw new Error('Asset module is undefined');
    }
    
    const asset = Asset.fromModule(assetModule as number);
    
    if (!asset) {
      console.error('[SelectedGarment] Asset.fromModule returned undefined');
      throw new Error('Asset.fromModule failed');
    }
    
    const uri = asset.localUri ?? asset.uri;
    
    if (!uri) {
      console.error('[SelectedGarment] Asset has no URI');
      throw new Error('Asset has no URI');
    }
    
    console.log(`[SelectedGarment] ✅ Resolved asset URI: ${uri.substring(0, 50)}...`);
    return uri;
  } catch (error) {
    console.error('[SelectedGarment] ❌ Failed to resolve asset:', error);
    throw error;
  }
}

/**
 * Error Boundary for garment loading
 * Catches errors and prevents crash
 */
class GarmentErrorBoundary extends React.Component<
  { itemId: string; children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  
  static getDerivedStateFromError() {
    return { failed: true };
  }
  
  componentDidCatch(error: unknown) {
    console.error(
      `[SelectedGarment] Failed to load garment for item "${this.props.itemId}":`,
      error
    );
  }
  
  render() {
    if (this.state.failed) {
      console.warn(`[SelectedGarment] Garment failed to load, rendering nothing`);
      return null;
    }
    return this.props.children;
  }
}

/**
 * GarmentMesh Component
 * Loads the GLB and applies color tinting
 */
function GarmentMesh({ 
  assetModule, 
  colorHex, 
  modelName 
}: { 
  assetModule: number | string; 
  colorHex: string;
  modelName: string;
}) {
  const uri = useMemo(() => {
    try {
      const resolved = resolveAssetUri(assetModule);
      console.log(`[GarmentMesh] Using URI for ${modelName}:`, resolved);
      return resolved;
    } catch (error) {
      console.error(`[GarmentMesh] Failed to resolve URI for ${modelName}:`, error);
      return null;
    }
  }, [assetModule, modelName]);
  
  // If URI resolution failed, don't try to load
  if (!uri) {
    console.error(`[GarmentMesh] ❌ No URI available for ${modelName}`);
    return null;
  }
  
  // Load the GLTF
  // Note: useGLTF throws on load errors, which will be caught by ErrorBoundary
  const gltf = useGLTF(uri);
  
  // Validate that the GLTF loaded correctly
  if (!gltf || !gltf.scene) {
    console.error(`[GarmentMesh] ❌ GLTF scene is undefined for ${modelName}`);
    return null;
  }
  
  // Additional validation: check if scene has any children
  if (!gltf.scene.children || gltf.scene.children.length === 0) {
    console.warn(`[GarmentMesh] ⚠️ GLTF scene has no children for ${modelName} - possible placeholder file`);
    return null;
  }
  
  // Clone the scene to avoid mutating cached asset
  const scene = useMemo(() => {
    try {
      // Validate gltf.scene before cloning
      if (!gltf.scene) {
        console.error(`[GarmentMesh] ❌ Cannot clone undefined scene for ${modelName}`);
        return null;
      }
      
      const clonedScene = gltf.scene.clone();
      
      // Apply color tint to all meshes in the garment
      clonedScene.traverse((node: any) => {
        if (node.isMesh) {
          // Clone material to avoid affecting cached asset
          if (node.material) {
            const material = node.material.clone();
            material.color = new THREE.Color(colorHex);
            node.material = material;
          }
        }
      });
      
      console.log(`[GarmentMesh] ✅ Successfully prepared ${modelName} with color ${colorHex}`);
      return clonedScene;
    } catch (error) {
      console.error(`[GarmentMesh] ❌ Failed to clone/tint scene for ${modelName}:`, error);
      // Return null instead of original scene if cloning fails
      return null;
    }
  }, [gltf?.scene, colorHex, modelName]);
  
  // If scene cloning failed, don't render
  if (!scene) {
    console.error(`[GarmentMesh] ❌ Scene preparation failed for ${modelName}`);
    return null;
  }
  
  return <primitive object={scene} />;
}

/**
 * SelectedGarment Component
 * Main entry point
 */
export default function SelectedGarment({ item, bodyType }: SelectedGarmentProps) {
  // Debug logging
  console.log(`[SelectedGarment] Processing item:`, {
    text: item.original_input_text,
    type: item.auto_categorized_type,
    color: item.auto_categorized_color,
    attire_id: item.attire_id,
  });
  
  // Map item to garment model
  const garmentModel = useMemo(
    () => {
      const model = mapItemToGarmentModel(item, bodyType);
      console.log(`[SelectedGarment] Mapping result:`, model ? {
        modelName: model.modelName,
        colorHex: model.colorHex,
        slot: model.slot,
      } : 'NULL (no model found)');
      return model;
    },
    [item, bodyType]
  );
  
  // No model available
  if (!garmentModel) {
    console.warn(
      `[SelectedGarment] ❌ No 3D model available for: "${item.original_input_text}" (type: ${item.auto_categorized_type})`
    );
    return null;
  }
  
  console.log(`[SelectedGarment] ✅ Rendering ${garmentModel.modelName}`);
  
  
  // Render the garment
  return (
    <GarmentErrorBoundary itemId={item.attire_id}>
      <Suspense fallback={null}>
        <GarmentMesh
          assetModule={garmentModel.assetModule}
          colorHex={garmentModel.colorHex}
          modelName={garmentModel.modelName}
        />
      </Suspense>
    </GarmentErrorBoundary>
  );
}
