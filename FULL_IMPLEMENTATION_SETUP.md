# ForgeMind Full Implementation Setup Guide

**For completing all 5 critical thesis features (12-16 weeks)**

---

## 🎯 OVERVIEW

You're implementing:
1. **Holder Verification System** (2 weeks)
2. **3D Visualization** (5-7 weeks) 
3. **Live Location Sharing** (2-3 weeks)
4. **AI Attire Matching** (3-4 weeks)
5. **Listing Screener AI** (2-3 weeks)

This guide tells you what to install, configure, and prepare BEFORE you start coding each feature.

---

## 📋 SETUP CHECKLIST BY SPRINT

### Sprint 0: Foundation Setup (1 week - DO THIS NOW)

Before starting any feature implementation, set up your development environment completely.

#### 1. Development Tools

**Install These (if not already):**

```powershell
# Node.js LTS (v18 or v20)
winget install OpenJS.NodeJS.LTS

# Python 3.10+ (for AI/ML service)
winget install Python.Python.3.11

# Git LFS (for large 3D assets)
git lfs install

# Blender (for 3D modeling)
winget install BlenderFoundation.Blender

# Unity Hub (for 3D rendering)
# Download from: https://unity.com/download
```

**VS Code Extensions (Recommended):**
- Expo Tools
- React Native Tools  
- Python (by Microsoft)
- Unity Code Snippets
- 3D Viewer (for checking .obj/.fbx files)

#### 2. Firebase Configuration

**Enable These Firebase Services:**

```bash
# In Firebase Console (https://console.firebase.google.com)

1. Enable Realtime Database (for live location)
   - Go to Realtime Database → Create Database
   - Start in test mode initially
   - Location: Choose closest to target users

2. Enable Cloud Functions (for AI triggers)
   - Go to Functions → Get Started
   - Upgrade to Blaze plan (pay-as-you-go)
   - Required for calling external AI APIs

3. Enable Storage (for ID uploads)
   - Go to Storage → Get Started
   - Set up security rules later

4. Check Firestore Rules
   - Ensure user data properly secured
   - Add Holder role checks
```

**Install Firebase CLI:**
```powershell
npm install -g firebase-tools
firebase login
firebase init functions
```

**Update Firebase Rules (in firebase.json):**
```json
{
  "database": {
    "rules": "database.rules.json"
  },
  "storage": {
    "rules": "storage.rules"
  },
  "functions": {
    "source": "functions"
  }
}
```

#### 3. Google Cloud Setup (for AI APIs)

**Required APIs:**

1. **Google Cloud Vision API** (listing screener)
   - Enable in Cloud Console
   - Create API key
   - Set spending limit ($50/month recommended)

2. **Google Cloud Speech-to-Text** (voice input - optional)
   - Enable if implementing voice entry
   - Filipino (Tagalog) language support available

**Setup Steps:**
```bash
# Go to: https://console.cloud.google.com

1. Create new project (or use existing Firebase project)
2. Enable APIs:
   - Cloud Vision API
   - Cloud Speech-to-Text API (if doing voice)
3. Create Service Account:
   - IAM & Admin → Service Accounts → Create
   - Grant "Cloud Vision API User" role
   - Download JSON key
4. Store key securely:
   - Add to .gitignore
   - Upload to Firebase Functions config
```

**Configure in Firebase Functions:**
```powershell
cd forgemind-mobile/functions
firebase functions:config:set google.key="$(cat path/to/service-account-key.json)"
```

#### 4. Unity Installation & Setup

**Install Unity (for 3D Visualization):**

```powershell
# Download Unity Hub from unity.com/download

# Install Unity 2022.3 LTS (Long Term Support)
# Components needed:
# - Android Build Support
# - iOS Build Support  
# - WebGL Build Support
# - Visual Studio integration

# Unity Editor version: 2022.3.x LTS
```

