'use client'

import { useState } from 'react'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '~/components/ui/select'
import { api } from '~/trpc/react'
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    addDays,
    isSameDay,
    isSameMonth,
} from 'date-fns'
import { cn } from '~/lib/utils'
import {
    CalendarIcon,
    Clock,
    User,
    FileText,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react'
import {
    TaskAssignmentManager,
    type AssignedUser,
    type TaskAssignmentData,
} from '~/components/ui/task-assignment-manager'
import Link from 'next/link'

type Task = {
    id: number
    taskId: string
    dueDate: Date | null
    priority: string | null
    status: string | null // Updated to match API return type
    notes: string | null
    file: {
        id: number
        name: string
        type: string
    }
    assignedBy: {
        id: string
        name: string
        email: string
    } | null
    assignments?: Array<{
        assignee: {
            id: string
            name: string
            email: string
        }
    }>
}

export default function TasksCalendarPage() {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date())
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date())

    // Calculate date range for current view
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calendarStart = startOfWeek(monthStart)
    const calendarEnd = endOfWeek(monthEnd)

    const {
        data: tasks,
        isLoading,
        refetch: refetchTasks,
    } = api.tasks.getMyTasks.useQuery({
        startDate: calendarStart,
        endDate: calendarEnd,
        status: statusFilter === 'all' ? undefined : (statusFilter as any),
    })

    const {
        data: selectedDateTasks,
        isLoading: isLoadingSelectedDate,
        refetch: refetchSelectedDate,
    } = api.tasks.getMyTasks.useQuery({
        startDate: selectedDate,
        endDate: selectedDate,
        status: statusFilter === 'all' ? undefined : (statusFilter as any),
    })

    const { data: users } = api.user.getAllUsers.useQuery()

    // Task mutations with proper refetch logic
    const assignTaskMutation = api.tasks.assignTask.useMutation({
        onSuccess: () => {
            refetchSelectedDate()
            refetchTasks()
        },
    })
    const updateTaskDueDateMutation = api.tasks.updateTaskDueDate.useMutation({
        onSuccess: () => {
            refetchSelectedDate()
            refetchTasks()
        },
    })
    const updateTaskPriorityMutation = api.tasks.updateTaskPriority.useMutation(
        {
            onSuccess: () => {
                refetchSelectedDate()
                refetchTasks()
            },
        }
    )

    const getPriorityColor = (priority: string) => {
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

    const getStatusColor = (status: string | null) => {
        switch (status) {
            case 'completed':
                return 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
            case 'in_progress':
                return 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
            case 'cancelled':
                return 'bg-gray-50 text-gray-700 dark:bg-gray-950 dark:text-gray-300'
            case 'pending':
                return 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
            default:
                return 'bg-gray-50 text-gray-700 dark:bg-gray-950 dark:text-gray-300'
        }
    }

    const getTasksForDate = (date: Date) => {
        if (!tasks) return []
        return tasks.filter(
            (task) => task.dueDate && isSameDay(new Date(task.dueDate), date)
        )
    }

    const navigateMonth = (direction: 'prev' | 'next') => {
        const newMonth = new Date(currentMonth)
        if (direction === 'prev') {
            newMonth.setMonth(newMonth.getMonth() - 1)
        } else {
            newMonth.setMonth(newMonth.getMonth() + 1)
        }
        setCurrentMonth(newMonth)
    }

    // Editable Task Item Component
    const EditableTaskItem = ({ task }: { task: Task }) => {
        // Track if any mutations are in progress for this task
        const isMutating =
            assignTaskMutation.isPending ||
            updateTaskDueDateMutation.isPending ||
            updateTaskPriorityMutation.isPending

        const taskData: TaskAssignmentData = {
            priority: task.priority,
            dueDate: task.dueDate,
            // No longer passing assignedUsers - will be fetched internally
        }

        const handlePriorityChange = (
            newPriority: 'low' | 'medium' | 'high'
        ) => {
            updateTaskPriorityMutation.mutate({
                fileId: task.file.id,
                taskId: task.taskId,
                priority: newPriority,
            })
        }

        const handleDueDateChange = (date: Date | null) => {
            updateTaskDueDateMutation.mutate({
                fileId: task.file.id,
                taskId: task.taskId,
                dueDate: date,
            })
        }

        const handleUsersChange = (users: AssignedUser[]) => {
            const userIds = users.map((user) => user.id)
            assignTaskMutation.mutate({
                fileId: task.file.id,
                taskId: task.taskId,
                userIds,
                dueDate: task.dueDate || undefined,
                priority: (task.priority || 'medium') as
                    | 'low'
                    | 'medium'
                    | 'high',
            })
        }

        return (
            <div className="border rounded-lg p-3 space-y-3">
                <div className="flex items-start justify-between">
                    <Link
                        href={`/pages/${task.file.id}`}
                        className="text-sm font-medium hover:underline flex items-center gap-1"
                    >
                        <FileText className="h-4 w-4" />
                        {task.file.name}
                    </Link>
                    <Badge
                        className={cn('text-xs', getStatusColor(task.status))}
                    >
                        {task.status
                            ? task.status.replace('_', ' ')
                            : 'no status'}
                    </Badge>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <TaskAssignmentManager
                        taskData={taskData}
                        availableUsers={users || []}
                        onPriorityChange={handlePriorityChange}
                        onDueDateChange={handleDueDateChange}
                        onUsersChange={handleUsersChange}
                        fetchAssignments={true}
                        fileId={task.file.id}
                        taskId={task.taskId}
                        isLoading={!users || isMutating}
                        compact={true}
                        className="flex items-center gap-2"
                    />

                    {task.assignedBy && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            {task.assignedBy.name}
                        </div>
                    )}
                </div>

                {task.notes && (
                    <p className="text-xs text-muted-foreground">
                        {task.notes}
                    </p>
                )}
            </div>
        )
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">My Tasks Calendar</h1>
                    <p className="text-muted-foreground">
                        View and manage your assigned tasks
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <Select
                        value={statusFilter}
                        onValueChange={setStatusFilter}
                    >
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Tasks</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">
                                In Progress
                            </SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calendar View */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <CalendarIcon className="h-5 w-5" />
                                {format(currentMonth, 'MMMM yyyy')}
                            </CardTitle>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => navigateMonth('prev')}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => navigateMonth('next')}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-7 gap-1 mb-4">
                            {[
                                'Sun',
                                'Mon',
                                'Tue',
                                'Wed',
                                'Thu',
                                'Fri',
                                'Sat',
                            ].map((day) => (
                                <div
                                    key={day}
                                    className="p-2 text-center text-sm font-medium text-muted-foreground"
                                >
                                    {day}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                            {Array.from({ length: 42 }, (_, i) => {
                                const date = addDays(calendarStart, i)
                                const isCurrentMonth = isSameMonth(
                                    date,
                                    currentMonth
                                )
                                const isSelected = isSameDay(date, selectedDate)
                                const isToday = isSameDay(date, new Date())
                                const dayTasks = getTasksForDate(date)

                                return (
                                    <button
                                        key={i}
                                        onClick={() => setSelectedDate(date)}
                                        className={cn(
                                            'p-2 text-sm rounded-md min-h-[60px] border transition-colors',
                                            'flex flex-col items-start justify-start',
                                            isCurrentMonth
                                                ? 'text-foreground'
                                                : 'text-muted-foreground',
                                            isSelected &&
                                                'bg-primary text-primary-foreground',
                                            isToday &&
                                                !isSelected &&
                                                'bg-accent text-accent-foreground font-semibold',
                                            !isSelected && 'hover:bg-muted'
                                        )}
                                    >
                                        <span className="mb-1">
                                            {format(date, 'd')}
                                        </span>
                                        {dayTasks.length > 0 && (
                                            <div className="space-y-1 w-full">
                                                {dayTasks
                                                    .slice(0, 2)
                                                    .map((task, idx) => (
                                                        <div
                                                            key={idx}
                                                            className={cn(
                                                                'w-full h-1 rounded',
                                                                task.priority ===
                                                                    'high'
                                                                    ? 'bg-red-400'
                                                                    : task.priority ===
                                                                        'medium'
                                                                      ? 'bg-yellow-400'
                                                                      : 'bg-green-400'
                                                            )}
                                                        />
                                                    ))}
                                                {dayTasks.length > 2 && (
                                                    <div className="text-xs opacity-70">
                                                        +{dayTasks.length - 2}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Selected Date Tasks */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            {format(selectedDate, 'MMM dd, yyyy')}
                        </CardTitle>
                        <CardDescription>
                            {selectedDateTasks?.length || 0} task(s) for this
                            day
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isLoadingSelectedDate ? (
                            <div className="text-sm text-muted-foreground">
                                Loading tasks...
                            </div>
                        ) : selectedDateTasks &&
                          selectedDateTasks.length > 0 ? (
                            selectedDateTasks.map((task) => (
                                <EditableTaskItem key={task.id} task={task} />
                            ))
                        ) : (
                            <div className="text-sm text-muted-foreground text-center py-8">
                                No tasks for this day
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Task Summary */}
            <Card>
                <CardHeader>
                    <CardTitle>Task Summary</CardTitle>
                    <CardDescription>
                        Overview of all your tasks this month
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-sm text-muted-foreground">
                            Loading tasks...
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-orange-600">
                                    {tasks?.filter(
                                        (t) => t.status === 'pending'
                                    ).length || 0}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    Pending
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">
                                    {tasks?.filter(
                                        (t) => t.status === 'in_progress'
                                    ).length || 0}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    In Progress
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">
                                    {tasks?.filter(
                                        (t) => t.status === 'completed'
                                    ).length || 0}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    Completed
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-red-600">
                                    {tasks?.filter(
                                        (t) =>
                                            t.dueDate &&
                                            new Date(t.dueDate) < new Date() &&
                                            t.status !== 'completed'
                                    ).length || 0}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    Overdue
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
