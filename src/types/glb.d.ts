/**
 * Metro emits a reference for bundled assets rather than source text, so
 * TypeScript needs to be told what `require()`ing a .glb actually yields.
 *
 * On native, Metro returns a numeric asset ID that expo-asset resolves to a
 * local file:// URI. On web it returns the dev-server URL as a string. Both are
 * accepted by `Asset.fromModule()`.
 *
 * Requires `glb` in `config.resolver.assetExts` (see metro.config.js).
 */
declare module '*.glb' {
  const assetModule: string | number;
  export default assetModule;
}
