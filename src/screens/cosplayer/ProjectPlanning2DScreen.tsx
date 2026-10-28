/**
 * Project Planning - 2D Photo View
 * 
 * Alta Daily-style outfit planning with photo overlays on body silhouette.
 * Users tap owned items to "wear" them and see visual combinations.
 * 
 * ARCHITECTURE:
 * - 2D view is PRIMARY (fast, simple, works immediately)
 * - 3D view is OPTIONAL enhancement (toggle in future)
 * - Both views share same project state (OutfitProject)
 * 
 * DESIGN:
 * - Body silhouette background
 * - Photo slots for each garment type (wig, top, bottom, footwear, accessory)
 * - Scrollable owned items grid at bottom
 * - Tap item → wear it in appropriate slot
 * - Long press slot → remove item
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  ImageBackground,
} from 'react-native';
import { useOwnedAttire } from '../../contexts/OwnedAttireContext';
import { useUserCharacters } from '../../contexts/UserCharactersContext';
import type { OwnedAttire, AttireCategory } from '../../types/owned-attire';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Slot positions on body silhouette (percentages)
const SLOT_POSITIONS = {
  wig: { top: '5%', left: '35%', width: '30%', height: '15%' },
  top: { top: '25%', left: '30%', width: '40%', height: '25%' },
  bottom: { top: '52%', left: '32%', width: '36%', height: '30%' },
  footwear: { top: '82%', left: '33%', width: '34%', height: '15%' },
  accessory: { top: '15%', left: '5%', width: '20%', height: '15%' }, // Side prop area
};

type OutfitSlot = 'wig' | 'top' | 'bottom' | 'footwear' | 'accessory';

interface OutfitProject {
  name: string;
  targetCharacter?: string;
  slots: {
    [K in OutfitSlot]?: OwnedAttire;
  };
  notes?: string;
}

interface ProjectPlanning2DScreenProps {
  navigation?: any;
  route?: { params?: { characterId?: string } };
}

export default function ProjectPlanning2DScreen({ navigation, route }: ProjectPlanning2DScreenProps) {
  const { items: ownedItems } = useOwnedAttire();
  const { getCharacterById } = useUserCharacters();
  
  // Get character from route params (if navigated from character browse)
  const characterId = route?.params?.characterId;
  const character = characterId ? getCharacterById(characterId) : undefined;
  
  // Project state (fully dynamic - user builds their own outfit)
  const [project, setProject] = useState<OutfitProject>({
    name: character ? `${character.name} Outfit` : 'My Cosplay Project',
    targetCharacter: character?.name,
    slots: {},
  });
  
  const [selectedCategory, setSelectedCategory] = useState<AttireCategory | 'all'>('all');
  
  // Filter items by category
  const filteredItems = useMemo(() => {
    let items = ownedItems;
    
    // Filter by selected category
    if (selectedCategory !== 'all') {
      items = items.filter(item => item.auto_categorized_type === selectedCategory);
    }
    
    // AI suggestions: If character selected, prioritize matching items
    if (character) {
      // Score items based on character match
      const scored = items.map(item => {
        let score = 0;
        const itemColor = (item.auto_categorized_color || '').toLowerCase();
        const itemTags = [
          item.auto_categorized_style,
          item.auto_categorized_type,
          item.original_input_text
        ].filter(Boolean).join(' ').toLowerCase();
        
        // Color match (higher priority)
        if (character.targetColors.some(color => itemColor.includes(color.toLowerCase()))) {
          score += 10;
        }
        
        // Style tag match
        if (character.styleTags.some(tag => itemTags.includes(tag.toLowerCase()))) {
          score += 5;
        }
        
        return { item, score };
      });
      
      // Sort by score (best matches first), then return just items
      return scored.sort((a, b) => b.score - a.score).map(s => s.item);
    }
    
    return items;
  }, [ownedItems, selectedCategory, character]);
  
  // Categorize items for quick access
  const itemsByCategory = useMemo(() => {
    const categories: { [key: string]: OwnedAttire[] } = {
      wig: [],
      clothing: [],
      footwear: [],
      accessory: [],
      other: [],
    };
    
    ownedItems.forEach(item => {
      const cat = item.auto_categorized_type || 'other';
      if (categories[cat]) {
        categories[cat].push(item);
      } else {
        categories.other.push(item);
      }
    });
    
    return categories;
  }, [ownedItems]);
  
  // Wear item in appropriate slot
  const wearItem = (item: OwnedAttire) => {
    const type = item.auto_categorized_type?.toLowerCase();
    let slot: OutfitSlot | null = null;
    
    // Map item type to outfit slot
    if (type === 'wig') slot = 'wig';
    else if (type === 'clothing' || type === 'top') slot = 'top';
    else if (type === 'bottom' || type === 'pants' || type === 'skirt') slot = 'bottom';
    else if (type === 'footwear') slot = 'footwear';
    else if (type === 'accessory' || type === 'prop' || type === 'weapon') slot = 'accessory';
    else if (type === 'other' || type === 'material') {
      // Generic items - let user choose slot (default to top for now)
      slot = 'top';
    }
    
    if (slot) {
      setProject(prev => ({
        ...prev,
        slots: {
          ...prev.slots,
          [slot]: item,
        },
      }));
    }
  };
  
  // Remove item from slot
  const removeFromSlot = (slot: OutfitSlot) => {
    setProject(prev => {
      const newSlots = { ...prev.slots };
      delete newSlots[slot];
      return {
        ...prev,
        slots: newSlots,
      };
    });
  };
  
  // Calculate completeness
  const completeness = useMemo(() => {
    const totalSlots = 5;
    const filledSlots = Object.keys(project.slots).length;
    return Math.round((filledSlots / totalSlots) * 100);
  }, [project.slots]);
  
  // Calculate total value
  const totalValue = useMemo(() => {
    return Object.values(project.slots).reduce((sum, item) => {
      return sum + (item?.acquisition_cost || 0);
    }, 0);
  }, [project.slots]);
  
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Outfit Planning</Text>
        {character ? (
          <View style={styles.characterInfo}>
            <Text style={styles.characterName}>{character.name}</Text>
            {character.variant && (
              <Text style={styles.characterVariant}>{character.variant}</Text>
            )}
            <Text style={styles.characterSeries}>{character.series}</Text>
          </View>
        ) : (
          <Text style={styles.subtitle}>Tap items to try them on</Text>
        )}
      </View>
      
      <ScrollView style={styles.scrollView}>
        {/* Body Silhouette with Photo Overlays */}
        <View style={styles.previewSection}>
          <Text style={styles.sectionTitle}>Your Outfit</Text>
          
          <View style={styles.bodyContainer}>
            {/* Body Silhouette Background */}
            <View style={styles.bodySilhouette}>
              <Text style={styles.silhouetteText}>BODY</Text>
              <Text style={styles.silhouetteSubtext}>Tap items below to dress up</Text>
            </View>
            
            {/* Photo Slots (overlays on body) */}
            {(Object.keys(SLOT_POSITIONS) as OutfitSlot[]).map(slot => {
              const item = project.slots[slot];
              const position = SLOT_POSITIONS[slot];
              
              return (
                <TouchableOpacity
                  key={slot}
                  style={[styles.photoSlot, position]}
                  onLongPress={() => removeFromSlot(slot)}
                  activeOpacity={0.8}
                >
                  {item && item.photo_urls && item.photo_urls.length > 0 ? (
                    <Image
                      source={{ uri: item.photo_urls[0] }}
                      style={styles.slotPhoto}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.emptySlot}>
                      <Text style={styles.emptySlotText}>{slot.toUpperCase()}</Text>
                      <Text style={styles.emptySlotHint}>Tap item</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          
          {/* Completeness Indicator */}
          <View style={styles.completenessBar}>
            <Text style={styles.completenessLabel}>Completeness: {completeness}%</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${completeness}%` }]} />
            </View>
          </View>
          
          {/* Value Display */}
          <View style={styles.valueCard}>
            <Text style={styles.valueLabel}>Current Outfit Value</Text>
            <Text style={styles.valueAmount}>₱{totalValue.toFixed(2)}</Text>
          </View>
        </View>
        
        {/* Category Filters */}
        <View style={styles.categoryFilters}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {['all', 'wig', 'clothing', 'footwear', 'accessory'].map(cat => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryButton,
                  selectedCategory === cat && styles.categoryButtonActive,
                ]}
                onPress={() => setSelectedCategory(cat as AttireCategory | 'all')}
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    selectedCategory === cat && styles.categoryButtonTextActive,
                  ]}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        
        {/* Owned Items Grid */}
        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>
            {character && filteredItems.length > 0 ? 'Suggested Items' : 'Your Items'} ({filteredItems.length})
          </Text>
          {character && (
            <Text style={styles.suggestionHint}>
              Items matching {character.name}'s colors and style
            </Text>
          )}
          
          <View style={styles.itemsGrid}>
            {filteredItems.map(item => (
              <TouchableOpacity
                key={item.attire_id}
                style={styles.itemCard}
                onPress={() => wearItem(item)}
              >
                {item.photo_urls && item.photo_urls.length > 0 ? (
                  <Image
                    source={{ uri: item.photo_urls[0] }}
                    style={styles.itemPhoto}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.itemPhoto, styles.itemPhotoPlaceholder]}>
                    <Text style={styles.placeholderText}>
                      {item.auto_categorized_type?.[0]?.toUpperCase() || '?'}
                    </Text>
                  </View>
                )}
                <Text style={styles.itemLabel} numberOfLines={2}>
                  {item.original_input_text || item.auto_categorized_type || 'Item'}
                </Text>
                <Text style={styles.itemType}>
                  {item.auto_categorized_type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
      
      {/* Future: Toggle to 3D View */}
      {/* <TouchableOpacity style={styles.view3DButton}>
        <Text style={styles.view3DText}>View in 3D</Text>
      </TouchableOpacity> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  characterInfo: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  characterName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  characterVariant: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  characterSeries: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  suggestionHint: {
    fontSize: 12,
    color: '#2196F3',
    fontStyle: 'italic',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  previewSection: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  bodyContainer: {
    width: '100%',
    aspectRatio: 0.6,
    position: 'relative',
    backgroundColor: '#fafafa',
    borderRadius: 12,
    overflow: 'hidden',
  },
  bodySilhouette: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e8f4f8',
  },
  silhouetteText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ccc',
    letterSpacing: 4,
  },
  silhouetteSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  photoSlot: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.8)',
    overflow: 'hidden',
  },
  slotPhoto: {
    width: '100%',
    height: '100%',
  },
  emptySlot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  emptySlotText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#999',
    textAlign: 'center',
  },
  emptySlotHint: {
    fontSize: 8,
    color: '#bbb',
    marginTop: 2,
  },
  completenessBar: {
    marginTop: 16,
  },
  completenessLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  valueCard: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  valueLabel: {
    fontSize: 14,
    color: '#666',
  },
  valueAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  categoryFilters: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#2196F3',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#666',
  },
  categoryButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  itemsSection: {
    padding: 16,
    backgroundColor: '#fff',
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  itemCard: {
    width: (SCREEN_WIDTH - 48) / 3,
    margin: 4,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  itemPhoto: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#f5f5f5',
  },
  itemPhotoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ccc',
  },
  itemLabel: {
    fontSize: 12,
    color: '#333',
    padding: 8,
    paddingBottom: 4,
  },
  itemType: {
    fontSize: 10,
    color: '#999',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
});
