// Ultra-fast permission system with minimal cache invalidation and async revalidation
import { eq, and, inArray, sql } from 'drizzle-orm'
import { db } from '~/server/db'
import {
    files,
    filePermissions,
    effectivePermissions,
    users,
    type SharePermission,
} from '~/server/db/schema'

// Permission hierarchy for calculations
const PERMISSION_HIERARCHY = {
    view: 1,
    comment: 2,
    edit: 3,
} as const

// Global cache for permission checks (in-memory for speed)
const permissionCache = new Map<
    string,
    { permission: SharePermission | null; timestamp: number }
>()
const CACHE_TTL = 30 * 1000 // 30 seconds

/**
 * Lightning-fast permission check with in-memory cache
 * Uses cache-first strategy with background revalidation
 */
export async function superFastPermissionCheck(
    userId: string,
    fileId: number,
    requiredPermission?: SharePermission
): Promise<SharePermission | null> {
    const cacheKey = `${userId}:${fileId}`
    const now = Date.now()

    // Check cache first
    const cached = permissionCache.get(cacheKey)
    if (cached && now - cached.timestamp < CACHE_TTL) {
        const permission = cached.permission
        if (!requiredPermission) return permission
        return permission &&
            PERMISSION_HIERARCHY[permission] >=
                PERMISSION_HIERARCHY[requiredPermission]
            ? permission
            : null
    }

    // Cache miss or expired - fetch from effective permissions table
    const permission = await fetchPermissionFromDB(userId, fileId)

    // Update cache
    permissionCache.set(cacheKey, { permission, timestamp: now })

    if (!requiredPermission) return permission
    return permission &&
        PERMISSION_HIERARCHY[permission] >=
            PERMISSION_HIERARCHY[requiredPermission]
        ? permission
        : null
}

/**
 * Direct database fetch - only called on cache miss
 */
async function fetchPermissionFromDB(
    userId: string,
    fileId: number
): Promise<SharePermission | null> {
    // Check admin status first (fastest check)
    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { role: true },
    })

    if (user?.role === 'admin') {
        return 'edit' // Admins have edit permission on everything
    }

    // Use effective permissions cache for O(1) lookup
    const effectivePermission = await db.query.effectivePermissions.findFirst({
        where: and(
            eq(effectivePermissions.userId, userId),
            eq(effectivePermissions.fileId, fileId)
        ),
        columns: { permission: true },
    })

    return effectivePermission?.permission || null
}

/**
 * Batch permission check with minimal database queries
 */
export async function ultraFastBatchCheck(
    userId: string,
    fileIds: number[]
): Promise<Map<number, SharePermission | null>> {
    const result = new Map<number, SharePermission | null>()
    const now = Date.now()
    const uncachedFileIds: number[] = []

    // Check cache for all files first
    for (const fileId of fileIds) {
        const cacheKey = `${userId}:${fileId}`
        const cached = permissionCache.get(cacheKey)

        if (cached && now - cached.timestamp < CACHE_TTL) {
            result.set(fileId, cached.permission)
        } else {
            uncachedFileIds.push(fileId)
        }
    }

    // If all files were cached, return immediately
    if (uncachedFileIds.length === 0) {
        return result
    }

    // Check admin status once for uncached files
    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { role: true },
    })

    if (user?.role === 'admin') {
        // Admin has edit permission on all files
        for (const fileId of uncachedFileIds) {
            result.set(fileId, 'edit')
            permissionCache.set(`${userId}:${fileId}`, {
                permission: 'edit',
                timestamp: now,
            })
        }
        return result
    }

    // Batch fetch from effective permissions for uncached files
    const permissions = await db.query.effectivePermissions.findMany({
        where: and(
            eq(effectivePermissions.userId, userId),
            inArray(effectivePermissions.fileId, uncachedFileIds)
        ),
        columns: { fileId: true, permission: true },
    })

    // Process results and update cache
    const permissionMap = new Map<number, SharePermission>()
    permissions.forEach((perm) => {
        permissionMap.set(perm.fileId, perm.permission)
    })

    // Set results and update cache for uncached files
    for (const fileId of uncachedFileIds) {
        const permission = permissionMap.get(fileId) || null
        result.set(fileId, permission)
        permissionCache.set(`${userId}:${fileId}`, {
            permission,
            timestamp: now,
        })
    }

    return result
}

/**
 * Minimal cache invalidation - only invalidate specific user-file combinations
 */
export function invalidateSpecificPermission(userId: string, fileId: number) {
    const cacheKey = `${userId}:${fileId}`
    permissionCache.delete(cacheKey)
}

/**
 * Selective cache invalidation for a user across multiple files
 */
