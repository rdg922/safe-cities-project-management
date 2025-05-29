import { z } from 'zod'
import { eq, ne, and, desc, asc } from 'drizzle-orm'

import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc'
import { messages, files, users, notifications } from '~/server/db/schema'

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
      const { userId } = ctx.auth;

      // 1. Insert the message
      const [message] = await ctx.db
        .insert(messages)
        .values({
            fileId: input.fileId,
            userId,
            content: input.content,
        })
        .returning();

      // 2. Find all users who have sent a message in this file (page), except the sender
    const usersInChat = await ctx.db
      .selectDistinct({ userId: messages.userId })
      .from(messages)
      .where(
            and(
                eq(messages.fileId, input.fileId),
                ne(messages.userId, userId)
            )
      );
      
    const page = await ctx.db.query.files.findFirst({
        where: eq(files.id, input.fileId),
        columns: { name: true },
    });

    const pageName = page?.name || "page";
      // 3. Insert a notification for each user (except sender)
        if (usersInChat.length > 0) {
            await ctx.db.insert(notifications).values(
                usersInChat.map((u) => ({
                    userId: String(u.userId), // ensure string
                    pageId: input.fileId,
                    content: `New message in ${pageName}: "${input.content.slice(0, 100)}"`,
                    type: "chat",
                    read: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }))
            );
        }

      return message;
    }),

    // Get recent chats across all files
    getRecentChats: protectedProcedure.query(async ({ ctx }) => {
        const { userId } = ctx.auth

        // Get the most recent message from each file where the user has participated
        const recentChats = await ctx.db
            .select({
                message: messages,
                file: files,
                user: users,
            })
            .from(messages)
            .leftJoin(files, eq(messages.fileId, files.id))
            .leftJoin(users, eq(messages.userId, users.id))
            .where(eq(messages.userId, userId))
            .orderBy(desc(messages.createdAt))
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
