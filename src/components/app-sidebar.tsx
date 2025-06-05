'use client'

import { useState } from 'react'
import { Trash2, Edit2, MoreHorizontal, FolderPlus, FileText, Sheet, ClipboardList, File as FileIcon, UploadCloud } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, Home, MessageSquare, Plus, Users, UserCircle, LogOut, Settings, Folder } from 'lucide-react'
import { FileTree, type FileNode } from '~/components/file-tree'
import { api } from '~/trpc/react'
import { ultraFastFileCreationInvalidation } from '~/lib/cache-invalidation-ultra-fast'
import { useUser } from '@clerk/nextjs'
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupContent,
    SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarSeparator } from '~/components/ui/sidebar'
import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '~/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '~/components/ui/dropdown-menu'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { SignOutButton } from '@clerk/nextjs'
import { ThemeToggle } from './tiptap-templates/simple/theme-toggle'
import { FILE_TYPES } from '~/server/db/schema'
import { supabase } from '~/lib/supabase-client'
import { uploadFileToSupabase } from '~/components/supabase-utils/uploadFile'

export function AppSidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const [isNewFileDialogOpen, setIsNewFileDialogOpen] = useState(false)
    const [newFileName, setNewFileName] = useState('')
    const [newFileType, setNewFileType] = useState<'page' | 'sheet' | 'form'| 'upload'>('page')
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    
    // Get current user from Clerk
    const { user: clerkUser, isLoaded: isUserLoaded } = useUser()

    const {
        data: fileTree = [],
        isLoading: isFileTreeLoading,
        refetch: refetchFileTree,
    } = api.files.getFilteredFileTree.useQuery(undefined, {
        staleTime: 10 * 60 * 1000,
        gcTime: 15 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
        refetchInterval: false,
    })

    const [activeFileId, setActiveFileId] = useState<number | undefined>()
    const [selectedFileIds, setSelectedFileIds] = useState<number[]>([])
    const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false)
    const [newFolderName, setNewFolderName] = useState('')
    const [selectedParentId, setSelectedParentId] = useState<number | null>(null)

    // Fetch current user profile from our database
    const { data: userProfile } = api.user.getProfile.useQuery(undefined, {
        enabled: isUserLoaded && !!clerkUser,
    })

    // Get query client for cache invalidation
    const utils = api.useUtils()

    // Handle new file creation (page, sheet, form, upload)
    const createFileMutation = api.files.create.useMutation({
        onSuccess: async (data) => {
            setNewFileName('')
            setIsNewFileDialogOpen(false)
            await ultraFastFileCreationInvalidation(utils)
            if (data && data.type === FILE_TYPES.PAGE) {
                router.push(`/pages/${data.id}`)
            } else if (data && data.type === FILE_TYPES.SHEET) {
                router.push(`/sheets/${data.id}`)
            } else if (data && data.type === FILE_TYPES.FORM) {
                router.push(`/forms/${data.id}`)
            } else if (data && data.type === FILE_TYPES.UPLOAD) {
                router.push(`/uploads/${data.id}`)
            }
        },
    })

    // Handle new folder creation
    const createFolderMutation = api.files.create.useMutation({
        onSuccess: async () => {
            setNewFolderName('')
            setIsNewFolderDialogOpen(false)
            await ultraFastFileCreationInvalidation(utils)
        },
    })

    // Handle renaming files
    const renameFileMutation = api.files.update.useMutation({
        onSuccess: async () => {
            await utils.files.getFilteredFileTree.invalidate()
        },
    })

    // Handle deleting files
    const deleteFileMutation = api.files.delete.useMutation({
        onSuccess: async () => {
            await utils.files.getFilteredFileTree.invalidate()
        },
    })

    const updateFileMutation = api.files.update.useMutation({
        onSuccess: async () => {
            await utils.files.getFilteredFileTree.invalidate()
        },
    })

    const handleAddFile = async () => {
        if (newFileType === 'upload') {
            if (!selectedFile) {
                alert('Please select a file to upload.')
                return
            }
            setIsUploading(true)
            try {
                const publicUrl = await uploadFileToSupabase(selectedFile)
                createFileMutation.mutate({
                    name: selectedFile.name,
                    type: 'upload',
                    parentId: selectedParentId || undefined,
                    path: publicUrl,
                    mimetype: selectedFile.type,
                })
                setSelectedFile(null)
                setNewFileName('')
                setIsUploading(false)
            } catch (err: any) {
                alert('Failed to upload file: ' + err.message)
                setIsUploading(false)
            }
            return
        }

        if (!newFileName.trim()) return

        createFileMutation.mutate({
            name: newFileName,
            type: newFileType,
            parentId: selectedParentId || undefined,
        })
    }

    // Helper function to find a node by ID in the file tree
    const findNodeById = (nodes: FileNode[], id: number): FileNode | null => {
        for (const node of nodes) {
            if (node.id === id) return node
            if (node.children && node.children.length > 0) {
                const found = findNodeById(node.children, id)
                if (found) return found
            }
        }
        return null
    }

    // Helper function to check if nodeA is a parent of nodeB (prevents moving a parent into its child)
    const isParentOf = (nodeA: FileNode, nodeB: FileNode): boolean => {
        if (!nodeA.isFolder || !nodeA.children) return false
        if (nodeA.children.some((child) => child.id === nodeB.id)) return true
        return nodeA.children.some((child) => {
            if (child.isFolder && child.children) {
                return isParentOf(child, nodeB)
            }
            return false
        })
    }

    return (
        <>
            <Sidebar>
                <SidebarHeader className="flex flex-col gap-4 p-4">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                            <FileText size={18} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold">
                                NonProfit Workspace
                            </span>
                            <span className="text-xs text-muted-foreground">
                                Project Management
                            </span>
                        </div>
                        <div>
                            <ThemeToggle />
                        </div>
                    </div>
                    <Dialog
                        open={isNewFileDialogOpen}
                        onOpenChange={setIsNewFileDialogOpen}
                    >
                        <DialogTrigger asChild>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        size="sm"
                                        className="w-full justify-start gap-2"
                                    >
                                        <Plus size={16} />
                                        New File
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setNewFileType('page')
                                            setIsNewFileDialogOpen(true)
                                        }}
                                    >
                                        <FileText size={16} className="mr-2" />
                                        New Page
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setNewFileType('sheet')
                                            setIsNewFileDialogOpen(true)
                                        }}
                                    >
                                        <Sheet size={16} className="mr-2" />
                                        New Sheet
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setNewFileType('form')
                                            setIsNewFileDialogOpen(true)
                                        }}
                                    >
                                        <ClipboardList size={16} className="mr-2" />
                                        New Form
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setNewFileType('upload')
                                            setIsNewFileDialogOpen(true)
                                        }}
                                    >
                                        <UploadCloud size={16} className="mr-2" />
                                        Upload File
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>
                                    Create New{' '}
                                    {newFileType === 'page'
                                        ? 'Page'
                                        : newFileType === 'sheet'
                                        ? 'Sheet'
                                        : newFileType === 'form'
                                        ? 'Form'
                                        : 'Upload'}
                                </DialogTitle>
                                <DialogDescription>
                                    Add a new {newFileType} to the system.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    {/* Only show name input for non-upload types */}
                                    {newFileType !== 'upload' && (
                                        <>
                                            <Label htmlFor="file-name">
                                                {newFileType === 'page'
                                                    ? 'Page'
                                                    : newFileType === 'sheet'
                                                    ? 'Sheet'
                                                    : newFileType === 'form'
                                                    ? 'Form'
                                                    : 'File'}{' '}
                                                Name
                                            </Label>
                                            <Input
                                                id="file-name"
                                                value={newFileName}
                                                onChange={(e) => setNewFileName(e.target.value)}
                                                placeholder={`Enter ${newFileType} name`}
                                                disabled={isUploading}
                                            />
                                        </>
                                    )}
                                    {newFileType === 'upload' && (
                                        <>
                                            <Label htmlFor="file-upload">
                                                Choose File
                                            </Label>
                                            <Input
                                                id="file-upload"
                                                type="file"
                                                onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                                                disabled={isUploading}
                                            />
                                        </>
                                    )}
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setIsNewFileDialogOpen(false);
                                        setSelectedFile(null);
                                    }}
                                    disabled={isUploading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleAddFile}
                                    disabled={isUploading}
                                >
                                    {isUploading ? 'Uploading...' : `Create ${newFileType.charAt(0).toUpperCase() + newFileType.slice(1)}`}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* New Folder Dialog */}
                    <Dialog
                        open={isNewFolderDialogOpen}
                        onOpenChange={setIsNewFolderDialogOpen}
                    >
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New Folder</DialogTitle>
                                <DialogDescription>
                                    Add a new folder to organize your pages.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="folder-name">
                                        Folder Name
                                    </Label>
                                    <Input
                                        id="folder-name"
                                        value={newFolderName}
                                        onChange={(e) =>
                                            setNewFolderName(e.target.value)
                                        }
                                        placeholder="Enter folder name"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() =>
                                        setIsNewFolderDialogOpen(false)
                                    }
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={() => {
                                        if (newFolderName.trim()) {
                                            createFolderMutation.mutate({
                                                name: newFolderName,
                                                type: FILE_TYPES.FOLDER,
                                                parentId: selectedParentId || undefined,
                                            })
                                        }
                                    }}
                                >
                                    Create Folder
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </SidebarHeader>
                <SidebarSeparator />
                <SidebarContent>
                    <SidebarGroup>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    asChild
                                    isActive={pathname === '/dashboard'}
                                    tooltip="Dashboard"
                                >
                                    <Link href="/dashboard">
                                        <Home size={18} />
                                        <span>Dashboard</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    asChild
                                    isActive={pathname === '/notifications'}
                                    tooltip="Notifications"
                                >
                                    <Link href="/notifications">
                                        <Bell size={18} />
                                        <span>Notifications</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    asChild
                                    isActive={pathname === '/chats'}
                                    tooltip="Chats"
                                >
                                    <Link href="/chats">
                                        <MessageSquare size={18} />
                                        <span>Chats</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    asChild
                                    isActive={pathname === '/users'}
                                    tooltip="Users"
                                >
                                    <Link href="/users">
                                        <Users size={18} />
                                        <span>Users</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroup>
                    <SidebarSeparator />
                    <SidebarGroup>
                        <SidebarGroupLabel className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span>Files</span>
                            </div>
                            <div className="flex gap-1">
                                <SidebarGroupAction
                                    onClick={() =>
                                        setIsNewFolderDialogOpen(true)
                                    }
                                >
                                    <FolderPlus size={16} />
                                    <span className="sr-only">Add Folder</span>
                                </SidebarGroupAction>
                            </div>
                        </SidebarGroupLabel>
                        <SidebarGroupContent>
                            {isFileTreeLoading ? (
                                <div className="px-3 py-2 text-sm text-muted-foreground">
                                    Loading files...
                                </div>
                            ) : fileTree.length === 0 ? (
                                <div className="px-3 py-2 text-sm text-muted-foreground">
                                    No files found
                                </div>
                            ) : (
                                <div className="px-3">
                                    <FileTree
                                        items={fileTree}
                                        onSelectFile={(id) => {
                                            setActiveFileId(id)
                                            setSelectedFileIds([id])
                                            const node = findNodeById(fileTree, id)
                                            if (node && !node.isFolder) {
                                                if (node.type === 'page') {
                                                    router.push(`/pages/${id}`)
                                                } else if (node.type === 'sheet') {
                                                    router.push(`/sheets/${id}`)
                                                } else if (node.type === 'form') {
                                                    router.push(`/forms/${id}`)
                                                } else if (node.type === 'upload') {
                                                    router.push(`/uploads/${id}`)
                                                }
                                            }
                                        }}
                                        activeFileId={activeFileId}
                                        selectedFileIds={selectedFileIds}
                                        onMultiSelectFile={(fileIds) => {
                                            setSelectedFileIds(fileIds)
                                            if (fileIds.length === 1) {
                                                setActiveFileId(fileIds[0])
                                            }
                                        }}
                                        onMove={(dragId, dropId) => {
                                            const dragNode = findNodeById(fileTree, dragId)
                                            const dropNode = findNodeById(fileTree, dropId)
                                            if (dragNode && dropNode) {
                                                if (
                                                    selectedFileIds.includes(dragId) &&
                                                    selectedFileIds.length > 1
                                                ) {
                                                    const promises = selectedFileIds.map((id) =>
                                                        new Promise((resolve, reject) => {
                                                            const itemNode = findNodeById(fileTree, id)
                                                            if (itemNode && !isParentOf(itemNode, dropNode)) {
                                                                updateFileMutation.mutate(
                                                                    {
                                                                        id,
                                                                        parentId: dropNode.isFolder ? dropId : dropNode.parentId,
                                                                    },
                                                                    {
                                                                        onSuccess: resolve,
                                                                        onError: reject,
                                                                    }
                                                                )
                                                            } else {
                                                                resolve(null)
                                                            }
                                                        })
                                                    )
                                                    void Promise.all(promises).then(() => {
                                                        utils.files.getFilteredFileTree.invalidate()
                                                    })
                                                } else {
                                                    if (dropNode.isFolder) {
                                                        updateFileMutation.mutate(
                                                            {
                                                                id: dragId,
                                                                parentId: dropId,
                                                            },
                                                            {
                                                                onSuccess: () => {
                                                                    utils.files.getFilteredFileTree.invalidate()
                                                                },
                                                            }
                                                        )
                                                    } else {
                                                        updateFileMutation.mutate(
                                                            {
                                                                id: dragId,
                                                                parentId: dropNode.parentId,
                                                            },
                                                            {
                                                                onSuccess: () => {
                                                                    utils.files.getFilteredFileTree.invalidate()
                                                                },
                                                            }
                                                        )
                                                    }
                                                }
                                            }
                                        }}
                                        onCreateFile={(parentId) => {
                                            setSelectedParentId(parentId)
                                            setNewFileType('page')
                                            setIsNewFileDialogOpen(true)
                                        }}
                                        onCreateSheet={(parentId) => {
                                            setSelectedParentId(parentId)
                                            setNewFileType('sheet')
                                            setIsNewFileDialogOpen(true)
                                        }}
                                        onCreateForm={(parentId) => {
                                            setSelectedParentId(parentId)
                                            setNewFileType('form')
                                            setIsNewFileDialogOpen(true)
                                        }}
                                        onCreateUpload={(parentId) => {
                                            setSelectedParentId(parentId)
                                            setNewFileType('upload')
                                            setIsNewFileDialogOpen(true)
                                        }}
                                        onCreateFolder={(parentId) => {
                                            setSelectedParentId(parentId)
                                            setIsNewFolderDialogOpen(true)
                                        }}
                                        onRename={(id, filename) => {
                                            renameFileMutation.mutate(
                                                { id, name: filename },
                                                {
                                                    onSuccess: () => refetchFileTree(),
                                                }
                                            )
                                        }}
                                        onDelete={(id) => {
                                            if (
                                                selectedFileIds.includes(id) &&
                                                selectedFileIds.length > 1
                                            ) {
                                                const promises = selectedFileIds.map(
                                                    (fileId) =>
                                                        new Promise((resolve) => {
                                                            deleteFileMutation.mutate(
                                                                {
                                                                    id: fileId,
                                                                },
                                                                {
                                                                    onSuccess: resolve,
                                                                }
                                                            )
                                                        })
                                                )
                                                void Promise.all(promises).then(() => {
                                                    utils.files.getFilteredFileTree.invalidate()
                                                    setSelectedFileIds([])
                                                })
                                            } else {
                                                deleteFileMutation.mutate(
                                                    { id },
                                                    {
                                                        onSuccess: () => {
                                                            utils.files.getFilteredFileTree.invalidate()
                                                            if (selectedFileIds.includes(id)) {
                                                                setSelectedFileIds(
                                                                    selectedFileIds.filter(
                                                                        (fileId) => fileId !== id
                                                                    )
                                                                )
                                                            }
                                                        },
                                                    }
                                                )
                                            }
                                        }}
                                    />
                                </div>
                            )}
                        </SidebarGroupContent>
                    </SidebarGroup>
                </SidebarContent>
                <SidebarFooter className="p-4">
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                                {clerkUser?.imageUrl ? (
                                    <img
                                        src={clerkUser.imageUrl}
                                        alt={clerkUser.firstName ?? 'User'}
                                        className="h-8 w-8 rounded-full"
                                    />
                                ) : (
                                    <UserCircle size={18} />
                                )}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-medium">
                                    {clerkUser?.firstName || 'User'}
                                </span>
                                <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                                    {userProfile?.email ||
                                        clerkUser?.emailAddresses?.[0]
                                            ?.emailAddress ||
                                        'Loading...'}
                                </span>
                            </div>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <MoreHorizontal size={16} />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                    <Link href="/profile">
                                        <UserCircle
                                            size={16}
                                            className="mr-2"
                                        />{' '}
                                        Profile
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/settings">
                                        <Settings size={16} className="mr-2" />{' '}
                                        Settings
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <SignOutButton>
                                        <div className="flex items-center">
                                            <LogOut
                                                size={16}
                                                className="mr-2"
                                            />{' '}
                                            Sign Out
                                        </div>
                                    </SignOutButton>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </SidebarFooter>
            </Sidebar>
        </>
    )
}