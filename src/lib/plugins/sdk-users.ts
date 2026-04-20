import { db } from "@/lib/db"
import { PluginSystemError, PluginPermissionError, PluginInputError, withPluginErrorHandling } from './errors'
import { SdkExecutionContext } from './sdk-types'
import { UserCreateSchema } from './schemas'
import { z } from "zod"

const IdSchema = z.string().min(1, "ID is required");

export function createUserApi(ctx: SdkExecutionContext) {
  return {
    getUserByEmail: withPluginErrorHandling(async (email: string) => {
      ctx.requireBotUser('VIEW_USERS');
      const validEmail = z.string().email("Invalid email format").parse(email);

      return await db.user.findUnique({
        where: { email: validEmail },
        select: { id: true, name: true, email: true, isBot: true, isDisabled: true }
      });
    }),

    createUser: withPluginErrorHandling(async (email: string, name: string, assignRoleNames?: string[]) => {
      const id = ctx.requireBotUser('CREATE_USERS');
      
      const parsedData = UserCreateSchema.parse({ email, name, assignRoleNames });

      // Validate Roles (Prevent giving out SYSTEM level permissions implicitly without ASSIGN_USER_ROLES)
      let rolesToConnect: { id: string }[] = [];
      if (parsedData.assignRoleNames && parsedData.assignRoleNames.length > 0) {
         ctx.requireBotUser('ASSIGN_USER_ROLES');
         const validRoles = await db.customRole.findMany({ 
            where: { name: { in: parsedData.assignRoleNames }, isSystem: false } // Force block system role injection via SDK
         });
         rolesToConnect = validRoles.map(r => ({ id: r.id }));
      }

      const newUser = await db.user.create({
        data: {
          email: parsedData.email,
          name: parsedData.name,
          isDisabled: false,
          isBot: false,
          customRoles: rolesToConnect.length > 0 ? { connect: rolesToConnect } : undefined
        }
      });

      await db.auditLog.create({
        data: { action: `[PLUGIN:${ctx.pluginId}] USER_CREATED`, entityType: 'User', entityId: newUser.id, userId: id, changes: { email: parsedData.email, assignRoleNames: parsedData.assignRoleNames } }
      });
      
      await ctx.triggerHook('onUserCreated', newUser);
      return newUser;
    }),

    suspendUser: withPluginErrorHandling(async (userId: string) => {
      const id = ctx.requireBotUser('SUSPEND_USERS');
      const validId = IdSchema.parse(userId);

      // You cannot suspend another Bot through the SDK. Too dangerous.
      const target = await db.user.findUnique({ where: { id: validId } });
      if (target?.isBot) throw new PluginPermissionError("SDK Security Exception: Cannot suspend a System bot.");

      const updated = await db.user.update({
        where: { id: validId },
        data: { 
          isDisabled: true
        }
      });

      await db.auditLog.create({
        data: { action: `[PLUGIN:${ctx.pluginId}] USER_SUSPENDED`, entityType: 'User', entityId: validId, userId: id, changes: { isDisabled: true } }
      });
      
      await ctx.triggerHook('onUserUpdated', updated);
      return updated;
    }),

    assignUserRoles: withPluginErrorHandling(async (userId: string, targetRoleNames: string[]) => {
      const id = ctx.requireBotUser('ASSIGN_USER_ROLES');
      const validId = IdSchema.parse(userId);
      const validRolesArray = z.array(z.string()).parse(targetRoleNames);

      const target = await db.user.findUnique({ where: { id: validId } });
      if (target?.isBot) throw new PluginPermissionError("SDK Security Exception: Cannot modify roles of a System bot via SDK.");

      const validRoles = await db.customRole.findMany({ 
         where: { name: { in: validRolesArray }, isSystem: false }
      });

      const updated = await db.user.update({
         where: { id: validId },
         data: { 
           customRoles: { set: validRoles.map(r => ({ id: r.id })) }
         }
      });

      await db.auditLog.create({
        data: { action: `[PLUGIN:${ctx.pluginId}] USER_ROLES_MODIFIED`, entityType: 'User', entityId: validId, userId: id, changes: { targetRoleNames: validRolesArray } }
      });
      
      await ctx.triggerHook('onUserUpdated', updated);
      return updated;
    }),

    resetUserMfaSession: withPluginErrorHandling(async (userId: string) => {
      const id = ctx.requireBotUser('UPDATE_USER_PROFILE');
      const validId = IdSchema.parse(userId);

      const updated = await db.user.update({
        where: { id: validId },
        data: { 
          isTwoFactorEnabled: false, 
          twoFactorSecret: null
        }
      });

      await db.auditLog.create({
        data: { action: `[PLUGIN:${ctx.pluginId}] USER_MFA_RESET`, entityType: 'User', entityId: validId, userId: id, changes: { mfaDisabled: true } }
      });
      
      await ctx.triggerHook('onUserUpdated', updated);
      return updated;
    })
  }
}

