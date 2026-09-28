import React from 'react';
import { View, StyleSheet } from 'react-native';
import Preview3D from './Preview3D';
import { BaseBodySelection, DEFAULT_BASE_BODY } from '../constants/bodyType';

/**
 * ThreeDPreview
 *
 * Production-facing 3D preview used by the character/variant screen
 * (ProjectDashboardScreen).
 *
 * FE-3D Milestone 1b: this used to be a *second, independent* renderer — its own
 * Canvas plus a procedural cylinder/sphere "capsule" figure with a fake
 * body-size lerp — which is why the production preview showed a placeholder while
 * Preview3DTestScreen showed the real Blender body. The two 3D surfaces had
 * drifted apart.
 *
 * It is now a thin, sized wrapper around the single shared `Preview3D` scene, so
 * the production preview and the dev harness render through the exact same
 * `BodyModel` (the real .glb rigs) and cannot drift again.
 *
 * This wrapper is layout-only. It deliberately carries no responder props, no
 * touch logging and no debug overlay: the Milestone 2 diagnostic handlers that
 * used to live here competed with OrbitControls for the touch stream and are
 * gone. See CHANGELOG_V2.md.
 *
 * The former `bodySizeValue` / `showBoneDebug` props are gone: runtime body-size
 * scaling was cancelled, so the wrapper no longer has a size to pass down. The
 * persisted `User.body_size_slider` column is untouched. See CHANGELOG_V2.md.
 */

interface ThreeDPreviewProps {
  bodyType?: BaseBodySelection; // Which base body to render
  width?: number;
  height?: number;
}

export function ThreeDPreview({
  bodyType = DEFAULT_BASE_BODY,
  width = 300,
  height = 400
}: ThreeDPreviewProps) {
  return (
    <View style={[styles.container, { width, height }]}>
      <View style={styles.canvasContainer}>
        <Preview3D bodyType={bodyType} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  canvasContainer: {
    flex: 1,
  },
});
