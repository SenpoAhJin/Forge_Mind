# Sprint 0 Alternative — React Native 3D (No Unity Required)

**Date:** September 16, 2026

## The Problem with Original Sprint 0

Original plan required:
- Unity 2022.3 LTS installation (5-8GB, GUI-based setup)
- Unity WebGL builds (complex build pipeline)
- WebView asset bundling (MIME types, WASM loading issues)
- Blender + Mixamo + Unity workflow (steep learning curve)
- Body morphing in Unity (complex rigging/blend shapes)

**User concern:** "Creating a new layouting for the body morphing will be a hard task"

## The Alternative: React Three Fiber + Expo GL

**Already installed in package.json:**
- `@react-three/fiber` v9.8.1 — React renderer for three.js
- `@react-three/drei` v10.7.8 — Useful helpers for react-three-fiber
- `expo-gl` v57.0.2 — OpenGL bindings for Expo (enables 3D on native)
- `three` v0.170.0 — Core 3D library

**What this gives us:**
- ✅ Pure JavaScript/TypeScript 3D rendering
- ✅ Works in Expo Go (no native code)
- ✅ Same code runs on web, iOS, Android
- ✅ No Unity installation required
- ✅ No build pipeline complexity
- ✅ Full control over morphing logic in React
- ✅ Can load GLTF/GLB models from Blender directly

## Revised Sprint 0 — Foundation (Simplified)

### Step 1: ✅ COMPLETE
- Development environment baseline verified
- Python venv created
- Git LFS initialized
- Tag: `v0.6-baseline`

### Step 2: ✅ COMPLETE  
- `react-native-webview` installed (for future use if needed)
- Tag: `v0.6-step2`

### Step 3: Verify React Three Fiber Setup (NEW)
**Goal:** Confirm @react-three/fiber works on web preview AND real device

**Tasks:**
1. Create `Preview3D.tsx` component using react-three-fiber
2. Render simple 3D primitives (Box, Sphere)
3. Add basic camera controls (orbit/zoom)
4. Test on web preview (`npx expo start --web`)
5. Test on real device via Expo Go (scan QR code)
6. Document what renders, any errors, performance

**Success criteria:**
- ✅ 3D scene renders on web without errors
- ✅ 3D scene renders on device without errors
- ✅ Camera controls work (touch/drag to orbit)
- ✅ Smooth 60fps rendering

### Step 4: Body Morphing Prototype (NEW)
**Goal:** Prove body morphing is viable without Unity

**Approach options:**

#### Option A: Parametric Mesh (Code-based body)
- Generate body mesh procedurally using three.js geometry
- Modify vertices directly based on body measurements
- Pros: Full control, no external assets needed
- Cons: Need to code body topology, harder to make look realistic

#### Option B: Morph Targets (Blender blend shapes)
- Create 2-3 body presets in Blender (slim/average/plus)
- Export as single GLB with morph targets
- Blend between them using slider (0.0 = slim, 1.0 = plus)
- Pros: Artist-friendly, realistic shapes, standard workflow
- Cons: Still need Blender for initial models

#### Option C: Skeleton-based Scaling (Simplest)
- Start with single body mesh
- Scale bones/joints based on measurements
- Garments parent to skeleton and scale with it
- Pros: Simplest to implement, good enough for prototype
- Cons: Less control than full morph targets

**Recommended: Start with Option C (skeleton scaling), upgrade to Option B later**

### Step 5: Garment Layering Test (NEW)
**Goal:** Prove garment system works

**Tasks:**
1. Create/load simple garment meshes (shirt, pants)
2. Position garments on body mesh
3. Test layering (multiple garments at once)
4. Basic collision/gap filling (shirt tucked into pants)
5. Swap garments dynamically (change shirt color/style)

**Success criteria:**
- ✅ Multiple garments render simultaneously
- ✅ Can swap garments without reloading scene
- ✅ No obvious gaps/clipping (acceptable prototype quality)

## What This Approach Simplifies

### Body Morphing
**Unity approach (original):**
- Model body in Blender with blend shapes
- Import to Unity
- Set up blend shape controllers
- Build WebGL export
- Load in WebView
- Bridge data via postMessage

**React approach (alternative):**
- Model body in Blender (or use parametric code)
- Export GLB with morph targets
- Load directly in react-three-fiber
- Control morph via React state
- No build step, no bridging layer

