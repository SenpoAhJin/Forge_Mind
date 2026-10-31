import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Preview3D from '../components/Preview3D';
import BodyTypeSelector from '../components/BodyTypeSelector';
import { BaseBodySelection, DEFAULT_BASE_BODY } from '../constants/bodyType';
import { Button } from '../components/buttons/Button';
import { setActiveBodySet, getActiveBodySetId, type BodySetId } from '../config/bodyAssets';
import { OwnedOutfitPanel } from '../components/OwnedOutfitPanel';
import { useUser } from '../contexts/UserContext';
import { useOwnedAttire } from '../contexts/OwnedAttireContext';
import { applyItemToOutfit, canMapItemToPiece, getUnmappedItemMessage } from '../utils/outfitHelpers';
import type { OwnedAttire } from '../types/owned-attire';

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
  
  const { user } = useUser();
  const inventory = useOwnedAttire();
  const [interacting, setInteracting] = useState(false);
  const handleBodySetChange = (newSet: BodySetId) => {
    if (__DEV__) { setActiveBodySet(newSet); setBodySet(newSet); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView scrollEnabled={!interacting} ref={scrollViewRef} contentContainerStyle={styles.scrollContent}>
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

        {__DEV__ ? <View style={styles.costumeDemoSection}>
          <Text style={styles.costumeDemoTitle}>Inventory wearing preview</Text>
          <OwnedOutfitPanel accountId={user?.email} projectId="preview-test"
            items={inventory.items} inventoryLoaded={inventory.isLoaded} offline={inventory.isOffline}
            initialBody={bodyType} onInteractionChange={setInteracting} />
        </View> : null}
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
