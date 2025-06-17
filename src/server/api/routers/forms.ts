import { eq, sql, desc, asc, ne, and, inArray } from 'drizzle-orm'
import { z } from 'zod'

import {
    createTRPCRouter,
    publicProcedure,
    protectedProcedure,
} from '~/server/api/trpc'
import {
    files,
    forms,
    formFields,
    formSubmissions,
    formResponses,
    sheetContent,
    formSheetSyncs,
    FILE_TYPES,
    FORM_FIELD_TYPES,
    formFieldTypeSchema,
    type FormField,
} from '~/server/db/schema'
import { createSyncedSheetData } from '~/lib/sheet-utils'
import { TRPCError } from '@trpc/server'
import {
    getUserPermissionContext,
    getAccessibleFiles,
} from '~/lib/permissions-simple'

// Validation schemas for form field options and validation rules
const fieldOptionsSchema = z.array(
    z.object({
        text: z.string(),
    })
)

const fieldValidationSchema = z.object({
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
    customErrorMessage: z.string().optional(),
})

export const formsRouter = createTRPCRouter({
    // Create a new form
    create: protectedProcedure
        .input(
            z.object({
                name: z.string().min(1),
                parentId: z.number().optional(),
                title: z.string().min(1),
                description: z.string().optional(),
                isPublic: z.boolean().default(false),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { userId } = ctx.auth

            // Create the file record first
            const [file] = await ctx.db
                .insert(files)
                .values({
                    name: input.name,
                    type: FILE_TYPES.FORM,
                    parentId: input.parentId || null,
                    slug: input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                    order: 0,
                    isPublic: input.isPublic,
                    createdBy: userId,
                    updatedBy: userId,
                })
                .returning()

            if (!file) {
                throw new Error('Failed to create file')
            }

            // Create the form record
            const [form] = await ctx.db
                .insert(forms)
                .values({
                    fileId: file.id,
                    title: input.title,
                    description: input.description || null,
                    isPublished: false,
                    allowAnonymous: true,
                    requireLogin: false,
                    acceptingResponses: true,
                    showProgressBar: true,
                    shuffleQuestions: false,
                    oneResponsePerUser: false,
                    version: 1,
                })
                .returning()

            if (!form) {
                throw new Error('Failed to create form')
            }

            // Automatically add default name and email fields when creating a new form
            const defaultFields = [
                {
                    formFileId: file.id,
                    label: 'Name',
                    description: 'Your full name',
                    type: 'text' as const,
                    required: true,
                    order: 0,
                    placeholder: 'Enter your full name',
                },
                {
                    formFileId: file.id,
                    label: 'Email',
                    description: 'Your email address',
                    type: 'email' as const,
                    required: true,
                    order: 1,
                    placeholder: 'Enter your email address',
                },
            ]

            await ctx.db.insert(formFields).values(defaultFields)

            return { file, form }
        }),

    // Get form by file ID (public access for published forms ONLY)
    getByFileId: publicProcedure
        .input(z.object({ fileId: z.number() }))
        .query(async ({ ctx, input }) => {
            // First check if file exists and is a form
            const file = await ctx.db.query.files.findFirst({
                where: eq(files.id, input.fileId),
                columns: { id: true, name: true, type: true },
            })

            if (!file) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Form not found',
                })
            }

            if (file.type !== FILE_TYPES.FORM) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'The specified file is not a form',
                })
            }

            const form = await ctx.db.query.forms.findFirst({
                where: eq(forms.fileId, input.fileId),
                with: {
                    file: true,
                    fields: {
                        orderBy: asc(formFields.order),
                    },
                },
            })

            if (!form) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Form not found',
                })
            }

            // SECURITY: Only allow access to published forms for public access
            if (!form.isPublished) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message:
                        'This form is not published and cannot be accessed publicly',
                })
            }

            // Parse JSON fields
            const fieldsWithParsedData = form.fields.map((field) => ({
                ...field,
                options: field.options ? JSON.parse(field.options) : null,
                validation: field.validation
                    ? JSON.parse(field.validation)
                    : null,
            }))

            return {
                ...form,
                fields: fieldsWithParsedData,
            }
        }),

    // Get form by file ID (protected - for editing/management)
    getByFileIdProtected: protectedProcedure
        .input(z.object({ fileId: z.number() }))
        .query(async ({ ctx, input }) => {
            const { userId } = ctx.auth

            // First check if file exists and is a form
            const file = await ctx.db.query.files.findFirst({
                where: eq(files.id, input.fileId),
                columns: { id: true, name: true, type: true, parentId: true },
            })

            if (!file) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Form not found',
                })
            }

            if (file.type !== FILE_TYPES.FORM) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'The specified file is not a form',
                })
            }

            // Check if user has at least view permission on this file
            const permissionContext = await getUserPermissionContext(userId)
            const accessibleFiles = await getAccessibleFiles(
                permissionContext,
                [file]
            )

            if (!accessibleFiles.has(input.fileId)) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'You do not have permission to access this form',
                })
            }

            const form = await ctx.db.query.forms.findFirst({
                where: eq(forms.fileId, input.fileId),
                with: {
                    file: true,
                    fields: {
                        orderBy: asc(formFields.order),
                    },
                },
            })

            if (!form) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Form not found',
                })
            }

            // Parse JSON fields
            const fieldsWithParsedData = form.fields.map((field) => ({
                ...field,
                options: field.options ? JSON.parse(field.options) : null,
                validation: field.validation
                    ? JSON.parse(field.validation)
                    : null,
            }))

            return {
                ...form,
                fields: fieldsWithParsedData,
            }
        }),

    // Update form settings
    updateSettings: protectedProcedure
        .input(
            z.object({
                formId: z.number(), // This is actually the fileId
                title: z.string().min(1).optional(),
                description: z.string().optional(),
                isPublished: z.boolean().optional(),
                allowAnonymous: z.boolean().optional(),
                requireLogin: z.boolean().optional(),
                acceptingResponses: z.boolean().optional(),
                showProgressBar: z.boolean().optional(),
                shuffleQuestions: z.boolean().optional(),
                oneResponsePerUser: z.boolean().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { formId, ...updateData } = input

            const [updatedForm] = await ctx.db
                .update(forms)
                .set({
                    ...updateData,
                    updatedAt: new Date(),
                })
                .where(eq(forms.fileId, formId))
                .returning()

            return updatedForm
        }),

    // Add field to form
    addField: protectedProcedure
        .input(
            z.object({
                formId: z.number(),
                label: z.string().min(1),
                description: z.string().optional(),
                type: formFieldTypeSchema,
                required: z.boolean().default(false),
                options: fieldOptionsSchema.optional(),
                validation: fieldValidationSchema.optional(),
                placeholder: z.string().optional(),
                defaultValue: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Get the current max order for this form
            const maxOrderResult = await ctx.db
                .select({
                    maxOrder: sql<number>`COALESCE(MAX(${formFields.order}), -1)`,
                })
                .from(formFields)
                .where(eq(formFields.formFileId, input.formId))

            const nextOrder = (maxOrderResult[0]?.maxOrder ?? -1) + 1

            const [field] = await ctx.db
                .insert(formFields)
                .values({
                    formFileId: input.formId,
                    label: input.label,
                    description: input.description || null,
                    type: input.type,
                    required: input.required,
                    order: nextOrder,
                    options: input.options
                        ? JSON.stringify(input.options)
                        : null,
                    validation: input.validation
                        ? JSON.stringify(input.validation)
                        : null,
                    placeholder: input.placeholder || null,
                    defaultValue: input.defaultValue || null,
                })
                .returning()

            return field
        }),

    // Update field
    updateField: protectedProcedure
        .input(
            z.object({
                fieldId: z.number(),
                label: z.string().min(1).optional(),
                description: z.string().optional(),
                type: formFieldTypeSchema.optional(),
                required: z.boolean().optional(),
                options: fieldOptionsSchema.optional(),
                validation: fieldValidationSchema.optional(),
                placeholder: z.string().optional(),
                defaultValue: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { fieldId, ...updateData } = input

            // Prepare the update object, stringifying JSON fields
            const updateFields: any = { ...updateData, updatedAt: new Date() }
            if (updateData.options) {
                updateFields.options = JSON.stringify(updateData.options)
            }
            if (updateData.validation) {
                updateFields.validation = JSON.stringify(updateData.validation)
            }

            const [updatedField] = await ctx.db
                .update(formFields)
                .set(updateFields)
                .where(eq(formFields.id, fieldId))
                .returning()

            return updatedField
        }),

    // Delete field
    deleteField: protectedProcedure
        .input(z.object({ fieldId: z.number() }))
        .mutation(async ({ ctx, input }) => {
            await ctx.db
                .delete(formFields)
                .where(eq(formFields.id, input.fieldId))
            return { success: true }
        }),

    // Reorder fields
    reorderFields: protectedProcedure
        .input(
            z.object({
                formId: z.number(),
                fieldOrders: z.array(
                    z.object({
                        fieldId: z.number(),
                        order: z.number(),
                    })
                ),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Update each field's order
            for (const { fieldId, order } of input.fieldOrders) {
                await ctx.db
                    .update(formFields)
                    .set({ order, updatedAt: new Date() })
                    .where(eq(formFields.id, fieldId))
            }

            return { success: true }
        }),

    // Submit form response
    submit: publicProcedure
        .input(
            z.object({
                formId: z.number(),
                responses: z.array(
                    z.object({
                        fieldId: z.number(),
                        value: z.any(), // Can be string, number, array, etc.
                    })
                ),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { userId } = ctx.auth!

            // Check if form exists and is accepting responses
            const form = await ctx.db.query.forms.findFirst({
                where: eq(forms.fileId, input.formId),
                with: { fields: true },
            })

            if (!form) {
                throw new Error('Form not found')
            }

            if (!form.acceptingResponses) {
                throw new Error('Form is not accepting responses')
            }

            // Check if one response per user is enabled and user already submitted
            if (form.oneResponsePerUser && userId) {
                const existingSubmission =
                    await ctx.db.query.formSubmissions.findFirst({
                        where: and(
                            eq(formSubmissions.formFileId, input.formId),
                            eq(formSubmissions.userId, userId)
                        ),
                    })

                if (existingSubmission) {
                    throw new Error(
                        'You have already submitted a response to this form'
                    )
                }
            }

            // Create submission record
            const [submission] = await ctx.db
                .insert(formSubmissions)
                .values({
                    formFileId: input.formId,
                    userId: userId || null,
                    ipAddress: null, // TODO: Get from request
                    userAgent: null, // TODO: Get from request
                })
                .returning()

            if (!submission) {
                throw new Error('Failed to create submission')
            }

            // Create response records for each field
            for (const response of input.responses) {
                const field = form.fields.find((f) => f.id === response.fieldId)
                if (!field) continue

                // Convert value to appropriate formats for storage
                let textValue: string | null = null
                let numericValue: string | null = null
                let dateValue: Date | null = null

                if (response.value !== null && response.value !== undefined) {
                    // Store as text
                    textValue = Array.isArray(response.value)
                        ? response.value.join(', ')
                        : String(response.value)

                    // Store as numeric if it's a number field
                    if (
                        field.type === 'number' &&
                        !isNaN(Number(response.value))
                    ) {
                        numericValue = String(response.value)
                    }

                    // Store as date if it's a date field
                    if (field.type === 'date' && response.value) {
                        const date = new Date(response.value)
                        if (!isNaN(date.getTime())) {
                            dateValue = date
                        }
                    }
                }

                await ctx.db.insert(formResponses).values({
                    submissionId: submission.id,
                    fieldId: response.fieldId,
                    value: JSON.stringify(response.value),
                    textValue,
                    numericValue,
                    dateValue,
                })
            }

            // Trigger sync to all active synced sheets for this form
            try {
                await ctx.db.transaction(async (tx) => {
                    // Find all active synced sheets for this form
                    const syncedSheets = await tx.query.formSheetSyncs.findMany(
                        {
                            where: and(
                                eq(formSheetSyncs.formFileId, input.formId),
                                eq(formSheetSyncs.isActive, true)
                            ),
                            with: {
                                sheet: {
                                    with: {
                                        sheetContent: true,
                                    },
                                },
                            },
                        }
                    )

                    if (syncedSheets.length > 0) {
                        // Get form with latest submissions (including the one we just created)
                        const formWithSubmissions =
                            await tx.query.forms.findFirst({
                                where: eq(forms.fileId, input.formId),
                                with: {
                                    fields: {
                                        orderBy: asc(formFields.order),
                                    },
                                    submissions: {
                                        with: {
                                            responses: {
                                                with: {
                                                    field: true,
                                                },
                                            },
                                            user: {
                                                columns: {
                                                    id: true,
                                                    name: true,
                                                    email: true,
                                                },
                                            },
                                        },
                                        orderBy: desc(
                                            formSubmissions.createdAt
                                        ),
                                    },
                                },
                            })

                        if (formWithSubmissions) {
                            // Update each synced sheet
                            for (const sync of syncedSheets) {
                                // Use the utility function to create properly formatted sheet data
                                const sheetData = createSyncedSheetData(
                                    formWithSubmissions.submissions,
                                    formWithSubmissions.fields
                                )

                                // Update the existing schema to maintain metadata
                                const currentSchema = sync.sheet.sheetContent
                                    ? JSON.parse(
                                          sync.sheet.sheetContent.schema || '{}'
                                      )
                                    : {}

                                const updatedSchema = {
                                    ...currentSchema,
                                    syncMetadata: {
                                        ...currentSchema.syncMetadata,
                                        lastSyncAt: new Date().toISOString(),
                                    },
                                }

                                // Update sheet content
                                await tx
                                    .update(sheetContent)
                                    .set({
                                        content: JSON.stringify(sheetData),
                                        schema: JSON.stringify(updatedSchema),
                                        updatedAt: new Date(),
                                    })
                                    .where(
                                        eq(sheetContent.fileId, sync.sheetId)
                                    )

                                // Update sync timestamp
                                await tx
                                    .update(formSheetSyncs)
                                    .set({ lastSyncAt: new Date() })
                                    .where(eq(formSheetSyncs.id, sync.id))
                            }
                        }
                    }
                })
            } catch (error) {
                // Log error but don't fail the submission
                console.error('Error syncing to sheets:', error)
            }

            return { submissionId: submission.id }
        }),

    // Get form submissions (for form owners)
    getSubmissions: protectedProcedure
        .input(
            z.object({
                formId: z.number(),
                limit: z.number().min(1).max(100).default(50),
                offset: z.number().min(0).default(0),
            })
        )
        .query(async ({ ctx, input }) => {
            const submissions = await ctx.db.query.formSubmissions.findMany({
                where: eq(formSubmissions.formFileId, input.formId),
                with: {
                    responses: {
                        with: {
                            field: true,
                        },
                    },
                    user: {
                        columns: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
                orderBy: desc(formSubmissions.createdAt),
                limit: input.limit,
                offset: input.offset,
            })

            // Parse response values
            const submissionsWithParsedResponses = submissions.map(
                (submission) => ({
                    ...submission,
                    responses: submission.responses.map((response) => ({
                        ...response,
                        value: response.value
                            ? JSON.parse(response.value)
                            : null,
                    })),
                })
            )

            return submissionsWithParsedResponses
        }),

    // Sync form submissions to sheet (replaces exportToSheet)
    syncToSheet: protectedProcedure
        .input(
            z.object({
                formId: z.number(),
                sheetName: z.string().min(1),
                parentId: z.number().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { userId } = ctx.auth

            // Check if form already has an active sync
            const existingSync = await ctx.db.query.formSheetSyncs.findFirst({
                where: and(
                    eq(formSheetSyncs.formFileId, input.formId),
                    eq(formSheetSyncs.isActive, true)
                ),
                with: {
                    sheet: true,
                },
            })

            if (existingSync) {
                throw new Error(
                    `Form is already synced to sheet: ${existingSync.sheet.name}`
                )
            }

            // Get form with fields and submissions
            const form = await ctx.db.query.forms.findFirst({
                where: eq(forms.fileId, input.formId),
                with: {
                    fields: {
                        orderBy: asc(formFields.order),
                    },
                    submissions: {
                        with: {
                            responses: {
                                with: {
                                    field: true,
                                },
                            },
                            user: {
                                columns: {
                                    id: true,
                                    name: true,
                                    email: true,
                                },
                            },
                        },
                        orderBy: desc(formSubmissions.createdAt),
                    },
                },
            })

            if (!form) {
                throw new Error('Form not found')
            }

            // Create sheet file
            const [sheetFile] = await ctx.db
                .insert(files)
                .values({
                    name: input.sheetName,
                    type: FILE_TYPES.SHEET,
                    parentId: input.parentId || null,
                    slug: input.sheetName
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-'),
                    order: 0,
                    isPublic: false,
                    createdBy: userId,
                    updatedBy: userId,
                })
                .returning()

            if (!sheetFile) {
                throw new Error('Failed to create sheet file')
            }

            // Use the utility function to create properly formatted sheet data
            const sheetData = createSyncedSheetData(
                form.submissions,
                form.fields
            )

            // Generate schema with form data column metadata
            const formDataColumnCount = form.fields.length // Only form fields, no system columns
            const schema = {
                formDataColumnCount,
                syncMetadata: {
                    formId: input.formId,
                    isLiveSync: true,
                    lastSyncAt: new Date().toISOString(),
                },
            }

            // Create sheet content
            await ctx.db.insert(sheetContent).values({
                fileId: sheetFile.id,
                content: JSON.stringify(sheetData),
                schema: JSON.stringify(schema),
                version: 1,
            })

            // Create sync relationship
            await ctx.db.insert(formSheetSyncs).values({
                formFileId: input.formId,
                sheetId: sheetFile.id,
                isActive: true,
                lastSyncAt: new Date(),
            })

            return {
                sheetFile,
                totalSubmissions: form.submissions.length,
                isLiveSync: true,
            }
        }),

    // Update synced sheets when new form submission is added
    updateSyncedSheets: protectedProcedure
        .input(z.object({ formId: z.number() }))
        .mutation(async ({ ctx, input }) => {
            // Find all active synced sheets for this form
            const syncedSheets = await ctx.db.query.formSheetSyncs.findMany({
                where: and(
                    eq(formSheetSyncs.formFileId, input.formId),
                    eq(formSheetSyncs.isActive, true)
                ),
                with: {
                    sheet: {
                        with: {
                            sheetContent: true,
                        },
                    },
                },
            })

            if (syncedSheets.length === 0) {
                return { updatedSheets: 0 }
            }

            // Get form with latest submissions
            const form = await ctx.db.query.forms.findFirst({
                where: eq(forms.fileId, input.formId),
                with: {
                    fields: {
                        orderBy: asc(formFields.order),
                    },
                    submissions: {
                        with: {
                            responses: {
                                with: {
                                    field: true,
                                },
                            },
                            user: {
                                columns: {
                                    id: true,
                                    name: true,
                                    email: true,
                                },
                            },
                        },
                        orderBy: desc(formSubmissions.createdAt),
                    },
                },
            })

            if (!form) {
                throw new Error('Form not found')
            }

            // Update each synced sheet
            for (const sync of syncedSheets) {
                // Use the utility function to create properly formatted sheet data
                const sheetData = createSyncedSheetData(
                    form.submissions,
                    form.fields
                )

                // Update the existing schema to maintain metadata
                const currentSchema = sync.sheet.sheetContent
                    ? JSON.parse(sync.sheet.sheetContent.schema || '{}')
                    : {}

                const updatedSchema = {
                    ...currentSchema,
                    syncMetadata: {
                        ...currentSchema.syncMetadata,
                        lastSyncAt: new Date().toISOString(),
                    },
                }

                // Update sheet content
                await ctx.db
                    .update(sheetContent)
                    .set({
                        content: JSON.stringify(sheetData),
                        schema: JSON.stringify(updatedSchema),
                        updatedAt: new Date(),
                    })
                    .where(eq(sheetContent.fileId, sync.sheetId))

                // Update sync timestamp
                await ctx.db
                    .update(formSheetSyncs)
                    .set({ lastSyncAt: new Date() })
                    .where(eq(formSheetSyncs.id, sync.id))
            }

            return { updatedSheets: syncedSheets.length }
        }),

    // Get form statistics
    getStatistics: protectedProcedure
        .input(z.object({ formId: z.number() }))
        .query(async ({ ctx, input }) => {
            // Get total submissions
            const totalSubmissions = await ctx.db
                .select({ count: sql<number>`COUNT(*)` })
                .from(formSubmissions)
                .where(eq(formSubmissions.formFileId, input.formId))

            // Get submissions by date (last 30 days)
            const submissionsByDate = await ctx.db
                .select({
                    date: sql<string>`DATE(${formSubmissions.createdAt})`,
                    count: sql<number>`COUNT(*)`,
                })
                .from(formSubmissions)
                .where(
                    and(
                        eq(formSubmissions.formFileId, input.formId),
                        sql`${formSubmissions.createdAt} >= NOW() - INTERVAL '30 days'`
                    )
                )
                .groupBy(sql`DATE(${formSubmissions.createdAt})`)
                .orderBy(sql`DATE(${formSubmissions.createdAt})`)

            return {
                totalSubmissions: totalSubmissions[0]?.count ?? 0,
                submissionsByDate,
            }
        }),

    // Get sync status for a form
    getSyncStatus: protectedProcedure
        .input(z.object({ formId: z.number() }))
        .query(async ({ ctx, input }) => {
            const syncedSheets = await ctx.db.query.formSheetSyncs.findMany({
                where: and(
                    eq(formSheetSyncs.formFileId, input.formId),
                    eq(formSheetSyncs.isActive, true)
                ),
                with: {
                    sheet: {
                        columns: {
                            id: true,
                            name: true,
                        },
                    },
                },
            })

            return {
                isSync: syncedSheets.length > 0,
                syncedSheets: syncedSheets.map((sync) => ({
                    id: sync.id,
                    sheetId: sync.sheetId,
                    sheetName: sync.sheet.name,
                    lastSyncAt: sync.lastSyncAt,
                    isActive: sync.isActive,
                })),
            }
        }),

    // Disable sync for a form-sheet relationship
    disableSync: protectedProcedure
        .input(z.object({ syncId: z.number() }))
        .mutation(async ({ ctx, input }) => {
            await ctx.db
                .update(formSheetSyncs)
                .set({
                    isActive: false,
                    updatedAt: new Date(),
                })
                .where(eq(formSheetSyncs.id, input.syncId))

            return { success: true }
        }),

    // Get sync metadata for a sheet
    getSyncMetadataBySheetId: publicProcedure
        .input(z.object({ sheetId: z.number() }))
        .query(async ({ ctx, input }) => {
            const syncRelation = await ctx.db.query.formSheetSyncs.findFirst({
                where: and(
                    eq(formSheetSyncs.sheetId, input.sheetId),
                    eq(formSheetSyncs.isActive, true)
                ),
                with: {
                    form: {
                        with: {
                            fields: {
                                orderBy: [asc(formFields.order)],
                            },
                        },
                    },
                },
            })

            if (!syncRelation) {
                return null
            }

            // Calculate form data column count (only form field columns)
            const formDataColumnCount = syncRelation.form.fields.length // Only form fields

            return {
                formId: syncRelation.formFileId,
                isLiveSync: syncRelation.isActive,
                formDataColumnCount,
                lastSyncAt:
                    syncRelation.lastSyncAt?.toISOString() ||
                    new Date().toISOString(),
            }
        }),
})
