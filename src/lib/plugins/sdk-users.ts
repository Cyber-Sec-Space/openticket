import { db } from "@/lib/db"
import { PluginSystemError, PluginPermissionError, PluginInputError, withPluginErrorHandling } from './errors'
import { SdkExecutionContext } from './sdk-types'

export function createUserApi(ctx: SdkExecutionContext) {
  return {
    getUserByEmail: withPluginErrorHandling(async (email: string) => {
      ctx.requireBotUser('VIEW_USERS');
      if (!email || typeof email !== 'string') throw new PluginInputError("SDK Input Exception: Invalid email format");

      return await db.user.findUnique({
        where: { email },
        select: { id: true, name: true, email: true, isBot: true, isDisabled: true }
      });
    }),

    createUser: withPluginErrorHandling(async (email: string, name: string, assignRoleNames?: string[]) => {
      const id = ctx.requireBotUser('CREATE_USERS');
      if (!email || !name) throw new PluginInputError("SDK Input Exception: Email and name are required");

      // Validate Roles (Prevent giving out SYSTEM level permissions implicitly without ASSIGN_USER_ROLES)
      let rolesToConnect: any = [];
      if (assignRoleNames && assignRoleNames.length > 0) {
         ctx.requireBotUser('ASSIGN_USER_ROLES');
         const validRoles = await db.customRole.findMany({ 
            where: { name: { in: assignRoleNames }, isSystem: false } // Force block system role injection via SDK
         });
         rolesToConnect = validRoles.map(r => ({ id: r.id }));
      }

      const newUser = await db.user.create({
        data: {
          email,
          name,
          isDisabled: false,
          isBot: false,
          customRoles: rolesToConnect.length > 0 ? { connect: rolesToConnect } : undefined,
          auditLogs: {
            create: { action: `[PLUGIN:${ctx.pluginId}] USER_CREATED`, userId: id, changes: { email, assignRoleNames } }
          }
        }
      });
      
      await ctx.triggerHook('onUserCreated', newUser);
      return newUser;
    }),

    suspendUser: withPluginErrorHandling(async (userId: string) => {
      const id = ctx.requireBotUser('SUSPEND_USERS');
      if (!userId) throw new PluginInputError("SDK Input Exception: User ID required.");

      // You cannot suspend another Bot through the SDK. Too dangerous.
      const target = await db.user.findUnique({ where: { id: userId } });
      if (target?.isBot) throw new PluginPermissionError("SDK Security Exception: Cannot suspend a System bot.");

      const updated = await db.user.update({
        where: { id: userId },
        data: { 
          isDisabled: true,
          auditLogs: {
            create: { action: `[PLUGIN:${ctx.pluginId}] USER_SUSPENDED`, userId: id, changes: { isDisabled: true } }
          }
        }
      });
      
      await ctx.triggerHook('onUserUpdated', updated);
      return updated;
    }),

    assignUserRoles: withPluginErrorHandling(async (userId: string, targetRoleNames: string[]) => {
      const id = ctx.requireBotUser('ASSIGN_USER_ROLES');
      if (!userId || !Array.isArray(targetRoleNames)) throw new PluginInputError("SDK Input Exception: User ID and Roles Array required.");

      const target = await db.user.findUnique({ where: { id: userId } });
      if (target?.isBot) throw new PluginPermissionError("SDK Security Exception: Cannot modify roles of a System bot via SDK.");

      const validRoles = await db.customRole.findMany({ 
         where: { name: { in: targetRoleNames }, isSystem: false }
      });

      const updated = await db.user.update({
         where: { id: userId },
         data: { 
           customRoles: { set: validRoles.map(r => ({ id: r.id })) },
           auditLogs: {
             create: { action: `[PLUGIN:${ctx.pluginId}] USER_ROLES_MODIFIED`, userId: id, changes: { targetRoleNames } }
           }
         }
      });
      
      await ctx.triggerHook('onUserUpdated', updated);
      return updated;
    }),

    resetUserMfaSession: withPluginErrorHandling(async (userId: string) => {
      const id = ctx.requireBotUser('UPDATE_USER_PROFILE');
      if (!userId) throw new PluginInputError("SDK Input Exception: User ID required.");

      const updated = await db.user.update({
        where: { id: userId },
        data: { 
          isTwoFactorEnabled: false, 
          twoFactorSecret: null,
          auditLogs: {
             create: { action: `[PLUGIN:${ctx.pluginId}] USER_MFA_RESET`, userId: id, changes: { mfaDisabled: true } }
          }
        }
      });
      
      await ctx.triggerHook('onUserUpdated', updated);
      return updated;
    })
  }
}
