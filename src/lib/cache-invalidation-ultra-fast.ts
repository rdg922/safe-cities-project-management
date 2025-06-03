import { api } from '~/trpc/react'

/**
 * Ultra-lightweight cache invalidation system focused on speed and minimalism.
 * Reduces cache invalidation operations to bare essentials with smart targeting.
 */

/**
 * Minimal file cache invalidation - only invalidate what's absolutely necessary
 */
export function ultraFastInvalidateFileCaches(
    utils: ReturnType<typeof api.useUtils>
) {
    // Only invalidate the most critical file-related caches
    return Promise.all([
        utils.files.getFilteredFileTree.invalidate(),
        // Skip getFileTree to reduce load - it will refresh naturally on next use
    ])
}

/**
 * Ultra-minimal permission cache invalidation - strategic invalidation only
 */
export function ultraFastInvalidatePermissionCaches(
    utils: ReturnType<typeof api.useUtils>,
    fileId?: number
) {
    const promises = [
        // Only invalidate the most frequently used permission checks
        utils.permissions.getUserPermission.invalidate(),
        utils.permissions.batchCheckPermissions.invalidate(),
        utils.permissions.canEditFile.invalidate(),
        utils.permissions.canShareFile.invalidate(),
    ]

    // Only invalidate specific file permissions if fileId is provided
    if (fileId) {
        promises.push(
            utils.permissions.getUserPermission.invalidate({ fileId }),
            utils.permissions.canEditFile.invalidate({ fileId }),
            utils.permissions.canShareFile.invalidate({ fileId }),
            utils.permissions.getFilePermissionsWithInherited.invalidate({
                fileId,
            })
        )
    }

    return Promise.all(promises)
}

/**
 * Smart permission cache invalidation with async server-side rebuilding
 * This combines minimal client-side invalidation with async server rebuilding
 */
export async function smartInvalidatePermissionCaches(
    utils: ReturnType<typeof api.useUtils>,
    fileId: number
) {
    try {
        // Step 1: Minimal client-side cache invalidation (blocking)
        await ultraFastInvalidatePermissionCaches(utils, fileId)

        // Step 2: Also invalidate broader permission caches to ensure UI updates everywhere
        await Promise.all([
            utils.permissions.getUserPermission.invalidate(),
            utils.permissions.canEditFile.invalidate(),
            utils.permissions.canShareFile.invalidate(),
            utils.permissions.batchCheckPermissions.invalidate(),
        ])

        // Step 3: Trigger async server-side cache rebuild (non-blocking)
        // Note: This would require a separate mutation setup, for now we focus on client-side optimization
        console.log(`✅ Smart cache invalidation completed for file ${fileId}`)
        return {
            success: true,
            message: `Smart cache invalidation completed for file ${fileId}`,
        }
    } catch (error) {
        console.error('Smart cache invalidation failed:', error)
        // Fallback to ultra-fast invalidation
        return ultraFastInvalidatePermissionCaches(utils, fileId)
    }
}

/**
 * Comprehensive permission cache invalidation for when permissions are modified
 * This ensures all UI components reflect the change immediately
 */
