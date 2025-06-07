'use client'

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useRef,
} from 'react'
import { api } from '~/trpc/react'
import type { FileNode } from '~/components/file-tree'
import {
    invalidateFileTreePermissions,
    ultraFastFileCreationInvalidation,
    ultraFastInvalidateFileCaches,
    ultraFastInvalidatePermissionCaches,
    smartInvalidatePermissionCaches,
    comprehensivePermissionInvalidation,
    smartInvalidateFileCaches,
    rebuildFileCaches,
    logCacheStats,
} from '~/lib/streamlined-cache-invalidation'
import { useBatchPermissions } from '~/hooks/use-batch-permissions'
import { fileTreeCache } from '~/lib/file-tree-cache'
import * as FileTreeOperations from '~/lib/file-tree-operations'

// Define the context type
interface FileTreeContextType {
    fileTree: FileNode[]
    isLoading: boolean
    refetch: () => Promise<unknown>

    // Cache invalidation functions
    invalidateFileTree: () => Promise<void>
    invalidateFileTreeForCreation: () => Promise<unknown>
    invalidateFileTreeForPermissions: (fileId: number) => Promise<void>
    invalidatePermissionCaches: (fileId?: number) => Promise<unknown[]>
    smartInvalidatePermissions: (fileId: number) => Promise<unknown>
    smartInvalidateFileTree: (fileId?: number) => Promise<unknown[]>
    rebuildFileTreeCache: () => Promise<unknown[]>
    comprehensiveInvalidation: (fileId: number) => Promise<unknown[]>

    // Cache management functions
    clearCache: (fileId?: number) => void
    getCacheStats: () => Record<string, any>
    logCacheInfo: () => void

    // Permission functions
    getPermissions: (fileId: number) => {
        userPermission: any
        canEdit: boolean
        canShare: boolean
    }
    filePermissionMap: Record<
        number,
        {
            userPermission: any
            canEdit: boolean
            canShare: boolean
        }
    >

    // Refresh management
    shouldRefreshTree: () => boolean
    markTreeAsRefreshed: () => void

    // File tree utility functions
    findNodeById: (id: number) => FileNode | undefined
    getNodePath: (id: number) => number[]
    getParentFolderIds: (id: number) => number[]
    isDescendantOf: (childId: number, parentId: number) => boolean
    filterTreeBySearchTerm: (searchTerm: string) => FileNode[]

    // Tree operation functions
    createNodeInTree: (newNode: FileNode, parentId: number | null) => void
    deleteNodeFromTree: (nodeId: number) => void
    updateNodeInTree: (nodeId: number, updates: Partial<FileNode>) => void
    moveNodeInTree: (nodeId: number, newParentId: number | null) => void
    sortNodeChildren: (parentId: number | null) => void
    getAllDescendantIds: (nodeId: number) => number[]
    flattenTree: () => FileNode[]
    getNodesByType: (type: string) => FileNode[]
    getNodeBreadcrumbs: (nodeId: number) => FileNode[]
    clearFileTreeCache: (fileId?: number) => void
}

// Create the context with default values
const FileTreeContext = createContext<FileTreeContextType>({
    fileTree: [],
    isLoading: false,
    refetch: async () => null,

    // Cache invalidation functions
    invalidateFileTree: async () => {},
    invalidateFileTreeForCreation: async () => null,
    invalidateFileTreeForPermissions: async () => {},
    invalidatePermissionCaches: async () => [],
    smartInvalidatePermissions: async () => ({}),
    smartInvalidateFileTree: async () => [],
    rebuildFileTreeCache: async () => [],
    comprehensiveInvalidation: async () => [],

    // Cache management functions
    clearCache: () => {},
    getCacheStats: () => ({}),
    logCacheInfo: () => {},

    // Permission functions
    getPermissions: () => ({
        userPermission: null,
        canEdit: false,
        canShare: false,
    }),
    filePermissionMap: {},

    // Refresh management
    shouldRefreshTree: () => false,
    markTreeAsRefreshed: () => {},

    // File tree utility functions
    findNodeById: () => undefined,
    getNodePath: () => [],
    getParentFolderIds: () => [],
    isDescendantOf: () => false,
    filterTreeBySearchTerm: () => [],

    // Tree operation functions
    createNodeInTree: () => {},
    deleteNodeFromTree: () => {},
    updateNodeInTree: () => {},
    moveNodeInTree: () => {},
    sortNodeChildren: () => {},
    getAllDescendantIds: () => [],
    flattenTree: () => [],
    getNodesByType: () => [],
    getNodeBreadcrumbs: () => [],
    clearFileTreeCache: () => {},
})

