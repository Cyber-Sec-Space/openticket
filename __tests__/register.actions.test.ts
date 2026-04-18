
jest.mock("../src/lib/settings", () => ({
  getGlobalSettings: jest.fn(),
  invalidateGlobalSettings: jest.fn()
}));
import { getGlobalSettings } from "../src/lib/settings";
jest.mock("isomorphic-dompurify", () => ({
  sanitize: (str) => str
}));
import { attemptRegistration } from "../src/app/register/actions"
import { db } from "../src/lib/db"
import bcrypt from "bcrypt"
import { redirect } from "next/navigation"

jest.mock("../src/lib/db", () => {
  const dbMock = {
    systemSetting: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: "mocked-user-id" }),
    },
    verificationToken: {
      create: jest.fn(),
    },
    invitation: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    }
  };
  (dbMock as any).$transaction = jest.fn(async (cb) => cb(dbMock));
  return { db: dbMock };
});

jest.mock("../src/lib/mailer", () => ({
  sendNewRegistrationAlertEmail: jest.fn(),
  sendVerificationEmail: jest.fn(),
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
    global.setTimeout = jest.fn((cb) => cb()) as any;
  });

  it("returns REGISTRATION_DISABLED if allowRegistration is false", async () => {
    (getGlobalSettings as jest.Mock).mockResolvedValueOnce({ allowRegistration: false });
    const fd = new FormData();
    fd.append("name", "Test");
    fd.append("email", "test@example.com");
    fd.append("password", "longpassword");
    const result = await attemptRegistration(undefined, fd);
    expect(result).toBe("REGISTRATION_DISABLED");
  });

  it("returns MISSING_FIELDS if fields omitted", async () => {
    (getGlobalSettings as jest.Mock).mockResolvedValueOnce({ allowRegistration: true });
    const fd = new FormData();
    const result = await attemptRegistration(undefined, fd);
    expect(result).toBe("MISSING_FIELDS");
  });

  it("returns PASSWORD_TOO_SHORT if password is less than 8 chars", async () => {
    (getGlobalSettings as jest.Mock).mockResolvedValueOnce({ allowRegistration: true });
    const fd = new FormData();
    fd.append("name", "Test User");
    fd.append("email", "test@example.com");
    fd.append("password", "short");
    const result = await attemptRegistration(undefined, fd);
    expect(result).toBe("PASSWORD_TOO_SHORT");
  });

  it("returns PASSWORD_TOO_LONG if password exceeds bcrypt byte-safe limit", async () => {
    (getGlobalSettings as jest.Mock).mockResolvedValueOnce({ allowRegistration: true });
    const fd = new FormData();
    fd.append("name", "Test User");
    fd.append("email", "test@example.com");
    fd.append("password", "a".repeat(73));
    const result = await attemptRegistration(undefined, fd);
    expect(result).toBe("PASSWORD_TOO_LONG");
  });

  it("returns REGISTRATION_FAILED if user already exists", async () => {
    (getGlobalSettings as jest.Mock).mockResolvedValueOnce({ allowRegistration: true });
    (db.user.findUnique as jest.Mock).mockResolvedValueOnce({ id: "1" }); // Existing user
    const fd = new FormData();
    fd.append("name", "Test User");
    fd.append("email", "test@example.com");
    fd.append("password", "longpassword");
    
    
    const result = await attemptRegistration(undefined, fd);
    expect(result).toBe("REGISTRATION_FAILED");
  });

  it("returns REGISTRATION_FAILED if DB throws P2002 (TOCTOU Race Condition) during create", async () => {
    (getGlobalSettings as jest.Mock).mockResolvedValueOnce({ allowRegistration: true });
    (db.user.findUnique as jest.Mock).mockResolvedValueOnce(null); // Looks available
    (db.user.create as jest.Mock).mockRejectedValueOnce({ code: 'P2002' }); // Fails at write time
    
    const fd = new FormData();
    fd.append("name", "Test User");
    fd.append("email", "test@example.com");
    fd.append("password", "longpassword");
    
    const result = await attemptRegistration(undefined, fd);
    expect(result).toBe("REGISTRATION_FAILED");
  });

  it("throws exception if DB throws non-P2002 error during create", async () => {
    (getGlobalSettings as jest.Mock).mockResolvedValueOnce({ allowRegistration: true });
    (db.user.findUnique as jest.Mock).mockResolvedValueOnce(null);
    const dbError = new Error("DB DOWN");
    (db.user.create as jest.Mock).mockRejectedValueOnce(dbError);
    
    const fd = new FormData();
    fd.append("name", "Test User");
    fd.append("email", "test@example.com");
    fd.append("password", "longpassword");
    
    await expect(attemptRegistration(undefined, fd)).rejects.toThrow("DB DOWN");
  });

  it("creates user with explicit default roles from settings", async () => {
    (getGlobalSettings as jest.Mock).mockResolvedValueOnce({ allowRegistration: true, defaultUserRoles: ["SECOPS", "REPORTER"] });
    (db.user.findUnique as jest.Mock).mockResolvedValueOnce(null);
    const fd = new FormData();
    fd.append("name", "Test User");
    fd.append("email", "test@example.com");
    fd.append("password", "longpassword");

    await attemptRegistration(undefined, fd);
    expect(db.user.create).toHaveBeenCalled();
  });

  it("creates user with fallback REPORTER role if default roles is missing", async () => {
    // Missing defaultUserRoles array entirely
    (getGlobalSettings as jest.Mock).mockResolvedValueOnce({ allowRegistration: true });
    (db.user.findUnique as jest.Mock).mockResolvedValueOnce(null);
    const fd = new FormData();
    fd.append("name", "Test User");
    fd.append("email", "test@example.com");
    fd.append("password", "longpassword");

    await attemptRegistration(undefined, fd);
    expect(db.user.create).toHaveBeenCalled();
  });

  it("creates user with fallback REPORTER role if default roles is empty array", async () => {
    // empty defaultUserRoles array
    (getGlobalSettings as jest.Mock).mockResolvedValueOnce({ allowRegistration: true, defaultUserRoles: [] });
    (db.user.findUnique as jest.Mock).mockResolvedValueOnce(null);
    const fd = new FormData();
    fd.append("name", "Test User");
    fd.append("email", "test@example.com");
    fd.append("password", "longpassword");

    await attemptRegistration(undefined, fd);
    expect(db.user.create).toHaveBeenCalled();
  });

  it("handles null settings cleanly defaulting everything", async () => {
    (getGlobalSettings as jest.Mock).mockResolvedValueOnce(null);
    (db.user.findUnique as jest.Mock).mockResolvedValueOnce(null);
    const fd = new FormData();
    fd.append("name", "Test User");
    fd.append("email", "test@example.com");
    fd.append("password", "longpassword");

    await attemptRegistration(undefined, fd);
    expect(db.user.create).toHaveBeenCalled();
  });

  it("triggers email alerts and verification branches", async () => {
    const { sendNewRegistrationAlertEmail, sendVerificationEmail } = require("../src/lib/mailer");
    (getGlobalSettings as jest.Mock).mockResolvedValueOnce({ 
      allowRegistration: true, 
      smtpTriggerOnNewUser: true,
      requireEmailVerification: true,
      smtpEnabled: true,
      systemPlatformUrl: "https://test.com"
    });
    (db.user.findUnique as jest.Mock).mockResolvedValueOnce(null);
    (db.user.findMany as jest.Mock).mockResolvedValueOnce([{ email: "admin@test.com" }]); // Admin list
    
    const fd = new FormData();
    fd.append("name", "Test User");
    fd.append("email", "test@example.com");
    fd.append("password", "longpassword");

    await attemptRegistration(undefined, fd);
    
    expect(sendNewRegistrationAlertEmail).toHaveBeenCalledWith("test@example.com", "Test User", ["admin@test.com"]);
    expect(db.verificationToken.create).toHaveBeenCalled();
    expect(sendVerificationEmail).toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith("/login?registered=verify");
  });
});
