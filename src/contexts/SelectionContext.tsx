/**
 * ForgeMind - Variant Selection Context
 * Stores the character variant a cosplayer currently has selected.
 * FE-5 (attire matching) and the Phase 2 3D viewer will consume this selection.
 */

import React, { createContext, useContext, useState } from 'react';
import { Character, Variant } from '../types/catalog';

interface VariantSelection {
  character: Character;
  variant: Variant;
  selected_at: string;
}

interface SelectionContextValue {
  selection: VariantSelection | null;
  selectVariant: (character: Character, variant: Variant) => void;
  clearSelection: () => void;
}

const SelectionContext = createContext<SelectionContextValue | undefined>(undefined);

export const SelectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selection, setSelection] = useState<VariantSelection | null>(null);

  const selectVariant = (character: Character, variant: Variant) =>
    setSelection({ character, variant, selected_at: new Date().toISOString() });

  const clearSelection = () => setSelection(null);

  return (
    <SelectionContext.Provider value={{ selection, selectVariant, clearSelection }}>
      {children}
    </SelectionContext.Provider>
  );
};

export const useSelection = () => {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error('useSelection must be used within a SelectionProvider');
  return ctx;
};