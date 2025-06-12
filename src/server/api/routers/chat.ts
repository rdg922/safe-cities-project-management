import { z } from 'zod'
import { eq, ne, and, desc, asc, sql, inArray } from 'drizzle-orm'

import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc'
import { messages, files, users, notifications, filePermissions } from '~/server/db/schema'

export const chatRouter = createTRPCRouter({
    // Get messages for a specific file
    getFileMessages: protectedProcedure
        .input(
            z.object({
                fileId: z
                    .number()
                    .int()
                    .positive('File ID must be a positive integer'),
            })
        )
        .query(async ({ ctx, input }) => {
            const fileMessages = await ctx.db
                .select({
                    id: messages.id,
                    content: messages.content,
                    createdAt: messages.createdAt,
                    updatedAt: messages.updatedAt,
                    fileId: messages.fileId,
                    userId: messages.userId,
                    user: {
                        id: users.id,
                        email: users.email,
                    },
                })
                .from(messages)
                .leftJoin(users, eq(messages.userId, users.id))
                .where(eq(messages.fileId, input.fileId))
                .orderBy(asc(messages.createdAt))

            return fileMessages
        }),

    // Send a new message
    sendMessage: protectedProcedure
        .input(
            z.object({
                fileId: z
                    .number()
                    .int()
                    .positive('File ID must be a positive integer'),
                content: z.string().min(1, 'Message content cannot be empty'),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { userId } = ctx.auth

            // 1. Insert the message
            const [message] = await ctx.db
                .insert(messages)
                .values({
                    fileId: input.fileId,
                    userId,
                    content: input.content,
                })
                .returning()

            // 2. Get page info
            const page = await ctx.db.query.files.findFirst({
                where: eq(files.id, input.fileId),
                columns: { name: true },
            })

            const pageName = page?.name || 'page'

            // // 3. Detect @mentions in the message
            // const mentionPattern = /@(\w+)/g
            // const mentions = [...input.content.matchAll(mentionPattern)]
            // const mentionedUsernames = [
            //     ...new Set(mentions.map((match) => match[1].toLowerCase())),
            // ]

            // 4. Get current user info for notifications
            const currentUser = await ctx.db.query.users.findFirst({
                where: eq(users.id, userId),
                columns: { name: true },
            })

            // 5. Handle @mentions first (higher priority)
            // if (mentionedUsernames.length > 0) {
            //     // Find users by name (case-insensitive)
            //     const mentionedUsers = await ctx.db.query.users.findMany({
            //         where: sql`LOWER(${users.name}) = ANY(${mentionedUsernames})`,
            //         columns: { id: true, name: true },
            //     })

            //     if (mentionedUsers.length > 0) {
            //         await ctx.db.insert(notifications).values(
            //             mentionedUsers
            //                 .filter((user) => user.id !== userId) // Don't notify self
            //                 .map((user) => ({
            //                     userId: user.id,
            //                     pageId: input.fileId,
            //                     content: `${currentUser?.name || 'Someone'} mentioned you in ${pageName}: "${input.content.slice(0, 100)}"`,
            //                     type: 'mention',
            //                     read: false,
            //                     createdAt: new Date(),
            //                     updatedAt: new Date(),
            //                 }))
            //         )
            //     }
            // }

            // 6. Find all users who have sent a message in this file (page), except the sender and mentioned users
            const usersInChat = await ctx.db
                .selectDistinct({ userId: messages.userId })
                .from(messages)
                .where(
                    and(
                        eq(messages.fileId, input.fileId),
                        ne(messages.userId, userId)
                    )
                )

            const mentionedUserIds = new Set()
            //     (
            //         await ctx.db.query.users.findMany({
            //             where: sql`LOWER(${users.name}) = ANY(${mentionedUsernames})`,
            //             columns: { id: true },
            //         })
            //     ).map((u) => u.id)

            // 7. Insert chat notifications for users not already mentioned
            const chatNotificationUsers = usersInChat.filter(
                (u) => u.userId && !mentionedUserIds.has(u.userId)
            )

            if (chatNotificationUsers.length > 0) {
                await ctx.db.insert(notifications).values(
                    chatNotificationUsers.map((u) => ({
                        userId: String(u.userId),
                        pageId: input.fileId,
                        content: `New message in ${pageName}: "${input.content.slice(0, 100)}"`,
                        type: 'chat',
                        read: false,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    }))
                )
            }

            return message
        }),

    // Get recent chats across all files
    getRecentChats: protectedProcedure.query(async ({ ctx }) => {
        const { userId } = ctx.auth

        // First get user's role
        const user = await ctx.db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: { role: true },
        })

        let fileIds: number[]
        if (user?.role === 'admin') {
            // For admins, get all files in one query
            const allFiles = await ctx.db.query.files.findMany({
                columns: { id: true },
            })
            fileIds = allFiles.map(f => f.id)
        } else {
            // For non-admins, get their accessible files
            const userPermissions = await ctx.db.query.filePermissions.findMany({
                where: eq(filePermissions.userId, userId),
                columns: { fileId: true },
            })
            fileIds = userPermissions.map(p => p.fileId)
        }

        if (fileIds.length === 0) {
            return []
        }

        // Get messages for the accessible files
        const recentChats = await ctx.db
            .select({
                message: messages,
                file: files,
                user: users,
            })
            .from(messages)
            .leftJoin(files, eq(messages.fileId, files.id))
            .leftJoin(users, eq(messages.userId, users.id))
            .where(inArray(messages.fileId, fileIds))
            .orderBy(asc(messages.createdAt))
            .limit(50)

        // Group by file
        const chatsByFile = recentChats.reduce(
            (acc, { message, file, user }) => {
                const fileId = message.fileId
                if (!acc[fileId]) {
                    acc[fileId] = {
                        file,
                        lastMessage: {
                            ...message,
                            user,
                        },
                        unreadCount: 0, // You can implement unread count logic later
                    }
                }
                return acc
            },
            {} as Record<number, any>
        )

        return Object.values(chatsByFile)
    }),
})
