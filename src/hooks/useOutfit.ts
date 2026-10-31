/**
 * useOutfit Hook
 * 
 * COSTUME-4D-1: React hook over outfitStore with AsyncStorage adapter.
 * Provides outfit state management for screens.
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BaseBodySelection } from '../constants/bodyType';
import {
  type StorageAdapter,
  type OutfitState,
  type OutfitScope,
  loadOutfit,
  saveOutfit,
  togglePiece,
  setPieceColor,
  setPieceStyle,
  applyItem,
  wearFullCostume,
  removeAllPieces
} from '../utils/outfitStore';

// AsyncStorage adapter
const asyncStorageAdapter: StorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    return await AsyncStorage.getItem(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value);
  },
  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  }
};

export interface UseOutfitResult {
  outfit: OutfitState | null;
  isLoading: boolean;
  togglePiece: (slot: string, on: boolean) => Promise<void>;
  setColor: (slot: string, color: string) => Promise<void>;
  setStyle: (slot: string, styleKey: string, styleValue: string) => Promise<void>;
  applyItem: (itemId: string, category: string, colorName: string | undefined, itemName: string) => Promise<{
    action: 'worn' | 'removed' | 'replaced' | 'no-slot';
    message: string;
  }>;
  wearFull: () => Promise<void>;
  removeAll: () => Promise<void>;
  reload: () => Promise<void>;
}

/**
 * Hook for outfit management
 * @param bodyType - Current body type (for scope)
 * @param projectId - Optional project ID (for project-specific outfits)
 */
export function useOutfit(
  bodyType: BaseBodySelection,
  projectId?: string
): UseOutfitResult {
  const [outfit, setOutfit] = useState<OutfitState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Determine scope
  const scope: OutfitScope = projectId
    ? { type: 'project', projectId }
    : { type: 'body', bodyType };
  
  // Load outfit from storage
  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const loaded = await loadOutfit(asyncStorageAdapter, scope);
      setOutfit(loaded);
    } catch (error) {
      console.error('[useOutfit] Failed to load:', error);
    } finally {
      setIsLoading(false);
    }
  }, [scope.type, projectId, bodyType]);
  
  // Save outfit to storage
  const save = useCallback(async (newOutfit: OutfitState) => {
    try {
      await saveOutfit(asyncStorageAdapter, scope, newOutfit);
      setOutfit(newOutfit);
    } catch (error) {
      console.error('[useOutfit] Failed to save:', error);
    }
  }, [scope.type, projectId, bodyType]);
  
  // Load on mount and when scope changes
  useEffect(() => {
    load();
  }, [load]);
  
  // Toggle piece
  const handleTogglePiece = useCallback(async (slot: string, on: boolean) => {
    if (!outfit) return;
    const newOutfit = togglePiece(outfit, slot, on);
    await save(newOutfit);
  }, [outfit, save]);
  
  // Set color
  const handleSetColor = useCallback(async (slot: string, color: string) => {
    if (!outfit) return;
    const newOutfit = setPieceColor(outfit, slot, color);
    await save(newOutfit);
  }, [outfit, save]);
  
  // Set style
  const handleSetStyle = useCallback(async (slot: string, styleKey: string, styleValue: string) => {
    if (!outfit) return;
    const newOutfit = setPieceStyle(outfit, slot, styleKey, styleValue);
    await save(newOutfit);
  }, [outfit, save]);
  
  // Apply item
  const handleApplyItem = useCallback(async (
    itemId: string,
    category: string,
    colorName: string | undefined,
    itemName: string
  ) => {
    if (!outfit) {
      return { action: 'no-slot' as const, message: 'Outfit not loaded' };
    }
    
    const result = applyItem(outfit, itemId, category, colorName, itemName);
    await save(result.outfit);
    
    return {
      action: result.action,
      message: result.message
    };
  }, [outfit, save]);
  
  // Wear full costume
  const handleWearFull = useCallback(async () => {
    if (!outfit) return;
    const newOutfit = wearFullCostume(outfit);
    await save(newOutfit);
  }, [outfit, save]);
  
  // Remove all pieces
  const handleRemoveAll = useCallback(async () => {
    if (!outfit) return;
    const newOutfit = removeAllPieces(outfit);
    await save(newOutfit);
  }, [outfit, save]);
  
  return {
    outfit,
    isLoading,
    togglePiece: handleTogglePiece,
    setColor: handleSetColor,
    setStyle: handleSetStyle,
    applyItem: handleApplyItem,
    wearFull: handleWearFull,
    removeAll: handleRemoveAll,
    reload: load
  };
}
