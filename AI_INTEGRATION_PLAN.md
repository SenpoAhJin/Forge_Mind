# AI Integration Plan — Auto-Dress Character Feature

**Date:** September 16, 2026  
**Goal:** When user selects a project, AI automatically matches and "wears" their owned attire on the 3D character

---

## 📁 What's Been Set Up

### New Folder: `forgemind-ai/`
Created at: `CosForge_System - Copy/forgemind-ai/`

**Structure:**
```
forgemind-ai/
├── datasets/
│   ├── character_images/     ← You provide reference images here
│   ├── attire_images/         ← Auto-populated from app
│   └── cosplay_matches/       ← JSON rules you create
├── models/                    ← ML models (future)
├── src/                       ← Python AI code (to be built)
├── venv/                      ← Python environment (created)
├── requirements.txt           ← Python dependencies
├── requirements-minimal.txt   ← Essential packages only
├── README.md                  ← Full documentation
├── SETUP_GUIDE.md            ← Installation & usage guide
└── .gitignore                ← Git ignore rules
```

### Documentation Created
1. **forgemind-ai/README.md** — Complete AI system architecture
2. **forgemind-ai/SETUP_GUIDE.md** — Setup instructions & recommendations
3. **forgemind-ai/requirements.txt** — Full Python dependencies
4. **forgemind-ai/requirements-minimal.txt** — Essential packages only

---

## 🎯 What the AI Will Do

### User Workflow
```
1. User selects project: "Gojo — Season 2 Uniform"
   ↓
2. App calls AI API with:
   - Character variant ID
   - User's owned items
   - User's body settings
   ↓
3. AI analyzes and matches:
   - Required: white spiky wig → finds user's white wig
   - Required: black jacket → finds user's black high-collar top
   - Required: black pants → finds user's black dress pants
   - Required: white blindfold → finds user's white accessory
   ↓
4. AI returns:
   - Best match per category (confidence scores)
   - 2-3 alternatives per category
   - Missing items flagged for shopping list
   ↓
5. 3D Preview automatically displays matched outfit
   ↓
6. User can accept or swap individual items
```

### Matching Algorithm (Phase 1: Rule-Based)

**Scoring factors:**
- **Color similarity** (70% weight)
  - RGB/HSV distance calculation
  - Primary color match
  
- **Tag overlap** (20% weight)
  - Category match (wig, top, bottom, etc.)
  - Style keywords (spiky, high-collar, etc.)
  
- **User categorization** (10% weight)
  - Manual tags user added
  - Past selections (learning)

**Example scoring:**
```
Character needs: white spiky wig

User's items:
1. White messy wig: 95% match (color perfect, style close)
2. Silver spiky wig: 85% match (color close, style perfect)
3. Black spiky wig: 40% match (style perfect, color wrong)

Returns: #1 as primary, #2 as alternative
```

---

## 🔧 Technical Integration

### API Endpoint (To Be Built)

**Python Flask server:**
```python
# forgemind-ai/src/api.py

@app.route('/api/match', methods=['POST'])
def match_attire():
    data = request.json
    variant_id = data['character_variant_id']
    owned_items = data['owned_items']
    
    # Load character requirements
    requirements = load_character_requirements(variant_id)
    
    # Match each category
    matches = {}
    for category in ['wig', 'top', 'bottom', 'shoes', 'accessory']:
        if category in requirements['required_items']:
            matches[category] = find_best_match(
                requirements['required_items'][category],
                filter_items_by_category(owned_items, category)
            )
    
    return jsonify({
        'suggested_outfit': matches,
        'alternatives': get_alternatives(matches),
        'missing_items': find_missing(requirements, matches)
    })
```

### Mobile App Changes

**In ProjectDashboardScreen.tsx:**
```typescript
// When user taps character variant
const handleVariantSelect = async (variant) => {
  // ... existing project creation code ...
  
  // NEW: Call AI matching
  if (ownedAttire.items.length > 0) {
    try {
      const response = await fetch('http://localhost:5000/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_variant_id: variant.id,
          owned_items: ownedAttire.items,
          user_body_settings: user.body_settings
        })
      });
      
      const aiMatches = await response.json();
      
      // Store AI suggestions in project
      newProject.ai_suggested_outfit = aiMatches.suggested_outfit;
      newProject.ai_alternatives = aiMatches.alternatives;
      newProject.missing_items = aiMatches.missing_items;
      
    } catch (error) {
      console.log('AI matching unavailable:', error);
      // Graceful degradation - project works without AI
    }
  }
};
```

