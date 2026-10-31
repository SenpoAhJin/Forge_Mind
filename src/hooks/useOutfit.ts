/** One account/project outfit, independent of the selected body and camera. */
import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BaseBodySelection } from '../constants/bodyType';
import type { OwnedAttire } from '../types/owned-attire';
import {
  type OutfitState, type OutfitScope, getStorageKey, loadOutfit, saveOutfit,
  togglePiece, setPieceColor, setPieceStyle, applyItem, wearFullCostume,
  removeAllPieces, reconcileInventory, getSlotForItem,
} from '../utils/outfitStore';

const queues = new Map<string, Promise<unknown>>();
const listeners = new Map<string, Set<(outfit: OutfitState) => void>>();

export function useOutfit(bodyType: BaseBodySelection, projectId?: string, accountId?: string, inventory: OwnedAttire[] = []) {
  const scope = useMemo<OutfitScope>(() => projectId
    ? { type: 'project', projectId, accountId }
    : { type: 'body', bodyType, accountId }, [projectId, accountId]);
  const key = accountId ? getStorageKey(scope) : '';
  const [state, setState] = useState<{ key: string; outfit: OutfitState | null }>({ key: '', outfit: null });
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [errorState, setError] = useState<{ key: string; message: string } | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    if (!key) return;
    setLoadingKey(key);
    setError(null);
    const subscribers = listeners.get(key) ?? new Set();
    const receive = (outfit: OutfitState) => { if (active) setState({ key, outfit }); };
    subscribers.add(receive); listeners.set(key, subscribers);
    (async () => {
      try {
        await queues.get(key)?.catch(() => undefined);
        const outfit = await loadOutfit(AsyncStorage, scope);
        receive(outfit);
      } catch (error) {
        if (active) setError({ key, message: `Could not load outfit. ${(error as Error).message}` });
      } finally {
        if (active) setLoadingKey(null);
      }
    })();
    return () => { active = false; subscribers.delete(receive); if (!subscribers.size) listeners.delete(key); };
  }, [key, revision, scope]);

  const update = useCallback(async <T,>(change: (outfit: OutfitState) => { outfit: OutfitState; value: T }): Promise<T> => {
    if (!key) throw new Error('Sign in to wear your inventory items.');
    const operation = (queues.get(key) ?? Promise.resolve()).catch(() => undefined).then(async () => {
      const current = reconcileInventory(await loadOutfit(AsyncStorage, scope), inventory);
      const next = change(current);
      await saveOutfit(AsyncStorage, scope, next.outfit);
      listeners.get(key)?.forEach(receive => receive(next.outfit));
      setError(null);
      return next.value;
    });
    queues.set(key, operation);
    try { return await operation; }
    catch (error) {
      setError({ key, message: `Could not save outfit. ${(error as Error).message}` });
      throw error;
    } finally { if (queues.get(key) === operation) queues.delete(key); }
  }, [key, scope, inventory]);

  const transform = (change: (outfit: OutfitState) => OutfitState) => update(outfit => ({ outfit: change(outfit), value: undefined }));
  const outfit = state.key === key && state.outfit ? reconcileInventory(state.outfit, inventory) : null;
  return {
    outfit,
    isLoading: !!key && (loadingKey === key || state.key !== key) && errorState?.key !== key,
    error: errorState?.key === key ? errorState.message : null,
    togglePiece: (slot: string, on: boolean) => transform(outfit => togglePiece(outfit, slot, on)),
    setColor: (slot: string, color: string) => transform(outfit => setPieceColor(outfit, slot, color)),
    setStyle: (slot: string, name: string, value: string) => transform(outfit => setPieceStyle(outfit, slot, name, value)),
    wearItem: (item: OwnedAttire) => update(outfit => {
      if (!inventory.some(owned => owned.attire_id === item.attire_id)) throw new Error('This item is no longer in your inventory.');
      const result = applyItem(outfit, item.attire_id, getSlotForItem(item) ?? item.auto_categorized_type, item.auto_categorized_color,
        item.original_input_text || `${item.auto_categorized_color} ${item.auto_categorized_type}`);
      return { outfit: result.outfit, value: result.message };
    }),
    wearFull: () => transform(outfit => wearFullCostume(outfit, inventory)),
    removeAll: () => transform(removeAllPieces),
    reload: () => setRevision(value => value + 1),
  };
}
