# Organizer Permissions: Head vs Staff

## Overview
The app differentiates between two types of organizers:
1. **Head Organizers** - Full event management capabilities
2. **Staff Members** - Limited, department-specific capabilities

---

## Head Organizer Permissions

Head Organizers have **FULL ACCESS** to:

### Event Management
- ✅ Create new events
- ✅ Edit event details (name, date, venue, description)
- ✅ Delete/cancel events
- ✅ View all event data and analytics

### Team Management
- ✅ Invite staff members to events
- ✅ Assign staff to departments (Registration, Logistics, Stage Management, etc.)
- ✅ Remove staff members from events
- ✅ View all staff activity and tasks

### Logistics Management
- ✅ View and manage ALL logistics data:
  - Guest arrival times
  - Parking requirements
  - Entourage sizes
  - Stage-time requirements
  - Equipment needs
  - Special requests
- ✅ Generate logistics reports
- ✅ Export logistics data

### Marketplace Verification
- ✅ **Verify cosplayers for marketplace access**
- ✅ Approve/reject marketplace verification requests
- ✅ Revoke marketplace access from verified users
- ✅ View verification history

### Meetups/Gatherings
- ✅ Create meetups for events
- ✅ Manage meetup details and attendance
- ✅ View all RSVPs

---

## Staff Member Permissions

Staff Members have **LIMITED ACCESS** based on their department:

### Event Management
- ❌ Cannot create events
- ❌ Cannot edit event details
- ❌ Cannot delete events
- ✅ Can view events they're assigned to

### Team Management
- ❌ Cannot invite other staff
- ❌ Cannot remove staff
- ✅ Can view other staff in their department
- ❌ Cannot assign staff to departments

### Logistics Management (Department-Specific)
Staff can ONLY view/edit logistics data relevant to their department:

**Registration Staff:**
- ✅ View guest check-in status
- ✅ Mark guests as arrived
- ❌ Cannot edit parking, stage times, or other logistics

**Logistics Staff:**
- ✅ View/edit parking assignments
- ✅ View/edit arrival times
- ✅ View/edit entourage sizes
- ❌ Cannot edit stage times or equipment

**Stage Management Staff:**
- ✅ View/edit stage-time schedules
- ✅ View/edit equipment requirements
- ❌ Cannot edit parking or arrival times

**General Staff:**
- ✅ View basic event info
- ❌ Cannot edit any logistics data

### Marketplace Verification
- ❌ **Cannot verify cosplayers** (Head Organizer only)
- ❌ Cannot approve/reject verification
- ❌ Cannot revoke access

### Meetups/Gatherings
- ✅ Can view meetups for their events
- ❌ Cannot create or edit meetups
- ✅ Can RSVP to meetups

---

## Access Control Implementation

### ProfileScreen
**Head Organizers see:**
- Marketplace verification card with "Verify Cosplayers" button
- Events You Organize section
- Team Management section
- Logistics Overview section

**Staff Members see:**
- Assignment card showing their department and event
- Limited event info (event name, date, their department)
- No marketplace verification options
- No team management options

### Navigation Tabs
**Head Organizers:**
- Events (full access)
- Logistics (full access)
- Meetups (full access)
- Profile

**Staff Members:**
- Events (view only, limited to assigned events)
- Logistics (limited to department-specific data)
- Meetups (view + RSVP)
- Profile

### Screens Access
| Screen | Head Organizer | Staff |
|--------|---------------|-------|
| VerifyCosplayersScreen | ✅ Full access | ❌ No access |
| EventsScreen (create/edit) | ✅ Full access | ❌ View only |
| LogisticsScreen (all data) | ✅ Full access | ⚠️ Department-only |
| MeetupsScreen (create/edit) | ✅ Full access | ⚠️ View + RSVP |
| Team Management | ✅ Full access | ❌ No access |

---

## UI Differentiation

### Badges
- Head Organizers: Star icon ⭐ + "Head Organizer"
- Staff: People icon 👥 + "Staff Member"

### Color Coding
- Head actions: Primary color (purple)
- Staff actions: Secondary/muted colors
- Disabled actions for staff: Grayed out with tooltip

---

## Future Considerations

1. **Department-Based Permissions:**
   - Implement department-specific screens
   - Filter logistics data by department
   - Add department badges to staff profiles

2. **Permission Levels:**
   - Add "Senior Staff" role with slightly more permissions
   - Add "Volunteer" role with minimal permissions

3. **Audit Logging:**
   - Track who made changes to events/logistics
   - Show edit history to Head Organizers

4. **Permission Requests:**
   - Allow staff to request additional permissions
   - Head Organizer can approve/deny requests

---

**Last Updated:** September 17, 2026  
**Version:** FE-5.5+
