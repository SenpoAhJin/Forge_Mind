/**
 * Commission Milestones Context
 * 
 * Manages milestone tracking for accepted commission offers.
 * Milestones are automatically created when a commission offer is accepted.
 * Both parties (buyer and crafter) can confirm milestones.
 * 
 * AsyncStorage persistence pattern matches OffersContext/MarketplaceContext.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CommissionMilestone,
  CommissionMilestoneType,
  REQUIRED_MILESTONE_TYPES,
} from '../types/commissionMilestones';
import { Offer } from '../types/offers';

const STORAGE_KEY = '@forgemind:commission_milestones';

type MilestoneResult = { success: boolean; error?: string; milestone?: CommissionMilestone };

interface CommissionMilestonesContextType {
  milestones: CommissionMilestone[];
  isLoading: boolean;
  
  // Auto-create milestones when commission offer is accepted
  createMilestonesForOffer: (offer: Offer) => Promise<{ success: boolean; error?: string }>;
  
  // Get milestones for a specific offer
  getMilestonesForOffer: (offerId: string) => CommissionMilestone[];
  
  // Confirm a milestone (mark as completed)
  confirmMilestone: (milestoneId: string, confirmerEmail: string, notes?: string) => Promise<MilestoneResult>;
  
  // Check if all required milestones are confirmed
  areAllMilestonesConfirmed: (offerId: string) => boolean;
  
  // Get progress percentage (0-100)
  getProgressPercentage: (offerId: string) => number;
}

const CommissionMilestonesContext = createContext<CommissionMilestonesContextType | undefined>(undefined);

export const useCommissionMilestones = (): CommissionMilestonesContextType => {
  const context = useContext(CommissionMilestonesContext);
  if (!context) {
    throw new Error('useCommissionMilestones must be used within CommissionMilestonesProvider');
  }
  return context;
};

export const CommissionMilestonesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [milestones, setMilestones] = useState<CommissionMilestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMilestones();
  }, []);

  const loadMilestones = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setMilestones(JSON.parse(stored));
      } else {
        setMilestones([]);
      }
    } catch (error) {
      console.error('[CommissionMilestonesContext] Failed to load milestones:', error);
      setMilestones([]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveMilestones = async (updatedMilestones: CommissionMilestone[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMilestones));
      setMilestones(updatedMilestones);
    } catch (error) {
      console.error('[CommissionMilestonesContext] Failed to save milestones:', error);
    }
  };

  const createMilestonesForOffer = async (offer: Offer): Promise<{ success: boolean; error?: string }> => {
    // Only create milestones for commission offers
    if (offer.offer_type !== 'commission') {
      return { success: false, error: 'Milestones are only for commission offers.' };
    }

    // Check if milestones already exist for this offer
    const existing = milestones.filter(m => m.offer_id === offer.id);
    if (existing.length > 0) {
      return { success: true }; // Already created, no error
    }

    // Create all required milestones
    const newMilestones: CommissionMilestone[] = REQUIRED_MILESTONE_TYPES.map((type, index) => ({
      milestone_id: `milestone-${offer.id}-${type}-${Date.now()}-${index}`,
      offer_id: offer.id,
      milestone_type: type,
      milestone_status: 'pending',
      confirmed_by_email: null,
      created_at: new Date().toISOString(),
    }));

    await saveMilestones([...milestones, ...newMilestones]);
    return { success: true };
  };

  const getMilestonesForOffer = (offerId: string): CommissionMilestone[] => {
    return milestones
      .filter(m => m.offer_id === offerId)
      .sort((a, b) => {
        // Sort by milestone type order
        const order = REQUIRED_MILESTONE_TYPES;
        return order.indexOf(a.milestone_type) - order.indexOf(b.milestone_type);
      });
  };

  const confirmMilestone = async (
    milestoneId: string,
    confirmerEmail: string,
    notes?: string
  ): Promise<MilestoneResult> => {
    const milestone = milestones.find(m => m.milestone_id === milestoneId);
    
    if (!milestone) {
      return { success: false, error: 'Milestone not found.' };
    }

    if (milestone.milestone_status === 'confirmed') {
      return { success: false, error: 'This milestone is already confirmed.' };
    }

    const updatedMilestone: CommissionMilestone = {
      ...milestone,
      milestone_status: 'confirmed',
      confirmed_by_email: confirmerEmail,
      confirmed_at: new Date().toISOString(),
      notes: notes || milestone.notes,
    };

    const updatedMilestones = milestones.map(m =>
      m.milestone_id === milestoneId ? updatedMilestone : m
    );

    await saveMilestones(updatedMilestones);
    return { success: true, milestone: updatedMilestone };
  };

  const areAllMilestonesConfirmed = (offerId: string): boolean => {
    const offerMilestones = getMilestonesForOffer(offerId);
    if (offerMilestones.length === 0) return false;
    return offerMilestones.every(m => m.milestone_status === 'confirmed');
  };

  const getProgressPercentage = (offerId: string): number => {
    const offerMilestones = getMilestonesForOffer(offerId);
    if (offerMilestones.length === 0) return 0;
    
    const confirmedCount = offerMilestones.filter(m => m.milestone_status === 'confirmed').length;
    return Math.round((confirmedCount / offerMilestones.length) * 100);
  };

  return (
    <CommissionMilestonesContext.Provider
      value={{
        milestones,
        isLoading,
        createMilestonesForOffer,
        getMilestonesForOffer,
        confirmMilestone,
        areAllMilestonesConfirmed,
        getProgressPercentage,
      }}
    >
      {children}
    </CommissionMilestonesContext.Provider>
  );
};
