'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '~/hooks/use-toast'
import { useUser } from '@clerk/nextjs'
import { useFileTree } from '~/providers/file-tree-provider'
import { api } from '~/trpc/react'
import { fileTreeCache } from '~/lib/file-tree-cache'
import {
    ultraFastInvalidateFileCaches,
    smartInvalidateFileCaches,
    rebuildFileCaches,
} from '~/lib/streamlined-cache-invalidation'
import type { FileNode } from '~/components/file-tree'
import { NewFileDialog, type NewFileType } from '~/components/new-file-dialog'

export function useSidebarState() {
    const router = useRouter()
    const { toast } = useToast()
    const [isNewFileDialogOpen, setIsNewFileDialogOpen] = useState(false)
    const [newFileDialogType, setNewFileDialogType] = useState<
        NewFileType | undefined
    >(undefined)
    const [newFileParentId, setNewFileParentId] = useState<number | null>(null)
    const [activeFileId, setActiveFileId] = useState<number | undefined>()
    const [selectedFileIds, setSelectedFileIds] = useState<number[]>([])

    // Get current user from Clerk
    const { user: clerkUser, isLoaded: isUserLoaded } = useUser()

    // Use the centralized file tree provider
    const {
        fileTree,
        isLoading: isFileTreeLoading,
        refetch: refetchFileTree,
        invalidateFileTree,
    } = useFileTree()

    // Fetch current user profile
    const { data: userProfile } = api.user.getProfile.useQuery(undefined, {
        enabled: isUserLoaded && !!clerkUser,
    })

    // Check if user can create programmes
    const canCreateProgramme =
        userProfile && 'role' in userProfile
            ? userProfile.role === 'admin'
            : false

    // Get query client for cache invalidation
    const utils = api.useUtils()

    return {
        // State
        isNewFileDialogOpen,
        setIsNewFileDialogOpen,
        newFileDialogType,
        setNewFileDialogType,
        newFileParentId,
        setNewFileParentId,
        activeFileId,
        setActiveFileId,
        selectedFileIds,
        setSelectedFileIds,

        // Data
        clerkUser,
        userProfile,
        fileTree,
        isFileTreeLoading,
        canCreateProgramme,

        // Functions
        router,
        toast,
        utils,
        refetchFileTree,
        invalidateFileTree,
    }
}

export function useFileOperations() {
    const { toast } = useToast()
    const utils = api.useUtils()
    const { refetch, invalidateFileTree } = useFileTree()

    // Handle renaming files
    const renameFileMutation = api.files.update.useMutation({
        onSuccess: async () => {
            await invalidateFileTree()
        },
    })

    // Handle deleting files
    const deleteFileMutation = api.files.delete.useMutation({
        onSuccess: async () => {
            await invalidateFileTree()
        },
    })

    const updateFileMutation = api.files.update.useMutation({
        onSuccess: async () => {
            await invalidateFileTree()
        },
    })

    // Helper function to check if nodeA is a parent of nodeB
    const isParentOf = (nodeA: FileNode, nodeB: FileNode): boolean => {
        if (!nodeA.isFolder || !nodeA.children) return false
        if (nodeA.children.some((child) => child.id === nodeB.id)) return true
        return nodeA.children.some((child) => {
            if (child.isFolder && child.children) {
                return isParentOf(child, nodeB)
            }
            return false
        })
    }

    // Helper function to find a node by ID
    const findNodeById = (nodes: FileNode[], id: number): FileNode | null => {
        for (const node of nodes) {
            if (node.id === id) return node
            if (node.children && node.children.length > 0) {
                const found = findNodeById(node.children, id)
                if (found) return found
            }
        }
        return null
    }

    const handleMove = (
        dragId: number,
        dropId: number,
        fileTree: FileNode[],
        selectedFileIds: number[]
    ) => {
        const dragNode = findNodeById(fileTree, dragId)
        const dropNode = findNodeById(fileTree, dropId)

        if (!dragNode || !dropNode) return

        if (selectedFileIds.includes(dragId) && selectedFileIds.length > 1) {
            // Multi-item move
            const promises = selectedFileIds.map(
                (id) =>
                    new Promise((resolve, reject) => {
                        const itemNode = findNodeById(fileTree, id)
                        if (itemNode && !isParentOf(itemNode, dropNode)) {
                            updateFileMutation.mutate(
                                {
                                    id,
                                    parentId: dropNode.isFolder
                                        ? dropId
                                        : dropNode.parentId,
                                },
                                { onSuccess: resolve, onError: reject }
                            )
                        } else {
                            resolve(null)
                        }
                    })
            )

            void Promise.all(promises).then(() => {
                ultraFastInvalidateFileCaches(utils)
            })
        } else {
            // Single item move
            const freshDragNodePromise = utils.files.getById.fetch({
                id: dragId,
            })
            const freshDropNodePromise = utils.files.getById.fetch({
                id: dropId,
            })

            Promise.all([freshDragNodePromise, freshDropNodePromise])
                .then(([dragNodeData, dropNodeData]) => {
                    if (!dragNodeData || !dropNodeData) {
                        console.error(
                            'Missing node data for drag and drop operation'
                        )
                        return
                    }

                    // Clear caches
                    fileTreeCache.clearFileCache(dragId)
                    fileTreeCache.clearFileCache(dropId)
                    if (dragNodeData.parentId !== null) {
                        fileTreeCache.clearFileCache(dragNodeData.parentId)
                    }

                    const newParentId =
                        dropNodeData.type === 'folder' ||
                        dropNodeData.type === 'programme'
                            ? dropId
                            : (dropNodeData.parentId ?? null)

                    updateFileMutation.mutate(
                        { id: dragId, parentId: newParentId },
                        {
                            onSuccess: () => {
                                rebuildFileCaches(utils).then(() => {
                                    refetch()
                                })
                            },
                        }
                    )
                })
                .catch((error) => {
                    console.error('Error fetching fresh node data:', error)
                    toast({
                        title: 'Error moving item',
                        description:
                            'Could not get the latest file information. Please try again.',
                        variant: 'destructive',
                    })
                })
        }
    }

    const handleRename = (id: number, filename: string) => {
        renameFileMutation.mutate(
            { id, name: filename },
            { onSuccess: () => refetch() }
        )
    }

    const handleDelete = (
        id: number,
        selectedFileIds: number[],
        setSelectedFileIds: (ids: number[]) => void
    ) => {
        if (selectedFileIds.includes(id) && selectedFileIds.length > 1) {
            // Multi-delete
            const promises = selectedFileIds.map(
                (fileId) =>
                    new Promise((resolve) => {
                        deleteFileMutation.mutate(
                            { id: fileId },
                            { onSuccess: resolve }
                        )
                    })
            )

            void Promise.all(promises).then(() => {
                ultraFastInvalidateFileCaches(utils)
                setSelectedFileIds([])
            })
        } else {
            // Single delete
            deleteFileMutation.mutate(
                { id },
                {
                    onSuccess: () => {
                        smartInvalidateFileCaches(utils)
                        if (selectedFileIds.includes(id)) {
                            setSelectedFileIds(
                                selectedFileIds.filter(
                                    (fileId) => fileId !== id
                                )
                            )
                        }
                    },
                }
            )
        }
    }

    return {
        handleMove,
        handleRename,
        handleDelete,
    }
}
