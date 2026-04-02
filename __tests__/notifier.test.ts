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
});
