/** Shared by planning and dashboard; inventory and project records remain the source. */
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BodyTypeSelector } from './BodyTypeSelector';
import CostumeViewer from './CostumeViewer';
import { OutfitControls } from './OutfitControls';
import { Button } from './buttons/Button';
import { useOutfit } from '../hooks/useOutfit';
import { useTheme } from '../contexts/ThemeContext';
import type { BaseBodySelection } from '../constants/bodyType';
import type { OwnedAttire } from '../types/owned-attire';
import type { ExtractedOutfit, OutfitSlot } from '../types/extractedOutfit';
import { getSlotDefinitions, getSlotForItem, getColorFromName } from '../utils/outfitStore';
import { SHOWN_IN_3D_SLOTS, NOT_SHOWN_YET_SLOTS } from '../constants/slots';
import { borderRadius, spacing, typography } from '../theme';

interface Props {
  accountId?: string;
  projectId: string;
  items: OwnedAttire[];
  inventoryLoaded: boolean;
  offline?: boolean;
  initialBody?: BaseBodySelection;
  targetColors?: string[];
  extractedOutfit?: ExtractedOutfit;
  onInteractionChange?: (active: boolean) => void;
}

export function OwnedOutfitPanel(props: Props) {
  return <OwnedOutfitContent key={`${props.accountId}:${props.projectId}`} {...props} />;
}

