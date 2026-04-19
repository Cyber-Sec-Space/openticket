
jest.mock("../src/lib/settings", () => ({
  getGlobalSettings: jest.fn(),
  invalidateGlobalSettings: jest.fn()
}));
import { getGlobalSettings } from "../src/lib/settings";
jest.mock("isomorphic-dompurify", () => ({
  sanitize: (str) => str
}));
import { updateSystemSettings, testSmtpConnection } from "../src/app/(dashboard)/system/actions"
import { db } from "../src/lib/db"
import { auth } from "@/auth"
import { hasPermission } from "@/lib/auth-utils"
import { encryptString, decryptString } from "@/lib/plugins/crypto"
import nodemailer from "nodemailer"

jest.mock("../src/lib/db", () => ({
  db: {
    systemSetting: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    user: {
      updateMany: jest.fn(),
    },
    customRole: {
      findUnique: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $executeRawUnsafe: jest.fn(),
    $executeRaw: jest.fn()
  }
}))

jest.mock("@/auth", () => ({
  auth: jest.fn()
}))

jest.mock("@/lib/auth-utils", () => ({
  hasPermission: jest.fn()
}))

jest.mock("@/lib/plugins/hook-engine", () => ({
  fireHook: jest.fn()
}))

jest.mock("@/lib/plugins/crypto", () => ({
  encryptString: jest.fn((val) => "encrypted_" + val),
  decryptString: jest.fn((val) => val.replace("encrypted_", "")),
}))

jest.mock("nodemailer", () => ({
  createTransport: jest.fn().mockReturnValue({
    verify: jest.fn().mockResolvedValue(true)
  })
}))

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn()
}))