export function invalidateUserPermissions(userId: string, fileIds: number[]) {
    fileIds.forEach((fileId) => {
        const cacheKey = `${userId}:${fileId}`
        permissionCache.delete(cacheKey)
    })
}

/**
 * Background async rebuild of effective permissions (non-blocking)
 * This runs asynchronously and doesn't block the main permission operations
 */
export function asyncRebuildEffectivePermissions(
    fileId: number,
    userId?: string
) {
    // Run in background - don't await this
    Promise.resolve().then(async () => {
        try {
            if (userId) {
                await rebuildEffectivePermissionsForUser(userId)
            } else {
                await rebuildEffectivePermissionsForFile(fileId)
            }
        } catch (error) {
            console.error('Background permission rebuild failed:', error)
        }
    })
}

/**
 * Fast descendant lookup using recursive CTE
 */
export async function getFileDescendantsFast(
    fileId: number
): Promise<number[]> {
    const result = await db.execute(sql`
        WITH RECURSIVE file_descendants AS (
            -- Base case: direct children
            SELECT id, "parentId"
            FROM "safe-cities-project-management-v2_file"
            WHERE "parentId" = ${fileId}
            
            UNION ALL
            
            -- Recursive case: children of children
            SELECT f.id, f."parentId"
            FROM "safe-cities-project-management-v2_file" f
            INNER JOIN file_descendants fd ON f."parentId" = fd.id
        )
        SELECT id FROM file_descendants
    `)

    return result.rows.map((row) => row.id as number)
}

/**
 * Rebuild effective permissions for a user (called in background)
 */
async function rebuildEffectivePermissionsForUser(userId: string) {
    // Remove existing effective permissions for this user
    await db
        .delete(effectivePermissions)
        .where(eq(effectivePermissions.userId, userId))

    // Get all direct permissions for this user
    const directPermissions = await db.query.filePermissions.findMany({
        where: eq(filePermissions.userId, userId),
        with: {
            file: {
                columns: { id: true, parentId: true },
            },
        },
    })

    // For each direct permission, calculate effective permissions for all descendants
    for (const directPerm of directPermissions) {
        const descendants = await getFileDescendantsFast(directPerm.fileId)

        // Insert effective permissions for the file and all descendants
        const permissionsToInsert = [directPerm.fileId, ...descendants].map(
            (fileId) => ({
                userId,
                fileId,
                permission: directPerm.permission,
                isDirect: fileId === directPerm.fileId,
                sourceFileId: directPerm.fileId,
            })
        )

        if (permissionsToInsert.length > 0) {
            await db
                .insert(effectivePermissions)
                .values(permissionsToInsert)
                .onConflictDoUpdate({
                    target: [
                        effectivePermissions.userId,
                        effectivePermissions.fileId,
                    ],
                    set: {
                        permission: sql`CASE 
                            WHEN ${sql.raw(PERMISSION_HIERARCHY[directPerm.permission].toString())} > 
                                 CASE excluded.permission 
                                    WHEN 'view' THEN 1 
                                    WHEN 'comment' THEN 2 
                                    WHEN 'edit' THEN 3 
                                 END
                            THEN ${directPerm.permission} 
                            ELSE excluded.permission 
                        END`,
                        updatedAt: new Date(),
                        isDirect: sql`excluded."isDirect"`,
                        sourceFileId: sql`excluded."sourceFileId"`,
                    },
                })
        }
    }

    // Clear in-memory cache for this user
    for (const [key] of permissionCache) {
        if (key.startsWith(`${userId}:`)) {
            permissionCache.delete(key)
        }
    }
}

/**
 * Rebuild effective permissions for all users who have permissions on a file hierarchy
 */
async function rebuildEffectivePermissionsForFile(fileId: number) {
    // Get all users who have permissions on this file or its ancestors
    const affectedUsers = await db.query.effectivePermissions.findMany({
        where: eq(effectivePermissions.sourceFileId, fileId),
        columns: { userId: true },
    })

    const uniqueUserIds = [...new Set(affectedUsers.map((u) => u.userId))]

    for (const userId of uniqueUserIds) {
        await rebuildEffectivePermissionsForUser(userId)
    }
}

/**
 * Clear all permission caches (emergency reset)
 */
export function clearAllPermissionCaches() {
    permissionCache.clear()
}

/**
 * Get cache statistics for monitoring
 */
export function getPermissionCacheStats() {
    const now = Date.now()
    let validEntries = 0
    let expiredEntries = 0

    for (const [, value] of permissionCache) {
        if (now - value.timestamp < CACHE_TTL) {
            validEntries++
        } else {
            expiredEntries++
        }
    }

    return {
        totalEntries: permissionCache.size,
        validEntries,
        expiredEntries,
        cacheHitRate: validEntries / (validEntries + expiredEntries) || 0,
    }
}