### Garment System
**Unity approach:**
- Skin garments to body rig in Blender
- Import to Unity
- Set up material swapping
- Export WebGL
- Rebuild on every garment change

**React approach:**
- Export garments as separate GLB files
- Load dynamically at runtime
- Swap via React state (instant)
- Material changes via three.js (no rebuild)

### Development Workflow
**Unity approach:**
- Edit in Blender → Export to Unity → Build WebGL → Test in app
- ~5-10 minutes per iteration

**React approach:**
- Edit in Blender → Export GLB → Drop in assets folder → Hot reload
- ~30 seconds per iteration

## Technology Stack Comparison

### Original (Unity WebGL)
```
Blender → FBX → Unity → WebGL Build → WebView → Expo
         (artists)  (engineers)   (build step)  (embed)
```

### Alternative (React Three Fiber)
```
Blender → GLB → react-three-fiber → Expo
         (artists)   (engineers)
```

**Two fewer steps, no build pipeline.**

## Cost Comparison

### Original
- Unity Hub: Free
- Unity Personal: Free
- Unity Pro (if needed): $185/month
- Hosting: $0 (bundled asset)
- Total: $0-$185/month

### Alternative
- Blender: Free
- three.js: Free
- react-three-fiber: Free
- Hosting: $0 (bundled asset)
- Total: $0/month

## Learning Curve Comparison

### Original
- Learn Unity interface: 2-3 days
- Learn Unity WebGL quirks: 1-2 days
- Learn Unity-React bridge: 1 day
- Learn blend shape setup: 1-2 days
- Total: ~1 week

### Alternative
- Learn react-three-fiber: 1 day (if you know React)
- Learn three.js basics: 1-2 days
- Learn GLB loading: 1 hour
- Total: ~2-3 days

## What We Lose vs Unity

1. **Unity Asset Store** — Can't buy pre-made characters/garments from Unity store
2. **Unity Physics** — No built-in physics (but do we need it for dress-up?)
3. **Unity Visual Scripting** — Artists can't set up logic without code
4. **Unity Profiler** — Need to use Chrome DevTools instead

## What We Gain vs Unity

1. **Instant Hot Reload** — Edit code, see changes in <1 second
2. **Full TypeScript** — Type-safe 3D scene graph
3. **React DevTools** — Inspect 3D scene as React components
4. **Smaller Bundle** — No Unity runtime overhead
5. **Easier Debugging** — Console.log, breakpoints, React hooks
6. **No Build Step** — Code and see immediately

## Risks & Mitigations

### Risk 1: Performance on older devices
- **Mitigation:** Start simple, measure early, optimize later
- **Fallback:** Static 2D character sprites if 3D too slow

### Risk 2: Complex body morphing too hard in code
- **Mitigation:** Use morph targets from Blender (proven technique)
- **Fallback:** Discrete body types (S/M/L) instead of continuous slider

### Risk 3: Missing 3D expertise on team
- **Mitigation:** react-three-fiber has excellent docs + examples
- **Fallback:** Hire Blender freelancer on Upwork ($30-50/hr)

### Risk 4: Bundle size too large
- **Mitigation:** Use Draco compression for GLB files
- **Fallback:** Download models on-demand instead of bundling

## Decision Point

**Question:** Do we proceed with React Three Fiber alternative, or stick with Unity WebGL?

**Recommendation:** **Try React Three Fiber first** (Steps 3-4 below), because:
1. Already installed, zero setup needed
2. Can test in <2 hours whether it works
3. If it fails, Unity is still an option
4. If it works, we save weeks of Unity learning curve

**Sprint 0 becomes:**
- Step 1: ✅ Environment baseline
- Step 2: ✅ react-native-webview installed
- Step 3: Test react-three-fiber basics (2 hours)
- Step 4: Body morphing prototype (4-8 hours)
- Step 5: Garment layering test (4 hours)

**Total: 1-2 days instead of 1 week**

## Next Steps if Approved

1. Create `src/components/Preview3D.tsx` using react-three-fiber
2. Test rendering simple 3D primitives
3. Verify works on web + device
4. Implement basic body morphing
5. Document results in CHANGELOG_V2.md
6. Decide: continue with react-three-fiber OR pivot to Unity

---

**Awaiting approval to proceed with React Three Fiber approach.**
