import { attemptRegistration } from "../src/app/register/actions"
import { db } from "../src/lib/db"
import bcrypt from "bcrypt"
import { redirect } from "next/navigation"

jest.mock("../src/lib/db", () => ({
  db: {
    systemSetting: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    }
  },
}));

jest.mock("bcrypt", () => ({
  hash: jest.fn().mockResolvedValue("hashed_pwd"),
}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

describe("attemptRegistration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns REGISTRATION_DISABLED if allowRegistration is false", async () => {
    (db.systemSetting.findUnique as jest.Mock).mockResolvedValueOnce({ allowRegistration: false });
    const fd = new FormData();
    const result = await attemptRegistration(undefined, fd);
    expect(result).toBe("REGISTRATION_DISABLED");
  });

  it("returns MISSING_FIELDS if fields omitted", async () => {
    (db.systemSetting.findUnique as jest.Mock).mockResolvedValueOnce({ allowRegistration: true });
    const fd = new FormData();
    const result = await attemptRegistration(undefined, fd);
    expect(result).toBe("MISSING_FIELDS");
  });

  it("creates user and redirects", async () => {
    (db.systemSetting.findUnique as jest.Mock).mockResolvedValueOnce({ allowRegistration: true, defaultUserRoles: ["SECOPS"] });
    (db.user.findUnique as jest.Mock).mockResolvedValueOnce(null);
    const fd = new FormData();
    fd.append("name", "Test User");
    fd.append("email", "test@example.com");
    fd.append("password", "longpassword");

    await attemptRegistration(undefined, fd);
    expect(db.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        email: "test@example.com",
        name: "Test User",
        passwordHash: "hashed_pwd",
        roles: ["SECOPS"]
      })
    }));
    expect(redirect).toHaveBeenCalledWith("/login?registered=true");
  });
});
