'use client'

import { useParams } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { toast } from '~/hooks/use-toast'
import { SimpleEditor } from '~/components/tiptap-templates/simple/simple-editor'
import { FileHeader } from '~/components/file-header'
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
    const { data: userPermission } = api.permissions.getUserPermission.useQuery(
        { fileId: pageId },
        { enabled: !!pageId }
    )

    const [content, setContent] = useState<string>('')
    const [localPermission, setLocalPermission] = useState<Permission>('view')

    // Add state to track saving status
    const [savingStatus, setSavingStatus] = useState<
        'idle' | 'saving' | 'saved'
    >('idle')

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

    // Update content when page data loads
    useEffect(() => {
        if (page?.content?.content) {
            setContent(page.content.content)
        }
    }, [page?.content?.content])

    // Update local permission when user permission loads
    useEffect(() => {
        if (userPermission) {
            setLocalPermission(userPermission)
        }
    }, [userPermission])

    // Handle content change with debounced saving
    const handleContentChange = (newContent: string) => {
        setContent(newContent)
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
        }, 2000) // 2 seconds debounce
    }

    // Handle permission changes (for UI feedback)
    const handlePermissionChange = (newPermission: Permission) => {
        setLocalPermission(newPermission)
        // Note: Actual permission changes should be handled through the share modal
        // This is just for UI consistency
    }

    // Clean up timer on unmount
    useEffect(() => {
        return () => {
            if (contentUpdateTimerRef.current) {
                clearTimeout(contentUpdateTimerRef.current)
            }
        }
    }, [])

    // Determine if the editor should be read-only based on permissions
    const isReadOnly = !userPermission || userPermission === 'view'

    if (isLoading) {
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
                onPermissionChange={handlePermissionChange}
                savingStatus={savingStatus}
            />

            <div className="flex-1 min-h-0">
                <SimpleEditor
                    initialContent={content}
                    readOnly={isReadOnly}
                    onUpdate={handleContentChange}
                />
            </div>
        </div>
    )
}
