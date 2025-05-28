import * as React from "react"
import { NodeViewContent, NodeViewWrapper } from "@tiptap/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import { Input } from "~/components/ui/input"
import { cn } from "~/lib/utils"
import { api } from "~/trpc/react"
import { Button } from "~/components/ui/button"

export const AssignableTaskItemComponent = (props: any) => {
  const [isHovered, setIsHovered] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  const assignedTo = props.node.attrs.assignedTo
  const assignedToName = props.node.attrs.assignedToName

  // Fetch users from the database
  const { data: users, isLoading } = api.user.getAllUsers.useQuery()

  const filteredUsers = users?.filter((user) => 
    user.email.includes(searchQuery)
  )

  const handleAssign = (userId: string, userName: string) => {
    props.updateAttributes({
      assignedTo: userId,
      assignedToName: userName,
    })
  }

  const handleUnassign = () => {
    props.updateAttributes({
      assignedTo: null,
      assignedToName: null,
    })
  }
  
  return (
    <NodeViewWrapper
      className="task-item-wrapper"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-type="taskItem"
      data-checked={props.node.attrs.checked}
    >
      <label className="task-item">
        <input
          type="checkbox"
          checked={props.node.attrs.checked}
          onChange={event => props.updateAttributes({ checked: event.target.checked })}
        />
        <NodeViewContent as="span" className="task-item-content" />
      </label>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button 
            className={cn(
              "task-item-assign-button",
              (isHovered || assignedTo) && "visible",
              !isHovered && !assignedTo && "invisible"
            )}
          >
            {assignedTo ? assignedToName : "Assign"}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="task-item-assign-dropdown" align="end">
          <div className="task-item-assign-search p-2">
            <Input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="mb-2"
            />
          </div>
          <div className="task-item-assign-users">
            {isLoading && <div className="p-2 text-sm text-muted-foreground">Loading users...</div>}
            {!isLoading && filteredUsers!.length === 0 && (
              <div className="p-2 text-sm text-muted-foreground">No users found</div>
            )}
            {!isLoading && filteredUsers!.map((user: any) => (
              <button
                key={user.id}
                className="task-item-assign-user"
                onClick={() => handleAssign(user.id, user.name || user.email)}
              >
                {user.name || user.email}
              </button>
            ))}
            {assignedTo && (
              <Button
                variant="destructive"
                className="task-item-assign-unassign mt-2 w-full"
                onClick={handleUnassign}
              >
                Unassign
              </Button>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </NodeViewWrapper>
  )
}
