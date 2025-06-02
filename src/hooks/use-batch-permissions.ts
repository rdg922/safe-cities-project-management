// hooks/use-batch-permissions.ts
'use client'

import { useMemo } from 'react'
import { api } from '~/trpc/react'
import type { FileNode } from '~/components/file-tree'

/**
 * Custom hook to batch-fetch permissions for all files in a file tree
 * This replaces individual permission queries with a single batch query
 */
export function useBatchPermissions(fileNodes: FileNode[]) {
    // Extract all file IDs from the tree recursively
    const fileIds = useMemo(() => {
        const extractIds = (nodes: FileNode[]): number[] => {
            const ids: number[] = []
            for (const node of nodes) {
                ids.push(node.id)
                if (node.children) {
                    ids.push(...extractIds(node.children))
                }
            }
            return ids
        }
        return extractIds(fileNodes)
    }, [fileNodes])

    // Batch fetch permissions for all files
    const { data: batchPermissions, isLoading } =
        api.permissions.batchCheckPermissions.useQuery(
            { fileIds },
            {
                enabled: fileIds.length > 0,
                staleTime: 5 * 60 * 1000, // 5 minutes - same as individual queries
                gcTime: 10 * 60 * 1000, // 10 minutes - same as individual queries
                refetchOnWindowFocus: false,
                refetchOnMount: false,
            }
        )

    // Helper function to get permissions for a specific file
    const getPermissions = (fileId: number) => {
        return (
            batchPermissions?.[fileId] || {
                userPermission: null,
                canEdit: false,
                canShare: false,
            }
        )
    }

    return {
        getPermissions,
        isLoading,
        batchPermissions,
    }
}
