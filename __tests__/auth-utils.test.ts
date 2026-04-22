import { assertSecureSession, hasPermission } from "@/lib/auth-utils";

describe("Auth Utils", () => {
  describe("hasPermission", () => {
    it("returns false if session or user is null", () => {
      expect(hasPermission(null, "VIEW_USERS")).toBe(false);
    });

    it("returns false if user requires 2FA setup", () => {
      expect(hasPermission({ user: { requires2FASetup: true, permissions: ["VIEW_USERS"] } }, "VIEW_USERS")).toBe(false);
    });

    it("returns true if user has specific permission", () => {
      expect(hasPermission({ user: { permissions: ["VIEW_USERS"] } }, "VIEW_USERS")).toBe(true);
    });

    it("returns true if user has at least one of array permissions", () => {
      expect(hasPermission({ user: { permissions: ["CREATE_USERS"] } }, ["VIEW_USERS", "CREATE_USERS"])).toBe(true);
    });

    it("returns false if user lacks all array permissions", () => {
      expect(hasPermission({ user: { permissions: ["VIEW_ASSETS"] } }, ["VIEW_USERS", "CREATE_USERS"])).toBe(false);
    });
  });

  describe("assertSecureSession", () => {
    it("throws if session lacks user id", () => {
      expect(() => assertSecureSession({ user: {} })).toThrow("Unauthorized");
    });

    it("throws if user requires 2FA setup", () => {
      expect(() => assertSecureSession({ user: { id: "1", requires2FASetup: true } })).toThrow("Security Interlock: Action Thwarted. MFA Setup Requirement Pending.");
    });

    it("does not throw if session is secure", () => {
      expect(() => assertSecureSession({ user: { id: "1", requires2FASetup: false } })).not.toThrow();
    });
  });
});
