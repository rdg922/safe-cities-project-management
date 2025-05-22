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
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d.timestamp().default(sql`CURRENT_TIMESTAMP`),
  }),
  (t) => [index("name_idx").on(t.name)]
);
