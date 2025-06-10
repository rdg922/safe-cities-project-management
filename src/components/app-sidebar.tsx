'use client'

import { useState } from 'react'
import {
    Trash2,
    Edit2,
    MoreHorizontal,
    FolderPlus,
    FileText,
    Sheet,
    ClipboardList,
    File as FileIcon,
    UploadCloud,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
    Bell,
    Home,
    MessageSquare,
    Plus,
    Users,
    UserCircle,
    LogOut,
    Settings,
    Folder,
} from 'lucide-react'
import { FileTree, type FileNode } from '~/components/file-tree'
import { api } from '~/trpc/react'
import {
    ultraFastInvalidatePermissionCaches,
    ultraFastFileCreationInvalidation,
    ultraFastInvalidateFileCaches,
    smartInvalidateFileCaches,
    rebuildFileCaches,
} from '~/lib/streamlined-cache-invalidation'
import { fileTreeCache } from '~/lib/file-tree-cache'
import { useToast } from '~/hooks/use-toast'
import { useUser } from '@clerk/nextjs'
import { useFileTree } from '~/providers/file-tree-provider'
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
    SidebarTrigger,
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
import { supabase } from '~/lib/supabase-client'
import { uploadFileToSupabase } from '~/components/supabase-utils/uploadFile'
import { useMobile } from '~/hooks/use-mobile'
import { NewFileDialog, type NewFileType } from './new-file-dialog'
import { navigateToFile } from '~/lib/navigation-utils'
import { SafeCities } from './SafeCities'

