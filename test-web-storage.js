/**
 * Web Storage Context Test
 * Tests if accounts registered in web session can login immediately
 */

// This script should be run in browser console at http://localhost:8081

async function testWebStorageContext() {
  console.log('=== WEB STORAGE CONTEXT TEST ===');
  
  // Test account
  const testAccount = {
    email: 'webtest@test.com',
    password: 'testpass123',
    role: 'cosplayer',
  };
  
  console.log('\n1. Checking current storage...');
  const currentData = await AsyncStorage.getItem('@forgemind_users');
  console.log('Current stored users:', currentData);
  
  console.log('\n2. Registering test account...');
  console.log('  Email:', testAccount.email);
  console.log('  Password:', testAccount.password);
  
  //Note: Actual registration must be done through UI
  console.log('\n3. After registration, try logging in with:');
  console.log('  Email:', testAccount.email);
  console.log('  Password:', testAccount.password);
  
  console.log('\nEXPECTED RESULTS:');
  console.log('- If login succeeds → Storage context is correct, login logic works');
  console.log('- If login fails → There is a bug in login comparison logic');
  
  console.log('\n=== TEST READY ===');
  console.log('Now register the account through the UI and try logging in.');
}

// Auto-run
testWebStorageContext();
