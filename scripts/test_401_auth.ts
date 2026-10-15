/**
 * D6 Step 5: Test 401 auth path
 * 
 * Send request to matcher endpoint WITHOUT session cookie
 * Expected: 401 Unauthorized (from requireSession middleware)
 */

async function test401Auth() {
  const BACKEND_URL = "http://localhost:3000";
  const ENDPOINT = "/api/ai/match";
  
  const payload = {
    characterId: "gojo-satoru",
    variantId: "season-2-uniform",
    slotId: "wig",
    attire: [
      {
        attire_id: "test-wig-1",
        original_input_text: "White spiky wig",
        auto_categorized_type: "wig",
        auto_categorized_color: "white",
        keywords: ["white", "spiky", "short", "anime"],
      },
    ],
  };
  
  console.log(`\n=== D6 Step 5: Testing 401 Auth Path ===\n`);
  console.log(`Target: ${BACKEND_URL}${ENDPOINT}`);
  console.log(`Session: NONE (no cookie sent)\n`);
  
  try {
    const response = await fetch(`${BACKEND_URL}${ENDPOINT}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // NO cookie header = no session
      },
      body: JSON.stringify(payload),
    });
    
    const status = response.status;
    const statusText = response.statusText;
    const body = await response.text();
    
    console.log(`Response Status: ${status} ${statusText}`);
    console.log(`Response Body: ${body}\n`);
    
    if (status === 401) {
      console.log("✅ PASS: Got 401 as expected (requireSession blocked the request)");
    } else {
      console.log(`❌ FAIL: Expected 401, got ${status}`);
    }
  } catch (error) {
    console.error(`\n❌ ERROR: ${error}\n`);
    console.log("Possible cause: Backend not running on port 3000");
  }
}

test401Auth();
