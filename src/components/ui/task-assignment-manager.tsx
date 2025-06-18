'use client'

import * as React from 'react'
import { useState, useCallback, useEffect, useRef } from 'react'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Users, X, CalendarIcon, Loader2 } from 'lucide-react'
import { cn } from '~/lib/utils'
import { UserAssignmentDropdown } from '~/components/ui/user-assignment-dropdown'
import { api } from '~/trpc/react'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '~/components/ui/popover'
import { Calendar as CalendarComponent } from '~/components/ui/calendar'
import { format } from 'date-fns'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '~/components/ui/select'

export interface AssignedUser {
    id: string
    name: string | null
    email: string
}

export interface TaskAssignmentData {
    priority: string | null // Updated to match API
    dueDate: Date | string | null
    assignedUsers?: AssignedUser[] // Made optional since we'll fetch it internally
}

export interface TaskAssignmentManagerProps {
    // Current task data
    taskData: TaskAssignmentData

    // Available users for assignment
    availableUsers: (
        | AssignedUser
        | { id: string; name?: string | null; email: string }
    )[]

    // Callbacks for changes
    onPriorityChange?: (priority: 'low' | 'medium' | 'high') => void
    onDueDateChange?: (date: Date | null) => void
    onUsersChange?: (users: AssignedUser[]) => void

    // Database sync options (for TipTap integration)
    enableDatabaseSync?: boolean
    fileId?: number | null
    taskId?: string | null
    onTaskIdGenerated?: (taskId: string) => void

    // Internal assignment fetching (for existing tasks)
    fetchAssignments?: boolean

    // UI configuration
    showPriority?: boolean
    showDueDate?: boolean
    showAssignments?: boolean
    showOnlyOnHover?: boolean
    isHovered?: boolean
    isLoading?: boolean
    disabled?: boolean
    compact?: boolean

    // Styling
    className?: string
    buttonClassName?: string
}

