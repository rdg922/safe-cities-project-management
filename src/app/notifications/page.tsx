"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "~/app/_components/ui/avatar"
import { Button } from "~/app/_components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/app/_components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/app/_components/ui/tabs"
import { Bell, CheckCheck, Archive, MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "~/app/_components/ui/dropdown-menu"
import { toast } from "~/hooks/use-toast"

// Update the component to be client-side
export default function NotificationsPage() {
  // Sample notification data
  const initialNotifications = [
    {
      id: 1,
      type: "mention",
      user: {
        name: "Sarah Johnson",
        avatar: "/placeholder.svg?height=32&width=32",
        initials: "SJ",
      },
      content: "mentioned you in Community Outreach Timeline",
      time: "2 hours ago",
      read: false,
      archived: false,
    },
    {
      id: 2,
      type: "comment",
      user: {
        name: "Michael Brown",
        avatar: "/placeholder.svg?height=32&width=32",
        initials: "MB",
      },
      content: "commented on Education Initiative Curriculum",
      time: "4 hours ago",
      read: false,
      archived: false,
    },
    {
      id: 3,
      type: "edit",
      user: {
        name: "Emily Wilson",
        avatar: "/placeholder.svg?height=32&width=32",
        initials: "EW",
      },
      content: "edited Fundraising Budget",
      time: "1 day ago",
      read: true,
      archived: false,
    },
    {
      id: 4,
      type: "mention",
      user: {
        name: "David Lee",
        avatar: "/placeholder.svg?height=32&width=32",
        initials: "DL",
      },
      content: "mentioned you in Donors List",
      time: "2 days ago",
      read: true,
      archived: false,
    },
    {
      id: 5,
      type: "share",
      user: {
        name: "Jessica Taylor",
        avatar: "/placeholder.svg?height=32&width=32",
        initials: "JT",
      },
      content: "shared Community Outreach Overview with you",
      time: "3 days ago",
      read: true,
      archived: true,
    },
  ]

  const [notifications, setNotifications] = useState(initialNotifications)
  const [activeTab, setActiveTab] = useState("all")

  const unreadNotifications = notifications.filter((n) => !n.read && !n.archived)
  const archivedNotifications = notifications.filter((n) => n.archived)
  const mentionNotifications = notifications.filter((n) => n.type === "mention" && !n.archived)

  const markAsRead = (notificationId: number) => {
    setNotifications(
      notifications.map((notification) =>
        notification.id === notificationId ? { ...notification, read: true } : notification,
      ),
    )
    toast({
      title: "Notification marked as read",
      description: "The notification has been marked as read.",
    })
  }

  const markAllAsRead = () => {
    setNotifications(notifications.map((notification) => ({ ...notification, read: true })))
    toast({
      title: "All notifications marked as read",
      description: "All notifications have been marked as read.",
    })
  }

  const archiveNotification = (notificationId: number) => {
    setNotifications(
      notifications.map((notification) =>
        notification.id === notificationId ? { ...notification, archived: true } : notification,
      ),
    )
    toast({
      title: "Notification archived",
      description: "The notification has been archived.",
    })
  }

  const unarchiveNotification = (notificationId: number) => {
    setNotifications(
      notifications.map((notification) =>
        notification.id === notificationId ? { ...notification, archived: false } : notification,
      ),
    )
    toast({
      title: "Notification restored",
      description: "The notification has been restored from archive.",
    })
  }

  const getFilteredNotifications = () => {
    switch (activeTab) {
      case "unread":
        return unreadNotifications
      case "mentions":
        return mentionNotifications
      case "archived":
        return archivedNotifications
      default:
        return notifications.filter((n) => !n.archived)
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
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-0">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>
                {activeTab === "all"
                  ? "All Notifications"
                  : activeTab === "unread"
                    ? "Unread Notifications"
                    : activeTab === "mentions"
                      ? "Mentions"
                      : "Archived Notifications"}
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
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={notification.user.avatar || "/placeholder.svg"}
                          alt={notification.user.name}
                        />
                        <AvatarFallback>{notification.user.initials}</AvatarFallback>
                      </Avatar>
                      {!notification.read && (
                        <span className="absolute -right-1 -top-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-medium">{notification.user.name}</span>{" "}
                        <span>{notification.content}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
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
                        {!notification.archived ? (
                          <DropdownMenuItem onClick={() => archiveNotification(notification.id)}>
                            <Archive className="mr-2 h-4 w-4" />
                            Archive
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => unarchiveNotification(notification.id)}>
                            <Archive className="mr-2 h-4 w-4" />
                            Unarchive
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