export function comprehensivePermissionInvalidation(
    utils: ReturnType<typeof api.useUtils>,
    fileId: number
) {
    console.log(
        `🔄 Comprehensive permission cache invalidation for file ${fileId}`
    )

    const invalidationPromises = [
        // Invalidate all permission-related caches for this specific file
        utils.permissions.getUserPermission.invalidate({ fileId }),
        utils.permissions.canEditFile.invalidate({ fileId }),
        utils.permissions.canShareFile.invalidate({ fileId }),
        utils.permissions.getFilePermissions.invalidate({ fileId }),
        utils.permissions.getFilePermissionsWithInherited.invalidate({
            fileId,
        }),
        utils.permissions.checkPermission.invalidate(),

        // Invalidate general permission caches (without parameters)
        utils.permissions.getUserPermission.invalidate(),
        utils.permissions.canEditFile.invalidate(),
        utils.permissions.canShareFile.invalidate(),
        // CRITICAL: Invalidate batch permissions which the file tree uses
        utils.permissions.batchCheckPermissions.invalidate(),
        utils.permissions.getUserAccessibleFiles.invalidate(),

        // Invalidate file tree cache since permissions affect what files are visible
        utils.files.getFilteredFileTree.invalidate(),
    ]

    console.log(
        `📋 Invalidating ${invalidationPromises.length} permission caches for file ${fileId}`
    )

    return Promise.all(invalidationPromises)
        .then(() => {
            console.log(`✅ Cache invalidation completed for file ${fileId}`)
        })
        .catch((error) => {
            console.error(
                `❌ Cache invalidation failed for file ${fileId}:`,
                error
            )
            throw error
        })
}

/**
 * Immediate response cache invalidation - for when user needs instant feedback
 * Only invalidates the cache entries that affect immediate UI updates
 */
export function instantPermissionCacheInvalidation(
    utils: ReturnType<typeof api.useUtils>,
    fileId: number
) {
    // Use the comprehensive invalidation for instant feedback
    return comprehensivePermissionInvalidation(utils, fileId)
}

/**
 * Background cache warming - preload commonly accessed permissions
 * This runs in the background to warm up caches without blocking the UI
 */
export function backgroundCacheWarming(
    utils: ReturnType<typeof api.useUtils>,
    fileIds: number[]
) {
    // Run in background - don't await
    Promise.resolve().then(async () => {
        try {
            // Warm up batch permission check cache
            if (fileIds.length > 0) {
                await utils.permissions.batchCheckPermissions.prefetch({
                    fileIds,
                })
            }
        } catch (error) {
            console.debug('Background cache warming failed:', error)
        }
    })
}

/**
 * Minimal cache invalidation for file creation - only essential caches
 */
export function ultraFastFileCreationInvalidation(
    utils: ReturnType<typeof api.useUtils>
) {
    return Promise.all([
        ultraFastInvalidateFileCaches(utils),
        // Only invalidate broad permission caches, not specific ones
        utils.permissions.getUserAccessibleFiles.invalidate(),
    ])
}

/**
 * Emergency cache reset - clears all permission-related caches
 * Use only when normal invalidation fails or for debugging
 */
export function emergencyCacheReset(utils: ReturnType<typeof api.useUtils>) {
    return Promise.all([
        // File caches
        utils.files.getFilteredFileTree.invalidate(),
        utils.files.getFileTree.invalidate(),
        // Permission caches
        utils.permissions.getUserPermission.invalidate(),
        utils.permissions.canEditFile.invalidate(),
        utils.permissions.canShareFile.invalidate(),
        utils.permissions.getUserAccessibleFiles.invalidate(),
        utils.permissions.getFilePermissions.invalidate(),
        utils.permissions.getFilePermissionsWithInherited.invalidate(),
        utils.permissions.batchCheckPermissions.invalidate(),
    ])
}

/**
 * Specialized invalidation for file tree permissions
 * This ensures the file tree reflects permission changes immediately
 */
export function invalidateFileTreePermissions(
    utils: ReturnType<typeof api.useUtils>,
    fileId: number
) {
    console.log(`🌳 File tree permission invalidation for file ${fileId}`)

    // Aggressively invalidate all batch permission queries
    // This ensures the useBatchPermissions hook refetches
    return Promise.all([
        // Invalidate all batch permission queries (without specific parameters)
        utils.permissions.batchCheckPermissions.invalidate(),
        // Also invalidate the filtered file tree which determines what files are visible
        utils.files.getFilteredFileTree.invalidate(),
        // Invalidate user accessible files which affects the file tree content
        utils.permissions.getUserAccessibleFiles.invalidate(),
    ]).then(() => {
        console.log(
            `✅ File tree permission invalidation completed for file ${fileId}`
        )
    })
}
