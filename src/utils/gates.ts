/**
 * Access Gates
 * Centralized verification and permission checks
 * These are CLIENT-SIDE UX gates only - server enforces real permissions
 */

interface User {
  verification_status?: 'pending' | 'verified' | 'rejected' | 'revoked' | 'not_submitted';
  department_verification_status?: 'pending' | 'approved' | 'rejected' | null;
  organizer_role?: 'head' | 'staff' | null;
  is_organizer?: boolean;
  marketplace_registration?: any;
}

/**
 * Can user access marketplace features (browse, list, offer, message)?
 * Requires verified marketplace status
 */
export function canUseMarketplace(user: User | null | undefined): boolean {
  if (!user) return false;
  return user.verification_status === 'verified';
}

/**
 * Can user create marketplace listings?
 * Requires verified status AND seller/both role
 */
export function canCreateListing(user: User | null | undefined): boolean {
  if (!canUseMarketplace(user)) return false;
  const role = user?.marketplace_registration?.marketplace_role;
  return role === 'seller' || role === 'both';
}

/**
 * Can user make offers on listings?
 * Requires verified status AND buyer/both role
 */
export function canMakeOffers(user: User | null | undefined): boolean {
  if (!canUseMarketplace(user)) return false;
  const role = user?.marketplace_registration?.marketplace_role;
  return role === 'buyer' || role === 'both';
}

/**
 * Can user access marketplace chat/messaging?
 * Same as marketplace access - verified only
 */
export function canUseMarketplaceChat(user: User | null | undefined): boolean {
  return canUseMarketplace(user);
}

/**
 * Can user submit community calendar events?
 * Requires Head role OR approved Staff role
 */
export function canSubmitCalendarEvents(user: User | null | undefined): boolean {
  if (!user?.is_organizer) return false;
  if (user.organizer_role === 'head') return true;
  if (user.organizer_role === 'staff' && user.department_verification_status === 'approved') return true;
  return false;
}

/**
 * Can user moderate calendar events (approve/reject staff submissions)?
 * Head only
 */
export function canModerateCalendar(user: User | null | undefined): boolean {
  return user?.organizer_role === 'head';
}

/**
 * Can user verify cosplayers (marketplace verification)?
 * Head only
 */
export function canVerifyCosplayers(user: User | null | undefined): boolean {
  return user?.organizer_role === 'head';
}

/**
 * Can user verify staff (department verification)?
 * Head only
 */
export function canVerifyStaff(user: User | null | undefined): boolean {
  return user?.organizer_role === 'head';
}

/**
 * Get marketplace access status for display
 * Returns: 'verified' | 'pending' | 'rejected' | 'not_submitted'
 */
export function getMarketplaceAccessStatus(user: User | null | undefined): {
  status: 'verified' | 'pending' | 'rejected' | 'not_submitted';
  message: string;
  rejectionReason?: string;
} {
  if (!user) {
    return { status: 'not_submitted', message: 'Please log in to access the marketplace' };
  }

  const status = user.verification_status || 'not_submitted';

  switch (status) {
    case 'verified':
      return { status: 'verified', message: 'You have full marketplace access' };
    case 'pending':
      return { status: 'pending', message: 'Your marketplace registration is pending review by organizers' };
    case 'rejected':
      return {
        status: 'rejected',
        message: 'Your marketplace registration was rejected',
        rejectionReason: (user as any).rejection_reason,
      };
    case 'revoked':
      return { status: 'rejected', message: 'Your marketplace access has been revoked' };
    default:
      return { status: 'not_submitted', message: 'Complete marketplace registration to access this feature' };
  }
}
