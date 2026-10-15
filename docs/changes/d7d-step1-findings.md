# D7d-1 Step 1: Array Method Calls on Owned-Item Data

**Error:** "Cannot read properties of undefined (reading 'filter')"
**Date:** Thursday, October 15, 2026

## Findings Table

| File:Line | Expression | Can be undefined? | Why |
|-----------|------------|-------------------|-----|
| `src/screens/cosplayer/ItemConfirmationScreen.tsx:79` | `draft.photo_urls.filter((u): u is string => u !== null)` | **YES** | Text/voice entries created before D7a fix don't provide `photo_urls`. Old items loaded from AsyncStorage may be missing the field. Draft object comes from entry screens that don't initialize `photo_urls` for text/voice. |
| `src/screens/cosplayer/ItemConfirmationScreen.tsx:125` | `photos.filter((_, i) => i !== index)` | NO | `photos` state initialized from line 79, always array (but line 79 crashes first if undefined). |
| `src/screens/cosplayer/OwnedItemDashboard.tsx:50` | `items.forEach((i) => set.add(...))` | NO | `items` from context, always array (seeded empty []) |
| `src/screens/cosplayer/OwnedItemDashboard.tsx:55` | `items.forEach((i) => { const c = ... })` | NO | `items` always array |
| `src/screens/cosplayer/OwnedItemDashboard.tsx:63` | `items.filter((item) => { ... })` | NO | `items` always array |
| `src/screens/cosplayer/OwnedItemDashboard.tsx:75` | `items.filter((i) => i.availability_status === 'free').length` | NO | `items` always array |
| `src/screens/cosplayer/OwnedItemDashboard.tsx:76` | `items.filter((i) => i.availability_status === 'committed').length` | NO | `items` always array |
| `src/screens/cosplayer/OwnedItemDashboard.tsx:95` | `item.photo_urls?.[0]` | **YES** (optional chaining used) | Old items may have `photo_urls: undefined`. Optional chaining prevents crash but better to normalize at load. |
| `src/screens/cosplayer/OwnedItemDetail.tsx:235` | `item.condition_photo_history?.length ? item.condition_photo_history.slice().reverse().map(...)` | **YES** (optional chaining used) | Old items may have `condition_photo_history: undefined`. Optional chaining prevents crash but .slice/.map still execute on undefined if check passes. |
| `src/contexts/OwnedAttireContext.tsx:66` | `stored.map((item: any) => ({ ...item, photo_urls: ... }))` | NO | `stored` is parsed JSON array from AsyncStorage, always array if exists |
| `src/contexts/OwnedAttireContext.tsx:142` | `prev.filter((item) => item.attire_id !== attireId)` | NO | `prev` state always array |
| `src/contexts/OwnedAttireContext.tsx:147` | `prev.map((item) => ...)` | NO | `prev` state always array |

## Root Cause

**PRIMARY CRASH:** ItemConfirmationScreen.tsx:79 calls `.filter()` on `draft.photo_urls` which is **undefined** for:
1. Text/voice entries created before D7a fix (TextEntryForm, VoiceEntryForm don't initialize `photo_urls`)
2. Old items loaded from AsyncStorage that were saved before `photo_urls` field was added

**SECONDARY ISSUE:** OwnedItemDashboard.tsx:95 and OwnedItemDetail.tsx:235 use optional chaining but don't normalize at load, so array fields can remain undefined through the app lifecycle.

## Solution Required

1. **Fix ItemConfirmationScreen.tsx:79:** Use safe default `(draft.photo_urls ?? []).filter(...)`
2. **Extend normalizer in OwnedAttireContext load (line 66):** Add defaults for ALL array fields:
   - `photo_urls: Array.isArray(item.photo_urls) ? item.photo_urls : []`
   - `condition_photo_history: Array.isArray(item.condition_photo_history) ? item.condition_photo_history : []`
3. **Ensure draft objects:** Check TextEntryForm/VoiceEntryForm initialize `photo_urls: []` in draft

## Evidence

### ItemConfirmationScreen.tsx line 79 (CRASH SITE)
```typescript
const [photos, setPhotos] = useState<string[]>(draft.photo_urls.filter((u): u is string => u !== null));
```
If `draft.photo_urls` is undefined → **"Cannot read properties of undefined (reading 'filter')"**

### OwnedAttireContext.tsx line 66 (normalizer exists but incomplete)
```typescript
const normalized = stored.map((item: any) => ({
  ...item,
  photo_urls: Array.isArray(item.photo_urls) ? item.photo_urls : [],
}));
```
Only normalizes `photo_urls`, not `condition_photo_history` or other potential array fields.

---

**End of D7d-1 Step 1 Findings**
