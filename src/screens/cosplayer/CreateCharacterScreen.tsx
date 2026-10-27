/**
 * Create Character Screen
 * 
 * Form for users to add characters they want to cosplay.
 * Stores in UserCharactersContext (local AsyncStorage).
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useUserCharacters } from '../../contexts/UserCharactersContext';
import type { NewUserCharacterInput, DifficultyLevel } from '../../types/user-character';

interface CreateCharacterScreenProps {
  navigation: any;
}

const DIFFICULTY_OPTIONS: { value: DifficultyLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const COLOR_SUGGESTIONS = [
  'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'black', 'white', 'brown', 'gray'
];

export default function CreateCharacterScreen({ navigation }: CreateCharacterScreenProps) {
  const { addCharacter } = useUserCharacters();
  
  const [name, setName] = useState('');
  const [series, setSeries] = useState('');
  const [variant, setVariant] = useState('');
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [styleTags, setStyleTags] = useState('');
  const [difficulty, setDifficulty] = useState<DifficultyLevel | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const toggleColor = (color: string) => {
    setSelectedColors(prev =>
      prev.includes(color)
        ? prev.filter(c => c !== color)
        : [...prev, color]
    );
  };
  
  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert('Required', 'Character name is required');
      return;
    }
    
    if (!series.trim()) {
      Alert.alert('Required', 'Series/Source is required');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const input: NewUserCharacterInput = {
        name: name.trim(),
        series: series.trim(),
        variant: variant.trim() || undefined,
        targetColors: selectedColors,
        styleTags: styleTags
          .split(',')
          .map(t => t.trim())
          .filter(t => t.length > 0),
        difficulty,
        notes: notes.trim() || undefined,
      };
      
      const character = await addCharacter(input);
      
      console.log('[CreateCharacter] Created:', character);
      
      Alert.alert(
        'Success',
        `${character.name} added to your character list!`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('[CreateCharacter] Error:', error);
      Alert.alert('Error', 'Failed to create character. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        {/* Character Name */}
        <View style={styles.field}>
          <Text style={styles.label}>Character Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Naruto Uzumaki"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        </View>
        
        {/* Series/Source */}
        <View style={styles.field}>
          <Text style={styles.label}>Series/Source *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Naruto Shippuden"
            value={series}
            onChangeText={setSeries}
            autoCapitalize="words"
          />
        </View>
        
        {/* Variant (Optional) */}
        <View style={styles.field}>
          <Text style={styles.label}>Variant (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Sage Mode, Season 2, Movie Version"
            value={variant}
            onChangeText={setVariant}
            autoCapitalize="words"
          />
        </View>
        
        {/* Target Colors */}
        <View style={styles.field}>
          <Text style={styles.label}>Target Colors</Text>
          <Text style={styles.hint}>Select main colors for this cosplay</Text>
          <View style={styles.colorGrid}>
            {COLOR_SUGGESTIONS.map(color => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorChip,
                  { backgroundColor: color },
                  selectedColors.includes(color) && styles.colorChipSelected,
                ]}
                onPress={() => toggleColor(color)}
              >
                {selectedColors.includes(color) && (
                  <Text style={styles.colorCheckmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Style Tags */}
        <View style={styles.field}>
          <Text style={styles.label}>Style Tags</Text>
          <Text style={styles.hint}>Comma-separated (e.g., ninja, jumpsuit, spiky hair)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., ninja, jumpsuit, headband"
            value={styleTags}
            onChangeText={setStyleTags}
            autoCapitalize="none"
          />
        </View>
        
        {/* Difficulty */}
        <View style={styles.field}>
          <Text style={styles.label}>Difficulty (Optional)</Text>
          <View style={styles.difficultyButtons}>
            {DIFFICULTY_OPTIONS.map(option => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.difficultyButton,
                  difficulty === option.value && styles.difficultyButtonActive,
                ]}
                onPress={() => setDifficulty(option.value)}
              >
                <Text
                  style={[
                    styles.difficultyButtonText,
                    difficulty === option.value && styles.difficultyButtonTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Notes */}
        <View style={styles.field}>
          <Text style={styles.label}>Notes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Any additional details or reminders..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
        
        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Adding...' : 'Add Character'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  form: {
    padding: 16,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  colorChip: {
    width: 50,
    height: 50,
    borderRadius: 25,
    margin: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorChipSelected: {
    borderColor: '#2196F3',
    borderWidth: 3,
  },
  colorCheckmark: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  difficultyButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  difficultyButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  difficultyButtonActive: {
    backgroundColor: '#2196F3',
  },
  difficultyButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  difficultyButtonTextActive: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
