# D7a Step 1: Item Save Bug - Root Causes

**Bug:** `TypeError: Cannot read properties of undefined (reading '0')` when saving items from text or voice entry.

## Every Place That Reads photo_urls or photo_url

| File:Line | What It Assumes | Breaks When photo_urls Missing |
|-----------|-----------------|-------------------------------|
| `OwnedAttireContext.tsx:102` | Copies `input.photo_urls` directly | **NO** - just stores undefined |
| `OwnedAttireContext.tsx:111` | Reads `input.photo_urls[0]` for condition history | **YES** - crashes with TypeError |
| `OwnedAttireContext.tsx:137` | Reads `item.photo_urls[0]` when updating | **YES** - crashes if old item missing field |
| `ItemConfirmationScreen.tsx:81` | Passes `draft.photo_urls` from input | **NO** - just passes undefined |
| `PhotoEntryScreen.tsx:162` | Creates `photo_urls: [photoUrl]` array | **NO** - photo entry always provides it |
| `TextEntryScreen.tsx` (no line) | Does NOT provide photo_urls at all | **Caller breaks** - input.photo_urls is undefined |
| `VoiceEntryScreen.tsx` (no line) | Does NOT provide photo_urls at all | **Caller breaks** - input.photo_urls is undefined |
| `owned-attire-seed.ts:16,40,63` | Seed data provides `photo_urls: []` | **NO** - always array |

## Root Cause

**Text and voice entry** do NOT provide `photo_urls` in their output. When ItemConfirmationScreen passes that input to `addItem()`:

1. `OwnedAttireContext.tsx:102` stores `photo_urls: undefined` (no crash yet)
2. `OwnedAttireContext.tsx:111` tries to read `input.photo_urls[0]` → **crash** (undefined[0])

**Same bug on update:** `OwnedAttireContext.tsx:137` reads `item.photo_urls[0]` when updating an item. If an old item was saved without photo_urls (stored as undefined or missing), the update crashes.

## Every Caller of addItem

| File:Line | Entry Method | Provides photo_urls? |
|-----------|-------------|---------------------|
| `ItemConfirmationScreen.tsx:77` | text/voice/photo | Only if draft has it (text/voice don't) |

## Other Places That Could Break

None found. No other code reads photo_urls or .photos directly. Matcher adapters do NOT send photos to Flask/backend.

## Fix Required

- Normalize input in addItem: `photo_urls` must be an array (default `[]`)
- Normalize on load from AsyncStorage: old items missing photo_urls must get `[]`
- Fix line 137 to handle missing photo_urls on existing items
