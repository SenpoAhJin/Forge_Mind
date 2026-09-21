# Staff Task Assignment Feature

## Overview
Head Organizers can now assign logistics entries to specific staff members. Staff can view entries assigned to them.

## Changes Made

### 1. Type Updates (`src/types/logistics.ts`)
- Added `assigned_to_email: string | null` field to `LogisticsEntry` interface
- `null` = unassigned, email string = assigned to that staff member

### 2. Context Updates (`src/contexts/LogisticsContext.tsx`)
- Added `assignEntry(id: string, staffEmail: string | null)` function
  - Only Head Organizers can assign/unassign
  - Cannot assign withdrawn entries
  - Validates email format
  - Pass `null` to unassign
  
- Seed data updated:
  - `log-001` assigned to `'staff-logistics@cosforge.ph'`
  - All other entries unassigned (`null`)

### 3. Access Control
- **Head Organizers**: Can assign/unassign entries to staff
- **Staff**: Can view all entries (including those assigned to them)
- **Cosplayers**: No access to logistics

## Usage Example

```typescript
import { useLogistics } from '../contexts/LogisticsContext';

const { assignEntry } = useLogistics();

// Assign entry to staff
await assignEntry('log-001', 'staff@example.com');

// Unassign entry
await assignEntry('log-001', null);
```

## UI Implementation (Next Step)

To complete this feature, add UI in `LogisticsEntryDetailScreen.tsx`:

1. **For Head Organizers:**
   - Show dropdown/picker to select staff member
   - "Assign to:" label with staff list
   - "Unassign" option to set back to `null`
   
2. **For Staff:**
   - Show "Assigned to: [Name]" as read-only text
   - Filter option in `EventLogisticsScreen` to show "My Tasks"

3. **Staff List:**
   - Query users where `organizer_role === 'staff'`
   - Display `full_name` with email subtitle
   - Include department if available

## Example UI Code (Head Organizer)

```typescript
// In LogisticsEntryDetailScreen.tsx
const [staffList, setStaffList] = useState<User[]>([]);

useEffect(() => {
  // Load verified staff from UserContext
  const staff = users.filter(u => u.organizer_role === 'staff');
  setStaffList(staff);
}, []);

<Text style={styles.label}>Assigned To:</Text>
<TouchableOpacity 
  style={styles.assignButton}
  onPress={() => setShowStaffPicker(true)}
>
  <Text>
    {entry.assigned_to_email || 'Unassigned'}
  </Text>
</TouchableOpacity>
```

## Testing

Test cases:
1. ✅ Head can assign entry to staff
2. ✅ Head can unassign entry
3. ✅ Staff can view assigned entries (read-only)
4. ✅ Cannot assign withdrawn entries
5. ✅ Email validation works
6. ✅ TypeScript compiles without errors

## Commits
- `8e23b10`: feat: add staff task assignment to logistics entries
- `9336c2f`: fix: replace deprecated DateTimePicker onChange
- `56587ed`: fix: improve form field alignment in AddLogisticsEntryScreen
