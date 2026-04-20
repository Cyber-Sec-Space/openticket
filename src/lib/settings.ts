import { db } from './db';
import { SystemSetting } from '@prisma/client';

let cachedSettings: SystemSetting | null = null;
let lastFetch = 0;
const TTL = 60 * 1000; // 60 seconds

export async function getGlobalSettings(includeRelations = false): Promise<any> {
  const now = Date.now();
  
  if (!includeRelations && cachedSettings && (now - lastFetch < TTL)) {
    return cachedSettings;
  }
  
  const settings = await db.systemSetting.findUnique({ 
    where: { id: "global" },
    include: includeRelations ? { defaultUserRoles: { select: { id: true, name: true } } } : undefined
  });
  
  if (!includeRelations) {
    cachedSettings = settings;
    lastFetch = now;
  }
  
  return settings;
}

export function invalidateGlobalSettings() {
  cachedSettings = null;
  lastFetch = 0;
}
