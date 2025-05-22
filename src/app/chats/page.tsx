import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { MessageSquare, Plus, Search } from "lucide-react"

// Sample chat data
const chats = [
  {
    id: "chat-1",
    name: "Community Outreach Team",
    lastMessage: "Sarah: Let's finalize the event schedule by Friday.",
    timestamp: "2 hours ago",
    unread: 3,
    members: [
      { name: "John Doe", avatar: "/placeholder.svg?height=32&width=32", initials: "JD" },
      { name: "Sarah Johnson", avatar: "/placeholder.svg?height=32&width=32", initials: "SJ" },
      { name: "Michael Brown", avatar: "/placeholder.svg?height=32&width=32", initials: "MB" },
    ],
  },
  {
    id: "chat-2",
    name: "Education Initiative",
    lastMessage: "Emily: I've uploaded the new curriculum documents.",
    timestamp: "Yesterday",
    unread: 0,
    members: [
      { name: "Emily Wilson", avatar: "/placeholder.svg?height=32&width=32", initials: "EW" },
      { name: "David Lee", avatar: "/placeholder.svg?height=32&width=32", initials: "DL" },
      { name: "Jessica Taylor", avatar: "/placeholder.svg?height=32&width=32", initials: "JT" },
    ],
  },
  {
    id: "chat-3",
    name: "Fundraising Committee",
    lastMessage: "Robert: The gala venue is confirmed for November 15.",
    timestamp: "2 days ago",
    unread: 0,
    members: [
      { name: "Robert Chen", avatar: "/placeholder.svg?height=32&width=32", initials: "RC" },
      { name: "Lisa Wang", avatar: "/placeholder.svg?height=32&width=32", initials: "LW" },
      { name: "Andrew Kim", avatar: "/placeholder.svg?height=32&width=32", initials: "AK" },
    ],
  },
  {
    id: "chat-4",
    name: "Website Redesign",
    lastMessage: "You: Can we schedule a meeting to review the mockups?",
    timestamp: "1 week ago",
    unread: 0,
    members: [
      { name: "John Doe", avatar: "/placeholder.svg?height=32&width=32", initials: "JD" },
      { name: "Emily Wilson", avatar: "/placeholder.svg?height=32&width=32", initials: "EW" },
      { name: "David Lee", avatar: "/placeholder.svg?height=32&width=32", initials: "DL" },
    ],
  },
]

export default function ChatsPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chats</h1>
          <p className="text-muted-foreground mt-1">Collaborate with your team in real-time</p>
        </div>
        <Button className="gap-2">
          <Plus size={16} />
          New Chat
        </Button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search chats..." className="pl-10" />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Recent Chats</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {chats.map((chat) => (
              <div key={chat.id} className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer">
                <div className="flex-shrink-0 relative">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>
                      <MessageSquare size={20} />
                    </AvatarFallback>
                  </Avatar>
                  {chat.unread > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                      {chat.unread}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium truncate">{chat.name}</h3>
                    <span className="text-xs text-muted-foreground">{chat.timestamp}</span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{chat.lastMessage}</p>
                </div>
                <div className="flex-shrink-0 flex -space-x-2">
                  {chat.members.slice(0, 3).map((member, index) => (
                    <Avatar key={index} className="h-6 w-6 border-2 border-background">
                      <AvatarImage src={member.avatar || "/placeholder.svg"} alt={member.name} />
                      <AvatarFallback>{member.initials}</AvatarFallback>
                    </Avatar>
                  ))}
                  {chat.members.length > 3 && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px]">
                      +{chat.members.length - 3}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {chats.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <MessageSquare size={24} className="text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-medium">No chats yet</h3>
                <p className="mt-2 text-sm text-muted-foreground">Start a new chat to collaborate with your team.</p>
                <Button className="mt-4 gap-2">
                  <Plus size={16} />
                  New Chat
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
