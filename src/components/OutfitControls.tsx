/** Shared controls. An empty slot cannot manufacture a costume piece. */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Button } from './buttons/Button';
import { useTheme } from '../contexts/ThemeContext';
import { getSlotDefinitions, getSlotDefaultColor, getColorFromName } from '../utils/outfitStore';
import pieces from '../data/costumePieces.json';
import costumeStyles from '../data/costumeStyles.json';
import { spacing, borderRadius, typography } from '../theme';

interface Props {
  enabledPieces: Set<string>;
  pieceColors: Map<string, string>;
  pieceStyles?: Map<string, Record<string, string>>;
  assignedItems?: Record<string, string | undefined>;
  togglePiece: (slot: string, on: boolean) => void;
  setColor: (slot: string, color: string) => void;
  setStyle?: (slot: string, key: string, value: string) => void;
  wearFull: () => void;
  removeAll: () => void;
  targetColorSwatches?: string[];
  targetColorsBySlot?: Record<string, string[]>;
  disabled?: boolean;
}

function CustomColor({ slot, onChange, disabled }: { slot: string; onChange: (value: string) => void; disabled?: boolean }) {
  const { themeColors: c } = useTheme();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  return <View style={{ gap: spacing.xs }}>
    <View style={styles.row}>
      <TextInput accessibilityLabel={`Custom ${slot} color`} value={value} onChangeText={setValue} placeholder="#RRGGBB or color name" placeholderTextColor={c.textSecondary} autoCapitalize="none" editable={!disabled} style={[styles.input, { color: c.text, borderColor: c.border }]} />
      <Button title="Apply color" disabled={disabled} variant="secondary" onPress={() => {
        const color = getColorFromName(value);
        if (!color) { setError('Enter a hex color such as #34A7B2.'); return; }
        setError(''); onChange(color);
      }} />
    </View>
    {error ? <Text accessibilityRole="alert" style={{ color: c.error }}>{error}</Text> : null}
  </View>;
}

export function OutfitControls({ enabledPieces, pieceColors, pieceStyles = new Map(), assignedItems = {},
  togglePiece, setColor, setStyle, wearFull, removeAll, targetColorSwatches = [], targetColorsBySlot = {}, disabled }: Props) {
  const { themeColors: c } = useTheme();
  return <View style={styles.controls}>
    <View style={styles.row}>
      <Button title="Wear full costume" variant="secondary" onPress={wearFull} disabled={disabled} />
      <Button title="Remove all" variant="secondary" onPress={removeAll} disabled={disabled} />
    </View>
    {getSlotDefinitions().map(definition => {
      const slot = definition.id;
      const on = enabledPieces.has(slot);
      const targets = [...new Set((targetColorsBySlot[slot] ?? targetColorSwatches).map(getColorFromName).filter((color): color is string => !!color))];
      const swatches = [...new Set([...targets, ...pieces.colorPresets])].slice(0, 8);
      const current = getColorFromName(pieceColors.get(slot)) ?? getSlotDefaultColor(slot);
      const styleDefinitions = (costumeStyles as Record<string, any>)[slot];
      return <View key={slot} style={[styles.slot, { borderColor: c.border }]}>
        <TouchableOpacity accessibilityRole="switch" accessibilityLabel={`Show ${definition.label}`} accessibilityState={{ checked: on, disabled: disabled || !assignedItems[slot] }} disabled={disabled || !assignedItems[slot]} onPress={() => togglePiece(slot, !on)} style={[styles.toggle, { backgroundColor: on ? c.primary : c.card }]}>
          <Text style={{ color: on ? c.textOnPrimary : c.text }}>{definition.label}: {on ? 'Shown' : assignedItems[slot] ? 'Hidden' : 'Empty'}</Text>
        </TouchableOpacity>
        {on ? <>
          <Text style={{ color: c.textSecondary }}>Color: {current}</Text>
          {definition.recolor ? <>
            <View style={styles.row}>
              {swatches.map(hex => <TouchableOpacity key={hex} accessibilityRole="button" accessibilityLabel={`${definition.label} color ${hex}`} accessibilityState={{ selected: current === hex }} disabled={disabled} onPress={() => setColor(slot, hex)} style={[styles.swatch, { backgroundColor: hex, borderColor: current === hex ? c.primary : c.border, borderWidth: current === hex ? 3 : 1 }]} />)}
            </View>
            {targets.includes(current) ? <Text style={{ color: c.success }}>Matches character color</Text> : null}
            <CustomColor slot={slot} disabled={disabled} onChange={color => setColor(slot, color)} />
          </> : null}
          {setStyle && styleDefinitions ? Object.entries(styleDefinitions).map(([key, raw]) => {
            const definition = raw as { label?: string; options?: { id: string; label: string }[] };
            return definition.options ? <View key={key} style={styles.row}>
              <Text style={{ color: c.text }}>{definition.label}:</Text>
              {definition.options.map(option => <TouchableOpacity key={option.id} accessibilityRole="button" disabled={disabled} onPress={() => setStyle(slot, key, option.id)} style={[styles.toggle, { borderWidth: 1, borderColor: c.border, backgroundColor: pieceStyles.get(slot)?.[key] === option.id ? c.primaryTint : c.card }]}>
                <Text style={{ color: c.text }}>{option.label}</Text>
              </TouchableOpacity>)}
            </View> : null;
          }) : null}
        </> : null}
      </View>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  controls: { gap: spacing.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  slot: { borderTopWidth: 1, paddingTop: spacing.md, gap: spacing.sm },
  toggle: { alignSelf: 'flex-start', padding: spacing.md, borderRadius: borderRadius.md },
  swatch: { width: 32, height: 32, borderRadius: borderRadius.md },
  input: { ...typography.body, borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.sm, minWidth: 150, flexGrow: 1 },
});
