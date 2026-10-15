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
import type { WornGarment } from '../utils/wearing';
import { getHeadTopY, getTorsoMidY } from '../data/bodyBounds';

interface GarmentLayerProps {
  /** Garment entry from registry (for static test mode) */
  garment?: GarmentEntry;
  /** Runtime garment descriptor (for dynamic wearing mode) */
  runtimeGarment?: WornGarment;
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
 * Runtime Garment Renderer
 * Renders placeholder shapes for worn garments (no registry entry)
 */
function RuntimeGarmentPrimitive({ garment, bodyType }: { garment: WornGarment; bodyType: BodyType }) {
  const { shape, colorHex, slot } = garment;
  
  // PLACEHOLDER SHAPES positioned from bodyBounds (docs/GARMENT_SPEC.md)
  // Body Y ranges: male -0.950 to 0.931, female -0.951 to 0.944
  let geometry: React.ReactElement;
  let position: [number, number, number];
  
  switch (shape.type) {
    case 'cap':
      // Head: cap sitting on head top (Y ≈ 0.65 to 0.94)
      const headTop = getHeadTopY(bodyType);
      geometry = <sphereGeometry args={[shape.radius, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />;
      position = [0, headTop - shape.radius * 0.3, 0]; // Sit slightly below head top
      break;
      
    case 'tube':
      // Torso/Legs: tubes around body
      if (slot === 'torso') {
        // Torso band (Y ≈ 0.10 to 0.60)
        const torsoMid = getTorsoMidY(bodyType);
        geometry = <cylinderGeometry args={[shape.radius, shape.radius, shape.height, 16]} />;
        position = [0, torsoMid, 0];
      } else {
        // Legs (Y ≈ -0.50 to 0.10)
        geometry = <cylinderGeometry args={[shape.radius, shape.radius, shape.height, 16]} />;
        position = [0, -0.20, 0]; // Mid-legs
      }
      break;
      
    case 'block':
      // Prop: small block
      geometry = <boxGeometry args={[shape.width, shape.height, shape.depth]} />;
      position = slot === 'prop' ? [0.25, 0, 0] : [0, 0.15, 0]; // Hip for prop, wrist for hands
      break;
      
    default:
      console.warn(`[GarmentLayer] Unknown runtime shape type`);
      return null;
  }
  
  return (
    <mesh position={position}>
      {geometry}
      <meshStandardMaterial color={colorHex} />
    </mesh>
  );
}
/**
 * Placeholder Primitive Renderer (for registry entries)
 * Renders a code-generated primitive shape positioned using verified body measurements
 */
function PlaceholderPrimitive({ garment, bodyType }: { garment: GarmentEntry; bodyType: BodyType }) {
  if (!garment.placeholder) {
    console.warn(`[GarmentLayer] Garment "${garment.id}" has no placeholder defined`);
    return null;
  }

  const { type, position, scale, color } = garment.placeholder;
  
  // Resolve position (may be static array or function of bodyType)
  const [x, y, z] = typeof position === 'function' ? position(bodyType) : position;

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
 * - Registry entry (static test mode with toggles)
 * - Runtime descriptor (dynamic wearing mode from matcher)
 * - Asset vs placeholder routing
 * - Error boundaries (load failures don't crash body)
 * - Visibility toggle
 */
export default function GarmentLayer({ garment, runtimeGarment, bodyType, visible = true }: GarmentLayerProps) {
  if (!visible) {
    return null;
  }

  // Runtime garment mode (from worn garments array)
  if (runtimeGarment) {
    return <RuntimeGarmentPrimitive garment={runtimeGarment} bodyType={bodyType} />;
  }

  // Registry entry mode (static test mode)
  if (!garment) {
    console.warn('[GarmentLayer] Neither garment nor runtimeGarment provided');
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
    return <PlaceholderPrimitive garment={garment} bodyType={bodyType} />;
  }

  // No asset and no placeholder - log warning and render nothing
  console.warn(
    `[GarmentLayer] Garment "${garment.id}" has no asset and no placeholder. Cannot render.`
  );
  return null;
}
