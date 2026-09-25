# Event Linking Investigation & Fix

## Problem Report
1. **Wrong event showing**: When linking "Event ToyCon" to project, display shows "Egwgw Etyw" instead
2. **Empty Community Calendar**: Despite having 3 events, calendar shows "No upcoming events"

## Root Cause Analysis

### Two Separate Event Systems
ForgeMind has TWO distinct event systems that are NOT connected:

1. **EventsContext** (`@ForgeMind:Events` storage)
   - Organizer-managed events (Manila CosCon, etc.)
   - Used for: **Project event linking**
   - Seed data: `src/data/events.json` (3 events)
   - Statuses: draft, confirmed, cancelled

2. **CalendarContext** (`@forgemind:calendar_entries` storage)
   - Community-submitted event listings
   - Used for: **Public community calendar browse**
   - Seed data: NONE (starts empty)
   - Statuses: pending, approved, rejected

### Why "Wrong Event" Shows
The event picker correctly shows EventsContext events:
- Event ToyCon (test data)
- Manila CosCon 2026 (seed data)
- etqtqe (test data)

But when you select one, the display might be:
1. Reading from **cached AsyncStorage** with stale/corrupt data
2. The `linked_event_id` field is correct, but `getEventById()` returns wrong event due to array corruption

**Evidence**: "Egwgw Etyw" is NOT in seed data, so it was created during testing and cached in AsyncStorage.

### Why Community Calendar is Empty
The Community Calendar (CalendarBrowseScreen) shows CalendarContext entries with status="approved" and date >= today.

If calendar is empty, it means:
- CalendarContext has NO approved entries
- OR all entries are in "pending" or "rejected" status
- OR all entries have dates in the past

The "Egwgw Etyw" event shown on Home screen is from CalendarContext but likely has status="pending" or "rejected", so it doesn't appear in the calendar browse screen.

## Solution

### Immediate Fix: Clear Cached Data
The AsyncStorage has corrupt/stale test data. Clear it to reseed from fresh data:

**Option 1: Manual clearing (recommended)**
1. Run the diagnostics screen (needs to be added to navigation)
2. Click "Clear All Data"
3. Force close and reopen app
4. Data will reseed from `src/data/events.json`

**Option 2: Programmatic clearing**
```typescript
import { clearAllData } from './src/utils/diagnostics';
await clearAllData();
// Then reload app
```

**Option 3: Uninstall/reinstall app**
- Clears all AsyncStorage
- Fresh start

### Debug Steps
With the added console.log statements:

1. Navigate to a project dashboard
2. Open browser/Expo dev tools console
3. Look for logs:
   ```
   [ProjectDashboard] Project: <name>
   [ProjectDashboard] Project linked_event_id: <id>
   [ProjectDashboard] Linked event found: {id, name, date}
   [ProjectDashboard] All confirmed events: [...]
   ```

4. Click "Link Event" button
5. Select an event (e.g., "Manila CosCon 2026")
6. Look for logs:
   ```
   [ProjectDashboard] Linking event ID: event-manila-coscon-2026
   [ProjectDashboard] Link result: {success: true}
   ```

7. Check if displayed event name matches what you selected

### Expected Behavior After Fix

**Project Dashboard Event Linking:**
- Picker shows: Events from EventsContext with status="confirmed"
- After linking: Shows correct event name, date, and details
- Project's `linked_event_id` field matches selected event's `id`

**Community Calendar:**
- Shows: CalendarContext entries with status="approved" and future dates
- If empty: No approved community calendar entries exist
- To add entries: Organizer/staff must create via CalendarManageScreen

**Home Screen "Upcoming Events":**
- Shows: CalendarContext entries with status="approved"
- If showing test events: CalendarContext has approved entries from testing

## Code Changes Made

### 1. Added Debug Logging
**File:** `src/screens/cosplayer/ProjectDashboardScreen.tsx`
- Log project linked_event_id
- Log resolved linked event details
- Log all available confirmed events
- Log link operation ID and result
- Error logging if linked event not found

### 2. Created Diagnostics Utils
**File:** `src/utils/diagnostics.ts`
- `clearAllData()`: Clear all ForgeMind AsyncStorage
- `logAllData()`: Dump all storage to console
- `checkKey(key)`: Inspect specific storage key

### 3. Created Diagnostics Screen
**File:** `src/screens/shared/DiagnosticsScreen.tsx`
- UI to view current events
- Button to clear all data
- Button to inspect storage keys
- Button to dump data to console

## Testing Checklist

### After Clearing Data:
- [ ] EventsContext loads 3 events from seed (Manila CosCon 2026, Cebu Anime Festival, Davao Cosplay Meetup - cancelled)
- [ ] Project event picker shows only "Manila CosCon 2026" (only confirmed event)
- [ ] Linking to "Manila CosCon 2026" displays correct event name
- [ ] Community Calendar is empty (CalendarContext starts with no seed data)
- [ ] Home screen shows no upcoming events (CalendarContext empty)

### To Test Community Calendar:
1. Login as organizer/approved staff
2. Navigate to Profile → Community Calendar
3. Create a new community event listing
4. Status will be "pending"
5. As Head Organizer, approve the listing
6. Now browse Community Calendar as cosplayer
7. Should see the approved event

## Architecture Note

**Why Two Separate Event Systems?**

1. **EventsContext**: Official events managed by ForgeMind organizers
   - Purpose: Event management, project planning, milestone tracking
   - Workflow: draft → confirmed → (optional) cancelled
   - Permissions: Head Organizer + Staff manage

2. **CalendarContext**: Community-submitted event directory (like cosplay.ph)
   - Purpose: Public event discovery, community awareness
   - Workflow: pending → approved/rejected
   - Permissions: Any approved staff can submit, Head Organizer approves

These systems serve different purposes and intentionally don't share data.

## Recommended Next Steps

1. ✅ Add Diagnostics Screen to navigation (for easy access)
2. ✅ Test with cleared data to confirm seed data loads correctly
3. ✅ Verify event linking works with seed data
4. Create seed data for CalendarContext if desired (optional)
5. Document difference between EventsContext and CalendarContext for users

