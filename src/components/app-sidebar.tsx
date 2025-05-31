'use client'

import { useState, useEffect } from 'react'
import {
    Trash2,
    Edit2,
    MoreHorizontal,
    FolderPlus,
    FileText,
    Sheet,
} from 'lucide-react'
import Link from 'next/link'
import { redirect, usePathname } from 'next/navigation'
import {
    Bell,
    Home,
    MessageSquare,
    Plus,
    Users,
    File,
    UserCircle,
    LogOut,
    Settings,
    Folder,
} from 'lucide-react'
import { FileTree, type FileNode } from '~/components/file-tree'
import { api } from '~/trpc/react'
import { useUser } from '@clerk/nextjs'
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupAction,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator,
} from '~/components/ui/sidebar'
import { Button } from '~/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '~/components/ui/dialog'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { SignOutButton } from '@clerk/nextjs'
import { ThemeToggle } from './tiptap-templates/simple/theme-toggle'
import { FILE_TYPES } from '~/server/db/schema'

export function AppSidebar() {
    const pathname = usePathname()
    const [isNewFileDialogOpen, setIsNewFileDialogOpen] = useState(false)
    const [newFileName, setNewFileName] = useState('')
    const [newFileType, setNewFileType] = useState<'page' | 'sheet'>('page')

    // Get current user from Clerk
    const { user: clerkUser, isLoaded: isUserLoaded } = useUser()

    // Fetch file tree structure using the new files router with permission filtering
    const {
        data: fileTree = [],
        isLoading: isFileTreeLoading,
        refetch: refetchFileTree,
    } = api.files.getFilteredFileTree.useQuery()

    const [activeFileId, setActiveFileId] = useState<number | undefined>()
    const [selectedFileIds, setSelectedFileIds] = useState<number[]>([])
    const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false)
    const [newFolderName, setNewFolderName] = useState('')
    const [selectedParentId, setSelectedParentId] = useState<number | null>(
        null
    )

    // Fetch current user profile from our database
    const { data: userProfile, isLoading: isUserProfileLoading } =
        api.user.getProfile.useQuery(undefined, {
            enabled: isUserLoaded && !!clerkUser,
        })

    // Handle new file creation (page or sheet)
    const createFileMutation = api.files.create.useMutation({
        onSuccess: async (data) => {
            setNewFileName('')
            setIsNewFileDialogOpen(false)
            await refetchFileTree()

            // Navigate to the new file
            if (data && data.type === FILE_TYPES.PAGE) {
                window.location.href = `/pages/${data.id}`
            } else if (data && data.type === FILE_TYPES.SHEET) {
                window.location.href = `/sheets/${data.id}`
            }
        },
    })

    // Handle new folder creation
    const createFolderMutation = api.files.create.useMutation({
        onSuccess: async () => {
            setNewFolderName('')
            setIsNewFolderDialogOpen(false)
            await refetchFileTree()
        },
    })

    // Handle renaming files
    const renameFileMutation = api.files.update.useMutation({
        onSuccess: async () => {
            await refetchFileTree()
        },
    })

    // Handle deleting files
    const deleteFileMutation = api.files.delete.useMutation({
        onSuccess: async () => {
            await refetchFileTree()
        },
    })

    const updateFileMutation = api.files.update.useMutation({
        onSuccess: async () => {
            refetchFileTree()
        },
    })


    const handleAddFile = () => {
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
            if (node.id === id) {
                return node
            }
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

        // Direct child check
        if (nodeA.children.some((child) => child.id === nodeB.id)) return true

        // Recursive check for any level of nesting
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
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>
                                    Create New{' '}
                                    {newFileType === 'page' ? 'Page' : 'Sheet'}
                                </DialogTitle>
                                <DialogDescription>
                                    Add a new {newFileType} to the system.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="file-name">
                                        {newFileType === 'page'
                                            ? 'Page'
                                            : 'Sheet'}{' '}
                                        Name
                                    </Label>
                                    <Input
                                        id="file-name"
                                        value={newFileName}
                                        onChange={(e) =>
                                            setNewFileName(e.target.value)
                                        }
                                        placeholder={`Enter ${newFileType} name`}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() =>
                                        setIsNewFileDialogOpen(false)
                                    }
                                >
                                    Cancel
                                </Button>
                                <Button onClick={handleAddFile}>
                                    Create{' '}
                                    {newFileType === 'page' ? 'Page' : 'Sheet'}
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
                                                parentId:
                                                    selectedParentId ||
                                                    undefined,
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
                                {/* <SidebarGroupAction onClick={() => setIsNewPageDialogOpen(true)}>
                  <Plus size={16} />
                  <span className="sr-only">Add Page</span>
                </SidebarGroupAction> */}
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
                                            setSelectedFileIds([id]) // Reset multi-selection on regular click
                                            // Navigate to the appropriate route based on file type
                                            const node = findNodeById(
                                                fileTree,
                                                id
                                            )
                                            if (node && !node.isFolder) {
                                                if (node.type === 'page') {
                                                    window.location.href = `/pages/${id}`
                                                } else if (
                                                    node.type === 'sheet'
                                                ) {
                                                    window.location.href = `/sheets/${id}`
                                                }
                                            }
                                        }}
                                        activeFileId={activeFileId}
                                        selectedFileIds={selectedFileIds}
                                        onMultiSelectFile={(fileIds) => {
                                            setSelectedFileIds(fileIds)

                                            // If there's only one selected, make it the active file too
                                            if (fileIds.length === 1) {
                                                setActiveFileId(fileIds[0])
                                            }
                                        }}
                                        onMove={(dragId, dropId) => {
                                            // Handle moving files/folders
                                            const dragNode = findNodeById(
                                                fileTree,
                                                dragId
                                            )
                                            const dropNode = findNodeById(
                                                fileTree,
                                                dropId
                                            )

                                            if (dragNode && dropNode) {
                                                // Check if we're dragging a multi-selected item
                                                if (
                                                    selectedFileIds.includes(
                                                        dragId
                                                    ) &&
                                                    selectedFileIds.length > 1
                                                ) {
                                                    // Move all selected items to the destination
                                                    const promises =
                                                        selectedFileIds.map(
                                                            (id) =>
                                                                // Need to ensure we're not trying to move a parent into its child
                                                                new Promise(
                                                                    (
                                                                        resolve,
                                                                        reject
                                                                    ) => {
                                                                        const itemNode =
                                                                            findNodeById(
                                                                                fileTree,
                                                                                id
                                                                            )
                                                                        if (
                                                                            itemNode &&
                                                                            !isParentOf(
                                                                                itemNode,
                                                                                dropNode
                                                                            )
                                                                        ) {
                                                                            updateFileMutation.mutate(
                                                                                {
                                                                                    id,
                                                                                    parentId:
                                                                                        dropNode.isFolder
                                                                                            ? dropId
                                                                                            : dropNode.parentId,
                                                                                },
                                                                                {
                                                                                    onSuccess:
                                                                                        resolve,
                                                                                    onError:
                                                                                        reject,
                                                                                }
                                                                            )
                                                                        } else {
                                                                            // Skip invalid moves (like parent into child)
                                                                            resolve(
                                                                                null
                                                                            )
                                                                        }
                                                                    }
                                                                )
                                                        )

                                                    // After all mutations complete, refresh the tree
                                                    void Promise.all(
                                                        promises
                                                    ).then(() => {
                                                        refetchFileTree()
                                                    })
                                                } else {
                                                    // Single item move
                                                    // Auto-expand the folder when something is dropped on it
                                                    if (dropNode.isFolder) {
                                                        // If dropped on a folder, make it a child of that folder
                                                        updateFileMutation.mutate(
                                                            {
                                                                id: dragId,
                                                                parentId:
                                                                    dropId,
                                                            },
                                                            {
                                                                onSuccess:
                                                                    () => {
                                                                        refetchFileTree() // Refresh to show the new structure
                                                                    },
                                                            }
                                                        )
                                                    } else {
                                                        // If dropped on a file, make it a sibling (share same parent)
                                                        updateFileMutation.mutate(
                                                            {
                                                                id: dragId,
                                                                parentId:
                                                                    dropNode.parentId,
                                                            },
                                                            {
                                                                onSuccess:
                                                                    () => {
                                                                        refetchFileTree() // Refresh to show the new structure
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
                                        onCreateFolder={(parentId) => {
                                            setSelectedParentId(parentId)
                                            setIsNewFolderDialogOpen(true)
                                        }}
                                        onRename={(id, filename) => {
                                            renameFileMutation.mutate(
                                                { id, name: filename },
                                                {
                                                    onSuccess: () =>
                                                        refetchFileTree(),
                                                }
                                            )
                                        }}
                                        onDelete={(id) => {
                                            // If multiple items are selected, delete them all
                                            if (
                                                selectedFileIds.includes(id) &&
                                                selectedFileIds.length > 1
                                            ) {
                                                const promises =
                                                    selectedFileIds.map(
                                                        (fileId) =>
                                                            new Promise(
                                                                (resolve) => {
                                                                    deleteFileMutation.mutate(
                                                                        {
                                                                            id: fileId,
                                                                        },
                                                                        {
                                                                            onSuccess:
                                                                                resolve,
                                                                        }
                                                                    )
                                                                }
                                                            )
                                                    )

                                                void Promise.all(promises).then(
                                                    () => {
                                                        refetchFileTree()
                                                        setSelectedFileIds([])
                                                    }
                                                )
                                            } else {
                                                // Single item delete
                                                deleteFileMutation.mutate(
                                                    { id },
                                                    {
                                                        onSuccess: () => {
                                                            refetchFileTree()
                                                            if (
                                                                selectedFileIds.includes(
                                                                    id
                                                                )
                                                            ) {
                                                                setSelectedFileIds(
                                                                    selectedFileIds.filter(
                                                                        (
                                                                            fileId
                                                                        ) =>
                                                                            fileId !==
                                                                            id
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
