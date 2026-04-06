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
  if (!userIds || userIds.length === 0) return;

  try {
    const users = await db.user.findMany({
      where: { id: { in: userIds }, browserNotificationsEnabled: true },
      select: { 
        id: true,
        notifyOnCritical: true,
        notifyOnHigh: true,
        notifyOnAssign: true,
        notifyOnResolution: true,
        notifyOnAssetCompromise: true,
        notifyOnUnassigned: true
      }
    });

    if (users.length === 0) return;

    const massPayload = [];

    for (const user of users) {
      let shouldNotify = false;
      switch (eventContext) {
        case "CRITICAL": shouldNotify = user.notifyOnCritical; break;
        case "HIGH": shouldNotify = user.notifyOnHigh; break;
        case "ASSIGN": shouldNotify = user.notifyOnAssign; break;
        case "RESOLUTION": shouldNotify = user.notifyOnResolution; break;
        case "ASSET_COMPROMISE": shouldNotify = user.notifyOnAssetCompromise; break;
        case "UNASSIGNED": shouldNotify = user.notifyOnUnassigned; break;
      }

      if (shouldNotify) {
        massPayload.push({
          userId: user.id,
          title,
          body,
          link,
          isRead: false,
          isPushed: false
        });
      }
    }

    if (massPayload.length > 0) {
      await db.userNotification.createMany({
        data: massPayload
      });
    }
  } catch (error) {
    console.error("Mass Notifier Error:", error)
  }
}
