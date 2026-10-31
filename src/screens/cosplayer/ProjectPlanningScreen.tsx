/**
 * Project Planning Screen
 * 
 * COSTUME-7C-2: V2 outfit planning with CostumeViewer and shared OutfitControls.
 * - Shows character info (name, series, colors)
 * - CostumeViewer with enabled pieces and colors from useOutfit (per-body scope)
 * - Male/Female selector drives the viewer
 * - Your Items grid: tap to switch matching V2 slot on and set color
 * - Outfit state uses per-body scope (no projectId available on this screen)
 * 
 * WEAR-2: Added variant selection with chips.
 * - Variants come from variants.json filtered by character_id
 * - Target colors come from variantTargetColors.json per selected variant
 * - Selected variant persists per body type in AsyncStorage
 * - Screen title shows "<Character> – <Variant>"
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOwnedAttire } from '../../contexts/OwnedAttireContext';
import { useUserCharacters } from '../../contexts/UserCharactersContext';
import { useOutfit } from '../../hooks/useOutfit';
import type { OwnedAttire } from '../../types/owned-attire';
import type { Variant } from '../../types/catalog';
import { BaseBodySelection } from '../../constants/bodyType';
import CostumeViewer from '../../components/CostumeViewer';
import { OutfitControls } from '../../components/OutfitControls';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { applyItemToOutfit, canMapItemToPiece, getUnmappedItemMessage } from '../../utils/outfitHelpers';
import { getAllVariantColors } from '../../utils/variantColors';
import variantsData from '../../data/variants.json';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ProjectPlanningScreenProps {
  navigation: any;
  route?: any;
}

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
  const [bodyType, setBodyType] = useState<BaseBodySelection>('female');
  
  // WEAR-2: Find character's catalog ID to load variants
  // For user-created characters, we don't have catalog variants
  // So we'll use a placeholder approach: check if character.series contains recognizable names
  const catalogCharacterId = useMemo(() => {
    if (!character) return null;
    // Try to match by name (simple approach)
    if (character.name.toLowerCase().includes('gojo')) return 'char-jujutsu-kaisen-gojo';
    if (character.name.toLowerCase().includes('makima')) return 'char-chainsaw-man-makima';
    if (character.name.toLowerCase().includes('zelda')) return 'char-zelda-botw-zelda';
    if (character.name.toLowerCase().includes('veira') || character.name.toLowerCase().includes('veyra')) return 'char-original-veira';
    return null;
  }, [character]);
  
  // WEAR-2: Load variants for this character
  const characterVariants = useMemo(() => {
    if (!catalogCharacterId) return [];
    return (variantsData as Variant[]).filter(v => v.character_id === catalogCharacterId);
  }, [catalogCharacterId]);
  
  // WEAR-2: Selected variant state (persists per body type)
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  
  // WEAR-2: Load saved variant selection on mount
  useEffect(() => {
    const loadVariantSelection = async () => {
      if (characterVariants.length === 0) return;
      
      try {
        const key = `@forgemind:wear-variant:${bodyType}`;
        const saved = await AsyncStorage.getItem(key);
        if (saved && characterVariants.some(v => v.variant_id === saved)) {
          setSelectedVariantId(saved);
        } else {
          // Default to first variant
          setSelectedVariantId(characterVariants[0].variant_id);
        }
      } catch (error) {
        console.error('[ProjectPlanning] Failed to load variant selection:', error);
        setSelectedVariantId(characterVariants[0]?.variant_id || null);
      }
    };
    
    loadVariantSelection();
  }, [characterVariants, bodyType]);
  
  // WEAR-2: Save variant selection when it changes
  const handleVariantSelect = useCallback(async (variantId: string) => {
    setSelectedVariantId(variantId);
    
    try {
      const key = `@forgemind:wear-variant:${bodyType}`;
      await AsyncStorage.setItem(key, variantId);
      console.log(`[ProjectPlanning] Saved variant selection: ${variantId}`);
    } catch (error) {
      console.error('[ProjectPlanning] Failed to save variant selection:', error);
    }
  }, [bodyType]);
  
  // WEAR-2: Get target colors from selected variant
  const targetColors = useMemo(() => {
    if (selectedVariantId) {
      return getAllVariantColors(selectedVariantId);
    }
    // Fallback to character's targetColors
    return character?.targetColors || [];
  }, [selectedVariantId, character]);
  
  // WEAR-2: Get selected variant name for title
  const selectedVariant = useMemo(() => {
    return characterVariants.find(v => v.variant_id === selectedVariantId);
  }, [characterVariants, selectedVariantId]);
  
  // COSTUME-7C-2: useOutfit with per-body scope (no projectId on this screen)
  const { outfit, isLoading: outfitLoading, togglePiece, setColor, setStyle, wearFull, removeAll } = useOutfit(bodyType);
  
  // Convert outfit to Sets/Maps for CostumeViewer
  const enabledPieces = useMemo(() => {
    if (!outfit) return new Set<string>();
    return new Set(Object.entries(outfit.pieces).filter(([_, p]) => p.on).map(([slot]) => slot));
  }, [outfit]);
  
  const pieceColors = useMemo(() => {
    if (!outfit) return new Map<string, string>();
    return new Map(Object.entries(outfit.pieces).map(([slot, p]) => [slot, p.color]));
  }, [outfit]);
  
  const pieceStyles = useMemo(() => {
    if (!outfit) return new Map<string, Record<string, string>>();
    return new Map(Object.entries(outfit.pieces).map(([slot, p]) => [slot, p.style || {}]));
  }, [outfit]);
  
  // Separate owned items into mapped and unmapped
  // COSTUME-7C-3: Exclude belt slot (accessories) from mapping on this screen
  const { mappedItems, unmappedItems } = useMemo(() => {
    const mapped: OwnedAttire[] = [];
    const unmapped: OwnedAttire[] = [];
    
    for (const item of ownedItems) {
      if (canMapItemToPiece(item, ['belt'])) {
        mapped.push(item);
      } else {
        unmapped.push(item);
      }
    }
    
    return { mappedItems: mapped, unmappedItems: unmapped };
  }, [ownedItems]);
  
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
            {/* WEAR-2: Title shows "Character – Variant" */}
            <Text style={styles.characterName}>
              {character.name}{selectedVariant ? ` – ${selectedVariant.variant_name}` : ''}
            </Text>
            <Text style={styles.characterSeries}>{character.series}</Text>
          </View>
        </View>
        
        {/* Target Colors (WEAR-2: now from variant) */}
        {targetColors.length > 0 ? (
          <View style={styles.colorsRow}>
            <Text style={styles.colorsLabel}>Target Colors:</Text>
            <View style={styles.colorDots}>
              {targetColors.map((color, i) => (
                <View
                  key={i}
                  style={[styles.colorDot, { backgroundColor: color }]}
                />
              ))}
            </View>
          </View>
        ) : null}
        
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
      
      {/* Outfit Controls */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Outfit Controls</Text>
        <OutfitControls
          enabledPieces={enabledPieces}
          pieceColors={pieceColors}
          pieceStyles={pieceStyles}
          togglePiece={togglePiece}
          setColor={setColor}
          setStyle={setStyle}
          wearFull={wearFull}
          removeAll={removeAll}
          targetColorSwatches={targetColors}
          variants={characterVariants}
          selectedVariantId={selectedVariantId}
          onVariantSelect={handleVariantSelect}
        />
      </View>
      
      {/* 3D Preview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3D Preview (Drag to Rotate)</Text>
        <View style={styles.previewContainer}>
          <CostumeViewer
            bodyType={bodyType}
            enabledPieces={enabledPieces}
            pieceColors={pieceColors}
            pieceStyles={pieceStyles}
          />
        </View>
      </View>
      
      {/* Your Items Grid (Mapped) */}
      {mappedItems.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Items</Text>
          <Text style={styles.sectionSubtitle}>
            Tap any item to switch it on and set its color
          </Text>
          <View style={styles.itemsGrid}>
            {mappedItems.map((item) => {
              const suggestion = applyItemToOutfit(item);
              
              return (
                <TouchableOpacity
                  key={item.attire_id}
                  style={styles.gridItem}
                  onPress={() => {
                    if (suggestion) {
                      void togglePiece(suggestion.slot, true);
                      void setColor(suggestion.slot, suggestion.color);
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
              );
            })}
          </View>
        </View>
      )}
      
      {/* Unmapped Items */}
      {unmappedItems.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Not shown in 3D yet</Text>
          <View style={styles.itemsGrid}>
            {unmappedItems.map((item) => (
              <View key={item.attire_id} style={[styles.gridItem, styles.gridItemUnmapped]}>
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
                <Text style={styles.unmappedLabel}>
                  {getUnmappedItemMessage(item)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
      
      {/* WEAR-2: Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          3D pieces are simple colored shapes, not exact replicas of your items.
        </Text>
      </View>
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
    height: 400,
    backgroundColor: '#263238',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
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
  gridItemUnmapped: {
    opacity: 0.6,
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
    minHeight: 40,
  },
  unmappedLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    fontSize: 10,
    fontStyle: 'italic',
  },
  // WEAR-2: Footer
  footer: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
