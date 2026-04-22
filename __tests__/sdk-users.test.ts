import { createUserApi } from "@/lib/plugins/sdk-users";
import { db } from "@/lib/db";
import { PluginPermissionError } from "@/lib/plugins/errors";

jest.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    customRole: { findMany: jest.fn() },
    auditLog: { create: jest.fn() }
  }
}));

describe("sdk-users", () => {
  let ctx: any;
  beforeEach(() => {
    jest.clearAllMocks();
    ctx = {
      pluginId: "test-plugin",
      requireBotUser: jest.fn().mockReturnValue("bot-id"),
      triggerHook: jest.fn().mockResolvedValue(true)
    };
  });

  const api = () => createUserApi(ctx);

  describe("getUserByEmail", () => {
    it("gets user by email", async () => {
      (db.user.findUnique as jest.Mock).mockResolvedValue({ id: "user-1", email: "test@example.com" });
      const res = await api().getUserByEmail("test@example.com");
      expect(res).toEqual({ id: "user-1", email: "test@example.com" });
      expect(db.user.findUnique).toHaveBeenCalled();
    });
  });

  describe("createUser", () => {
    it("creates user without roles", async () => {
      (db.user.create as jest.Mock).mockResolvedValue({ id: "u-1" });
      const res = await api().createUser("test@example.com", "Test User");
      expect(res).toEqual({ id: "u-1" });
      expect(db.user.create).toHaveBeenCalled();
      expect(ctx.triggerHook).toHaveBeenCalledWith("onUserCreated", { id: "u-1" });
    });

    it("creates user with roles", async () => {
      (db.customRole.findMany as jest.Mock).mockResolvedValue([{ id: "role-1" }]);
      (db.user.create as jest.Mock).mockResolvedValue({ id: "u-1" });
      const res = await api().createUser("test@example.com", "Test User", ["Admin"]);
      expect(db.user.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          customRoles: { connect: [{ id: "role-1" }] }
        })
      }));
      expect(res).toEqual({ id: "u-1" });
    });
  });

  describe("suspendUser", () => {
    it("throws if target is a bot", async () => {
      (db.user.findUnique as jest.Mock).mockResolvedValue({ id: "bot-2", isBot: true });
      await expect(api().suspendUser("bot-2")).rejects.toThrow(PluginPermissionError);
    });

    it("suspends normal user", async () => {
      (db.user.findUnique as jest.Mock).mockResolvedValue({ id: "u-1", isBot: false });
      (db.user.update as jest.Mock).mockResolvedValue({ id: "u-1" });
      await api().suspendUser("u-1");
      expect(db.user.update).toHaveBeenCalledWith(expect.objectContaining({
        data: { isDisabled: true }
      }));
    });
  });

  describe("assignUserRoles", () => {
    it("throws if target is a bot", async () => {
      (db.user.findUnique as jest.Mock).mockResolvedValue({ id: "bot-2", isBot: true });
      await expect(api().assignUserRoles("bot-2", ["Role"])).rejects.toThrow(PluginPermissionError);
    });

    it("assigns roles to user", async () => {
      (db.user.findUnique as jest.Mock).mockResolvedValue({ id: "u-1", isBot: false });
      (db.customRole.findMany as jest.Mock).mockResolvedValue([{ id: "role-1" }]);
      (db.user.update as jest.Mock).mockResolvedValue({ id: "u-1" });
      await api().assignUserRoles("u-1", ["Role"]);
      expect(db.user.update).toHaveBeenCalledWith(expect.objectContaining({
        data: { customRoles: { set: [{ id: "role-1" }] } }
      }));
    });
  });

  describe("resetUserMfaSession", () => {
    it("resets user MFA", async () => {
      (db.user.update as jest.Mock).mockResolvedValue({ id: "u-1" });
      await api().resetUserMfaSession("u-1");
      expect(db.user.update).toHaveBeenCalledWith(expect.objectContaining({
        data: { isTwoFactorEnabled: false, twoFactorSecret: null }
      }));
      expect(ctx.triggerHook).toHaveBeenCalledWith("onUserUpdated", { id: "u-1" });
    });
  });
});
