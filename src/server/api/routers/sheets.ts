import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { sheets } from "~/server/db/schema";

export const sheetsRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ 
      title: z.string().min(1),
      content: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Insert a new sheet and return its ID
      const [inserted] = await ctx.db.insert(sheets)
        .values({
          title: input.title,
          content: input.content || "[]",
          createdBy: ctx.auth.userId,
          updatedBy: ctx.auth.userId
        })
        .returning({ id: sheets.id });
      return { id: inserted.id };
    }),

  getById: publicProcedure
    .input(z.object({ id: z.coerce.number() }))
    .query(async ({ ctx, input }) => {
      const sheet = await ctx.db.query.sheets.findFirst({
        where: eq(sheets.id, input.id),
      });
      
      if (!sheet) throw new TRPCError({ code: 'NOT_FOUND', message: 'Sheet not found' });
      
      return sheet;
    }),
    
  getAll: publicProcedure
    .query(async ({ ctx }) => {
      const allSheets = await ctx.db.query.sheets.findMany({
        orderBy: (sheets, { desc }) => [desc(sheets.createdAt)],
      });
      
      return allSheets;
    }),
    
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      content: z.string(),
      title: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(sheets)
        .set({
          content: input.content,
          title: input.title,
          updatedAt: sql`NOW()`,
          updatedBy: ctx.auth.userId
        })
        .where(eq(sheets.id, input.id));
    }),
    
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(sheets)
        .where(eq(sheets.id, input.id));
    }),
});
