'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    FileText,
    Sheet,
    ClipboardList,
    Folder,
    Folders,
    Plus,
    ChevronDown,
    UploadCloud,
} from 'lucide-react'
import { Button } from '~/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '~/components/ui/dialog'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '~/components/ui/select'
import { FILE_TYPES, type FileType } from '~/server/db/schema'
import { FileTreeSelector } from '~/components/file-tree-selector'
import { api } from '~/trpc/react'
import { navigateToFile } from '~/lib/navigation-utils'
import { ultraFastFileCreationInvalidation } from '~/lib/streamlined-cache-invalidation'
import { uploadFileToSupabase } from '~/components/supabase-utils/uploadFile'

export type NewFileType =
    | 'page'
    | 'sheet'
    | 'form'
    | 'folder'
    | 'programme'
    | 'upload'

interface NewFileDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    fileType?: NewFileType
    onCreateFile?: (data: {
        name: string
        type: FileType
        parentId?: number
    }) => void
    defaultName?: string
    parentId?: number | null
}

export function NewFileDialog({
    open,
    onOpenChange,
    fileType,
    onCreateFile,
    defaultName = '',
    parentId,
}: NewFileDialogProps) {
    const router = useRouter()
    const [selectedType, setSelectedType] = useState<NewFileType>(
        fileType || 'page'
    )
    const [fileName, setFileName] = useState(defaultName)
    const [selectedParentId, setSelectedParentId] = useState<number | null>(
        parentId ?? null
    )
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const { data: fileTree = [], isLoading: isLoadingFileTree } =
        api.files.getFilteredFileTree.useQuery()
    const utils = api.useUtils()

    const createFileMutation = api.files.create.useMutation({
        onSuccess: async (data) => {
            onOpenChange(false)
            await ultraFastFileCreationInvalidation(utils)
            if (onCreateFile && data) {
                onCreateFile({
                    name: fileName,
                    type: data.type,
                    parentId: data.parentId ?? undefined,
                })
            }
            if (data && data.id) {
                navigateToFile(router, data.id, data.type)
            }
            setFileName('')
            setSelectedParentId(null)
            setSelectedFile(null)
            setIsUploading(false)
        },
    })

    useEffect(() => {
        if (open) {
            // Reset all form state when dialog opens
            setFileName(defaultName)
            setSelectedParentId(parentId ?? null)
            setSelectedFile(null)
            setIsUploading(false)

            // Set file type only if provided and different from current
            if (fileType && fileType !== selectedType) {
                setSelectedType(fileType)
            }
        }
    }, [open, fileType, defaultName, parentId])

    const handleCreate = async () => {
        if (selectedType === 'upload') {
            if (!selectedFile) return
            setIsUploading(true)
            try {
                const { path, publicUrl } =
                    await uploadFileToSupabase(selectedFile)
                createFileMutation.mutate({
                    name: selectedFile.name,
                    type: FILE_TYPES.UPLOAD,
                    parentId: selectedParentId ?? undefined,
                    path, // This is the Supabase storage path
                    mimetype: selectedFile.type,
                })
            } catch (err: any) {
                alert('Failed to upload file: ' + (err?.message || err))
                setIsUploading(false)
            }
            return
        }

        if (!fileName.trim()) return
        if (selectedType !== 'programme' && selectedParentId === null) return

        const typeMapping: Record<NewFileType, FileType> = {
            page: FILE_TYPES.PAGE,
            sheet: FILE_TYPES.SHEET,
            form: FILE_TYPES.FORM,
            upload: FILE_TYPES.UPLOAD,
            folder: FILE_TYPES.FOLDER,
            programme: FILE_TYPES.PROGRAMME,
        }

        createFileMutation.mutate({
            name: fileName,
            type: typeMapping[selectedType],
            parentId:
                selectedType === 'programme'
                    ? undefined
                    : (selectedParentId ?? undefined),
        })
    }

    const getFileTypeConfig = (type: NewFileType) => {
        const configs = {
            page: {
                title: 'Page',
                description: 'Create a new document page',
                icon: FileText,
                placeholder: 'Enter page name',
            },
            sheet: {
                title: 'Sheet',
                description: 'Create a new spreadsheet',
                icon: Sheet,
                placeholder: 'Enter sheet name',
            },
            form: {
                title: 'Form',
                description: 'Create a new form for data collection',
                icon: ClipboardList,
                placeholder: 'Enter form name',
            },
            upload: {
                title: 'Upload',
                description: 'Upload a file from your computer',
                icon: UploadCloud,
                placeholder: 'Select file to upload',
            },
            folder: {
                title: 'Folder',
                description: 'Create a new folder to organize files',
                icon: Folder,
                placeholder: 'Enter folder name',
            },
            programme: {
                title: 'Programme',
                description: 'Create a new programme.',
                icon: Folder,
                placeholder: 'Enter programme name',
            },
        }
        return configs[type]
    }

    const config = getFileTypeConfig(selectedType)
    const IconComponent = config.icon

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {fileType
                            ? `Create New ${config.title}`
                            : 'Create New File'}
                    </DialogTitle>
                    <DialogDescription>
                        {fileType
                            ? config.description
                            : 'Choose the type of file you want to create'}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {!fileType && (
                        <div className="grid gap-2">
                            <Label htmlFor="file-type">File Type</Label>
                            <Select
                                value={selectedType}
                                onValueChange={(value) => {
                                    const newType = value as NewFileType

                                    // Prevent unnecessary state updates if type hasn't changed
                                    if (newType === selectedType) return

                                    setSelectedType(newType)

                                    // Clear file-specific state when switching types
                                    if (newType !== 'upload') {
                                        setSelectedFile(null)
                                        // Don't clear fileName for non-upload types
                                    } else {
                                        // When switching TO upload, clear the fileName
                                        setFileName('')
                                    }
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="page">
                                        <div className="flex items-center gap-2">
                                            <FileText className="h-4 w-4" />
                                            Page
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="sheet">
                                        <div className="flex items-center gap-2">
                                            <Sheet className="h-4 w-4" />
                                            Sheet
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="form">
                                        <div className="flex items-center gap-2">
                                            <ClipboardList className="h-4 w-4" />
                                            Form
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="upload">
                                        <div className="flex items-center gap-2">
                                            <UploadCloud className="h-4 w-4" />
                                            Upload
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="folder">
                                        <div className="flex items-center gap-2">
                                            <Folder className="h-4 w-4" />
                                            Folder
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="programme">
                                        <div className="flex items-center gap-2">
                                            <Folders className="h-4 w-4 text-blue-600" />
                                            Programme
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Name input for all except upload, file input for upload */}
                    {selectedType !== 'upload' ? (
                        <div className="grid gap-2">
                            <Label htmlFor="file-name">
                                {config.title} Name
                            </Label>
                            <Input
                                id="file-name"
                                value={fileName}
                                onChange={(e) => setFileName(e.target.value)}
                                placeholder={config.placeholder}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        if (
                                            selectedType === 'programme' ||
                                            selectedParentId !== null
                                        ) {
                                            handleCreate()
                                        }
                                    }
                                }}
                                disabled={createFileMutation.isPending}
                            />
                        </div>
                    ) : (
                        <div className="grid gap-2">
                            <Label htmlFor="file-upload">File</Label>
                            <Input
                                id="file-upload"
                                type="file"
                                onChange={(e) => {
                                    const file = e.target.files?.[0] || null
                                    setSelectedFile(file)
                                    if (file) {
                                        setFileName(file.name)
                                    }
                                }}
                                disabled={
                                    isUploading || createFileMutation.isPending
                                }
                            />
                            {selectedFile && (
                                <div className="text-sm text-muted-foreground">
                                    Selected: {selectedFile.name}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Only show parent selection for non-programme files when no parentId is provided */}
                    {selectedType !== 'programme' && parentId === null && (
                        <div className="grid gap-2">
                            <Label>Parent Location *</Label>
                            {isLoadingFileTree ? (
                                <div className="border rounded-md p-4 text-center text-muted-foreground">
                                    Loading file tree...
                                </div>
                            ) : (
                                <FileTreeSelector
                                    files={fileTree}
                                    selectedId={selectedParentId}
                                    onSelect={setSelectedParentId}
                                />
                            )}
                            <p className="text-xs text-muted-foreground">
                                Select a parent folder or programme for your new{' '}
                                {config.title.toLowerCase()}. Only folders and
                                programmes can contain other files.
                            </p>
                        </div>
                    )}
                    {selectedType === 'programme' && (
                        <div className="grid gap-2">
                            <p className="text-sm text-muted-foreground">
                                Programmes are created at the root level and can
                                contain folders and files.
                            </p>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isUploading || createFileMutation.isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCreate}
                        disabled={
                            (selectedType === 'upload'
                                ? !selectedFile ||
                                  !selectedParentId ||
                                  isUploading
                                : !fileName.trim() ||
                                  (selectedType !== 'programme' &&
                                      selectedParentId === null)) ||
                            createFileMutation.isPending
                        }
                    >
                        {isUploading || createFileMutation.isPending
                            ? 'Uploading...'
                            : `Create ${config.title}`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
