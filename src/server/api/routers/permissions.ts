import { eq, and, asc } from 'drizzle-orm'
import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc'
import {
    filePermissions,
    permissionSchema,
    files,
    users,
} from '~/server/db/schema'
import {
    setFilePermission,
    removeFilePermission,
    getFilePermissions,
    getUserFilePermission,
    hasPermission,
    getFileDescendants,
} from '~/lib/permissions'
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

            return await setFilePermission(
                input.fileId,
                input.userId,
                input.permission
            )
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

        // Check if user is admin
        const user = await ctx.db.query.users.findFirst({
            where: eq(users.id, userId),
        })

        if (user?.role === 'admin') {
            // Admins can see all files
            const allFiles = await ctx.db.query.files.findMany({
                orderBy: [asc(files.order), asc(files.name)],
            })
            return allFiles.map((file) => file.id)
        }

        // Get direct permissions for this user
        const directPermissions = await ctx.db.query.filePermissions.findMany({
            where: eq(filePermissions.userId, userId),
            columns: { fileId: true },
        })

        const accessibleFileIds = new Set<number>()

        // For each file with direct permissions, add it and all its descendants
        for (const permission of directPermissions) {
            accessibleFileIds.add(permission.fileId)

            // Add all descendants of this file
            const descendants = await getFileDescendants(permission.fileId)
            descendants.forEach((id) => accessibleFileIds.add(id))
        }

        return Array.from(accessibleFileIds)
    }),

    // Check if user can share a file (has edit permission anywhere in hierarchy)
    canShareFile: protectedProcedure
        .input(z.object({ fileId: z.number() }))
        .query(async ({ ctx, input }) => {
            const { userId } = ctx.auth

            // Check if user is admin
            const user = await ctx.db.query.users.findFirst({
                where: eq(users.id, userId),
            })

            if (user?.role === 'admin') {
                return true // Admins can always share
            }

            // Check if user has edit permission on this file or any ancestor
            return await hasPermission(userId, input.fileId, 'edit')
        }),

    // Check if user can edit a file (has edit permission anywhere in hierarchy)
    canEditFile: protectedProcedure
        .input(z.object({ fileId: z.number() }))
        .query(async ({ ctx, input }) => {
            const { userId } = ctx.auth

            // Check if user is admin
            const user = await ctx.db.query.users.findFirst({
                where: eq(users.id, userId),
            })

            if (user?.role === 'admin') {
                return true // Admins can always edit
            }

            // Check if user has edit permission on this file or any ancestor
            return await hasPermission(userId, input.fileId, 'edit')
        }),
})