export function TaskAssignmentManager({
    taskData,
    availableUsers,
    onPriorityChange,
    onDueDateChange,
    onUsersChange,
    enableDatabaseSync = false,
    fileId,
    taskId,
    onTaskIdGenerated,
    fetchAssignments = false,
    showPriority = true,
    showDueDate = true,
    showAssignments = true,
    showOnlyOnHover = false,
    isHovered = false,
    isLoading = false,
    disabled = false,
    compact = false,
    className,
    buttonClassName,
}: TaskAssignmentManagerProps) {
    const [isPriorityOpen, setIsPriorityOpen] = useState(false)
    const [isDueDateOpen, setIsDueDateOpen] = useState(false)

    // Refs to track pending database sync operations
    const pendingSync = useRef<{
        users?: AssignedUser[]
        priority?: 'low' | 'medium' | 'high'
        dueDate?: Date | null
    }>({})
    const syncInProgress = useRef(false)
    const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const { priority, dueDate, assignedUsers: passedAssignedUsers } = taskData

    // Fetch task assignments if requested
    const {
        data: fetchedAssignments,
        isLoading: isLoadingAssignments,
        isRefetching: isRefetchingAssignments,
        refetch: refetchAssignments,
    } = api.tasks.getTaskAssignments.useQuery(
        { fileId: fileId!, taskId: taskId! },
        {
            enabled: fetchAssignments && !!fileId && !!taskId,
            refetchOnWindowFocus: false,
        }
    )

    // Use fetched assignments if available, otherwise use passed ones
    const assignedUsers: AssignedUser[] = React.useMemo(() => {
        if (fetchAssignments && fetchedAssignments) {
            return fetchedAssignments.map((assignment) => ({
                id: assignment.user.id,
                name: assignment.user.name,
                email: assignment.user.email,
            }))
        }
        return passedAssignedUsers || []
    }, [fetchAssignments, fetchedAssignments, passedAssignedUsers])

    // Generate or use existing task ID
    const currentTaskId = React.useMemo(() => {
        if (taskId) return taskId
        const newTaskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        if (onTaskIdGenerated) {
            onTaskIdGenerated(newTaskId)
        }
        return newTaskId
    }, [taskId, onTaskIdGenerated])

    // Database sync mutations (only used when enableDatabaseSync is true)
    const assignTaskMutation = api.tasks.assignTask.useMutation({
        onSuccess: () => {
            if (fetchAssignments && refetchAssignments) {
                refetchAssignments()
            }
        },
    })
    const updateTaskDueDateMutation = api.tasks.updateTaskDueDate.useMutation({
        onSuccess: () => {
            if (fetchAssignments && refetchAssignments) {
                refetchAssignments()
            }
        },
    })
    const updateTaskPriorityMutation = api.tasks.updateTaskPriority.useMutation(
        {
            onSuccess: () => {
                if (fetchAssignments && refetchAssignments) {
                    refetchAssignments()
                }
            },
        }
    )

    // Track if any mutations are loading
    const isMutating =
        assignTaskMutation.isPending ||
        updateTaskDueDateMutation.isPending ||
        updateTaskPriorityMutation.isPending

    // Improved database sync with better error handling and deduplication
    const performDatabaseSync = useCallback(async () => {
        if (
            !enableDatabaseSync ||
            !fileId ||
            !currentTaskId ||
            syncInProgress.current
        ) {
            return
        }

        const {
            users,
            priority: newPriority,
            dueDate: newDueDate,
        } = pendingSync.current

        // Check if there are any changes to sync
        const hasChanges =
            users !== undefined ||
            newPriority !== undefined ||
            newDueDate !== undefined
        if (!hasChanges) return

        syncInProgress.current = true

        try {
            // Sync users if changed
            if (users !== undefined) {
                const userIds = users.map((user) => user.id)

                // The assignTask mutation should handle replacing existing assignments
                await assignTaskMutation.mutateAsync({
                    fileId,
                    taskId: currentTaskId,
                    userIds,
                    dueDate: dueDate ? new Date(dueDate) : undefined,
                    priority: priority as 'low' | 'medium' | 'high',
                })
            }

            // Sync priority if changed
            if (newPriority !== undefined) {
                await updateTaskPriorityMutation.mutateAsync({
                    fileId,
                    taskId: currentTaskId,
                    priority: newPriority,
                })
            }

            // Sync due date if changed
            if (newDueDate !== undefined) {
                await updateTaskDueDateMutation.mutateAsync({
                    fileId,
                    taskId: currentTaskId,
                    dueDate: newDueDate,
                })
            }

            // Clear pending sync after successful operation
            pendingSync.current = {}
        } catch (error) {
            console.error('Error syncing task changes:', error)
            // Don't clear pending sync on error - allow retry
        } finally {
            syncInProgress.current = false
        }
    }, [
        enableDatabaseSync,
        fileId,
        currentTaskId,
        dueDate,
        priority,
        assignTaskMutation,
        updateTaskPriorityMutation,
        updateTaskDueDateMutation,
    ])

    // Effect to handle database sync after state updates
    useEffect(() => {
        if (!enableDatabaseSync || !fileId || !currentTaskId) return

        // Clear any existing timeout
        if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current)
        }

        // Only sync if there are pending changes
        const hasPendingChanges = Object.keys(pendingSync.current).length > 0
        if (!hasPendingChanges) return

        // Debounce the sync operation with longer delay to prevent rapid calls
        syncTimeoutRef.current = setTimeout(() => {
            performDatabaseSync()
        }, 1000) // Increased to 1 second

        return () => {
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current)
            }
        }
    }, [
        enableDatabaseSync,
        fileId,
        currentTaskId,
        assignedUsers,
        priority,
        dueDate,
        performDatabaseSync,
    ])

    // Priority color utility
    const getPriorityColor = (priority: string | null) => {
        switch (priority) {
            case 'high':
                return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800'
            case 'medium':
                return 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800'
            case 'low':
                return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800'
            default:
                return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950 dark:text-gray-300 dark:border-gray-800'
        }
    }

    // Format due date utility
    const formatDueDate = (dateString: string | Date | null) => {
        if (!dateString) return 'Date'
        try {
            return format(new Date(dateString), 'MMM dd')
        } catch {
            return 'Invalid date'
        }
    }

    // Handle user assignment toggle
    const handleUserToggle = (
        userId: string,
        userName: string,
        userEmail: string
    ) => {
        if (!onUsersChange) return

        const currentUsers = [...assignedUsers]
        const existingIndex = currentUsers.findIndex((u) => u.id === userId)

        if (existingIndex > -1) {
            // Remove user
            currentUsers.splice(existingIndex, 1)
        } else {
            // Add user
            currentUsers.push({
                id: userId,
                name: userName || userEmail,
                email: userEmail,
            })
        }

        // Update local state immediately
        onUsersChange(currentUsers)

        // Mark for database sync
        if (enableDatabaseSync) {
            pendingSync.current.users = currentUsers
        }

        // Refetch assignments after a short delay to allow for sync
        if (fetchAssignments && refetchAssignments) {
            setTimeout(() => {
                refetchAssignments()
            }, 500)
        }
    }

    // Handle clear all assignments
    const handleClearAll = () => {
        if (!onUsersChange) return

        // Update local state immediately
        onUsersChange([])

        // Mark for database sync
        if (enableDatabaseSync) {
            pendingSync.current.users = []
        }

        // Refetch assignments after a short delay to allow for sync
        if (fetchAssignments && refetchAssignments) {
            setTimeout(() => {
                refetchAssignments()
            }, 500)
        }
    }

    // Handle priority change
    const handlePriorityChange = (newPriority: string) => {
        if (!onPriorityChange) return
        const typedPriority = newPriority as 'low' | 'medium' | 'high'

        // Update local state immediately
        onPriorityChange(typedPriority)
        setIsPriorityOpen(false)

        // Mark for database sync
        if (enableDatabaseSync) {
            pendingSync.current.priority = typedPriority
        }

        // Refetch assignments after a short delay to allow for sync
        if (fetchAssignments && refetchAssignments) {
            setTimeout(() => {
                refetchAssignments()
            }, 500)
        }
    }

    // Handle due date change
    const handleDueDateChange = (date: Date | undefined) => {
        if (!onDueDateChange) return
        const newDate = date || null

        // Update local state immediately
        onDueDateChange(newDate)
        setIsDueDateOpen(false)

        // Mark for database sync
        if (enableDatabaseSync) {
            pendingSync.current.dueDate = newDate
        }

        // Refetch assignments after a short delay to allow for sync
        if (fetchAssignments && refetchAssignments) {
            setTimeout(() => {
                refetchAssignments()
            }, 500)
        }
    }

    return (
        <div
            className={cn(
                'flex items-center gap-2',
                compact && 'gap-1',
                className
            )}
        >
            {/* Loading indicator when mutations are pending or assignments are loading */}
            {(isMutating ||
                isLoadingAssignments ||
                isRefetchingAssignments) && (
                <Loader2
                    className={cn(
                        compact ? 'h-3 w-3' : 'h-4 w-4',
                        'animate-spin text-muted-foreground'
                    )}
                />
            )}

            {/* Priority Selector */}
            <Select
                value={priority || 'medium'}
                onValueChange={handlePriorityChange}
                open={isPriorityOpen}
                onOpenChange={setIsPriorityOpen}
                disabled={disabled || !onPriorityChange || isMutating}
            >
                <SelectTrigger
                    className={cn(
                        compact ? 'h-6 w-16 text-xs' : 'h-8 w-20 text-sm',
                        'border',
                        getPriorityColor(priority),
                        buttonClassName
                    )}
                >
                    <SelectValue />
                </SelectTrigger>
                <SelectContent className="min-w-[100px]">
                    <SelectItem value="low" className="text-xs">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            Low
                        </div>
                    </SelectItem>
                    <SelectItem value="medium" className="text-xs">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                            Medium
                        </div>
                    </SelectItem>
                    <SelectItem value="high" className="text-xs">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            High
                        </div>
                    </SelectItem>
                </SelectContent>
            </Select>

            {/* Due Date Picker */}
            <Popover open={isDueDateOpen} onOpenChange={setIsDueDateOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        size={compact ? 'sm' : 'default'}
                        disabled={disabled || !onDueDateChange || isMutating}
                        className={cn(
                            compact ? 'h-6 px-2 text-xs' : 'h-8 px-3 text-sm',
                            'border',
                            dueDate
                                ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300'
                                : 'bg-background border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                            buttonClassName
                        )}
                    >
                        <CalendarIcon
                            className={cn(
                                compact ? 'h-3 w-3' : 'h-4 w-4',
                                'mr-1'
                            )}
                        />
                        {formatDueDate(dueDate)}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                        mode="single"
                        selected={dueDate ? new Date(dueDate) : undefined}
                        onSelect={handleDueDateChange}
                        initialFocus
                        className="border-0"
                    />
                    {dueDate && (
                        <div className="p-3 border-t">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDueDateChange(undefined)}
                                className="w-full"
                            >
                                Clear date
                            </Button>
                        </div>
                    )}
                </PopoverContent>
            </Popover>

            {/* User Assignment Dropdown */}
            <UserAssignmentDropdown
                assignedUsers={assignedUsers}
                availableUsers={availableUsers}
                onUserToggle={handleUserToggle}
                onClearAll={handleClearAll}
                isLoading={isLoading || isLoadingAssignments || isMutating}
                disabled={disabled || !onUsersChange || isMutating}
                compact={compact}
                buttonClassName={buttonClassName}
            />
        </div>
    )
}
