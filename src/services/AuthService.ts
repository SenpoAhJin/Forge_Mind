/**
 * ForgeMind Auth Service
 * FE-4.5: Persisted Register/Login (Mock Auth)
 * 
 * Handles AsyncStorage operations for:
 * - Multiple stored accounts (simple local array)
 * - Active session management
 * - Mock authentication (plaintext password comparison for now)
 * 
 * Schema fields match User entity v0.2.1 exactly
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const STORAGE_KEYS = {
  ACCOUNTS: '@forgemind:accounts',
  ACTIVE_SESSION: '@forgemind:active_session',
} as const;

// User account structure - matches v0.2.1 schema
export interface StoredAccount {
  email: string;                        // User.email (String(255), required)
  password_hash: string;                // User.password_hash (String(255), required) - plain for now
  display_name: string;                 // User.display_name (String(100), required)
  is_cosplayer: boolean;                // User.is_cosplayer (Boolean, required)
  is_organizer: boolean;                // User.is_organizer (Boolean, required)
  base_body_selection: 'male' | 'female'; // User.base_body_selection (Enum, required)
  body_size_slider: number;             // User.body_size_slider (Float, required) - 0.0-1.0
  is_holder_verified: boolean;          // User.is_holder_verified (Boolean, default false)
  verification_status: 'pending' | 'verified' | 'rejected' | 'revoked'; // User.verification_status (Enum)
}

export class AuthService {
  /**
   * Get all stored accounts
   */
  static async getAccounts(): Promise<StoredAccount[]> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.ACCOUNTS);
      return json ? JSON.parse(json) : [];
    } catch (error) {
      console.error('[AuthService] Failed to load accounts:', error);
      return [];
    }
  }

  /**
   * Save accounts array to storage
   */
  private static async saveAccounts(accounts: StoredAccount[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
    } catch (error) {
      console.error('[AuthService] Failed to save accounts:', error);
      throw error;
    }
  }

  /**
   * Register a new account
   * @returns Success boolean and error message if failed
   */
  static async register(
    email: string,
    password: string,
    displayName: string,
    isCosplayer: boolean,
    isOrganizer: boolean,
    baseBody: 'male' | 'female',
    bodySize: number
  ): Promise<{ success: boolean; error?: string; account?: StoredAccount }> {
    try {
      const accounts = await this.getAccounts();
      
      // Check if email already exists
      const existing = accounts.find(acc => acc.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        return { success: false, error: 'An account with this email already exists' };
      }

      // Create new account
      const newAccount: StoredAccount = {
        email,
        password_hash: password, // Plaintext for now - real hashing in BE-1
        display_name: displayName,
        is_cosplayer: isCosplayer,
        is_organizer: isOrganizer,
        base_body_selection: baseBody,
        body_size_slider: bodySize,
        is_holder_verified: false,
        verification_status: 'pending',
      };

      accounts.push(newAccount);
      await this.saveAccounts(accounts);

      return { success: true, account: newAccount };
    } catch (error) {
      console.error('[AuthService] Registration failed:', error);
      return { success: false, error: 'Failed to create account. Please try again.' };
    }
  }

  /**
   * Login with email and password
   * @returns Account if successful, null with error message if failed
   */
  static async login(
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string; account?: StoredAccount }> {
    try {
      const accounts = await this.getAccounts();
      
      // Find matching account (case-insensitive email)
      const account = accounts.find(
        acc => acc.email.toLowerCase() === email.toLowerCase() && acc.password_hash === password
      );

      if (!account) {
        return { success: false, error: 'Invalid email or password' };
      }

      return { success: true, account };
    } catch (error) {
      console.error('[AuthService] Login failed:', error);
      return { success: false, error: 'Login failed. Please try again.' };
    }
  }

  /**
   * Set the active session (logged-in user)
   */
  static async setActiveSession(account: StoredAccount): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(account));
    } catch (error) {
      console.error('[AuthService] Failed to set active session:', error);
      throw error;
    }
  }

  /**
   * Get the active session (currently logged-in user)
   */
  static async getActiveSession(): Promise<StoredAccount | null> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
      return json ? JSON.parse(json) : null;
    } catch (error) {
      console.error('[AuthService] Failed to load active session:', error);
      return null;
    }
  }

  /**
   * Logout - clears active session but keeps account in storage
   */
  static async logout(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
    } catch (error) {
      console.error('[AuthService] Logout failed:', error);
      throw error;
    }
  }

  /**
   * Update the current user's data (for profile edits, verification changes, etc.)
   * Updates both active session and stored account
   */
  static async updateUser(updatedAccount: StoredAccount): Promise<void> {
    try {
      // Update active session
      await this.setActiveSession(updatedAccount);

      // Update in accounts array
      const accounts = await this.getAccounts();
      const index = accounts.findIndex(acc => acc.email === updatedAccount.email);
      if (index !== -1) {
        accounts[index] = updatedAccount;
        await this.saveAccounts(accounts);
      }
    } catch (error) {
      console.error('[AuthService] Failed to update user:', error);
      throw error;
    }
  }

  /**
   * Reset all data - for "Reset Onboarding" functionality
   * Clears ALL accounts and active session
   */
  static async resetAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([STORAGE_KEYS.ACCOUNTS, STORAGE_KEYS.ACTIVE_SESSION]);
    } catch (error) {
      console.error('[AuthService] Reset failed:', error);
      throw error;
    }
  }
}
