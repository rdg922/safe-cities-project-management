// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import {
    index,
    pgTableCreator,
    customType,
    type AnyPgColumn,
    pgEnum,
    unique,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { z } from 'zod'

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator(
    (name) => `safe-cities-project-management-v2_${name}`
)

// this is how we should enums moving forward, ignore other implementations
export const ROLES = ['user', 'admin', 'unverified'] as const
export const roleSchema = z.enum(ROLES)
export const rolesEnum = pgEnum('role', ROLES)

// Permission types for file access
export const PERMISSIONS = ['view', 'comment', 'edit'] as const
export const permissionSchema = z.enum(PERMISSIONS)
export const permissionsEnum = pgEnum('permission', PERMISSIONS)

// posts aren't really used?
export const posts = createTable(
    'post',
    (d) => ({
        id: d.serial().primaryKey(),
        name: d.varchar({ length: 256 }),
        createdAt: d.timestamp().defaultNow().notNull(),
        updatedAt: d.timestamp().defaultNow(),
    }),
    (t) => [index('name_idx').on(t.name)]
)

export type Post = {
    id: number
    name: string
    createdAt: Date
    updatedAt: Date
}

// File types enum for better type safety
export const FILE_TYPES = {
    FOLDER: 'folder',
    PAGE: 'page',
    SHEET: 'sheet',
    FORM: 'form',
} as const

export type FileType = (typeof FILE_TYPES)[keyof typeof FILE_TYPES]

// Form field data types
export const FORM_FIELD_TYPES = [
    'text',
    'email',
    'number',
    'date',
    'select',
    'multiselect',
    'radio',
    'checkbox',
    'textarea',
] as const

export const formFieldTypeSchema = z.enum(FORM_FIELD_TYPES)
export const formFieldTypesEnum = pgEnum('form_field_type', FORM_FIELD_TYPES)

// Unified files table: handles hierarchical structure for pages, sheets, and folders
export const files = createTable(
    'file',
    (d) => ({
        id: d.serial().primaryKey(),
        name: d.varchar({ length: 256 }).notNull(),
        type: d.varchar({ length: 50 }).notNull().$type<FileType>(), // 'page', 'sheet', 'folder'
        parentId: d
            .integer()
            .references((): AnyPgColumn => files.id, { onDelete: 'cascade' }),
        slug: d.varchar({ length: 256 }), // URL-friendly version of name for pages
        order: d.integer().default(0), // For ordering items within the same parent
        isPublic: d.boolean().default(false), // For public access control
        createdAt: d.timestamp().notNull().defaultNow(),
        updatedAt: d.timestamp().defaultNow(),
        createdBy: d
            .text()
            .references(() => users.id, { onDelete: 'set null' }),
        updatedBy: d
            .text()
            .references(() => users.id, { onDelete: 'set null' }),
    }),
    (t) => [
        index('file_parent_idx').on(t.parentId),
        index('file_type_idx').on(t.type),
        index('file_slug_idx').on(t.slug),
        // Add optimized composite indices for hierarchy traversal
        index('file_parent_type_idx').on(t.parentId, t.type),
        index('file_created_by_idx').on(t.createdBy),
        index('file_updated_by_idx').on(t.updatedBy),
    ]
)

// Page content: stores the actual page content separately from hierarchy
export const pageContent = createTable(
    'page_content',
    (d) => ({
        id: d.serial().primaryKey(),
        fileId: d
            .integer()
            .references(() => files.id, { onDelete: 'cascade' })
            .notNull()
            .unique(),
        content: d.text().default(''),
        version: d.integer().default(1), // For versioning support
        createdAt: d.timestamp().notNull().defaultNow(),
        updatedAt: d.timestamp().defaultNow(),
    }),
    (t) => [index('page_content_file_idx').on(t.fileId)]
)

// Sheet content: stores the actual sheet data separately from hierarchy
export const sheetContent = createTable(
    'sheet_content',
    (d) => ({
        id: d.serial().primaryKey(),
        fileId: d
            .integer()
            .references(() => files.id, { onDelete: 'cascade' })
            .notNull()
            .unique(),
        content: d.text().default('[]'), // JSON string of sheet data
        schema: d.text(), // JSON string of column definitions
        version: d.integer().default(1), // For versioning support
        createdAt: d.timestamp().notNull().defaultNow(),
        updatedAt: d.timestamp().defaultNow(),
    }),
    (t) => [index('sheet_content_file_idx').on(t.fileId)]
)

