'use client'

import React, { useState } from 'react'
import { api } from '~/trpc/react'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Separator } from '~/components/ui/separator'
import { toast } from '~/hooks/use-toast'
import { formatDistanceToNow } from 'date-fns'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '~/components/ui/alert-dialog'
import { HistoryIcon, RotateCcwIcon, TrashIcon, UserIcon } from 'lucide-react'
import { SimpleEditor } from '~/components/tiptap-templates/simple/simple-editor'

interface VersionHistoryProps {
    fileId: number
    isOpen: boolean
    onClose: () => void
    onRestore?: (content: string) => void
}

export function VersionHistory({
    fileId,
    isOpen,
    onClose,
    onRestore,
}: VersionHistoryProps) {
    const [selectedVersion, setSelectedVersion] = useState<number | null>(null)
    const [previewContent, setPreviewContent] = useState<string | null>(null)
    const [showPreview, setShowPreview] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [versionToDelete, setVersionToDelete] = useState<number | null>(null)

    const utils = api.useUtils()

    // Fetch version history
    const {
        data: versions,
        isLoading,
        refetch,
    } = api.files.getPageVersionHistory.useQuery(
        { fileId, limit: 30 },
        { enabled: isOpen && !!fileId }
    )

    // Restore version mutation
    const restoreVersionMutation = api.files.restorePageVersion.useMutation({
        onSuccess: (data) => {
            toast({
                title: 'Version restored',
                description: `Successfully restored to version ${data.restoredToVersion}`,
            })
            // Find the restored version and pass its content to onRestore
            const restoredVersion = versions?.find(
                (v) => v.version === data.restoredToVersion
            )
            if (restoredVersion && onRestore) {
                onRestore(restoredVersion.content)
            }
            onClose()
            // Invalidate relevant queries
            utils.files.getById.invalidate({ id: fileId })
        },
        onError: (error) => {
            toast({
                title: 'Failed to restore version',
                description: error.message,
                variant: 'destructive',
            })
        },
    })

    // Delete version mutation
    const deleteVersionMutation = api.files.deletePageVersion.useMutation({
        onSuccess: () => {
            toast({
                title: 'Version deleted',
                description: 'Version successfully deleted from history',
            })
            refetch()
            setShowDeleteConfirm(false)
            setVersionToDelete(null)
        },
        onError: (error) => {
            toast({
                title: 'Failed to delete version',
                description: error.message,
                variant: 'destructive',
            })
        },
    })

    const handleRestore = (versionId: number) => {
        setSelectedVersion(versionId)
        restoreVersionMutation.mutate({ fileId, versionId })
    }

    const handleDelete = (versionId: number) => {
        setVersionToDelete(versionId)
        setShowDeleteConfirm(true)
    }

    const confirmDelete = () => {
        if (versionToDelete) {
            deleteVersionMutation.mutate({ fileId, versionId: versionToDelete })
        }
    }

    const handlePreview = (content: string) => {
        setPreviewContent(content)
        setShowPreview(true)
    }

    if (!isOpen) return null

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-4xl h-[80vh] min-h-[600px] sm:h-[85vh] sm:min-h-[700px] md:h-[90vh] md:min-h-[800px] w-[95vw] sm:w-full flex flex-col">
                    <DialogHeader className="flex-shrink-0">
                        <DialogTitle className="flex items-center gap-2">
                            <HistoryIcon className="h-5 w-5" />
                            Version History
                        </DialogTitle>
                        <DialogDescription>
                            View and manage previous versions of this page. You
                            can restore any version or preview its content.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 min-h-0 overflow-hidden">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin h-6 w-6 border-2 border-primary rounded-full border-t-transparent" />
                                <span className="ml-2 text-muted-foreground">
                                    Loading version history...
                                </span>
                            </div>
                        ) : !versions || versions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <HistoryIcon className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                                    No version history
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    No previous versions are available for this
                                    page.
                                </p>
                            </div>
                        ) : (
                            <div className="h-full overflow-y-auto px-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800 hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-500 scroll-smooth">
                                <div className="space-y-3 pr-2 py-2">
                                    {versions.map((version, index) => (
                                        <Card
                                            key={version.id}
                                            className="relative transition-all duration-200 hover:shadow-md focus-within:ring-2 focus-within:ring-primary/20"
                                        >
                                            <CardHeader className="pb-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <Badge variant="outline">
                                                            Version{' '}
                                                            {version.version}
                                                        </Badge>
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                            <UserIcon className="h-4 w-4" />
                                                            {version.createdBy
                                                                ?.name ||
                                                                'Unknown User'}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() =>
                                                                handlePreview(
                                                                    version.content
                                                                )
                                                            }
                                                        >
                                                            Preview
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() =>
                                                                handleRestore(
                                                                    version.id
                                                                )
                                                            }
                                                            disabled={
                                                                restoreVersionMutation.isPending
                                                            }
                                                        >
                                                            <RotateCcwIcon className="h-4 w-4 mr-1" />
                                                            Restore
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() =>
                                                                handleDelete(
                                                                    version.id
                                                                )
                                                            }
                                                            disabled={
                                                                deleteVersionMutation.isPending
                                                            }
                                                        >
                                                            <TrashIcon className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="pt-0">
                                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                                    <span>
                                                        {formatDistanceToNow(
                                                            new Date(
                                                                version.createdAt
                                                            ),
                                                            { addSuffix: true }
                                                        )}
                                                    </span>
                                                    {version.changeDescription && (
                                                        <span className="italic">
                                                            {
                                                                version.changeDescription
                                                            }
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="mt-2 text-sm text-muted-foreground">
                                                    Content length:{' '}
                                                    {version.content.length}{' '}
                                                    characters
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                    {/* Add some bottom padding for better scrolling */}
                                    <div className="h-4" />
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="flex-shrink-0">
                        <Button variant="outline" onClick={onClose}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Preview Dialog */}
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogContent className="max-w-4xl h-[85vh] min-h-[600px] sm:h-[90vh] sm:min-h-[700px] md:h-[95vh] md:min-h-[800px] w-[95vw] sm:w-full flex flex-col">
                    <DialogHeader className="flex-shrink-0">
                        <DialogTitle>Version Preview</DialogTitle>
                        <DialogDescription>
                            Preview of the selected version content
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 min-h-0 overflow-hidden">
                        <div className="h-full w-full border rounded-lg bg-background">
                            <SimpleEditor
                                initialContent={previewContent || ''}
                                readOnly={true}
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex-shrink-0">
                        <Button
                            variant="outline"
                            onClick={() => setShowPreview(false)}
                        >
                            Close Preview
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog
                open={showDeleteConfirm}
                onOpenChange={setShowDeleteConfirm}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Version</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this version from
                            the history? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            onClick={() => setShowDeleteConfirm(false)}
                        >
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete Version
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
