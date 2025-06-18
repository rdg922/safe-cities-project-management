import { api } from '~/trpc/react'
import type { FileType } from './types'

export const useVersionHistory = (
    fileId: number,
    fileType: FileType,
    isOpen: boolean
) => {
    // Use unified endpoints for all file types
    const getVersionHistoryQuery = api.files.getVersionHistory.useQuery(
        { fileId, limit: 30 },
        { enabled: isOpen && !!fileId }
    )

    const restoreVersionMutation = api.files.restoreVersion.useMutation()
    const deleteVersionMutation = api.files.deleteVersion.useMutation()

    return {
        versions: getVersionHistoryQuery.data,
        isLoading: getVersionHistoryQuery.isLoading,
        refetch: getVersionHistoryQuery.refetch,
        restoreVersion: restoreVersionMutation.mutate,
        deleteVersion: deleteVersionMutation.mutate,
        isRestoring: restoreVersionMutation.isPending,
        isDeleting: deleteVersionMutation.isPending,
    }
}
