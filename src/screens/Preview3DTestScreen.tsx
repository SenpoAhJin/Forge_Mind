import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Preview3D from '../components/Preview3D';
import BodyTypeSelector from '../components/BodyTypeSelector';
import { BaseBodySelection, DEFAULT_BASE_BODY } from '../constants/bodyType';
import { Button } from '../components/buttons/Button';
import { setActiveBodySet, getActiveBodySetId, type BodySetId } from '../config/bodyAssets';
import CostumeViewer from '../components/CostumeViewer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOwnedAttire } from '../contexts/OwnedAttireContext';
import { applyItemToOutfit, canMapItemToPiece, getUnmappedItemMessage } from '../utils/outfitHelpers';
import type { OwnedAttire } from '../types/owned-attire';

// Load costume pieces data
const costumePiecesData = require('../data/costumePieces.json');

// Storage keys
const OUTFIT_STORAGE_KEY = 'v2_costume_outfit';

// Outfit state structure
interface OutfitState {
  pieces: string[];
  colors: Record<string, string>;
}

interface OutfitStorage {
  male: OutfitState;
  female: OutfitState;
}

const defaultOutfitState = (): OutfitState => ({
  pieces: [],
  colors: {},
});

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
  const [debugMode, setDebugMode] = useState(false);
  const [debugInfo, setDebugInfo] = useState<Map<string, any>>(new Map());
  const [cameraPosition, setCameraPosition] = useState<'front' | 'side' | 'back'>('front');
  const [showItemSelector, setShowItemSelector] = useState(false);
  const [itemMessage, setItemMessage] = useState<string | null>(null);
  
  // Access owned items for integration demo
  const { items: ownedItems } = useOwnedAttire();

  // Load outfit state from AsyncStorage on mount
  useEffect(() => {
    const loadOutfitState = async () => {
      try {
        const storedData = await AsyncStorage.getItem(OUTFIT_STORAGE_KEY);
        if (storedData) {
          const outfitStorage: OutfitStorage = JSON.parse(storedData);
          const currentOutfit = outfitStorage[costumeBodyType] || defaultOutfitState();
          
          setEnabledPieces(new Set(currentOutfit.pieces));
          setPieceColors(new Map(Object.entries(currentOutfit.colors)));
        }
      } catch (error) {
        console.error('[Preview3DTestScreen] Failed to load outfit state:', error);
      }
    };

    if (showCostumeDemo) {
      loadOutfitState();
    }
  }, [showCostumeDemo, costumeBodyType]);

  // Save outfit state to AsyncStorage whenever it changes
  useEffect(() => {
    const saveOutfitState = async () => {
      try {
        // Load existing storage
        const storedData = await AsyncStorage.getItem(OUTFIT_STORAGE_KEY);
        const outfitStorage: OutfitStorage = storedData 
          ? JSON.parse(storedData)
          : { male: defaultOutfitState(), female: defaultOutfitState() };

        // Update current body type outfit
        outfitStorage[costumeBodyType] = {
          pieces: Array.from(enabledPieces),
          colors: Object.fromEntries(pieceColors),
        };

        await AsyncStorage.setItem(OUTFIT_STORAGE_KEY, JSON.stringify(outfitStorage));
      } catch (error) {
        console.error('[Preview3DTestScreen] Failed to save outfit state:', error);
      }
    };

    if (showCostumeDemo) {
      saveOutfitState();
    }
  }, [enabledPieces, pieceColors, costumeBodyType, showCostumeDemo]);

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
    
    // Wear ALL pieces (including gloves, wig, belt)
    for (const piece of costumePiecesData.pieces) {
      allPieces.add(piece.id);
      allColors.set(piece.id, piece.defaultColor);
    }
    
    setEnabledPieces(allPieces);
    setPieceColors(allColors);
  };

  const removeAllPieces = () => {
    setEnabledPieces(new Set());
  };

  // COSTUME-2 Step 6: Handle owned item selection
  const handleItemSelect = (item: OwnedAttire) => {
    // Try to map item to a costume piece
    const suggestion = applyItemToOutfit(item);
    
    if (!suggestion) {
      // No 3D piece for this item type
      setItemMessage(getUnmappedItemMessage(item));
      return;
    }
    
    // Apply the piece
    const updatedPieces = new Set(enabledPieces);
    updatedPieces.add(suggestion.slot);
    setEnabledPieces(updatedPieces);
    
    // Apply the color
    setPieceColor(suggestion.slot, suggestion.color);
    
    // Show success message
    setItemMessage(`Applied ${item.auto_categorized_type} to ${suggestion.slot} slot`);
    
    // Clear message after 3 seconds
    setTimeout(() => setItemMessage(null), 3000);
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
              <CostumeViewer
                bodyType={costumeBodyType}
                enabledPieces={enabledPieces}
                pieceColors={pieceColors}
                debugMode={debugMode}
                showCameraControls={true}
                onDebugInfo={setDebugInfo}
              />
            </View>

            {/* Body Type Selector */}
            <View style={styles.costumeControls}>
              {/* Debug Toggle */}
              <View style={styles.debugToggleRow}>
                <Text style={styles.sectionLabel}>Debug Mode:</Text>
                <TouchableOpacity
                  style={[styles.debugToggle, debugMode && styles.debugToggleActive]}
                  onPress={() => setDebugMode(!debugMode)}
                >
                  <Text style={[styles.debugToggleText, debugMode && styles.debugToggleTextActive]}>
                    {debugMode ? 'ON' : 'OFF'}
                  </Text>
                </TouchableOpacity>
              </View>

              {debugMode && debugInfo.size > 0 && (
                <View style={styles.debugPanel}>
                  <Text style={styles.debugTitle}>Debug Info:</Text>
                  {Array.from(debugInfo.entries()).map(([pieceId, info]) => (
                    <Text key={pieceId} style={styles.debugText}>
                      {pieceId}: {info.triangleCount} tris, coverage {(info.vertexCoverage * 100).toFixed(1)}% 
                      ({info.coveredVertexCount}/{info.eligibleVertexCount} verts)
                    </Text>
                  ))}
                </View>
              )}

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

              {/* COSTUME-2 Step 6: Owned Items Integration */}
              <TouchableOpacity
                style={styles.itemSelectorToggle}
                onPress={() => setShowItemSelector(!showItemSelector)}
              >
                <Text style={styles.sectionLabel}>
                  Owned Items {showItemSelector ? '▼' : '▶'}
                </Text>
                <Text style={styles.itemSelectorHint}>
                  Apply owned items to costume pieces
                </Text>
              </TouchableOpacity>

              {showItemSelector && ownedItems.length > 0 && (
                <View style={styles.itemSelector}>
                  {ownedItems.slice(0, 10).map((item) => {
                    const canMap = canMapItemToPiece(item);
                    return (
                      <TouchableOpacity
                        key={item.attire_id}
                        style={[
                          styles.itemCard,
                          !canMap && styles.itemCardDisabled,
                        ]}
                        onPress={() => handleItemSelect(item)}
                        disabled={!canMap}
                      >
                        <Text style={styles.itemName} numberOfLines={1}>
                          {item.original_input_text || `${item.auto_categorized_color} ${item.auto_categorized_type}`}
                        </Text>
                        <Text style={styles.itemCategory}>
                          {item.auto_categorized_type}
                        </Text>
                        {!canMap && (
                          <Text style={styles.itemNoMapping}>No 3D piece</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                  {ownedItems.length === 0 && (
                    <Text style={styles.noItemsText}>No owned items yet</Text>
                  )}
                </View>
              )}

              {itemMessage && (
                <View style={styles.itemMessage}>
                  <Text style={styles.itemMessageText}>{itemMessage}</Text>
                </View>
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
    flexWrap: 'wrap',
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
  debugToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  debugToggle: {
    marginLeft: 12,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d0d0d0',
    backgroundColor: '#fff',
  },
  debugToggleActive: {
    backgroundColor: '#f39c12',
    borderColor: '#f39c12',
  },
  debugToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  debugToggleTextActive: {
    color: '#fff',
  },
  debugPanel: {
    padding: 12,
    backgroundColor: '#fff9e6',
    borderLeftWidth: 3,
    borderLeftColor: '#f39c12',
    borderRadius: 6,
    marginBottom: 12,
  },
  debugTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 6,
  },
  debugText: {
    fontSize: 11,
    color: '#34495e',
    fontFamily: 'monospace',
    marginVertical: 2,
  },
  itemSelectorToggle: {
    marginTop: 16,
    marginBottom: 8,
  },
  itemSelectorHint: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 2,
  },
  itemSelector: {
    marginTop: 8,
    maxHeight: 200,
  },
  itemCard: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 8,
  },
  itemCardDisabled: {
    opacity: 0.5,
    backgroundColor: '#f5f5f5',
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  itemCategory: {
    fontSize: 11,
    color: '#7f8c8d',
  },
  itemNoMapping: {
    fontSize: 10,
    color: '#e74c3c',
    marginTop: 2,
    fontStyle: 'italic',
  },
  noItemsText: {
    fontSize: 13,
    color: '#7f8c8d',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  itemMessage: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#d4edda',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#c3e6cb',
  },
  itemMessageText: {
    fontSize: 12,
    color: '#155724',
  },
});
