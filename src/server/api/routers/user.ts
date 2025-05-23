import { z } from "zod";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";

export const userRouter = createTRPCRouter({
  // Public route that anyone can access
  getPublicUsers: publicProcedure.query(async () => {
    return {
      message: "This is public data that anyone can access",
      users: [
        { id: 1, name: "Public User 1" },
        { id: 2, name: "Public User 2" },
      ],
    };
  }),
  
  // Protected route that requires authentication
  getProtectedUserData: protectedProcedure.query(async ({ ctx }) => {
    // ctx.auth is guaranteed to exist here since we're using protectedProcedure
    return {
      message: "You are authenticated!",
      userId: ctx.auth.userId,
      // You can use ctx.auth.userId to fetch user-specific data
    };
  }),

  // Protected mutation that requires authentication
  updateUserProfile: protectedProcedure
    .input(z.object({
      name: z.string().optional(),
      title: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // In a real app, you would update the user's profile in your database
      return {
        success: true,
        message: "This is a test, nothing was changed, see (src/scripts/api/routers/user.ts)",
        userId: ctx.auth.userId,
        updatedFields: input,
      };
    }),
});