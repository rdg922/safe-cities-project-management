'use client'

import { useState, useEffect } from 'react'
import {
    FileText,
    Sheet,
    ClipboardList,
    Folder,
    Plus,
    ChevronDown,
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

export type NewFileType = 'page' | 'sheet' | 'form' | 'folder' | 'programme'

interface NewFileDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    fileType?: NewFileType // If passed, shows specific dialog for this type
    onCreateFile: (data: {
        name: string
        type: FileType
        parentId?: number
    }) => void
    defaultName?: string
}

export function NewFileDialog({
    open,
    onOpenChange,
    fileType,
    onCreateFile,
    defaultName = '',
}: NewFileDialogProps) {
    const [selectedType, setSelectedType] = useState<NewFileType>(
        fileType || 'page'
    )
    const [fileName, setFileName] = useState(defaultName)
    const [selectedParentId, setSelectedParentId] = useState<number | null>(
        null
    )

    // Get file tree for parent selection
    const { data: fileTree = [], isLoading: isLoadingFileTree } =
        api.files.getFileTree.useQuery()

    // Reset state when dialog opens/closes or fileType changes
    useEffect(() => {
        if (open) {
            setFileName(defaultName)
            setSelectedParentId(null)
            if (fileType) {
                setSelectedType(fileType)
            }
        }
    }, [open, fileType, defaultName])

    const handleCreate = () => {
        if (!fileName.trim()) return
        
        // Only require parent selection for non-programme files
        if (selectedType !== 'programme' && selectedParentId === null) return

        // Map our display types to schema types
        const typeMapping: Record<NewFileType, FileType> = {
            page: FILE_TYPES.PAGE,
            sheet: FILE_TYPES.SHEET,
            form: FILE_TYPES.FORM,
            folder: FILE_TYPES.FOLDER,
            programme: FILE_TYPES.PROGRAMME,
        }

        onCreateFile({
            name: fileName,
            type: typeMapping[selectedType],
            parentId: selectedType === 'programme' ? undefined : selectedParentId ?? undefined,
        })

        // Reset form
        setFileName('')
        setSelectedParentId(null)
        onOpenChange(false)
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
                                onValueChange={(value) =>
                                    setSelectedType(value as NewFileType)
                                }
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
                                    <SelectItem value="folder">
                                        <div className="flex items-center gap-2">
                                            <Folder className="h-4 w-4" />
                                            Folder
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="programme">
                                        <div className="flex items-center gap-2">
                                            <Folder className="h-4 w-4 text-blue-600" />
                                            Programme
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <div className="grid gap-2">
                        <Label htmlFor="file-name">{config.title} Name</Label>
                        <Input
                            id="file-name"
                            value={fileName}
                            onChange={(e) => setFileName(e.target.value)}
                            placeholder={config.placeholder}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    // For programmes, no parent is required
                                    // For other files, parent selection is required
                                    if (selectedType === 'programme' || selectedParentId !== null) {
                                        handleCreate()
                                    }
                                }
                            }}
                        />
                    </div>
                    {/* Only show parent selection for non-programme files */}
                    {selectedType !== 'programme' && (
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
                    {/* Show information for programmes */}
                    {selectedType === 'programme' && (
                        <div className="grid gap-2">
                            <p className="text-sm text-muted-foreground">
                                Programmes are created at the root level and can contain folders and files.
                            </p>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCreate}
                        disabled={
                            !fileName.trim() || 
                            (selectedType !== 'programme' && selectedParentId === null)
                        }
                    >
                        Create {config.title}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
