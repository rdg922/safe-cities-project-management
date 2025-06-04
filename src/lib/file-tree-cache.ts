// Specialized cache for file tree operations with improved organization and performance
import type { FileNode } from '~/components/file-tree'
import type { SharePermission } from '~/server/db/schema'

/**
 * Generic cache entry interface with timestamp for TTL management
 */
interface CacheEntry<T> {
    value: T
    timestamp: number
}

/**
 * Generic typed cache with consistent interface and TTL management
 */
class TypedCache<K, V> {
    private cache = new Map<K, CacheEntry<V>>()
    private hits = 0
    private misses = 0

    constructor(private ttl: number) {}

    get(key: K): V | undefined {
        const entry = this.cache.get(key)
        const now = Date.now()

        // Return undefined if cache miss or entry expired
        if (!entry || now - entry.timestamp > this.ttl) {
            this.misses++
            return undefined
        }

        this.hits++
        return entry.value
    }

    set(key: K, value: V): void {
        this.cache.set(key, {
            value,
            timestamp: Date.now(),
        })
    }

    delete(key: K): boolean {
        return this.cache.delete(key)
    }

    clear(): void {
        this.cache.clear()
        this.hits = 0
        this.misses = 0
    }

    has(key: K): boolean {
        const entry = this.cache.get(key)
        if (!entry) return false

        // Check if entry is still valid
        return Date.now() - entry.timestamp <= this.ttl
    }

    keys(): IterableIterator<K> {
        return this.cache.keys()
    }

    // Return stats about cache usage
    stats(): { size: number; hits: number; misses: number; hitRate: number } {
        const total = this.hits + this.misses
        const hitRate = total > 0 ? this.hits / total : 0
        return {
            size: this.cache.size,
            hits: this.hits,
            misses: this.misses,
            hitRate: parseFloat(hitRate.toFixed(2)),
        }
    }
}

/**
 * Enhanced FileTreeCache with improved organization and performance
 */
class FileTreeCache {
    // Cache TTLs - configurable for different cache types
    private NODE_CACHE_TTL = 5 * 60 * 1000 // 5 minutes for node lookups
    private PATH_CACHE_TTL = 5 * 60 * 1000 // 5 minutes for paths
    private DESCENDANT_CACHE_TTL = 5 * 60 * 1000 // 5 minutes for relationships
    private FILTERED_CACHE_TTL = 2 * 60 * 1000 // 2 minutes for filtered results
    private PERMISSION_CACHE_TTL = 30 * 1000 // 30 seconds for permissions (more volatile)

    // Strongly typed caches with appropriate TTLs
    private nodeCache = new TypedCache<number, FileNode>(this.NODE_CACHE_TTL)
    private pathCache = new TypedCache<number, number[]>(this.PATH_CACHE_TTL)
    private descendantCache = new TypedCache<string, boolean>(
        this.DESCENDANT_CACHE_TTL
    )
    private filteredTreeCache = new TypedCache<string, FileNode[]>(
        this.FILTERED_CACHE_TTL
    )
    private permissionCache = new TypedCache<string, SharePermission | null>(
        this.PERMISSION_CACHE_TTL
    )

    /**
     * Find node by ID with caching
     */
    findNode(id: number, fileTree: FileNode[]): FileNode | undefined {
        // Try to get from cache first
        const cachedNode = this.nodeCache.get(id)
        if (cachedNode) {
            return cachedNode
        }

        // Cache miss, find node in tree
        const node = this.findNodeRecursively(fileTree, id)

        if (node) {
            this.nodeCache.set(id, node)
        }

        return node
    }

    /**
     * Get node path with caching
     */
    getPath(id: number, fileTree: FileNode[]): number[] {
        // Try to get from cache first
        const cachedPath = this.pathCache.get(id)
        if (cachedPath) {
            return cachedPath
        }

        // Cache miss, compute path
        const path = this.calculateNodePath(fileTree, id)
        if (path.length > 0) {
            this.pathCache.set(id, path)
        }

        return path
    }

    /**
     * Check if a node is a descendant of another node with caching
     */
    isDescendant(
        childId: number,
        parentId: number,
        fileTree: FileNode[]
    ): boolean {
        // If they're the same, it's not a descendant
        if (childId === parentId) {
            return false
        }

        const cacheKey = `${childId}:${parentId}`

        // Try to get from cache first
        const cachedResult = this.descendantCache.get(cacheKey)
        if (cachedResult !== undefined) {
            return cachedResult
        }

        // Cache miss, compute relationship efficiently
        // Get paths (potentially from cache)
        const childPath = this.getPath(childId, fileTree)
        const parentPath = this.getPath(parentId, fileTree)

        // If either path is empty, node wasn't found
        if (childPath.length === 0 || parentPath.length === 0) {
            this.descendantCache.set(cacheKey, false)
            return false
        }

        // Parent path should be a proper prefix of child path
        let result = false
        if (parentPath.length < childPath.length) {
            result = parentPath.every((id, index) => id === childPath[index])
        }

        this.descendantCache.set(cacheKey, result)
        return result
    }