**Create Unity Project:**
```bash
# In Unity Hub:
1. New Project → 3D (URP - Universal Render Pipeline)
2. Name: ForgeMind-3D-Renderer
3. Location: forgemind-mobile/unity-renderer/

# Project Structure:
unity-renderer/
├── Assets/
│   ├── Models/       # Body meshes, garments
│   ├── Materials/    # Textures, shaders
│   ├── Scripts/      # C# renderer code
│   └── Scenes/       # Main dress-up scene
├── Packages/
└── ProjectSettings/
```

**Required Unity Packages:**
```
Window → Package Manager → Install:
- Universal RP
- Cinemachine (camera control)
- TextMeshPro (if adding labels)
- WebGL Publisher (for embedding in React Native)
```

#### 5. Python AI/ML Service Setup

**Create Python Service:**
```powershell
# Create directory
mkdir forgemind-ai-service
cd forgemind-ai-service

# Create virtual environment
python -m venv venv
venv\Scripts\activate

# Install dependencies
pip install flask flask-cors
pip install opencv-python pillow
pip install scikit-learn pandas numpy
pip install google-cloud-vision
pip install firebase-admin

# Create requirements.txt
pip freeze > requirements.txt
```

**Project Structure:**
```
forgemind-ai-service/
├── venv/
├── app.py                    # Flask API server
├── requirements.txt
├── models/
│   ├── attire_matcher.py     # Attire matching logic
│   ├── listing_screener.py   # Listing classification
│   ├── readiness_forecaster.py
│   └── value_estimator.py
├── data/
│   └── reference_data.json   # Character/Material reference
└── config/
    └── firebase_key.json     # Service account key
```

**Basic app.py Template:**
```python
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

@app.route('/api/match-attire', methods=['POST'])
def match_attire():
    # TODO: Implement attire matching
    return jsonify({"matches": []})

@app.route('/api/screen-listing', methods=['POST'])
def screen_listing():
    # TODO: Implement listing screening
    return jsonify({"allowed": True})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
```

#### 6. Blender Setup (for 3D Modeling)

**Install Blender Addons:**
```
Edit → Preferences → Add-ons → Install:
- glTF Exporter (export to Unity)
- Rigify (character rigging)
- Auto-Rig Pro (advanced rigging - optional, paid)
```

**Create Base Assets Folder:**
```
forgemind-3d-assets/
├── base-bodies/
│   ├── male-base.blend
│   ├── female-base.blend
│   └── exports/
├── garments/
│   ├── tops/
│   ├── bottoms/
│   ├── dresses/
│   ├── wigs/
│   └── shoes/
├── references/
│   └── body-reference-photos/
└── exported/          # For Unity import
```

#### 7. Git Configuration

**Update .gitignore:**
```gitignore
# Unity
[Ll]ibrary/
[Tt]emp/
[Oo]bj/
[Bb]uild/
[Bb]uilds/
unity-renderer/*.csproj
unity-renderer/*.sln

# Python
forgemind-ai-service/venv/
forgemind-ai-service/__pycache__/
forgemind-ai-service/*.pyc
forgemind-ai-service/config/*.json

# API Keys
**/service-account-key.json
**/.env
**/firebase-key.json

# Large 3D Assets (use Git LFS)
*.blend1
*.fbx
*.obj
*.ma
*.mb
```

**Configure Git LFS:**
```powershell
git lfs track "*.blend"
git lfs track "*.fbx"
git lfs track "*.obj"
git lfs track "*.png" --lockable
git add .gitattributes
```

#### 8. Testing Tools

**Install Testing Dependencies:**
```powershell
cd forgemind-mobile

# Unit testing
npm install --save-dev jest @testing-library/react-native

# E2E testing (optional but recommended)
npm install --save-dev detox detox-cli

# Network simulation (for live location testing)
# Use built-in Android Network Speed Simulator
# Or: npm install --save-dev @expo/ngrok
```

