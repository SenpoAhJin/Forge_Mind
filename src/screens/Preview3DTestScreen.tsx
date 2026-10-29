import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Preview3D from '../components/Preview3D';
import BodyTypeSelector from '../components/BodyTypeSelector';
import { BaseBodySelection, DEFAULT_BASE_BODY } from '../constants/bodyType';
import { Button } from '../components/buttons/Button';
import { setActiveBodySet, getActiveBodySetId, type BodySetId } from '../config/bodyAssets';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense } from 'react';
import V2CostumeDemo from '../components/V2CostumeDemo';

// Load costume pieces data
const costumePiecesData = require('../data/costumePieces.json');

/**
 * Preview3DTestScreen
 *
 * Test screen for the React Three Fiber dress-up preview:
 * - Verify react-three-fiber works on web + device
 * - Load and render the real Blender base bodies (assets/models/*.glb)
 * - Prove 3D rendering works without Unity
 *
 * Success criteria:
 * ✅ 3D scene renders without errors
 * ✅ Can orbit/zoom camera with touch/mouse
 * ✅ Both base bodies load and render
 * ✅ Runs at 60fps on real device
 *
 * There is no body-size slider: runtime bone scaling was cancelled, so the body
 * always renders at the proportions authored in Blender. See CHANGELOG.md.
 */

