jest.mock("@/lib/db", () => ({ db: { systemSetting: { upsert: jest.fn() }, user: { updateMany: jest.fn() }, auditLog: { create: jest.fn() }, $executeRaw: jest.fn() } }));
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
    
    await SystemConfigService.updateSettings("dummy-user-id", {
      allowRegistration: true,
      requireEmailVerification: false,
      defaultRoleName: "NONE",
      smtpPasswordRaw: "",
      mailerApiKeyRaw: ""
    });
    
    expect(db.systemSetting.upsert).toHaveBeenCalled();
    expect(invalidateGlobalSettings).toHaveBeenCalled();
  });
});
