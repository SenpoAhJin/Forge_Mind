/**
 * Diagnostic utilities for debugging ForgeMind state
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Clear all ForgeMind AsyncStorage data to reset to seed data
 */
export async function clearAllData(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const forgemindKeys = keys.filter(key => 
      key.startsWith('@ForgeMind:') || 
      key.startsWith('FM_')
    );
    
    console.log('[Diagnostics] Clearing keys:', forgemindKeys);
    await AsyncStorage.multiRemove(forgemindKeys);
    console.log('[Diagnostics] All data cleared. Reload app to reseed.');
  } catch (error) {
    console.error('[Diagnostics] Failed to clear data:', error);
  }
}

/**
 * Log all AsyncStorage data for debugging
 */
export async function logAllData(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const forgemindKeys = keys.filter(key => 
      key.startsWith('@ForgeMind:') || 
      key.startsWith('FM_')
    );
    
    console.log('[Diagnostics] Found keys:', forgemindKeys);
    
    for (const key of forgemindKeys) {
      const value = await AsyncStorage.getItem(key);
      console.log(`[Diagnostics] ${key}:`, value ? JSON.parse(value) : null);
    }
  } catch (error) {
    console.error('[Diagnostics] Failed to log data:', error);
  }
}

/**
 * Check specific key's data
 */
export async function checkKey(key: string): Promise<any> {
  try {
    const value = await AsyncStorage.getItem(key);
    const parsed = value ? JSON.parse(value) : null;
    console.log(`[Diagnostics] ${key}:`, parsed);
    return parsed;
  } catch (error) {
    console.error(`[Diagnostics] Failed to check key ${key}:`, error);
    return null;
  }
}
