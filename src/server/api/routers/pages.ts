import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";
import { pages } from "~/server/db/schema";

export const pagesRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ 
      filename: z.string().min(1),
      parentId: z.number().optional(),
      isFolder: z.boolean().optional(),
      path: z.string().default("root"),
      content: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Create a new page with user ID from auth
      await ctx.db.insert(pages).values({
        filename: input.filename,
        parentId: input.parentId || null,
        isFolder: input.isFolder || false,
        content: !input.isFolder ? (input.content || `# ${input.filename}`) : "",
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
  
  getFileTree: publicProcedure
  .query(async ({ctx}) => {
    const allPages = await ctx.db.query.pages.findMany();
    
    // Convert flat list to tree structure
    const buildFileTree = (parentId: number | null = null): any[] => {
      return allPages
        .filter(page => page.parentId === parentId)
        .map(page => ({
          ...page,
          children: buildFileTree(page.id)
        }))
        .sort((a, b) => {
          // Sort folders first, then alphabetically
          if (a.isFolder && !b.isFolder) return -1;
          if (!a.isFolder && b.isFolder) return 1;
          return a.filename.localeCompare(b.filename);
        });
    };
    
    return buildFileTree(null);
  }),

  update: protectedProcedure
    .input(z.object({ 
      id: z.number(),
      filename: z.string().optional(),
      content: z.string().optional(),
      parentId: z.number().nullable().optional(),
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
      // First get the page to see if it's a folder
      const page = await ctx.db.query.pages.findFirst({
        where: (pages, { eq }) => eq(pages.id, input.id)
      });
      
      if (page?.isFolder) {
        // If it's a folder, we need to recursively delete all contents
        // Get all pages in the system
        const allPages = await ctx.db.query.pages.findMany();
        
        // Helper function to collect all child IDs recursively
        const collectChildIds = (parentId: number): number[] => {
          const directChildren = allPages.filter(p => p.parentId === parentId);
          if (directChildren.length === 0) return [];
          
          return [
            ...directChildren.map(c => c.id),
            ...directChildren.flatMap(c => collectChildIds(c.id))
          ];
        };
        
        // Get all child IDs
        const childIds = collectChildIds(input.id);
        
        // Delete all children
        if (childIds.length > 0) {
          await ctx.db.delete(pages).where(
            sql`${pages.id} IN (${childIds.join(',')})`
          );
        }
      }
      
      // Delete the page/folder itself
      await ctx.db.delete(pages).where(eq(pages.id, input.id));
      return { success: true };
    }),
});
