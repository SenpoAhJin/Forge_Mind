/**
 * Global Notification Handler
 * Shows verification status notifications once per status change, on login/app start
 * Replaces the Profile-screen-only notification logic
 */

import React, { useEffect, useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { useEvents } from '../contexts/EventsContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusNotificationModal } from './StatusNotificationModal';
import { ConfirmationModal } from './ConfirmationModal';
import { useNavigation } from '@react-navigation/native';

const NOTIFICATION_SEEN_KEY = '@forgemind:shown_decisions';

export const GlobalNotificationHandler: React.FC = () => {
  const { user, pendingNotification, clearPendingNotification } = useUser();
  const { events } = useEvents();
  const navigation = useNavigation<any>();
  const [showModal, setShowModal] = useState(false);
  const [showCancelledModal, setShowCancelledModal] = useState(false);
  const [cancelledEventName, setCancelledEventName] = useState('');

  // Check for newly cancelled events (staff only, not Head)
  useEffect(() => {
    const checkCancelledEvents = async () => {
      if (!user || !user.is_organizer) return;
      if (user.organizer_role === 'head') return; // Heads don't get notices
      if (user.organizer_role !== 'staff' || user.department_verification_status !== 'approved') return;

      try {
        const storedKey = `${NOTIFICATION_SEEN_KEY}:${user.email}`;
        const seenData = await AsyncStorage.getItem(storedKey);
        const seen = seenData ? JSON.parse(seenData) : { cancelled_events: [] };
        const seenEvents = seen.cancelled_events || [];

        // Find first cancelled event this user hasn't been notified about
        const newlyCancelled = events.find(
          e => e.status === 'cancelled' && !seenEvents.includes(e.id)
        );

        if (newlyCancelled && !pendingNotification) {
          setCancelledEventName(newlyCancelled.name);
          setShowCancelledModal(true);
          
          // Mark as seen immediately so it doesn't re-trigger
          seenEvents.push(newlyCancelled.id);
          seen.cancelled_events = seenEvents;
          await AsyncStorage.setItem(storedKey, JSON.stringify(seen));
        }
      } catch (error) {
        console.error('[GlobalNotificationHandler] Failed to check cancelled events:', error);
      }
    };

    checkCancelledEvents();
  }, [user, events, pendingNotification]);

  // Show modal when there's a pending notification
  useEffect(() => {
    if (pendingNotification) {
      setShowModal(true);
    } else {
      setShowModal(false);
    }
  }, [pendingNotification]);

  const handleClose = () => {
    setShowModal(false);
    clearPendingNotification();
  };

  const handleAppeal = () => {
    setShowModal(false);
    clearPendingNotification();
    
    // Navigate to appropriate registration screen
    if (pendingNotification?.type === 'marketplace') {
      navigation.navigate('MarketplaceRegistration');
    } else if (pendingNotification?.type === 'staff') {
      navigation.navigate('StaffRegistration');
    }
  };

  if (!pendingNotification || !user) {
    return showCancelledModal ? (
      <ConfirmationModal
        visible={true}
        title="Event Cancelled"
        message={`"${cancelledEventName}" has been cancelled by the Head Organizer. You will no longer see this event in your Events list.`}
        confirmText="OK"
        onConfirm={() => setShowCancelledModal(false)}
        onCancel={() => {}}
      />
    ) : null;
  }

  // Skip rendering StatusNotificationModal for event_cancelled type
  if (pendingNotification.type === 'event_cancelled') {
    return null;
  }

  // Map status to modal format
  const modalStatus = pendingNotification.type === 'marketplace'
    ? (pendingNotification.status === 'verified' ? 'approved' : 'rejected')
    : pendingNotification.status;

  // Get rejection reason
  const rejectionReason = pendingNotification.type === 'marketplace'
    ? user.marketplace_registration?.rejection_reason
    : user.department_rejection_reason;

  return (
    <StatusNotificationModal
      visible={showModal}
      onClose={handleClose}
      status={modalStatus as 'approved' | 'rejected'}
      type={pendingNotification.type}
      onAppeal={
        (pendingNotification.status === 'rejected') 
          ? handleAppeal 
          : undefined
      }
      rejectionReason={rejectionReason}
    />
  );
};
