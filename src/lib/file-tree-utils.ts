// file-tree-utils.ts - Helper utilities for file tree operations
import type { FileNode } from '~/components/file-tree'

/**
 * Recursively find a file node by ID in the file tree
 * @param nodes The file tree or a subset of the tree
 * @param id The ID of the file to find
 * @returns The found node or undefined
 */
export function findNodeById(
    nodes: FileNode[],
    id: number
): FileNode | undefined {
    for (const node of nodes) {
        if (node.id === id) {
            return node
        }

        if (node.children?.length) {
            const foundInChild = findNodeById(node.children, id)
            if (foundInChild) {
                return foundInChild
            }
        }
    }

    return undefined
}

/**
 * Gets the path of a node in the file tree
 * @param nodes The file tree
 * @param id The ID of the file
 * @returns Array of node IDs representing the path
 */
export function getNodePath(nodes: FileNode[], id: number): number[] {
    const path: number[] = []

    const findPath = (
        currentNodes: FileNode[],
        targetId: number,
        currentPath: number[]
    ): boolean => {
        for (const node of currentNodes) {
            // Try this node
            const newPath = [...currentPath, node.id]

            if (node.id === targetId) {
                // Found the node, save the path
                path.push(...newPath)
                return true
            }

            // Try children if they exist
            if (node.children?.length) {
                if (findPath(node.children, targetId, newPath)) {
                    return true
                }
            }
        }

        return false
    }

    findPath(nodes, id, [])
    return path
}

/**
 * Gets all parent folder IDs for a given file ID
 * @param nodes The file tree
 * @param id The ID of the file
 * @returns Array of parent folder IDs
 */
export function getParentFolderIds(nodes: FileNode[], id: number): number[] {
    const path = getNodePath(nodes, id)
    // Remove the last item (the node itself) to get only parents
    return path.slice(0, -1)
}

/**
 * Extract all file IDs from a file tree
 * @param nodes The file tree
 * @returns Array of all file IDs
 */
export function getAllFileIds(nodes: FileNode[]): number[] {
    const ids: number[] = []

    const extractIds = (currentNodes: FileNode[]) => {
        for (const node of currentNodes) {
            ids.push(node.id)

            if (node.children?.length) {
                extractIds(node.children)
            }
        }
    }

    extractIds(nodes)
    return ids
}

/**
 * Extract all file IDs of a specific type from a file tree
 * @param nodes The file tree
 * @param type The type of files to extract ('folder', 'page', 'sheet', 'form', 'programme')
 * @returns Array of matching file IDs
 */
export function getFileIdsByType(nodes: FileNode[], type: string): number[] {
    const ids: number[] = []

    const extractIds = (currentNodes: FileNode[]) => {
        for (const node of currentNodes) {
            if (node.type === type || (type === 'folder' && node.isFolder)) {
                ids.push(node.id)
            }

            if (node.children?.length) {
                extractIds(node.children)
            }
        }
    }

    extractIds(nodes)
    return ids
}

/**
 * Check if a node is a descendant of another node
 * @param nodes The file tree
 * @param potentialChildId The ID of the potential child node
 * @param potentialParentId The ID of the potential parent node
 * @returns Boolean indicating if the relationship exists
 */
export function isDescendantOf(
    nodes: FileNode[],
    potentialChildId: number,
    potentialParentId: number
): boolean {
    const parentPath = getNodePath(nodes, potentialParentId)
    const childPath = getNodePath(nodes, potentialChildId)

    // Check if parent path is a prefix of child path
    if (parentPath.length >= childPath.length) {
        return false
    }

    for (let i = 0; i < parentPath.length; i++) {
        if (parentPath[i] !== childPath[i]) {
            return false
        }
    }

    return true
}

/**
 * Filter tree to only include nodes that match a search term
 * @param nodes The file tree
 * @param searchTerm The search term
 * @returns Filtered tree with only matching nodes and their ancestors
 */
export function filterTreeBySearchTerm(
    nodes: FileNode[],
    searchTerm: string
): FileNode[] {
    if (!searchTerm.trim()) {
        return nodes
    }

    const lowercaseSearch = searchTerm.toLowerCase()

    const doesNodeMatch = (node: FileNode): boolean => {
        return (
            (node.filename?.toLowerCase().includes(lowercaseSearch) ||
                node.name?.toLowerCase().includes(lowercaseSearch)) ??
            false
        )
    }

    const filterNodes = (currentNodes: FileNode[]): FileNode[] => {
        return currentNodes
            .map((node) => {
                // Process children first
                const matchingChildren = node.children?.length
                    ? filterNodes(node.children)
                    : undefined

                // If this node matches or has matching children, include it
                if (
                    doesNodeMatch(node) ||
                    (matchingChildren && matchingChildren.length > 0)
                ) {
                    return {
                        ...node,
                        children: matchingChildren,
                    }
                }

                // Neither this node nor its children match
                return null
            })
            .filter((node): node is FileNode => node !== null)
    }

    return filterNodes(nodes)
}
