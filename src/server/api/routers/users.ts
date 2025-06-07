import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { currentUser } from '@clerk/nextjs/server'

import {
    createTRPCRouter,
    publicProcedure,
    protectedProcedure,
} from '~/server/api/trpc'
import { users } from '~/server/db/schema'

export const usersRouter = createTRPCRouter({
    // Ensure current user exists in database
    ensureCurrentUser: protectedProcedure.mutation(async ({ ctx }) => {
        const { userId } = ctx.auth

        // Check if user already exists
        const existingUser = await ctx.db.query.users.findFirst({
            where: eq(users.id, userId),
        })

        if (existingUser) {
            return existingUser
        }

        // Get user details from Clerk
        const clerkUser = await currentUser()

        if (!clerkUser) {
            throw new Error('User not found in Clerk')
        }

        // Create user in our database
        const [newUser] = await ctx.db
            .insert(users)
            .values({
                id: userId,
                name:
                    clerkUser.fullName || clerkUser.firstName || 'Unknown User',
                email: clerkUser.emailAddresses[0]?.emailAddress || '',
                role: 'unverified',
            })
            .returning()

        return newUser
    }),

    // Get current user
    getCurrentUser: protectedProcedure.query(async ({ ctx }) => {
        const { userId } = ctx.auth

        const user = await ctx.db.query.users.findFirst({
            where: eq(users.id, userId),
        })

        return user
    }),

    // Get all users (admin only)
    getAll: protectedProcedure.query(async ({ ctx }) => {
        return await ctx.db.query.users.findMany({
            orderBy: (users, { desc }) => [desc(users.createdAt)],
        })
    }),

    // Update user role (admin only)
    updateRole: protectedProcedure
        .input(
            z.object({
                userId: z.string(),
                role: z.enum(['admin', 'user', 'unverified']),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // TODO: Add admin check
            const [updatedUser] = await ctx.db
                .update(users)
                .set({
                    role: input.role,
                    updatedAt: new Date(),
                })
                .where(eq(users.id, input.userId))
                .returning()

            return updatedUser
        }),
})
