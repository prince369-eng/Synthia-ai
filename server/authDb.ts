import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";
import { ENV } from "./_core/env";

const authRole = mysqlEnum("role", ["user", "admin"]);

export const authUsers = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: authRole.notNull().default("user"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
  lastSignedIn: timestamp("lastSignedIn").notNull().defaultNow(),
});

export type AuthUser = typeof authUsers.$inferSelect;
export type InsertAuthUser = typeof authUsers.$inferInsert;

type AuthDatabase = ReturnType<typeof drizzle>;

let client: AuthDatabase | null = null;

async function getAuthDb() {
  if (!client && ENV.databaseUrl) {
    client = drizzle(ENV.databaseUrl);
  }
  return client;
}

function authDatabaseRequired<T>(database: T | null): T {
  if (!database) {
    throw new Error("The managed authentication database is unavailable.");
  }
  return database;
}

export async function upsertAuthUser(user: InsertAuthUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert.");
  }

  const database = authDatabaseRequired(await getAuthDb());
  const values: InsertAuthUser = {
    openId: user.openId,
    lastSignedIn: new Date(),
  };
  const updateSet: Partial<InsertAuthUser> = { lastSignedIn: new Date() };

  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }

  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  await database
    .insert(authUsers)
    .values(values)
    .onDuplicateKeyUpdate({ set: updateSet });
}

export async function getAuthUserByOpenId(
  openId: string,
): Promise<AuthUser | undefined> {
  const database = authDatabaseRequired(await getAuthDb());
  const rows = await database
    .select()
    .from(authUsers)
    .where(eq(authUsers.openId, openId))
    .limit(1);
  return rows[0];
}
