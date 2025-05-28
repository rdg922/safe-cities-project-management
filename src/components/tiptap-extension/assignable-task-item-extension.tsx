import { ReactNodeViewRenderer } from "@tiptap/react"
import { TaskItem } from "@tiptap/extension-task-item"
import { AssignableTaskItemComponent } from "~/components/tiptap-ui/assignable-task-item"

export const AssignableTaskItem = TaskItem.extend({
  name: "taskItem",
  
  addAttributes() {
    return {
      ...this.parent?.(),
      assignedTo: {
        default: null,
        parseHTML: element => element.getAttribute('data-assigned-to'),
        renderHTML: attributes => {
          if (!attributes.assignedTo) {
            return {}
          }
          
          return {
            'data-assigned-to': attributes.assignedTo,
          }
        },
      },
      assignedToName: {
        default: null,
        parseHTML: element => element.getAttribute('data-assigned-to-name'),
        renderHTML: attributes => {
          if (!attributes.assignedToName) {
            return {}
          }
          
          return {
            'data-assigned-to-name': attributes.assignedToName,
          }
        },
      }
    }
  },
  
  addNodeView() {
    return ReactNodeViewRenderer(AssignableTaskItemComponent)
  },
})
