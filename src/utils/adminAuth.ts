export type AdminAuthStatus =
  | 'checking'
  | 'unauthenticated'
  | 'authorized'
  | 'missing_admin_doc'
  | 'inactive_admin'
  | 'invalid_role'
  | 'email_unverified'
  | 'permission_denied'
  | 'invalid_token'
  | 'backend_error';

export interface AdminAuthDiagnostic {
  status: AdminAuthStatus;
  message: string | null;
  source: 'backend' | 'firestore' | 'none';
}

export const ALLOWED_ADMIN_ROLES = ['admin', 'super_admin', 'superadmin'] as const;

export function evaluateAdminDocument(params: {
  emailVerified: boolean;
  exists: boolean;
  data?: { active?: unknown; role?: unknown } | null;
}): { isAdmin: boolean; status: AdminAuthStatus } {
  if (params.emailVerified !== true) {
    return { isAdmin: false, status: 'email_unverified' };
  }
  if (!params.exists || !params.data) {
    return { isAdmin: false, status: 'missing_admin_doc' };
  }
  if (params.data.active !== true) {
    return { isAdmin: false, status: 'inactive_admin' };
  }
  const role = typeof params.data.role === 'string' ? params.data.role : '';
  if (!(ALLOWED_ADMIN_ROLES as readonly string[]).includes(role)) {
    return { isAdmin: false, status: 'invalid_role' };
  }
  return { isAdmin: true, status: 'authorized' };
}

export function classifyFirestoreAdminError(error: unknown): AdminAuthStatus {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code || '').toLowerCase()
      : '';
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message?: unknown }).message || '').toLowerCase()
        : '';

  if (
    code === 'permission-denied' ||
    code.endsWith('/permission-denied') ||
    message.includes('missing or insufficient permissions') ||
    message.includes('permission_denied')
  ) {
    return 'permission_denied';
  }

  return 'backend_error';
}

export function isKnownAdminAuthStatus(value: unknown): value is AdminAuthStatus {
  return (
    value === 'checking' ||
    value === 'unauthenticated' ||
    value === 'authorized' ||
    value === 'missing_admin_doc' ||
    value === 'inactive_admin' ||
    value === 'invalid_role' ||
    value === 'email_unverified' ||
    value === 'permission_denied' ||
    value === 'invalid_token' ||
    value === 'backend_error'
  );
}

export function getAdminAuthDiagnosticMessage(
  status: AdminAuthStatus,
  email?: string | null
): { title: string; description: string } {
  const displayEmail = email || 'this account';
  switch (status) {
    case 'authorized':
      return {
        title: 'Administrator Verified',
        description: `Signed in as ${displayEmail}.`,
      };
    case 'missing_admin_doc':
      return {
        title: 'Unauthorized Account',
        description: `Signed in as ${displayEmail}, but no administrator profile exists for this account. Please sign in with the authorized store administrator Google account.`,
      };
    case 'inactive_admin':
      return {
        title: 'Administrator Account Inactive',
        description: `Signed in as ${displayEmail}, but this administrator profile is currently marked inactive. Contact the store owner to reactivate access.`,
      };
    case 'invalid_role':
      return {
        title: 'Insufficient Staff Role',
        description: `Signed in as ${displayEmail}, but this account does not have a valid administrator role assigned.`,
      };
    case 'email_unverified':
      return {
        title: 'Email Verification Required',
        description: `The email address for ${displayEmail} is not verified. Verify your Google account email before accessing the Staff Portal.`,
      };
    case 'permission_denied':
      return {
        title: 'Access Verification Blocked',
        description: `Signed in as ${displayEmail}, but Firestore security rules blocked reading your administrator verification record. Access cannot be granted until the updated security rules are published.`,
      };
    case 'invalid_token':
      return {
        title: 'Session Token Rejected',
        description: `Signed in as ${displayEmail}, but your authentication token was rejected by the server. Please sign out and sign in again.`,
      };
    case 'backend_error':
      return {
        title: 'Authorization Service Unavailable',
        description: `Signed in as ${displayEmail}, but administrator verification could not be completed due to a server or network error. Please retry in a moment.`,
      };
    case 'checking':
      return {
        title: 'Verifying Staff Credentials...',
        description: 'Checking administrator authorization...',
      };
    case 'unauthenticated':
    default:
      return {
        title: 'Administrator Sign-In',
        description:
          'Sign in with your authorized Google administrator account to access Store Operations, Orders, and Wholesale Leads.',
      };
  }
}

export function isBackendUnmountedError(error: unknown): boolean {
  const status =
    typeof error === 'object' && error !== null && 'status' in error
      ? Number((error as { status?: unknown }).status)
      : NaN;
  const message = error instanceof Error ? error.message.toLowerCase() : '';

  if (status === 501 || status === 404) {
    return true;
  }
  if (
    message.includes('unexpected response format') ||
    message.includes('php backend endpoint is not mounted') ||
    message.includes('failed to fetch') ||
    message.includes('networkerror')
  ) {
    return true;
  }
  return false;
}
