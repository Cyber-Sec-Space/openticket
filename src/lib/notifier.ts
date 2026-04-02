import { db } from "./db"

export async function dispatchAlert(
  userId: string,
  eventContext: "CRITICAL" | "HIGH" | "ASSIGN" | "RESOLUTION" | "ASSET_COMPROMISE" | "UNASSIGNED",
  title: string,
  body: string,
  link?: string
) {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { 
        browserNotificationsEnabled: true,
        notifyOnCritical: true,
        notifyOnHigh: true,
        notifyOnAssign: true,
        notifyOnResolution: true,
        notifyOnAssetCompromise: true,
        notifyOnUnassigned: true
      }
    })

    if (!user || !user.browserNotificationsEnabled) return;

    let shouldNotify = false;
    switch (eventContext) {
      case "CRITICAL": shouldNotify = user.notifyOnCritical; break;
      case "HIGH": shouldNotify = user.notifyOnHigh; break;
      case "ASSIGN": shouldNotify = user.notifyOnAssign; break;
      case "RESOLUTION": shouldNotify = user.notifyOnResolution; break;
      case "ASSET_COMPROMISE": shouldNotify = user.notifyOnAssetCompromise; break;
      case "UNASSIGNED": shouldNotify = user.notifyOnUnassigned; break;
    }

    if (!shouldNotify) return;

    await db.userNotification.create({
      data: {
        userId,
        title,
        body,
        link,
        isRead: false,
        isPushed: false
      }
    });
  } catch (error) {
    console.error("Notifier Error:", error)
  }
}

export async function dispatchMassAlert(
  userIds: string[],
  eventContext: "CRITICAL" | "HIGH" | "ASSIGN" | "RESOLUTION" | "ASSET_COMPROMISE" | "UNASSIGNED",
  title: string,
  body: string,
  link?: string
) {
  for (const userId of userIds) {
    // Awaiting in loop for sequential integrity but can be optimized with Promise.all()
    await dispatchAlert(userId, eventContext, title, body, link);
  }
}
