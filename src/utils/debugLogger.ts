/**
 * Debug Logger for FE-5.5 Verification
 * Logs raw stored data at each workflow step
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  ACCOUNTS: '@forgemind_accounts',
  ACTIVE_SESSION: '@forgemind_active_session',
  ORGANIZER_REQUESTS: '@forgemind_organizer_requests',
};

export class DebugLogger {
  /**
   * Log all accounts in storage
   */
  static async logAllAccounts() {
    try {
      const accountsJson = await AsyncStorage.getItem(STORAGE_KEYS.ACCOUNTS);
      const accounts = accountsJson ? JSON.parse(accountsJson) : [];
      console.log('═══════════════════════════════════════');
      console.log('ALL ACCOUNTS IN STORAGE:');
      console.log('═══════════════════════════════════════');
      console.log(JSON.stringify(accounts, null, 2));
      console.log('═══════════════════════════════════════');
      return accounts;
    } catch (error) {
      console.error('Error logging accounts:', error);
      return [];
    }
  }

  /**
   * Log active session
   */
  static async logActiveSession() {
    try {
      const sessionJson = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
      const session = sessionJson ? JSON.parse(sessionJson) : null;
      console.log('═══════════════════════════════════════');
      console.log('ACTIVE SESSION:');
      console.log('═══════════════════════════════════════');
      console.log(JSON.stringify(session, null, 2));
      console.log('═══════════════════════════════════════');
      return session;
    } catch (error) {
      console.error('Error logging session:', error);
      return null;
    }
  }

  /**
   * Log specific account by email
   */
  static async logAccountByEmail(email: string) {
    try {
      const accounts = await this.logAllAccounts();
      const account = accounts.find((a: any) => a.email === email);
      console.log('═══════════════════════════════════════');
      console.log(`ACCOUNT: ${email}`);
      console.log('═══════════════════════════════════════');
      console.log(JSON.stringify(account, null, 2));
      console.log('═══════════════════════════════════════');
      return account;
    } catch (error) {
      console.error('Error logging account:', error);
      return null;
    }
  }

  /**
   * Log all organizer access requests
   */
  static async logAllAccessRequests() {
    try {
      const requestsJson = await AsyncStorage.getItem(STORAGE_KEYS.ORGANIZER_REQUESTS);
      const requests = requestsJson ? JSON.parse(requestsJson) : [];
      console.log('═══════════════════════════════════════');
      console.log('ALL ORGANIZER ACCESS REQUESTS:');
      console.log('═══════════════════════════════════════');
      console.log(JSON.stringify(requests, null, 2));
      console.log('═══════════════════════════════════════');
      return requests;
    } catch (error) {
      console.error('Error logging requests:', error);
      return [];
    }
  }

  /**
   * Log specific request by user ID
   */
  static async logAccessRequestByUser(userId: string) {
    try {
      const requests = await this.logAllAccessRequests();
      const request = requests.find((r: any) => r.user_id === userId);
      console.log('═══════════════════════════════════════');
      console.log(`ACCESS REQUEST FOR: ${userId}`);
      console.log('═══════════════════════════════════════');
      console.log(JSON.stringify(request, null, 2));
      console.log('═══════════════════════════════════════');
      return request;
    } catch (error) {
      console.error('Error logging request:', error);
      return null;
    }
  }

  /**
   * Clear all storage (for clean testing)
   */
  static async clearAllStorage() {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACCOUNTS,
        STORAGE_KEYS.ACTIVE_SESSION,
        STORAGE_KEYS.ORGANIZER_REQUESTS,
      ]);
      console.log('═══════════════════════════════════════');
      console.log('ALL STORAGE CLEARED');
      console.log('═══════════════════════════════════════');
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }
}

// Expose to window for browser console access
if (typeof window !== 'undefined') {
  (window as any).DebugLogger = DebugLogger;
}
