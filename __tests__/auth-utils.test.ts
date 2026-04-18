
jest.mock("../src/lib/settings", () => ({
  getGlobalSettings: jest.fn(),
  invalidateGlobalSettings: jest.fn()
}));
import { getGlobalSettings } from "../src/lib/settings";
jest.mock("isomorphic-dompurify", () => ({
  sanitize: (str) => str
}));
import { assertSecureSession, hasPermission } from "../src/lib/auth-utils"

describe("auth-utils", () => {
  describe("hasPermission", () => {
    it("returns false if no session or user", () => {
      expect(hasPermission(null, "VIEW_PLUGINS")).toBe(false)
      expect(hasPermission({} as any, "VIEW_PLUGINS")).toBe(false)
    })
    it("returns false if requires 2FA", () => {
      expect(hasPermission({ user: { requires2FASetup: true, permissions: ["VIEW_PLUGINS"] } } as any, "VIEW_PLUGINS")).toBe(false)
    })
    it("returns true for correct single permission", () => {
      expect(hasPermission({ user: { requires2FASetup: false, permissions: ["VIEW_PLUGINS"] } } as any, "VIEW_PLUGINS")).toBe(true)
    })
    it("handles array OR logic correctly", () => {
      expect(hasPermission({ user: { requires2FASetup: false, permissions: ["A"] } } as any, ["A", "B"] as any)).toBe(true)
      expect(hasPermission({ user: { requires2FASetup: false, permissions: ["C"] } } as any, ["A", "B"] as any)).toBe(false)
    })
  })

  describe("assertSecureSession", () => {
    it("throws Unauthorized if no session or user", () => {
      expect(() => assertSecureSession(null)).toThrow("Unauthorized")
      expect(() => assertSecureSession({} as any)).toThrow("Unauthorized")
    })

    it("throws MFA error if user requires 2FA setup", () => {
      const session: any = { user: { id: "1", requires2FASetup: true } }
      expect(() => assertSecureSession(session)).toThrow("Security Interlock: Action Thwarted. MFA Setup Requirement Pending.")
    })

    it("passes cleanly if session is secure and valid", () => {
      const session: any = { user: { id: "1", requires2FASetup: false } }
      expect(() => assertSecureSession(session)).not.toThrow()
    })
  })
})
