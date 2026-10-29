/**
 * GarmentLayer Component
 * 
 * Renders a 3D garment on top of a body model. Supports:
 * - Real GLB assets (loaded via useGLTF, with optional tinting)
 * - Placeholder primitives (sphere, box, cylinder) when no asset exists
 * - Dynamic catalog-based garment selection
 * 
 * RENDERING STRATEGY:
 * - Garment shares the body's transform (world-space positioning)
 * - GLB assets load at their exported position (no runtime adjustment)
 * - Placeholders positioned using body bounding box measurements
 * - Load failures are caught and logged (body continues rendering)
 * - Tinting applied to garments with tintable regions
 */

import React, { Suspense, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { Asset } from 'expo-asset';
import { GarmentEntry, BodyType } from '../data/garmentRegistry';
import type { GarmentCatalogEntry } from '../data/garmentCatalog';
import type { WearingSlotSpec } from '../utils/garmentMatcher';
import type { WornGarment } from '../utils/wearing';
import { getHeadTopY, getTorsoMidY, getFeetY } from '../data/bodyBounds';
import { getGarmentForOwnedItem } from '../utils/wearing';
import TintableGarment, { SimpleGarment } from './TintableGarment';
import { getActiveBodySetId } from '../config/bodyAssets';

// Track whether we've shown the V2 legacy warning (one-time only)
let hasWarnedAboutLegacyGarments = false;

interface GarmentLayerProps {
  /** Garment entry from registry (for static test mode) */
  garment?: GarmentEntry;
  /** Runtime garment descriptor (for dynamic wearing mode - legacy) */
  runtimeGarment?: WornGarment;
  /** Wearing slot spec from garmentMatcher (new dynamic mode) */
  wearingSpec?: WearingSlotSpec;
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
function GarmentGLB({ assetModule, tintable, isLegacy = false }: { assetModule: number | string; tintable?: { regions: any[]; tints: any[] }; isLegacy?: boolean }) {
  // Warn once if legacy garment is rendered on V2 body (dev-only)
  const activeBodySet = getActiveBodySetId();
  if (__DEV__ && activeBodySet === 'v2' && isLegacy && !hasWarnedAboutLegacyGarments) {
    hasWarnedAboutLegacyGarments = true;
    console.warn(
      '[GarmentLayer] Legacy garments are fitted to V1 and will be misplaced on V2.\n' +
      'See Preview3DTestScreen for the body set toggle.'
    );
  }

  if (tintable && tintable.regions.length > 0) {
    return (
      <TintableGarment 
        assetModule={assetModule}
        tintRegions={tintable.tints}
        regionDefinitions={tintable.regions}
      />
    );
  }
  
  return <SimpleGarment assetModule={assetModule} />;
}

/**
 * Catalog Garment Renderer
 * Renders a garment from the catalog (new dynamic system).
 * Handles real assets and placeholders from GarmentCatalogEntry.
 */
function CatalogGarmentRenderer({ spec, bodyType }: { spec: WearingSlotSpec; bodyType: BodyType }) {
  const { garment, colorHex, isPlaceholder } = spec;
  
  if (!garment) {
    console.warn(`[GarmentLayer] No garment available for slot ${spec.slot}`);
    return null;
  }
  
  // Real asset (possibly tintable)
  if (garment.assetModule !== null) {
    const tintData = garment.tintableRegions.length > 0
      ? {
          regions: garment.tintableRegions,
          tints: [{ regionName: 'base', targetColor: colorHex }], // Apply item's actual color
        }
      : undefined;
    
    return (
      <Suspense fallback={null}>
        <GarmentGLB assetModule={garment.assetModule} tintable={tintData} isLegacy={false} />
      </Suspense>
    );
  }
  
  // Placeholder primitive
  if (garment.placeholderShape) {
    return <CatalogPlaceholder garment={garment} colorHex={colorHex} bodyType={bodyType} />;
  }
  
  console.warn(`[GarmentLayer] Garment ${garment.id} has no asset and no placeholder`);
  return null;
}

/**
 * Placeholder renderer for catalog entries
 */
function CatalogPlaceholder({ garment, colorHex, bodyType }: { garment: GarmentCatalogEntry; colorHex: string; bodyType: BodyType }) {
  const { placeholderShape } = garment;
  if (!placeholderShape) return null;
  
  let geometry: React.ReactElement;
  let position: [number, number, number];
  
  switch (placeholderShape.type) {
    case 'cap': {
      const radius = typeof placeholderShape.dimensions === 'number' 
        ? placeholderShape.dimensions 
        : placeholderShape.dimensions[0];
      const headTop = getHeadTopY(bodyType);
      geometry = <sphereGeometry args={[radius, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />;
      position = [0, headTop - radius * 0.3, 0];
      break;
    }
    
    case 'tube': {
      const [radius, height] = Array.isArray(placeholderShape.dimensions)
        ? placeholderShape.dimensions
        : [placeholderShape.dimensions, placeholderShape.dimensions * 2];
      
      // Position based on slot
      const yPos = garment.slot === 'top' 
        ? getTorsoMidY(bodyType)
        : garment.slot === 'bottom'
        ? -0.20
        : 0;
      
      geometry = <cylinderGeometry args={[radius, radius, height, 16]} />;
      position = [0, yPos, 0];
      break;
    }
    
    case 'block': {
      const [width, height, depth] = Array.isArray(placeholderShape.dimensions)
        ? placeholderShape.dimensions
        : [placeholderShape.dimensions, placeholderShape.dimensions, placeholderShape.dimensions];
      
      // Position based on slot
      const yPos = garment.slot === 'footwear'
        ? getFeetY(bodyType) + height / 2
        : garment.slot === 'accessory'
        ? 0.25
        : 0;
      
      geometry = <boxGeometry args={[width, height, depth]} />;
      position = [0.25, yPos, 0];
      break;
    }
    
    default:
      console.warn(`[GarmentLayer] Unknown placeholder type`);
      return null;
  }
  
  return (
    <mesh position={position}>
      {geometry}
      <meshStandardMaterial 
        color={colorHex} 
        transparent={!garment.isPlaceholder} 
        opacity={garment.isPlaceholder ? 1.0 : 0.7} 
      />
    </mesh>
  );
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
  
  // If a real garment exists, render it instead of placeholder (legacy garment)
  if (realGarment && realGarment.asset !== null) {
    return (
      <Suspense fallback={null}>
        <GarmentGLB assetModule={realGarment.asset} isLegacy={true} />
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
 * - WearingSlotSpec (new catalog-based system) - PREFERRED
 * - Registry entry (static test mode with toggles)
 * - Runtime descriptor (legacy dynamic wearing mode)
 * - Asset vs placeholder routing
 * - Error boundaries (load failures don't crash body)
 * - Visibility toggle
 * - Visual distinction for missing items
 */
export default function GarmentLayer({ garment, runtimeGarment, wearingSpec, bodyType, visible = true }: GarmentLayerProps) {
  if (!visible) {
    return null;
  }

  // NEW: WearingSlotSpec mode (from garmentMatcher + catalog)
  if (wearingSpec) {
    // Don't render empty slots (no owned item)
    if (!wearingSpec.isFilled) {
      return null; // Could render a "missing" indicator in the future
    }
    
    return (
      <GarmentErrorBoundary garmentId={wearingSpec.garment?.id || wearingSpec.slot}>
        <CatalogGarmentRenderer spec={wearingSpec} bodyType={bodyType} />
      </GarmentErrorBoundary>
    );
  }

  // Runtime garment mode (from worn garments array - legacy)
  if (runtimeGarment) {
    return <RuntimeGarmentPrimitive garment={runtimeGarment} bodyType={bodyType} />;
  }

  // Registry entry mode (static test mode)
  if (!garment) {
    console.warn('[GarmentLayer] Neither garment, runtimeGarment, nor wearingSpec provided');
    return null;
  }

  // If real asset exists, load it (legacy procedural garments)
  if (garment.asset !== null) {
    return (
      <GarmentErrorBoundary garmentId={garment.id}>
        <Suspense fallback={null}>
          <GarmentGLB assetModule={garment.asset} isLegacy={true} />
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