#### 9. Documentation Setup

**Create Sprint Folders:**
```powershell
cd forgemind-mobile
mkdir docs
cd docs
mkdir sprint-1-holder-verification
mkdir sprint-2-3d-start
mkdir sprint-3-3d-complete  
mkdir sprint-4-live-location
mkdir sprint-5-ai-matching
mkdir sprint-6-listing-screener
mkdir sprint-7-testing
```

**Document Templates:**
```markdown
# Each sprint folder should have:
- PLAN.md          # What to build
- SETUP.md         # Dependencies/config
- PROGRESS.md      # Daily updates
- BLOCKERS.md      # Issues encountered
- DONE.md          # Completion checklist
```

---

## 🚀 SPRINT 1 SETUP: Holder Verification (Week 1-2)

### What to Install:

**React Native Dependencies:**
```powershell
cd forgemind-mobile
npm install expo-document-picker
npm install expo-image-manipulator
npm install react-native-pdf  # For viewing uploaded IDs
```

**Firebase Setup:**
```javascript
// Add to firebase config
// Enable Storage for ID uploads
// Update Firestore with Holder role structure
```

### Files to Create:

```
forgemind-mobile/src/
├── types/
│   └── holder.ts                    # Holder verification types
├── contexts/
│   └── HolderContext.tsx            # Holder verification context
├── screens/
│   └── holder/
│       ├── HolderDashboard.tsx      # Holder main screen
│       ├── VerificationQueue.tsx    # Pending verifications
│       └── VerificationDetail.tsx   # ID review screen
└── navigation/
    └── HolderStackNavigator.tsx     # Holder navigation
```

### Firebase Firestore Schema:

```javascript
// /users/{userId}
{
  is_holder: boolean,
  holder_verified_date: timestamp
}

// /verification_requests/{requestId}
{
  user_id: string,
  user_name: string,
  user_email: string,
  id_photo_url: string,           // Government ID
  selfie_photo_url: string,       // Recent photo
  submitted_at: timestamp,
  status: 'pending' | 'approved' | 'rejected',
  reviewed_by: string,            // Holder email
  reviewed_at: timestamp,
  rejection_reason: string
}
```

### Configuration:

**Update UserContext:**
```typescript
interface User {
  // ... existing fields
  is_holder?: boolean;
  holder_verified_date?: string;
  marketplace_verified?: boolean;
  marketplace_verified_date?: string;
  marketplace_verified_by?: string; // Holder email
}
```

---

## 🎨 SPRINT 2-3 SETUP: 3D Visualization (Week 3-9)

### Week 3-4: Unity + Base Bodies

**Install Unity Packages:**
```
Window → Package Manager:
- Universal RP 14.x
- Shader Graph
- Animation Rigging
- Cinemachine
```

**Download Reference Assets:**
```
Free Assets (Unity Asset Store):
- Starter Assets - Third Person Character Controller
- UMA 2 - Unity Multipurpose Avatar (for blend shapes reference)

OR

Purchase Premium:
- Daz3D Genesis 8 (body base)
- Reallusion Character Creator
```

**React Native Bridge:**
```powershell
# Install Unity bridge package
npm install react-native-unity-view

# For WebGL embedding
npm install react-iframe
```

### Week 5-7: Garments + Blend Shapes

**Blender Workflow:**
```
1. Create base body mesh
2. Add armature (skeleton)
3. Create shape keys (blend shapes):
   - Size: 0.0 to 1.0 slider
   - Each shape key = body size variant
4. Weight paint for smooth deformation
5. Export as FBX to Unity
```

**Unity Import Settings:**
```
Inspector → Import Settings:
- Scale Factor: 1
- Blend Shape Normals: Import
- Animation Type: Humanoid
- Avatar Definition: Create From This Model
```

### Week 8-9: Renderer Integration

