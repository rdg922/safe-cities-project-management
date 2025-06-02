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
    ]

    if (fileIds && fileIds.length > 0) {
        // Invalidate specific file permissions if file IDs are provided
        fileIds.forEach((fileId) => {
            promises.push(
                utils.permissions.getUserPermission.invalidate({ fileId }),
                utils.permissions.canEditFile.invalidate({ fileId }),
                utils.permissions.canShareFile.invalidate({ fileId }),
                utils.permissions.getFilePermissions.invalidate({ fileId })
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
 * Invalidate user-related caches (profile, etc.)
 */
export function invalidateUserCaches(utils: ReturnType<typeof api.useUtils>) {
    return Promise.all([utils.user.getProfile.invalidate()])
}