// Provider component
export function FileTreeProvider({ children }: { children: React.ReactNode }) {
    // Get query client for cache invalidation
    const utils = api.useUtils()

    // State for the file tree (allows for optimistic updates)
    const [optimisticFileTree, setOptimisticFileTree] = useState<FileNode[]>([])
    const [usingOptimisticTree, setUsingOptimisticTree] = useState(false)

    // Last timestamp when the tree was refreshed
    const lastTreeRefreshRef = useRef<number>(Date.now())
    const TREE_REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutes

    // Fetch file tree with optimized caching settings
    const {
        data: fileTree = [],
        isLoading,
        refetch,
    } = api.files.getFilteredFileTree.useQuery(undefined, {
        staleTime: 30 * 1000, // 30 seconds - shorter stale time to be more responsive to changes
        gcTime: 15 * 60 * 1000, // 15 minutes - keep in memory (renamed from cacheTime in newer React Query)
        refetchOnWindowFocus: false, // Don't refetch when window gets focus
        refetchOnMount: true, // Allow refetch when component mounts if data is stale
        refetchOnReconnect: false, // Don't refetch when network reconnects
        refetchInterval: false, // Disable automatic background refetch
        onSuccess: (data) => {
            // Update the last refresh timestamp when data is successfully fetched
            lastTreeRefreshRef.current = Date.now()
            // Reset optimistic updates when we get fresh data
            setOptimisticFileTree(data)
            setUsingOptimisticTree(false)
        },
    })

    // Initialize optimistic tree with fetched data when it first loads
    useEffect(() => {
        if (fileTree.length > 0 && !usingOptimisticTree) {
            setOptimisticFileTree(fileTree)
        }
    }, [fileTree, usingOptimisticTree])

    // The tree we use for all operations - either the optimistic one or the fetched one
    const currentTree = usingOptimisticTree ? optimisticFileTree : fileTree

    // Use batch permissions with the file tree
    const { getPermissions, batchPermissions } = useBatchPermissions(fileTree)

    // Create a map for quick permission lookups by file ID
    const filePermissionMap = batchPermissions || {}

    // Function to invalidate the file tree cache
    const invalidateFileTree = useCallback(async () => {
        await ultraFastInvalidateFileCaches(utils)
    }, [utils])

    // Function for file creation invalidation
    const invalidateFileTreeForCreation = useCallback(async () => {
        return ultraFastFileCreationInvalidation(utils)
    }, [utils])

    // Function for permissions invalidation
    const invalidateFileTreeForPermissions = useCallback(
        async (fileId: number) => {
            await invalidateFileTreePermissions(utils, fileId)
        },
        [utils]
    )

    // Function to invalidate permission caches
    const invalidatePermissionCaches = useCallback(
        async (fileId?: number) => {
            return ultraFastInvalidatePermissionCaches(utils, fileId)
        },
        [utils]
    )

    // Function for smart permission cache invalidation
    const smartInvalidatePermissions = useCallback(
        async (fileId: number) => {
            return smartInvalidatePermissionCaches(utils, fileId)
        },
        [utils]
    )

    // Function for comprehensive permission invalidation
    const comprehensiveInvalidation = useCallback(
        async (fileId: number) => {
            return comprehensivePermissionInvalidation(utils, fileId)
        },
        [utils]
    )

    // Smart file tree invalidation with staged approach
    const smartInvalidateFileTree = useCallback(
        async (fileId?: number) => {
            return smartInvalidateFileCaches(utils, fileId)
        },
        [utils]
    )

    // Complete rebuild of file tree cache
    const rebuildFileTreeCache = useCallback(async () => {
        return rebuildFileCaches(utils)
    }, [utils])

    // Cache management functions
    const clearCache = useCallback((fileId?: number) => {
        if (fileId) {
            fileTreeCache.clearFileCache(fileId)
        } else {
            fileTreeCache.clearAll()
        }
    }, [])

    const getCacheStats = useCallback(() => {
        return fileTreeCache.getStats()
    }, [])

    const logCacheInfo = useCallback(() => {
        logCacheStats()
        return fileTreeCache.logStats()
    }, [])

    // Function to check if the tree should be refreshed based on time elapsed
    const shouldRefreshTree = useCallback(() => {
        const now = Date.now()
        return now - lastTreeRefreshRef.current > TREE_REFRESH_INTERVAL
    }, [])

    // Function to mark the tree as refreshed
    const markTreeAsRefreshed = useCallback(() => {
        lastTreeRefreshRef.current = Date.now()
    }, [])

    // File tree utility functions using the cache system
    const findNodeById = useCallback(
        (id: number) => fileTreeCache.findNode(id, currentTree),
        [currentTree]
    )

    const getNodePath = useCallback(
        (id: number) => fileTreeCache.getPath(id, currentTree),
        [currentTree]
    )

    const getParentFolderIds = useCallback(
        (id: number) => {
            const path = fileTreeCache.getPath(id, currentTree)
            return path.slice(0, -1) // Remove the node itself
        },
        [currentTree]
    )

    const isDescendantOf = useCallback(
        (childId: number, parentId: number) =>
            fileTreeCache.isDescendant(childId, parentId, currentTree),
        [currentTree]
    )

    const filterTreeBySearchTerm = useCallback(
        (searchTerm: string) =>
            fileTreeCache.getFilteredTree(searchTerm, currentTree),
        [currentTree]
    )

    // Tree operation functions
    const createNodeInTree = useCallback(
        (newNode: FileNode, parentId: number | null) => {
            const updatedTree = FileTreeOperations.createNodeInTree(
                currentTree,
                newNode,
                parentId
            )
            setOptimisticFileTree(updatedTree)
            setUsingOptimisticTree(true)
        },
        [currentTree]
    )

    const deleteNodeFromTree = useCallback(
        (nodeId: number) => {
            const updatedTree = FileTreeOperations.deleteNodeFromTree(
                currentTree,
                nodeId
            )
            setOptimisticFileTree(updatedTree)
            setUsingOptimisticTree(true)
        },
        [currentTree]
    )

    const updateNodeInTree = useCallback(
        (nodeId: number, updates: Partial<FileNode>) => {
            const updatedTree = FileTreeOperations.updateNodeInTree(
                currentTree,
                nodeId,
                updates
            )
            setOptimisticFileTree(updatedTree)
            setUsingOptimisticTree(true)
        },
        [currentTree]
    )

    const moveNodeInTree = useCallback(
        (nodeId: number, newParentId: number | null) => {
            const updatedTree = FileTreeOperations.moveNodeInTree(
                currentTree,
                nodeId,
                newParentId
            )
            setOptimisticFileTree(updatedTree)
            setUsingOptimisticTree(true)
        },
        [currentTree]
    )

    const sortNodeChildren = useCallback(
        (parentId: number | null) => {
            const updatedTree = FileTreeOperations.sortNodeChildren(
                currentTree,
                parentId
            )
            setOptimisticFileTree(updatedTree)
            setUsingOptimisticTree(true)
        },
        [currentTree]
    )

    const getAllDescendantIds = useCallback(
        (nodeId: number) => {
            return FileTreeOperations.getAllDescendantIds(currentTree, nodeId)
        },
        [currentTree]
    )

    const flattenTree = useCallback(() => {
        return FileTreeOperations.flattenTree(currentTree)
    }, [currentTree])

    const getNodesByType = useCallback(
        (type: string) => {
            return FileTreeOperations.getNodesByType(currentTree, type)
        },
        [currentTree]
    )

    const getNodeBreadcrumbs = useCallback(
        (nodeId: number) => {
            return FileTreeOperations.getNodeBreadcrumbs(currentTree, nodeId)
        },
        [currentTree]
    )

    const clearFileTreeCache = useCallback((fileId?: number) => {
        if (fileId) {
            fileTreeCache.clearFileCache(fileId)
        } else {
            fileTreeCache.clearAll()
        }
    }, [])

    // Context value
    const contextValue: FileTreeContextType = {
        // Use the current tree (either optimistic or fetched)
        fileTree: currentTree,
        isLoading,
        refetch,

        // Cache invalidation functions
        invalidateFileTree,
        invalidateFileTreeForCreation,
        invalidateFileTreeForPermissions,
        invalidatePermissionCaches,
        smartInvalidatePermissions,
        smartInvalidateFileTree,
        rebuildFileTreeCache,
        comprehensiveInvalidation,

        // Cache management functions
        clearCache,
        getCacheStats,
        logCacheInfo,

        // Permission functions
        getPermissions,
        filePermissionMap,

        // Refresh management
        shouldRefreshTree,
        markTreeAsRefreshed,

        // File tree utility functions
        findNodeById,
        getNodePath,
        getParentFolderIds,
        isDescendantOf,
        filterTreeBySearchTerm,

        // Tree operation functions
        createNodeInTree,
        deleteNodeFromTree,
        updateNodeInTree,
        moveNodeInTree,
        sortNodeChildren,
        getAllDescendantIds,
        flattenTree,
        getNodesByType,
        getNodeBreadcrumbs,
        clearFileTreeCache,
    }

    return (
        <FileTreeContext.Provider value={contextValue}>
            {children}
        </FileTreeContext.Provider>
    )
}

// Custom hook to use the file tree context
export function useFileTree() {
    const context = useContext(FileTreeContext)

    if (context === undefined) {
        throw new Error('useFileTree must be used within a FileTreeProvider')
    }

    return context
}
