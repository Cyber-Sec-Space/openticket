import { Session } from "next-auth"
import { Permission } from "@prisma/client"

/**
 * Checks if the user session contains the required permission,
 * optionally checking for multiple permissions (OR condition if string array is provided).
 */
export function hasPermission(
  session: Session | null | undefined, 
  permission: keyof typeof Permission | (keyof typeof Permission)[]
): boolean {
  if (!session?.user?.permissions) return false;

  const userPermissions = session.user.permissions;

  // Global backdoor fail-safe for critical errors if needed, though they should implicitly have SYSTEM_SETTINGS etc.
  
  if (Array.isArray(permission)) {
    return permission.some(p => userPermissions.includes(p));
  }
  
  return userPermissions.includes(permission);
}
