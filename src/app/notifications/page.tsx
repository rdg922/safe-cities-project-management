'use client'

import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { api } from '~/trpc/react'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { Badge } from '~/components/ui/badge'
import {
    Bell,
    CheckCheck,
    Archive,
    MoreHorizontal,
    RefreshCw,
    Settings,
    Trash2,
} from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { toast } from '~/hooks/use-toast'
import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { SidebarTrigger } from '~/components/ui/sidebar'
import { useMobile } from '~/hooks/use-mobile'

export default function NotificationsPage() {
    const isMobile = useMobile()

    // Fetch notifications from backend with polling for real-time updates
    const {
        data: notificationData,
        refetch,
        isLoading,
        error,
    } = api.notification.getAll.useQuery(undefined, {
        refetchInterval: 30000, // Poll every 30 seconds for real-time updates
        refetchOnWindowFocus: true,
    })

    // Get notification statistics
    const { data: stats } = api.notification.getStats.useQuery(undefined, {
        refetchInterval: 30000,
    })

    const markAsReadMutation = api.notification.markAsRead.useMutation()
    const markAllAsReadMutation = api.notification.markAllAsRead.useMutation()
    const markMultipleAsReadMutation =
        api.notification.markMultipleAsRead.useMutation()
    const deleteNotificationMutation =
        api.notification.deleteNotification.useMutation()
    const deleteMultipleNotificationsMutation =
        api.notification.deleteMultipleNotifications.useMutation()
    const deleteAllReadNotificationsMutation =
        api.notification.deleteAllReadNotifications.useMutation()

    const [activeTab, setActiveTab] = useState('all')
    const [selectedNotifications, setSelectedNotifications] = useState<
        number[]
    >([])
    const [isRefreshing, setIsRefreshing] = useState(false)

    const notifications = notificationData?.notifications || []
    const unreadNotifications = notifications.filter((n) => !n.read)
    const mentionNotifications = notifications.filter(
        (n) => n.type === 'mention'
    )

    const markAsRead = async (notificationId: number) => {
        try {
            await markAsReadMutation.mutateAsync({ id: notificationId })
            toast({ title: 'Notification marked as read' })
            await refetch()
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to mark notification as read',
                variant: 'destructive',
            })
        }
    }

    const markAllAsRead = async () => {
        try {
            const result = await markAllAsReadMutation.mutateAsync({
                type: activeTab === 'mentions' ? 'mention' : undefined,
            })
            toast({
                title: 'Success',
                description: `Marked ${result.updatedCount} notifications as read`,
            })
            await refetch()
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to mark notifications as read',
                variant: 'destructive',
            })
        }
    }

    const markSelectedAsRead = async () => {
        if (selectedNotifications.length === 0) return

        try {
            const result = await markMultipleAsReadMutation.mutateAsync({
                ids: selectedNotifications,
            })
            toast({
                title: 'Success',
                description: `Marked ${result.updatedCount} notifications as read`,
            })
            setSelectedNotifications([])
            await refetch()
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to mark selected notifications as read',
                variant: 'destructive',
            })
        }
    }

    const handleRefresh = async () => {
        setIsRefreshing(true)
        try {
            await refetch()
            toast({ title: 'Notifications refreshed' })
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to refresh notifications',
                variant: 'destructive',
            })
        } finally {
            setIsRefreshing(false)
        }
    }

    const toggleNotificationSelection = (notificationId: number) => {
        setSelectedNotifications((prev) =>
            prev.includes(notificationId)
                ? prev.filter((id) => id !== notificationId)
                : [...prev, notificationId]
        )
    }

    const deleteNotification = async (notificationId: number) => {
        try {
            await deleteNotificationMutation.mutateAsync({ id: notificationId })
            toast({ title: 'Notification deleted' })
            await refetch()
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to delete notification',
                variant: 'destructive',
            })
        }
    }

    const deleteSelectedNotifications = async () => {
        if (selectedNotifications.length === 0) return

        try {
            const result =
                await deleteMultipleNotificationsMutation.mutateAsync({
                    ids: selectedNotifications,
                })
            toast({
                title: 'Success',
                description: `Deleted ${result.deletedCount} notifications`,
            })
            setSelectedNotifications([])
            await refetch()
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to delete selected notifications',
                variant: 'destructive',
            })
        }
    }

    const deleteAllReadNotifications = async () => {
        try {
            const result = await deleteAllReadNotificationsMutation.mutateAsync(
                {
                    type: activeTab === 'mentions' ? 'mention' : undefined,
                }
            )
            toast({
                title: 'Success',
                description: `Deleted ${result.deletedCount} read notifications`,
            })
            await refetch()
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to delete read notifications',
                variant: 'destructive',
            })
        }
    }

    const getNotificationTypeColor = (type: string) => {
        switch (type) {
            case 'mention':
                return 'bg-orange-100 text-orange-800'
            case 'edit':
                return 'bg-green-100 text-green-800'
            case 'share':
                return 'bg-purple-100 text-purple-800'
            default:
                return 'bg-gray-100 text-gray-800'
        }
    }

    const getFilteredNotifications = () => {
        switch (activeTab) {
            case 'unread':
                return unreadNotifications
            case 'mentions':
                return mentionNotifications
            default:
                return notifications
        }
    }

    return (
        <div className="container mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    {isMobile && <SidebarTrigger />}
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            Notifications
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Stay updated on mentions, comments, and changes
                        </p>
                        {stats && (
                            <div className="flex gap-2 mt-2">
                                <Badge variant="secondary">
                                    {stats.total} total
                                </Badge>
                                <Badge variant="destructive">
                                    {stats.unread} unread
                                </Badge>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex gap-2">
                    {selectedNotifications.length > 0 && (
                        <>
                            <Button
                                variant="outline"
                                onClick={markSelectedAsRead}
                            >
                                <CheckCheck size={16} className="mr-2" />
                                Mark selected as read (
                                {selectedNotifications.length})
                            </Button>
                            <Button
                                variant="outline"
                                onClick={deleteSelectedNotifications}
                                className="text-destructive hover:text-destructive"
                            >
                                <Trash2 size={16} className="mr-2" />
                                Delete selected ({selectedNotifications.length})
                            </Button>
                        </>
                    )}
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                    >
                        <RefreshCw
                            size={16}
                            className={isRefreshing ? 'animate-spin' : ''}
                        />
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="gap-2">
                                <Settings size={16} />
                                Actions
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={markAllAsRead}>
                                <CheckCheck className="mr-2 h-4 w-4" />
                                Mark all as read
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={deleteAllReadNotifications}
                                className="text-destructive focus:text-destructive"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete all read
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {error && (
                <Card className="mb-4 border-destructive">
                    <CardContent className="pt-6">
                        <p className="text-destructive">
                            Failed to load notifications. Please try refreshing
                            the page.
                        </p>
                    </CardContent>
                </Card>
            )}

            <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
            >
                <TabsList className="mb-4">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="unread">
                        Unread{' '}
                        <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
                            {unreadNotifications.length}
                        </span>
                    </TabsTrigger>
                    <TabsTrigger value="mentions">
                        Mentions
                        {mentionNotifications.length > 0 && (
                            <span className="ml-1 rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] text-white">
                                {mentionNotifications.length}
                            </span>
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-0">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center justify-between">
                                <span>
                                    {activeTab === 'all'
                                        ? 'All Notifications'
                                        : activeTab === 'unread'
                                          ? 'Unread Notifications'
                                          : 'Mentions'}
                                </span>
                                {isLoading && (
                                    <RefreshCw
                                        size={16}
                                        className="animate-spin text-muted-foreground"
                                    />
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y">
                                {getFilteredNotifications().map(
                                    (notification) => (
                                        <div
                                            key={notification.id}
                                            className={`flex items-center gap-4 p-4 transition-colors hover:bg-muted/50 ${
                                                notification.read
                                                    ? ''
                                                    : 'bg-muted/30'
                                            } ${selectedNotifications.includes(notification.id) ? 'bg-primary/10' : ''}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedNotifications.includes(
                                                    notification.id
                                                )}
                                                onChange={() =>
                                                    toggleNotificationSelection(
                                                        notification.id
                                                    )
                                                }
                                                className="h-4 w-4 rounded border-gray-300"
                                            />

                                            <div className="relative">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarFallback className="text-xs">
                                                        {notification.userName
                                                            ?.split(' ')
                                                            .map((n) => n[0])
                                                            .join('')
                                                            .slice(0, 2) ||
                                                            '??'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                {!notification.read && (
                                                    <span className="absolute -right-1 -top-1 flex h-3 w-3">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="text-sm font-medium truncate">
                                                        {notification.userName ||
                                                            'Unknown User'}
                                                    </p>
                                                    <Badge
                                                        variant="secondary"
                                                        className={`text-xs ${getNotificationTypeColor(notification.type || 'default')}`}
                                                    >
                                                        {notification.type ||
                                                            'notification'}
                                                    </Badge>
                                                    <span className="text-xs text-muted-foreground">
                                                        {formatDistanceToNow(
                                                            new Date(
                                                                notification.createdAt
                                                            ),
                                                            { addSuffix: true }
                                                        )}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-muted-foreground truncate">
                                                    {notification.content}
                                                </p>
                                                {notification.pageName && (
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        in{' '}
                                                        <span className="font-medium">
                                                            {
                                                                notification.pageName
                                                            }
                                                        </span>
                                                    </p>
                                                )}
                                            </div>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 shrink-0"
                                                    >
                                                        <MoreHorizontal
                                                            size={16}
                                                        />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {!notification.read && (
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                markAsRead(
                                                                    notification.id
                                                                )
                                                            }
                                                        >
                                                            <CheckCheck className="mr-2 h-4 w-4" />
                                                            Mark as read
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            window.open(
                                                                `/pages/${notification.pageId}`,
                                                                '_blank'
                                                            )
                                                        }
                                                    >
                                                        <Bell className="mr-2 h-4 w-4" />
                                                        View page
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            deleteNotification(
                                                                notification.id
                                                            )
                                                        }
                                                        className="text-destructive focus:text-destructive"
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    )
                                )}

                                {getFilteredNotifications().length === 0 &&
                                    !isLoading && (
                                        <div className="flex flex-col items-center justify-center py-12 text-center">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                                                <Bell
                                                    size={24}
                                                    className="text-muted-foreground"
                                                />
                                            </div>
                                            <h3 className="mt-4 text-lg font-medium">
                                                {activeTab === 'unread'
                                                    ? 'All caught up!'
                                                    : activeTab === 'mentions'
                                                      ? 'No mentions'
                                                      : 'No notifications'}
                                            </h3>
                                            <p className="mt-2 text-sm text-muted-foreground max-w-sm">
                                                {activeTab === 'unread'
                                                    ? 'You have no unread notifications at the moment.'
                                                    : activeTab === 'mentions'
                                                      ? "You haven't been mentioned in any pages yet."
                                                      : "You're all caught up! Check back later for new notifications."}
                                            </p>
                                        </div>
                                    )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
