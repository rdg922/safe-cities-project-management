import { eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { pages } from "~/server/db/schema";

export const pagesRouter = createTRPCRouter({
  create: publicProcedure
    .input(z.object({ 
      filename: z.string().min(1),
      content: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(pages).values({
        filename: input.filename,
        content: input.content || `# ${input.filename}`,
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

  update: publicProcedure
    .input(z.object({ 
      id: z.number(),
      filename: z.string().optional(),
      content: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;
      
      // Set updatedAt timestamp
      const updateValues = {
        ...updateData,
        updatedAt: new Date(),
      };
      
      await ctx.db.update(pages).set(updateValues).where(eq(pages.id, id));
      return { success: true };
    }),
  // Delete a page by id
  delete: publicProcedure
    .input(z.object({ id: z.coerce.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(pages).where(eq(pages.id, input.id));
      return { success: true };
    }),
});
