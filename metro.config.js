// Learn more https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// 3D body models (assets/models/*.glb) are bundled assets, not source files.
// Metro has to know the extension or `require()` in BodyModel.tsx fails to
// resolve and the loader never gets a URI to fetch.
//
// expo-asset (installed for @react-three/fiber's native loader) turns the
// resulting reference into a local file:// URI on native, and a dev-server URL
// on web — which is exactly what useGLTF expects.
if (!config.resolver.assetExts.includes('glb')) {
  config.resolver.assetExts = [...config.resolver.assetExts, 'glb'];
}

module.exports = config;
