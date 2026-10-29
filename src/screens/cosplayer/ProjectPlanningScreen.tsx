/**
 * Project Planning Screen
 * 
 * 3D outfit planning with character context:
 * - Shows character info (name, series, colors)
 * - AI suggestions based on character's target colors
 * - 3D preview with owned items on body model
 * - Missing slots marked with placeholders
 * - Readiness indicator
 * 
 * This is the main outfit builder where users see
 * what they own and what they need to acquire.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import { Canvas } from '@react-three/fiber/native';
import { OrbitControls } from '@react-three/drei';
import { Ionicons } from '@expo/vector-icons';
import { useOwnedAttire } from '../../contexts/OwnedAttireContext';
import { useUserCharacters } from '../../contexts/UserCharactersContext';
import type { BodyType } from '../../data/garmentCatalog';
import type { OwnedAttire } from '../../types/owned-attire';
import BodyModel from '../../components/BodyModel';
import GarmentLayer from '../../components/GarmentLayer';
import SelectedGarment from '../../components/SelectedGarment';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { computeCameraFraming } from '../../utils/cameraFraming';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_HEIGHT = 400;

interface ProjectPlanningScreenProps {
  navigation: any;
  route?: any;
}

// Garment slots for outfit planning
const GARMENT_SLOTS = [
  { id: 'wig', label: 'Wig', required: false },
  { id: 'accessory', label: 'Accessory', required: false },
  { id: 'top', label: 'Top', required: true },
  { id: 'bottom', label: 'Bottom', required: true },
  { id: 'footwear', label: 'Footwear', required: true },
];

export default function ProjectPlanningScreen({ navigation, route }: ProjectPlanningScreenProps) {
  const characterId = route?.params?.characterId;
  const { characters } = useUserCharacters();
  const { items: ownedItems, isLoaded, isOffline } = useOwnedAttire();
  
  const character = useMemo(() => {
    if (!characterId) return null;
    return characters.find(c => c.id === characterId);
  }, [characterId, characters]);
  
  console.log(`[ProjectPlanning] characterId=${characterId}, character=`, character?.name);
  console.log(`[ProjectPlanning] isLoaded=${isLoaded}, ownedItems.length=${ownedItems.length}`);
  
  // State
  const [bodyType, setBodyType] = useState<BodyType>('female');
  const [selectedSlots, setSelectedSlots] = useState<Record<string, OwnedAttire | null>>({
    wig: null,
    accessory: null,
    top: null,
    bottom: null,
    footwear: null,
  });
  
  // AI Suggestions: filter items by character's target colors
  const suggestedItems = useMemo(() => {
    if (!character || !isLoaded) return [];
    
    const targetColors = character.targetColors.map(c => c.toLowerCase());
    
    return ownedItems.filter(item => {
      // Match color
      const itemColor = item.auto_categorized_color?.toLowerCase();
      if (itemColor && targetColors.some(tc => 
        itemColor.includes(tc) || tc.includes(itemColor)
      )) {
        return true;
      }
      
      // Match tags
      if (character.styleTags.length > 0 && item.original_input_text) {
        const itemText = item.original_input_text.toLowerCase();
        return character.styleTags.some(tag => itemText.includes(tag.toLowerCase()));
      }
      
      return false;
    }).slice(0, 10); // Limit to 10 suggestions
  }, [character, ownedItems, isLoaded]);
  
  // Calculate readiness
  const readiness = useMemo(() => {
    const requiredSlots = GARMENT_SLOTS.filter(s => s.required);
    const filledRequired = requiredSlots.filter(s => selectedSlots[s.id] !== null);
    return requiredSlots.length > 0 ? (filledRequired.length / requiredSlots.length) * 100 : 0;
  }, [selectedSlots]);

  // Compute camera framing for the current body type (closer view for planning screen)
  const cameraConfig = useMemo(
    () => computeCameraFraming(bodyType, 50, 1.345),
    [bodyType]
  );
  
  if (!isLoaded) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading inventory...</Text>
      </View>
    );
  }
  
  if (!character) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No character selected</Text>
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Character Info */}
      <View style={styles.characterCard}>
        <View style={styles.characterHeader}>
          <View style={styles.characterAvatar}>
            <Text style={styles.characterAvatarText}>{character.name.charAt(0)}</Text>
          </View>
          <View style={styles.characterInfo}>
            <Text style={styles.characterName}>{character.name}</Text>
            <Text style={styles.characterSeries}>{character.series}</Text>
          </View>
        </View>
        
        {/* Target Colors */}
        {character.targetColors.length > 0 && (
          <View style={styles.colorsRow}>
            <Text style={styles.colorsLabel}>Target Colors:</Text>
            <View style={styles.colorDots}>
              {character.targetColors.map((color, i) => (
                <View
                  key={i}
                  style={[styles.colorDot, { backgroundColor: color }]}
                />
              ))}
            </View>
          </View>
        )}
        
        {/* Style Tags */}
        {character.styleTags.length > 0 && (
          <View style={styles.tagsRow}>
            {character.styleTags.map((tag, i) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      
      {/* Body Type Selector */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Body Type</Text>
        <View style={styles.bodyTypeRow}>
          <TouchableOpacity
            style={[styles.bodyTypeButton, bodyType === 'male' && styles.bodyTypeButtonSelected]}
            onPress={() => setBodyType('male')}
          >
            <Text style={[styles.bodyTypeText, bodyType === 'male' && styles.bodyTypeTextSelected]}>
              Male
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bodyTypeButton, bodyType === 'female' && styles.bodyTypeButtonSelected]}
            onPress={() => setBodyType('female')}
          >
            <Text style={[styles.bodyTypeText, bodyType === 'female' && styles.bodyTypeTextSelected]}>
              Female
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* 3D Preview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preview (Drag to Rotate)</Text>
        <View style={styles.previewContainer}>
          <Canvas camera={{ position: cameraConfig.position, fov: cameraConfig.fov }}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[5, 5, 5]} intensity={0.8} />
            <directionalLight position={[-5, 5, -5]} intensity={0.4} />
            
            {/* GARMENT-3a2: Target set to body center (from cameraFraming helper).
                For V1 (feet ≈ y=-0.95), target ≈ [0, -0.01, 0]. For V2 (feet ≈ y=0),
                target ≈ [0, 0.95, 0]. This ensures the body is vertically centered
                in the canvas regardless of body set. */}
            <OrbitControls
              target={cameraConfig.target}
              enableZoom={true}
              enablePan={false}
              minDistance={1.5}
              maxDistance={4}
              maxPolarAngle={Math.PI / 2}
              minPolarAngle={Math.PI / 4}
            />
            
            <BodyModel bodyType={bodyType} />
            
            {/* Render selected garments on body */}
            {Object.entries(selectedSlots).map(([slotId, item]) => {
              if (!item) {
                console.log(`[ProjectPlanning] Slot ${slotId}: empty`);
                return null;
              }
              
              console.log(`[ProjectPlanning] Rendering slot ${slotId}:`, {
                text: item.original_input_text,
                type: item.auto_categorized_type,
              });
              
              return (
                <SelectedGarment
                  key={slotId}
                  item={item}
                  bodyType={bodyType}
                />
              );
            })}
          </Canvas>
        </View>
      </View>
      
      {/* Readiness Indicator */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Outfit Readiness</Text>
        <View style={styles.readinessCard}>
          <View style={styles.readinessRow}>
            <Text style={styles.readinessLabel}>Completion:</Text>
            <Text style={[styles.readinessValue, readiness === 100 && styles.readinessComplete]}>
              {Math.round(readiness)}%
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${readiness}%` }]} />
          </View>
        </View>
      </View>
      
      {/* Garment Slots */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Outfit</Text>
        {GARMENT_SLOTS.map((slot) => (
          <View key={slot.id} style={styles.slotCard}>
            <View style={styles.slotHeader}>
              <Text style={styles.slotLabel}>{slot.label}</Text>
              {slot.required && (
                <View style={styles.requiredBadge}>
                  <Text style={styles.requiredText}>Required</Text>
                </View>
              )}
            </View>
            
            {selectedSlots[slot.id] ? (
              <View style={styles.selectedItem}>
                <Text style={styles.selectedItemText}>
                  {selectedSlots[slot.id]?.original_input_text}
                </Text>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => setSelectedSlots(prev => ({ ...prev, [slot.id]: null }))}
                >
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptySlot}>
                <Text style={styles.emptySlotText}>No item selected</Text>
              </View>
            )}
          </View>
        ))}
      </View>
      
      {/* All Owned Items Grid */}
      {ownedItems.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Items</Text>
          <Text style={styles.sectionSubtitle}>
            Tap any item to add it to a slot above
          </Text>
          <View style={styles.itemsGrid}>
            {ownedItems.map((item) => (
              <TouchableOpacity
                key={item.attire_id}
                style={styles.gridItem}
                onPress={() => {
                  // Auto-select to matching slot based on type
                  const itemType = item.auto_categorized_type?.toLowerCase();
                  const matchingSlot = GARMENT_SLOTS.find(s => 
                    s.id === itemType || 
                    (itemType === 'clothing' && (s.id === 'top' || s.id === 'bottom')) ||
                    (itemType === 'prop' && s.id === 'accessory')
                  );
                  
                  if (matchingSlot) {
                    setSelectedSlots(prev => ({ ...prev, [matchingSlot.id]: item }));
                  }
                }}
              >
                {item.photo_urls && item.photo_urls.length > 0 && item.photo_urls[0] ? (
                  <Image 
                    source={{ uri: item.photo_urls[0] }} 
                    style={styles.gridItemImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.gridItemPlaceholder}>
                    <Ionicons name="shirt-outline" size={24} color={colors.textSecondary} />
                  </View>
                )}
                <Text style={styles.gridItemText} numberOfLines={2}>
                  {item.original_input_text || `${item.auto_categorized_color} ${item.auto_categorized_type}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
      
      {/* AI Suggestions */}
      {suggestedItems.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Suggestions (Based on Character)</Text>
          <Text style={styles.sectionSubtitle}>
            Items matching {character.name}'s colors and style
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionsScroll}>
            {suggestedItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.suggestionCard}
                onPress={() => {
                  // Auto-select to matching slot
                  const itemType = item.auto_categorized_type?.toLowerCase();
                  const matchingSlot = GARMENT_SLOTS.find(s => 
                    s.id === itemType || 
                    (itemType === 'clothing' && (s.id === 'top' || s.id === 'bottom'))
                  );
                  
                  if (matchingSlot) {
                    setSelectedSlots(prev => ({ ...prev, [matchingSlot.id]: item }));
                  }
                }}
              >
                <Text style={styles.suggestionText} numberOfLines={2}>
                  {item.original_input_text}
                </Text>
                <View style={styles.suggestionBadge}>
                  <Text style={styles.suggestionBadgeText}>
                    {item.auto_categorized_type || 'Item'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 100,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
    marginTop: 100,
  },
  
  // Character Card
  characterCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  characterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  characterAvatar: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  characterAvatarText: {
    ...typography.h1,
    color: colors.backgroundLight,
    fontWeight: '700',
  },
  characterInfo: {
    flex: 1,
  },
  characterName: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  characterSeries: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
  colorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  colorsLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  colorDots: {
    flexDirection: 'row',
    gap: 6,
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.backgroundLight,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.primary + '20',
    borderRadius: borderRadius.sm,
  },
  tagText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  
  // Sections
  section: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  
  // Body Type
  bodyTypeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  bodyTypeButton: {
    flex: 1,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
  },
  bodyTypeButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  bodyTypeText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  bodyTypeTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  
  // 3D Preview
  previewContainer: {
    height: PREVIEW_HEIGHT,
    backgroundColor: '#263238',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  
  // Readiness
  readinessCard: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  readinessRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  readinessLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  readinessValue: {
    ...typography.h1,
    fontWeight: 'bold',
    color: colors.warning,
  },
  readinessComplete: {
    color: colors.success,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  
  // Slot Cards
  slotCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  slotLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  requiredBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.error + '20',
    borderRadius: borderRadius.sm,
  },
  requiredText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.error,
  },
  selectedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.success + '10',
    borderRadius: borderRadius.sm,
  },
  selectedItemText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  removeButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.error + '20',
    borderRadius: borderRadius.sm,
  },
  removeButtonText: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '600',
  },
  emptySlot: {
    padding: spacing.sm,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptySlotText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  
  // AI Suggestions
  suggestionsScroll: {
    marginLeft: -spacing.lg,
    paddingLeft: spacing.lg,
  },
  suggestionCard: {
    width: 140,
    padding: spacing.md,
    marginRight: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  suggestionText: {
    ...typography.caption,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    height: 32,
  },
  suggestionBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.secondary + '20',
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  suggestionBadgeText: {
    ...typography.caption,
    color: colors.secondary,
    fontWeight: '600',
    fontSize: 10,
  },
  
  // Items Grid
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  gridItem: {
    width: (SCREEN_WIDTH - spacing.lg * 2 - spacing.md * 2) / 3,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  gridItemImage: {
    width: '100%',
    height: 100,
    backgroundColor: colors.backgroundLight,
  },
  gridItemPlaceholder: {
    width: '100%',
    height: 100,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridItemText: {
    ...typography.caption,
    color: colors.textPrimary,
    padding: spacing.sm,
    height: 40,
  },
});
