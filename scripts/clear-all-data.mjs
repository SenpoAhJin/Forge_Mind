#!/usr/bin/env node
/**
 * Clear All Data Script
 * Clears AsyncStorage, removes tokens, resets app to fresh state
 * Usage: node scripts/clear-all-data.mjs
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

async function clearAllData() {
  try {
    console.log('🧹 Clearing all app data...\n');

    // Get all keys
    const keys = await AsyncStorage.getAllKeys();
    console.log(`Found ${keys.length} keys in AsyncStorage:`);
    keys.forEach(key => console.log(`  - ${key}`));

    // Clear everything
    await AsyncStorage.clear();
    
    console.log('\n✅ All data cleared successfully!');
    console.log('');
    console.log('App has been reset to fresh state:');
    console.log('  ✓ Auth tokens removed');
    console.log('  ✓ User session cleared');
    console.log('  ✓ Theme preferences reset');
    console.log('  ✓ All cached data removed');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Restart the app (close and reopen)');
    console.log('  2. You should see the login screen');
    console.log('  3. Register or login with a fresh account');
    
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  clearAllData();
}

export { clearAllData };