export default function Preview3DTestScreen() {
  // FE-3D Milestone 1c: local state, but labelled with the same neutral body-type
  // copy the production preview uses. The stored values are unchanged; only the
  // user-facing labels moved off the gendered value names.
  const [bodyType, setBodyType] = useState<BaseBodySelection>(DEFAULT_BASE_BODY);
  const [showTestCubes, setShowTestCubes] = useState(false);
  const [bodySet, setBodySet] = useState<BodySetId>(() => getActiveBodySetId());
  const scrollViewRef = React.useRef<any>(null);
  
  // V2 Costume Demo state
  const [costumeBodyType, setCostumeBodyType] = useState<BaseBodySelection>('male');
  const [enabledPieces, setEnabledPieces] = useState<Set<string>>(new Set());
  const [pieceColors, setPieceColors] = useState<Map<string, string>>(new Map());
  const [selectedPiece, setSelectedPiece] = useState<string | null>(null);
  const [previousBodySet, setPreviousBodySet] = useState<BodySetId | null>(null);
  const [showCostumeDemo, setShowCostumeDemo] = useState(false);

  const handleBodySetChange = (newSet: BodySetId) => {
    if (__DEV__) {
      setActiveBodySet(newSet);
      setBodySet(newSet);
    }
  };

  const handleEnterCostumeDemo = () => {
    if (__DEV__) {
      setPreviousBodySet(getActiveBodySetId());
      setActiveBodySet('v2');
      setBodySet('v2');
      setShowCostumeDemo(true);
    }
  };

  const handleExitCostumeDemo = () => {
    if (__DEV__ && previousBodySet) {
      setActiveBodySet(previousBodySet);
      setBodySet(previousBodySet);
      setShowCostumeDemo(false);
      setPreviousBodySet(null);
    }
  };

  const togglePiece = (pieceId: string) => {
    setEnabledPieces((prev) => {
      const next = new Set(prev);
      if (next.has(pieceId)) {
        next.delete(pieceId);
      } else {
        next.add(pieceId);
        // Set default color if not set
        if (!pieceColors.has(pieceId)) {
          const piece = costumePiecesData.pieces.find((p: any) => p.id === pieceId);
          if (piece) {
            setPieceColors((colors) => new Map(colors).set(pieceId, piece.defaultColor));
          }
        }
      }
      return next;
    });
  };

  const setPieceColor = (pieceId: string, color: string) => {
    setPieceColors((prev) => new Map(prev).set(pieceId, color));
  };

  const wearFullCostume = () => {
    const allPieces = new Set<string>();
    const allColors = new Map<string, string>();
    
    for (const piece of costumePiecesData.pieces) {
      if (piece.defaultEnabled) {
        allPieces.add(piece.id);
        allColors.set(piece.id, piece.defaultColor);
      }
    }
    
    setEnabledPieces(allPieces);
    setPieceColors(allColors);
  };

  const removeAllPieces = () => {
    setEnabledPieces(new Set());
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>3D Preview Test</Text>
          <Text style={styles.subtitle}>
            React Three Fiber — real Blender base bodies (no Unity)
          </Text>
        </View>

        {/* 3D Preview - Touch handling to prevent ScrollView interference
            Problem: parent ScrollView steals drag touches, preventing OrbitControls rotation
            Solution: Disable scroll while user touches the canvas, re-enable on release */}
        <View 
          style={styles.previewContainer}
          onTouchStart={() => {
            scrollViewRef.current?.setNativeProps({ scrollEnabled: false });
          }}
          onTouchEnd={() => {
            scrollViewRef.current?.setNativeProps({ scrollEnabled: true });
          }}
        >
          <Preview3D
            bodyType={bodyType}
            showTestCubes={showTestCubes}
          />
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <BodyTypeSelector
            value={bodyType}
            onChange={setBodyType}
            label="Body type"
          />

          {__DEV__ && (
            <>
              <Text style={[styles.label, styles.labelSpaced]}>Body set (dev only)</Text>
              <View style={styles.bodySetRow}>
                <View
                  style={[styles.bodySetButton, bodySet === 'v1' && styles.bodySetButtonActive]}
                  onTouchEnd={() => handleBodySetChange('v1')}
                >
                  <Text style={[styles.bodySetText, bodySet === 'v1' && styles.bodySetTextActive]}>
                    V1
                  </Text>
                </View>
                <View
                  style={[styles.bodySetButton, bodySet === 'v2' && styles.bodySetButtonActive]}
                  onTouchEnd={() => handleBodySetChange('v2')}
                >
                  <Text style={[styles.bodySetText, bodySet === 'v2' && styles.bodySetTextActive]}>
                    V2
                  </Text>
                </View>
              </View>
              <Text style={styles.bodySetNote}>
                {bodySet === 'v1' 
                  ? 'V1: Original bodies (feet ≈ y=-0.95), legacy garments fit correctly.'
                  : 'V2: Rigged bodies (feet at y=0), legacy garments are misplaced.'}
              </Text>
            </>
          )}

          <Text style={[styles.label, styles.labelSpaced]}>
            {showTestCubes
              ? 'Showing animated test cubes.'
              : 'Showing the real base body, unscaled.'}
          </Text>
          
          <View style={styles.buttonRow}>
            <Button
              title={showTestCubes ? "Show Body" : "Show Test Cubes"}
              onPress={() => setShowTestCubes(!showTestCubes)}
              variant="secondary"
            />
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>How to Test:</Text>
          <Text style={styles.instructionsText}>
            • Drag to orbit camera{'\n'}
            • Pinch/scroll to zoom{'\n'}
            • Tap the body type buttons to swap base bodies{'\n'}
            • Toggle "Test Cubes" to fall back to animated primitives{'\n'}
            • Verify works on web AND real device via Expo Go
          </Text>
        </View>

        {/* Status Checklist */}
        <View style={styles.checklist}>
          <Text style={styles.checklistTitle}>FE-3D Milestone 0-1 Checklist:</Text>
          <Text style={styles.checklistItem}>☐ node scripts/verify-glb-models.mjs passes</Text>
          <Text style={styles.checklistItem}>☐ Renders on web preview</Text>
          <Text style={styles.checklistItem}>☐ Renders on real device (Expo Go)</Text>
          <Text style={styles.checklistItem}>☐ Camera controls work (orbit/zoom/pan)</Text>
          <Text style={styles.checklistItem}>☐ Male base body loads and renders</Text>
          <Text style={styles.checklistItem}>☐ Female base body loads and renders</Text>
          <Text style={styles.checklistItem}>☐ Test-cubes fallback still works</Text>
          <Text style={styles.checklistItem}>☐ Smooth 60fps rendering</Text>
          <Text style={styles.checklistItem}>☐ No console errors</Text>
        </View>

        {/* Technical Info */}
        <View style={styles.techInfo}>
          <Text style={styles.techInfoTitle}>What's Being Tested:</Text>
          <Text style={styles.techInfoText}>
            <Text style={styles.bold}>Stack:</Text> @react-three/fiber + expo-gl{'\n'}
            <Text style={styles.bold}>Rendering:</Text> Three.js (WebGL){'\n'}
            <Text style={styles.bold}>Body:</Text> Blender .glb (assets/models/){'\n'}
            <Text style={styles.bold}>Rig:</Text> Full Rigify skeleton, rest pose{'\n'}
            <Text style={styles.bold}>Materials:</Text> None in the export — renders untextured{'\n'}
            <Text style={styles.bold}>Body size:</Text> Not scaled — Blender-authored proportions
          </Text>
        </View>

        {/* V2 Costume Demo Section */}
        {__DEV__ && !showCostumeDemo && (
          <View style={styles.costumeDemoSection}>
            <Text style={styles.costumeDemoTitle}>V2 Costume Demo</Text>
            <Text style={styles.costumeDemoSubtitle}>
              Runtime-derived garment pieces from V2 body mesh
            </Text>
            <Button
              title="Enter V2 Costume Demo"
              onPress={handleEnterCostumeDemo}
              variant="primary"
            />
          </View>
        )}

        {__DEV__ && showCostumeDemo && (
          <View style={styles.costumeDemoActive}>
            <View style={styles.costumeDemoHeader}>
              <Text style={styles.costumeDemoTitle}>V2 Costume Demo</Text>
              <Button
                title="Exit Demo"
                onPress={handleExitCostumeDemo}
                variant="secondary"
              />
            </View>

            {/* Costume 3D Preview */}
            <View 
              style={styles.costumePreviewContainer}
              onTouchStart={() => {
                scrollViewRef.current?.setNativeProps({ scrollEnabled: false });
              }}
              onTouchEnd={() => {
                scrollViewRef.current?.setNativeProps({ scrollEnabled: true });
              }}
            >
              <Canvas
                camera={{ position: [0, 0.95, 3.5], fov: 50 }}
                style={{ width: '100%', height: '100%' }}
                gl={{
                  preserveDrawingBuffer: true,
                  antialias: true,
                  alpha: false,
                }}
              >
                <ambientLight intensity={1.0} />
                <directionalLight position={[0, 5, 10]} intensity={2.0} />
                <directionalLight position={[0, 5, -10]} intensity={1.5} />
                <directionalLight position={[10, 3, 0]} intensity={0.8} />
                
                <OrbitControls
                  target={[0, 0.95, 0]}
                  enableDamping
                  dampingFactor={0.25}
                  minDistance={2.0}
                  maxDistance={6.0}
                />

                <Suspense fallback={null}>
                  <V2CostumeDemo
                    bodyType={costumeBodyType}
                    enabledPieces={enabledPieces}
                    pieceColors={pieceColors}
                  />
                </Suspense>

                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
                  <planeGeometry args={[10, 10]} />
                  <meshStandardMaterial color="#95a5a6" opacity={0.3} transparent />
                </mesh>
              </Canvas>
            </View>

            {/* Body Type Selector */}
            <View style={styles.costumeControls}>
              <BodyTypeSelector
                value={costumeBodyType}
                onChange={setCostumeBodyType}
                label="Body type"
              />

              {/* Quick Actions */}
              <View style={styles.quickActions}>
                <Button
                  title="Wear Full Costume"
                  onPress={wearFullCostume}
                  variant="primary"
                />
                <Button
                  title="Remove All"
                  onPress={removeAllPieces}
                  variant="secondary"
                />
              </View>

              {/* Piece Toggles */}
              <Text style={styles.sectionLabel}>Pieces:</Text>
              <View style={styles.pieceToggles}>
                {costumePiecesData.pieces.map((piece: any) => (
                  <TouchableOpacity
                    key={piece.id}
                    style={[
                      styles.pieceToggle,
                      enabledPieces.has(piece.id) && styles.pieceToggleActive,
                    ]}
                    onPress={() => {
                      togglePiece(piece.id);
                      setSelectedPiece(piece.id);
                    }}
                  >
                    <Text
                      style={[
                        styles.pieceToggleText,
                        enabledPieces.has(piece.id) && styles.pieceToggleTextActive,
                      ]}
                    >
                      {piece.id}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Color Picker for Selected Piece */}
              {selectedPiece && enabledPieces.has(selectedPiece) && (
                <>
                  <Text style={styles.sectionLabel}>
                    Color for {selectedPiece}:
                  </Text>
                  <View style={styles.colorRow}>
                    {costumePiecesData.colorPresets.map((color: string) => (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.colorSwatch,
                          { backgroundColor: color },
                          pieceColors.get(selectedPiece) === color && styles.colorSwatchActive,
                        ]}
                        onPress={() => setPieceColor(selectedPiece, color)}
                      />
                    ))}
                  </View>
                </>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#8e44ad',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#f0e6f6',
  },
  previewContainer: {
    height: 400,
    backgroundColor: '#ecf0f1',
    borderBottomWidth: 2,
    borderBottomColor: '#bdc3c7',
  },
  controls: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  hint: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 12,
  },
  labelSpaced: {
    marginTop: 20,
  },
  slider: {
    width: '100%',
    height: 40,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  bodySetRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  bodySetButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d0d0d0',
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  bodySetButtonActive: {
    backgroundColor: '#8e44ad',
    borderColor: '#8e44ad',
  },
  bodySetText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  bodySetTextActive: {
    color: '#fff',
  },
  bodySetNote: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  instructions: {
    padding: 20,
    backgroundColor: '#e8f4f8',
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#34495e',
    lineHeight: 22,
  },
  checklist: {
    padding: 20,
    backgroundColor: '#fff9e6',
    borderLeftWidth: 4,
    borderLeftColor: '#f39c12',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
  },
  checklistTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  checklistItem: {
    fontSize: 14,
    color: '#34495e',
    marginVertical: 4,
    fontFamily: 'monospace',
  },
  techInfo: {
    padding: 20,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
    borderRadius: 8,
  },
  techInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  techInfoText: {
    fontSize: 14,
    color: '#34495e',
    lineHeight: 22,
  },
  bold: {
    fontWeight: '600',
    color: '#2c3e50',
  },
  costumeDemoSection: {
    padding: 20,
    backgroundColor: '#e8f4f8',
    borderLeftWidth: 4,
    borderLeftColor: '#8e44ad',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
    borderRadius: 8,
  },
  costumeDemoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  costumeDemoSubtitle: {
    fontSize: 14,
    color: '#34495e',
    marginBottom: 12,
  },
  costumeDemoActive: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
  },
  costumeDemoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  costumePreviewContainer: {
    height: 400,
    backgroundColor: '#ecf0f1',
    borderWidth: 2,
    borderColor: '#8e44ad',
    borderRadius: 8,
    marginBottom: 16,
  },
  costumeControls: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginTop: 12,
    marginBottom: 8,
  },
  pieceToggles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pieceToggle: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d0d0d0',
    backgroundColor: '#fff',
  },
  pieceToggleActive: {
    backgroundColor: '#8e44ad',
    borderColor: '#8e44ad',
  },
  pieceToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  pieceToggleTextActive: {
    color: '#fff',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#ccc',
  },
  colorSwatchActive: {
    borderWidth: 3,
    borderColor: '#2c3e50',
  },
});
