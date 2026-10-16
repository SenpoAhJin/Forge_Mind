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

import React, { Suspense, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { Asset } from 'expo-asset';
import { GarmentEntry, BodyType } from '../data/garmentRegistry';
import type { WornGarment } from '../utils/wearing';
import { getHeadTopY, getTorsoMidY } from '../data/bodyBounds';
import { getGarmentForOwnedItem } from '../utils/wearing';

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

/** Catches a failed garment load so the body keeps drawing. */
class GarmentErrorBoundary extends React.Component<
  { garmentId: string; children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  
  static getDerivedStateFromError() {
    return { failed: true };
  }
  
  componentDidCatch(error: unknown) {
    console.error(`[GarmentLayer] Failed to load garment "${this.props.garmentId}":`, error);
  }
  
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Real GLB garment. No try/catch here: Suspense needs the loading signal. */
function GarmentGLB({ assetModule }: { assetModule: number | string }) {
  const uri = resolveAssetUri(assetModule);
  const gltf = useGLTF(uri);
  
  // Clone so the cached copy is never shared between two places
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  
  return <primitive object={scene} />;
}

/**
 * Runtime Garment Renderer
 * Renders placeholder shapes for worn garments (no registry entry)
 * Returns null if the garment slot is empty (itemId === null)
 * 
 * E1 Step 8: Enhanced to check for real garments first (RULE-BASED mapping).
 */
function RuntimeGarmentPrimitive({ garment, bodyType }: { garment: WornGarment; bodyType: BodyType }) {
  // Skip rendering for empty slots
  if (garment.itemId === null) {
    return null;
  }
  
  // E1 Step 8: Check if a real garment exists for this worn garment
  // This uses RULE-BASED matching (not AI): checks if the item's type and color
  // match a garment that has a real 3D asset.
  // 
  // For example: white wig → wig-white-cap-male/female (real GLB)
  //              black wig → null (no 3D asset yet, falls back to placeholder)
  const realGarment = garment.ownedItem
    ? getGarmentForOwnedItem(garment.ownedItem, bodyType)
    : null;
  
  // If a real garment exists, render it instead of placeholder
  if (realGarment && realGarment.asset !== null) {
    return (
      <Suspense fallback={null}>
        <GarmentGLB assetModule={realGarment.asset} />
      </Suspense>
    );
  }
  
  // Otherwise render placeholder shape
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
      <GarmentErrorBoundary garmentId={garment.id}>
        <Suspense fallback={null}>
          <GarmentGLB assetModule={garment.asset} />
        </Suspense>
      </GarmentErrorBoundary>
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