export function AppSidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const { toast } = useToast()
    const [isNewFileDialogOpen, setIsNewFileDialogOpen] = useState(false)
    const [newFileDialogType, setNewFileDialogType] = useState<
        NewFileType | undefined
    >(undefined)
    const [newFileParentId, setNewFileParentId] = useState<number | null>(null)

    // Get current user from Clerk
    const { user: clerkUser, isLoaded: isUserLoaded } = useUser()

    // Use the centralized file tree provider instead of direct query
    const {
        fileTree,
        isLoading: isFileTreeLoading,
        refetch: refetchFileTree,
        invalidateFileTree,
        getPermissions,
    } = useFileTree()

    const [activeFileId, setActiveFileId] = useState<number | undefined>()
    const [selectedFileIds, setSelectedFileIds] = useState<number[]>([])

    // Fetch current user profile from our database
    const { data: userProfile } = api.user.getProfile.useQuery(undefined, {
        enabled: isUserLoaded && !!clerkUser,
    })

    // Check if user can create programmes (admin or specific permissions)
    const canCreateProgramme =
        userProfile && 'role' in userProfile
            ? userProfile.role === 'admin'
            : false

    // Get query client for cache invalidation
    const utils = api.useUtils()

    // Handle renaming files
    const renameFileMutation = api.files.update.useMutation({
        onSuccess: async () => {
            // Invalidate cache through our provider
            await invalidateFileTree()
        },
    })

    // Handle deleting files
    const deleteFileMutation = api.files.delete.useMutation({
        onSuccess: async () => {
            // Invalidate cache through our provider
            await invalidateFileTree()
        },
    })

    const updateFileMutation = api.files.update.useMutation({
        onSuccess: async () => {
            // Invalidate cache through our provider
            await invalidateFileTree()
        },
    })

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

    const isMobile = useMobile()

    return (
        <>
            <Sidebar>
                <SidebarHeader className="flex flex-col gap-4 p-4">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-800">
                            <SafeCities size={18} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold">
                                Safe Cities
                            </span>
                            <span className="text-xs text-muted-foreground">
                                Project Management
                            </span>
                        </div>
                        <div>
                            <ThemeToggle />
                        </div>
                        <div>{isMobile && <SidebarTrigger />}</div>
                    </div>
                    <Button
                        size="sm"
                        className="w-full justify-start gap-2"
                        onClick={() => {
                            setNewFileDialogType(undefined)
                            setIsNewFileDialogOpen(true)
                        }}
                    >
                        <Plus size={16} />
                        New File
                    </Button>

                    {/* Unified New File Dialog */}
                    <NewFileDialog
                        open={isNewFileDialogOpen}
                        onOpenChange={(open) => {
                            setIsNewFileDialogOpen(open)
                            if (!open) {
                                // Reset parent ID when dialog closes
                                setNewFileParentId(null)
                            }
                        }}
                        fileType={newFileDialogType}
                        parentId={newFileParentId}
                    />
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
                                <span>Programmes</span>
                            </div>
                            {canCreateProgramme && (
                                <div className="flex gap-1">
                                    <SidebarGroupAction
                                        onClick={() => {
                                            setNewFileDialogType('programme')
                                            setIsNewFileDialogOpen(true)
                                        }}
                                    >
                                        <Plus size={16} />
                                        <span className="sr-only">
                                            Add Programme
                                        </span>
                                    </SidebarGroupAction>
                                </div>
                            )}
                        </SidebarGroupLabel>
                        <SidebarGroupContent>
                            {isFileTreeLoading ? (
                                <div className="px-3 py-2 text-sm text-muted-foreground">
                                    Loading files...
                                </div>
                            ) : (
                                <div className="px-3">
                                    <FileTree
                                        items={fileTree}
                                        onSelectFile={(id) => {
                                            setActiveFileId(id)
                                            setSelectedFileIds([id]) // Reset multi-selection on regular click
                                            // Navigate to the appropriate route based on file type using client-side navigation
                                            const node = findNodeById(
                                                fileTree,
                                                id
                                            )
                                            if (
                                                node &&
                                                !node.isFolder &&
                                                node.type
                                            ) {
                                                // Map the node type to FILE_TYPES
                                                const typeMapping = {
                                                    page: FILE_TYPES.PAGE,
                                                    sheet: FILE_TYPES.SHEET,
                                                    form: FILE_TYPES.FORM,
                                                    folder: FILE_TYPES.FOLDER,
                                                    upload: FILE_TYPES.UPLOAD,
                                                    programme:
                                                        FILE_TYPES.PROGRAMME,
                                                } as const

                                                const fileType =
                                                    typeMapping[node.type]
                                                if (fileType) {
                                                    navigateToFile(
                                                        router,
                                                        id,
                                                        fileType
                                                    )
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
                                            const dragNode = findNodeById(
                                                fileTree,
                                                dragId
                                            )
                                            const dropNode = findNodeById(
                                                fileTree,
                                                dropId
                                            )
                                            if (dragNode && dropNode) {
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
                                                        // Use the streamlined cache invalidation system
                                                        ultraFastInvalidateFileCaches(
                                                            utils
                                                        )
                                                    })
                                                } else {
                                                    // Single item move
                                                    // Get the most up-to-date information about the nodes
                                                    // Always fetch fresh information from the server rather than relying on cache
                                                    const freshDragNodePromise =
                                                        utils.files.getById.fetch(
                                                            { id: dragId }
                                                        )
                                                    const freshDropNodePromise =
                                                        utils.files.getById.fetch(
                                                            { id: dropId }
                                                        )

                                                    // Process the move once we have fresh node data
                                                    Promise.all([
                                                        freshDragNodePromise,
                                                        freshDropNodePromise,
                                                    ])
                                                        .then(
                                                            ([
                                                                dragNodeData,
                                                                dropNodeData,
                                                            ]) => {
                                                                const freshDragNode =
                                                                    dragNodeData
                                                                const freshDropNode =
                                                                    dropNodeData

                                                                if (
                                                                    !freshDragNode ||
                                                                    !freshDropNode
                                                                ) {
                                                                    console.error(
                                                                        'Missing node data for drag and drop operation'
                                                                    )
                                                                    return
                                                                }

                                                                // Clear any cached data for these nodes and their hierarchies
                                                                fileTreeCache.clearFileCache(
                                                                    dragId
                                                                )
                                                                fileTreeCache.clearFileCache(
                                                                    dropId
                                                                )

                                                                // Also clear cache for the current parent to ensure proper tree structure
                                                                if (
                                                                    freshDragNode.parentId !==
                                                                    null
                                                                ) {
                                                                    fileTreeCache.clearFileCache(
                                                                        freshDragNode.parentId
                                                                    )
                                                                }

                                                                // Check if drop target is a folder or programme
                                                                if (
                                                                    freshDropNode.type ===
                                                                        'folder' ||
                                                                    freshDropNode.type ===
                                                                        'programme'
                                                                ) {
                                                                    console.log(
                                                                        `Moving node ${dragId} to folder/programme ${dropId} (previous parent: ${freshDragNode.parentId})`
                                                                    )

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
                                                                                    // Perform full cache rebuild to ensure consistency
                                                                                    rebuildFileCaches(
                                                                                        utils
                                                                                    ).then(
                                                                                        () => {
                                                                                            // Refresh UI
                                                                                            refetchFileTree()
                                                                                            console.log(
                                                                                                `Successfully moved node ${dragId} to parent ${dropId}`
                                                                                            )
                                                                                        }
                                                                                    )
                                                                                },
                                                                        }
                                                                    )
                                                                } else {
                                                                    // If dropped on a file, make it a sibling (share same parent)
                                                                    // Handle null parentId case (root level files)
                                                                    const newParentId =
                                                                        freshDropNode.parentId ??
                                                                        null
                                                                    console.log(
                                                                        `Moving node ${dragId} to be sibling with ${dropId} under parent ${newParentId ?? 'root'}`
                                                                    )

                                                                    // Clear cache for the new parent as well
                                                                    if (
                                                                        newParentId !==
                                                                        null
                                                                    ) {
                                                                        fileTreeCache.clearFileCache(
                                                                            newParentId
                                                                        )
                                                                    }

                                                                    updateFileMutation.mutate(
                                                                        {
                                                                            id: dragId,
                                                                            parentId:
                                                                                newParentId,
                                                                        },
                                                                        {
                                                                            onSuccess:
                                                                                () => {
                                                                                    // Perform full cache rebuild to ensure consistency
                                                                                    rebuildFileCaches(
                                                                                        utils
                                                                                    ).then(
                                                                                        () => {
                                                                                            // Refresh UI
                                                                                            refetchFileTree()
                                                                                            console.log(
                                                                                                `Successfully moved node ${dragId} to parent ${newParentId ?? 'root'}`
                                                                                            )
                                                                                        }
                                                                                    )
                                                                                },
                                                                        }
                                                                    )
                                                                }
                                                            }
                                                        )
                                                        .catch((error) => {
                                                            console.error(
                                                                'Error fetching fresh node data:',
                                                                error
                                                            )
                                                            toast({
                                                                title: 'Error moving item',
                                                                description:
                                                                    'Could not get the latest file information. Please try again.',
                                                                variant:
                                                                    'destructive',
                                                            })
                                                        })
                                                }
                                            }
                                        }}
                                        onCreateFile={(
                                            parentId: number | null
                                        ) => {
                                            setNewFileDialogType('page')
                                            setNewFileParentId(parentId)
                                            setIsNewFileDialogOpen(true)
                                        }}
                                        onCreateSheet={(
                                            parentId: number | null
                                        ) => {
                                            setNewFileDialogType('sheet')
                                            setNewFileParentId(parentId)
                                            setIsNewFileDialogOpen(true)
                                        }}
                                        onCreateForm={(
                                            parentId: number | null
                                        ) => {
                                            setNewFileDialogType('form')
                                            setNewFileParentId(parentId)
                                            setIsNewFileDialogOpen(true)
                                        }}
                                        onCreateUpload={(
                                            parentId: number | null
                                        ) => {
                                            setNewFileDialogType('upload')
                                            setNewFileParentId(parentId)
                                            setIsNewFileDialogOpen(true)
                                        }}
                                        onCreateFolder={(
                                            parentId: number | null
                                        ) => {
                                            setNewFileDialogType('folder')
                                            setNewFileParentId(parentId)
                                            setIsNewFileDialogOpen(true)
                                        }}
                                        onRename={(
                                            id: number,
                                            filename: string
                                        ) => {
                                            renameFileMutation.mutate(
                                                { id, name: filename },
                                                {
                                                    onSuccess: () =>
                                                        refetchFileTree(),
                                                }
                                            )
                                        }}
                                        onDelete={(id: number) => {
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
                                                        // Use the streamlined cache invalidation system
                                                        ultraFastInvalidateFileCaches(
                                                            utils
                                                        )
                                                        setSelectedFileIds([])
                                                    }
                                                )
                                            } else {
                                                deleteFileMutation.mutate(
                                                    { id },
                                                    {
                                                        onSuccess: () => {
                                                            // Use the streamlined cache invalidation system
                                                            smartInvalidateFileCaches(
                                                                utils
                                                            )
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
