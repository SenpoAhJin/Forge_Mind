/**
 * ForgeMind Auth Service
 *
 * Phase 3 Step 3: register / login / logout are backed by the real
 * forgemind-backend auth API (bcrypt password hashes, server-side sessions).
 *
 * Everything else in this file — organizer roles, department verification,
 * marketplace registration, portfolio photos, the body slider — is still local
 * AsyncStorage. Those features were not migrated and continue to work exactly
 * as before.
 *
 * Credentials are NEVER stored on the device: `password_hash` is kept as an
 * always-empty string purely because the local `User` shape in UserContext
 * declares the field. Password verification happens on the server.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { authUrl, API_BASE_URL } from '../config/api';
import { StaffDepartment, DepartmentVerificationStatus } from '../types/organizer';

// Storage keys
const STORAGE_KEYS = {
  ACCOUNTS: '@forgemind:accounts',
  ACTIVE_SESSION: '@forgemind:active_session',
  SESSION_TOKEN: '@forgemind:session_token',
} as const;

/**
 * Request timeout for auth calls, in ms.
 *
 * 15 s rather than 10 s: a cold server has to hash the password with bcrypt on
 * the first login after a restart, and on a phone the same request also crosses
 * Wi-Fi. 10 s aborted those requests and the abort surfaced to the user as
 * "Fetch request has been canceled", which reads like a bug rather than a slow
 * server. An abort is still reported as a network error - never as bad
 * credentials.
 */
const AUTH_TIMEOUT_MS = 15000;

/**
 * Organizer columns sent with a registration so the Head/Staff role is created
 * server-side rather than patched into local storage afterwards.
 */
export interface OrganizerRegistration {
  organizer_role: 'head' | 'staff';
  head_organizer_department?: StaffDepartment | null;
  department?: StaffDepartment | null;
  department_verification_status?: DepartmentVerificationStatus | null;
}

/** Shape of `user` as returned by GET-style auth responses. */
interface ApiUser {
  user_id: string;
  email: string;
  display_name: string;
  is_cosplayer: boolean;
  is_organizer: boolean;
  base_body_selection: 'male' | 'female';
  profile_photo_url: string | null;
  is_holder_verified: boolean;
  verification_status: StoredAccount['verification_status'];
  organizer_role: 'head' | 'staff' | null;
  head_organizer_department: string | null;
  department: string | null;
  department_verification_status: string | null;
  department_rejection_reason: string | null;
  marketplace_role: 'buyer' | 'seller' | 'both' | null;
  seller_display_name: string | null;
  marketplace_contact_email: string | null;
  marketplace_contact_phone: string | null;
  payout_method_label: string | null;
  payout_method_number: string | null;
  agreed_to_marketplace_terms: boolean | null;
  marketplace_submitted_at: string | null;
  marketplace_rejection_reason: string | null;
  data_consent_given: boolean;
  theme_preference: string;
  created_at: string;
  updated_at: string;
}

// User account structure - matches v0.2.1 schema
export interface StoredAccount {
  email: string;                        // User.email (String(255), required)
  /** Always ''. Passwords are verified server-side; see file header. */
  password_hash: string;                // User.password_hash (String(255), required)
  display_name: string;                 // User.display_name (String(100), required)
  is_cosplayer: boolean;                // User.is_cosplayer (Boolean, required)
  is_organizer: boolean;                // User.is_organizer (Boolean, required)
  base_body_selection: 'male' | 'female'; // User.base_body_selection (Enum, required)
  body_size_slider: number;             // User.body_size_slider (Float, required) - 0.0-1.0
  is_holder_verified: boolean;          // User.is_holder_verified (Boolean, default false)
  verification_status: 'pending' | 'verified' | 'rejected' | 'revoked' | 'not_submitted'; // User.verification_status (Enum)
  organizer_role: 'head' | 'staff' | null; // User.organizer_role (FE-5.5 - Enum, nullable)
  