**In Preview3D.tsx:**
```typescript
interface Preview3DProps {
  bodySettings: BodySettings;
  outfit?: AIMatchedOutfit;  // NEW: AI-matched items
  alternatives?: AlternativeItems;  // NEW: Backup options
}

export default function Preview3D({ bodySettings, outfit, alternatives }: Preview3DProps) {
  // Load 3D models for each matched item
  const wigModel = useGLTF(outfit?.wig?.model_url);
  const topModel = useGLTF(outfit?.top?.model_url);
  // ... etc
  
  return (
    <Canvas>
      {/* Body with morphing */}
      <BodyModel morphFactor={bodySettings.size} />
      
      {/* Matched attire items */}
      {outfit?.wig && <primitive object={wigModel.scene} />}
      {outfit?.top && <primitive object={topModel.scene} />}
      {outfit?.bottom && <primitive object={bottomModel.scene} />}
      {/* ... */}
    </Canvas>
  );
}
```

---

## 📸 Datasets You Need to Provide

### 1. Character Reference Images

**Location:** `forgemind-ai/datasets/character_images/`

**What you need:**
- 10-20 character variants for testing
- High-quality full-body images
- Clear view of outfit details

**Naming:** `{character-slug}_{variant-slug}.jpg`

**Examples:**
```
gojo-satoru_season-2-uniform.jpg
nezuko-kamado_demon-form.jpg
spider-man_homecoming-suit.jpg
sailor-moon_classic-outfit.jpg
link_breath-of-the-wild.jpg
```

**Where to get them:**
- Google Images: "{character name} full body"
- Pinterest cosplay boards
- Official anime/game art
- Cosplay reference sites

### 2. Cosplay Match Rules

**Location:** `forgemind-ai/datasets/cosplay_matches/`

**What you need:**
- JSON file for each character variant
- Defines required attire items + attributes

**Example:** `gojo-satoru_season-2-uniform.json`
```json
{
  "character_id": "gojo-satoru",
  "variant_id": "season-2-uniform",
  "required_items": {
    "wig": {
      "required": true,
      "attributes": {
        "color": "white",
        "style": "spiky",
        "length": "short"
      },
      "keywords": ["white", "spiky", "messy", "short"]
    },
    "top": {
      "required": true,
      "attributes": {
        "type": "jacket",
        "color": "black",
        "style": "high-collar"
      },
      "keywords": ["black", "jacket", "high-collar"]
    },
    "bottom": {
      "required": true,
      "attributes": {
        "type": "pants",
        "color": "black"
      },
      "keywords": ["black", "pants"]
    },
    "accessory": {
      "required": true,
      "attributes": {
        "type": "blindfold",
        "color": "white"
      },
      "keywords": ["white", "blindfold", "eye-cover"]
    }
  }
}
```

**I can generate templates** if you give me a list of characters.

---

## 🎨 3D Preview Improvements

### Current State (Your Screenshots)
- ✅ 3D rendering works
- ✅ Body morphing works (slider)
- ✅ Camera controls work
- ❌ Looks too basic (cylinders/spheres)
- ❌ No realistic appearance
- ❌ No clothing textures

### Recommended Improvements (In Order)

**Phase 1: Better Body Model (1-2 days)**
- Find/create base humanoid 3D model
- Export as GLB with blend shapes
- Load in Preview3D via `useGLTF`
- Apply body morphing to blend shapes
- Add skin texture

**Phase 2: Garment System (2-3 days)**
- Create/download basic garment meshes (shirt, pants, etc.)
- Export as separate GLB files
- Load dynamically based on AI matches
- Position on body model
- Handle layering (shirt under jacket)

**Phase 3: Realistic Appearance (3-4 days)**
- Add proper materials (fabric, leather, metal)
- Texture maps for clothing patterns
- Better lighting setup
- Character-specific accessories

