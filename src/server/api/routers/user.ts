import { z } from "zod";
import { eq } from "drizzle-orm";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { users } from "~/server/db/schema";
import { TRPCError } from "@trpc/server";

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
  
  // Get the current user's profile
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const { userId } = ctx.auth;
    
    // Find the user in the database
    const user = await ctx.db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    
    if (!user) {
      // If the user doesn't exist in our database yet, return just the auth info
      return {
        id: userId,
        email: "User not found in database",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    
    return user;
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
      email: z.string().email().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx.auth;
      
      // Check if user exists
      const existingUser = await ctx.db.query.users.findFirst({
        where: eq(users.id, userId),
      });
      
      if (!existingUser) {
        // Update existing user
        await ctx.db.update(users)
          .set({
            ...(input.email && { email: input.email }),
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));
          
        return { 
          success: true,
          message: "User profile updated",
          operation: "updated"
        };
      } else {
        return new TRPCError({code: "BAD_REQUEST", message: "User not found"})
      }
    }),
    
  // For admin: get all users
  getAllUsers: protectedProcedure.query(async ({ ctx }) => {
    const allUsers = await ctx.db.query.users.findMany({
      columns: {
        name: true,
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: (users, { desc }) => [desc(users.createdAt)],
    });

    return allUsers;
  }),
});