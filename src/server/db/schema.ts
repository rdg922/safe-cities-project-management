// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import { sql } from "drizzle-orm";
import { index, pgTableCreator } from "drizzle-orm/pg-core";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `safe-cities-project-management-v2_${name}`);

export const posts = createTable(
  "post",
  (d) => ({
    id: d.serial().primaryKey(),
    name: d.varchar({ length: 256 }),
    createdAt: d
      .timestamp()
      .defaultNow()
      .notNull(),
    updatedAt: d.timestamp().defaultNow(),
  }),
  (t) => [index("name_idx").on(t.name)]
);

export type Post = {
  id: number,
  name: string,
  createdAt: Date,
  updatedAt: Date
} 

export const pages = createTable(
  "page",
  (d) => ({
    id: d.serial().primaryKey(), // unchanging id
    filename: d.varchar({ length: 256 }).unique(),
    content: d.text().default(""),
    createdAt: d.timestamp().notNull().defaultNow(),
    updatedAt: d.timestamp().defaultNow()
  })

  );

// Users table: sync with Clerk upon first sign up
export const users = createTable(
  "user",
  (d) => ({
    id: d.text().primaryKey(),           // Clerk user ID
    email: d.text().notNull().unique(),  // primary email
    createdAt: d.timestamp().defaultNow().notNull(),
    updatedAt: d.timestamp().defaultNow().notNull(),
  })
);