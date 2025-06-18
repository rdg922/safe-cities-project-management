import { z } from 'zod'
import { eq, and, gte, lte, or, desc } from 'drizzle-orm'
import { generateJSON } from '@tiptap/html'
import { StarterKit } from '@tiptap/starter-kit'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'

import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc'
import { taskAssignments, files, users, pageContent } from '~/server/db/schema'
import { TRPCError } from '@trpc/server'

// Server-safe TaskItem extension with assignable attributes (no React components)
const ServerTaskItem = TaskItem.extend({
    name: 'taskItem',
    addAttributes() {
        return {
            ...this.parent?.(),
            assignedUsers: {
                default: [],
                parseHTML: (element) => {
                    const assignedUsers = element.getAttribute(
                        'data-assigned-users'
                    )
                    try {
                        return assignedUsers ? JSON.parse(assignedUsers) : []
                    } catch {
                        return []
                    }
                },
            },
            dueDate: {
                default: null,
                parseHTML: (element) => element.getAttribute('data-due-date'),
            },
            priority: {
                default: 'medium',
                parseHTML: (element) =>
                    element.getAttribute('data-priority') || 'medium',
            },
            taskId: {
                default: null,
                parseHTML: (element) => element.getAttribute('data-task-id'),
            },
        }
    },
})

// Helper function to extract task assignments from TipTap content (HTML or JSON)
function extractTaskAssignmentsFromContent(content: string): Array<{
    taskId: string
    assignedUsers: Array<{ id: string; name: string; email: string }>
    dueDate?: string
    priority?: string
}> {
    try {
        let parsed: any

        // Check if content is already JSON
        if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
            try {
                parsed = JSON.parse(content)
            } catch {
                // If JSON parsing fails, treat as HTML
                parsed = null
            }
        }

        // If not JSON or JSON parsing failed, convert HTML to JSON using TipTap
        if (!parsed) {
            parsed = generateJSON(content, [
                StarterKit,
                TaskList,
                ServerTaskItem,
            ])
        }

        const tasks: Array<{
            taskId: string
            assignedUsers: Array<{ id: string; name: string; email: string }>
            dueDate?: string
            priority?: string
        }> = []

        function traverseNodes(node: any) {
            if (node.type === 'taskItem' && node.attrs) {
                const {
                    taskId,
                    assignedUsers = [],
                    dueDate,
                    priority,
                } = node.attrs
                if (taskId && assignedUsers.length > 0) {
                    tasks.push({
                        taskId,
                        assignedUsers,
                        dueDate,
                        priority: priority || 'medium',
                    })
                }
            }

            if (node.content) {
                node.content.forEach(traverseNodes)
            }
        }

        if (parsed.content) {
            parsed.content.forEach(traverseNodes)
        } else if (Array.isArray(parsed)) {
            parsed.forEach(traverseNodes)
        } else if (parsed.type) {
            traverseNodes(parsed)
        }

        return tasks
    } catch (error) {
        console.error('Error parsing content for task assignments:', error)
        return []
    }
}