**Unity C# Scripts:**
```csharp
// DressUpRenderer.cs
public class DressUpRenderer : MonoBehaviour
{
    public SkinnedMeshRenderer bodyMesh;
    public float bodySizeSlider = 0.5f;
    
    void Start()
    {
        // Initialize
    }
    
    void UpdateBodySize(float sliderValue)
    {
        bodyMesh.SetBlendShapeWeight(0, sliderValue * 100);
    }
    
    void AddGarment(string garmentID)
    {
        // Load and attach garment
    }
}
```

**Build Unity for React Native:**
```
File → Build Settings:
- Platform: WebGL (for web) OR Android/iOS
- Compression Format: Disabled (for faster loading)
- Build
```

**React Native Component:**
```typescript
// src/components/DressUpViewer.tsx
import { UnityView } from 'react-native-unity-view';

export const DressUpViewer: React.FC<Props> = ({ 
  bodySizeSlider, 
  matchedGarments 
}) => {
  return (
    <UnityView
      style={{ flex: 1 }}
      onUnityMessage={(event) => {
        // Handle Unity → React communication
      }}
    />
  );
};
```

---

## 📍 SPRINT 4 SETUP: Live Location (Week 10-12)

### Dependencies:

```powershell
npm install expo-location
npm install react-native-maps
npm install @react-native-firebase/database  # Realtime DB
```

### Firebase Realtime Database Setup:

**Enable Realtime Database:**
```
Firebase Console → Realtime Database → Create Database
Mode: Test mode (update rules later)
```

**Database Structure:**
```json
{
  "live_locations": {
    "{eventId}": {
      "{userId}": {
        "lat": 14.5995,
        "lng": 120.9842,
        "timestamp": 1726502400000,
        "display_name": "John Doe",
        "opted_in": true
      }
    }
  },
  "location_sessions": {
    "{eventId}": {
      "active": true,
      "started_at": 1726502400000,
      "ends_at": 1726588800000
    }
  }
}
```

**Security Rules:**
```json
{
  "rules": {
    "live_locations": {
      "$eventId": {
        "$userId": {
          ".read": "auth != null && data.child('opted_in').val() == true",
          ".write": "auth != null && auth.uid == $userId"
        }
      }
    }
  }
}
```

### React Native Setup:

**Location Permissions (app.json):**
```json
{
  "expo": {
    "plugins": [
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow ForgeMind to use your location for live meetup coordination during events."
        }
      ]
    ]
  }
}
```

**Context:**
```typescript
// src/contexts/LiveLocationContext.tsx
import database from '@react-native-firebase/database';
import * as Location from 'expo-location';

export const LiveLocationProvider = ({ children }) => {
  const [isSharing, setIsSharing] = useState(false);
  
  const startSharing = async (eventId: string) => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    
    // Start location updates
    Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High },
      (location) => {
        database()
          .ref(`live_locations/${eventId}/${userId}`)
          .set({
            lat: location.coords.latitude,
            lng: location.coords.longitude,
            timestamp: Date.now(),
            display_name: user.display_name,
            opted_in: true
          });
      }
    );
  };
  
  // ...
};
```

---

## 🤖 SPRINT 5 SETUP: AI Attire Matching (Week 13-16)

### Python Service Setup:

**Install ML Libraries:**
```powershell
cd forgemind-ai-service
venv\Scripts\activate

pip install scikit-learn
pip install pandas numpy
pip install opencv-python
pip install colorthief  # Color extraction
pip install scipy
```