**Phase 4: Polish (1-2 days)**
- Animation (idle pose, breathing)
- Better camera angles
- Loading states
- Error handling

### Resources for 3D Models

**Free humanoid models:**
- Mixamo (Adobe) — Free rigged characters
- ReadyPlayerMe — Customizable avatars
- Sketchfab — Free CC0 models
- Turbosquid — Free low-poly models

**Garment models:**
- Marvelous Designer — Professional (paid)
- Clo3D — Industry standard (paid)
- Blender community — Free donations
- Asset packs on itch.io — Free/paid

---

## ⚖️ Decision: React Three Fiber vs Unity

### My Recommendation: **Keep React Three Fiber**

**Reasons:**
1. **Already working** — 3D proof-of-concept renders
2. **Faster iteration** — Hot reload (<1sec) vs Unity builds (5-10min)
3. **No installation** — Works now vs 5-8GB Unity download
4. **Simpler integration** — Direct React components vs WebGL bridging
5. **Good enough** — Can achieve professional results with proper models
6. **Thesis priority** — AI matching > photorealistic graphics

### When to Consider Unity

**Switch to Unity if:**
- Need photorealistic rendering
- Want Unity Asset Store access
- Need advanced physics/animation
- Have time for learning curve (1-2 weeks)
- Graphics quality is thesis-critical

**My assessment:** Not needed for MVP/thesis defense.

### Hybrid Approach (Future)

**Phase 1:** React Three Fiber + AI matching (now)  
**Phase 2:** Improve visuals with better GLB models (Sprint 2)  
**Phase 3:** Consider Unity if visuals insufficient (Sprint 3)  

This lets you test AI matching quickly without Unity overhead.

---

## 📋 Next Steps (Priority Order)

### This Week
1. ✅ AI folder structure created
2. ⏳ Install Python packages: `pip install -r requirements-minimal.txt`
3. ⏳ Gather 5-10 character reference images
4. ⏳ Create match rules JSON for those characters
5. ⏳ Build basic matching algorithm

### Next Week
6. Create Flask API endpoint
7. Test matching with mock data
8. Integrate API call in mobile app
9. Display AI matches in 3D preview
10. Test full workflow end-to-end

### Week 3
11. Find/create better 3D body model
12. Add basic garment meshes
13. Improve 3D preview visuals
14. Polish user experience

### Week 4
15. Refine AI matching based on tests
16. Add alternative suggestions UI
17. Missing items shopping list
18. Performance optimization

---

## 🆘 What You Need from Me

### Immediate
1. **Confirm approach:** React Three Fiber + AI matching?
2. **Character list:** Which 5-10 characters to start with?
3. **Priority:** AI first, then 3D visuals? Or vice versa?

### Short-term
4. **Reference images:** Can you gather character images?
5. **Match rules:** Do you want me to generate JSON templates?
6. **3D models:** Should I find free humanoid models to use?

---

## 💬 My Recommendation

Based on your screenshots and thesis goals:

### ✅ Keep React Three Fiber
- It's working NOW
- Can improve visuals gradually
- Faster development cycle
- Unity is overkill for MVP

### ✅ Prioritize AI Matching
- That's your thesis contribution
- More impressive than graphics
- Harder technical problem
- Unique value proposition

### ✅ Improve 3D Incrementally
- Better body model (week 1)
- Basic garments (week 2)
- Textures/materials (week 3)
- Polish (week 4)

### Timeline Estimate

**Sprint 0 (Foundation):** 1 week  
✅ Environment setup  
✅ 3D proof-of-concept  
⏳ AI folder setup  
⏳ Datasets prepared  

**Sprint 1 (AI Matching):** 2 weeks  
- Rule-based matching algorithm
- Flask API endpoint
- Mobile app integration
- Testing & refinement

**Sprint 2 (3D Improvements):** 2 weeks  
- Better body model
- Basic garments
- Texture maps
- Lighting polish

**Sprint 3 (Integration & Polish):** 2 weeks  
- Full workflow testing
- UI/UX refinements
- Performance optimization
- Bug fixes

**Total:** ~7 weeks to fully working system

Sound good? Let me know your decision and I'll proceed!

