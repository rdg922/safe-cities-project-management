'use client'

import { useState } from 'react'
import {
    ChevronRight,
    ChevronDown,
    Folder,
    FileText,
    Sheet,
    ClipboardList,
} from 'lucide-react'
import { cn } from '~/lib/utils'
import { Button } from '~/components/ui/button'

interface FileTreeNode {
    id: number
    name: string
    type?: 'folder' | 'page' | 'sheet' | 'form' | 'programme'
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
}

function FileTreeNodeComponent({
    node,
    level,
    selectedId,
    onSelect,
}: FileTreeNodeProps) {
    const [isExpanded, setIsExpanded] = useState(true)
    const isSelected = selectedId === node.id
    const hasChildren = node.children && node.children.length > 0

    // Only allow folders and programmes to be selectable as parents
    const isSelectable = node.type === 'folder' || node.type === 'programme'

    const getIcon = () => {
        switch (node.type) {
            case 'programme':
                return (
                    <Folder className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                )
            case 'folder':
                return <Folder className="h-4 w-4 text-muted-foreground" />
            case 'page':
                return <FileText className="h-4 w-4 text-muted-foreground" />
            case 'sheet':
                return <Sheet className="h-4 w-4 text-muted-foreground" />
            case 'form':
                return (
                    <ClipboardList className="h-4 w-4 text-muted-foreground" />
                )
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
                    isSelected &&
                        isSelectable &&
                        'bg-primary/10 border border-primary/30',
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
                            node.type === 'programme' &&
                                'font-semibold text-blue-700 dark:text-blue-300'
                        )}
                    >
                        {node.name}
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
                />
            ))}
        </div>
    )
}