**Data Preparation:**
```python
# data/character_reference.json
{
  "characters": [
    {
      "character_id": "sasuke_uchiha",
      "character_name": "Sasuke Uchiha",
      "media": "Naruto",
      "variants": [
        {
          "variant_id": "canon_shippuden",
          "variant_name": "Shippuden (Canon)",
          "origin": "canon",
          "components": {
            "wig": {
              "color": "#000080",  // Dark blue-black
              "style": "short_spiky",
              "required": true
            },
            "top": {
              "color": "#FFFFFF",
              "style": "high_collar_shirt",
              "material": "cotton"
            },
            // ...
          }
        },
        {
          "variant_id": "streetwear_modern",
          "variant_name": "Modern Streetwear",
          "origin": "user_original",
          "components": {
            "wig": {
              "color": "#000080",
              "style": "short_spiky",
              "required": true  // Defining feature
            },
            "top": {
              "color": "any",
              "style": "hoodie",
              "material": "any"
            }
            // ...
          }
        }
      ]
    }
  ]
}
```

**Matching Algorithm (rule-based start):**
```python
# models/attire_matcher.py
class AttireMatcher:
    def match_item_to_variants(self, item, character_variants):
        """
        Returns: [
          {
            "variant_id": "...",
            "match_score": 0.85,
            "rating": "exact" | "close" | "loose",
            "matched_component": "wig"
          }
        ]
        """
        matches = []
        
        for variant in character_variants:
            for component_name, requirements in variant['components'].items():
                score = self._calculate_similarity(
                    item,
                    requirements
                )
                
                if score >= 0.8:
                    rating = "exact"
                elif score >= 0.6:
                    rating = "close"
                elif score >= 0.4:
                    rating = "loose"
                else:
                    continue
                    
                matches.append({
                    "variant_id": variant['variant_id'],
                    "match_score": score,
                    "rating": rating,
                    "matched_component": component_name
                })
        
        return sorted(matches, key=lambda x: x['match_score'], reverse=True)
    
    def _calculate_similarity(self, item, requirements):
        """Compare color, style, material"""
        score = 0.0
        weights = {"color": 0.4, "style": 0.4, "material": 0.2}
        
        # Color similarity (using color distance in RGB space)
        if 'color' in requirements:
            color_similarity = self._color_distance(
                item['color'],
                requirements['color']
            )
            score += color_similarity * weights['color']
        
        # Style similarity (string matching)
        if 'style' in requirements:
            style_similarity = self._string_similarity(
                item['style'],
                requirements['style']
            )
            score += style_similarity * weights['style']
        
        # Material similarity
        if 'material' in requirements:
            material_similarity = self._string_similarity(
                item['material'],
                requirements['material']
            )
            score += material_similarity * weights['material']
        
        return score
```

**API Endpoints:**
```python
# app.py
@app.route('/api/match-attire', methods=['POST'])
def match_attire():
    """
    Input: {
      "owned_items": [...],
      "character_id": "sasuke_uchiha" (optional),
      "match_direction": "items_to_characters" | "character_to_items" | "item_to_all"
    }
    Output: {
      "matches": [...]
    }
    """
    data = request.json
    matcher = AttireMatcher()
    
    if data['match_direction'] == 'items_to_characters':
        # Find which characters/variants the user can cosplay
        results = matcher.match_items_to_characters(
            data['owned_items']
        )
    
    return jsonify({"matches": results})
```

**Deploy Python Service:**
```powershell
# Option 1: Local development
python app.py  # Runs on http://localhost:5000

# Option 2: Deploy to Cloud Run (production)
gcloud run deploy forgemind-ai --source .
```

**Connect from React Native:**
```typescript
// src/services/AIService.ts
const AI_SERVICE_URL = __DEV__ 
  ? 'http://localhost:5000' 
  : 'https://forgemind-ai-xxx.run.app';

export const matchAttire = async (ownedItems: OwnedItem[]) => {
  const response = await fetch(`${AI_SERVICE_URL}/api/match-attire`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      owned_items: ownedItems,
      match_direction: 'items_to_characters'
    })
  });
  
  return await response.json();
};
```

---

## 🔍 SPRINT 6 SETUP: Listing Screener (Week 17-19)

### Google Cloud Vision Setup:

