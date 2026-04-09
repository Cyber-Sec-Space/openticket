import { executeReset } from "../src/app/reset-password/actions";
import { db } from "../src/lib/db";
import bcrypt from "bcrypt";

jest.mock("../src/lib/db", () => ({
  db: {
    passwordResetToken: { findUnique: jest.fn(), delete: jest.fn(), deleteMany: jest.fn() },
    user: { findUnique: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn()
  }
}));
jest.mock("bcryptjs", () => ({ hash: jest.fn().mockResolvedValue("new-hash") }));

describe("executeReset", () => {
  afterEach(() => jest.clearAllMocks());

  it("fails if payload incomplete", async () => {
    const fd = new FormData();
    const res = await executeReset(null, fd);
    expect(res.error).toMatch(/Incomplete/);
  });

  it("fails if passwords mismatch", async () => {
    const fd = new FormData(); fd.append("token","1"); fd.append("email","x"); fd.append("password","a"); fd.append("confirmPassword","b");
    const res = await executeReset(null, fd);
    expect(res.error).toMatch(/Mismatch/);
  });

  it("fails if password is too short", async () => {
    const fd = new FormData(); fd.append("token","1"); fd.append("email","x"); fd.append("password","short"); fd.append("confirmPassword","short");
    const res = await executeReset(null, fd);
    expect(res.error).toMatch(/Entropy Constraint/);
  });

  it("fails if token is unrecognized", async () => {
    const fd = new FormData(); fd.append("token","1"); fd.append("email","x"); fd.append("password","longpassword"); fd.append("confirmPassword","longpassword");
    (db.passwordResetToken.findUnique as jest.Mock).mockResolvedValueOnce(null);
    const res = await executeReset(null, fd);
    expect(res.error).toMatch(/unrecognized/);
  });

  it("fails if token expires", async () => {
    const fd = new FormData(); fd.append("token","1"); fd.append("email","x"); fd.append("password","longpassword"); fd.append("confirmPassword","longpassword");
    (db.passwordResetToken.findUnique as jest.Mock).mockResolvedValueOnce({ expires: new Date(Date.now() - 10000) });
    const res = await executeReset(null, fd);
    expect(res.error).toMatch(/expired/);
  });

  it("fails if user is a phantom operator (not found)", async () => {
    const fd = new FormData(); fd.append("token","1"); fd.append("email","x"); fd.append("password","longpassword"); fd.append("confirmPassword","longpassword");
    (db.passwordResetToken.findUnique as jest.Mock).mockResolvedValueOnce({ expires: new Date(Date.now() + 10000) });
    (db.user.findUnique as jest.Mock).mockResolvedValueOnce(null);
    const res = await executeReset(null, fd);
    expect(res.error).toMatch(/Phantom State/);
  });

  it("updates password successfully", async () => {
    const fd = new FormData(); fd.append("token","1"); fd.append("email","x"); fd.append("password","longpassword"); fd.append("confirmPassword","longpassword");
    (db.passwordResetToken.findUnique as jest.Mock).mockResolvedValueOnce({ id: 1, expires: new Date(Date.now() + 10000) });
    (db.user.findUnique as jest.Mock).mockResolvedValueOnce({ id: "user" });
    const res = await executeReset(null, fd);
    expect(db.$transaction).toHaveBeenCalled();
    expect(res.success).toBe(true);
  });
});
