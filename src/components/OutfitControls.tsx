/**
 * OutfitControls - Shared costume piece toggles and color pickers
 * Used by ProjectDashboardScreen and ProjectPlanningScreen
 * 
 * WEAR-2: Added variant chip selection
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Button } from './buttons/Button';
import { colors, typography, spacing, borderRadius } from '../theme';
import colorNames from '../data/colorNames.json';
import type { Variant } from '../types/catalog';

// Load costume pieces and styles data for defaults
const costumePiecesData = require('../data/costumePieces.json');
const costumeStyles = require('../data/costumeStyles.json');

const getSlotDefaultColor = (slot: string): string => {
  const piece = costumePiecesData.pieces.find((p: any) => p.id === slot);
  return piece?.defaultColor || '#FFFFFF';
};

interface OutfitControlsProps {
  /** Set of enabled piece slots */
  enabledPieces: Set<string>;
  /** Map of slot -> hex color */
  pieceColors: Map<string, string>;
  /** Map of slot -> style map */
  pieceStyles?: Map<string, Record<string, string>>;
  /** Callback to toggle a piece on/off */
  togglePiece: (slot: string, on: boolean) => void;
  /** Callback to set a piece's color */
  setColor: (slot: string, color: string) => void;
  /** Callback to set a piece's style option */
  setStyle?: (slot: string, styleKey: string, styleValue: string) => void;
  /** Callback to wear full costume */
  wearFull: () => void;
  /** Callback to remove all pieces */
  removeAll: () => void;
  /** Optional target color swatches (character's targetColors) */
  targetColorSwatches?: string[];
  /** WEAR-2: Character variants for chip selection */
  variants?: Variant[];
  /** WEAR-2: Currently selected variant ID */
  selectedVariantId?: string | null;
  /** WEAR-2: Callback when variant is selected */
  onVariantSelect?: (variantId: string) => void;
}

export const OutfitControls: React.FC<OutfitControlsProps> = ({
  enabledPieces,
  pieceColors,
  pieceStyles = new Map(),
  togglePiece,
  setColor,
  setStyle,
  wearFull,
  removeAll,
  targetColorSwatches = [],
  variants = [],
  selectedVariantId = null,
  onVariantSelect,
}) => {
  return (
    <View style={styles.costumeControls}>
      {/* WEAR-2: Variant chips */}
      {variants.length > 0 && onVariantSelect ? (
        <View style={styles.variantChipsContainer}>
          <Text style={styles.variantChipsLabel}>Look variant:</Text>
          <View style={styles.variantChipsBar}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.variantChipsScroll}
              contentContainerStyle={styles.variantChipsContent}
            >
              {variants.map((variant) => {
                const isSelected = variant.variant_id === selectedVariantId;
                return (
                  <TouchableOpacity
                    key={variant.variant_id}
                    style={[styles.variantChip, isSelected && styles.variantChipSelected]}
                    onPress={() => onVariantSelect(variant.variant_id)}
                  >
                    <Text
                      style={[styles.variantChipText, isSelected && styles.variantChipTextSelected]}
                      numberOfLines={1}
                    >
                      {variant.variant_name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      ) : null}
      
      {/* Piece toggles and color pickers */}
      <View style={styles.controlsGrid}>
        {['top', 'bottom', 'shoes', 'gloves', 'wig'].map((slot) => {
          const isOn = enabledPieces.has(slot);
          const currentColor = pieceColors.get(slot) || getSlotDefaultColor(slot);
          const currentStyles = pieceStyles.get(slot) || {};
          const slotStyleDefs = (costumeStyles as any)[slot];
          
          return (
            <View key={slot} style={styles.controlRow}>
              <TouchableOpacity
                style={[styles.toggleButton, isOn && styles.toggleButtonOn]}
                onPress={() => { void togglePiece(slot, !isOn); }}
              >
                <Text style={[styles.toggleText, isOn && styles.toggleTextOn]}>
                  {slot.charAt(0).toUpperCase() + slot.slice(1)}
                </Text>
              </TouchableOpacity>
              
              {isOn && (
                <>
                  <View style={styles.colorPickerRow}>
                    <View style={[styles.currentColorSwatch, { backgroundColor: currentColor }]} />
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.swatchScroll}>
                      {/* Target color swatches */}
                      {targetColorSwatches.map((colorName, idx) => {
                        const colorNamesMap = colorNames as any;
                        const hexColor = colorNamesMap[colorName.toLowerCase()] || colorName;
                        return (
                          <TouchableOpacity
                            key={`target-${idx}`}
                            style={[styles.colorSwatch, { backgroundColor: hexColor }]}
                            onPress={() => { void setColor(slot, hexColor); }}
                          />
                        );
                      })}
                      {/* Additional common colors */}
                      {['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFFFFF', '#000000'].map((hex) => (
                        <TouchableOpacity
                          key={hex}
                          style={[styles.colorSwatch, { backgroundColor: hex }]}
                          onPress={() => { void setColor(slot, hex); }}
                        />
                      ))}
                    </ScrollView>
                  </View>
                  
                  {/* Style options */}
                  {setStyle && slotStyleDefs && Object.entries(slotStyleDefs).map(([styleKey, styleDef]) => {
                    if (styleKey === 'config' || !styleDef || typeof styleDef !== 'object') return null;
                    const def = styleDef as { label?: string; options?: Array<{ id: string; label: string }> };
                    if (!def.options) return null;
                    
                    return (
                      <View key={styleKey} style={styles.styleRow}>
                        <Text style={styles.styleLabel}>{def.label}:</Text>
                        <View style={styles.styleChips}>
                          {def.options.map((opt) => {
                            const isActive = currentStyles[styleKey] === opt.id;
                            return (
                              <TouchableOpacity
                                key={opt.id}
                                style={[styles.styleChip, isActive && styles.styleChipActive]}
                                onPress={() => { void setStyle(slot, styleKey, opt.id); }}
                              >
                                <Text style={[styles.styleChipText, isActive && styles.styleChipTextActive]}>
                                  {opt.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })}
                </>
              )}
            </View>
          );
        })}
      </View>
      
      {/* Action buttons */}
      <View style={styles.actionButtons}>
        <Button
          title="Wear full costume"
          onPress={() => { void wearFull(); }}
          variant="secondary"
        />
        <Button
          title="Remove All"
          onPress={() => { void removeAll(); }}
          variant="secondary"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  costumeControls: {
    marginBottom: spacing.lg,
  },
  controlsGrid: {
    gap: spacing.md,
  },
  controlRow: {
    marginBottom: spacing.sm,
  },
  toggleButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'flex-start',
  },
  toggleButtonOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toggleText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  toggleTextOn: {
    color: '#FFFFFF',
  },
  colorPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    flexWrap: 'wrap',
  },
  currentColorSwatch: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  swatchScroll: {
    flex: 1,
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    marginRight: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    flexWrap: 'wrap',
  },
  styleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    flexWrap: 'wrap',
  },
  styleLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  styleChips: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  styleChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  styleChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  styleChipText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  styleChipTextActive: {
    color: '#FFFFFF',
  },
  // WEAR-2: Variant chips styles
  variantChipsContainer: {
    marginBottom: spacing.md,
  },
  variantChipsLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  variantChipsBar: {
    height: 56,
    overflow: 'hidden',
  },
  variantChipsScroll: {
    flex: 1,
  },
  variantChipsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  variantChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 120,
  },
  variantChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  variantChipText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  variantChipTextSelected: {
    color: '#FFFFFF',
  },
});
