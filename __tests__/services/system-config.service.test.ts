jest.mock("@/lib/db", () => ({ db: { systemSetting: { upsert: jest.fn() }, user: { updateMany: jest.fn() }, $executeRaw: jest.fn() } }));
jest.mock("@/lib/settings", () => ({ invalidateGlobalSettings: jest.fn(), getGlobalSettings: jest.fn() }));

import { SystemConfigService } from "@/services/system-config.service";
import { db } from "@/lib/db";
import { invalidateGlobalSettings } from "@/lib/settings";

describe("SystemConfigService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("updates settings and invalidates cache", async () => {
    (db.systemSetting.upsert as jest.Mock).mockResolvedValue({ id: 1 });
    
    await SystemConfigService.updateSettings({
      allowRegistration: true,
      requireEmailVerification: false
    });
    
    expect(db.systemSetting.upsert).toHaveBeenCalled();
    expect(invalidateGlobalSettings).toHaveBeenCalled();
  });

  it("updates users if requireEmailVerification is toggled from true to false", async () => {
    await SystemConfigService.reconcileEmailVerification(true, false);
    expect(db.user.updateMany).toHaveBeenCalledWith({
      data: { emailVerified: expect.any(Date) }
    });
  });

  it("does not update users if requireEmailVerification is not toggled from true to false", async () => {
    await SystemConfigService.reconcileEmailVerification(false, true);
    expect(db.user.updateMany).not.toHaveBeenCalled();
  });
});
