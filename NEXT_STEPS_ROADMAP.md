# ForgeMind Next Steps Roadmap
**Date:** October 15, 2026  
**Purpose:** Core functions and finishing touches needed for production readiness

---

## ✅ What's Been Built (Summary)

### Completed Core Features
- **Authentication System** (FE-1): Login, registration, session management
- **Onboarding Flow** (FE-2): Character selection, body type, base body 3D preview
- **3D Preview System** (FE-2): Body models (male/female), OrbitControls, garment layer architecture
- **Owned Attire Inventory** (FE-5): Text/voice/photo entry, AsyncStorage persistence, condition tracking
- **Photo Upload** (D7a/D7b): Up to 5 photos per item, 2MB each, gallery/camera picker, thumbnails
- **AI Matcher Integration** (D5): Backend proxy to Flask AI, slot mapping (wig/top/bottom/accessory/footwear)
- **Wearing System (Step 1)** (D8a): Slot mapping, color mapping, placeholder garment rendering
- **Marketplace** (FE-3): Listings, offers, chat, commissions, photos
- **Projects & Diary** (FE-4): Project tracking, commitment log, diary entries
- **Calendar & Events** (FE-5): Calendar integration, meetup moderation, event listings
- **Chat Moderation** (FE-6): Send-time filtering (English/Taglish), curated terms
- **Error Handling** (D7c/D7d): ErrorBoundary fixes, undefined array field handling

### Current State
- **Mobile App:** React Native (Expo 57), TypeScript, AsyncStorage for local data
- **Backend:** Node.js/Express, PostgreSQL, CORS configured for Expo dev servers
- **AI Service:** Flask proxy endpoint for attire matching (backend routes to localhost:5000)
- **3D Assets:** Male/female base body GLB files, placeholder garment shapes (cap/tube/block)

---

## 🎯 Priority 1: Core Functions for Production

### 1. **Wearing System - Step 2: Integration with Matcher** (HIGH PRIORITY)
**What:** Connect wearing system to matcher results and display worn garments on 3D preview

**Tasks:**
- Create `MatcherResultScreen` that shows suggested outfit with 3D preview
- Pass `wornGarments` from `buildWornGarments()` to `Preview3D` component
- Add "View on Body" button in matcher results
- Handle empty slots (show missing item indicators)
- Add slot labels (head/torso/legs/prop) on 3D preview overlay

**Files to modify:**
- `src/screens/cosplayer/MatcherResultScreen.tsx` (new or modify existing)
- `src/components/Preview3D.tsx` (already accepts wornGarments prop)
- `src/utils/wearing.ts` (already has buildWornGarments)

