# Step 1: Transform Group Analysis

## Current Structure (Preview3D.tsx lines 198-213)

```tsx
{!showTestCubes && (
  <Suspense fallback={null}>
    <BodyModel bodyType={bodyType} />
    
    {/* Garment Layers: Render each visible garment on top of body */}
    {availableGarments.map((garment) => (
      <GarmentLayer
        key={garment.id}
        garment={garment}
        bodyType={bodyType}
        visible={visibleGarments.has(garment.id)}
      />
    ))}
  </Suspense>
)}
```

## Analysis

**BodyModel transform** (BodyModel.tsx:75): `<primitive object={gltf.scene} />` - no position, rotation, or scale props. Renders at origin [0,0,0].

**GarmentLayer transform** (GarmentLayer.tsx:115-118): Returns `<GarmentGLB>` or `<PlaceholderPrimitive>`, both render primitives with no wrapper group.

**Result:** Both are siblings in the scene graph at world origin. This is CORRECT for garments fitted in Blender - a garment exported at the same origin as the body will align automatically.

## Conclusion

No change needed. The current structure already achieves "garment fitted in Blender to the body lines up with no extra code" because both BodyModel and GarmentLayer render at world origin with identical transforms (none).

The documentation should clarify: "world-space positioning" means both at origin, not "garment follows body transform" (there is no body transform to follow).
