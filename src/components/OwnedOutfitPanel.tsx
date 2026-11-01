/** Shared by planning and dashboard; inventory and project records remain the source. */
import React, { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { referenceReviews } from '../services/ReferenceExtractionService';
import { correctComponent } from '../utils/referenceReviews';
import { targetLook } from '../utils/targetLook';
import type { ReferenceReview } from '../types/referenceExtraction';
import { useProjects } from '../contexts/ProjectsContext';
import { planningBriefs } from '../services/PlanningBriefService';
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { compareLooks } from '../utils/savedLooks';
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
  confirmedTargetColors?: Partial<Record<OutfitSlot, string[]>>;
  referenceConfirmed?: boolean;
  confirmedReview?: ReferenceReview;
  onReviewChange?: (review: ReferenceReview) => void;
  onInteractionChange?: (active: boolean) => void;
}

export function OwnedOutfitPanel(props: Props) {
  return <OwnedOutfitContent key={`${props.accountId}:${props.projectId}`} {...props} />;
}

function OwnedOutfitContent({ accountId, projectId, items, inventoryLoaded, offline, initialBody = 'female', targetColors = [], extractedOutfit, confirmedTargetColors, referenceConfirmed, confirmedReview, onReviewChange, onInteractionChange }: Props) {
  const { themeColors: c } = useTheme();
  const navigation = useNavigation<any>();
  const projectState = useProjects();
  const project = projectState.projects.find(p => p.project_id === projectId && p.user_id === accountId);
  const referenceId = project?.reference_brief_id ?? projectId;
  const [availableReferences, setAvailableReferences] = useState<{ id: string; name: string }[]>([]);
  const [savedReview, setSavedReview] = useState<ReferenceReview | null>(null);
  const [reviewError, setReviewError] = useState('');
  const [targetOn, setTargetOn] = useState(true);
  const [compareSlot, setCompareSlot] = useState<string | null>(null);
  const [compareView, setCompareView] = useState<'a' | 'b'>('a');
  const [lookName, setLookName] = useState('');
  useFocusEffect(useCallback(() => {
    let active = true;
    setSavedReview(null); setReviewError('');
    if (accountId) void referenceReviews.load(accountId, referenceId).then(value => {
      if (active) setSavedReview(value);
    }).catch(error => { if (active) setReviewError(`Saved reference could not be read. ${error.message}`); });
    if (accountId && project) void planningBriefs.list(accountId).then(async briefs => {
      const candidates = await Promise.all(briefs.map(async brief => {
        try { return (await referenceReviews.load(accountId, brief.brief_id))?.confirmed ? { id: brief.brief_id, name: brief.character_name } : null; }
        catch { return null; }
      }));
      if (active) setAvailableReferences(candidates.filter((value): value is { id: string; name: string } => value !== null));
    }).catch(() => { if (active) setAvailableReferences([]); });
    return () => { active = false; };
  }, [accountId, referenceId, confirmedReview, !!project]));
  const review = reviewError ? null : confirmedReview ?? savedReview;
  const targetPieces = useMemo(() => targetLook(review), [review]);
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
  const ghosts = useMemo(() => new Set(compareSlot ? compareView === 'b' && !enabled.has(compareSlot) ? [compareSlot] : [] : targetOn ? targetPieces.filter(p => !enabled.has(p.id)).map(p => p.id) : []), [compareSlot, compareView, targetOn, targetPieces, enabled]);
  const comparison = wearing.outfit ? compareLooks(wearing.outfit, new Set(items.map(item => item.attire_id)), compareSlot ?? undefined) : null;
  const displayEnabled = useMemo(() => new Set([...enabled, ...ghosts]), [enabled, ghosts]);
  const displayColors = useMemo(() => new Map([...colors, ...targetPieces.filter(p => ghosts.has(p.id)).map(p => [p.id, p.color] as [string, string])]), [colors, targetPieces, ghosts]);
  const displayStyles = useMemo(() => new Map([...stylesBySlot, ...targetPieces.filter(p => ghosts.has(p.id)).map(p => [p.id, p.style] as [string, Record<string, string>])]), [stylesBySlot, targetPieces, ghosts]);
  const targets = useMemo(() => Object.fromEntries(getSlotDefinitions().map(slot => {
    const extracted = extractedOutfit?.slots[slot.id as OutfitSlot];
    return [slot.id, confirmedTargetColors ? confirmedTargetColors[slot.id as OutfitSlot] ?? [] : extracted?.present && extracted.color ? [getColorFromName(extracted.color) ?? extracted.color] : targetColors];
  })), [extractedOutfit, targetColors, confirmedTargetColors]);
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
      <CostumeViewer bodyType={body} enabledPieces={displayEnabled} pieceColors={displayColors} pieceStyles={displayStyles} ghostPieces={ghosts} onInteractionChange={onInteractionChange} />
    </View>
    <TouchableOpacity accessibilityRole="switch" accessibilityLabel="Target look" accessibilityState={{ checked: !!review?.confirmed && targetOn, disabled: !review?.confirmed }} disabled={!review?.confirmed} onPress={() => setTargetOn(value => !value)}><Text style={{ color: c.text }}>Target look: {review?.confirmed && targetOn ? 'On' : 'Off'}</Text></TouchableOpacity>
    {reviewError ? <Text accessibilityRole="alert" style={{ color: c.error }}>{reviewError}</Text> : null}
    {review?.confirmed ? <>
      <Text style={{ color: c.text }}>Target look from your reference – not owned</Text>
      {targetPieces.some(p => p.band === 'low') ? <Text style={{ color: c.textSecondary }}>Low confidence - please check</Text> : null}
      {review.result?.method === 'fallback' ? <Text style={{ color: c.textSecondary }}>Fallback analysis - please check</Text> : null}
      {review.result?.warnings.map((warning, i) => <Text key={i} style={{ color: c.textSecondary }}>{warning}</Text>)}
      {targetPieces.filter(p => ghosts.has(p.id)).map(piece => <View key={piece.id} testID={`target-card-${piece.id}`} style={styles.group}>
        <Text style={{ color: c.text }}>{piece.label} - {piece.description} - Not owned</Text>
        <Text style={{ color: c.textSecondary }}>Band: {piece.band[0].toUpperCase() + piece.band.slice(1)}</Text>
        {piece.note ? <Text style={{ color: c.textSecondary }}>{piece.note}</Text> : null}
        <Button title="Find in Marketplace" variant="secondary" onPress={() => navigation.navigate('Marketplace', { screen: 'MarketplaceHome' })} />
        <Button title={piece.plan === 'make' ? 'Make it selected' : 'Mark as make it'} disabled={busy || piece.plan === 'make'} onPress={() => { void run(async () => {
          if (!accountId) throw new Error('Sign in to update sourcing.');
          const latest = await referenceReviews.load(accountId, referenceId);
          if (!latest?.confirmed) throw new Error('Confirm the reference first.');
          const next = { ...latest, components: latest.components.map(component => component.id === piece.componentId ? correctComponent(component, { ...component.value, plan: 'make' }) : component) };
          await referenceReviews.save(accountId, next); setSavedReview(next); onReviewChange?.(next);
        }, 'Sourcing set to Make it.'); }} />
      </View>)}
      {review.components.filter(component => component.value.type === 'accessory').map(component => <Text key={component.id} style={{ color: c.textSecondary }}>{component.value.name} - Not shown in 3D yet</Text>)}
    </> : <>
      <Text style={{ color: c.textSecondary }}>No confirmed reference for this project. Confirm components to show a target look.</Text>
      <Button title="Back to Analyze" variant="secondary" onPress={() => { void run(async () => {
        if (!accountId) throw new Error('Sign in to analyze a saved brief.');
        const exists = (await planningBriefs.list(accountId)).some(brief => brief.brief_id === referenceId);
        navigation.navigate('Projects', { screen: 'PlanningBrief', params: exists ? { briefId: referenceId } : undefined });
      }); }} />
    </>}
    {project && availableReferences.length ? <View style={styles.group}>
      <Text style={{ color: c.text }}>Confirmed reference for this project</Text>
      {availableReferences.map(reference => <Button key={reference.id} title={`Use reference: ${reference.name}`} variant="secondary" disabled={reference.id === project.reference_brief_id} onPress={() => projectState.setReferenceBrief(projectId, reference.id)} />)}
      {projectState.storageError ? <Text accessibilityRole="alert" style={{ color: c.error }}>{projectState.storageError}</Text> : null}
    </View> : null}
    <Text style={{ color: c.textSecondary }}>Drag to rotate. Pinch to zoom.</Text>
    {review?.confirmed ? <View style={styles.group}>
      <Text style={[styles.heading, { color: c.text }]}>Compare looks</Text>
      <Text style={{ color: c.textSecondary }}>Look A is owned items worn now. Look B adds one hypothetical target piece. A/B uses one 3D viewer.</Text>
      {targetPieces.filter(piece => !enabled.has(piece.id)).map(piece => <Button key={piece.id} title={`Compare missing ${piece.label}`} variant="secondary" onPress={() => { setCompareSlot(piece.id); setCompareView('b'); }} />)}
      {compareSlot && comparison ? <>
        <Text testID="compare-a" style={{ color: c.text }}>Look A: {comparison.a.count} of 5 slots · {comparison.a.percent}%</Text>
        <Text testID="compare-b" style={{ color: c.text }}>Look B: {comparison.b.count} of 5 slots · {comparison.b.percent}% · Hypothetical {targetPieces.find(piece => piece.id === compareSlot)?.label}</Text>
        <Button title="Show Look A" onPress={() => setCompareView('a')} />
        <Button title="Show Look B" onPress={() => setCompareView('b')} />
        <Button title="Use Look B" onPress={() => { setCompareView('b'); setMessage('Hypothetical preview kept. Inventory, worn outfit, budget and readiness are unchanged.'); }} />
        <Button title="Keep Look A" variant="secondary" onPress={() => { setCompareSlot(null); setTargetOn(false); }} />
      </> : null}
    </View> : null}
    <View style={styles.group}>
      <Text style={[styles.heading, { color: c.text }]}>Saved looks</Text>
      <Text style={{ color: c.textSecondary }}>Saved per project.</Text>
      <TextInput accessibilityLabel="Look name" value={lookName} onChangeText={setLookName} placeholder="Con day look" style={{ color: c.text, borderWidth: 1, borderColor: c.border, padding: spacing.sm }} />
      <Button title="Save current look" disabled={disabled} onPress={() => { void run(() => wearing.saveLook(lookName), 'Look saved.'); }} />
      {(wearing.outfit?.savedLooks ?? []).map(look => <View key={look.id}>
        <Button title={`Switch to ${look.name}`} disabled={disabled} variant="secondary" onPress={() => { void run(() => wearing.switchLook(look.id), `Switched to ${look.name}.`); }} />
        {Object.values(look.pieces).some(piece => piece.itemId && !items.some(item => item.attire_id === piece.itemId)) ? <Text style={{ color: c.textSecondary }}>An item in {look.name} was deleted from inventory. Its slot will be empty.</Text> : null}
      </View>)}
      <Button title="Undo" disabled={disabled || !wearing.outfit?.history?.length} onPress={() => { void run(wearing.undo, 'Outfit change undone.'); }} />
    </View>
    {wearing.isLoading || !inventoryLoaded ? <ActivityIndicator color={c.primary} /> : null}
    {wearing.error || actionError ? <>
      <Text accessibilityRole="alert" style={{ color: c.error }}>{wearing.error || actionError}</Text>
      <Button title="Retry loading outfit" variant="secondary" onPress={wearing.reload} />
    </> : null}
    {message ? <Text accessibilityLiveRegion="polite" style={{ color: c.success }}>{message}</Text> : null}
    {offline ? <Text style={{ color: c.textSecondary }}>Showing your cached inventory.</Text> : null}
    {inventoryLoaded && items.length === 0 ? <Text style={{ color: c.text }}>Your inventory is empty. Add your own items to start wearing them.</Text> : null}
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
        {reference ? <Text style={{ color: c.textSecondary }}>Reference: {reference.color ?? 'no color'} · {reference.keywords.join(', ') || 'no style'} · {reference.confidence} band</Text> : null}
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
    <Text style={{ color: c.textSecondary }}>{referenceConfirmed ? 'Confirmed reference components supply your target colors and styles.' : extractedOutfit ? 'Reference targets use supplied extractor output.' : 'No extracted reference data is available. Only supplied character colors are suggested.'}</Text>
    {referenceConfirmed ? extractedOutfit?.unmapped.map((name, index) => <Text key={`${name}:${index}`} style={{ color: c.textSecondary }}>{name} — Not shown in 3D yet</Text>) : null}
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