    /**
     * Get filtered tree with caching
     */
    getFilteredTree(searchTerm: string, fileTree: FileNode[]): FileNode[] {
        // If empty search, return full tree
        if (!searchTerm.trim()) {
            return fileTree
        }

        const cacheKey = searchTerm.toLowerCase()

        // Try to get from cache first
        const cachedTree = this.filteredTreeCache.get(cacheKey)
        if (cachedTree) {
            return cachedTree
        }

        // Cache miss, filter tree
        const filteredTree = this.filterTreeBySearchTerm(fileTree, searchTerm)
        this.filteredTreeCache.set(cacheKey, filteredTree)

        return filteredTree
    }

    /**
     * Cache permission result
     */
    cachePermission(
        fileId: number,
        userId: string,
        permission: SharePermission | null
    ): void {
        const cacheKey = `${userId}:${fileId}`
        this.permissionCache.set(cacheKey, permission)
    }

    /**
     * Get cached permission
     */
    getPermission(
        fileId: number,
        userId: string
    ): SharePermission | null | undefined {
        const cacheKey = `${userId}:${fileId}`
        return this.permissionCache.get(cacheKey)
    }

    /**
     * Clear cache by file ID
     */
    clearFileCache(fileId: number): void {
        // Clear the node cache for this file
        this.nodeCache.delete(fileId)

        // Clear the path cache for this file
        this.pathCache.delete(fileId)

        // Clear descendant cache entries involving this file
        const descendantKeysToDelete: string[] = []
        for (const key of this.descendantCache.keys()) {
            if (key.includes(`:${fileId}`) || key.startsWith(`${fileId}:`)) {
                descendantKeysToDelete.push(key)
            }
        }

        for (const key of descendantKeysToDelete) {
            this.descendantCache.delete(key)
        }

        // Clear permission cache entries for this file
        const permissionKeysToDelete: string[] = []
        for (const key of this.permissionCache.keys()) {
            if (key.endsWith(`:${fileId}`)) {
                permissionKeysToDelete.push(key)
            }
        }

        for (const key of permissionKeysToDelete) {
            this.permissionCache.delete(key)
        }

        // Clear filtered tree cache entirely since it might include this file
        this.filteredTreeCache.clear()
    }

    /**
     * Clear all cached data
     */
    clearAll(): void {
        this.nodeCache.clear()
        this.pathCache.clear()
        this.descendantCache.clear()
        this.filteredTreeCache.clear()
        this.permissionCache.clear()
    }

    /**
     * Get cache statistics
     */
    getStats() {
        return {
            nodes: this.nodeCache.stats(),
            paths: this.pathCache.stats(),
            descendants: this.descendantCache.stats(),
            filteredTrees: this.filteredTreeCache.stats(),
            permissions: this.permissionCache.stats(),
        }
    }

    /**
     * Log cache stats to console
     */
    logStats() {
        const stats = this.getStats()
        console.log('File Tree Cache Statistics:', stats)
        return stats
    }

    // Private helper methods
    private findNodeRecursively(
        nodes: FileNode[],
        id: number
    ): FileNode | undefined {
        for (const node of nodes) {
            if (node.id === id) {
                return node
            }

            if (node.children?.length) {
                const foundInChild = this.findNodeRecursively(node.children, id)
                if (foundInChild) {
                    return foundInChild
                }
            }
        }

        return undefined
    }

    private calculateNodePath(nodes: FileNode[], id: number): number[] {
        const path: number[] = []

        const findPath = (
            currentNodes: FileNode[],
            targetId: number,
            currentPath: number[]
        ): boolean => {
            for (const node of currentNodes) {
                const newPath = [...currentPath, node.id]

                if (node.id === targetId) {
                    path.push(...newPath)
                    return true
                }

                if (
                    node.children?.length &&
                    findPath(node.children, targetId, newPath)
                ) {
                    return true
                }
            }

            return false
        }

        findPath(nodes, id, [])
        return path
    }

    private filterTreeBySearchTerm(
        nodes: FileNode[],
        searchTerm: string
    ): FileNode[] {
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
                    // Check if children match
                    const matchingChildren = node.children?.length
                        ? filterNodes(node.children)
                        : undefined

                    // Either this node matches or has matching children
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
}

// Export a singleton instance
export const fileTreeCache = new FileTreeCache()
