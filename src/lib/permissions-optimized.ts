import { eq, and, inArray, sql } from 'drizzle-orm'
import { db } from '~/server/db'
import {
    files,
    filePermissions,
    effectivePermissions,
    users,
    type SharePermission,
} from '~/server/db/schema'

// Permission hierarchy: edit > comment > view
const PERMISSION_HIERARCHY = {
    view: 1,
    comment: 2,
    edit: 3,
} as const

/**
 * Fast permission check using the effective permissions cache
 */
export async function getUserFilePermissionFast(
    userId: string,
    fileId: number
): Promise<SharePermission | null> {
    // Check if user is admin first (fastest check)
    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { role: true },
    })

    if (user?.role === 'admin') {
        return 'edit' // Admins bypass all permissions
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
 * Batch check permissions for multiple files
 */
export async function getUserPermissionsForFiles(
    userId: string,
    fileIds: number[]
): Promise<Map<number, SharePermission | null>> {
    const result = new Map<number, SharePermission | null>()

    if (fileIds.length === 0) return result

    // Check if user is admin
    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { role: true },
    })

    if (user?.role === 'admin') {
        // Admins have edit permission on all files
        fileIds.forEach((fileId) => result.set(fileId, 'edit'))
        return result
    }

    // Batch query effective permissions
    const permissions = await db.query.effectivePermissions.findMany({
        where: and(
            eq(effectivePermissions.userId, userId),
            inArray(effectivePermissions.fileId, fileIds)
        ),
        columns: { fileId: true, permission: true },
    })

    // Initialize all files with null permission
    fileIds.forEach((fileId) => result.set(fileId, null))

    // Set actual permissions
    permissions.forEach((perm) => {
        result.set(perm.fileId, perm.permission)
    })

    return result
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
            SELECT id, parent_id
            FROM ${files}
            WHERE parent_id = ${fileId}
            
            UNION ALL
            
            -- Recursive case: children of children
            SELECT f.id, f.parent_id
            FROM ${files} f
            INNER JOIN file_descendants fd ON f.parent_id = fd.id
        )
        SELECT id FROM file_descendants
    `)

    return result.rows.map((row) => row.id as number)
}

/**
 * Rebuild effective permissions for a user (call when permissions change)
 */
export async function rebuildEffectivePermissionsForUser(userId: string) {
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
                        isDirect: sql`CASE WHEN ${fileId === directPerm.fileId} THEN true ELSE excluded.is_direct END`,
                        sourceFileId: sql`CASE WHEN ${fileId === directPerm.fileId} THEN ${directPerm.fileId} ELSE excluded.source_file_id END`,
                    },
                })
        }
    }
}

/**
 * Rebuild effective permissions for all users who have permissions on a file hierarchy
 */
export async function rebuildEffectivePermissionsForFile(fileId: number) {
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
 * Call this when file permissions are added/updated/removed
 */
export async function invalidatePermissionCache(
    fileId: number,
    userId?: string
) {
    if (userId) {
        // Rebuild for specific user
        await rebuildEffectivePermissionsForUser(userId)
    } else {
        // Rebuild for all users who have permissions on this file or its ancestors
        const affectedUsers = await db.query.effectivePermissions.findMany({
            where: eq(effectivePermissions.fileId, fileId),
            columns: { userId: true },
        })

        const uniqueUserIds = [...new Set(affectedUsers.map((u) => u.userId))]

        for (const userId of uniqueUserIds) {
            await rebuildEffectivePermissionsForUser(userId)
        }
    }
}

/**
 * Call this when file hierarchy changes (file moved)
 */
export async function rebuildPermissionCacheForFileHierarchy(fileId: number) {
    // Get all users who might be affected by this hierarchy change
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
 * Get all users with access to a file (optimized for notifications)
 */
export async function getUsersWithAccessToFile(
    fileId: number
): Promise<string[]> {
    const usersWithAccess = await db.query.effectivePermissions.findMany({
        where: eq(effectivePermissions.fileId, fileId),
        columns: { userId: true },
    })

    return [...new Set(usersWithAccess.map((u) => u.userId))]
}
