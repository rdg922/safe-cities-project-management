import { z } from "zod"
import { and, eq, gt, ne } from "drizzle-orm"
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc"
import { messages, messageReads, notifications, files, users } from "~/server/db/schema";

export const notificationsRouter = createTRPCRouter({
  // Get all notifications for the current user
    getAll: protectedProcedure.query(async ({ ctx }) => {
      return await ctx.db
        .select({
          id: notifications.id,
          pageId: notifications.pageId,
          userId: notifications.userId,
          content: notifications.content,
          type: notifications.type,
          read: notifications.read,
          createdAt: notifications.createdAt,
          updatedAt: notifications.updatedAt,
          userName: users.name, // <-- get the user's name
        })
        .from(notifications)
        .leftJoin(users, eq(notifications.userId, users.id))
        .where(eq(notifications.userId, ctx.auth.userId))
    }),

  // Mark a single notification as read
  markAsRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(notifications)
        .set({ read: true })
        .where(eq(notifications.id, input.id));
      return { success: true };
    }),

  // Mark all notifications as read for the current user
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.userId, ctx.auth.userId));
    return { success: true };
  }),

  getUnseenMessagesByPage: protectedProcedure.query(async ({ ctx }) => {
    // Get all pages (files of type "page")
    const pages = await ctx.db.query.files.findMany({
      where: eq(files.type, "page"),
      columns: { id: true, name: true },
    });

    // Get all messageReads for this user
    const reads = await ctx.db.query.messageReads.findMany({
      where: eq(messageReads.userId, ctx.auth.userId),
    });

    // For each page, count unseen messages
    const result = [];
    for (const page of pages) {
      const lastSeen = reads.find(r => r.pageId === page.id)?.lastSeenMessageId ?? 0;
      const unseenMessages = await ctx.db.query.messages.findMany({
        where: and(
          eq(messages.fileId, page.id),
          gt(messages.id, lastSeen),
          ne(messages.userId, ctx.auth.userId) // Don't count own messages
        ),
      });
      const unseenCount = unseenMessages.length;
      if (unseenCount > 0) {
        result.push({
          pageId: page.id,
          pageName: page.name,
          unseenCount,
        });
      }
    }
    return result;
  }),
});