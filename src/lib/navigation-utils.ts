import { type AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { FILE_TYPES, type FileType } from '~/server/db/schema'

/**
 * Navigate to the appropriate route based on file type
 */
export function navigateToFile(
    router: AppRouterInstance,
    fileId: number,
    fileType: FileType
) {
    switch (fileType) {
        case FILE_TYPES.PAGE:
            router.push(`/pages/${fileId}`)
            break
        case FILE_TYPES.SHEET:
            router.push(`/sheets/${fileId}`)
            break
        case FILE_TYPES.FORM:
            router.push(`/forms/${fileId}`)
            break
        // Folders and programmes don't have dedicated pages, so no navigation
        case FILE_TYPES.FOLDER:
        case FILE_TYPES.PROGRAMME:
        default:
            // No navigation for folders/programmes
            break
    }
}