function OwnedOutfitContent({ accountId, projectId, items, inventoryLoaded, offline, initialBody = 'female', targetColors = [], extractedOutfit, onInteractionChange }: Props) {
  const { themeColors: c } = useTheme();
  const [body, setBody] = useState(initialBody);
  const [filter, setFilter] = useState('all');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const wearing = useOutfit(body, projectId, accountId, items);
  const pieces = wearing.outfit?.pieces ?? {};
  const enabled = useMemo(() => new Set(Object.entries(pieces).filter(([, p]) => p.on && !!p.itemId).map(([id]) => id)), [wearing.outfit]);
  const colors = useMemo(() => new Map(Object.entries(pieces).map(([id, p]) => [id, p.color])), [wearing.outfit]);
  const stylesBySlot = useMemo(() => new Map(Object.entries(pieces).map(([id, p]) => [id, p.style ?? {}])), [wearing.outfit]);
  const targets = useMemo(() => Object.fromEntries(getSlotDefinitions().map(slot => {
    const extracted = extractedOutfit?.slots[slot.id as OutfitSlot];
    return [slot.id, extracted?.present && extracted.color ? [getColorFromName(extracted.color) ?? extracted.color] : targetColors];
  })), [extractedOutfit, targetColors]);
  const unsupported = items.filter(item => !getSlotForItem(item));
  const run = async (action: () => Promise<unknown>, success?: string) => {
    setBusy(true); setMessage(''); setActionError('');
    try {
      const result = await action();
      setMessage(typeof result === 'string' ? result : success ?? 'Outfit updated.');
    } catch (error) { setActionError((error as Error).message); }
    finally { setBusy(false); }
  };
  const disabled = busy || !accountId || !inventoryLoaded || wearing.isLoading || !!wearing.error;
  return <View style={[styles.panel, { backgroundColor: c.background }]}>
    <BodyTypeSelector value={body} onChange={setBody} showCaption={false} />
    <View style={styles.viewer}>
      <CostumeViewer bodyType={body} enabledPieces={enabled} pieceColors={colors} pieceStyles={stylesBySlot} onInteractionChange={onInteractionChange} />
    </View>
    <Text style={{ color: c.textSecondary }}>Drag to rotate. Pinch to zoom.</Text>
    {wearing.isLoading || !inventoryLoaded ? <ActivityIndicator color={c.primary} /> : null}
    {wearing.error || actionError ? <>
      <Text accessibilityRole="alert" style={{ color: c.error }}>{wearing.error || actionError}</Text>
      <Button title="Retry loading outfit" variant="secondary" onPress={wearing.reload} />
    </> : null}
    {message ? <Text accessibilityLiveRegion="polite" style={{ color: c.success }}>{message}</Text> : null}
    {offline ? <Text style={{ color: c.textSecondary }}>Showing your cached inventory.</Text> : null}
    {inventoryLoaded && items.length === 0 ? <Text style={{ color: c.text }}>Your inventory is empty. Add your own items to start wearing them. Empty slots stay bare.</Text> : null}
    <OutfitControls enabledPieces={enabled} pieceColors={colors} pieceStyles={stylesBySlot}
      assignedItems={Object.fromEntries(Object.entries(pieces).map(([id, p]) => [id, p.itemId]))}
      togglePiece={(slot, on) => { void run(() => wearing.togglePiece(slot, on)); }}
      setColor={(slot, color) => { void run(() => wearing.setColor(slot, color)); }}
      setStyle={(slot, key, value) => { void run(() => wearing.setStyle(slot, key, value)); }}
      wearFull={() => { void run(wearing.wearFull, 'Your available inventory pieces are now shown.'); }}
      removeAll={() => { void run(wearing.removeAll, 'All pieces removed.'); }}
      targetColorsBySlot={targets} disabled={disabled} />
    <Text style={[styles.heading, { color: c.text }]}>Your wardrobe</Text>
    <View style={styles.row}>
      {[{ id: 'all', label: 'All' }, ...getSlotDefinitions()].map(slot => <TouchableOpacity key={slot.id} accessibilityRole="button" accessibilityLabel={`Filter ${slot.label}`} accessibilityState={{ selected: filter === slot.id }} onPress={() => setFilter(slot.id)} style={[styles.chip, { backgroundColor: filter === slot.id ? c.primaryTint : c.card, borderColor: c.border }]}><Text style={{ color: c.text }}>{slot.label}</Text></TouchableOpacity>)}
    </View>
    {getSlotDefinitions().filter(slot => filter === 'all' || filter === slot.id).map(slot => {
      const group = items.filter(item => getSlotForItem(item) === slot.id);
      const reference = extractedOutfit?.slots[slot.id as OutfitSlot];
      return <View key={slot.id} style={styles.group}>
        <Text style={[styles.heading, { color: c.text }]}>{slot.label}</Text>
        {reference ? <Text style={{ color: c.textSecondary }}>Reference: {reference.color ?? 'no color'} · {reference.keywords.join(', ') || 'no style'} · {reference.confidence} confidence (deterministic baseline)</Text> : null}
        {group.length === 0 ? <Text style={{ color: c.textSecondary }}>No owned item for this slot.</Text> : null}
        {group.map(item => {
          const worn = pieces[slot.id]?.on && pieces[slot.id]?.itemId === item.attire_id;
          const label = item.original_input_text || `${item.auto_categorized_color} ${item.auto_categorized_type}`;
          const photo = item.photo_urls?.find(uri => !!uri);
          return <TouchableOpacity key={item.attire_id} accessibilityRole="button" accessibilityLabel={`Wear ${label}`} accessibilityState={{ selected: !!worn, disabled }} disabled={disabled} onPress={() => { void run(() => wearing.wearItem(item)); }} style={[styles.item, { backgroundColor: worn ? c.primaryTint : c.card, borderColor: worn ? c.primary : c.border }]}>
            {photo ? <Image source={{ uri: photo }} style={styles.photo} /> : null}
            <Text style={{ color: c.text }}>{label}{worn ? ' · Worn' : ''}</Text>
          </TouchableOpacity>;
        })}
      </View>;
    })}
    <Text style={{ color: c.textSecondary }}>{extractedOutfit ? 'Reference targets use supplied deterministic extractor output. No new image analysis was run.' : 'No extracted reference data is available. Only supplied character colors are suggested.'}</Text>
    <Text style={[styles.heading, { color: c.text }]}>Not shown in 3D yet</Text>
    <Text style={{ color: c.textSecondary }}>{NOT_SHOWN_YET_SLOTS.join(', ')}. These remain in the checklist and budget.</Text>
    {unsupported.map(item => <Text key={item.attire_id} style={{ color: c.textSecondary }}>{item.original_input_text || item.auto_categorized_type} — Not shown in 3D yet</Text>)}
    <Text style={{ color: c.textSecondary }}>Shown in 3D: {SHOWN_IN_3D_SLOTS.join(', ')}.</Text>
    <Text style={{ color: c.textSecondary }}>3D pieces are simple colored shapes, not exact replicas of your items.</Text>
  </View>;
}

const styles = StyleSheet.create({
  panel: { gap: spacing.md },
  viewer: { height: 390, width: '100%', minWidth: 0, overflow: 'hidden', borderRadius: borderRadius.lg },
  heading: { ...typography.h3 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { borderWidth: 1, borderRadius: borderRadius.full, padding: spacing.sm },
  group: { gap: spacing.sm },
  item: { borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.md, gap: spacing.sm, flexDirection: 'row', alignItems: 'center' },
  photo: { width: 44, height: 44, borderRadius: borderRadius.sm },
});
