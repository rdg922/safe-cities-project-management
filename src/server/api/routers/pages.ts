import { eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";
import { pages } from "~/server/db/schema";

export const pagesRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ 
      filename: z.string().min(1),
      content: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Create a new page with user ID from auth
      await ctx.db.insert(pages).values({
        filename: input.filename,
        content: input.content || `# ${input.filename}`,
        // Store the user ID who created the page
        createdBy: ctx.auth.userId,
      });
    }),
  getById: publicProcedure
    .input(z.object({ id: z.coerce.number() }))
    .query(async ({ ctx, input }) => {
      const page = await ctx.db.query.pages.findFirst({
        where: (pages, { eq }) => eq(pages.id, input.id)
      });
      
      return page || {
        id: 0,
        filename: "Page Not Found",
        content: "# Page Not Found\n\nThe requested page could not be found.",
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }),

  getAll: publicProcedure
  .query(async ({ctx}) => await ctx.db.query.pages.findMany()),

  update: protectedProcedure
    .input(z.object({ 
      id: z.number(),
      filename: z.string().optional(),
      content: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;
      
      // Set updatedAt timestamp and the user who updated it
      const updateValues = {
        ...updateData,
        updatedAt: new Date(),
        updatedBy: ctx.auth.userId,
      };
      
      await ctx.db.update(pages).set(updateValues).where(eq(pages.id, id));
      return { success: true };
    }),
  // Delete a page by id - protected operation
  delete: protectedProcedure
    .input(z.object({ id: z.coerce.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(pages).where(eq(pages.id, input.id));
      return { success: true };
    }),
});
