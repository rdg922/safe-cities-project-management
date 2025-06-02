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
    FILE_TYPES,
    FORM_FIELD_TYPES,
    formFieldTypeSchema,
    type FormField,
} from '~/server/db/schema'

// Validation schemas for form field options and validation rules
const fieldOptionsSchema = z.array(
    z.object({
        value: z.string(),
        label: z.string(),
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

            return { file, form }
        }),

    // Get form by file ID
    getByFileId: publicProcedure
        .input(z.object({ fileId: z.number() }))
        .query(async ({ ctx, input }) => {
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
                throw new Error('Form not found')
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
                formId: z.number(),
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
                .where(eq(forms.id, formId))
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
                .where(eq(formFields.formId, input.formId))

            const nextOrder = (maxOrderResult[0]?.maxOrder ?? -1) + 1

            const [field] = await ctx.db
                .insert(formFields)
                .values({
                    formId: input.formId,
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
                submitterEmail: z.string().email().optional(),
                submitterName: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { userId } = ctx.auth!

            // Check if form exists and is accepting responses
            const form = await ctx.db.query.forms.findFirst({
                where: eq(forms.id, input.formId),
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
                            eq(formSubmissions.formId, input.formId),
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
                    formId: input.formId,
                    userId: userId || null,
                    submitterEmail: input.submitterEmail || null,
                    submitterName: input.submitterName || null,
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
                where: eq(formSubmissions.formId, input.formId),
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

    // Export form submissions to sheet
    exportToSheet: protectedProcedure
        .input(
            z.object({
                formId: z.number(),
                sheetName: z.string().min(1),
                parentId: z.number().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { userId } = ctx.auth

            // Get form with fields and submissions
            const form = await ctx.db.query.forms.findFirst({
                where: eq(forms.id, input.formId),
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

            // Prepare sheet data
            const headers = [
                'Submission ID',
                'Submitted At',
                'Submitter Name',
                'Submitter Email',
                ...form.fields.map((field) => field.label),
            ]

            const rows = form.submissions.map((submission) => {
                const row = [
                    submission.id.toString(),
                    submission.createdAt.toISOString(),
                    submission.user?.name || submission.submitterName || '',
                    submission.user?.email || submission.submitterEmail || '',
                ]

                // Add response values for each field
                for (const field of form.fields) {
                    const response = submission.responses.find(
                        (r) => r.fieldId === field.id
                    )
                    if (response) {
                        const value = response.value
                            ? JSON.parse(response.value)
                            : ''
                        row.push(
                            Array.isArray(value)
                                ? value.join(', ')
                                : String(value)
                        )
                    } else {
                        row.push('')
                    }
                }

                return row
            })

            const sheetData = [headers, ...rows]

            // Create sheet content
            await ctx.db.insert(sheetContent).values({
                fileId: sheetFile.id,
                content: JSON.stringify(sheetData),
                schema: JSON.stringify({
                    columns: headers.map((header, index) => ({
                        id: index,
                        label: header,
                        type: 'text',
                    })),
                }),
                version: 1,
            })

            return { sheetFile, totalSubmissions: form.submissions.length }
        }),

    // Get form statistics
    getStatistics: protectedProcedure
        .input(z.object({ formId: z.number() }))
        .query(async ({ ctx, input }) => {
            // Get total submissions
            const totalSubmissions = await ctx.db
                .select({ count: sql<number>`COUNT(*)` })
                .from(formSubmissions)
                .where(eq(formSubmissions.formId, input.formId))

            // Get submissions by date (last 30 days)
            const submissionsByDate = await ctx.db
                .select({
                    date: sql<string>`DATE(${formSubmissions.createdAt})`,
                    count: sql<number>`COUNT(*)`,
                })
                .from(formSubmissions)
                .where(
                    and(
                        eq(formSubmissions.formId, input.formId),
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
})
