# Body-Size Slider Removal Inventory

**Date:** October 14, 2026  
**Decision:** The body-size slider is cancelled permanently. App uses fixed male/female GLB bodies only. No scaling, no slider UI, no body_size field.

## Inventory Table

| File | Kind | Action |
|------|------|--------|
| **MOBILE APP (forgemind-mobile)** | | |
| src/contexts/CharacterContext.tsx | State (bodySize field) | NOT FOUND (no context exists) |
| src/screens/cosplayer/VoiceEntryScreen.tsx | UI (slider component, state) | NOT FOUND (no slider in file) |
| src/screens/onboarding/BodySliderOnboardingScreen.tsx | UI (slider step/screen) | REMOVED (deleted file) |
| src/screens/character/CharacterOnboardingScreen.tsx | UI (slider step/screen) | NOT FOUND (no file exists) |
| src/types/character.ts | Type definition (bodySize) | NOT FOUND (no file exists) |
| src/utils/modelHelpers.ts | Scaling logic | NOT FOUND (no file exists) |
| src/services/AuthService.ts | API field (bodySize param) | EDITED (removed param) |
| src/contexts/UserContext.tsx | State (bodySize param) | EDITED (removed param) |
| src/navigation/OnboardingNavigator.tsx | UI (screen import/route) | EDITED (removed route) |
| src/screens/onboarding/index.ts | Exports | EDITED (removed export) |
| src/components/sliders/Slider.tsx | UI component (BodySizeSlider) | EDITED (removed component) |
| src/screens/shared/ComponentShowcaseScreen.tsx | UI demo | EDITED (removed demo) |
| src/screens/auth/RegisterScreen.tsx | UI (bodySize state) | EDITED (removed state) |
| src/screens/dev/StaffRegistrationScreen.tsx | UI (bodySize param) | EDITED (removed param) |
| src/screens/dev/HeadOrganizerRegistrationScreen.tsx | UI (bodySize param) | EDITED (removed param) |
| assets/models/README.md | Doc (milestone 2 reference) | EDIT (pending Step 3) |
| docs/3D_INTEGRATION_MILESTONES.md | Doc (milestones 2 & 4) | EDIT (pending Step 3) |
| CHANGELOG.md | Historical entries | REPORT-ONLY (keep history) |
| CHANGELOG_V2.md | Historical entries | REPORT-ONLY (keep history) |
| **BACKEND (forgemind-backend)** | | |
| src/characters/charactersRouter.ts | API field validation | NOT FOUND (no body_size code) |
| src/characters/characters.ts | DB query/insert (body_size) | NOT FOUND (no body_size code) |
| src/auth/validation.ts | Comment about body_size | REPORT-ONLY (already states NOT accepted) |
| migrations/013_add_body_size.js | Migration | NOT FOUND (no such migration) |
| Database column: characters.body_size | DB column | REPORT-ONLY (if exists, DROP below) |
| docs/database/SCHEMA_RECONCILIATION.md | Doc | EDIT (pending Step 3) |
| **AI REPO (forgemind-ai)** | | |
| chracters_datasets/Female_3D_Model/3D_Model_Female.blend1 | Blender backup | REPORT-ONLY (don't touch binaries) |
| chracters_datasets/Male_3D_Model/3D_Model_Male.blend1 | Blender backup | REPORT-ONLY (don't touch binaries) |
| Scale tables/scripts for slider | Blender helper assets | REPORT-ONLY (served slider only) |

## Manual DB Cleanup (NOT executed by agent)

Backend has NO body_size column in code or migrations. If a `characters.body_size` column exists in the database (from manual testing or external migration), drop it with:

```sql
-- Postgres - check if column exists first
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'characters' AND column_name = 'body_size';

-- If it exists, drop it:
ALTER TABLE characters DROP COLUMN IF EXISTS body_size;
```

## Search Terms Used

Case-insensitive across all repos (excluding node_modules, .git, build output):
- slider, body size, bodySize, body_size, height_cm, scale table
- rolled, aligned, inherit_scale, size_driver
- "more than one slider", milestone 2, milestone 4

## Notes

- Dataset CSV files (marketplace_datasets/) contain unrelated "rolled"/"slider" text in user content - NOT related to body-size feature
- CHANGELOG entries are historical records - kept as-is
- Blender .blend/.blend1 files contain binary data with "slider"/"inherit_scale" nodes - don't edit binaries
- Migration 013 already applied to prod DB - cannot be removed
- Body loading must continue to work at fixed scale after removal
