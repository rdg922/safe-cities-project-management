// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import { index, pgTableCreator, customType, type AnyPgColumn } from "drizzle-orm/pg-core";

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
    parentId: d.integer().references((): AnyPgColumn => pages.id),
    isFolder: d.boolean().default(false),
    content: d.text().default(""),
    createdAt: d.timestamp().notNull().defaultNow(),
    updatedAt: d.timestamp().defaultNow(),
    createdBy: d.text().references(() => users.id, { onDelete: "set null" }),
    updatedBy: d.text().references(() => users.id, { onDelete: "set null" })
  })

  );

// Sheet table: store spreadsheet data
export const sheets = createTable(
  "sheet",
  (d) => ({
    id: d.serial().primaryKey(),
    title: d.varchar({ length: 256 }).notNull(),
    content: d.text().default("[]"), // JSON string of sheet data
    createdAt: d.timestamp().defaultNow().notNull(),
    updatedAt: d.timestamp().defaultNow().notNull(),
    createdBy: d.text().references(() => users.id, { onDelete: "set null" }),
    updatedBy: d.text().references(() => users.id, { onDelete: "set null" })
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

export const messages = createTable(
  "message",
  (d) => ({
    id: d.serial().primaryKey(),
    pageId: d.integer().references(() => pages.id, { onDelete: "cascade" }),
    userId: d.text().references(() => users.id, { onDelete: "cascade" }),
    content: d.text().notNull(),
    createdAt: d.timestamp().notNull().defaultNow(),
    updatedAt: d.timestamp().defaultNow(),
  })
);

export type Message = {
  id: number;
  pageId: number;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date | null;
};