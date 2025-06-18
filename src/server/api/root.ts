import { postRouter } from '~/server/api/routers/post'
import { userRouter } from '~/server/api/routers/user'
import { chatRouter } from '~/server/api/routers/chat'
import { filesRouter } from '~/server/api/routers/files'
import { permissionsRouter } from '~/server/api/routers/permissions'
import { notificationsRouter } from '~/server/api/routers/notifications'
import { commentsRouter } from '~/server/api/routers/comments'
import { formsRouter } from '~/server/api/routers/forms'
import { tasksRouter } from '~/server/api/routers/tasks'
import { createCallerFactory, createTRPCRouter } from '~/server/api/trpc'

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
    post: postRouter,
    user: userRouter,
    chat: chatRouter,
    files: filesRouter, // New unified router
    permissions: permissionsRouter, // Hierarchical permissions
    notification: notificationsRouter, // Robust notifications
    comments: commentsRouter, // Comments system with notifications
    forms: formsRouter, // Forms system
    tasks: tasksRouter, // Task assignments system
})

// export type definition of API
export type AppRouter = typeof appRouter

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter)
