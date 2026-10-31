import React, { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Button } from '../buttons/Button';
import { useUser } from '../../contexts/UserContext';
import { useTheme } from '../../contexts/ThemeContext';
import { planningBriefs } from '../../services/PlanningBriefService';
import type { PlanningBrief } from '../../types/planningBrief';
import { borderRadius, spacing, typography } from '../../theme';

export function PlanningBriefsCard({ onOpen }: { onOpen: (briefId?: string) => void }) {
  const { user } = useUser();
  const { themeColors: c } = useTheme();
  const account = user?.email;
  const [state, setState] = useState<{ account?: string; briefs: PlanningBrief[]; error?: string }>({ briefs: [] });
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    if (!account) {
      setState({ briefs: [] }); setLoading(false);
      return;
    }
    planningBriefs.list(account).then(briefs => {
      if (active) setState({ account, briefs });
    }).catch((err: Error) => {
      if (active) setState({ account, briefs: [], error: err.message });
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [account, reload]));

  // Hide a previous account's records immediately, before the focus effect completes.
  const briefs = state.account === account ? state.briefs : [];
  const error = state.account === account ? state.error : undefined;
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <Text style={[styles.heading, { color: c.text }]}>Plan from a reference</Text>
      <Text style={[styles.body, { color: c.textSecondary }]}>Start with your character, reference image, skill, budget and deadline.</Text>
      <Button title="New project brief" onPress={() => onOpen()} disabled={!account} fullWidth />
      {loading ? <ActivityIndicator color={c.primary} /> : null}
      {error ? <>
        <Text accessibilityRole="alert" style={{ color: c.error }}>Could not load briefs. {error}</Text>
        <Button title="Retry" variant="tertiary" onPress={() => setReload(value => value + 1)} />
      </> : null}
      {briefs.length ? <Text style={[styles.label, { color: c.textSecondary }]}>Saved briefs · {briefs.length}</Text> : null}
      {briefs.map(brief => (
        <TouchableOpacity key={brief.brief_id} accessibilityRole="button" accessibilityLabel={`Edit brief for ${brief.character_name}`} onPress={() => onOpen(brief.brief_id)} style={[styles.row, { borderColor: c.border }]}>
          <Text style={[styles.label, { color: c.text }]}>{brief.character_name}</Text>
          <Text style={[styles.body, { color: c.textSecondary }]}>₱{brief.budget.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · {brief.target_date}</Text>
          <Text style={[styles.body, { color: c.primary }]}>Brief saved · Edit brief →</Text>
        </TouchableOpacity>
      ))}
      <Text style={[styles.body, { color: c.textSecondary }]}>Briefs stay on this device. Analysis comes in the next stage.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: borderRadius.lg, padding: spacing.lg, gap: spacing.md, marginBottom: spacing.xl },
  heading: { ...typography.h3 },
  label: { ...typography.body, fontWeight: '600' },
  body: { ...typography.caption },
  row: { borderTopWidth: 1, paddingTop: spacing.md, gap: spacing.xs },
});
