import { dispatchAlert, dispatchMassAlert } from "../src/lib/notifier"
import { db } from "../src/lib/db"

jest.mock("../src/lib/db", () => ({
  db: {
    user: { findUnique: jest.fn() },
    userNotification: { create: jest.fn() }
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

  it("dispatches mass alerts sequentially", async () => {
    (db.user.findUnique as jest.Mock).mockResolvedValue({ browserNotificationsEnabled: true, notifyOnCritical: true });
    await dispatchMassAlert(["u1", "u2"], "CRITICAL", "Title", "Body", "/link");
    expect(db.userNotification.create).toHaveBeenCalledTimes(2);
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
});
