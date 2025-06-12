'use client'

import { useParams } from 'next/navigation'
import { useState, useRef, useEffect, useCallback } from 'react'
import { toast } from '~/hooks/use-toast'
import { SimpleEditor } from '~/components/tiptap-templates/simple/simple-editor'
import { FileHeader } from '~/components/file-header'
import { VersionHistory } from '~/components/version-history'
import { api } from '~/trpc/react'

type Permission = 'view' | 'comment' | 'edit'

export default function PageView() {
    const params = useParams()
    const pageId = Number(params.pageId as string)

    // Fetch page data using tRPC
    const {
        data: page,
        isLoading,
        error,
    } = api.files.getById.useQuery({ id: pageId }, { enabled: !!pageId })

    // Get user's permission for this file using the hierarchical permission system
    const { data: userPermission, isLoading: isPermissionLoading } =
        api.permissions.getUserPermission.useQuery(
            { fileId: pageId },
            {
                enabled: !!pageId,
                staleTime: 30 * 1000, // 30 seconds
                gcTime: 5 * 60 * 1000, // 5 minutes
                retry: 3,
                retryDelay: (attemptIndex) =>
                    Math.min(1000 * 2 ** attemptIndex, 30000),
                refetchOnWindowFocus: false,
            }
        )

    const [content, setContent] = useState<string>('')
    const [localPermission, setLocalPermission] = useState<Permission>('view')
    const [hasInitialContentLoaded, setHasInitialContentLoaded] = useState(false)

    // Version history state
    const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false)

    // Add state to track saving status
    const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

    // Add mutation hook for updating the page
    const updatePageMutation = api.files.updatePageContent.useMutation({
        onSuccess: () => {
            setSavingStatus('saved')
            // Reset status after a delay
            setTimeout(() => setSavingStatus('idle'), 3000)
        },
        onError: (error) => {
            setSavingStatus('idle')
            toast({
                title: 'Failed to update page',
                description: error.message,
                variant: 'destructive',
            })
        },
    })

    // Debounced content update using useRef to store timer
    const contentUpdateTimerRef = useRef<NodeJS.Timeout | null>(null)

    // Update content when page data loads, but only once
    useEffect(() => {
        if (page?.content?.content && !hasInitialContentLoaded) {
            console.log(
                'Setting initial page content:',
                page.content.content.substring(0, 100)
            )
            setContent(page.content.content)
            setHasInitialContentLoaded(true)
        }
    }, [page?.content?.content, hasInitialContentLoaded])

    // Update local permission when user permission loads
    useEffect(() => {
        if (userPermission) {
            setLocalPermission(userPermission)
        }
    }, [userPermission])

    // Handle content change with debounced saving
    const handleContentChange = useCallback(
        (newContent: string) => {
            setContent(newContent)

            // Only auto-save if user has edit permissions
            if (!userPermission || userPermission === 'view') return

            setSavingStatus('saving')

            // Clear previous timer if exists
            if (contentUpdateTimerRef.current) {
                clearTimeout(contentUpdateTimerRef.current)
            }

            // Set new timer for debounced save
            contentUpdateTimerRef.current = setTimeout(() => {
                updatePageMutation.mutate({
                    fileId: pageId,
                    content: newContent,
                })
            }, 2000) // 2 seconds debounce for better responsiveness
        },
        [pageId, userPermission, updatePageMutation]
    )

    // Clean up timer on unmount
    useEffect(() => {
        return () => {
            if (contentUpdateTimerRef.current) {
                clearTimeout(contentUpdateTimerRef.current)
            }
        }
    }, [])

    // Handle version restoration
    const handleVersionRestore = useCallback((restoredContent: string) => {
        setContent(restoredContent)
        setIsVersionHistoryOpen(false)
        toast({
            title: 'Version restored',
            description: 'The page content has been restored to the selected version.',
        })
    }, [])

    // Determine if the editor should be read-only based on permissions
    // Default to readOnly while loading OR when userPermission is null/undefined
    // Only allow editing when userPermission is explicitly 'edit' or 'comment'
    const isReadOnly =
        isPermissionLoading ||
        (userPermission !== 'edit' && userPermission !== 'comment')

    if (isLoading || isPermissionLoading) {
        return (
            <div className="container mx-auto p-6">
                <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                    <div className="text-center">
                        <div className="animate-spin h-8 w-8 border-4 border-primary rounded-full border-t-transparent mx-auto mb-4"></div>
                        <p className="text-muted-foreground">
                            Loading page content...
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="container mx-auto p-6">
                <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                    <div className="text-center">
                        <p className="text-destructive mb-2">
                            Error loading page
                        </p>
                        <p className="text-muted-foreground">{error.message}</p>
                    </div>
                </div>
            </div>
        )
    }

    if (!page) {
        return (
            <div className="container mx-auto p-6">
                <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                    <div className="text-center">
                        <p className="text-muted-foreground">Page not found</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="h-screen flex flex-col">
                <FileHeader
                    filename={page.name || 'Untitled Page'}
                    fileId={pageId}
                    permission={localPermission}
                    savingStatus={savingStatus}
                    content={content}
                    onVersionHistoryClick={() => setIsVersionHistoryOpen(true)}
                />

                <div className="flex-1 min-h-0 flex justify-center items-start bg-background">
                    <SimpleEditor
                        initialContent={content}
                        readOnly={isReadOnly}
                        onUpdate={handleContentChange}
                    />
                </div>

                <VersionHistory
                    fileId={pageId}
                    isOpen={isVersionHistoryOpen}
                    onClose={() => setIsVersionHistoryOpen(false)}
                    onRestore={handleVersionRestore}
                />
        </div>
    )
}
