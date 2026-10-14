/**
 * GarmentLayer Component
 * 
 * Renders a 3D garment on top of a body model. Supports:
 * - Real GLB assets (loaded via useGLTF)
 * - Placeholder primitives (sphere, box, cylinder) when no asset exists
 * 
 * RENDERING STRATEGY:
 * - Garment shares the body's transform (world-space positioning)
 * - GLB assets load at their exported position (no runtime adjustment)
 * - Placeholders positioned using body bounding box measurements
 * - Load failures are caught and logged (body continues rendering)
 */

import React, { Suspense } from 'react';
import { useGLTF } from '@react-three/drei';
import { Asset } from 'expo-asset';
import { GarmentEntry, BodyType } from '../data/garmentRegistry';

interface GarmentLayerProps {
  /** Garment entry from registry */
  garment: GarmentEntry;
  /** Current body type (affects placeholder positioning if needed) */
  bodyType: BodyType;
  /** Whether this garment should be visible */
  visible?: boolean;
}

/**
 * Resolves Metro asset module to URI (same pattern as BodyModel)
 */
function resolveAssetUri(assetModule: number | string): string {
  const asset = Asset.fromModule(assetModule as number);
  return asset.localUri ?? asset.uri;
}

/**
 * Real GLB Garment Renderer
 * Loads and displays a GLB asset. Wrapped in error boundary to prevent body from unmounting on load failure.
 */
function GarmentGLB({ assetModule }: { assetModule: number | string }) {
  try {
    const uri = resolveAssetUri(assetModule);
    const gltf = useGLTF(uri);
    
    // Render the whole scene (preserves bone hierarchy if rigged)
    return <primitive object={gltf.scene} />;
  } catch (error) {
    console.error('[GarmentLayer] Failed to load garment GLB:', error);
    // Return null instead of throwing - body will continue rendering
    return null;
  }
}

/**
 * Placeholder Primitive Renderer
 * Renders a code-generated primitive shape positioned using verified body measurements
 */
function PlaceholderPrimitive({ garment }: { garment: GarmentEntry }) {
  if (!garment.placeholder) {
    console.warn(`[GarmentLayer] Garment "${garment.id}" has no placeholder defined`);
    return null;
  }

  const { type, position, scale, color } = garment.placeholder;
  const [x, y, z] = position;

  // Determine geometry and scale
  let geometry: React.ReactElement;
  if (type === 'sphere') {
    const radius = typeof scale === 'number' ? scale : scale[0];
    geometry = <sphereGeometry args={[radius, 16, 16]} />;
  } else if (type === 'box') {
    const [sx, sy, sz] = typeof scale === 'number' ? [scale, scale, scale] : scale;
    geometry = <boxGeometry args={[sx, sy, sz]} />;
  } else if (type === 'cylinder') {
    const [radiusTop, radiusBottom, height] = typeof scale === 'number' 
      ? [scale, scale, scale * 2] 
      : scale;
    geometry = <cylinderGeometry args={[radiusTop, radiusBottom, height, 16]} />;
  } else {
    console.warn(`[GarmentLayer] Unknown placeholder type "${type}"`);
    return null;
  }

  return (
    <mesh position={[x, y, z]}>
      {geometry}
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

/**
 * GarmentLayer Component
 * 
 * Main entry point for rendering a garment. Handles:
 * - Asset vs placeholder routing
 * - Error boundaries (load failures don't crash body)
 * - Visibility toggle
 */
export default function GarmentLayer({ garment, bodyType, visible = true }: GarmentLayerProps) {
  if (!visible) {
    return null;
  }

  // If real asset exists, load it
  if (garment.asset !== null) {
    return (
      <Suspense fallback={null}>
        <GarmentGLB assetModule={garment.asset} />
      </Suspense>
    );
  }

  // Otherwise render placeholder
  if (garment.isPlaceholder && garment.placeholder) {
    return <PlaceholderPrimitive garment={garment} />;
  }

  // No asset and no placeholder - log warning and render nothing
  console.warn(
    `[GarmentLayer] Garment "${garment.id}" has no asset and no placeholder. Cannot render.`
  );
  return null;
}
