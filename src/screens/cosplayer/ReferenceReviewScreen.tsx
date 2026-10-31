import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Button } from '../../components';
import { useUser } from '../../contexts/UserContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useOwnedAttire } from '../../contexts/OwnedAttireContext';
import { OwnedOutfitPanel } from '../../components/OwnedOutfitPanel';
import { planningBriefs } from '../../services/PlanningBriefService';
import { extractReference, referenceReviews } from '../../services/ReferenceExtractionService';
import { componentTypes, correctComponent, newComponent, newReview, reviewTargets, stylesFor, targetColorsBySlot } from '../../utils/referenceReviews';
import type { PlanningBrief } from '../../types/planningBrief';
import type { ComponentValue, ReferenceReview, ReviewedComponent } from '../../types/referenceExtraction';
import palette from '../../data/outfitPalette.json';

function EditSheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) {
  // Keep the web editor within PhoneFrame; native uses the platform modal sheet.
  if (Platform.OS === 'web') return visible ? <View style={{ height: 700 }}>{children}</View> : null;
  return <Modal visible={visible} onRequestClose={onClose} animationType="slide">{children}</Modal>;
}

export function ReferenceReviewScreen({ briefId, onCancel }: { briefId: string; onCancel: () => void }) {
  const { user } = useUser();
  // Remount on account change so another account never sees the previous account's review.
  return <ReviewContent key={`${user?.email}:${briefId}`} account={user?.email} briefId={briefId} onCancel={onCancel} />;
}
function ReviewContent({ account, briefId, onCancel }: { account?: string; briefId: string; onCancel: () => void }) {
  const { themeColors: c } = useTheme();
  const inventory = useOwnedAttire();
  const [brief, setBrief] = useState<PlanningBrief>();
  const [review, setReview] = useState<ReferenceReview>();
  const [stage, setStage] = useState('loading');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<ReviewedComponent>();
  const [value, setValue] = useState<ComponentValue>();
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState('');
  const controller = useRef<AbortController | null>(null);
  const alive = useRef(true);
  const requestId = useRef(0);
  useEffect(() => {
    alive.current = true;
    void (async () => {
      try {
        if (!account) throw new Error('Sign in to analyze a saved brief.');
        const found = (await planningBriefs.list(account)).find(b => b.brief_id === briefId);
        if (!found) throw new Error('Saved brief could not be found.');
        const saved = await referenceReviews.load(account, briefId);
        if (!alive.current) return;
        setBrief(found);
        if (saved && saved.referenceImage !== found.reference_image) throw new Error('The saved reference changed. Restore the original image before opening its components.');
        if (saved) { setReview(saved); setStage('done'); }
        else await analyze(found);
      } catch (e) { if (alive.current) { setError((e as Error).message); setStage('failed'); } }
    })();
    return () => { alive.current = false; requestId.current++; controller.current?.abort(); };
  }, [account, briefId]);

  const analyze = async (selected: PlanningBrief) => {
    const id = ++requestId.current;
    controller.current?.abort(); controller.current = new AbortController();
    setError(''); setMessage(''); setStage('sending');
    try {
      const result = await extractReference(selected.reference_image, controller.current.signal, next => { if (alive.current && id === requestId.current) setStage(next); });
      if (!alive.current || id !== requestId.current) return;
      setReview(newReview(briefId, selected.reference_image, result)); setStage('done');
    } catch (e) { if (alive.current && id === requestId.current) { setError((e as Error).message); setStage('failed'); } }
  };
  const save = async (next: ReferenceReview, success: string): Promise<boolean> => {
    setBusy(true); setError(''); setMessage('');
    try {
      if (!account) throw new Error('Sign in to save components.');
      await referenceReviews.save(account, next);
      if (!alive.current) return false;
      setReview(next); setMessage(success); return true;
    } catch (e) { if (alive.current) setError(`Could not save components. ${(e as Error).message}`); return false; }
    finally { if (alive.current) setBusy(false); }
  };
  const edit = (component: ReviewedComponent) => { setEditing(component); setValue({ ...component.value, colors: [...component.value.colors] }); setMessage(''); };
  const boxImage = brief ? <View style={{ width: '100%', aspectRatio: review?.result ? review.result.image.width / review.result.image.height : 0.7, maxHeight: 470 }}>
    <Image source={{ uri: brief.reference_image }} style={{ width: '100%', height: '100%' }} resizeMode="stretch" />
    {review?.result?.components.map((component, i) => <View key={component.type} style={{ position: 'absolute', left: `${component.zone[0]*100}%`, top: `${component.zone[1]*100}%`, width: `${(component.zone[2]-component.zone[0])*100}%`, height: `${(component.zone[3]-component.zone[1])*100}%`, borderWidth: 2, borderColor: '#FFCE00' }}><Text style={{ backgroundColor: '#000', color: '#FFF', alignSelf: 'flex-start' }}>{i+1}. {component.type}</Text></View>)}
  </View> : null;
  const working = ['loading', 'sending', 'analyzing'].includes(stage);
  const field = (label: string, key: 'name' | 'material' | 'notes') => <><Text style={{ color: c.text }}>{label}</Text><TextInput accessibilityLabel={label} style={{ borderWidth: 1, borderColor: c.border, padding: 12, color: c.text }} value={value?.[key]} onChangeText={text => setValue(previous => previous ? { ...previous, [key]: text } : previous)} /></>;
  return <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
    <Text style={{ color: c.text, fontSize: 22 }}>{preview ? 'Outfit preview' : working ? 'Step 02 · Analyze reference' : 'Step 03 · Component breakdown'}</Text>
    {boxImage}
    <Text accessibilityLiveRegion="polite" style={{ color: c.text }}>{stage === 'sending' ? 'Sending image…' : stage === 'analyzing' ? 'Analyzing…' : stage === 'done' ? 'Done' : stage === 'failed' ? 'Analysis failed' : 'Loading saved brief…'}</Text>
    {working ? <><ActivityIndicator /><Button title="Cancel" onPress={() => { requestId.current++; controller.current?.abort(); onCancel(); }} /></> : null}
    {error ? <Text accessibilityRole="alert" style={{ color: c.error }}>{error}</Text> : null}
    {message ? <Text accessibilityLiveRegion="polite" style={{ color: c.success }}>{message}</Text> : null}
    {stage === 'failed' && brief ? <><Button title="Retry" onPress={() => { void analyze(brief); }} /><Button title="Enter components manually" onPress={() => { setReview(newReview(briefId, brief.reference_image, null)); setStage('done'); setError(''); }} /></> : null}
    {stage === 'done' && review ? <>
      {review.components.map((component, i) => <View key={component.id} style={{ borderWidth: 1, borderColor: c.border, padding: 12, gap: 8 }}>
        <Text style={{ color: c.text }}>{i+1}. {component.value.name} · {component.value.type}</Text>
        <Text style={{ color: c.text }}>{component.value.colors.join(', ') || 'No target colors'} · {component.value.style || 'No style'} · {component.value.plan}</Text>
        <Text style={{ color: c.text }}>Band: {({ low: 'Low', medium: 'Medium', high: 'High' })[component.originalAI?.band ?? 'low']}</Text>
        {component.originalAI?.warnings.length ? <Text style={{ color: c.textSecondary }}>Please check: {component.originalAI.warnings.join(' ')}</Text> : null}
        {component.value.type === 'accessory' ? <Text style={{ color: c.textSecondary }}>Not shown in 3D yet</Text> : null}
        {!review.confirmed ? <Button title={`Edit ${component.value.name} ✎`} variant="secondary" onPress={() => edit(component)} disabled={busy} /> : null}
      </View>)}
      {!review.components.length ? <Text style={{ color: c.text }}>No components yet. Add a missed component to begin.</Text> : null}
      {!review.confirmed ? <><Button title="+ Add missed component" onPress={() => edit(newComponent('accessory'))} disabled={busy} /><Button title="Confirm components" disabled={busy || !review.components.length} onPress={() => { void save({ ...review, confirmed: true }, 'Components confirmed and saved.'); }} /></> : <>
        <Text style={{ color: c.text }}>Confirmed components · locked</Text>
        <Button title="Open outfit preview and wardrobe" onPress={() => setPreview(true)} />
        <Button title="Edit confirmed components" variant="secondary" disabled={busy} onPress={() => { setPreview(false); void save({ ...review, confirmed: false }, 'Component list unlocked for review.'); }} />
      </>}
      {preview && review.confirmed ? <OwnedOutfitPanel accountId={account} projectId={briefId} items={inventory.items} inventoryLoaded={inventory.isLoaded} offline={inventory.isOffline} extractedOutfit={reviewTargets(review)} confirmedTargetColors={targetColorsBySlot(review)} referenceConfirmed confirmedReview={review} onReviewChange={setReview} /> : null}
    </> : null}
    <EditSheet visible={!!editing} onClose={() => { if (!busy) setEditing(undefined); }}>
      <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={{ padding: 24, gap: 16 }} keyboardShouldPersistTaps="handled">
        <Text style={{ color: c.text, fontSize: 22 }}>Step 04 · Edit component</Text>
        {editing && value && review ? <>
          {field('Name', 'name')}
          <Text style={{ color: c.text }}>Component type</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{componentTypes.map(type => <Button key={type} title={type} variant={value.type === type ? 'primary' : 'secondary'} onPress={() => setValue({ ...value, type, style: '' })} />)}</View>
          <Text style={{ color: c.text }}>Target colors (detected first)</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{[...new Set([...(editing.originalAI?.colors.map(color => color.hex) ?? []), ...palette.colors.map(color => color.hex)])].map(hex => <TouchableOpacity accessibilityRole="checkbox" accessibilityLabel={`Target color ${hex}`} accessibilityState={{ checked: value.colors.includes(hex) }} key={hex} onPress={() => setValue({ ...value, colors: value.colors.includes(hex) ? value.colors.filter(color => color !== hex) : [...value.colors, hex] })} style={{ backgroundColor: hex, padding: 10, borderWidth: value.colors.includes(hex) ? 4 : 1, borderColor: c.primary }}><Text style={{ color: '#000', backgroundColor: '#FFF' }}>{hex}{value.colors.includes(hex) ? ' ✓' : ''}</Text></TouchableOpacity>)}</View>
          <Text style={{ color: c.text }}>Style</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{['', ...stylesFor(value.type)].map(style => <Button key={style} title={style || 'No style'} variant={value.style === style ? 'primary' : 'secondary'} onPress={() => setValue({ ...value, style })} />)}</View>
          {field('Material', 'material')}{field('Notes', 'notes')}
          <View style={{ flexDirection: 'row', gap: 8 }}>{(['own', 'buy', 'make'] as const).map(plan => <Button key={plan} title={`${plan === 'own' ? 'Own' : plan === 'buy' ? 'Buy' : 'Make'} it`} variant={value.plan === plan ? 'primary' : 'secondary'} onPress={() => setValue({ ...value, plan })} />)}</View>
          <Text style={{ color: c.textSecondary }}>Own it records your plan only. Wear items from your inventory in the preview.</Text>
          {error ? <Text accessibilityRole="alert" style={{ color: c.error }}>{error}</Text> : null}
          <Button title="Save component" disabled={busy || !value.name.trim()} onPress={() => { const corrected = correctComponent(editing, value); const exists = review.components.some(c => c.id === editing.id); void save({ ...review, components: exists ? review.components.map(c => c.id === editing.id ? corrected : c) : [...review.components, corrected] }, 'Component saved.').then(ok => { if (ok) setEditing(undefined); }); }} />
          <Button title="Delete component" variant="secondary" disabled={busy} onPress={() => { void save({ ...review, components: review.components.filter(c => c.id !== editing.id), deletedComponents: [...review.deletedComponents, editing] }, 'Component deleted.').then(ok => { if (ok) setEditing(undefined); }); }} />
          <Button title="Cancel edit" variant="secondary" disabled={busy} onPress={() => setEditing(undefined)} />
        </> : null}
      </ScrollView>
    </EditSheet>
  </ScrollView>;
}
