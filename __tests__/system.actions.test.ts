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
    fd.append("defaultUserRole", "SECOPS");

    await updateSystemSettings(fd);

    expect(db.systemSetting.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "global" },
      update: expect.objectContaining({ allowRegistration: true, requireGlobal2FA: false }),
      create: expect.objectContaining({ allowRegistration: true, requireGlobal2FA: false })
    }));

    expect(revalidatePath).toHaveBeenCalledWith("/system");
  });
});
