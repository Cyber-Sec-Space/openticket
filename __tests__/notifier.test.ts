
jest.mock("../src/lib/settings", () => ({
  getGlobalSettings: jest.fn(),
  invalidateGlobalSettings: jest.fn()
}));
import { getGlobalSettings } from "../src/lib/settings";
jest.mock("isomorphic-dompurify", () => ({
  sanitize: (str) => str
}));
import { dispatchAlert, dispatchMassAlert } from "../src/lib/notifier"
import { db } from "../src/lib/db"

jest.mock("../src/lib/db", () => ({
  db: {
    user: { findUnique: jest.fn(), findMany: jest.fn() },
    userNotification: { create: jest.fn(), createMany: jest.fn() }
  }
}));

describe("notifier", () => {
  afterEach(() => jest.clearAllMocks());

  it("does not create if notifications disabled globally for user", async () => {
    (db.user.findUnique as jest.Mock).mockResolvedValueOnce({ browserNotificationsEnabled: false });
    await dispatchAlert("u1", "CRITICAL", "Title", "Body");
    expect(db.userNotification.create).not.toHaveBeenCalled();
  });

  it("does not create if context is disabled by user", async () => {
    (db.user.findUnique as jest.Mock).mockResolvedValueOnce({ browserNotificationsEnabled: true, notifyOnCritical: false });
    await dispatchAlert("u1", "CRITICAL", "Title", "Body");
    expect(db.userNotification.create).not.toHaveBeenCalled();
  })

  it("creates a notification if context is enabled by user", async () => {
    (db.user.findUnique as jest.Mock).mockResolvedValueOnce({ browserNotificationsEnabled: true, notifyOnCritical: true });
    await dispatchAlert("u1", "CRITICAL", "Title", "Body", "/link");
    expect(db.userNotification.create).toHaveBeenCalledWith({
      data: {
        userId: "u1",
        title: "Title",
        body: "Body",
        link: "/link",
        isRead: false,
        isPushed: false
      }
    });
  });

  it("dispatches mass alerts efficiently via batching", async () => {
    (db.user.findMany as jest.Mock).mockResolvedValue([
       { id: "u1", browserNotificationsEnabled: true, notifyOnCritical: true },
       { id: "u2", browserNotificationsEnabled: true, notifyOnCritical: true },
       { id: "u3", browserNotificationsEnabled: true, notifyOnCritical: false }, // Will be skipped internally
       { id: "u4", browserNotificationsEnabled: false, notifyOnCritical: true }  // Will be skipped structurally
    ]);
    await dispatchMassAlert(["u1", "u2", "u3", "u4"], "CRITICAL", "Title", "Body", "/link");
    expect(db.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: ["u1", "u2", "u3", "u4"] }, browserNotificationsEnabled: true } }));
    expect(db.userNotification.createMany).toHaveBeenCalledWith({
       data: expect.arrayContaining([
          expect.objectContaining({ userId: "u1" }),
          expect.objectContaining({ userId: "u2" })
       ])
    });
    // u3 and u4 should not be in the createMany payload
  });

  it("mass alerts terminate early if payload empty", async () => {
     await dispatchMassAlert([], "CRITICAL", "T", "B");
     expect(db.user.findMany).not.toHaveBeenCalled();

     (db.user.findMany as jest.Mock).mockResolvedValue([]);
     await dispatchMassAlert(["nobody"], "CRITICAL", "T", "B");
     expect(db.userNotification.createMany).not.toHaveBeenCalled();
  });

  it("handles catch block cleanly when db throws on mass alert", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    (db.user.findMany as jest.Mock).mockRejectedValueOnce(new Error("DB Connection Error Mass"));
    await dispatchMassAlert(["u1"], "CRITICAL", "Title", "Body");
    expect(consoleErrorSpy).toHaveBeenCalledWith("Mass Notifier Error:", expect.any(Error));
    consoleErrorSpy.mockRestore();
  });

  it("handles catch block cleanly when db throws", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    (db.user.findUnique as jest.Mock).mockRejectedValueOnce(new Error("DB Connection Error"));
    await dispatchAlert("u1", "CRITICAL", "Title", "Body");
    expect(consoleErrorSpy).toHaveBeenCalledWith("Notifier Error:", expect.any(Error));
    consoleErrorSpy.mockRestore();
  });

  it("checks other contexts branches successfully", async () => {
    const mockUser = { browserNotificationsEnabled: true, notifyOnHigh: true, notifyOnAssign: true, notifyOnResolution: true, notifyOnAssetCompromise: true, notifyOnUnassigned: true };
    (db.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    
    await dispatchAlert("u1", "HIGH", "T", "B");
    expect(db.userNotification.create).toHaveBeenCalled();
    
    await dispatchAlert("u1", "ASSIGN", "T", "B");
    expect(db.userNotification.create).toHaveBeenCalled();

    await dispatchAlert("u1", "RESOLUTION", "T", "B");
    expect(db.userNotification.create).toHaveBeenCalled();

    await dispatchAlert("u1", "ASSET_COMPROMISE", "T", "B");
    expect(db.userNotification.create).toHaveBeenCalled();

    await dispatchAlert("u1", "UNASSIGNED", "T", "B");
    expect(db.userNotification.create).toHaveBeenCalled();
  });

  it("checks other contexts branches successfully for mass alerts", async () => {
    const mockUser = { id: "u2", browserNotificationsEnabled: true, notifyOnHigh: true, notifyOnAssign: true, notifyOnResolution: true, notifyOnAssetCompromise: true, notifyOnUnassigned: true };
    (db.user.findMany as jest.Mock).mockResolvedValue([mockUser]);
    
    await dispatchMassAlert(["u2"], "HIGH", "T", "B");
    expect(db.userNotification.createMany).toHaveBeenCalled();
    
    await dispatchMassAlert(["u2"], "ASSIGN", "T", "B");
    expect(db.userNotification.createMany).toHaveBeenCalled();

    await dispatchMassAlert(["u2"], "RESOLUTION", "T", "B");
    expect(db.userNotification.createMany).toHaveBeenCalled();

    await dispatchMassAlert(["u2"], "ASSET_COMPROMISE", "T", "B");
    expect(db.userNotification.createMany).toHaveBeenCalled();

    await dispatchMassAlert(["u2"], "UNASSIGNED", "T", "B");
    expect(db.userNotification.createMany).toHaveBeenCalled();
  });
});
