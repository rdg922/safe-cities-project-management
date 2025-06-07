'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown, Folder, Folders, FileText, Sheet, ClipboardList, UploadCloud } from 'lucide-react'
import { cn } from '~/lib/utils'
import { Button } from '~/components/ui/button'
import { useBatchPermissions } from '~/hooks/use-batch-permissions'

interface FileTreeNode {
    id: number
    name: string
    filename?: string // For compatibility with useBatchPermissions
    type?: 'folder' | 'page' | 'sheet' | 'form' | 'programme' | 'upload'
    isFolder?: boolean
    parentId?: number | null
    children?: FileTreeNode[]
}

interface FileTreeSelectorProps {
    files: FileTreeNode[]
    selectedId?: number | null
    onSelect: (fileId: number | null) => void
    className?: string
}

interface FileTreeNodeProps {
    node: FileTreeNode
    level: number
    selectedId?: number | null
    onSelect: (fileId: number | null) => void
    getPermissions: (fileId: number) => {
        userPermission: any
        canEdit: boolean
        canShare: boolean
    }
}

function FileTreeNodeComponent({
    node,
    level,
    selectedId,
    onSelect,
    getPermissions,
}: FileTreeNodeProps) {
    const [isExpanded, setIsExpanded] = useState(true)
    const isSelected = selectedId === node.id
    const hasChildren = node.children && node.children.length > 0

    // Get permissions for this file
    const permissions = getPermissions(node.id)
    const { userPermission, canEdit } = permissions

    // Only allow folders and programmes to be selectable as parents
    // AND only if the user has edit permissions
    const isBaseSelectable = node.type === 'folder' || node.type === 'programme'
    const isSelectable = isBaseSelectable && canEdit

    // Get permission display text
    const getPermissionText = () => {
        if (!userPermission) return ''
        if (userPermission === 'view') return '(view)'
        if (userPermission === 'comment') return '(comment)'
        return ''
    }

    const getIcon = () => {
        switch (node.type) {
            case 'programme':
                return <Folders className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            case 'folder':
                return <Folder className="h-4 w-4 text-muted-foreground" />
            case 'page':
                return <FileText className="h-4 w-4 text-muted-foreground" />
            case 'sheet':
                return <Sheet className="h-4 w-4 text-muted-foreground" />
            case 'upload':
                return <UploadCloud className="h-4 w-4 text-muted-foreground" />
            case 'form':
                return<ClipboardList className="h-4 w-4 text-muted-foreground" />
            default:
                return <FileText className="h-4 w-4 text-muted-foreground" />
        }
    }

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (hasChildren) {
            setIsExpanded(!isExpanded)
        }
    }

    const handleSelect = () => {
        if (isSelectable) {
            onSelect(node.id)
        }
    }

    return (
        <div className="select-none">
            <div
                className={cn(
                    'flex items-center py-1 px-2 rounded-md transition-colors',
                    isSelectable && 'cursor-pointer hover:bg-muted/50',
                    !isSelectable && 'cursor-not-allowed opacity-50',
                    isSelected && isSelectable && 'bg-primary/10 border border-primary/30',
                    level > 0 ? 'ml-4' : ''
                )}
                onClick={handleSelect}
                style={{ paddingLeft: `${level * 16 + 8}px` }}
            >
                <div className="flex items-center gap-1 flex-1">
                    {hasChildren ? (
                        <button
                            onClick={handleToggle}
                            className="flex items-center p-0 hover:bg-muted rounded"
                        >
                            {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                        </button>
                    ) : (
                        <div className="w-4" />
                    )}

                    {getIcon()}

                    <span
                        className={cn(
                            'text-sm truncate flex-1',
                            node.type === 'programme' && 'font-semibold text-blue-700 dark:text-blue-300',
                            !isSelectable && 'text-muted-foreground'
                        )}
                    >
                        {node.name}
                        {!isSelectable && userPermission && (
                            <span className="ml-1 text-xs italic text-muted-foreground">
                                {getPermissionText()}
                            </span>
                        )}
                    </span>
                </div>
            </div>

            {hasChildren && isExpanded && (
                <div>
                    {node.children!.map((child) => (
                        <FileTreeNodeComponent
                            key={child.id}
                            node={child}
                            level={level + 1}
                            selectedId={selectedId}
                            onSelect={onSelect}
                            getPermissions={getPermissions}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

export function FileTreeSelector({
    files,
    selectedId,
    onSelect,
    className,
}: FileTreeSelectorProps) {
    // Transform FileTreeNode[] to FileNode[] for useBatchPermissions compatibility
    const transformToFileNodes = (nodes: FileTreeNode[]): any[] => {
        return nodes.map((node) => ({
            ...node,
            filename: node.filename || node.name, // Ensure filename is present
            children: node.children
                ? transformToFileNodes(node.children)
                : undefined,
        }))
    }

    const fileNodes = transformToFileNodes(files)

    // Get batch permissions for all files in the tree
    const { getPermissions, isLoading } = useBatchPermissions(fileNodes)

    // Show loading state while permissions are being fetched
    if (isLoading) {
        return (
            <div
                className={cn(
                    'border rounded-md p-2 max-h-64 overflow-y-auto flex items-center justify-center',
                    className
                )}
            >
                <div className="text-sm text-muted-foreground">
                    Loading permissions...
                </div>
            </div>
        )
    }

    return (
        <div
            className={cn(
                'border rounded-md p-2 max-h-64 overflow-y-auto',
                className
            )}
        >
            {files.map((file) => (
                <FileTreeNodeComponent
                    key={file.id}
                    node={file}
                    level={0}
                    selectedId={selectedId}
                    onSelect={onSelect}
                    getPermissions={getPermissions}
                />
            ))}
        </div>
    )
}
