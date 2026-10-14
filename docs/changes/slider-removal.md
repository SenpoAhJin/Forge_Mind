# Body-Size Slider Removal Inventory

**Date:** October 14, 2026  
**Decision:** The body-size slider is cancelled permanently. App uses fixed male/female GLB bodies only. No scaling, no slider UI, no body_size field.

## Inventory Table

| File | Kind | Action |
|------|------|--------|
| **MOBILE APP (forgemind-mobile)** | | |
| src/contexts/CharacterContext.tsx | State (bodySize field) | REMOVE |
| src/screens/cosplayer/VoiceEntryScreen.tsx | UI (slider component, state) | REMOVE |
| src/screens/character/CharacterOnboardingScreen.tsx | UI (slider step/screen) | REMOVE |
| src/types/character.ts | Type definition (bodySize) | REMOVE |
| src/utils/modelHelpers.ts | Scaling logic | EDIT (remove scale param, keep loader) |
| assets/models/README.md | Doc (milestone 2 reference) | EDIT |
| docs/3D_INTEGRATION_MILESTONES.md | Doc (milestones 2 & 4) | EDIT (mark CANCELLED) |
| CHANGELOG.md | Historical entries | REPORT-ONLY (keep history) |
| CHANGELOG_V2.md | Historical entries | REPORT-ONLY (keep history) |
| **BACKEND (forgemind-backend)** | | |
| src/characters/charactersRouter.ts | API field validation | REMOVE |
| src/characters/characters.ts | DB query/insert (body_size) | EDIT (remove param) |
| migrations/013_add_body_size.js | Migration | REPORT-ONLY (already applied) |
| Database column: characters.body_size | DB column | REPORT-ONLY (DROP COLUMN statement below) |
| docs/database/SCHEMA_RECONCILIATION.md | Doc | EDIT (mark deprecated) |
| **AI REPO (forgemind-ai)** | | |
| chracters_datasets/Female_3D_Model/3D_Model_Female.blend1 | Blender backup | REPORT-ONLY (don't touch binaries) |
| chracters_datasets/Male_3D_Model/3D_Model_Male.blend1 | Blender backup | REPORT-ONLY (don't touch binaries) |
| Scale tables/scripts for slider | Blender helper assets | REPORT-ONLY (served slider only) |

## Manual DB Cleanup (NOT executed by agent)

When ready to drop the column:

```sql
-- Postgres
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
