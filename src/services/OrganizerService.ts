/**
 * FE-5.5: Organizer Hierarchy Service
 * Manages access requests, staff invites, and holder review
 * Mock implementation using AsyncStorage - will be replaced with real API in BE-1
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { OrganizerAccessRequest, EventStaffMember } from '../types/organizer';

const STORAGE_KEY_ACCESS_REQUESTS = '@forgemind_organizer_access_requests';
const STORAGE_KEY_STAFF_MEMBERS = '@forgemind_event_staff_members';

export class OrganizerService {
  // ==================== ACCESS REQUESTS ====================

  /**
   * Submit a request to become a Head Organizer
   */
  static async submitAccessRequest(
    userId: string,
    justification: string
  ): Promise<{ success: boolean; requestId?: string; error?: string }> {
    try {
      // Check if user already has a pending or approved request
      const existing = await this.getAccessRequestByUserId(userId);
      if (existing && existing.status === 'pending') {
        return { success: false, error: 'You already have a pending request' };
      }
      if (existing && existing.status === 'approved') {
        return { success: false, error: 'Your request has already been approved' };
      }

      // Create new request
      const request: OrganizerAccessRequest = {
        request_id: `req-${Date.now()}-${userId.slice(0, 8)}`,
        user_id: userId,
        justification,
        status: 'pending',
        reviewed_by_holder_id: null,
        reviewed_at: null,
        submitted_at: new Date(),
      };

      // Load existing requests
      const requests = await this.getAllAccessRequests();
      requests.push(request);

      // Save
      await AsyncStorage.setItem(STORAGE_KEY_ACCESS_REQUESTS, JSON.stringify(requests));

      return { success: true, requestId: request.request_id };
    } catch (error) {
      console.error('[OrganizerService] Error submitting access request:', error);
      return { success: false, error: 'Failed to submit request' };
    }
  }

  /**
   * Get access request for a specific user
   */
  static async getAccessRequestByUserId(userId: string): Promise<OrganizerAccessRequest | null> {
    try {
      const requests = await this.getAllAccessRequests();
      return requests.find(r => r.user_id === userId) || null;
    } catch (error) {
      console.error('[OrganizerService] Error getting access request:', error);
      return null;
    }
  }

  /**
   * Get all pending access requests (for Holder review queue)
   */
  static async getPendingAccessRequests(): Promise<OrganizerAccessRequest[]> {
    try {
      const requests = await this.getAllAccessRequests();
      return requests.filter(r => r.status === 'pending');
    } catch (error) {
      console.error('[OrganizerService] Error getting pending requests:', error);
      return [];
    }
  }

  /**
   * Approve an access request (Holder action)
   */
  static async approveAccessRequest(
    requestId: string,
    holderId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const requests = await this.getAllAccessRequests();
      const index = requests.findIndex(r => r.request_id === requestId);

      if (index === -1) {
        return { success: false, error: 'Request not found' };
      }

      requests[index].status = 'approved';
      requests[index].reviewed_by_holder_id = holderId;
      requests[index].reviewed_at = new Date();

      await AsyncStorage.setItem(STORAGE_KEY_ACCESS_REQUESTS, JSON.stringify(requests));

      return { success: true };
    } catch (error) {
      console.error('[OrganizerService] Error approving request:', error);
      return { success: false, error: 'Failed to approve request' };
    }
  }

  /**
   * Reject an access request (Holder action)
   */
  static async rejectAccessRequest(
    requestId: string,
    holderId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const requests = await this.getAllAccessRequests();
      const index = requests.findIndex(r => r.request_id === requestId);

      if (index === -1) {
        return { success: false, error: 'Request not found' };
      }

      requests[index].status = 'rejected';
      requests[index].reviewed_by_holder_id = holderId;
      requests[index].reviewed_at = new Date();

      await AsyncStorage.setItem(STORAGE_KEY_ACCESS_REQUESTS, JSON.stringify(requests));

      return { success: true };
    } catch (error) {
      console.error('[OrganizerService] Error rejecting request:', error);
      return { success: false, error: 'Failed to reject request' };
    }
  }

  /**
   * Get all access requests (internal helper)
   */
  private static async getAllAccessRequests(): Promise<OrganizerAccessRequest[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY_ACCESS_REQUESTS);
      if (!data) return [];

      const requests = JSON.parse(data);
      // Convert date strings back to Date objects
      return requests.map((r: any) => ({
        ...r,
        submitted_at: new Date(r.submitted_at),
        reviewed_at: r.reviewed_at ? new Date(r.reviewed_at) : null,
      }));
    } catch (error) {
      console.error('[OrganizerService] Error loading access requests:', error);
      return [];
    }
  }

  // ==================== STAFF INVITES ====================

  /**
   * Send a staff invite (Head action)
   */
  static async sendStaffInvite(
    eventId: string,
    headUserId: string,
    staffEmail: string,
    department: EventStaffMember['department']
  ): Promise<{ success: boolean; inviteId?: string; error?: string }> {
    try {
      // In real implementation, would look up staffUserId by email
      // For mock, we'll use email as userId placeholder
      const staffUserId = `user-${staffEmail.split('@')[0]}`;

      // Check if invite already exists
      const existing = await this.getStaffInvite(eventId, staffUserId);
      if (existing && existing.invite_status === 'pending') {
        return { success: false, error: 'An invite is already pending for this user' };
      }
      if (existing && existing.invite_status === 'accepted') {
        return { success: false, error: 'This user is already on your staff' };
      }

      // Create invite
      const invite: EventStaffMember = {
        staff_member_id: `staff-${Date.now()}-${staffUserId.slice(0, 8)}`,
        event_id: eventId,
        head_user_id: headUserId,
        staff_user_id: staffUserId,
        department,
        invite_status: 'pending',
        invited_at: new Date(),
        responded_at: null,
      };

      // Load existing invites
      const invites = await this.getAllStaffInvites();
      invites.push(invite);

      // Save
      await AsyncStorage.setItem(STORAGE_KEY_STAFF_MEMBERS, JSON.stringify(invites));

      return { success: true, inviteId: invite.staff_member_id };
    } catch (error) {
      console.error('[OrganizerService] Error sending staff invite:', error);
      return { success: false, error: 'Failed to send invite' };
    }
  }

  /**
   * Get pending invites for a user
   */
  static async getPendingInvitesForUser(userId: string): Promise<EventStaffMember[]> {
    try {
      const invites = await this.getAllStaffInvites();
      return invites.filter(i => i.staff_user_id === userId && i.invite_status === 'pending');
    } catch (error) {
      console.error('[OrganizerService] Error getting pending invites:', error);
      return [];
    }
  }

  /**
   * Accept a staff invite
   */
  static async acceptStaffInvite(inviteId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const invites = await this.getAllStaffInvites();
      const index = invites.findIndex(i => i.staff_member_id === inviteId);

      if (index === -1) {
        return { success: false, error: 'Invite not found' };
      }

      invites[index].invite_status = 'accepted';
      invites[index].responded_at = new Date();

      await AsyncStorage.setItem(STORAGE_KEY_STAFF_MEMBERS, JSON.stringify(invites));

      return { success: true };
    } catch (error) {
      console.error('[OrganizerService] Error accepting invite:', error);
      return { success: false, error: 'Failed to accept invite' };
    }
  }

  /**
   * Decline a staff invite
   */
  static async declineStaffInvite(inviteId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const invites = await this.getAllStaffInvites();
      const index = invites.findIndex(i => i.staff_member_id === inviteId);

      if (index === -1) {
        return { success: false, error: 'Invite not found' };
      }

      invites[index].invite_status = 'declined';
      invites[index].responded_at = new Date();

      await AsyncStorage.setItem(STORAGE_KEY_STAFF_MEMBERS, JSON.stringify(invites));

      return { success: true };
    } catch (error) {
      console.error('[OrganizerService] Error declining invite:', error);
      return { success: false, error: 'Failed to decline invite' };
    }
  }

  /**
   * Get staff invite for event/user combination
   */
  private static async getStaffInvite(eventId: string, userId: string): Promise<EventStaffMember | null> {
    try {
      const invites = await this.getAllStaffInvites();
      return invites.find(i => i.event_id === eventId && i.staff_user_id === userId) || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get all staff invites (internal helper)
   */
  private static async getAllStaffInvites(): Promise<EventStaffMember[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY_STAFF_MEMBERS);
      if (!data) return [];

      const invites = JSON.parse(data);
      // Convert date strings back to Date objects
      return invites.map((i: any) => ({
        ...i,
        invited_at: new Date(i.invited_at),
        responded_at: i.responded_at ? new Date(i.responded_at) : null,
      }));
    } catch (error) {
      console.error('[OrganizerService] Error loading staff invites:', error);
      return [];
    }
  }

  /**
   * Get staff members for an event
   */
  static async getStaffForEvent(eventId: string): Promise<EventStaffMember[]> {
    try {
      const invites = await this.getAllStaffInvites();
      return invites.filter(i => i.event_id === eventId && i.invite_status === 'accepted');
    } catch (error) {
      console.error('[OrganizerService] Error getting event staff:', error);
      return [];
    }
  }
}
