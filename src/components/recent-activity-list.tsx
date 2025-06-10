import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { Bell } from "lucide-react"
import { Badge } from "~/components/ui/badge"
import { formatDistanceToNow } from "date-fns"

interface RecentActivityListProps {
  notifications: any[] | undefined;
  isLoading: boolean;
}

export function RecentActivityList({ notifications, isLoading }: RecentActivityListProps) {

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!notifications || notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Bell size={24} className="text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-medium">No recent activity</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          When you or your team members make changes, they'll appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {notifications.slice(0, 5).map((notification) => (
        <div key={notification.id} className="flex items-center gap-3 p-4">
          <Avatar className="h-8 w-8">
            <AvatarFallback>
              {(notification.userName ?? "U").split(" ").map(n => n[0]).join("").toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm">
                <span className="font-medium">{notification.userName || "Unknown User"}</span>
              </p>
              <Badge variant="secondary" className="text-xs">
                {notification.type || "notification"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{notification.content}</p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
