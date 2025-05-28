// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import { index, pgTableCreator, customType, type AnyPgColumn} from "drizzle-orm/pg-core";

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

// File types enum for better type safety
export const FILE_TYPES = {
  FOLDER: 'folder',
  PAGE: 'page',
  SHEET: 'sheet'
} as const;

export type FileType = typeof FILE_TYPES[keyof typeof FILE_TYPES];

// Unified files table: handles hierarchical structure for pages, sheets, and folders
export const files = createTable(
  "file",
  (d) => ({
    id: d.serial().primaryKey(),
    name: d.varchar({ length: 256 }).notNull(),
    type: d.varchar({ length: 50 }).notNull().$type<FileType>(), // 'page', 'sheet', 'folder'
    parentId: d.integer().references((): AnyPgColumn => files.id, { onDelete: "cascade" }),
    slug: d.varchar({ length: 256 }), // URL-friendly version of name for pages
    order: d.integer().default(0), // For ordering items within the same parent
    isPublic: d.boolean().default(false), // For public access control
    createdAt: d.timestamp().notNull().defaultNow(),
    updatedAt: d.timestamp().defaultNow(),
    createdBy: d.text().references(() => users.id, { onDelete: "set null" }),
    updatedBy: d.text().references(() => users.id, { onDelete: "set null" })
  }),
  (t) => [
    index("file_parent_idx").on(t.parentId),
    index("file_type_idx").on(t.type),
    index("file_slug_idx").on(t.slug),
  ]
);

// Page content: stores the actual page content separately from hierarchy
export const pageContent = createTable(
  "page_content",
  (d) => ({
    id: d.serial().primaryKey(),
    fileId: d.integer().references(() => files.id, { onDelete: "cascade" }).notNull().unique(),
    content: d.text().default(""),
    version: d.integer().default(1), // For versioning support
    createdAt: d.timestamp().notNull().defaultNow(),
    updatedAt: d.timestamp().defaultNow(),
  }),
  (t) => [
    index("page_content_file_idx").on(t.fileId),
  ]
);

// Sheet content: stores the actual sheet data separately from hierarchy
export const sheetContent = createTable(
  "sheet_content",
  (d) => ({
    id: d.serial().primaryKey(),
    fileId: d.integer().references(() => files.id, { onDelete: "cascade" }).notNull().unique(),
    content: d.text().default("[]"), // JSON string of sheet data
    schema: d.text(), // JSON string of column definitions
    version: d.integer().default(1), // For versioning support
    createdAt: d.timestamp().notNull().defaultNow(),
    updatedAt: d.timestamp().defaultNow(),
  }),
  (t) => [
    index("sheet_content_file_idx").on(t.fileId),
  ]
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
    fileId: d.integer().references(() => files.id, { onDelete: "cascade" }),
    userId: d.text().references(() => users.id, { onDelete: "cascade" }),
    content: d.text().notNull(),
    createdAt: d.timestamp().notNull().defaultNow(),
    updatedAt: d.timestamp().defaultNow(),
  }),
  (t) => [
    index("message_file_idx").on(t.fileId),
    index("message_user_idx").on(t.userId),
  ]
);

// TypeScript types for better type safety
export type File = {
  id: number;
  name: string;
  type: FileType;
  parentId: number | null;
  slug: string | null;
  order: number;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date | null;
  createdBy: string | null;
  updatedBy: string | null;
};

export type PageContent = {
  id: number;
  fileId: number;
  content: string;
  version: number;
  createdAt: Date;
  updatedAt: Date | null;
};

export type SheetContent = {
  id: number;
  fileId: number;
  content: string; // JSON string of sheet data
  schema: string | null; // JSON string of column definitions
  version: number;
  createdAt: Date;
  updatedAt: Date | null;
};

export type User = {
  id: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Message = {
  id: number;
  fileId: number | null;
  userId: string | null;
  content: string;
  createdAt: Date;
  updatedAt: Date | null;
};