// Form definitions: stores form configuration and metadata
export const forms = createTable(
    'form',
    (d) => ({
        id: d.serial().primaryKey(),
        fileId: d
            .integer()
            .references(() => files.id, { onDelete: 'cascade' })
            .notNull()
            .unique(),
        title: d.varchar({ length: 256 }).notNull(),
        description: d.text(),
        isPublished: d.boolean().default(false),
        allowAnonymous: d.boolean().default(true),
        requireLogin: d.boolean().default(false),
        acceptingResponses: d.boolean().default(true),
        showProgressBar: d.boolean().default(true),
        shuffleQuestions: d.boolean().default(false),
        oneResponsePerUser: d.boolean().default(false),
        version: d.integer().default(1),
        createdAt: d.timestamp().notNull().defaultNow(),
        updatedAt: d.timestamp().defaultNow(),
    }),
    (t) => [
        index('form_file_idx').on(t.fileId),
        index('form_published_idx').on(t.isPublished),
    ]
)

// Form fields: defines the questions and their configuration
export const formFields = createTable(
    'form_field',
    (d) => ({
        id: d.serial().primaryKey(),
        formId: d
            .integer()
            .references(() => forms.id, { onDelete: 'cascade' })
            .notNull(),
        label: d.varchar({ length: 512 }).notNull(),
        description: d.text(),
        type: formFieldTypesEnum('type').notNull(),
        required: d.boolean().default(false),
        order: d.integer().default(0),
        options: d.text(), // JSON string for select/radio/checkbox options
        validation: d.text(), // JSON string for validation rules (min/max length, pattern, etc.)
        placeholder: d.varchar({ length: 256 }),
        defaultValue: d.text(),
        createdAt: d.timestamp().notNull().defaultNow(),
        updatedAt: d.timestamp().defaultNow(),
    }),
    (t) => [
        index('form_field_form_idx').on(t.formId),
        index('form_field_order_idx').on(t.formId, t.order),
    ]
)

// Form submissions: tracks when users submit a form
export const formSubmissions = createTable(
    'form_submission',
    (d) => ({
        id: d.serial().primaryKey(),
        formId: d
            .integer()
            .references(() => forms.id, { onDelete: 'cascade' })
            .notNull(),
        userId: d.text().references(() => users.id, { onDelete: 'set null' }), // nullable for anonymous submissions
        submitterEmail: d.varchar({ length: 256 }), // for anonymous submissions
        submitterName: d.varchar({ length: 256 }), // for anonymous submissions
        ipAddress: d.varchar({ length: 45 }), // for tracking (IPv4/IPv6)
        userAgent: d.text(), // browser info
        createdAt: d.timestamp().notNull().defaultNow(),
        updatedAt: d.timestamp().defaultNow(),
    }),
    (t) => [
        index('form_submission_form_idx').on(t.formId),
        index('form_submission_user_idx').on(t.userId),
        index('form_submission_created_idx').on(t.createdAt),
    ]
)

// Form responses: stores individual field answers for each submission
export const formResponses = createTable(
    'form_response',
    (d) => ({
        id: d.serial().primaryKey(),
        submissionId: d
            .integer()
            .references(() => formSubmissions.id, { onDelete: 'cascade' })
            .notNull(),
        fieldId: d
            .integer()
            .references(() => formFields.id, { onDelete: 'cascade' })
            .notNull(),
        value: d.text(), // JSON string for complex values (arrays, objects)
        textValue: d.text(), // text representation for easy searching/filtering
        numericValue: d.numeric({ precision: 20, scale: 6 }), // for numeric fields
        dateValue: d.timestamp(), // for date fields
        createdAt: d.timestamp().notNull().defaultNow(),
    }),
    (t) => [
        index('form_response_submission_idx').on(t.submissionId),
        index('form_response_field_idx').on(t.fieldId),
        index('form_response_text_idx').on(t.textValue),
        index('form_response_numeric_idx').on(t.numericValue),
        index('form_response_date_idx').on(t.dateValue),
    ]
)