  // HEAD ORGANIZER DEPARTMENT OWNERSHIP
  // Each Head Organizer manages ONE department. Multiple Head Organizers can manage the SAME department.
  head_organizer_department?: StaffDepartment | null; // NEW: The ONE department this Head Organizer manages
  
  // MARKETPLACE REGISTRATION (ASSUMPTIONS - not in Foundation spec v0.2.1)
  // Only populated when user submits marketplace registration form
  // Feeds existing verification pipeline (verification_status field above)
  marketplace_registration?: {
    marketplace_role: 'buyer' | 'seller' | 'both';  // STEP 2: buyer/seller differentiation
    seller_display_name: string;          // ASSUMPTION: defaults to display_name, editable
    contact_email: string;                 // ASSUMPTION: defaults to email, editable, validated
    contact_phone?: string;                // ASSUMPTION: optional
    payout_method_label: string;           // ASSUMPTION: MOCK FIELD (e.g., "GCash", "Bank Transfer") — NOT ENCRYPTED
    payout_method_number: string;          // ASSUMPTION: MOCK FIELD (account number) — NOT ENCRYPTED, DEMO ONLY
    agreed_to_marketplace_terms: boolean;  // ASSUMPTION: separate from account T&C, must be true
    submitted_at: string;                  // ASSUMPTION: ISO timestamp when form submitted
    rejection_reason?: string;             // NEW: organizer's reason for rejecting (shown to cosplayer)
  };

  // PORTFOLIO PHOTOS (for sellers/crafters to showcase past work)
  portfolio_photos?: string[];            // Array of photo URIs, empty by default

  // STAFF DEPARTMENT VERIFICATION (FE-*: single-department scoping)
  // Only populated when staff registers with a department selected.
  // department is the ONE department this staff account is verified for.
  // department_verification_status reuses the pending/approved/rejected
  // three-value pattern already established for Marketplace.
  department?: StaffDepartment | null;                 // The ONE department selected at registration
  department_verification_status?: DepartmentVerificationStatus; // pending | approved | rejected
  department_rejection_reason?: string;                // NEW: organizer's reason for rejecting department access
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
   * Persists organizer columns to the server via PATCH /auth/organizer-fields.
   *
   * Returns `{ success: false, skipped: true }` when there is no session token,
   * which is the window between register() and the login that follows it: the
   * role was already written by the register request itself, so there is nothing
   * to patch and nothing to confirm.
   *
   * When a token IS present the server is authoritative. A rejection is
   * reported as a failure rather than swallowed, so a role the server did not
   * grant is never presented as granted.
   */
  private static async patchOrganizerFieldsOnServer(
    email: string,
    fields: Record<string, unknown>
  ): Promise<{ success: boolean; skipped?: boolean; error?: string; user?: ApiUser }> {
    let token: string | null = null;
    try {
      token = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_TOKEN);
    } catch {
      token = null;
    }
    if (!token) return { success: false, skipped: true };

