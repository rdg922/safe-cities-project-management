import { api } from '~/trpc/react'

/**
 * Utility functions for invalidating React Query caches when data changes.
 * This provides a centralized way to invalidate caches across the application.
 */

/**
 * Invalidate all caches related to a file operation (create, update, delete, move)
 */
export function invalidateFileCaches(utils: ReturnType<typeof api.useUtils>) {
    return Promise.all([
        utils.files.getFilteredFileTree.invalidate(),
        utils.files.getFileTree.invalidate(),
    ])
}

/**
 * Invalidate all caches when a new file is created
 * This includes both file and permission caches since new files affect the tree structure
 */
export function invalidateFileCreationCaches(
    utils: ReturnType<typeof api.useUtils>
) {
    return Promise.all([
        utils.files.getFilteredFileTree.invalidate(),
        utils.files.getFileTree.invalidate(),
        utils.permissions.batchCheckPermissions.invalidate(),
        utils.permissions.getUserAccessibleFiles.invalidate(),
    ])
}

/**
 * Invalidate all permission-related caches for specific files
 */
export function invalidatePermissionCaches(
    utils: ReturnType<typeof api.useUtils>,
    fileIds?: number[]
) {
    const promises = [
        utils.permissions.getUserPermission.invalidate(),
        utils.permissions.canEditFile.invalidate(),
        utils.permissions.canShareFile.invalidate(),
        utils.permissions.getUserAccessibleFiles.invalidate(),
        utils.permissions.getFilePermissions.invalidate(),
        utils.permissions.getFilePermissionsWithInherited.invalidate(),
    ]

    if (fileIds && fileIds.length > 0) {
        // Invalidate specific file permissions if file IDs are provided
        fileIds.forEach((fileId) => {
            promises.push(
                utils.permissions.getUserPermission.invalidate({ fileId }),
                utils.permissions.canEditFile.invalidate({ fileId }),
                utils.permissions.canShareFile.invalidate({ fileId }),
                utils.permissions.getFilePermissions.invalidate({ fileId }),
                utils.permissions.getFilePermissionsWithInherited.invalidate({
                    fileId,
                })
            )
        })
    }

    return Promise.all(promises)
}

/**
 * Invalidate all caches when permissions are modified (share, unshare)
 * This should be called whenever file permissions are changed
 */
export function invalidateAllPermissionCaches(
    utils: ReturnType<typeof api.useUtils>,
    fileId?: number
) {
    return Promise.all([
        // Invalidate file tree since permissions affect visibility
        invalidateFileCaches(utils),
        // Invalidate permission caches
        invalidatePermissionCaches(utils, fileId ? [fileId] : undefined),
    ])
}

/**
 * Invalidate permission caches for a file and all its descendants
 * This should be called when a file's permission changes since it affects inherited permissions
 */
export async function invalidatePermissionCachesWithDescendants(
    utils: ReturnType<typeof api.useUtils>,
    fileId: number
) {
    try {
        // Invalidate client-side caches including descendant files
        await Promise.all([
            // Invalidate file tree since permissions affect visibility
            invalidateFileCaches(utils),
            // Invalidate all permission caches broadly to ensure descendant permissions are refreshed
            invalidatePermissionCaches(utils),
            // Also invalidate batch permission checks which might be cached
            utils.permissions.batchCheckPermissions.invalidate(),
            // Invalidate specific permission endpoints that are affected by descendant changes
            utils.permissions.getUserAccessibleFiles.invalidate(),
            utils.permissions.getFilePermissionsWithInherited.invalidate(),
        ])

        console.log(
            `✅ Invalidated permission caches for file ${fileId} and its descendants`
        )
        return {
            success: true,
            message: `Invalidated permission caches for file ${fileId} and its descendants`,
        }
    } catch (error) {
        console.error(
            'Error invalidating permission caches with descendants:',
            error
        )
        // Fallback to regular permission cache invalidation
        return invalidateAllPermissionCaches(utils, fileId)
    }
}

/**
 * Invalidate user-related caches (profile, etc.)
 */
export function invalidateUserCaches(utils: ReturnType<typeof api.useUtils>) {
    return Promise.all([utils.user.getProfile.invalidate()])
}