// Users table: sync with Clerk upon first sign up
export const users = createTable('user', (d) => ({
    name: d.text().notNull(), // Clerk profile name
    role: rolesEnum('role').default('unverified'), // Roles are admin and users for now
    id: d.text().primaryKey(), // Clerk user ID
    email: d.text().notNull().unique(), // primary email
    createdAt: d.timestamp().defaultNow().notNull(),
    updatedAt: d.timestamp().defaultNow().notNull(),
}))

export const messages = createTable(
    'message',
    (d) => ({
        id: d.serial().primaryKey(),
        fileId: d.integer().references(() => files.id, { onDelete: 'cascade' }),
        userId: d.text().references(() => users.id, { onDelete: 'cascade' }),
        content: d.text().notNull(),
        createdAt: d.timestamp().notNull().defaultNow(),
        updatedAt: d.timestamp().defaultNow(),
    }),
    (t) => [
        index('message_file_idx').on(t.fileId),
        index('message_user_idx').on(t.userId),
    ]
)

// Comments: for commenting on files with rich text support
export const comments = createTable(
    'comment',
    (d) => ({
        id: d.serial().primaryKey(),
        fileId: d
            .integer()
            .references(() => files.id, { onDelete: 'cascade' })
            .notNull(),
        userId: d
            .text()
            .references(() => users.id, { onDelete: 'cascade' })
            .notNull(),
        content: d.text().notNull(), // Rich text content (HTML or JSON)
        parentId: d.integer().references((): AnyPgColumn => comments.id, {
            onDelete: 'cascade',
        }), // For threaded comments/replies
        isResolved: d.boolean().default(false), // For marking comments as resolved
        createdAt: d.timestamp().notNull().defaultNow(),
        updatedAt: d.timestamp().defaultNow(),
    }),
    (t) => [
        index('comment_file_idx').on(t.fileId),
        index('comment_user_idx').on(t.userId),
        index('comment_parent_idx').on(t.parentId),
        index('comment_resolved_idx').on(t.isResolved),
    ]
)

// File permissions: tracks user permissions for individual files
export const filePermissions = createTable(
    'file_permission',
    (d) => ({
        id: d.serial().primaryKey(),
        fileId: d
            .integer()
            .references(() => files.id, { onDelete: 'cascade' })
            .notNull(),
        userId: d
            .text()
            .references(() => users.id, { onDelete: 'cascade' })
            .notNull(),
        permission: permissionsEnum('permission').notNull(),
        createdAt: d.timestamp().notNull().defaultNow(),
        updatedAt: d.timestamp().defaultNow(),
    }),
    (t) => [
        index('file_permission_file_idx').on(t.fileId),
        index('file_permission_user_idx').on(t.userId),
        index('file_permission_file_user_idx').on(t.fileId, t.userId),
        // Add optimized composite indices for better performance
        index('file_permission_user_file_perm_idx').on(
            t.userId,
            t.fileId,
            t.permission
        ),
        index('file_permission_file_perm_idx').on(t.fileId, t.permission),
    ]
)

// Effective permissions cache: pre-computed permissions including inheritance
export const effectivePermissions = createTable(
    'effective_permission',
    (d) => ({
        id: d.serial().primaryKey(),
        userId: d
            .text()
            .references(() => users.id, { onDelete: 'cascade' })
            .notNull(),
        fileId: d
            .integer()
            .references(() => files.id, { onDelete: 'cascade' })
            .notNull(),
        permission: permissionsEnum('permission').notNull(),
        // Track if this is a direct permission or inherited
        isDirect: d.boolean().default(false),
        // Track the source file ID for inherited permissions
        sourceFileId: d.integer().references(() => files.id),
        createdAt: d.timestamp().notNull().defaultNow(),
        updatedAt: d.timestamp().defaultNow(),
    }),
    (t) => [
        // Unique constraint to prevent duplicate entries
        unique('eff_perm_user_file_unique').on(t.userId, t.fileId),
        index('eff_perm_file_idx').on(t.fileId),
        index('eff_perm_user_idx').on(t.userId),
        index('eff_perm_user_perm_idx').on(t.userId, t.permission),
        index('eff_perm_source_file_idx').on(t.sourceFileId),
    ]
)

