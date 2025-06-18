import { ReactNodeViewRenderer } from '@tiptap/react'
import { TaskItem } from '@tiptap/extension-task-item'
import { AssignableTaskItemComponent } from '~/components/tiptap-ui/assignable-task-item'

export const AssignableTaskItem = TaskItem.extend({
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
                renderHTML: (attributes) => {
                    if (
                        !attributes.assignedUsers ||
                        attributes.assignedUsers.length === 0
                    ) {
                        return {}
                    }

                    return {
                        'data-assigned-users': JSON.stringify(
                            attributes.assignedUsers
                        ),
                    }
                },
            },
            dueDate: {
                default: null,
                parseHTML: (element) => element.getAttribute('data-due-date'),
                renderHTML: (attributes) => {
                    if (!attributes.dueDate) {
                        return {}
                    }

                    return {
                        'data-due-date': attributes.dueDate,
                    }
                },
            },
            priority: {
                default: 'medium',
                parseHTML: (element) =>
                    element.getAttribute('data-priority') || 'medium',
                renderHTML: (attributes) => {
                    if (
                        !attributes.priority ||
                        attributes.priority === 'medium'
                    ) {
                        return {}
                    }

                    return {
                        'data-priority': attributes.priority,
                    }
                },
            },
            taskId: {
                default: null,
                parseHTML: (element) => element.getAttribute('data-task-id'),
                renderHTML: (attributes) => {
                    if (!attributes.taskId) {
                        return {}
                    }

                    return {
                        'data-task-id': attributes.taskId,
                    }
                },
            },
        }
    },

    addNodeView() {
        return ReactNodeViewRenderer(AssignableTaskItemComponent)
    },
})