**Enable API:**
```bash
# In Google Cloud Console
1. Enable Cloud Vision API
2. Create Service Account
3. Download JSON key
4. Upload to Firebase Functions config
```

**Install Dependencies:**
```powershell
cd forgemind-mobile/functions
npm install @google-cloud/vision
npm install @google-cloud/language  # Optional: for text analysis
```

**Firebase Function:**
```typescript
// functions/src/index.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import vision from '@google-cloud/vision';

const visionClient = new vision.ImageAnnotatorClient();

export const screenListing = functions.firestore
  .document('marketplace_listings/{listingId}')
  .onCreate(async (snapshot, context) => {
    const listing = snapshot.data();
    
    // 1. Analyze image
    const [imageResult] = await visionClient.labelDetection(
      listing.photos[0]
    );
    const labels = imageResult.labelAnnotations;
    
    // 2. Check against permitted categories
    const permitted = [
      'costume', 'wig', 'fabric', 'prop', 'makeup',
      'sewing', 'craft', 'cosplay', 'anime', 'manga'
    ];
    
    const hasPermitted = labels.some(label =>
      permitted.some(cat => label.description.toLowerCase().includes(cat))
    );
    
    // 3. Block if not permitted
    if (!hasPermitted) {
      await snapshot.ref.update({
        status: 'blocked',
        blocked_reason: 'Outside cosplay community scope',
        blocked_at: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Notify user
      // TODO: Send notification
    }
  });
```

**Permitted Categories List:**
```typescript
// functions/src/permitted-categories.ts
export const PERMITTED_CATEGORIES = {
  // Exact matches
  exact: [
    'cosplay',
    'costume',
    'wig',
    'fabric',
    'prop',
    'weapon prop',
    'armor',
    'makeup',
    'contact lens',
    'sewing pattern'
  ],
  
  // Partial matches (allowed if combined with exact)
  partial: [
    'clothing',
    'accessory',
    'craft supply',
    'art supply'
  ],
  
  // Blocked always
  blocked: [
    'weapon',
    'drug',
    'alcohol',
    'tobacco',
    'adult content'
  ]
};
```

**Appeal System:**
```typescript
// /listing_appeals/{appealId}
{
  listing_id: string,
  user_id: string,
  user_message: string,
  submitted_at: timestamp,
  status: 'pending' | 'approved' | 'denied',
  reviewed_by: string,  // Holder email
  reviewed_at: timestamp,
  decision_reason: string
}
```

---

## 🧪 SPRINT 7 SETUP: Testing (Week 20-21)

### Testing Tools:

```powershell
# Install testing frameworks
npm install --save-dev jest @testing-library/react-native
npm install --save-dev @testing-library/jest-native
npm install --save-dev detox detox-cli

# For 3D testing
# Use Unity Test Framework (built into Unity Editor)

# For AI testing
cd forgemind-ai-service
pip install pytest pytest-cov
```

### Test Data Preparation:

```typescript
// __tests__/fixtures/test-data.ts
export const TEST_USERS = {
  cosplayer: { email: 'test@cosplayer.com', ... },
  holder: { email: 'test@holder.com', is_holder: true },
  organizer: { email: 'test@organizer.com', ... }
};

export const TEST_CHARACTERS = [
  // Representative sample of character/variants
];

export const TEST_OWNED_ITEMS = [
  // Items that should match various characters
];
```

### Test Scenarios:

**Unit Tests:**
- Attire matching algorithm
- Body slider calculations
- Match score computations

**Integration Tests:**
- Photo → Item entry → Match results
- Create listing → AI screen → Block/allow
- Live location → Firebase → Map display

**E2E Tests:**
- Complete project creation flow
- Complete marketplace transaction
- Complete meetup join flow

---

## 📊 SETUP VERIFICATION CHECKLIST

Before starting development, verify you have:

### Development Environment
- [ ] Node.js LTS installed
- [ ] Python 3.10+ installed
- [ ] Git LFS configured
- [ ] VS Code with extensions
- [ ] Android Studio (for mobile testing)

