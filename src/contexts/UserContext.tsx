/**
 * ForgeMind User Context
 * Mock/local state for onboarding - matches v0.2.1 schema field names/types exactly
 * Will be replaced with real API calls in BE-1
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';

// User entity from v0.2.1 schema - only fields needed for onboarding
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
  verification_status: 'pending' | 'verified' | 'rejected' | 'revoked'; // User.verification_status (Enum)
}

interface UserContextType {
  user: User | null;
  setUserRoles: (isCosplayer: boolean, isOrganizer: boolean) => void;
  setUserAccount: (email: string, password: string, displayName: string) => void;
  setUserBody: (baseBody: 'male' | 'female', bodySize: number) => void;
  isOnboardingComplete: boolean;
  resetOnboarding: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

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

  const resetOnboarding = () => setUser(null);

  return (
    <UserContext.Provider value={{ user, setUserRoles, setUserAccount, setUserBody, isOnboardingComplete, resetOnboarding }}>
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
