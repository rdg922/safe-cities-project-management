"use client"

import { useState, useRef } from "react"
import { ChevronRight, Folder, FileText, ChevronDown, MoreHorizontal, Edit2, Trash2, Plus } from "lucide-react"
import { cn } from "~/lib/utils"
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { Button } from "~/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"

export type FileNode = {
  id: number
  filename: string
  isFolder?: boolean
  parentId?: number | null
  children?: FileNode[]
}

interface FileTreeProps {
  items: FileNode[]
  onSelectFile?: (fileId: number) => void
  activeFileId?: number
  onMove?: (dragId: number, dropId: number) => void
  onCreateFile?: (parentId: number | null) => void
  onCreateFolder?: (parentId: number | null) => void
  onRename?: (id: number, filename: string) => void
  onDelete?: (id: number) => void
}

interface FileTreeNodeProps {
  node: FileNode
  level: number
  onSelectFile?: (fileId: number) => void
  activeFileId?: number
  onMove?: (dragId: number, dropId: number) => void
  onCreateFile?: (parentId: number | null) => void
  onCreateFolder?: (parentId: number | null) => void
  onRename?: (id: number, filename: string) => void
  onDelete?: (id: number) => void
}

export function FileTree(props: FileTreeProps) {
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-1 py-2">
        {props.items.map((item) => (
          <FileTreeNode 
            key={item.id} 
            node={item} 
            level={0} 
            onSelectFile={props.onSelectFile}
            activeFileId={props.activeFileId}
            onMove={props.onMove}
            onCreateFile={props.onCreateFile}
            onCreateFolder={props.onCreateFolder}
            onRename={props.onRename}
            onDelete={props.onDelete}
          />
        ))}
      </div>
    </DndProvider>
  )
}

const ItemTypes = {
  FILE: 'file',
  FOLDER: 'folder'
}

function FileTreeNode({ 
  node, 
  level, 
  onSelectFile, 
  activeFileId,
  onMove,
  onCreateFile,
  onCreateFolder,
  onRename,
  onDelete
}: FileTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const isActive = activeFileId === node.id
  const nodeRef = useRef<HTMLDivElement>(null)

  // Configure drag source
  const [{ isDragging }, drag] = useDrag(() => ({
    type: node.isFolder ? ItemTypes.FOLDER : ItemTypes.FILE,
    item: { id: node.id, type: node.isFolder ? 'folder' : 'file' },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }))

  // Configure drop target
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: [ItemTypes.FILE, ItemTypes.FOLDER],
    canDrop: (item: any) => {
      // Prevent dropping on itself or dropping a parent into its child
      return item.id !== node.id && (!isParentOfChild(item.id, node))
    },
    hover: (item: any, monitor) => {
      // Auto-expand folders after hovering for a bit
      if (node.isFolder && !isExpanded) {
        setIsExpanded(true);
      }
    },
    hover: (item, monitor) => {
      // Auto-expand folders after hovering for a bit
      if (node.isFolder && !isExpanded) {
        setIsExpanded(true);
      }
    },
    drop: (item: any, monitor) => {
      // Only handle the drop if this component is the direct drop target
      // This prevents the drop from being handled by all parent components
      if (monitor.didDrop()) {
        return;
      }
      if (onMove) {
        onMove(item.id, node.id);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
    }),
  }))

  // Check if potential drop target is a child of the dragged item
  const isParentOfChild = (draggedId: number, targetNode: FileNode): boolean => {
    if (!targetNode.children) return false
    
    return targetNode.children.some(child => 
      child.id === draggedId || (child.children && isParentOfChild(draggedId, child))
    )
  }

  // Connect drag and drop to the ref
  drag(drop(nodeRef))

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded(!isExpanded)
  }

  const handleSelect = () => {
    if (!node.isFolder && onSelectFile) {
      onSelectFile(node.id)
    } else if (node.isFolder) {
      setIsExpanded(!isExpanded)
    }
  }
  
  const handleCreateFile = () => {
    if (onCreateFile) {
      onCreateFile(node.id)
      setIsExpanded(true) // Expand folder when creating new file
    }
  }
  
  const handleCreateFolder = () => {
    if (onCreateFolder) {
      onCreateFolder(node.id)
      setIsExpanded(true) // Expand folder when creating new subfolder
    }
  }
  
  const handleRename = () => {
    if (onRename) {
      // This would typically open a rename dialog
      // For now we'll use a simple prompt
      const newName = prompt("Enter new name:", node.filename)
      if (newName && newName !== node.filename) {
        onRename(node.id, newName)
      }
    }
  }
  
  const handleDelete = () => {
    if (onDelete && confirm(`Are you sure you want to delete ${node.filename}?`)) {
      onDelete(node.id)
    }
  }

  return (
    <div className="flex flex-col">
      <div 
        ref={nodeRef}
        className={cn(
          "flex items-center py-1 rounded-md cursor-pointer hover:bg-sidebar-accent/10",
          isActive && !node.isFolder && "bg-sidebar-accent/20 text-sidebar-accent-foreground",
          isOver && canDrop && node.isFolder && "border-2 border-primary bg-primary/10",
          isOver && canDrop && !node.isFolder && "border-2 border-primary/50",
          isDragging && "opacity-50",
          level > 0 ? "pl-[calc(theme(spacing.6)*var(--level))]" : "pl-2"
        )} 
        style={{ "--level": level } as React.CSSProperties}
        onClick={handleSelect}
      >
        {node.isFolder ? (
          <div className="flex items-center gap-1 flex-1 group">
            <div className="flex items-center" onClick={handleToggle}>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 mr-1 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 mr-1 text-muted-foreground shrink-0" />
              )}
              <Folder className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
            </div>
            <span className="text-sm truncate flex-1">{node.filename}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100">
                  <MoreHorizontal size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleCreateFile}>
                  <FileText size={14} className="mr-2" /> New File
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCreateFolder}>
                  <Folder size={14} className="mr-2" /> New Folder
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleRename}>
                  <Edit2 size={14} className="mr-2" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete}>
                  <Trash2 size={14} className="mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div className="flex items-center gap-1 flex-1 group">
            <div className="ml-5 flex items-center">
              <FileText className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
            </div>
            <span className="text-sm truncate flex-1">{node.filename}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100">
                  <MoreHorizontal size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleRename}>
                  <Edit2 size={14} className="mr-2" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete}>
                  <Trash2 size={14} className="mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
      
      {node.isFolder && isExpanded && node.children && node.children.length > 0 && (
        <div className="flex flex-col">
          {node.children.map((child) => (
            <FileTreeNode 
              key={child.id} 
              node={child} 
              level={level + 1} 
              onSelectFile={onSelectFile}
              activeFileId={activeFileId}
              onMove={onMove}
              onCreateFile={onCreateFile}
              onCreateFolder={onCreateFolder}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