### 3D Tools
- [ ] Unity 2022.3 LTS installed
- [ ] Blender 4.x installed
- [ ] Unity packages imported
- [ ] react-native-unity-view installed

### Backend Services
- [ ] Firebase Realtime Database enabled
- [ ] Firebase Cloud Functions initialized
- [ ] Firebase Storage configured
- [ ] Google Cloud Vision API enabled
- [ ] Service account keys downloaded and secured

### AI/ML Service
- [ ] Python virtual environment created
- [ ] Flask server running
- [ ] Required packages installed
- [ ] Reference data prepared
- [ ] API endpoints responding

### Testing Setup
- [ ] Jest configured
- [ ] Test data fixtures created
- [ ] Device/emulator ready
- [ ] Network throttling tools ready

### Documentation
- [ ] Sprint folders created
- [ ] Git branches strategy defined
- [ ] Progress tracking system set up
- [ ] Daily standup schedule (if team)

---

## 💰 COST ESTIMATES

### Firebase (Blaze Plan)
- Realtime Database: ~$5-10/month (low traffic)
- Cloud Functions: ~$5-15/month
- Storage: ~$5/month
- **Total: ~$15-30/month**

### Google Cloud
- Vision API: $1.50 per 1,000 images
- Speech-to-Text: $0.006 per 15 seconds
- **Estimated: ~$20-50/month during development**

### Unity
- Personal License: FREE (revenue < $100k)
- Pro License: $185/month (if needed)

### 3D Assets
- Free assets: $0
- Premium body bases: $50-200 (one-time)
- Garment packs: $20-100 each

### Total Development Cost Estimate
- **Minimal: $35-80/month**
- **Comfortable: $200-300/month**

---

## 🚨 CRITICAL PRE-DEVELOPMENT TASKS

**DO THESE BEFORE SPRINT 1:**

1. ✅ **Backup Current Code**
   ```powershell
   git tag v0.6-pre-full-implementation
   git push --tags
   ```

2. ✅ **Create Development Branch**
   ```powershell
   git checkout -b feature/full-implementation
   ```

3. ✅ **Set Up Firebase Blaze Plan**
   - Upgrade from Spark (free)
   - Set spending alerts at $50

4. ✅ **Download Service Account Keys**
   - Store securely
   - Add to .gitignore
   - Document locations

5. ✅ **Install All Dependencies**
   - Run through each sprint's setup
   - Verify installations work

6. ✅ **Create Project Timeline**
   - Gantt chart or equivalent
   - Sprint deadlines
   - Milestone dates

7. ✅ **Assemble Team (if applicable)**
   - 3D modeler (if not you)
   - Backend developer (if not you)
   - Tester (at least 1 person)

8. ✅ **Prepare for Blockers**
   - Identify fallback solutions
   - Document help resources
   - Schedule check-ins

---

## 📞 SUPPORT RESOURCES

### Official Docs
- [Unity Manual](https://docs.unity3d.com/Manual/index.html)
- [Firebase Docs](https://firebase.google.com/docs)
- [Expo Docs](https://docs.expo.dev/)
- [React Native](https://reactnative.dev/docs/getting-started)

### Communities
- Unity Forum
- React Native Discord
- r/gamedev (for 3D help)
- Stack Overflow

### Paid Support (if stuck)
- Unity Asset Store support
- Freelance 3D artists (Fiverr/Upwork)
- Firebase experts (if complex backend issues)

---

**Ready to Start?** 

Once you've completed this setup, you'll be ready to begin Sprint 1 (Holder Verification)!

**Estimated Setup Time:** 1-2 weeks  
**Next Document:** `docs/sprint-1-holder-verification/PLAN.md`

---

**Document Created:** September 16, 2026  
**Last Updated:** September 16, 2026  
**Version:** 1.0
