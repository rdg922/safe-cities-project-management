'use client'

import { useState, useEffect } from 'react'
import { Trash2, Edit2, MoreHorizontal, FolderPlus } from 'lucide-react'
import Link from 'next/link'
import { redirect, usePathname, useRouter } from 'next/navigation'
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
    FileText,
} from 'lucide-react'
import { FileTree, type FileNode } from '~/components/file-tree'
import { api } from '~/trpc/react'
import { invalidatePermissionCaches } from '~/lib/cache-invalidation'
import { ultraFastFileCreationInvalidation } from '~/lib/cache-invalidation-ultra-fast'
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
    SidebarTrigger,
} from '~/components/ui/sidebar'
import { Button } from '~/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { SignOutButton } from '@clerk/nextjs'
import { ThemeToggle } from './tiptap-templates/simple/theme-toggle'
import { FILE_TYPES } from '~/server/db/schema'
import { useMobile } from '~/hooks/use-mobile'
import { NewFileDialog, type NewFileType } from './new-file-dialog'
import { navigateToFile } from '~/lib/navigation-utils'

export function AppSidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const [isNewFileDialogOpen, setIsNewFileDialogOpen] = useState(false)
    const [newFileDialogType, setNewFileDialogType] = useState<
        NewFileType | undefined
    >(undefined)

    // Get current user from Clerk
    const { user: clerkUser, isLoaded: isUserLoaded } = useUser()

    // Fetch file tree structure using the new files router with permission filtering
    // Use aggressive caching to prevent unnecessary reloads
    const {
        data: fileTree = [],
        isLoading: isFileTreeLoading,
        refetch: refetchFileTree,
    } = api.files.getFilteredFileTree.useQuery(undefined, {
        staleTime: 10 * 60 * 1000, // 10 minutes - don't refetch unless absolutely necessary
        gcTime: 15 * 60 * 1000, // 15 minutes - keep in memory (renamed from cacheTime in newer React Query)
        refetchOnWindowFocus: false, // Don't refetch when window gets focus
        refetchOnMount: false, // Don't refetch when component mounts if we have cached data
        refetchOnReconnect: false, // Don't refetch when network reconnects
        // Only refetch if data is older than 10 minutes
        refetchInterval: false, // Disable automatic background refetch
    })

    const [activeFileId, setActiveFileId] = useState<number | undefined>()
    const [selectedFileIds, setSelectedFileIds] = useState<number[]>([])

    // Fetch current user profile from our database
    const { data: userProfile, isLoading: isUserProfileLoading } =
        api.user.getProfile.useQuery(undefined, {
            enabled: isUserLoaded && !!clerkUser,
        })

    // Get query client for cache invalidation
    const utils = api.useUtils()

    // Handle renaming files
    const renameFileMutation = api.files.update.useMutation({
        onSuccess: async () => {
            // Invalidate cache instead of manual refetch
            await utils.files.getFilteredFileTree.invalidate()
        },
    })

    // Handle deleting files
    const deleteFileMutation = api.files.delete.useMutation({
        onSuccess: async () => {
            // Invalidate cache instead of manual refetch
            await utils.files.getFilteredFileTree.invalidate()
        },
    })

    const updateFileMutation = api.files.update.useMutation({
        onSuccess: async () => {
            // Invalidate cache instead of manual refetch
            await utils.files.getFilteredFileTree.invalidate()
        },
    })

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

    const isMobile = useMobile()

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
                        onOpenChange={setIsNewFileDialogOpen}
                        fileType={newFileDialogType}
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
                                                        utils.files.getFilteredFileTree.invalidate()
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
                                                                        utils.files.getFilteredFileTree.invalidate() // Refresh to show the new structure
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
                                                                        utils.files.getFilteredFileTree.invalidate() // Refresh to show the new structure
                                                                    },
                                                            }
                                                        )
                                                    }
                                                }
                                            }
                                        }}
                                        onCreateFile={(parentId) => {
                                            setNewFileDialogType('page')
                                            setIsNewFileDialogOpen(true)
                                        }}
                                        onCreateSheet={(parentId) => {
                                            setNewFileDialogType('sheet')
                                            setIsNewFileDialogOpen(true)
                                        }}
                                        onCreateForm={(parentId) => {
                                            setNewFileDialogType('form')
                                            setIsNewFileDialogOpen(true)
                                        }}
                                        onCreateFolder={(parentId) => {
                                            setNewFileDialogType('folder')
                                            setIsNewFileDialogOpen(true)
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
                                                        utils.files.getFilteredFileTree.invalidate()
                                                        setSelectedFileIds([])
                                                    }
                                                )
                                            } else {
                                                // Single item delete
                                                deleteFileMutation.mutate(
                                                    { id },
                                                    {
                                                        onSuccess: () => {
                                                            utils.files.getFilteredFileTree.invalidate()
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