export const messageReads = createTable(
    'message_read',
    (d) => ({
        id: d.serial().primaryKey(),
        userId: d.text().references(() => users.id, { onDelete: 'cascade' }),
        pageId: d.integer().references(() => files.id, { onDelete: 'cascade' }),
        lastSeenMessageId: d.integer(),
        updatedAt: d.timestamp().defaultNow(),
    }),
    (t) => [index('message_read_user_page_idx').on(t.userId, t.pageId)]
)

export const notifications = createTable(
    'notification',
    (d) => ({
        id: d.serial().primaryKey(),
        pageId: d
            .integer()
            .references(() => files.id, { onDelete: 'cascade' })
            .notNull(),
        userId: d
            .text()
            .references(() => users.id, { onDelete: 'cascade' })
            .notNull(),
        content: d.text().notNull(),
        type: d.text().default('general'), // e.g., 'mention', 'comment', etc.
        read: d.boolean().default(false),
        createdAt: d.timestamp().notNull().defaultNow(),
        updatedAt: d.timestamp().defaultNow(),
    }),
    (t) => [
        index('notification_user_idx').on(t.userId),
        index('notification_type_idx').on(t.type),
        index('notification_read_idx').on(t.read),
    ]
)

// TypeScript types for better type safety
export type File = {
    id: number
    name: string
    type: FileType
    parentId: number | null
    slug: string | null
    order: number
    isPublic: boolean
    createdAt: Date
    updatedAt: Date | null
    createdBy: string | null
    updatedBy: string | null
}

export type PageContent = {
    id: number
    fileId: number
    content: string
    version: number
    createdAt: Date
    updatedAt: Date | null
}

export type SheetContent = {
    id: number
    fileId: number
    content: string // JSON string of sheet data
    schema: string | null // JSON string of column definitions
    version: number
    createdAt: Date
    updatedAt: Date | null
}

export type Form = {
    id: number
    fileId: number
    title: string
    description: string | null
    isPublished: boolean
    allowAnonymous: boolean
    requireLogin: boolean
    acceptingResponses: boolean
    showProgressBar: boolean
    shuffleQuestions: boolean
    oneResponsePerUser: boolean
    version: number
    createdAt: Date
    updatedAt: Date | null
}

export type FormField = {
    id: number
    formId: number
    label: string
    description: string | null
    type: (typeof FORM_FIELD_TYPES)[number]
    required: boolean
    order: number
    options: string | null // JSON string
    validation: string | null // JSON string
    placeholder: string | null
    defaultValue: string | null
    createdAt: Date
    updatedAt: Date | null
}

export type FormSubmission = {
    id: number
    formId: number
    userId: string | null
    submitterEmail: string | null
    submitterName: string | null
    ipAddress: string | null
    userAgent: string | null
    createdAt: Date
    updatedAt: Date | null
}

export type FormResponse = {
    id: number
    submissionId: number
    fieldId: number
    value: string | null // JSON string
    textValue: string | null
    numericValue: string | null
    dateValue: Date | null
    createdAt: Date
}

export type User = {
    id: string
    email: string
    createdAt: Date
    updatedAt: Date
}

export type Message = {
    id: number
    fileId: number | null
    userId: string | null
    content: string
    createdAt: Date
    updatedAt: Date | null
}

export type Comment = {
    id: number
    fileId: number
    userId: string
    content: string
    parentId: number | null
    isResolved: boolean
    createdAt: Date
    updatedAt: Date | null
}

export type FilePermission = {
    id: number
    fileId: number
    userId: string
    permission: 'view' | 'comment' | 'edit'
    createdAt: Date
    updatedAt: Date | null
}

export type SharePermission = 'view' | 'edit' | 'comment'

export type Notification = {
    id: number
    pageId: number
    userId: string
    content: string
    type: string
    read: boolean
    createdAt: Date
    updatedAt: Date | null
}

