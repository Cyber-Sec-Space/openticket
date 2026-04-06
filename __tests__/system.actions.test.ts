import { updateSystemSettings } from "../src/app/(dashboard)/system/actions"
import { db } from "../src/lib/db"
import { auth } from "../src/auth"
import { revalidatePath } from "next/cache"

jest.mock("../src/lib/db", () => ({
  db: {
    systemSetting: {
      upsert: jest.fn().mockResolvedValue({}),
    },
  },
}));

jest.mock("../src/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

describe("updateSystemSettings Action", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("throws Unauthorized if session is missing", async () => {
    (auth as jest.Mock).mockResolvedValueOnce(null);
    const fd = new FormData();
    await expect(updateSystemSettings(fd)).rejects.toThrow("Unauthorized");
  });

  it("throws Unauthorized if user is not ADMIN", async () => {
    (auth as jest.Mock).mockResolvedValueOnce({ user: { roles: ["REPORTER"] } });
    const fd = new FormData();
    await expect(updateSystemSettings(fd)).rejects.toThrow("Unauthorized");
  });

  it("upserts system setting and revalidates if user is ADMIN", async () => {
    (auth as jest.Mock).mockResolvedValueOnce({ user: { roles: ["ADMIN"] } });
    const fd = new FormData();
    fd.append("allowRegistration", "on");
    fd.append("requireGlobal2FA", "off"); // Intentionally not sending "on" to test logic
    fd.append("defaultUserRoles", "SECOPS");
    fd.append("smtpPort", "587");
    fd.append("smtpPassword", "secretpassword");
    
    // Pass valid numbers to test the 'false' branch of isNaN
    fd.append("slaCriticalHours", "2");
    fd.append("slaHighHours", "12");
    fd.append("slaMediumHours", "48");
    fd.append("slaLowHours", "80");
    fd.append("rateLimitWindowMs", "60000");
    fd.append("rateLimitMaxAttempts", "10");

    await updateSystemSettings(fd);

    expect(db.systemSetting.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "global" },
      update: expect.objectContaining({ allowRegistration: true, requireGlobal2FA: false }),
      create: expect.objectContaining({ allowRegistration: true, requireGlobal2FA: false })
    }));

    expect(revalidatePath).toHaveBeenCalledWith("/system");
  });

  it("handles missing optional values with gracefully mapped fallbacks", async () => {
    (auth as jest.Mock).mockResolvedValueOnce({ user: { roles: ["ADMIN"] } });
    const fd = new FormData();
    // Intentionally leaving out: defaultUserRoles, smtpPort, smtpPassword
    
    await updateSystemSettings(fd);

    expect(db.systemSetting.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ defaultUserRoles: ["REPORTER"] }),
      update: expect.objectContaining({ defaultUserRoles: ["REPORTER"] })
    }));
  });

  it("handles NaN string injections seamlessly by reverting to logical defaults", async () => {
    (auth as jest.Mock).mockResolvedValueOnce({ user: { roles: ["ADMIN"] } });
    const fd = new FormData();
    fd.append("slaCriticalHours", "invalid string");
    fd.append("slaHighHours", "blabla");
    fd.append("slaMediumHours", "");
    fd.append("slaLowHours", "broken");
    fd.append("rateLimitWindowMs", "hack");
    fd.append("rateLimitMaxAttempts", "nan");
    fd.append("smtpPort", "notanumber");
    
    await updateSystemSettings(fd);

    expect(db.systemSetting.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ 
         slaCriticalHours: 4,
         slaHighHours: 24,
         slaMediumHours: 72,
         slaLowHours: 168,
         rateLimitWindowMs: 900000,
         rateLimitMaxAttempts: 5,
         smtpPort: null
      }),
      update: expect.objectContaining({ 
         slaCriticalHours: 4,
         slaHighHours: 24,
         slaMediumHours: 72,
         slaLowHours: 168,
         rateLimitWindowMs: 900000,
         rateLimitMaxAttempts: 5,
         smtpPort: null
      })
    }));
  });
});
