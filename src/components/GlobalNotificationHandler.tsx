/**
 * Global Notification Handler
 * Shows verification status notifications once per status change, on login/app start
 * Replaces the Profile-screen-only notification logic
 */

import React, { useEffect, useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { StatusNotificationModal } from './StatusNotificationModal';
import { useNavigation } from '@react-navigation/native';

export const GlobalNotificationHandler: React.FC = () => {
  const { user, pendingNotification, clearPendingNotification } = useUser();
  const navigation = useNavigation<any>();
  const [showModal, setShowModal] = useState(false);

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
