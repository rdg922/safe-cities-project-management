import { z } from "zod";
import { eq, and, desc, asc } from "drizzle-orm";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { messages, pages, users } from "~/server/db/schema";

export const chatRouter = createTRPCRouter({
  // Get messages for a specific page
  getPageMessages: protectedProcedure
    .input(z.object({ pageId: z.number() }))
    .query(async ({ ctx, input }) => {
      const pageMessages = await ctx.db
        .select({
          id: messages.id,
          content: messages.content,
          createdAt: messages.createdAt,
          updatedAt: messages.updatedAt,
          pageId: messages.pageId,
          userId: messages.userId,
          user: {
            id: users.id,
            email: users.email,
          },
        })
        .from(messages)
        .leftJoin(users, eq(messages.userId, users.id))
        .where(eq(messages.pageId, input.pageId))
        .orderBy(asc(messages.createdAt));
      
      return pageMessages;
    }),

  // Send a new message
  sendMessage: protectedProcedure
    .input(z.object({
      pageId: z.number(),
      content: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx.auth;
      
      const message = await ctx.db.insert(messages).values({
        pageId: input.pageId,
        userId,
        content: input.content,
      }).returning();
      
      return message[0];
    }),

  // Get recent chats across all pages
  getRecentChats: protectedProcedure
    .query(async ({ ctx }) => {
      const { userId } = ctx.auth;
      
      // Get the most recent message from each page where the user has participated
      const recentChats = await ctx.db
        .select({
          message: messages,
          page: pages,
          user: users,
        })
        .from(messages)
        .leftJoin(pages, eq(messages.pageId, pages.id))
        .leftJoin(users, eq(messages.userId, users.id))
        .where(eq(messages.userId, userId))
        .orderBy(desc(messages.createdAt))
        .limit(50);
      
      // Group by page
      const chatsByPage = recentChats.reduce((acc, { message, page, user }) => {
        const pageId = message.pageId;
        if (!acc[pageId]) {
          acc[pageId] = {
            page,
            lastMessage: {
              ...message,
              user,
            },
            unreadCount: 0, // You can implement unread count logic later
          };
        }
        return acc;
      }, {} as Record<number, any>);
      
      return Object.values(chatsByPage);
    }),
}); 