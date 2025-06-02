import { eq, and, inArray } from 'drizzle-orm'
import { db } from '~/server/db'
import {
    files,
    filePermissions,
    users,
    type SharePermission,
    type File,
} from '~/server/db/schema'
import {
    invalidatePermissionCache,
    getFileDescendantsFast,
} from './permissions-optimized'
import {
    superFastPermissionCheck,
    invalidateSpecificPermission,
    asyncRebuildEffectivePermissions,
} from './permissions-ultra-fast'

// Permission hierarchy: edit > comment > view
const PERMISSION_HIERARCHY = {
    view: 1,
    comment: 2,
    edit: 3,
} as const

/**
 * Gets the highest permission level for a user on a specific file.
 * Uses ultra-fast caching system for optimal performance.
 */
export async function getUserFilePermission(
    userId: string,
    fileId: number
): Promise<SharePermission | null> {
    // Use the ultra-fast permission check
    return await superFastPermissionCheck(userId, fileId)
}

/**
 * Gets all ancestors of a file (including the file itself)
 */
export async function getFileAncestors(fileId: number) {
    const ancestors: Array<{
        id: number
        name: string
        parentId: number | null
    }> = []

    let currentFileId: number | null = fileId

    while (currentFileId !== null) {
        const file = (await db.query.files.findFirst({
            where: eq(files.id, currentFileId),
            columns: {
                id: true,
                name: true,
                parentId: true,
            },
        })) as { id: number; name: string; parentId: number | null } | undefined

        if (!file) break

        ancestors.push({
            id: file.id,
            name: file.name,
            parentId: file.parentId,
        })
        currentFileId = file.parentId
    }

    return ancestors
}

/**
 * Gets all descendants of a file (children, grandchildren, etc.)
 */
export async function getFileDescendants(fileId: number): Promise<number[]> {
    const descendants: number[] = []

    const getChildren = async (parentId: number) => {
        const children = await db.query.files.findMany({
            where: eq(files.parentId, parentId),
            columns: { id: true },
        })

        for (const child of children) {
            descendants.push(child.id)
            await getChildren(child.id) // Recursively get children
        }
    }

    await getChildren(fileId)
    return descendants
}

/**
 * Sets permission for a user on a specific file
 * Uses minimal cache invalidation and async rebuilding for optimal performance.
 */
export async function setFilePermission(
    fileId: number,
    userId: string,
    permission: SharePermission
) {
    // Check if permission already exists
    const existing = await db.query.filePermissions.findFirst({
        where: and(
            eq(filePermissions.fileId, fileId),
            eq(filePermissions.userId, userId)
        ),
    })

    let result
    if (existing) {
        // Update existing permission
        result = await db
            .update(filePermissions)
            .set({
                permission,
                updatedAt: new Date(),
            })
            .where(
                and(
                    eq(filePermissions.fileId, fileId),
                    eq(filePermissions.userId, userId)
                )
            )
            .returning()
    } else {
        // Create new permission
        result = await db
            .insert(filePermissions)
            .values({
                fileId,
                userId,
                permission,
            })
            .returning()
    }

    // Minimal cache invalidation - only invalidate specific user-file permission
    invalidateSpecificPermission(userId, fileId)

    // Trigger async rebuild in background (non-blocking)
    asyncRebuildEffectivePermissions(fileId, userId)

    return result
}

/**
 * Removes permission for a user on a specific file
 * Uses minimal cache invalidation and async rebuilding for optimal performance.
 */
export async function removeFilePermission(fileId: number, userId: string) {
    const result = await db
        .delete(filePermissions)
        .where(
            and(
                eq(filePermissions.fileId, fileId),
                eq(filePermissions.userId, userId)
            )
        )
        .returning()

    // Minimal cache invalidation - only invalidate specific user-file permission
    invalidateSpecificPermission(userId, fileId)

    // Trigger async rebuild in background (non-blocking)
    asyncRebuildEffectivePermissions(fileId, userId)

    return result
}

/**
 * Gets all users with permissions on a specific file
 */
export async function getFilePermissions(fileId: number) {
    return await db.query.filePermissions.findMany({
        where: eq(filePermissions.fileId, fileId),
        with: {
            user: {
                columns: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
    })
}

/**
 * Checks if a user has at least the specified permission level on a file
 * Uses ultra-fast caching system for optimal performance.
 */
export async function hasPermission(
    userId: string,
    fileId: number,
    requiredPermission: SharePermission
): Promise<boolean> {
    const result = await superFastPermissionCheck(
        userId,
        fileId,
        requiredPermission
    )
    return result !== null
}