**Acceptance criteria:**
- Matcher result shows 3D preview with colored placeholder garments
- User can see which slots are filled vs missing
- Garment colors match owned item colors (black wig → #000000 cap)
- Empty slots show body only (no garment)

---

### 2. **Real Garment Assets - First Asset** (HIGH PRIORITY)
**What:** Create and integrate the first real GLB garment asset to replace placeholders

**Recommended first garment:** Simple wig (no rigging needed, static mesh)

**Tasks:**
- Follow `docs/GARMENT_SPEC.md` to create wig GLB in Blender
- Export with correct transforms (origin at 0,0,0, Y-up, no rotation)
- Place in `assets/models/garments/Wig_White_Spiky_Male.glb`
- Add to `src/data/garmentRegistry.ts`
- Test toggle in 3D preview test screen
- Verify positioning on male body (sits on head, not floating)

**Files to create:**
- `assets/models/garments/Wig_White_Spiky_Male.glb` (Blender export)

**Files to modify:**
- `src/data/garmentRegistry.ts` (add import and entry)

**Acceptance criteria:**
- Wig loads without errors
- Positioned correctly on male body head
- Visible from all angles (OrbitControls rotation)
- File size <1 MB
- Triangle count <10k

---

### 3. **Owned Attire Backend Sync** (MEDIUM PRIORITY)
**What:** Sync owned attire from AsyncStorage to backend database for multi-device support

**Current state:** Items only stored locally (AsyncStorage), lost if app deleted

**Tasks:**
- Create backend endpoints:
  - `POST /owned-attire` (create item)
  - `GET /owned-attire` (list user's items)
  - `PUT /owned-attire/:id` (update item)
  - `DELETE /owned-attire/:id` (delete item)
- Add database table `owned_attire` (mirror mobile schema)
- Update `OwnedAttireContext` to sync with backend
- Handle offline mode (queue operations, sync when online)
- Migrate existing AsyncStorage items to backend on first sync

**Files to create:**
- `forgemind-backend/src/owned-attire/router.ts`
- `forgemind-backend/migrations/XXX_create_owned_attire.sql`

**Files to modify:**
- `forgemind-mobile/src/contexts/OwnedAttireContext.tsx`
- `forgemind-mobile/src/services/OwnedAttireService.ts` (new)

**Acceptance criteria:**
- Items persist across devices when logged in
- Offline changes queue and sync when back online
- Photos stored as data URIs in DB (or migrate to backend photo storage)
- No data loss on app reinstall (if logged in)

---

### 4. **Matcher Result Caching & History** (MEDIUM PRIORITY)
**What:** Cache matcher results to avoid redundant Flask calls, show match history

**Current state:** Every match calls Flask (slow, no history)

**Tasks:**
- Cache match results in AsyncStorage by character_variant_id + owned_attire hash
- Add "Match History" screen showing past matches
- Implement cache expiration (7 days or when owned attire changes)
- Add "Re-match" button to force fresh match
- Show cache age indicator ("Matched 2 days ago")

**Files to create:**
- `src/services/MatcherCacheService.ts`
- `src/screens/cosplayer/MatchHistoryScreen.tsx`

**Files to modify:**
- `src/contexts/MatcherContext.tsx` (or create if not exists)
- `src/navigation/CosplayerStackNavigator.tsx` (add Match History route)

**Acceptance criteria:**
- Instant load for cached matches
- User can see past match results
- Cache invalidates when owned attire updated
- No stale data shown (expiration works)

---

### 5. **Photo Storage Backend** (MEDIUM PRIORITY)
**What:** Move photo storage from data URIs to backend file storage

**Current state:** Photos stored as base64 data URIs in AsyncStorage (bloated, size limits)

**Tasks:**
- Create backend photo upload endpoint `POST /owned-attire/:id/photos`
- Store photos in `forgemind-backend/uploads/owned-attire/` (reuse marketplace pattern)
- Return photo URLs, store URLs in owned_attire records
- Update mobile to upload photos after item save
- Implement photo compression before upload (max 800px width, 80% quality)
- Add photo cleanup job (delete orphaned photos)

**Files to create:**
- `forgemind-backend/src/owned-attire/photoUpload.ts`

**Files to modify:**
- `forgemind-mobile/src/contexts/OwnedAttireContext.tsx`
- `forgemind-mobile/src/screens/cosplayer/ItemConfirmationScreen.tsx`

**Acceptance criteria:**
- Photos upload to backend, not stored as data URIs
- App works offline (queue uploads)
- Photo URLs work on other devices
- Compression reduces file size without visible quality loss

---

## 🔧 Priority 2: Polish & UX Improvements

### 6. **Empty States & Loading Indicators**
**What:** Add proper empty states and loading spinners throughout the app

**Tasks:**
- Add loading spinner to matcher (can take 5-10 seconds)
- Empty state for owned inventory ("Log your first item")
- Empty state for projects ("Create your first project")
- Skeleton loaders for list screens
- Error states with retry buttons

**Acceptance criteria:**
- User never sees blank screen with no feedback
- Loading states show progress
- Empty states guide user to first action

---

### 7. **Match Quality Indicators**
**What:** Visualize match quality from matcher response

**Current state:** Match quality returned but not displayed prominently

**Tasks:**
- Show overall_score as percentage or star rating
- Color-code quality_label (excellent=green, good=yellow, incomplete=red)
- Show per-slot breakdown (color/keywords/category scores)
- Add tooltips explaining why match is good/poor
- Highlight missing items prominently

**Files to modify:**
- `src/screens/cosplayer/MatcherResultScreen.tsx`
- `src/components/MatchQualityBadge.tsx` (new component)

---

### 8. **Onboarding Tutorial**
**What:** First-time user tutorial showing key features

**Tasks:**
- Welcome screen after registration
- Guided tour of main sections (inventory, matcher, projects)
- Optional "Log your first item" walkthrough
- Skip button for returning users
- Store tutorial completion in AsyncStorage

**Files to create:**
- `src/screens/onboarding/TutorialScreen.tsx`
- `src/components/TutorialOverlay.tsx`

---

### 9. **Search & Filters for Owned Inventory**
**What:** Search owned items by color, type, style, condition

**Current state:** Basic filters exist, no search

**Tasks:**
- Add search bar at top of OwnedItemDashboard
- Search by color, type, style, notes
- Filter by availability (free/committed), condition rating
- Sort by date added, condition, cost
- Save filter preferences

**Files to modify:**
- `src/screens/cosplayer/OwnedItemDashboard.tsx`

---

### 10. **Offline Mode Indicator**
**What:** Show when app is offline, queue operations

**Tasks:**
- Detect network status (NetInfo)
- Show banner when offline
- Queue backend operations (owned attire sync, matcher calls)
- Auto-retry when back online
- Show sync status ("3 changes pending")

**Files to create:**
- `src/contexts/NetworkContext.tsx`
- `src/services/OfflineQueueService.ts`

---

## 🚀 Priority 3: Advanced Features

### 11. **Character Favorites & Quick Match**
**What:** Save favorite characters for quick matching

**Tasks:**
- Add "Favorite" button on character selection
- Store favorites in AsyncStorage
- Quick match screen showing favorites with one-tap match
- Recent matches section

---

### 12. **Shopping List Generator**
**What:** Generate shopping list from missing items in match result

**Tasks:**
- Parse missing_items from matcher response
- Format as shopping list with item names, requirements
- Add estimated costs (if item similar to owned items)
- Share or export list

---

### 13. **3D Preview Enhancements**
**What:** Improve 3D viewer with better controls and features

**Tasks:**
- Add zoom presets (full body, upper body, head closeup)
- Screenshot/share feature
- Background color picker
- Lighting presets (studio, outdoor, dramatic)
- Camera position reset button

---

### 14. **Batch Item Entry**
**What:** Add multiple items quickly from photo gallery

**Tasks:**
- Select multiple photos from gallery
- Batch categorize using AI (one API call for all)
- Bulk edit shared fields (acquired date, condition)
- Progress indicator for batch processing

---

### 15. **Analytics Dashboard**
**What:** Show user statistics about their collection

**Tasks:**
- Total items count, by type, by color
- Total investment (sum of acquisition costs)
- Condition breakdown (pie chart)
- Match success rate over time
- Most-used items (projects committed to)

---

## 📋 Technical Debt & Cleanup

### 16. **Test Coverage**
**What:** Add comprehensive tests for core functions

**Current state:** Only proof scripts exist (check_wearing.mjs, etc.)

**Tasks:**
- Unit tests for utils (wearing.ts, colorNames.ts)
- Integration tests for contexts (OwnedAttireContext, UserContext)
- E2E tests for critical flows (login, add item, match)
- Backend API tests

---

### 17. **TypeScript Strict Mode**
**What:** Enable strict mode and fix all type errors

**Current state:** TypeScript runs but not in strict mode

**Tasks:**
- Enable `strict: true` in tsconfig.json
- Fix all implicit any types
- Add proper return types to all functions
- Remove non-null assertions (!)

---

### 18. **Performance Optimization**
**What:** Profile and optimize slow screens

**Tasks:**
- Lazy load screens with React.lazy
- Memoize expensive components (Preview3D, lists)
- Optimize 3D rendering (reduce draw calls)
- Image optimization (use expo-image for caching)
- Virtualize long lists (FlatList optimizations)

---

### 19. **Error Logging & Monitoring**
**What:** Track errors in production

**Tasks:**
- Integrate Sentry or similar
- Log all API failures
- Track 3D rendering errors
- User action tracking (for debugging)
- Crash reports

---

### 20. **Accessibility (A11y)**
**What:** Make app usable with screen readers

**Tasks:**
- Add accessibilityLabels to all touchables
- Test with VoiceOver (iOS) and TalkBack (Android)
- Ensure color contrast meets WCAG AA
- Keyboard navigation for web
- Focus management

---

## 🏁 Production Readiness Checklist

### Before Launch
- [ ] All Priority 1 tasks finished
- [ ] Backend deployed (production database, env vars)
- [ ] Flask AI service running (production URL configured)
- [ ] Photo storage configured (persistent disk or S3)
- [ ] Database migrations run
- [ ] SSL/TLS enabled
- [ ] CORS configured for production domains
- [ ] Rate limiting enabled
- [ ] Authentication tokens secured
- [ ] Error monitoring active
- [ ] Backup strategy implemented
- [ ] Privacy policy & terms of service
- [ ] App store assets (screenshots, descriptions)
- [ ] Beta testing with real users
- [ ] Performance profiling finished
- [ ] Security audit finished

---

## 🎨 Design System Finalization

### Consistency Pass
- [ ] All screens use theme colors (no hardcoded colors)
- [ ] Consistent spacing (use spacing.* constants)
- [ ] Typography hierarchy correct (H1/H2/H3/body/caption)
- [ ] Button variants used correctly (primary/secondary/tertiary)
- [ ] Loading states consistent across screens
- [ ] Error messages follow same pattern
- [ ] Success feedback consistent (toasts, modals)

---

## 📱 Platform-Specific Considerations

### iOS
- [ ] Safe area handling (notch/home indicator)
- [ ] Haptic feedback on actions
- [ ] iOS-specific icons and styling
- [ ] Test on iPhone 15 Pro Max (largest), iPhone SE (smallest)

### Android
- [ ] Material Design bottom sheet patterns
- [ ] Hardware back button handling
- [ ] Test on various screen sizes (phone, tablet)
- [ ] Handle notches/cutouts

### Web
- [ ] Responsive design (desktop/tablet/mobile)
- [ ] Keyboard shortcuts
- [ ] Browser compatibility (Chrome, Safari, Firefox)
- [ ] PWA configuration (manifest, service worker)

---

## 🔄 Suggested Implementation Order

**Week 1-2:** Priority 1 (Core Functions)
1. Wearing System Step 2 (matcher integration)
2. Real Garment Asset (first wig)
3. Matcher Result Caching

**Week 3-4:** Priority 1 + 2 (Backend & Polish)
4. Owned Attire Backend Sync
5. Photo Storage Backend
6. Empty States & Loading
7. Match Quality Indicators

**Week 5-6:** Priority 2 + 3 (UX & Advanced)
8. Onboarding Tutorial
9. Search & Filters
10. Offline Mode
11. Character Favorites

**Week 7-8:** Polish & Production Prep
12. Test Coverage
13. Performance Optimization
14. Accessibility Pass
15. Production deployment prep

---

## 💡 Recommended Next Task: Wearing System Step 2

**Why start here:**
- Builds on D8a work (wearing.ts already done)
- High user value (see matches on 3D body)
- Tests full pipeline (owned items → matcher → 3D preview)
- Validates placeholder garment positioning
- Unblocks real garment asset creation (need to see what works)

**Steps:**
1. Create or modify MatcherResultScreen
2. Call `buildWornGarments(matchResult, ownedItems, bodyType)`
3. Pass result to `<Preview3D wornGarments={...} />`
4. Add slot labels overlay (head/torso/legs/prop)
5. Handle missing slots (show empty vs filled indicators)
6. Test with D6 matcher data (black wig, red jacket, blue pants)

**Success looks like:**
- User matches character, sees 3D preview with colored shapes on body
- Can rotate view, see garments from all angles
- Missing slots clearly indicated
- Match quality badge shows overall score

---

**Last Updated:** October 15, 2026  
**Next Review:** When Priority 1 tasks finished (estimated 2 weeks)
