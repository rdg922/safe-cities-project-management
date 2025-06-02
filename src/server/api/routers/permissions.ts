import { eq, and, asc } from 'drizzle-orm'
import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc'
import {
    filePermissions,
    permissionSchema,
    files,
    users,
    notifications,
} from '~/server/db/schema'
import {
    setFilePermission,
    removeFilePermission,
    getFilePermissions,
    getUserFilePermission,
    hasPermission,
} from '~/lib/permissions'
import {
    getUserPermissionContext,
    hasPermissionInContext,
    quickPermissionCheck,
    batchPermissionCheck,
} from '~/lib/permissions-simple'
import { TRPCError } from '@trpc/server'

export const permissionsRouter = createTRPCRouter({
    // Set permission for a user on a file
    setPermission: protectedProcedure
        .input(
            z.object({
                fileId: z.number(),
                userId: z.string(),
                permission: permissionSchema,
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { userId: currentUserId } = ctx.auth

            // Check if current user has edit permission on this file
            const canEdit = await hasPermission(
                currentUserId,
                input.fileId,
                'edit'
            )
            if (!canEdit) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message:
                        'You do not have permission to manage sharing for this file',
                })
            }

            const result = await setFilePermission(
                input.fileId,
                input.userId,
                input.permission
            )

            // Get file and user info for notification
            const [file, targetUser, currentUser] = await Promise.all([
                ctx.db.query.files.findFirst({
                    where: eq(files.id, input.fileId),
                    columns: { name: true },
                }),
                ctx.db.query.users.findFirst({
                    where: eq(users.id, input.userId),
                    columns: { name: true },
                }),
                ctx.db.query.users.findFirst({
                    where: eq(users.id, currentUserId),
                    columns: { name: true },
                }),
            ])

            // Create sharing notification for the user who received access
            if (
                file &&
                targetUser &&
                currentUser &&
                input.userId !== currentUserId
            ) {
                await ctx.db.insert(notifications).values({
                    userId: input.userId,
                    pageId: input.fileId,
                    content: `${currentUser.name} shared "${file.name}" with you (${input.permission} access)`,
                    type: 'share',
                    read: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                })
            }

            return result
        }),

    // Remove permission for a user on a file
    removePermission: protectedProcedure
        .input(
            z.object({
                fileId: z.number(),
                userId: z.string(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { userId: currentUserId } = ctx.auth

            // Check if current user has edit permission on this file
            const canEdit = await hasPermission(
                currentUserId,
                input.fileId,
                'edit'
            )
            if (!canEdit) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message:
                        'You do not have permission to manage sharing for this file',
                })
            }

            return await removeFilePermission(input.fileId, input.userId)
        }),

    // Get all permissions for a file
    getFilePermissions: protectedProcedure
        .input(z.object({ fileId: z.number() }))
        .query(async ({ ctx, input }) => {
            const { userId } = ctx.auth

            // Check if user has at least view permission
            const canView = await hasPermission(userId, input.fileId, 'view')
            if (!canView) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'You do not have permission to view this file',
                })
            }

            return await getFilePermissions(input.fileId)
        }),

    // Get user's permission for a specific file
    getUserPermission: protectedProcedure
        .input(z.object({ fileId: z.number() }))
        .query(async ({ ctx, input }) => {
            const { userId } = ctx.auth
            return await getUserFilePermission(userId, input.fileId)
        }),

    // Check if user has specific permission
    checkPermission: protectedProcedure
        .input(
            z.object({
                fileId: z.number(),
                permission: permissionSchema,
            })
        )
        .query(async ({ ctx, input }) => {
            const { userId } = ctx.auth
            return await hasPermission(userId, input.fileId, input.permission)
        }),

    // Get all files user has access to (for file tree filtering)
    getUserAccessibleFiles: protectedProcedure.query(async ({ ctx }) => {
        const { userId } = ctx.auth

        // Get all files first
        const allFiles = await ctx.db.query.files.findMany({
            columns: { id: true },
        })
        const fileIds = allFiles.map((f) => f.id)

        // Use optimized batch permission check
        const permissions = await batchPermissionCheck(userId, fileIds)

        const accessibleFileIds: number[] = []
        permissions.forEach((permission, fileId) => {
            if (permission) {
                accessibleFileIds.push(fileId)
            }
        })

        return accessibleFileIds
    }),

    // Check if user can share a file (has edit permission anywhere in hierarchy)
    canShareFile: protectedProcedure
        .input(z.object({ fileId: z.number() }))
        .query(async ({ ctx, input }) => {
            const { userId } = ctx.auth
            return await quickPermissionCheck(userId, input.fileId, 'edit')
        }),

    // Check if user can edit a file (has edit permission anywhere in hierarchy)
    canEditFile: protectedProcedure
        .input(z.object({ fileId: z.number() }))
        .query(async ({ ctx, input }) => {
            const { userId } = ctx.auth
            return await quickPermissionCheck(userId, input.fileId, 'edit')
        }),
})
