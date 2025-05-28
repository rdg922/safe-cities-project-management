"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronRight, Folder, FileText, ChevronDown, MoreHorizontal, Edit2, Trash2, Plus, AlertCircle, Sheet } from "lucide-react"
import { cn } from "~/lib/utils"
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { Button } from "~/components/ui/button"
import { useToast } from "~/hooks/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"

export type FileNode = {
  id: number
  filename: string
  name?: string // Some files might use 'name' instead of 'filename'
  type?: 'folder' | 'page' | 'sheet'
  isFolder?: boolean
  parentId?: number | null
  children?: FileNode[]
}

interface FileTreeProps {
  items: FileNode[]
  onSelectFile?: (fileId: number) => void
  activeFileId?: number
  selectedFileIds?: number[]
  onMultiSelectFile?: (fileIds: number[]) => void
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
  selectedFileIds?: number[]
  onMultiSelectFile?: (fileIds: number[]) => void
  onMove?: (dragId: number, dropId: number) => void
  onCreateFile?: (parentId: number | null) => void
  onCreateFolder?: (parentId: number | null) => void
  onRename?: (id: number, filename: string) => void
  onDelete?: (id: number) => void
}

export function FileTree(props: FileTreeProps) {
  // Create a ref to store component data for range selection
  const rootRef = useRef<HTMLDivElement>(null)
  
  // Store the props in the DOM element for access from child components
  useEffect(() => {
    if (rootRef.current) {
      (rootRef.current as any).__fileTreeProps = props
    }
  }, [props])
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle keyboard shortcuts if the tree has focus
      const treeElement = rootRef.current
      if (!treeElement || !document.activeElement || !treeElement.contains(document.activeElement)) {
        return
      }
      
      // Delete key - delete selected items
      if ((e.key === 'Delete' || e.key === 'Backspace') && props.selectedFileIds?.length && props.onDelete) {
        e.preventDefault()
        
        const selectedId = props.selectedFileIds[0]
        if (selectedId !== undefined) {
          if (props.selectedFileIds.length === 1) {
            props.onDelete(selectedId)
          } else if (confirm(`Are you sure you want to delete ${props.selectedFileIds.length} selected items?`)) {
            // Multi-delete handled in the parent component
            props.onDelete(selectedId)
          }
        }
      }
    }
    
    // Add event listener
    window.addEventListener('keydown', handleKeyDown)
    
    // Clean up
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [props.selectedFileIds, props.onDelete])

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-1 py-2" ref={rootRef} data-file-tree-root="true">
        {props.items.map((item) => (
          <FileTreeNode 
            key={item.id} 
            node={item} 
            level={0} 
            onSelectFile={props.onSelectFile}
            activeFileId={props.activeFileId}
            selectedFileIds={props.selectedFileIds}
            onMultiSelectFile={props.onMultiSelectFile}
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
  selectedFileIds = [],
  onMultiSelectFile,
  onMove,
  onCreateFile,
  onCreateFolder,
  onRename,
  onDelete
}: FileTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isDraggedOver, setIsDraggedOver] = useState(false)
  const [isDropSuccess, setIsDropSuccess] = useState(false)
  const [isDropError, setIsDropError] = useState(false)
  const expandTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isActive = activeFileId === node.id
  const isSelected = selectedFileIds.includes(node.id)
  const nodeRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

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
      // Auto-expand folders after hovering for a second
      if (node.isFolder && !isExpanded) {
        if (expandTimeoutRef.current) clearTimeout(expandTimeoutRef.current);
        
        expandTimeoutRef.current = setTimeout(() => {
          setIsExpanded(true);
        }, 800); // Expand after 800ms of hovering
      }
      
      setIsDraggedOver(true);
    },
    drop: (item: any, monitor) => {
      // Only handle the drop if this component is the direct drop target
      if (monitor.didDrop()) {
        return;
      }
      
      if (onMove) {
        try {
          // Show visual feedback
          setIsDropSuccess(true);
          
          // Auto-expand folder when an item is dropped onto it
          if (node.isFolder && !isExpanded) {
            setIsExpanded(true);
          }
          
          onMove(item.id, node.id);
          
          // Clear success animation after 1 second
          animationTimeoutRef.current = setTimeout(() => {
            setIsDropSuccess(false);
          }, 1000);
        } catch (error) {
          // Show error feedback
          setIsDropError(true);
          toast({
            title: "Error moving item",
            description: "Failed to move the item. Please try again.",
            variant: "destructive",
          });
          
          // Clear error animation after 1.5 seconds
          animationTimeoutRef.current = setTimeout(() => {
            setIsDropError(false);
          }, 1500);
        }
      }
      
      return { dropped: true };
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
    }),
  }))

  // Clear the timeouts when unmounting
  useEffect(() => {
    return () => {
      if (expandTimeoutRef.current) {
        clearTimeout(expandTimeoutRef.current);
      }
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);
  
  // Reset dragged over state when mouse leaves
  useEffect(() => {
    if (!isOver && isDraggedOver) {
      setIsDraggedOver(false);
      if (expandTimeoutRef.current) {
        clearTimeout(expandTimeoutRef.current);
        expandTimeoutRef.current = null;
      }
    }
  }, [isOver, isDraggedOver]);

  // Check if potential drop target is a child of the dragged item
  const isParentOfChild = (draggedId: number, targetNode: FileNode): boolean => {
    if (!targetNode.children) return false;
    
    return targetNode.children.some(child => 
      child.id === draggedId || (child.children && isParentOfChild(draggedId, child))
    );
  }

  // Connect drag and drop to the ref
  drag(drop(nodeRef))

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded(!isExpanded)
  }

  const handleSelect = (e: React.MouseEvent) => {
    // For folders, toggle expansion unless multi-selection is active
    if (node.isFolder && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      setIsExpanded(!isExpanded)
      return
    }
    
    // Handle multi-selection
    if (onMultiSelectFile) {
      let newSelectedIds = [...selectedFileIds]
      
      // Ctrl/Cmd click - toggle selection
      if (e.ctrlKey || e.metaKey) {
        if (isSelected) {
          // Remove from selection
          newSelectedIds = newSelectedIds.filter(id => id !== node.id)
        } else {
          // Add to selection
          newSelectedIds.push(node.id)
        }
      } 
      // Shift click - select range (only for files, not folders)
      else if (e.shiftKey && activeFileId && !node.isFolder) {
        // Get all files in the tree as a flat array
        const allFiles: number[] = []
        const collectFiles = (nodes: FileNode[] | undefined) => {
          if (!nodes) return
          nodes.forEach(n => {
            // Only collect files, not folders for range selection
            if (!n.isFolder) allFiles.push(n.id)
            collectFiles(n.children)
          })
        }
        
        // Get the parent component to provide all items
        const root = document.querySelector('[data-file-tree-root="true"]')
        if (root) {
          const fileTreeProps = (root as any).__fileTreeProps
          if (fileTreeProps?.items) {
            collectFiles(fileTreeProps.items)
          }
        }
        
        // Sort the IDs to ensure we get a proper range
        allFiles.sort((a, b) => a - b)
        
        // Find start and end index
        const startIdx = allFiles.indexOf(activeFileId)
        const endIdx = allFiles.indexOf(node.id)
        
        if (startIdx !== -1 && endIdx !== -1) {
          // Get the range of IDs
          const min = Math.min(startIdx, endIdx)
          const max = Math.max(startIdx, endIdx)
          const rangeIds = allFiles.slice(min, max + 1)
          
          // Add any IDs that are already selected
          newSelectedIds = [...new Set([...newSelectedIds, ...rangeIds])]
        }
      } 
      // Regular click - select just this one
      else {
        newSelectedIds = [node.id]
        if (onSelectFile) {
          onSelectFile(node.id)
        }
      }
      
      onMultiSelectFile(newSelectedIds)
    } 
    // Regular single selection
    else if (!node.isFolder && onSelectFile) {
      onSelectFile(node.id)
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
      const currentName = node.filename || node.name
      const newName = prompt("Enter new name:", currentName)
      if (newName && newName !== currentName) {
        onRename(node.id, newName)
      }
    }
  }
  
  const handleDelete = () => {
    const fileName = node.filename || node.name
    if (onDelete && confirm(`Are you sure you want to delete ${fileName}?`)) {
      onDelete(node.id)
    }
  }

  return (
    <div className="flex flex-col">
      <div 
        ref={nodeRef}
        className={cn(
          "flex items-center py-1 rounded-md cursor-pointer hover:bg-sidebar-accent/10 transition-all duration-200",
          isActive && !node.isFolder && "bg-sidebar-accent/20 text-sidebar-accent-foreground",
          isSelected && !isActive && "bg-sidebar-accent/10 text-sidebar-accent-foreground border border-sidebar-accent/30",
          isOver && canDrop && node.isFolder && "border-2 border-primary bg-primary/10",
          isOver && canDrop && !node.isFolder && "border-2 border-primary/50",
          isDragging && "opacity-50",
          isDropSuccess && "bg-green-500/20 border-green-500 border-2 animate-pulse",
          isDropError && "bg-red-500/20 border-red-500 border-2 animate-pulse",
          level > 0 ? "pl-[calc(theme(spacing.6)*var(--level))]" : "pl-2"
        )} 
        style={{ "--level": level } as React.CSSProperties}
        onClick={(e) => handleSelect(e)}
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
            <span className="text-sm truncate flex-1">{node.filename || node.name}</span>
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
              {node.type === 'sheet' ? (
                <Sheet className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
              ) : (
                <FileText className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
              )}
            </div>
            <span className="text-sm truncate flex-1">{node.filename || node.name}</span>
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
              selectedFileIds={selectedFileIds}
              onMultiSelectFile={onMultiSelectFile}
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
