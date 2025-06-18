export type FileType = 'page' | 'sheet' | 'form' | 'document'

export interface Version {
    id: number
    version: number
    content: string
    createdAt: Date
    changeDescription?: string | null
    createdBy?: {
        id: string
        name: string
        email: string
    } | null
}

export interface VersionHistoryProps {
    fileId: number
    fileType: FileType
    isOpen: boolean
    onClose: () => void
    onRestore?: (content: string) => void
}

export interface VersionPreviewProps {
    content: string
    fileType: FileType
    isOpen: boolean
    onClose: () => void
}

export interface VersionItemProps {
    version: Version
    fileType: FileType
    onRestore: (versionId: number) => void
    onDelete: (versionId: number) => void
    onPreview: (content: string) => void
    isRestoring: boolean
    isDeleting: boolean
}
