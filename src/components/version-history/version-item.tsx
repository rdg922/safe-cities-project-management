import React from 'react'
import { Card, CardContent, CardHeader } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { formatDistanceToNow } from 'date-fns'
import { RotateCcwIcon, TrashIcon, UserIcon } from 'lucide-react'
import type { VersionItemProps } from './types'

export function VersionItem({
    version,
    fileType,
    onRestore,
    onDelete,
    onPreview,
    isRestoring,
    isDeleting,
}: VersionItemProps) {
    const getFileTypeLabel = () => {
        switch (fileType) {
            case 'page':
                return 'Page'
            case 'sheet':
                return 'Sheet'
            case 'form':
                return 'Form'
            case 'document':
                return 'Document'
            default:
                return 'File'
        }
    }

    const getContentInfo = () => {
        switch (fileType) {
            case 'sheet':
                try {
                    const parsed = JSON.parse(version.content)
                    const rowCount = parsed?.rows?.length || 0
                    const cellCount = parsed?.cells?.flat?.()?.length || 0
                    return `${rowCount} rows, ${cellCount} cells`
                } catch {
                    return `${version.content.length} characters`
                }
            case 'form':
                try {
                    const parsed = JSON.parse(version.content)
                    const fieldCount = parsed?.fields?.length || 0
                    return `${fieldCount} fields`
                } catch {
                    return `${version.content.length} characters`
                }
            default:
                return `${version.content.length} characters`
        }
    }

    return (
        <Card className="relative transition-all duration-200 hover:shadow-md focus-within:ring-2 focus-within:ring-primary/20">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Badge variant="outline">
                            {getFileTypeLabel()} v{version.version}
                        </Badge>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <UserIcon className="h-4 w-4" />
                            {version.createdBy?.name || 'Unknown User'}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPreview(version.content)}
                        >
                            Preview
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onRestore(version.id)}
                            disabled={isRestoring}
                        >
                            <RotateCcwIcon className="h-4 w-4 mr-1" />
                            Restore
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onDelete(version.id)}
                            disabled={isDeleting}
                        >
                            <TrashIcon className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                        {formatDistanceToNow(new Date(version.createdAt), {
                            addSuffix: true,
                        })}
                    </span>
                    {version.changeDescription && (
                        <span className="italic">
                            {version.changeDescription}
                        </span>
                    )}
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                    Content: {getContentInfo()}
                </div>
            </CardContent>
        </Card>
    )
}
