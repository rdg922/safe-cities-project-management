import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc'
import { filePermissions, permissionSchema } from '~/server/db/schema'
import {
    setFilePermission,
    removeFilePermission,
    getFilePermissions,
    getUserFilePermission,
    hasPermission,
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
})
