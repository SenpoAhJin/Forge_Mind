/**
 * Camera framing utilities for 3D preview.
 *
 * Computes camera position and target from body bounding boxes, ensuring the
 * body is centered and fully visible regardless of body set (V1 or V2).
 */

import { getBodyCenterY, getBodyHeight } from '../data/bodyBounds';
import type { BaseBodySelection } from '../constants/bodyType';

export interface CameraConfig {
  /** Camera position [x, y, z] */
  position: [number, number, number];
  /** Target point [x, y, z] for OrbitControls (what the camera looks at) */
  target?: [number, number, number];
  /** Field of view in degrees */
  fov: number;
}

/**
 * Compute camera position and target to frame a body model.
 *
 * The camera is positioned to look at the vertical center of the body's bounding
 * box, with distance scaled by the body's height to ensure it fills the viewport.
 *
 * For V1 bodies (feet ≈ y=-0.95, centerY ≈ -0.01, height ≈ 1.88m):
 *   - Target: [0, -0.01, 0] (vertical center)
 *   - Camera: [0, -0.01 + offset, distance] where offset and distance scale with height
 *
 * For V2 bodies (feet ≈ y=0, centerY ≈ 0.95, height ≈ 1.90m):
 *   - Target: [0, 0.95, 0] (vertical center)
 *   - Camera: [0, 0.95 + offset, distance]
 *
 * @param bodyType - 'male' or 'female'
 * @param fov - Field of view in degrees (default 50)
 * @param distanceScale - Multiplier for camera distance (default 2.1 for full-body framing)
 * @returns Camera configuration with position, target, and fov
 */
export function computeCameraFraming(
  bodyType: BaseBodySelection,
  fov: number = 50,
  distanceScale: number = 2.1
): CameraConfig {
  const centerY = getBodyCenterY(bodyType);
  const height = getBodyHeight(bodyType);

  // Target: look at the vertical center of the body
  const target: [number, number, number] = [0, centerY, 0];

  // Camera distance: scaled by body height to keep body filling the viewport
  // The factor 2.1 is empirically chosen to ensure the entire body fits with margin
  const distance = height * distanceScale;

  // Camera position: pulled back along Z-axis, slightly raised relative to center
  // The Y offset (0.1 * height) provides a subtle elevated viewpoint
  const position: [number, number, number] = [
    0,
    centerY + 0.1 * height,
    distance,
  ];

  return { position, target, fov };
}

/**
 * V1 REFERENCE FRAMING (for verification):
 *
 * The original hardcoded camera positions were:
 * - Preview3D: camera={{ position: [0, 0.2, 4], fov: 50 }}
 * - ProjectPlanningScreen: camera={{ position: [0, 0.3, 2.5], fov: 50 }}
 *
 * For V1 male (centerY ≈ -0.0093, height ≈ 1.881):
 *   computeCameraFraming('male', 50, 2.1) yields:
 *     position ≈ [0, 0.179, 3.950]
 *     target = [0, -0.0093, 0]
 *
 * Differences from Preview3D hardcoded [0, 0.2, 4]:
 *   - Y: 0.179 vs 0.2 (diff 0.021m = 21mm)
 *   - Z: 3.950 vs 4.0 (diff 0.050m = 50mm)
 *   Both within acceptable tolerance for V1 framing.
 *
 * ProjectPlanningScreen used a closer view (Z=2.5); apply distanceScale=1.33
 * to match that behavior.
 */
