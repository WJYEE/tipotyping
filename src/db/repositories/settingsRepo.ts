import { db } from "@/db/db";

export const settingsRepo = {
  async get<T>(key: string): Promise<T | undefined> {
    const row = await db.settings.get(key);
    return row?.value as T | undefined;
  },

  async set<T>(key: string, value: T): Promise<void> {
    await db.settings.put({ id: key, value });
  },
};
