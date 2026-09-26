import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import Slider from '@react-native-community/slider';
import Preview3D from '../components/Preview3D';
import { Button } from '../components/buttons/Button';

/**
 * Preview3DTestScreen
 * 
 * Test screen for Sprint 0 Step 3-4:
 * - Verify react-three-fiber works on web + device
 * - Test body morphing concept (slider controls body size)
 * - Prove 3D rendering works without Unity
 * 
 * Success criteria:
 * ✅ 3D scene renders without errors
 * ✅ Can orbit/zoom camera with touch/mouse
 * ✅ Body morphs smoothly with slider
 * ✅ Runs at 60fps on real device
 */

export default function Preview3DTestScreen() {
  const [morphFactor, setMorphFactor] = useState(0.5); // 0 = slim, 1 = plus
  const [showTestCubes, setShowTestCubes] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>3D Preview Test</Text>
          <Text style={styles.subtitle}>
            Sprint 0 Alternative — React Three Fiber (No Unity)
          </Text>
        </View>

        {/* 3D Preview */}
        <View style={styles.previewContainer}>
          <Preview3D 
            morphFactor={morphFactor}
            showTestCubes={showTestCubes}
          />
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <Text style={styles.label}>
            Body Size: {morphFactor.toFixed(2)}
          </Text>
          <Text style={styles.hint}>
            {morphFactor < 0.33 ? 'Slim' : morphFactor < 0.66 ? 'Average' : 'Plus-size'}
          </Text>
          
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1}
            value={morphFactor}
            onValueChange={setMorphFactor}
            minimumTrackTintColor="#8e44ad"
            maximumTrackTintColor="#d0d0d0"
            thumbTintColor="#8e44ad"
          />

          <View style={styles.buttonRow}>
            <Button
              title={showTestCubes ? "Show Body" : "Show Test Cubes"}
              onPress={() => setShowTestCubes(!showTestCubes)}
              variant="secondary"
            />
            <Button
              title="Reset"
              onPress={() => setMorphFactor(0.5)}
              variant="tertiary"
            />
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>How to Test:</Text>
          <Text style={styles.instructionsText}>
            • Drag to orbit camera{'\n'}
            • Pinch/scroll to zoom{'\n'}
            • Move slider to morph body{'\n'}
            • Toggle "Test Cubes" to see animated primitives{'\n'}
            • Verify works on web AND real device via Expo Go
          </Text>
        </View>

        {/* Status Checklist */}
        <View style={styles.checklist}>
          <Text style={styles.checklistTitle}>Sprint 0 Step 3-4 Checklist:</Text>
          <Text style={styles.checklistItem}>☐ Renders on web preview</Text>
          <Text style={styles.checklistItem}>☐ Renders on real device (Expo Go)</Text>
          <Text style={styles.checklistItem}>☐ Camera controls work (orbit/zoom)</Text>
          <Text style={styles.checklistItem}>☐ Body morphs with slider</Text>
          <Text style={styles.checklistItem}>☐ Smooth 60fps rendering</Text>
          <Text style={styles.checklistItem}>☐ No console errors</Text>
        </View>

        {/* Technical Info */}
        <View style={styles.techInfo}>
          <Text style={styles.techInfoTitle}>What's Being Tested:</Text>
          <Text style={styles.techInfoText}>
            <Text style={styles.bold}>Stack:</Text> @react-three/fiber + expo-gl{'\n'}
            <Text style={styles.bold}>Rendering:</Text> Three.js (WebGL){'\n'}
            <Text style={styles.bold}>Body:</Text> Procedural cylinders + spheres{'\n'}
            <Text style={styles.bold}>Morphing:</Text> Scale-based (prototype){'\n'}
            <Text style={styles.bold}>Next:</Text> Replace with Blender GLB models
          </Text>
        </View>
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
  slider: {
    width: '100%',
    height: 40,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
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
});
