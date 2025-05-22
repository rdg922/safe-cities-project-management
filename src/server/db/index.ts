import { Pool } from "pg";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "~/env";
import * as schema from "./schema";

/**
 * Cache the database connection in development. This avoids creating a new connection on every HMR
 * update.
 */
const globalForDb = globalThis as unknown as {
  client: postgres.Sql | undefined;
};


// Create postgres client using neon for pooled connections
const client = globalForDb.client ?? postgres(env.DATABASE_URL, { 
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: {
    rejectUnauthorized: true,
  },
});

if (env.NODE_ENV !== "production") globalForDb.client = client;

export const db = drizzle(client, { schema });
