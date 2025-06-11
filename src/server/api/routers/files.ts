import { eq, sql, desc, asc, ne, and, isNotNull, inArray } from 'drizzle-orm'
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
    forms,
    formFields,
    FILE_TYPES,
    type FileType,
    users,
    filePermissions,
    effectivePermissions,
    notifications,
} from '~/server/db/schema'
import {
    getUserPermissionContext,
    getAccessibleFiles,
    getUsersWithFileAccess,
} from '~/lib/permissions-simple'
import { rebuildEffectivePermissionsForUser, getFileDescendantsFast } from '~/lib/permissions-optimized'
import { TRPCError } from '@trpc/server'

export const filesRouter = createTRPCRouter({
    // Create a new file (page, sheet, folder, form, or upload)
    create: protectedProcedure
        .input(
            z.object({
                name: z.string().min(1).max(25),
                type: z.enum([
                    FILE_TYPES.PAGE,
                    FILE_TYPES.SHEET,
                    FILE_TYPES.FOLDER,
                    FILE_TYPES.FORM,
                    FILE_TYPES.UPLOAD,
                    FILE_TYPES.PROGRAMME,
                ]),
                parentId: z.number().optional(),
                slug: z.string().optional(),
                order: z.number().default(0),
                isPublic: z.boolean().default(false),
                // For uploads, accept path and mimetype (not required for others)
                path: z.string().optional(),
                mimetype: z.string().optional(),
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
                    // Save path and mimetype for uploads
                    path:
                        input.type === FILE_TYPES.UPLOAD
                            ? input.path || null
                            : null,
                    mimetype:
                        input.type === FILE_TYPES.UPLOAD
                            ? input.mimetype || null
                            : null,
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

            // If it's a form, create the form record
            if (input.type === FILE_TYPES.FORM && file) {
                await ctx.db.insert(forms).values({
                    fileId: file.id,
                    title: input.name,
                    description: null,
                    isPublished: false,
                    allowAnonymous: true,
                    requireLogin: false,
                    acceptingResponses: true,
                    showProgressBar: true,
                    shuffleQuestions: false,
                    oneResponsePerUser: false,
                    version: 1,
                })

                // Add default name and email fields when creating a new form
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
            }

            // Rebuild effective permissions for users who have access to the parent folder
            // This ensures that inherited permissions are properly calculated for the new file
            if (file && input.parentId) {
                try {
                    // Get all users who have permissions on the parent folder
                    const parentPermissions =
                        await ctx.db.query.effectivePermissions.findMany({
                            where: eq(
                                effectivePermissions.fileId,
                                input.parentId
                            ),
                            columns: { userId: true },
                        })

                    const uniqueUserIds = [
                        ...new Set(parentPermissions.map((p) => p.userId)),
                    ]

                    // Rebuild effective permissions for each user to include the new file
                    for (const userId of uniqueUserIds) {
                        await rebuildEffectivePermissionsForUser(userId)
                    }
                } catch (error) {
                    console.error(
                        'Error rebuilding effective permissions for new file:',
                        error
                    )
                    // Don't fail the file creation if permission cache update fails
                }
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
                    isFolder:
                        file.type === FILE_TYPES.FOLDER ||
                        file.type === FILE_TYPES.PROGRAMME,
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

        // Get all files once and user permission context
        const [allFiles, permissionContext] = await Promise.all([
            ctx.db.query.files.findMany({
                orderBy: [asc(files.order), asc(files.name)],
                columns: {
                    id: true,
                    name: true,
                    type: true,
                    parentId: true,
                    order: true,
                    path: true,
                    mimetype: true,
                },
            }),
            getUserPermissionContext(userId),
        ])

        // Get accessible files using optimized permission context
        const accessibleFileIds = await getAccessibleFiles(
            permissionContext,
            allFiles
        )

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
                    isFolder:
                        file.type === FILE_TYPES.FOLDER ||
                        file.type === FILE_TYPES.PROGRAMME,
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
            // For uploads, content is not needed; just metadata
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
                // Allow updating upload metadata if needed
                path: z.string().optional(),
                mimetype: z.string().optional(),
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

            // Optimized notification query - get file and user info in parallel
            const [file, currentUser, usersWithAccessIds] = await Promise.all([
                ctx.db.query.files.findFirst({
                    where: eq(files.id, input.fileId),
                    columns: { name: true },
                }),
                ctx.db.query.users.findFirst({
                    where: eq(users.id, userId),
                    columns: { name: true },
                }),
                // Use optimized function for faster lookup
                getUsersWithFileAccess(input.fileId),
            ])

            if (file && currentUser && usersWithAccessIds.length > 0) {
                // Create edit notifications for users with access (excluding the editor)
                const notificationsToInsert = usersWithAccessIds
                    .filter((accessUserId) => accessUserId !== userId)
                    .map((accessUserId) => ({
                        userId: accessUserId,
                        pageId: input.fileId,
                        content: `${currentUser.name} edited the page "${file.name}"`,
                        type: 'edit',
                        read: false,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    }))

                if (notificationsToInsert.length > 0) {
                    await ctx.db
                        .insert(notifications)
                        .values(notificationsToInsert)
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

            // Optimized notification query - get file and user info in parallel
            const [file, currentUser, usersWithAccessIds] = await Promise.all([
                ctx.db.query.files.findFirst({
                    where: eq(files.id, input.fileId),
                    columns: { name: true },
                }),
                ctx.db.query.users.findFirst({
                    where: eq(users.id, userId),
                    columns: { name: true },
                }),
                // Use optimized function for faster lookup
                getUsersWithFileAccess(input.fileId),
            ])

            if (file && currentUser && usersWithAccessIds.length > 0) {
                // Create edit notifications for users with access (excluding the editor)
                const notificationsToInsert = usersWithAccessIds
                    .filter((accessUserId) => accessUserId !== userId)
                    .map((accessUserId) => ({
                        userId: accessUserId,
                        pageId: input.fileId,
                        content: `${currentUser.name} edited the sheet "${file.name}"`,
                        type: 'edit',
                        read: false,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    }))

                if (notificationsToInsert.length > 0) {
                    await ctx.db
                        .insert(notifications)
                        .values(notificationsToInsert)
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
                    FILE_TYPES.UPLOAD,
                    FILE_TYPES.PROGRAMME,
                ]),
            })
        )
        .query(async ({ ctx, input }) => {
            return await ctx.db.query.files.findMany({
                where: eq(files.type, input.type),
                orderBy: [desc(files.createdAt)],
            })
        }),

    // Get all files created in the last 30 days
    getPagesCreatedInLast30Days: publicProcedure.query(async ({ ctx }) => {
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const count = await ctx.db
            .select({ count: sql<number>`COUNT(*)` })
            .from(files)
            .where(
                and(
                    eq(files.type, FILE_TYPES.PAGE),
                    sql`${files.createdAt} >= ${thirtyDaysAgo}`
                )
            )
        return count[0]?.count
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

            // Note: Simple permissions approach doesn't require cache invalidation
            // as permissions are computed on-demand from the database

            return { success: true }
        }),

    // Get child counts for multiple parent IDs
    getChildCountsForParents: protectedProcedure
        .input(z.object({ parentIds: z.array(z.number()) }))
        .query(async ({ ctx, input }) => {
            // Get child counts for all parent IDs in a single query
            const childCounts = await ctx.db
                .select({
                    parentId: files.parentId,
                    count: sql<number>`COUNT(*)`,
                })
                .from(files)
                .where(
                    and(
                        isNotNull(files.parentId),
                        inArray(files.parentId, input.parentIds)
                    )
                )
                .groupBy(files.parentId)

            // Convert the results to a map for easy lookup
            const countMap = new Map(
                childCounts.map(({ parentId, count }) => [parentId, count])
            )

            // Return an object with counts for each parent ID
            return input.parentIds.reduce(
                (acc, parentId) => {
                    acc[parentId] = countMap.get(parentId) ?? 0
                    return acc
                },
                {} as Record<number, number>
            )
        }),

    // Get most recent update times for multiple programs and their descendants
    getProgramUpdateTimes: publicProcedure
        .input(z.object({ programIds: z.array(z.number()) }))
        .query(async ({ ctx, input }) => {
            const updateTimes: Record<number, Date | null> = {}
            
            for (const programId of input.programIds) {
                // Get all descendants of the program
                const descendants = await getFileDescendantsFast(programId)
                
                // Get the most recently updated file from the program and all its descendants
                const result = await ctx.db
                    .select({ 
                        updatedAt: files.updatedAt
                    })
                    .from(files)
                    .where(
                        inArray(
                            files.id,
                            [programId, ...descendants]
                        )
                    )
                    .orderBy(sql`"updatedAt" DESC`)
                    .limit(1)
                
                // Convert the timestamp to a proper Date object
                updateTimes[programId] = result[0]?.updatedAt ? new Date(result[0].updatedAt) : null
            }
            
            return updateTimes
        }),

    getProgramsWithDetails: protectedProcedure
        .input(z.object({
            type: z.enum([
                FILE_TYPES.PAGE,
                FILE_TYPES.SHEET,
                FILE_TYPES.FOLDER,
                FILE_TYPES.UPLOAD,
                FILE_TYPES.PROGRAMME,
            ]),
        }))
        .query(async ({ ctx, input }) => {
            const { userId } = ctx.auth;

            // Get all programs in one query
            const allPrograms = await ctx.db.query.files.findMany({
                where: eq(files.type, input.type),
                orderBy: [desc(files.createdAt)],
            });

            // Get user's permission context
            const permissionContext = await getUserPermissionContext(userId);

            // Get accessible files using optimized permission context
            const accessibleFileIds = await getAccessibleFiles(
                permissionContext,
                allPrograms
            );

            // Filter programs to only include accessible ones
            const programs = allPrograms.filter(program => 
                accessibleFileIds.has(program.id)
            );

            // gets a list of program ids from the respective program objects
            const programIds = programs.map((program) => program.id);

            // get all descendants for all programs in one query
            // maps each program id to a list of its
            const allDescendants = await Promise.all(
                programIds.map(id => getFileDescendantsFast(id))
            );
            
            // maps each progam Id to the corresponding list of file ids
            // the map creates a list with each entry like this [1, [1, ...allDescendants[index]]]
            // Object.fromEntries turns it into a key value pair
            const programFileIds = Object.fromEntries(
                programIds.map((id, index) => [
                    id,
                    [id, ...(allDescendants[index] ?? [])]
                ])
            );

            const [childCounts, updateTimes] = await Promise.all([
                // we already have all descendants so subtract 1 from the length of the list gives the children
                Promise.resolve(
                    Object.fromEntries(
                        programIds.map(id => [
                            id,
                            (programFileIds[id]?.length ?? 1) - 1
                        ])
                    )
                ),
                
                // Get update times for each program and its descendants
                ctx.db
                    .select({
                        id: files.id,
                        updatedAt: files.updatedAt,
                    })
                    .from(files)
                    .where(
                        // gets all files that belong to any program
                        inArray(
                            files.id,
                            programIds.flatMap(id => programFileIds[id] ?? [])
                        )
                    )
                    .orderBy(sql`"updatedAt" DESC`)
                    // updateTimes is a list of objects with id and updatedAt fields 
            ]);

            // Create a map of program IDs to their most recent update time
            const updateTimesMap = Object.fromEntries(
                programIds.map(id => {
                    // Find the most recent update time among the program and its descendants
                    const mostRecentUpdate = updateTimes
                        // only keep the update objects that belong to the program ID
                        .filter(update => (programFileIds[id] ?? []).includes(update.id))
                        // sort the update objects by updatedAt in descending order
                        .sort((a, b) => {
                            const timeA = a.updatedAt?.getTime() ?? 0;
                            const timeB = b.updatedAt?.getTime() ?? 0;
                            return timeB - timeA;
                        })[0];
                    
                    return [id, mostRecentUpdate?.updatedAt ?? null];
                })
            );

            return {
                programs,
                childCounts,  // Already in the correct format
                updateTimes: updateTimesMap,
            };
        }),
    })
