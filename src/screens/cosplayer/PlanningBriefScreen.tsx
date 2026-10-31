import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Button } from '../../components';
import { DateInput } from '../../components/inputs/DateInput';
import { useUser } from '../../contexts/UserContext';
import { useTheme } from '../../contexts/ThemeContext';
import { planningBriefs } from '../../services/PlanningBriefService';
import type { PlanningBrief, PlanningSkill } from '../../types/planningBrief';
import { MAX_REFERENCE_BYTES, parsePlanningBudget } from '../../utils/planningBriefs';
import { getTodayLocal } from '../../utils/dateHelpers';
import { borderRadius, spacing, typography } from '../../theme';

interface Props {
  briefId?: string;
  onSaved: () => void;
}

export function PlanningBriefScreen({ briefId, onSaved }: Props) {
  const { user } = useUser();
  const { themeColors: c } = useTheme();
  const account = user?.email;
  const currentAccount = useRef(account);
  currentAccount.current = account;
  const [loadedAccount, setLoadedAccount] = useState<string>();
  const [name, setName] = useState('');
  const [reference, setReference] = useState('');
  const [skill, setSkill] = useState<PlanningSkill>('beginner');
  const [budget, setBudget] = useState('');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const today = getTodayLocal();

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadFailed(false);
    setError('');
    setName(''); setReference(''); setSkill('beginner'); setBudget(''); setDate('');
    const load = async () => {
      try {
        if (!account) throw new Error('Sign in to create a project brief.');
        if (briefId) {
          const brief = (await planningBriefs.list(account)).find(item => item.brief_id === briefId);
          if (!brief) throw new Error('This project brief could not be found.');
          if (!active) return;
          applyBrief(brief);
        }
        if (active) setLoadedAccount(account);
      } catch (err) {
        if (active) { setError((err as Error).message); setLoadFailed(true); }
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [account, briefId]);

  const applyBrief = (brief: PlanningBrief) => {
    setName(brief.character_name); setReference(brief.reference_image);
    setSkill(brief.skill_level); setBudget(String(brief.budget)); setDate(brief.target_date);
  };

  const pickImage = async () => {
    setError('');
    setBusy(true);
    try {
      // Launch directly from the press handler: web blocks pickers after permission awaits.
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], base64: true, quality: 0.6, allowsEditing: false,
      });
      if (currentAccount.current !== account || result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.base64) throw new Error('The reference image could not be read. Try another image.');
      if (asset.base64.length > Math.ceil(MAX_REFERENCE_BYTES / 3) * 4) {
        throw new Error('Choose a smaller reference image (up to 1 MB).');
      }
      // Native ImagePicker base64 is JPEG; web retains the selected file format.
      const mime = Platform.OS === 'web' ? asset.mimeType : 'image/jpeg';
      if (!mime || !['image/jpeg', 'image/png', 'image/webp'].includes(mime)) {
        throw new Error('Choose a JPEG, PNG or WebP reference image.');
      }
      setReference(`data:${mime};base64,${asset.base64}`);
    } catch (err) {
      if (currentAccount.current === account) setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setError('');
    setBusy(true);
    try {
      if (!account || account !== loadedAccount) throw new Error('Sign in to save your brief.');
      const amount = parsePlanningBudget(budget);
      if (amount === null) throw new Error('Enter a budget of zero or more pesos, with up to two decimal places.');
      await planningBriefs.save(account, {
        character_name: name, reference_image: reference, skill_level: skill,
        budget: amount, target_date: date,
      }, today, briefId);
      if (currentAccount.current === account) onSaved();
    } catch (err) {
      if (currentAccount.current === account) setError(`Could not save brief. ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  if (loading || account !== loadedAccount && !loadFailed) {
    return <View style={[styles.center, { backgroundColor: c.background }]}><ActivityIndicator color={c.primary} /></View>;
  }
  if (loadFailed) return <View style={[styles.center, { backgroundColor: c.background }]}><Text style={{ color: c.error }}>{error}</Text></View>;

  const inputStyle = [styles.input, { backgroundColor: c.raised, borderColor: c.border, color: c.text }];
  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={[styles.eyebrow, { color: c.primary }]}>PROJECT PLANNING · STEP 1 OF 10</Text>
      <Text style={[styles.title, { color: c.text }]}>Start with a clear brief</Text>
      <Text style={[styles.body, { color: c.textSecondary }]}>Add the look you want to build and the time and budget you have.</Text>
      <Text style={[styles.label, { color: c.text }]}>Character and outfit name</Text>
      <TextInput accessibilityLabel="Character and outfit name" style={inputStyle} value={name} onChangeText={setName} maxLength={200} placeholder="e.g. Gojo Satoru — Season 2 Uniform" placeholderTextColor={c.textSecondary} editable={!busy} />

      <Text style={[styles.label, { color: c.text }]}>Reference image</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={reference ? 'Replace reference image' : 'Choose reference image'} style={[styles.imageBox, { borderColor: c.border, backgroundColor: c.card }]} onPress={pickImage} disabled={busy}>
        {reference ? <Image source={{ uri: reference }} style={styles.image} resizeMode="contain" /> : <Text style={{ color: c.primary }}>+ Choose reference image</Text>}
      </TouchableOpacity>
      <Text style={[styles.body, { color: c.textSecondary }]}>Use a clear view of the whole outfit. JPEG, PNG or WebP, up to 1 MB. {reference ? 'Tap the image to replace it.' : ''}</Text>

      <Text style={[styles.label, { color: c.text }]}>Skill level</Text>
      <View style={styles.skills}>
        {(['beginner', 'intermediate', 'advanced'] as const).map(option => (
          <TouchableOpacity key={option} accessibilityRole="radio" accessibilityState={{ selected: skill === option }} disabled={busy} onPress={() => setSkill(option)} style={[styles.skill, { borderColor: skill === option ? c.primary : c.border, backgroundColor: skill === option ? c.primaryTint : c.card }]}>
            <Text style={{ color: skill === option ? c.primary : c.text, textTransform: 'capitalize' }}>{option}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[styles.label, { color: c.text }]}>Budget (₱)</Text>
      <TextInput accessibilityLabel="Budget in Philippine pesos" style={inputStyle} value={budget} onChangeText={setBudget} placeholder="e.g. 5000.00" placeholderTextColor={c.textSecondary} keyboardType="decimal-pad" editable={!busy} />
      <DateInput label="Target date" value={date} onChange={setDate} minDate={today} />
      {error ? <Text accessibilityRole="alert" style={[styles.body, { color: c.error }]}>{error}</Text> : null}
      <Button title="Save project brief" onPress={save} loading={busy} disabled={!account || account !== loadedAccount} fullWidth />
      <Text style={[styles.body, { color: c.textSecondary }]}>Saved on this device. Reference analysis and component review are the next planning stage.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, gap: spacing.md, maxWidth: 680, width: '100%', alignSelf: 'center', paddingBottom: spacing.xxxl },
  center: { flex: 1, padding: spacing.xl, justifyContent: 'center', alignItems: 'center' },
  eyebrow: { ...typography.caption, fontWeight: '700' },
  title: { ...typography.h2 },
  body: { ...typography.caption },
  label: { ...typography.body, fontWeight: '600', marginTop: spacing.sm },
  input: { ...typography.body, borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.md, minHeight: 48 },
  imageBox: { height: 250, borderWidth: 1, borderStyle: 'dashed', borderRadius: borderRadius.lg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  skills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  skill: { borderWidth: 1, borderRadius: borderRadius.full, paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
});
