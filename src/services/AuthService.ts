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
import { StaffDepartment, DepartmentVerificationStatus } from '../types/organizer';

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
  verification_status: 'pending' | 'verified' | 'rejected' | 'revoked' | 'not_submitted'; // User.verification_status (Enum)
  organizer_role: 'head' | 'staff' | null; // User.organizer_role (FE-5.5 - Enum, nullable)
  
  // MARKETPLACE REGISTRATION (ASSUMPTIONS - not in Foundation spec v0.2.1)
  // Only populated when user submits marketplace registration form
  // Feeds existing verification pipeline (verification_status field above)
  marketplace_registration?: {
    seller_display_name: string;          // ASSUMPTION: defaults to display_name, editable
    contact_email: string;                 // ASSUMPTION: defaults to email, editable, validated
    contact_phone?: string;                // ASSUMPTION: optional
    payout_method_label: string;           // ASSUMPTION: MOCK FIELD (e.g., "GCash", "Bank Transfer") — NOT ENCRYPTED
    payout_method_number: string;          // ASSUMPTION: MOCK FIELD (account number) — NOT ENCRYPTED, DEMO ONLY
    agreed_to_marketplace_terms: boolean;  // ASSUMPTION: separate from account T&C, must be true
    submitted_at: string;                  // ASSUMPTION: ISO timestamp when form submitted
  };

  // STAFF DEPARTMENT VERIFICATION (FE-*: single-department scoping)
  // Only populated when staff registers with a department selected.
  // department is the ONE department this staff account is verified for.
  // department_verification_status reuses the pending/approved/rejected
  // three-value pattern already established for Marketplace.
  department?: StaffDepartment | null;                 // The ONE department selected at registration
  department_verification_status?: DepartmentVerificationStatus; // pending | approved | rejected
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
      
      console.log('[AuthService DEBUG] Registration attempt:');
      console.log('  Email:', email);
      console.log('  Password:', password);
      console.log('  Display Name:', displayName);
      console.log('  Roles:', { isCosplayer, isOrganizer });
      console.log('  Existing accounts before save:', JSON.stringify(accounts, null, 2));
      
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
        verification_status: 'not_submitted', // Changed: Only becomes 'pending' after marketplace registration submission
        organizer_role: null, // FE-5.5: Always starts as null, must request access
      };

      accounts.push(newAccount);
      await this.saveAccounts(accounts);
      
      console.log('[AuthService DEBUG] Registration successful');
      console.log('  New account:', JSON.stringify(newAccount, null, 2));
      console.log('  All accounts after save:', JSON.stringify(accounts, null, 2));

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
      
      // DEBUG: Log what we're comparing
      console.log('[AuthService DEBUG] Login attempt:');
      console.log('  Input email:', email);
      console.log('  Input password:', password);
      console.log('  Stored accounts:', JSON.stringify(accounts, null, 2));
      
      // Find matching account (case-insensitive email)
      const account = accounts.find(
        acc => acc.email.toLowerCase() === email.toLowerCase() && acc.password_hash === password
      );

      if (!account) {
        console.log('[AuthService DEBUG] No matching account found');
        console.log('  Email matches:', accounts.map(a => ({
          stored: a.email,
          match: a.email.toLowerCase() === email.toLowerCase()
        })));
        console.log('  Password matches:', accounts.map(a => ({
          stored: a.password_hash,
          match: a.password_hash === password
        })));
        return { success: false, error: 'Invalid email or password' };
      }

      console.log('[AuthService DEBUG] Login successful');
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

  /**
   * Update user's organizer_role (FE-5.5)
   * Called when access request is approved (→ 'head') or staff invite is accepted (→ 'staff')
   */
  static async updateOrganizerRole(
    email: string,
    role: 'head' | 'staff' | null
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const accounts = await this.getAccounts();
      const index = accounts.findIndex(acc => acc.email.toLowerCase() === email.toLowerCase());

      if (index === -1) {
        return { success: false, error: 'Account not found' };
      }

      accounts[index].organizer_role = role;
      await this.saveAccounts(accounts);

      // Update active session if this is the current user
      const session = await this.getActiveSession();
      if (session && session.email.toLowerCase() === email.toLowerCase()) {
        await this.setActiveSession({ ...session, organizer_role: role });
      }

      return { success: true };
    } catch (error) {
      console.error('[AuthService] Failed to update organizer_role:', error);
      return { success: false, error: 'Failed to update role' };
    }
  }

  /**
   * Update user's marketplace verification status
   * Called by Head Organizers to verify/reject cosplayers for marketplace access
   */
  static async updateVerificationStatus(
    email: string,
    status: 'pending' | 'verified' | 'rejected' | 'revoked' | 'not_submitted'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const accounts = await this.getAccounts();
      const index = accounts.findIndex(acc => acc.email.toLowerCase() === email.toLowerCase());

      if (index === -1) {
        return { success: false, error: 'Account not found' };
      }

      accounts[index].verification_status = status;
      accounts[index].is_holder_verified = status === 'verified';
      await this.saveAccounts(accounts);

      // Update active session if this is the current user
      const activeSession = await this.getActiveSession();
      if (activeSession && activeSession.email.toLowerCase() === email.toLowerCase()) {
        activeSession.verification_status = status;
        activeSession.is_holder_verified = status === 'verified';
        await this.setActiveSession(activeSession);
      }

      return { success: true };
    } catch (error) {
      console.error('[AuthService] Update verification status failed:', error);
      return { success: false, error: 'Failed to update verification status' };
    }
  }

  /**
   * Record a staff member's department and start it as "pending".
   * Same event-trigger pattern as Marketplace (submitMarketplaceRegistration):
   * it only becomes 'pending' because the staff registered with a department
   * selected. If the department is somehow blank/skipped, NO pending entry
   * is created at all.
   */
  static async setStaffDepartment(
    email: string,
    department: StaffDepartment | null | undefined
  ): Promise<{ success: boolean; error?: string }> {
    if (!department) {
      // Department blank/skipped — deliberately create no pending entry.
      return { success: true };
    }

    try {
      const accounts = await this.getAccounts();
      const index = accounts.findIndex(acc => acc.email.toLowerCase() === email.toLowerCase());

      if (index === -1) {
        return { success: false, error: 'Account not found' };
      }

      accounts[index].department = department;
      accounts[index].department_verification_status = 'pending';
      await this.saveAccounts(accounts);

      // Update active session if this is the current user
      const activeSession = await this.getActiveSession();
      if (activeSession && activeSession.email.toLowerCase() === email.toLowerCase()) {
        activeSession.department = department;
        activeSession.department_verification_status = 'pending';
        await this.setActiveSession(activeSession);
      }

      return { success: true };
    } catch (error) {
      console.error('[AuthService] Failed to set staff department:', error);
      return { success: false, error: 'Failed to set staff department' };
    }
  }

  /**
   * Approve or reject a staff account's department verification.
   * Scoped strictly to the ONE department that account selected — this does
   * NOT grant any other department, nor Head Organizer/Marketplace access.
   */
  static async updateDepartmentVerificationStatus(
    email: string,
    status: Extract<DepartmentVerificationStatus, 'approved' | 'rejected'>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const accounts = await this.getAccounts();
      const index = accounts.findIndex(acc => acc.email.toLowerCase() === email.toLowerCase());

      if (index === -1) {
        return { success: false, error: 'Account not found' };
      }

      // Only update if the account has a department selected (their ONE department).
      // Approving a department-less account would grant nothing meaningful.
      if (!accounts[index].department) {
        return { success: false, error: 'This staff account has no department selected' };
      }

      accounts[index].department_verification_status = status;
      await this.saveAccounts(accounts);

      // Update active session if this is the current user
      const activeSession = await this.getActiveSession();
      if (activeSession && activeSession.email.toLowerCase() === email.toLowerCase()) {
        activeSession.department_verification_status = status;
        await this.setActiveSession(activeSession);
      }

      return { success: true };
    } catch (error) {
      console.error('[AuthService] Failed to update department verification status:', error);
      return { success: false, error: 'Failed to update department verification status' };
    }
  }

  /**
   * Submit marketplace registration (NEW)
   * Sets marketplace_registration data and changes verification_status from 'not_submitted' to 'pending'
   */
  static async submitMarketplaceRegistration(
    email: string,
    registrationData: {
      seller_display_name: string;
      contact_email: string;
      contact_phone?: string;
      payout_method_label: string;
      payout_method_number: string;
      agreed_to_marketplace_terms: boolean;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const accounts = await this.getAccounts();
      const index = accounts.findIndex(acc => acc.email.toLowerCase() === email.toLowerCase());

      if (index === -1) {
        return { success: false, error: 'Account not found' };
      }

      // Set marketplace registration data
      accounts[index].marketplace_registration = {
        ...registrationData,
        submitted_at: new Date().toISOString(),
      };

      // Change status from 'not_submitted' to 'pending'
      accounts[index].verification_status = 'pending';

      await this.saveAccounts(accounts);

      // Update active session if this is the current user
      const activeSession = await this.getActiveSession();
      if (activeSession && activeSession.email.toLowerCase() === email.toLowerCase()) {
        activeSession.marketplace_registration = accounts[index].marketplace_registration;
        activeSession.verification_status = 'pending';
        await this.setActiveSession(activeSession);
      }

      return { success: true };
    } catch (error) {
      console.error('[AuthService] Submit marketplace registration failed:', error);
      return { success: false, error: 'Failed to submit marketplace registration' };
    }
  }
}
