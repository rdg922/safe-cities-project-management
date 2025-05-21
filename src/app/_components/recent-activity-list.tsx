import { Avatar, AvatarFallback, AvatarImage } from "~/app/_components/ui/avatar"

const activities = [
  {
    id: 1,
    user: {
      name: "John Doe",
      avatar: "/placeholder.svg?height=32&width=32",
      initials: "JD",
    },
    action: "edited",
    target: "Community Outreach Overview",
    time: "2 hours ago",
  },
  {
    id: 2,
    user: {
      name: "Sarah Johnson",
      avatar: "/placeholder.svg?height=32&width=32",
      initials: "SJ",
    },
    action: "commented on",
    target: "Education Initiative Curriculum",
    time: "4 hours ago",
  },
  {
    id: 3,
    user: {
      name: "Michael Brown",
      avatar: "/placeholder.svg?height=32&width=32",
      initials: "MB",
    },
    action: "created",
    target: "Fundraising Budget",
    time: "1 day ago",
  },
  {
    id: 4,
    user: {
      name: "Emily Wilson",
      avatar: "/placeholder.svg?height=32&width=32",
      initials: "EW",
    },
    action: "mentioned you in",
    target: "Community Outreach Timeline",
    time: "1 day ago",
  },
  {
    id: 5,
    user: {
      name: "David Lee",
      avatar: "/placeholder.svg?height=32&width=32",
      initials: "DL",
    },
    action: "updated",
    target: "Donors List",
    time: "2 days ago",
  },
]

export function RecentActivityList() {
  return (
    <div className="divide-y">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-center gap-3 p-4">
          <Avatar className="h-8 w-8">
            <AvatarImage src={activity.user.avatar || "/placeholder.svg"} alt={activity.user.name} />
            <AvatarFallback>{activity.user.initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <p className="text-sm">
              <span className="font-medium">{activity.user.name}</span>{" "}
              <span className="text-muted-foreground">{activity.action}</span>{" "}
              <span className="font-medium">{activity.target}</span>
            </p>
            <p className="text-xs text-muted-foreground">{activity.time}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
