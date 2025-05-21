import { Avatar, AvatarFallback, AvatarImage } from "~/app/_components/ui/avatar"
import { Button } from "~/app/_components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/app/_components/ui/card"
import { Input } from "~/app/_components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "~/app/_components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/app/_components/ui/table"
import { Badge } from "~/app/_components/ui/badge"
import { MoreHorizontal, Search, UserPlus } from "lucide-react"

// Sample user data
const users = [
  {
    id: "user-1",
    name: "John Doe",
    email: "john.doe@example.com",
    role: "Admin",
    status: "Active",
    avatar: "/placeholder.svg?height=40&width=40",
    initials: "JD",
    lastActive: "2 hours ago",
  },
  {
    id: "user-2",
    name: "Sarah Johnson",
    email: "sarah.johnson@example.com",
    role: "Editor",
    status: "Active",
    avatar: "/placeholder.svg?height=40&width=40",
    initials: "SJ",
    lastActive: "1 hour ago",
  },
  {
    id: "user-3",
    name: "Michael Brown",
    email: "michael.brown@example.com",
    role: "Editor",
    status: "Active",
    avatar: "/placeholder.svg?height=40&width=40",
    initials: "MB",
    lastActive: "3 hours ago",
  },
  {
    id: "user-4",
    name: "Emily Wilson",
    email: "emily.wilson@example.com",
    role: "Viewer",
    status: "Active",
    avatar: "/placeholder.svg?height=40&width=40",
    initials: "EW",
    lastActive: "Yesterday",
  },
  {
    id: "user-5",
    name: "David Lee",
    email: "david.lee@example.com",
    role: "Editor",
    status: "Inactive",
    avatar: "/placeholder.svg?height=40&width=40",
    initials: "DL",
    lastActive: "1 week ago",
  },
  {
    id: "user-6",
    name: "Jessica Taylor",
    email: "jessica.taylor@example.com",
    role: "Viewer",
    status: "Pending",
    avatar: "/placeholder.svg?height=40&width=40",
    initials: "JT",
    lastActive: "Never",
  },
]

export default function UsersPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground mt-1">Manage users and their permissions</p>
        </div>
        <Button className="gap-2">
          <UserPlus size={16} />
          Invite User
        </Button>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search users..." className="pl-10" />
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Role: All</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>All Roles</DropdownMenuItem>
              <DropdownMenuItem>Admin</DropdownMenuItem>
              <DropdownMenuItem>Editor</DropdownMenuItem>
              <DropdownMenuItem>Viewer</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Status: All</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>All Statuses</DropdownMenuItem>
              <DropdownMenuItem>Active</DropdownMenuItem>
              <DropdownMenuItem>Inactive</DropdownMenuItem>
              <DropdownMenuItem>Pending</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                        <AvatarFallback>{user.initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === "Admin" ? "default" : "outline"}>{user.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        user.status === "Active"
                          ? "border-green-200 bg-green-100 text-green-800"
                          : user.status === "Pending"
                            ? "border-yellow-200 bg-yellow-100 text-yellow-800"
                            : "border-gray-200 bg-gray-100 text-gray-800"
                      }
                    >
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.lastActive}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal size={16} />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit User</DropdownMenuItem>
                        <DropdownMenuItem>Change Role</DropdownMenuItem>
                        <DropdownMenuItem>Reset Password</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Deactivate</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