export const tasksRouter = createTRPCRouter({
    // Get tasks assigned to the current user
    getMyTasks: protectedProcedure
        .input(
            z
                .object({
                    startDate: z.date().optional(),
                    endDate: z.date().optional(),
                    status: z
                        .enum([
                            'pending',
                            'in_progress',
                            'completed',
                            'cancelled',
                        ])
                        .optional(),
                })
                .optional()
        )
        .query(async ({ ctx, input }) => {
            const { userId } = ctx.auth

            let whereConditions = [eq(taskAssignments.userId, userId)]

            if (input?.startDate || input?.endDate) {
                if (input.startDate) {
                    whereConditions.push(
                        gte(taskAssignments.dueDate, input.startDate)
                    )
                }
                if (input.endDate) {
                    whereConditions.push(
                        lte(taskAssignments.dueDate, input.endDate)
                    )
                }
            }

            if (input?.status) {
                whereConditions.push(eq(taskAssignments.status, input.status))
            }

            const tasks = await ctx.db.query.taskAssignments.findMany({
                where: and(...whereConditions),
                with: {
                    file: {
                        columns: {
                            id: true,
                            name: true,
                            type: true,
                        },
                    },
                    assignedBy: {
                        columns: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
                orderBy: [desc(taskAssignments.dueDate)],
            })

            return tasks
        }),

    // Get all assignments for a specific task
    getTaskAssignments: protectedProcedure
        .input(
            z.object({
                fileId: z.number(),
                taskId: z.string(),
            })
        )
        .query(async ({ ctx, input }) => {
            const assignments = await ctx.db.query.taskAssignments.findMany({
                where: and(
                    eq(taskAssignments.fileId, input.fileId),
                    eq(taskAssignments.taskId, input.taskId)
                ),
                with: {
                    user: {
                        columns: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    assignedBy: {
                        columns: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            })

            return assignments
        }),

    // Assign users to a task
    assignTask: protectedProcedure
        .input(
            z.object({
                fileId: z.number(),
                taskId: z.string(),
                taskText: z.string().optional(),
                userIds: z.array(z.string()),
                dueDate: z.date().optional(),
                priority: z.enum(['low', 'medium', 'high']).default('medium'),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { userId: assignedBy } = ctx.auth

            // Remove existing assignments
            await ctx.db
                .delete(taskAssignments)
                .where(
                    and(
                        eq(taskAssignments.fileId, input.fileId),
                        eq(taskAssignments.taskId, input.taskId)
                    )
                )

            // Create new assignments
            if (input.userIds.length > 0) {
                const assignments = input.userIds.map((userId) => ({
                    fileId: input.fileId,
                    taskId: input.taskId,
                    taskText: input.taskText,
                    userId,
                    assignedBy,
                    dueDate: input.dueDate,
                    priority: input.priority,
                }))

                await ctx.db.insert(taskAssignments).values(assignments)
            }

            return { success: true }
        }),

    // Update task status
    updateTaskStatus: protectedProcedure
        .input(
            z.object({
                fileId: z.number(),
                taskId: z.string(),
                status: z.enum(['pending', 'completed']),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { userId } = ctx.auth

            await ctx.db
                .update(taskAssignments)
                .set({
                    status: input.status,
                    updatedAt: new Date(),
                })
                .where(
                    and(
                        eq(taskAssignments.fileId, input.fileId),
                        eq(taskAssignments.taskId, input.taskId),
                        eq(taskAssignments.userId, userId)
                    )
                )

            return { success: true }
        }),

    // Update task due date
    updateTaskDueDate: protectedProcedure
        .input(
            z.object({
                fileId: z.number(),
                taskId: z.string(),
                taskText: z.string().optional(),
                dueDate: z.date().nullable(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const updateData: any = {
                dueDate: input.dueDate,
                updatedAt: new Date(),
            }

            if (input.taskText !== undefined) {
                updateData.taskText = input.taskText
            }

            await ctx.db
                .update(taskAssignments)
                .set(updateData)
                .where(
                    and(
                        eq(taskAssignments.fileId, input.fileId),
                        eq(taskAssignments.taskId, input.taskId)
                    )
                )

            return { success: true }
        }),

    // Delete task assignment
    unassignTask: protectedProcedure
        .input(
            z.object({
                fileId: z.number(),
                taskId: z.string(),
                userId: z.string().optional(), // If not provided, remove all assignments
            })
        )
        .mutation(async ({ ctx, input }) => {
            let whereConditions = and(
                eq(taskAssignments.fileId, input.fileId),
                eq(taskAssignments.taskId, input.taskId)
            )

            if (input.userId) {
                whereConditions = and(
                    whereConditions,
                    eq(taskAssignments.userId, input.userId)
                )
            }

            await ctx.db.delete(taskAssignments).where(whereConditions)

            return { success: true }
        }),

    // Sync task assignments from content (for version history restoration)
    syncTaskAssignmentsFromContent: protectedProcedure
        .input(
            z.object({
                fileId: z.number(),
                content: z.string(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { userId: assignedBy } = ctx.auth

            try {
                // Extract task assignments from the content
                const tasks = extractTaskAssignmentsFromContent(input.content)

                // Remove all existing assignments for this file
                await ctx.db
                    .delete(taskAssignments)
                    .where(eq(taskAssignments.fileId, input.fileId))

                // Create new assignments based on the content
                if (tasks.length > 0) {
                    const assignments = tasks.flatMap((task) =>
                        task.assignedUsers.map((user) => ({
                            fileId: input.fileId,
                            taskId: task.taskId,
                            userId: user.id,
                            assignedBy,
                            dueDate: task.dueDate
                                ? new Date(task.dueDate)
                                : null,
                            priority: task.priority || 'medium',
                            status: 'pending' as const,
                        }))
                    )

                    await ctx.db.insert(taskAssignments).values(assignments)
                }

                return {
                    success: true,
                    tasksRestored: tasks.length,
                    assignmentsCreated: tasks.reduce(
                        (sum, task) => sum + task.assignedUsers.length,
                        0
                    ),
                }
            } catch (error) {
                console.error(
                    'Error syncing task assignments from content:',
                    error
                )
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to sync task assignments from content',
                })
            }
        }),

    // Update task priority
    updateTaskPriority: protectedProcedure
        .input(
            z.object({
                fileId: z.number(),
                taskId: z.string(),
                taskText: z.string().optional(),
                priority: z.enum(['low', 'medium', 'high']),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const updateData: any = {
                priority: input.priority,
                updatedAt: new Date(),
            }

            if (input.taskText !== undefined) {
                updateData.taskText = input.taskText
            }

            await ctx.db
                .update(taskAssignments)
                .set(updateData)
                .where(
                    and(
                        eq(taskAssignments.fileId, input.fileId),
                        eq(taskAssignments.taskId, input.taskId)
                    )
                )

            return { success: true }
        }),
})
