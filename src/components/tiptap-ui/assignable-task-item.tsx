import * as React from "react"
import { NodeViewContent, NodeViewWrapper } from "@tiptap/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import { Input } from "~/components/ui/input"
import { cn } from "~/lib/utils"

// Mock data for users - in a real application, you'd fetch this from an API
const MOCK_USERS = [
  { id: "user1", name: "John Doe" },
  { id: "user2", name: "Jane Smith" },
  { id: "user3", name: "Robert Johnson" },
  { id: "user4", name: "Emily Davis" },
  { id: "user5", name: "Michael Brown" },
]

export const AssignableTaskItemComponent = (props: any) => {
  const [isHovered, setIsHovered] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  
  const assignedTo = props.node.attrs.assignedTo
  const assignedToName = props.node.attrs.assignedToName
  
  const filteredUsers = MOCK_USERS.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
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
            {filteredUsers.map(user => (
              <button
                key={user.id}
                className="task-item-assign-user"
                onClick={() => handleAssign(user.id, user.name)}
              >
                {user.name}
              </button>
            ))}
            {assignedTo && (
              <button
                className="task-item-assign-unassign"
                onClick={handleUnassign}
              >
                Unassign
              </button>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </NodeViewWrapper>
  )
}
