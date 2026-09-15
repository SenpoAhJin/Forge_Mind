/**
 * ForgeMind Design System - Component Showcase
 * Demonstrates all implemented design system components
 * This screen is for development/QA only - not part of final app navigation
 */

import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import {
  Button,
  StandardCard,
  ItemCard,
  MatchCard,
  Tag,
  BodySizeSlider,
  ConditionSlider,
  ChatBubble,
  StatusBadge,
  TextInputField,
  TextAreaField,
  DropdownField,
  PhotoUploadField,
} from '../../components';
import { colors, typography, spacing } from '../../theme';

export const ComponentShowcaseScreen: React.FC = () => {
  const [bodySize, setBodySize] = useState(0.5);
  const [condition, setCondition] = useState(3);
  const [textInput, setTextInput] = useState('');
  const [textArea, setTextArea] = useState('');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Buttons</Text>
      <View style={styles.section}>
        <Button title="Primary Button" onPress={() => {}} variant="primary" />
        <Button title="Secondary Button" onPress={() => {}} variant="secondary" />
        <Button title="Tertiary Button" onPress={() => {}} variant="tertiary" />
        <Button title="Destructive Button" onPress={() => {}} variant="destructive" />
        <Button title="Disabled Button" onPress={() => {}} disabled />
      </View>

      <Text style={styles.sectionTitle}>Cards</Text>
      <View style={styles.section}>
        <StandardCard>
          <Text style={typography.h3}>Standard Card</Text>
          <Text style={typography.body}>
            White background, 12px rounded corners, 2px elevation shadow
          </Text>
        </StandardCard>

        <ItemCard
          photoUrl="https://via.placeholder.com/300x150"
          title="Genshin Impact Wig - Long White"
          price={1500}
          condition={4}
          onPress={() => {}}
        />

        <MatchCard
          thumbnailUrl="https://via.placeholder.com/100"
          characterName="Gojo Satoru"
          variantName="Season 2 Uniform"
          matchRating="exact"
          componentCount={8}
          onPress={() => {}}
        />
      </View>

      <Text style={styles.sectionTitle}>Tags</Text>
      <View style={[styles.section, styles.row]}>
        <Tag type="match" rating="exact" style={styles.tag} />
        <Tag type="match" rating="close" style={styles.tag} />
        <Tag type="match" rating="loose" style={styles.tag} />
        <Tag type="status" label="Active" style={styles.tag} />
        <Tag type="category" label="Wigs" style={styles.tag} />
      </View>

      <Text style={styles.sectionTitle}>Sliders</Text>
      <View style={styles.section}>
        <BodySizeSlider value={bodySize} onValueChange={setBodySize} />
        <ConditionSlider value={condition} onValueChange={setCondition} />
      </View>

      <Text style={styles.sectionTitle}>Chat Bubbles</Text>
      <View style={styles.section}>
        <ChatBubble
          type="sender"
          message="Hey! Is this item still available?"
          timestamp="2:30 PM"
        />
        <ChatBubble
          type="receiver"
          message="Yes, it is! Would you like to schedule a meetup?"
          timestamp="2:32 PM"
        />
        <ChatBubble type="system" message="Trade proposal sent" timestamp="2:35 PM" />
      </View>

      <Text style={styles.sectionTitle}>Status Badges</Text>
      <View style={[styles.section, styles.row]}>
        <StatusBadge status="active" />
        <StatusBadge status="pending" />
        <StatusBadge status="completed" />
        <StatusBadge status="blocked" />
        <StatusBadge status="verified" />
      </View>

      <Text style={styles.sectionTitle}>Input Fields</Text>
      <View style={styles.section}>
        <TextInputField
          label="Email"
          value={textInput}
          onChangeText={setTextInput}
          placeholder="Enter your email"
          keyboardType="email-address"
        />
        <TextAreaField
          label="Description"
          value={textArea}
          onChangeText={setTextArea}
          placeholder="Describe your item..."
          minRows={4}
        />
        <DropdownField
          label="Category"
          value=""
          placeholder="Select a category"
          onPress={() => {}}
        />
        <PhotoUploadField label="Item Photos" onPress={() => {}} imageCount={2} />
      </View>

      <View style={styles.spacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  content: {
    padding: spacing.lg,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  spacer: {
    height: spacing.xxl,
  },
});
