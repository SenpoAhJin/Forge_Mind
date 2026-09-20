/**
 * ForgeMind User Context
 * FE-4.5: Persisted auth with AsyncStorage - matches v0.2.1 schema field names/types exactly
 * Supports multi-account storage, login/logout, and Test Mode persona switcher
 * Will be replaced with real API calls in BE-1
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthService, StoredAccount } from '../services/AuthService';
import { StaffDepartment, DepartmentVerificationStatus } from '../types/organizer';

const NOTIFICATION_SEEN_KEY = '@forgemind:notification_seen';

// User entity from v0.2.1 schema
interface User {
  // Account fields
  email: string;                        // User.email (String(255), required)
  password_hash: string;                // User.password_hash (String(255), required) - plain for now, real hashing in BE-1
  display_name: string;                 // User.display_name (String(100), required)
  
  // Role fields
  is_cosplayer: boolean;                // User.is_cosplayer (Boolean, required)
  is_organizer: boolean;                // User.is_organizer (Boolean, required)
  
  // Body representation fields
  base_body_selection: 'male' | 'female'; // User.base_body_selection (Enum, required)
  body_size_slider: number;             // User.body_size_slider (Float, required) - 0.0-1.0
  
  // Status fields (set to defaults for mock)
  is_holder_verified: boolean;          // User.is_holder_verified (Boolean, default false)
  verification_status: 'pending' | 'verified' | 'rejected' | 'revoked' | 'not_submitted'; // User.verification_status (Enum)
  
  // Organizer hierarchy (FE-5.5 - real schema, replaces mock fields)
  organizer_role: 'head' | 'staff' | null;  // User.organizer_role (Enum, nullable)
  
  // HEAD ORGANIZER DEPARTMENT OWNERSHIP
  // Each Head Organizer manages ONE department. Multiple Head Organizers can manage the SAME department.
  head_organizer_department?: StaffDepartment | null; // NEW: The ONE department this Head Organizer manages
  
  // Marketplace registration (ASSUMPTIONS - not in Foundation spec)
  marketplace_registration?: {
    marketplace_role: 'buyer' | 'seller' | 'both';  // STEP 2: buyer/seller differentiation
    seller_display_name: string;
    contact_email: string;
    contact_phone?: string;
    payout_method_label: string;
    payout_method_number: string;
    agreed_to_marketplace_terms: boolean;
    submitted_at: string;
    rejection_reason?: string;             // NEW: organizer's reason for rejecting (shown to cosplayer)
  };
  
  // STAFF DEPARTMENT VERIFICATION
  department?: StaffDepartment | null;                 // The ONE department selected at registration
  department_verification_status?: DepartmentVerificationStatus; // pending | approved | rejected
  department_rejection_reason?: string;                // NEW: organizer's reason for rejecting department access
}

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  
  // Auth operations (FE-4.5)
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName: string,
    isCosplayer: boolean,
    isOrganizer: boolean,
    baseBody: 'male' | 'female',
    bodySize: number
  ) => Promise<{ success: boolean; error?: string }>;
  
  // Onboarding helpers (for existing flow - kept for backward compat)
  setUserRoles: (isCosplayer: boolean, isOrganizer: boolean) => void;
  setUserAccount: (email: string, password: string, displayName: string) => void;
  setUserBody: (baseBody: 'male' | 'female', bodySize: number) => void;
  
  // Holder verification (FE-4.5 - persists across logout/login)
  updateVerification: (isVerified: boolean, status: User['verification_status']) => Promise<void>;
  
  // Notification system (FE-7 fix)
  pendingNotification: { type: 'marketplace' | 'staff'; status: 'verified' | 'approved' | 'rejected' } | null;
  clearPendingNotification: () => Promise<void>;
  
  isOnboardingComplete: boolean;
  resetOnboarding: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingNotification, setPendingNotification] = useState<{ 
    type: 'marketplace' | 'staff'; 
    status: 'verified' | 'approved' | 'rejected' 
  } | null>(null);

  // Track last seen verification statuses to detect changes
  const [lastSeenStatuses, setLastSeenStatuses] = useState<{
    marketplace?: string;
    staff?: string;
  }>({});

  // Load active session on mount
  useEffect(() => {
    const loadSession = async () => {
      try {
        const session = await AuthService.getActiveSession();
        if (session) {
          setUser(session);
          await checkForNotifications(session);
        }
      } catch (error) {
        console.error('[UserContext] Failed to load session:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSession();
  }, []);

  // Check for notification on user change (login, verification update)
  useEffect(() => {
    if (user) {
      checkForNotifications(user);
    }
  }, [user?.verification_status, user?.department_verification_status]);

  // Check if there's a pending notification to show
  const checkForNotifications = async (currentUser: User) => {
    try {
      const storedKey = `${NOTIFICATION_SEEN_KEY}:${currentUser.email}`;
      const seenData = await AsyncStorage.getItem(storedKey);
      const seen = seenData ? JSON.parse(seenData) : {};

      // Check marketplace verification
      if (currentUser.marketplace_registration && 
          (currentUser.verification_status === 'verified' || currentUser.verification_status === 'rejected')) {
        const currentStatus = currentUser.verification_status;
        const hasSeenCurrent = seen.marketplace === currentStatus;
        
        if (!hasSeenCurrent) {
          setPendingNotification({
            type: 'marketplace',
            status: currentStatus as 'verified' | 'rejected'
          });
          return; // Only show one notification at a time
        }
      }

      // Check staff verification
      if (currentUser.is_organizer && 
          currentUser.organizer_role === 'staff' &&
          (currentUser.department_verification_status === 'approved' || 
           currentUser.department_verification_status === 'rejected')) {
        const currentStatus = currentUser.department_verification_status;
        const hasSeenCurrent = seen.staff === currentStatus;
        
        if (!hasSeenCurrent) {
          setPendingNotification({
            type: 'staff',
            status: currentStatus as 'approved' | 'rejected'
          });
          return;
        }
      }

      // No pending notifications
      setPendingNotification(null);
    } catch (error) {
      console.error('[UserContext] Failed to check notifications:', error);
    }
  };

  // Mark notification as seen
  const clearPendingNotification = async () => {
    if (!user || !pendingNotification) return;

    try {
      const storedKey = `${NOTIFICATION_SEEN_KEY}:${user.email}`;
      const seenData = await AsyncStorage.getItem(storedKey);
      const seen = seenData ? JSON.parse(seenData) : {};

      // Update the seen status for this notification type
      if (pendingNotification.type === 'marketplace') {
        seen.marketplace = user.verification_status;
      } else if (pendingNotification.type === 'staff') {
        seen.staff = user.department_verification_status;
      }

      await AsyncStorage.setItem(storedKey, JSON.stringify(seen));
      setPendingNotification(null);
    } catch (error) {
      console.error('[UserContext] Failed to clear notification:', error);
    }
  };

  // Login with persisted storage
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const result = await AuthService.login(email, password);
    if (result.success && result.account) {
      setUser(result.account);
      await AuthService.setActiveSession(result.account);
    }
    return { success: result.success, error: result.error };
  };

  // Logout - clears active session, keeps account in storage
  const logout = async (): Promise<void> => {
    await AuthService.logout();
    setUser(null);
  };

  // Register with persisted storage
  const register = async (
    email: string,
    password: string,
    displayName: string,
    isCosplayer: boolean,
    isOrganizer: boolean,
    baseBody: 'male' | 'female',
    bodySize: number
  ): Promise<{ success: boolean; error?: string }> => {
    const result = await AuthService.register(
      email,
      password,
      displayName,
      isCosplayer,
      isOrganizer,
      baseBody,
      bodySize
    );
    
    // FE-5.5+: No auto-login on registration - user must log in manually
    // This allows showing a success modal and redirecting to login screen
    
    return { success: result.success, error: result.error };
  };

  // Update verification status (persists across logout/login)
  const updateVerification = async (
    isVerified: boolean,
    status: User['verification_status']
  ): Promise<void> => {
    if (!user) return;
    
    const updated: StoredAccount = {
      ...user,
      is_holder_verified: isVerified,
      verification_status: status,
    } as StoredAccount;  // STEP 2: Type assertion to preserve marketplace_registration type
    
    await AuthService.updateUser(updated);
    setUser(updated);
  };

  // Onboarding helpers (for existing flow - kept for backward compat during onboarding)
  // These operate on in-memory state until register() is called
  const setUserRoles = (isCosplayer: boolean, isOrganizer: boolean) => {
    setUser((prev) => ({
      ...prev!,
      is_cosplayer: isCosplayer,
      is_organizer: isOrganizer,
    }));
  };

  const setUserAccount = (email: string, password: string, displayName: string) => {
    setUser((prev) => ({
      // Merge onto whatever already exists (preserves roles from setUserRoles)
      ...(prev ?? {
        is_cosplayer: false,
        is_organizer: false,
        base_body_selection: 'male',
        body_size_slider: 0.5,
        is_holder_verified: false,
        verification_status: 'pending',
        organizer_role: null,
      }),
      email,
      password_hash: password,
      display_name: displayName,
    }));
  };

  const setUserBody = (baseBody: 'male' | 'female', bodySize: number) => {
    setUser((prev) => ({
      ...prev!,
      base_body_selection: baseBody,
      body_size_slider: bodySize,
    }));
  };

  const isOnboardingComplete = user !== null &&
    user.email !== '' &&
    (user.is_cosplayer || user.is_organizer);

  // Reset Onboarding - clears ALL accounts and active session
  const resetOnboarding = async () => {
    await AuthService.resetAll();
    setUser(null);
  };

  return (
    <UserContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        register,
        updateVerification,
        setUserRoles,
        setUserAccount,
        setUserBody,
        isOnboardingComplete,
        resetOnboarding,
        pendingNotification,
        clearPendingNotification,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
