import { eq, and, inArray } from 'drizzle-orm'
import { db } from '~/server/db'
import {
    files,
    filePermissions,
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
 * Gets the highest permission level for a user on a specific file.
 * Considers permissions on the file itself and all its ancestors.
 */
export async function getUserFilePermission(
    userId: string,
    fileId: number
): Promise<SharePermission | null> {
    // Check if user is admin
    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
    })

    if (user?.role === 'admin') {
        return 'edit' // Admins bypass all permissions
    }

    // Get the file and build ancestor path
    const fileAncestors = await getFileAncestors(fileId)

    if (fileAncestors.length === 0) {
        return null // File not found
    }

    const ancestorIds = fileAncestors.map((f) => f.id)

    // Get all permissions for this user on this file and its ancestors
    const permissions = await db.query.filePermissions.findMany({
        where: and(
            eq(filePermissions.userId, userId),
            inArray(filePermissions.fileId, ancestorIds)
        ),
    })

    if (permissions.length === 0) {
        return null // No permissions found
    }

    // Find the highest permission level
    let highestPermission: SharePermission = 'view'
    let highestLevel = 0

    for (const permission of permissions) {
        const level = PERMISSION_HIERARCHY[permission.permission]
        if (level > highestLevel) {
            highestLevel = level
            highestPermission = permission.permission
        }
    }

    return highestPermission
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
        const file = await db.query.files.findFirst({
            where: eq(files.id, currentFileId),
            columns: {
                id: true,
                name: true,
                parentId: true,
            },
        })

        if (!file) break

        ancestors.push(file)
        currentFileId = file.parentId
    }

    return ancestors
}

/**
 * Sets permission for a user on a specific file
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

    if (existing) {
        // Update existing permission
        return await db
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
        return await db
            .insert(filePermissions)
            .values({
                fileId,
                userId,
                permission,
            })
            .returning()
    }
}

/**
 * Removes permission for a user on a specific file
 */
export async function removeFilePermission(fileId: number, userId: string) {
    return await db
        .delete(filePermissions)
        .where(
            and(
                eq(filePermissions.fileId, fileId),
                eq(filePermissions.userId, userId)
            )
        )
        .returning()
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
 */
export async function hasPermission(
    userId: string,
    fileId: number,
    requiredPermission: SharePermission
): Promise<boolean> {
    const userPermission = await getUserFilePermission(userId, fileId)

    if (!userPermission) return false

    const userLevel = PERMISSION_HIERARCHY[userPermission]
    const requiredLevel = PERMISSION_HIERARCHY[requiredPermission]

    return userLevel >= requiredLevel
}
