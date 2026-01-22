import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import { getAppConfig } from "../config/index.js";

const databaseUrl = getAppConfig('databaseUrl') as string;

if (!databaseUrl || !databaseUrl?.trim()) {
    throw new Error('DATABASE_URL is not defined');
}

const adapter = new PrismaBetterSqlite3({
    url: databaseUrl,
});

const prisma = new PrismaClient({
  adapter,
  log: ["error", "warn"],
});

export default prisma;