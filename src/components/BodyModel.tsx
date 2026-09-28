import React from 'react';
import { Asset } from 'expo-asset';
import { useGLTF } from '@react-three/drei';

import MALE_GLTF from '../../assets/models/3D_Model_Male.glb';
import FEMALE_GLTF from '../../assets/models/3D_Model_Female.glb';
import { BaseBodySelection, DEFAULT_BASE_BODY } from '../constants/bodyType';

/**
 * BodyModel
 *
 * Renders the real Blender base bodies (assets/models/*.glb) at the proportions
 * authored in Blender.
 *
 * SCOPE DECISION: runtime body-size scaling (formerly FE-3D Milestone 2) is
 * cancelled. Nothing in this component touches bone scale - the .glb loads and
 * renders exactly as exported. `assets/models/body_size_bone_scale.json` and
 * `src/utils/boneScaling.ts` are no longer read; see CHANGELOG_V2.md.
 */

/**
 * The two available base bodies.
 *
 * The stored values are bound to the shipped asset filenames and to the persisted
 * `User.base_body_selection` column, so they keep their historical names. They are
 * NEVER shown to a user - user-facing copy comes from `BODY_TYPE_OPTIONS` in
 * `src/constants/bodyType.ts`, which is deliberately identity-neutral.
 */
export type { BaseBodySelection };

const GLB_MODULES: Record<BaseBodySelection, string | number> = {
  male: MALE_GLTF,
  female: FEMALE_GLTF,
};

/**
 * Metro hands back a numeric asset ID on native and a dev-server URL on web.
 * `Asset.fromModule` normalises both, and its `localUri` is set once the asset
 * has been downloaded — otherwise the remote URI is used and react-three-fiber
 * downloads it on the native side. Resolved once per body type, since the result
 * is stable and `useGLTF` keys its cache on the path string.
 */
const uriCache = new Map<BaseBodySelection, string>();

function resolveModelUri(bodyType: BaseBodySelection): string {
  const cached = uriCache.get(bodyType);
  if (cached) return cached;

  const asset = Asset.fromModule(GLB_MODULES[bodyType]);
  const uri = asset.localUri ?? asset.uri;
  uriCache.set(bodyType, uri);
  return uri;
}

/** Warm the loader cache ahead of first render. Optional — loading is lazy by default. */
export function preloadBodyModel(bodyType: BaseBodySelection): void {
  useGLTF.preload(resolveModelUri(bodyType));
}

interface BodyModelProps {
  /** Which base body to render. */
  bodyType?: BaseBodySelection;
}

export default function BodyModel({ bodyType = DEFAULT_BASE_BODY }: BodyModelProps) {
  const gltf = useGLTF(resolveModelUri(bodyType));

  // The whole glTF scene is mounted, not just the mesh: the skinned mesh only
  // deforms correctly while its bone hierarchy is part of the same scene graph.
  //
  // `useGLTF` caches and returns one scene per path, so this is a shared object
  // and R3F will not auto-dispose it on unmount. Nothing in this component
  // mutates the scene, so the cached asset is safe to reuse across mounts.
  return <primitive object={gltf.scene} />;
}