describe("System Actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.setTimeout = jest.fn((cb) => cb()) as any;
  })

  describe("updateSystemSettings", () => {
    it("throws Unauthorized if not logged in", async () => {
      (auth as jest.Mock).mockResolvedValue(null)
      await expect(updateSystemSettings(new FormData())).rejects.toThrow("Unauthorized")
    })

    it("throws Unauthorized if lacks permission", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "1" } })
      ;(hasPermission as jest.Mock).mockReturnValue(false)
      await expect(updateSystemSettings(new FormData())).rejects.toThrow("Unauthorized")
    })

    it("upserts system settings and updates email verify if toggled", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "1" } })
      ;(hasPermission as jest.Mock).mockReturnValue(true)
      
      const fd = new FormData()
      fd.append("allowRegistration", "on")
      fd.append("requireEmailVerification", "on")
      fd.append("defaultRoleId", "NONE")
      fd.append("smtpPassword", "<CLEAR>")
      fd.append("systemPlatformUrl", "https://cyber-sec.space")
      fd.append("webhookUrl", "https://cyber-sec.space/webhook")
      fd.append("soarAutoQuarantineThreshold", "")
      
      ;(getGlobalSettings as jest.Mock).mockResolvedValue({ requireEmailVerification: false })
      
      await updateSystemSettings(fd)
      
      expect(db.systemSetting.upsert).toHaveBeenCalled()
      expect(db.user.updateMany).toHaveBeenCalled()
      expect(db.$executeRawUnsafe).toHaveBeenCalledTimes(2)
    })
    
    it("handles parsing roles and encrypting smtp password and URL fallback parsing", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "1" } })
      ;(hasPermission as jest.Mock).mockReturnValue(true)
      
      const fd = new FormData()
      fd.append("defaultRoleId", "CustomRole1")
      fd.append("smtpPassword", "newpass")
      fd.append("webhookEnabled", "on")
      fd.append("webhookUrl", "invalid_url")
      fd.append("systemPlatformUrl", "invalid_url")
      fd.append("slaCriticalHours", "invalid")
      fd.append("slaHighHours", "invalid")
      fd.append("slaMediumHours", "invalid")
      fd.append("slaLowHours", "invalid")
      fd.append("slaInfoHours", "invalid")
      fd.append("rateLimitWindowMs", "invalid")
      fd.append("rateLimitMaxAttempts", "invalid")
      fd.append("smtpPort", "invalid")
      
      ;(db.customRole.findUnique as jest.Mock).mockResolvedValue({ id: "Role1" })
      
      await updateSystemSettings(fd)
      
      expect(db.customRole.findUnique).toHaveBeenCalledWith({ where: { name: "CustomRole1" } })
      expect(encryptString).toHaveBeenCalledWith("newpass")
      const upsertArgs = (db.systemSetting.upsert as jest.Mock).mock.calls[0][0]
      expect(upsertArgs.update.systemPlatformUrl).toBe("http://localhost:3000") // Fallback
      expect(upsertArgs.update.webhookUrl).toBe("") // Fallback
    })

    it("upserts system settings with explicit valid smtp port and no password", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "1" } })
      ;(hasPermission as jest.Mock).mockReturnValue(true)
      ;(getGlobalSettings as jest.Mock).mockResolvedValue(null)
      const fd = new FormData()
      fd.append("smtpPort", "587")
      fd.append("slaCriticalHours", "5")
      fd.append("slaHighHours", "25")
      fd.append("slaMediumHours", "75")
      fd.append("slaLowHours", "170")
      fd.append("slaInfoHours", "722")
      fd.append("rateLimitWindowMs", "9000")
      fd.append("rateLimitMaxAttempts", "10")
      await updateSystemSettings(fd)
      const upsertArgs = (db.systemSetting.upsert as jest.Mock).mock.calls[0][0]
      expect(upsertArgs.update.smtpPort).toBe(587)
      expect(upsertArgs.update.requireEmailVerification).toBe(false)
    })

    it("catches DB exception silently during SLA update", async () => {
       (auth as jest.Mock).mockResolvedValue({ user: { id: "1" } })
       ;(hasPermission as jest.Mock).mockReturnValue(true)
       ;(db.$executeRawUnsafe as jest.Mock).mockRejectedValue(new Error("DB FAULT"))
       const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {})
       
       await updateSystemSettings(new FormData())
       
       expect(consoleSpy).toHaveBeenCalledWith("[SystemConfigService] Failed to retroactively update SLA dates:", expect.any(Error))
       consoleSpy.mockRestore()
    })
  })

  describe("testSmtpConnection", () => {
    it("returns error if lacks permission", async () => {
      (auth as jest.Mock).mockResolvedValue(null)
      const res = await testSmtpConnection(new FormData())
      expect(res.error).toBe("Unauthorized")
    })
    
    it("returns error if missing smtpHost", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "1" } })
      ;(hasPermission as jest.Mock).mockReturnValue(true)
      const res = await testSmtpConnection(new FormData())
      expect(res.error).toBe("SMTP Host is required for testing.")
    })
    
    it("verifies SMTP connection using existing stored decrypted password", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "1" } })
      ;(hasPermission as jest.Mock).mockReturnValue(true)
      
      ;(getGlobalSettings as jest.Mock).mockResolvedValue({ smtpPassword: "encrypted_pwd" })
      
      const fd = new FormData()
      fd.append("smtpHost", "smtp.test.com")
      // smtpPassword is empty
      
      const res = await testSmtpConnection(fd)
      
      expect(decryptString).toHaveBeenCalledWith("encrypted_pwd")
      expect(res.success).toBe(true)
    })
    
    it("verifies SMTP connection using user supplied password and implicit port 587", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "1" } })
      ;(hasPermission as jest.Mock).mockReturnValue(true)
      
      const fd = new FormData()
      fd.append("smtpHost", "smtp.test.com")
      fd.append("smtpPassword", "supplied_pwd")
      
      const res = await testSmtpConnection(fd)
      expect(res.success).toBe(true)
    })

    it("returns error if verification fails", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "1" } })
      ;(hasPermission as jest.Mock).mockReturnValue(true)
      
      ;(nodemailer.createTransport as jest.Mock).mockReturnValue({
        verify: jest.fn().mockRejectedValue(new Error("Network Error"))
      })
      
      const fd = new FormData()
      fd.append("smtpHost", "smtp.test.com")
      
      const res = await testSmtpConnection(fd)
      
      expect(res.error).toBe("Network Error")
    })

    it("tests smtp connection with missing password but no stored password", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "1" } })
      ;(hasPermission as jest.Mock).mockReturnValue(true)
      ;(getGlobalSettings as jest.Mock).mockResolvedValue(null)
      const fd = new FormData()
      fd.append("smtpHost", "smtp.test.com")
      fd.append("smtpUser", "user")
      ;(nodemailer.createTransport as jest.Mock).mockReturnValue({
        verify: jest.fn().mockResolvedValue(true)
      })
      const res = await testSmtpConnection(fd)
      expect(res.success).toBe(true)
    })
    
    it("tests smtp connection throwing unknown object without message", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "1" } })
      ;(hasPermission as jest.Mock).mockReturnValue(true)
      ;(nodemailer.createTransport as jest.Mock).mockReturnValue({
        verify: jest.fn().mockRejectedValue("Unknown Error Object")
      })
      const fd = new FormData()
      fd.append("smtpHost", "smtp.test.com")
      const res = await testSmtpConnection(fd)
      expect(res.error).toBe("Connection failed to verify.")
    })
  })
})
