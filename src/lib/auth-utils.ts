import { Session } from "next-auth"
import { Permission } from "@prisma/client"

export interface SessionLike {
  user?: {
    id?: string;
    permissions?: string[];
    requires2FASetup?: boolean;
    [key: string]: any;
  }
}

/**
 * Checks if the user session contains the required permission,
 * optionally checking for multiple permissions (OR condition if string array is provided).
 */
export function hasPermission(
  session: SessionLike | null | undefined, 
  permission: keyof typeof Permission | (keyof typeof Permission)[]
): boolean {
  if (!session?.user?.permissions) return false;
  if (session.user.requires2FASetup) return false;

  const userPermissions = session.user.permissions;

  // Global backdoor fail-safe for critical errors if needed, though they should implicitly have SYSTEM_SETTINGS etc.
  
  if (Array.isArray(permission)) {
    return permission.some(p => userPermissions.includes(p));
  }
  
  return userPermissions.includes(permission);
}

/**
 * Asserts that the session is natively secure and fully authenticated.
 * Throws an explicit error if the user is trapped in an MFA setup phase,
 * structurally blocking unauthorized standalone API calls.
 */
export function assertSecureSession(session: SessionLike | null | undefined) {
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (session.user.requires2FASetup) throw new Error("Security Interlock: Action Thwarted. MFA Setup Requirement Pending.");
}
