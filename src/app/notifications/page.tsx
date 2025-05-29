"use client"

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { api } from "~/trpc/react"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs"
import { Bell, CheckCheck, Archive, MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "~/components/ui/dropdown-menu"
import { toast } from "~/hooks/use-toast"
import { useState } from "react"

export default function NotificationsPage() {
  // Fetch notifications from backend
  const { data: notifications = [], refetch } = api.notification.getAll.useQuery()
  const markAsReadMutation = api.notification.markAsRead.useMutation()
  const markAllAsReadMutation = api.notification.markAllAsRead.useMutation()

  const [activeTab, setActiveTab] = useState("all")

  const unreadNotifications = notifications.filter((n) => !n.read)
  const mentionNotifications = notifications.filter((n) => n.type === "mention")

  const markAsRead = async (notificationId: number) => {
    await markAsReadMutation.mutateAsync({ id: notificationId })
    toast({ title: "Notification marked as read" })
    refetch()
  }

  const markAllAsRead = async () => {
    await markAllAsReadMutation.mutateAsync()
    toast({ title: "All notifications marked as read" })
    refetch()
  }

const getFilteredNotifications = () => {
  switch (activeTab) {
    case "unread":
      return unreadNotifications
    case "mentions":
      return mentionNotifications
    default:
      return notifications
    // archived notifications are unimplemented for now
  }
}

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground mt-1">Stay updated on mentions, comments, and changes</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={markAllAsRead}>
          <CheckCheck size={16} />
          Mark all as read
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">
            Unread{" "}
            <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
              {unreadNotifications.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="mentions">Mentions</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-0">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>
                {activeTab === "all"
                  ? "All Notifications"
                  : activeTab === "unread"
                  ? "Unread Notifications" : "Mentions"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {getFilteredNotifications().map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-center gap-4 p-4 ${notification.read ? "" : "bg-muted/30"}`}
                  >
                    <div className="relative">

                      {!notification.read && (
                        <span className="absolute -right-1 -top-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-medium">{notification.userName}</span>{" "}
                        <span>{notification.content}</span>
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!notification.read && (
                          <DropdownMenuItem onClick={() => markAsRead(notification.id)}>
                            <CheckCheck className="mr-2 h-4 w-4" />
                            Mark as read
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}

                {getFilteredNotifications().length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      {activeTab === "archived" ? (
                        <Archive size={24} className="text-muted-foreground" />
                      ) : (
                        <Bell size={24} className="text-muted-foreground" />
                      )}
                    </div>
                    <h3 className="mt-4 text-lg font-medium">
                      {activeTab === "unread"
                        ? "All caught up!"
                        : activeTab === "archived"
                        ? "No archived notifications"
                        : activeTab === "mentions"
                        ? "No mentions"
                        : "No notifications"}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {activeTab === "unread"
                        ? "You have no unread notifications at the moment."
                        : activeTab === "archived"
                        ? "You haven't archived any notifications yet."
                        : activeTab === "mentions"
                        ? "You haven't been mentioned in any pages or chats yet."
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
