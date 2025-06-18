import * as React from 'react'
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react'
import { api } from '~/trpc/react'
import { TaskAssignmentManager } from '~/components/ui/task-assignment-manager'
import type { AssignedUser } from '~/components/ui/user-assignment-dropdown'

export const AssignableTaskItemComponent = (props: any) => {
    const [isHovered, setIsHovered] = React.useState(false)

    const assignedUsers = props.node.attrs.assignedUsers || []
    const dueDate = props.node.attrs.dueDate
    const priority = props.node.attrs.priority || 'medium'
    const taskId = props.node.attrs.taskId

    // Get file ID from the editor context
    const fileId = React.useMemo(() => {
        return (
            (props.editor?.options?.editorProps?.fileId as number) ||
            (window as any).__CURRENT_FILE_ID__ ||
            null
        )
    }, [props.editor])

    // Fetch users from the database
    const { data: users, isLoading } = api.user.getAllUsers.useQuery()

    // Mutation for updating task status
    const updateTaskStatusMutation = api.tasks.updateTaskStatus.useMutation()

    // Handle task ID generation
    const handleTaskIdGenerated = React.useCallback(
        (newTaskId: string) => {
            props.updateAttributes({
                taskId: newTaskId,
            })
        },
        [props]
    )

    // Extract task text from the node content (memoized value)
    const taskText = React.useMemo(() => {
        return (
            props?.node?.content?.content?.[0]?.content?.content?.[0]?.text ??
            '[Could not save task description]'
        ) // You can't make this up... wtf
    }, [props.node])

    // Handler functions for TaskAssignmentManager
    const handleUsersChange = React.useCallback(
        (updatedUsers: AssignedUser[]) => {
            props.updateAttributes({
                assignedUsers: updatedUsers,
                taskId: taskId || undefined, // Ensure taskId is set if available
            })
        },
        [props, taskId]
    )

    const handlePriorityChange = React.useCallback(
        (newPriority: 'low' | 'medium' | 'high') => {
            props.updateAttributes({
                priority: newPriority,
                taskId: taskId || undefined,
            })
        },
        [props, taskId]
    )

    const handleDueDateChange = React.useCallback(
        (date: Date | null) => {
            const newDueDate = date ? date.toISOString() : null
            props.updateAttributes({
                dueDate: newDueDate,
                taskId: taskId || undefined,
            })
        },
        [props, taskId]
    )

    // Handle status change from TaskAssignmentManager
    const handleStatusChange = React.useCallback(
        (checked: boolean) => {
            // Update the TipTap node attributes
            props.updateAttributes({
                checked: checked,
            })
        },
        [props]
    )

    // Handle checkbox change and sync with database
    const handleCheckboxChange = React.useCallback(
        (checked: boolean) => {
            // Update the TipTap node attributes immediately for UI responsiveness
            props.updateAttributes({
                checked: checked,
            })

            // Sync to database if we have the necessary data
            if (fileId && taskId) {
                const status = checked ? 'completed' : 'pending'
                updateTaskStatusMutation.mutate({
                    fileId,
                    taskId,
                    status: status as 'pending' | 'completed',
                })
            }
        },
        [props, fileId, taskId, updateTaskStatusMutation]
    )

    // Remove the useEffect for checkbox status since we're handling it directly above

    return (
        <NodeViewWrapper
            className="task-item-wrapper group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            data-type="taskItem"
            data-checked={props.node.attrs.checked}
        >
            <label className="task-item flex items-start flex-1 cursor-pointer">
                <input
                    type="checkbox"
                    checked={props.node.attrs.checked}
                    onChange={(event) =>
                        handleCheckboxChange(event.target.checked)
                    }
                    className="mt-1.5 mr-2 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary dark:border-gray-600 dark:bg-gray-900"
                />
                <NodeViewContent
                    as="span"
                    className="task-item-content flex-1"
                />
            </label>

            <div className="ml-2">
                <TaskAssignmentManager
                    taskData={{
                        priority: priority as 'low' | 'medium' | 'high',
                        dueDate: dueDate,
                        assignedUsers: assignedUsers,
                    }}
                    availableUsers={users || []}
                    onPriorityChange={handlePriorityChange}
                    onDueDateChange={handleDueDateChange}
                    onUsersChange={handleUsersChange}
                    onStatusChange={handleStatusChange}
                    enableDatabaseSync={true}
                    fileId={fileId}
                    taskId={taskId}
                    taskText={taskText}
                    onTaskIdGenerated={handleTaskIdGenerated}
                    showOnlyOnHover={true}
                    isHovered={isHovered}
                    isLoading={isLoading}
                    compact={true}
                />
            </div>
        </NodeViewWrapper>
    )
}
