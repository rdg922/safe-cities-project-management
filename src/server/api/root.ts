import { postRouter } from "~/server/api/routers/post";
import { pagesRouter } from "~/server/api/routers/pages";
import { userRouter } from "~/server/api/routers/user";
import { chatRouter } from "~/server/api/routers/chat";
import { sheetsRouter } from "~/server/api/routers/sheets";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  pages: pagesRouter,
  user: userRouter,
  chat: chatRouter,
  sheets: sheetsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