    try {
      const response = await AuthService.authFetch('/organizer-fields', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: email.trim().toLowerCase(), ...fields }),
      });
      if (!response.ok) {
        return { success: false, error: await AuthService.errorMessage(response) };
      }
      const data = (await response.json()) as { user: ApiUser };
      return { success: true, user: data.user };
    } catch (error) {
      return { success: false, error: AuthService.transportErrorMessage(error) };
    }
  }

  /** POST to the auth API with a timeout, so a dead backend cannot hang the UI. */
  private static async authFetch(path: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);
    try {
      return await fetch(authUrl(path), {
        ...init,
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
      });
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Turns an error RESPONSE into the single human-readable string the existing
   * screens already render via `result.error`.
   *
   * Only reached when the server answered. A transport failure never produces a
   * Response — it throws — and is handled by `transportErrorMessage` instead.
   */
  private static async errorMessage(response: Response): Promise<string> {
    let message = 'Something went wrong. Please try again.';
    try {
      const data = await response.json();
      if (data && typeof data.message === 'string' && data.message.trim() !== '') {
        message = data.message;
      }
    } catch {
      // Non-JSON error body: keep the generic message.
    }
    if (__DEV__) {
      console.warn(
        `[AuthService] server replied ${response.status} for ${API_BASE_URL}: ${message}`,
      );
    }
    return message;
  }

  /**
   * Turns a THROWN fetch into a message that says the network is the problem,
   * not the user's password.
   *
   * This is the distinction that was missing. `fetch` rejects for a refused
   * connection, an unreachable host, or our own AbortController timeout, and in
   * every one of those cases the server said nothing at all — so there is no
   * 401 to report and no server message to relay. Reporting "login failed" here
   * is what made a Wi-Fi problem look like a typing mistake.
   */
  private static transportErrorMessage(error: unknown): string {
    // An abort and a refused connection are the same class of problem from the
    // user's point of view: no response arrived. React Native reports both as
    // "fetch failed: Fetch request has been canceled", so both get the one
    // message that tells them what to actually check.
    return "Can't reach the server. Check that your phone and PC are on the same Wi-Fi.";
  }

  /** Best-effort device description stored in sessions.device_info. */
  private static deviceInfo(): Record<string, string> {
    return { platform: Platform.OS, source: 'forgemind-mobile' };
  }

  /**
   * Projects the API's flat `user` row onto the local StoredAccount shape.
   *
   * `password_hash` is always '' — the server never sends a hash, and the local
   * User type in UserContext requires the key to exist. Local-only fields
   * (body_size_slider, portfolio_photos) are carried over from `existing`.
   */
  private static toStoredAccount(
    user: ApiUser,
    existing: StoredAccount | null,
    bodySizeSlider?: number,
  ): StoredAccount {
    const account: StoredAccount = {
      email: user.email,
      password_hash: '',
      display_name: user.display_name,
      is_cosplayer: user.is_cosplayer,
      is_organizer: user.is_organizer,
      base_body_selection: user.base_body_selection,
      body_size_slider: existing?.body_size_slider ?? bodySizeSlider ?? 0.5,
      is_holder_verified: user.is_holder_verified,
      verification_status: user.verification_status,
      organizer_role: user.organizer_role,
    };

    if (user.head_organizer_department) {
      account.head_organizer_department = user.head_organizer_department as StaffDepartment;
    }
    if (user.department) {
      account.department = user.department as StaffDepartment;
    }
    if (user.department_verification_status) {
      account.department_verification_status =
        user.department_verification_status as DepartmentVerificationStatus;
    }
    if (user.department_rejection_reason) {
      account.department_rejection_reason = user.department_rejection_reason;
    }

    // The server stores these flat; the app nests them.
    if (user.marketplace_role) {
      account.marketplace_registration = {
        marketplace_role: user.marketplace_role,
        seller_display_name: user.seller_display_name ?? user.display_name,
        contact_email: user.marketplace_contact_email ?? user.email,
        contact_phone: user.marketplace_contact_phone ?? undefined,
        payout_method_label: user.payout_method_label ?? '',
        payout_method_number: user.payout_method_number ?? '',
        agreed_to_marketplace_terms: user.agreed_to_marketplace_terms ?? false,
        submitted_at: user.marketplace_submitted_at ?? user.created_at,
        rejection_reason: user.marketplace_rejection_reason ?? undefined,
      };
    } else if (existing?.marketplace_registration) {
      // Local-only submission that the server has no record of yet.
      account.marketplace_registration = existing.marketplace_registration;
    }

    if (existing?.portfolio_photos) {
      account.portfolio_photos = existing.portfolio_photos;
    }

    return account;
  }

  /** Inserts or updates the account in the local cache array. */
  private static async upsertLocalAccount(
    account: StoredAccount,
    knownAccounts?: StoredAccount[],
  ): Promise<void> {
    const accounts = knownAccounts ?? (await this.getAccounts());
    const index = accounts.findIndex(
      (acc) => acc.email.toLowerCase() === account.email.toLowerCase(),
    );
    if (index === -1) {
      accounts.push(account);
    } else {
      accounts[index] = { ...accounts[index], ...account };
    }
    await this.saveAccounts(accounts);
  }

  /**
   * Register a new account
   * Creates the row in PostgreSQL via POST /auth/register. The password is
   * hashed with bcrypt server-side and is never stored on the device.
   * @returns Success boolean and error message if failed
   */
  static async register(
    email: string,
    password: string,
    displayName: string,
    isCosplayer: boolean,
    isOrganizer: boolean,
    baseBody: 'male' | 'female',
    bodySize: number,
    organizer?: OrganizerRegistration
  ): Promise<{ success: boolean; error?: string; account?: StoredAccount }> {
    try {
      const response = await AuthService.authFetch('/register', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          password,
          display_name: displayName.trim(),
          is_cosplayer: isCosplayer,
          is_organizer: isOrganizer,
          base_body_selection: baseBody,
          // The role is written server-side on the INSERT. It used to be set
          // only in local storage right after this call returned, and the login
          // that immediately followed read the role back from the server — as
          // null — so a Head Organizer lost its access every time it logged in.
          ...(organizer ? { ...organizer } : {}),
          device_info: AuthService.deviceInfo(),
        }),
      });

      if (!response.ok) {
        return { success: false, error: await AuthService.errorMessage(response) };
      }

      const data = (await response.json()) as { user: ApiUser };

      // Keep a local cache so the untouched local-only features (organizer
      // roles, marketplace, portfolio, body slider) behave exactly as before.
      // The password is not part of this record.
      const account = AuthService.toStoredAccount(data.user, null, bodySize);
      await AuthService.upsertLocalAccount(account);

      return { success: true, account };
    } catch (error) {
      console.warn('[AuthService] Registration failed (network):', (error as Error).message);
      return { success: false, error: AuthService.transportErrorMessage(error) };
    }
  }

  /**
   * Login with email and password
   * Verifies against the stored bcrypt hash in PostgreSQL via POST /auth/login
   * and stores the returned session token for later logout.
   * @returns Account if successful, null with error message if failed
   */
  static async login(
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string; account?: StoredAccount }> {
    try {
      const response = await AuthService.authFetch('/login', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          password,
          device_info: AuthService.deviceInfo(),
        }),
      });

      if (!response.ok) {
        return { success: false, error: await AuthService.errorMessage(response) };
      }

      const data = (await response.json()) as { user: ApiUser; session_token: string };

      await AsyncStorage.setItem(STORAGE_KEYS.SESSION_TOKEN, data.session_token);

      const accounts = await this.getAccounts();
      const existing =
        accounts.find((acc) => acc.email.toLowerCase() === data.user.email.toLowerCase()) ?? null;
      // body_size_slider and portfolio_photos have no server column, so they are
      // carried over from the local record rather than reset.
      const account = AuthService.toStoredAccount(data.user, existing, existing?.body_size_slider);
      await AuthService.upsertLocalAccount(account, accounts);

      return { success: true, account };
    } catch (error) {
      console.warn('[AuthService] Login failed (network):', (error as Error).message);
      return { success: false, error: AuthService.transportErrorMessage(error) };
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
   * Logout - revokes the server session via POST /auth/logout, then clears the
   * local session. The account stays in the local account list; the session
   * token does not.
   */
  static async logout(): Promise<void> {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_TOKEN);
      if (token) {
        try {
          await AuthService.authFetch('/logout', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch (error) {
          // A failed revoke must never strand the user in a logged-in state, so
          // local state is cleared regardless of what the server said.
          console.warn('[AuthService] Server logout failed (network):', (error as Error).message);
        }
      }
      await AsyncStorage.multiRemove([STORAGE_KEYS.ACTIVE_SESSION, STORAGE_KEYS.SESSION_TOKEN]);
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
    // The server is asked first so the role survives the next login. Before
    // this, the role was only ever written here, to local storage, and the login
    // response then replaced it with the server's null.
    const remote = await AuthService.patchOrganizerFieldsOnServer(email, {
      organizer_role: role,
    });
    if (!remote.success && !remote.skipped) {
      return { success: false, error: remote.error ?? 'Failed to update role' };
    }

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
   * Set Head Organizer's department ownership
   * Each Head Organizer manages ONE department. Multiple Head Organizers can manage the SAME department.
   */
  static async setHeadOrganizerDepartment(
    email: string,
    department: StaffDepartment | null
  ): Promise<{ success: boolean; error?: string }> {
    const remote = await AuthService.patchOrganizerFieldsOnServer(email, {
      head_organizer_department: department,
    });
    if (!remote.success && !remote.skipped) {
      return { success: false, error: remote.error ?? 'Failed to set department' };
    }

    try {
      const accounts = await this.getAccounts();
      const index = accounts.findIndex(acc => acc.email.toLowerCase() === email.toLowerCase());

      if (index === -1) {
        return { success: false, error: 'Account not found' };
      }

      accounts[index].head_organizer_department = department;
      await this.saveAccounts(accounts);

      // Update active session if this is the current user
      const session = await this.getActiveSession();
      if (session && session.email.toLowerCase() === email.toLowerCase()) {
        await this.setActiveSession({ ...session, head_organizer_department: department });
      }

      return { success: true };
    } catch (error) {
      console.error('[AuthService] Failed to set Head Organizer department:', error);
      return { success: false, error: 'Failed to set department' };
    }
  }

  /**
   * Update user's marketplace verification status
   * Called by Head Organizers to verify/reject cosplayers for marketplace access
   */
  static async updateVerificationStatus(
    email: string,
    status: 'pending' | 'verified' | 'rejected' | 'revoked' | 'not_submitted',
    rejectionReason?: string  // NEW: required when status is 'rejected'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const accounts = await this.getAccounts();
      const index = accounts.findIndex(acc => acc.email.toLowerCase() === email.toLowerCase());

      if (index === -1) {
        return { success: false, error: 'Account not found' };
      }

      accounts[index].verification_status = status;
      accounts[index].is_holder_verified = status === 'verified';
      
      // Store rejection reason if provided
      if (status === 'rejected' && rejectionReason && accounts[index].marketplace_registration) {
        accounts[index].marketplace_registration!.rejection_reason = rejectionReason;
      }
      
      await this.saveAccounts(accounts);

      // Update active session if this is the current user
      const activeSession = await this.getActiveSession();
      if (activeSession && activeSession.email.toLowerCase() === email.toLowerCase()) {
        activeSession.verification_status = status;
        activeSession.is_holder_verified = status === 'verified';
        if (status === 'rejected' && rejectionReason && activeSession.marketplace_registration) {
          activeSession.marketplace_registration.rejection_reason = rejectionReason;
        }
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
    status: Extract<DepartmentVerificationStatus, 'approved' | 'rejected'>,
    rejectionReason?: string  // NEW: required when status is 'rejected'
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

      // Persisted before the local write, so an approval made by a Head survives
      // the staff member's next login instead of reverting to 'pending'.
      const remote = await AuthService.patchOrganizerFieldsOnServer(email, {
        department_verification_status: status,
        ...(status === 'rejected' && rejectionReason
          ? { department_rejection_reason: rejectionReason }
          : {}),
      });
      if (!remote.success && !remote.skipped) {
        return { success: false, error: remote.error ?? 'Failed to update department verification status' };
      }

      accounts[index].department_verification_status = status;
      
      // Store rejection reason if provided
      if (status === 'rejected' && rejectionReason) {
        accounts[index].department_rejection_reason = rejectionReason;
      }
      
      await this.saveAccounts(accounts);

      // Update active session if this is the current user
      const activeSession = await this.getActiveSession();
      if (activeSession && activeSession.email.toLowerCase() === email.toLowerCase()) {
        activeSession.department_verification_status = status;
        if (status === 'rejected' && rejectionReason) {
          activeSession.department_rejection_reason = rejectionReason;
        }
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
      marketplace_role: 'buyer' | 'seller' | 'both';  // STEP 2: required role selection
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
