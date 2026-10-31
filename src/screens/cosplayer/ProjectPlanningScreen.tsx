import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useOwnedAttire } from '../../contexts/OwnedAttireContext';
import { useUserCharacters } from '../../contexts/UserCharactersContext';
import { useProjects } from '../../contexts/ProjectsContext';
import { useUser } from '../../contexts/UserContext';
import { useTheme } from '../../contexts/ThemeContext';
import { OwnedOutfitPanel } from '../../components/OwnedOutfitPanel';
import { spacing, typography } from '../../theme';

export default function ProjectPlanningScreen({ route }: { navigation?: any; route?: any }) {
  const { user } = useUser();
  const { themeColors: c } = useTheme();
  const { characters } = useUserCharacters();
  const { projects } = useProjects();
  const { items, isLoaded, isOffline } = useOwnedAttire();
  const [interacting, setInteracting] = useState(false);
  const characterId = route?.params?.characterId;
  const character = characters.find(candidate => candidate.id === characterId);
  const project = projects.find(candidate => candidate.user_id === user?.email &&
    (route?.params?.projectId ? candidate.project_id === route.params.projectId : candidate.character_id === characterId));
  if (!character && !project) return <View style={{ padding: spacing.xl }}><Text style={{ color: c.text }}>No character or project selected.</Text></View>;
  return <ScrollView scrollEnabled={!interacting} style={{ backgroundColor: c.background }} contentContainerStyle={styles.content}>
    <Text style={[styles.title, { color: c.text }]}>{project?.project_name ?? character?.name}</Text>
    {character ? <Text style={{ color: c.textSecondary }}>{character.series}</Text> : null}
    {!project ? <Text style={{ color: c.textSecondary }}>Outfit draft for this character. Project outfits are saved separately on their dashboards.</Text> : null}
    <OwnedOutfitPanel accountId={user?.email} projectId={project?.project_id ?? `character:${characterId}`}
      items={items} inventoryLoaded={isLoaded} offline={isOffline} initialBody={user?.base_body_selection}
      targetColors={character?.targetColors} extractedOutfit={project?.extracted_outfit ?? character?.extracted_outfit}
      onInteractionChange={setInteracting} />
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
  title: { ...typography.h2 },
});
