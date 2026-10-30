/**
 * OutfitControls - Shared costume piece toggles and color pickers
 * Used by ProjectDashboardScreen and ProjectPlanningScreen
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Button } from './buttons/Button';
import { colors, typography, spacing, borderRadius } from '../theme';
import colorNames from '../data/colorNames.json';

// Load costume pieces data for default colors
const costumePiecesData = require('../data/costumePieces.json');

const getSlotDefaultColor = (slot: string): string => {
  const piece = costumePiecesData.pieces.find((p: any) => p.id === slot);
  return piece?.defaultColor || '#FFFFFF';
};

interface OutfitControlsProps {
  /** Set of enabled piece slots */
  enabledPieces: Set<string>;
  /** Map of slot -> hex color */
  pieceColors: Map<string, string>;
  /** Callback to toggle a piece on/off */
  togglePiece: (slot: string, on: boolean) => void;
  /** Callback to set a piece's color */
  setColor: (slot: string, color: string) => void;
  /** Callback to wear full costume */
  wearFull: () => void;
  /** Callback to remove all pieces */
  removeAll: () => void;
  /** Optional target color swatches (character's targetColors) */
  targetColorSwatches?: string[];
}

export const OutfitControls: React.FC<OutfitControlsProps> = ({
  enabledPieces,
  pieceColors,
  togglePiece,
  setColor,
  wearFull,
  removeAll,
  targetColorSwatches = [],
}) => {
  return (
    <View style={styles.costumeControls}>
      {/* Piece toggles and color pickers */}
      <View style={styles.controlsGrid}>
        {['top', 'bottom', 'shoes', 'gloves', 'wig'].map((slot) => {
          const isOn = enabledPieces.has(slot);
          const currentColor = pieceColors.get(slot) || getSlotDefaultColor(slot);
          
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
          size="small"
        />
        <Button
          title="Remove All"
          onPress={() => { void removeAll(); }}
          variant="secondary"
          size="small"
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
});