// Relations
export const usersRelations = relations(users, ({ many }) => ({
    filePermissions: many(filePermissions),
    createdFiles: many(files, { relationName: 'createdFiles' }),
    updatedFiles: many(files, { relationName: 'updatedFiles' }),
    messages: many(messages),
    comments: many(comments),
    formSubmissions: many(formSubmissions),
}))

export const filesRelations = relations(files, ({ one, many }) => ({
    parent: one(files, {
        fields: [files.parentId],
        references: [files.id],
        relationName: 'fileHierarchy',
    }),
    children: many(files, { relationName: 'fileHierarchy' }),
    pageContent: one(pageContent),
    sheetContent: one(sheetContent),
    form: one(forms),
    filePermissions: many(filePermissions),
    messages: many(messages),
    comments: many(comments),
    createdBy: one(users, {
        fields: [files.createdBy],
        references: [users.id],
        relationName: 'createdFiles',
    }),
    updatedBy: one(users, {
        fields: [files.updatedBy],
        references: [users.id],
        relationName: 'updatedFiles',
    }),
}))

export const filePermissionsRelations = relations(
    filePermissions,
    ({ one }) => ({
        file: one(files, {
            fields: [filePermissions.fileId],
            references: [files.id],
        }),
        user: one(users, {
            fields: [filePermissions.userId],
            references: [users.id],
        }),
    })
)

export const effectivePermissionsRelations = relations(
    effectivePermissions,
    ({ one }) => ({
        user: one(users, {
            fields: [effectivePermissions.userId],
            references: [users.id],
        }),
        file: one(files, {
            fields: [effectivePermissions.fileId],
            references: [files.id],
        }),
        sourceFile: one(files, {
            fields: [effectivePermissions.sourceFileId],
            references: [files.id],
            relationName: 'sourceFilePermission',
        }),
    })
)

export const pageContentRelations = relations(pageContent, ({ one }) => ({
    file: one(files, {
        fields: [pageContent.fileId],
        references: [files.id],
    }),
}))

export const sheetContentRelations = relations(sheetContent, ({ one }) => ({
    file: one(files, {
        fields: [sheetContent.fileId],
        references: [files.id],
    }),
}))

export const messagesRelations = relations(messages, ({ one }) => ({
    file: one(files, {
        fields: [messages.fileId],
        references: [files.id],
    }),
    user: one(users, {
        fields: [messages.userId],
        references: [users.id],
    }),
}))

export const commentsRelations = relations(comments, ({ one, many }) => ({
    file: one(files, {
        fields: [comments.fileId],
        references: [files.id],
    }),
    user: one(users, {
        fields: [comments.userId],
        references: [users.id],
    }),
    parent: one(comments, {
        fields: [comments.parentId],
        references: [comments.id],
        relationName: 'commentThread',
    }),
    replies: many(comments, { relationName: 'commentThread' }),
}))

export const notificationsRelations = relations(notifications, ({ one }) => ({
    user: one(users, {
        fields: [notifications.userId],
        references: [users.id],
    }),
    page: one(files, {
        fields: [notifications.pageId],
        references: [files.id],
    }),
}))

// Form relations
export const formsRelations = relations(forms, ({ one, many }) => ({
    file: one(files, {
        fields: [forms.fileId],
        references: [files.id],
    }),
    fields: many(formFields),
    submissions: many(formSubmissions),
}))

export const formFieldsRelations = relations(formFields, ({ one, many }) => ({
    form: one(forms, {
        fields: [formFields.formId],
        references: [forms.id],
    }),
    responses: many(formResponses),
}))

export const formSubmissionsRelations = relations(
    formSubmissions,
    ({ one, many }) => ({
        form: one(forms, {
            fields: [formSubmissions.formId],
            references: [forms.id],
        }),
        user: one(users, {
            fields: [formSubmissions.userId],
            references: [users.id],
        }),
        responses: many(formResponses),
    })
)

export const formResponsesRelations = relations(formResponses, ({ one }) => ({
    submission: one(formSubmissions, {
        fields: [formResponses.submissionId],
        references: [formSubmissions.id],
    }),
    field: one(formFields, {
        fields: [formResponses.fieldId],
        references: [formFields.id],
    }),
}))
