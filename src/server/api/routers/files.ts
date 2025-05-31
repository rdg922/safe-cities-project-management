import { eq, sql, desc, asc, ne } from 'drizzle-orm'
import { z } from 'zod'

import {
    createTRPCRouter,
    publicProcedure,
    protectedProcedure,
} from '~/server/api/trpc'
import {
    files,
    pageContent,
    sheetContent,
    FILE_TYPES,
    type FileType,
    users,
    filePermissions,
    notifications,
} from '~/server/db/schema'

export const filesRouter = createTRPCRouter({
    // Create a new file (page, sheet, or folder)
    create: protectedProcedure
        .input(
            z.object({
                name: z.string().min(1),
                type: z.enum([
                    FILE_TYPES.PAGE,
                    FILE_TYPES.SHEET,
                    FILE_TYPES.FOLDER,
                ]),
                parentId: z.number().optional(),
                slug: z.string().optional(),
                order: z.number().default(0),
                isPublic: z.boolean().default(false),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { userId } = ctx.auth

            // Create the file record
            const [file] = await ctx.db
                .insert(files)
                .values({
                    name: input.name,
                    type: input.type,
                    parentId: input.parentId || null,
                    slug: input.slug || null,
                    order: input.order,
                    isPublic: input.isPublic,
                    createdBy: userId,
                    updatedBy: userId,
                })
                .returning()

            // If it's a page, create the page content
            if (input.type === FILE_TYPES.PAGE && file) {
                await ctx.db.insert(pageContent).values({
                    fileId: file.id,
                    content: `# ${input.name}`,
                    version: 1,
                })
            }

            // If it's a sheet, create the sheet content
            if (input.type === FILE_TYPES.SHEET && file) {
                await ctx.db.insert(sheetContent).values({
                    fileId: file.id,
                    content: '[]', // Empty sheet data
                    schema: null,
                    version: 1,
                })
            }

            return file
        }),

    // Get file tree structure
    getFileTree: publicProcedure.query(async ({ ctx }) => {
        const allFiles = await ctx.db.query.files.findMany({
            orderBy: [asc(files.order), asc(files.name)],
        })

        // Convert flat list to tree structure
        const buildFileTree = (parentId: number | null = null): any[] => {
            return allFiles
                .filter((file) => file.parentId === parentId)
                .map((file) => ({
                    ...file,
                    isFolder: file.type === FILE_TYPES.FOLDER,
                    filename: file.name, // For compatibility with existing FileTree component
                    children: buildFileTree(file.id),
                }))
                .sort((a, b) => {
                    // Sort folders first, then alphabetically
                    if (a.isFolder && !b.isFolder) return -1
                    if (!a.isFolder && b.isFolder) return 1
                    return a.name.localeCompare(b.name)
                })
        }

        return buildFileTree(null)
    }),

    // Get filtered file tree structure based on user permissions
    getFilteredFileTree: protectedProcedure.query(async ({ ctx }) => {
        const { userId } = ctx.auth

        // Get all files
        const allFiles = await ctx.db.query.files.findMany({
            orderBy: [asc(files.order), asc(files.name)],
        })

        // Get files user has access to
        const accessibleFileIds = new Set<number>()

        // Check if user is admin
        const user = await ctx.db.query.users.findFirst({
            where: eq(users.id, userId),
        })

        if (user?.role === 'admin') {
            // Admins can see all files
            allFiles.forEach((file) => accessibleFileIds.add(file.id))
        } else {
            // Get direct permissions for this user
            const directPermissions =
                await ctx.db.query.filePermissions.findMany({
                    where: eq(filePermissions.userId, userId),
                    columns: { fileId: true },
                })

            // Add files with direct permissions and their descendants
            for (const permission of directPermissions) {
                accessibleFileIds.add(permission.fileId)

                // Add all descendants of this file
                const addDescendants = (parentId: number) => {
                    allFiles
                        .filter((file) => file.parentId === parentId)
                        .forEach((child) => {
                            accessibleFileIds.add(child.id)
                            addDescendants(child.id)
                        })
                }
                addDescendants(permission.fileId)
            }

            // Add ancestor folders for accessible files (so users can see the path)
            const filesToCheck = Array.from(accessibleFileIds)
            for (const fileId of filesToCheck) {
                const file = allFiles.find((f) => f.id === fileId)
                if (file && file.parentId) {
                    let currentParentId: number | null = file.parentId
                    while (currentParentId) {
                        accessibleFileIds.add(currentParentId)
                        const parent = allFiles.find(
                            (f) => f.id === currentParentId
                        )
                        currentParentId = parent?.parentId ?? null
                    }
                }
            }
        }

        // Filter files to only include accessible ones
        const filteredFiles = allFiles.filter((file) =>
            accessibleFileIds.has(file.id)
        )

        // Convert flat list to tree structure
        const buildFileTree = (parentId: number | null = null): any[] => {
            return filteredFiles
                .filter((file) => file.parentId === parentId)
                .map((file) => ({
                    ...file,
                    isFolder: file.type === FILE_TYPES.FOLDER,
                    filename: file.name, // For compatibility with existing FileTree component
                    children: buildFileTree(file.id),
                }))
                .sort((a, b) => {
                    // Sort folders first, then alphabetically
                    if (a.isFolder && !b.isFolder) return -1
                    if (!a.isFolder && b.isFolder) return 1
                    return a.name.localeCompare(b.name)
                })
        }

        return buildFileTree(null)
    }),

    // Get a specific file by ID
    getById: publicProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ ctx, input }) => {
            const file = await ctx.db.query.files.findFirst({
                where: eq(files.id, input.id),
            })

            if (!file) {
                return null
            }

            let content = null

            // Get content based on file type
            if (file.type === FILE_TYPES.PAGE) {
                const pageData = await ctx.db.query.pageContent.findFirst({
                    where: eq(pageContent.fileId, file.id),
                })
                content = pageData
            } else if (file.type === FILE_TYPES.SHEET) {
                const sheetData = await ctx.db.query.sheetContent.findFirst({
                    where: eq(sheetContent.fileId, file.id),
                })
                content = sheetData
            }

            return {
                ...file,
                content,
            }
        }),

    // Update file metadata (name, parent, order, etc.)
    update: protectedProcedure
        .input(
            z.object({
                id: z.number(),
                name: z.string().optional(),
                parentId: z.number().nullable().optional(),
                slug: z.string().optional(),
                order: z.number().optional(),
                isPublic: z.boolean().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { id, ...updateData } = input
            const { userId } = ctx.auth

            const updateValues = {
                ...updateData,
                updatedBy: userId,
            }

            await ctx.db.update(files).set(updateValues).where(eq(files.id, id))
            return { success: true }
        }),

    // Update page content
    updatePageContent: protectedProcedure
        .input(
            z.object({
                fileId: z.number(),
                content: z.string(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { userId } = ctx.auth

            // Update the page content
            await ctx.db
                .update(pageContent)
                .set({
                    content: input.content,
                    updatedAt: new Date(),
                })
                .where(eq(pageContent.fileId, input.fileId))

            // Update the file's updatedAt timestamp
            await ctx.db
                .update(files)
                .set({
                    updatedAt: new Date(),
                    updatedBy: userId,
                })
                .where(eq(files.id, input.fileId))

            // Get file info for notification
            const file = await ctx.db.query.files.findFirst({
                where: eq(files.id, input.fileId),
                columns: { name: true },
            })

            // Get current user info for notifications
            const currentUser = await ctx.db.query.users.findFirst({
                where: eq(users.id, userId),
                columns: { name: true },
            })

            if (file && currentUser) {
                // Find users who have permission to view this file and should be notified of edits
                const usersWithAccess = await ctx.db
                    .select({
                        userId: filePermissions.userId,
                    })
                    .from(filePermissions)
                    .where(eq(filePermissions.fileId, input.fileId))

                // Create edit notifications for users with access (excluding the editor)
                if (usersWithAccess.length > 0) {
                    await ctx.db.insert(notifications).values(
                        usersWithAccess
                            .filter((user) => user.userId !== userId) // Don't notify self
                            .map((user) => ({
                                userId: user.userId,
                                pageId: input.fileId,
                                content: `${currentUser.name} edited the page "${file.name}"`,
                                type: 'edit',
                                read: false,
                                createdAt: new Date(),
                                updatedAt: new Date(),
                            }))
                    )
                }
            }

            return { success: true }
        }),

    // Update sheet content
    updateSheetContent: protectedProcedure
        .input(
            z.object({
                fileId: z.number(),
                content: z.string(),
                schema: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { userId } = ctx.auth

            // Update the sheet content
            await ctx.db
                .update(sheetContent)
                .set({
                    content: input.content,
                    schema: input.schema,
                    updatedAt: new Date(),
                })
                .where(eq(sheetContent.fileId, input.fileId))

            // Update the file's updatedAt timestamp
            await ctx.db
                .update(files)
                .set({
                    updatedAt: new Date(),
                    updatedBy: userId,
                })
                .where(eq(files.id, input.fileId))

            // Get file info for notification
            const file = await ctx.db.query.files.findFirst({
                where: eq(files.id, input.fileId),
                columns: { name: true },
            })

            // Get current user info for notifications
            const currentUser = await ctx.db.query.users.findFirst({
                where: eq(users.id, userId),
                columns: { name: true },
            })

            if (file && currentUser) {
                // Find users who have permission to view this file and should be notified of edits
                const usersWithAccess = await ctx.db
                    .select({
                        userId: filePermissions.userId,
                    })
                    .from(filePermissions)
                    .where(eq(filePermissions.fileId, input.fileId))

                // Create edit notifications for users with access (excluding the editor)
                if (usersWithAccess.length > 0) {
                    await ctx.db.insert(notifications).values(
                        usersWithAccess
                            .filter((user) => user.userId !== userId) // Don't notify self
                            .map((user) => ({
                                userId: user.userId,
                                pageId: input.fileId,
                                content: `${currentUser.name} edited the sheet "${file.name}"`,
                                type: 'edit',
                                read: false,
                                createdAt: new Date(),
                                updatedAt: new Date(),
                            }))
                    )
                }
            }

            return { success: true }
        }),

    // Delete a file
    delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
            // Due to cascade delete, this will also delete associated content
            await ctx.db.delete(files).where(eq(files.id, input.id))
            return { success: true }
        }),

    // Get all files of a specific type
    getByType: publicProcedure
        .input(
            z.object({
                type: z.enum([
                    FILE_TYPES.PAGE,
                    FILE_TYPES.SHEET,
                    FILE_TYPES.FOLDER,
                ]),
            })
        )
        .query(async ({ ctx, input }) => {
            return await ctx.db.query.files.findMany({
                where: eq(files.type, input.type),
                orderBy: [desc(files.createdAt)],
            })
        }),

    // Move files (for drag and drop reordering)
    move: protectedProcedure
        .input(
            z.object({
                fileId: z.number(),
                targetParentId: z.number().nullable(),
                newOrder: z.number().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { userId } = ctx.auth

            await ctx.db
                .update(files)
                .set({
                    parentId: input.targetParentId,
                    order: input.newOrder ?? 0,
                    updatedBy: userId,
                })
                .where(eq(files.id, input.fileId))

            return { success: true }
        }),
})
