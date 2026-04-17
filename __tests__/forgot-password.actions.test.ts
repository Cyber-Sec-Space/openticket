import { sendResetLink } from "../src/app/forgot-password/actions";
import { db } from "../src/lib/db";
import { sendPasswordResetEmail } from "../src/lib/mailer";
import crypto from "crypto";

jest.mock("../src/lib/db", () => ({
  db: {
    systemSetting: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    passwordResetToken: { deleteMany: jest.fn(), create: jest.fn() },
    auditLog: { create: jest.fn() }
  }
}));
jest.mock("../src/lib/mailer", () => ({ sendPasswordResetEmail: jest.fn() }));
jest.mock("crypto", () => ({ randomBytes: jest.fn().mockReturnValue({ toString: () => "mocked-token" }) }));

describe("sendResetLink", () => {
  afterEach(() => jest.clearAllMocks());

  it("returns error if email missing", async () => {
    const res = await sendResetLink(null, new FormData());
    expect(res.error).toMatch(/Missing identity/);
  });

  it("returns error if SMTP offline", async () => {
    (db.systemSetting.findUnique as jest.Mock).mockResolvedValueOnce({ smtpEnabled: false });
    const fd = new FormData(); fd.append("email", "test@test.com");
    const res = await sendResetLink(null, fd);
    expect(res.error).toMatch(/SMTP/);
  });

  it("returns success instantly if user not found", async () => {
    (db.systemSetting.findUnique as jest.Mock).mockResolvedValueOnce({ smtpEnabled: true });
    (db.user.findUnique as jest.Mock).mockResolvedValueOnce(null);
    const fd = new FormData(); fd.append("email", "test@test.com");
    const res = await sendResetLink(null, fd);
    expect(res.success).toBe(true);
  });

  it("creates token and dispatches if user found", async () => {
    (db.systemSetting.findUnique as jest.Mock).mockResolvedValueOnce({ smtpEnabled: true, systemPlatformUrl: "http://test" });
    (db.user.findUnique as jest.Mock).mockResolvedValueOnce({ id: "user-1", email: "test@test.com" });
    const fd = new FormData(); fd.append("email", "test@test.com");
    
    const res = await sendResetLink(null, fd);
    expect(res.success).toBe(true);
    expect(db.passwordResetToken.create).toHaveBeenCalled();
    expect(sendPasswordResetEmail).toHaveBeenCalled();
  });
});
