'use client'

import { useState, useEffect } from 'react'
import { X, Search, Trash2, ChevronDown } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '~/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '~/components/ui/avatar'
import { api } from '~/trpc/react'
import { smartInvalidatePermissionCaches, instantPermissionCacheInvalidation, invalidateFileTreePermissions } from '~/lib/cache-invalidation-ultra-fast'

type SharePermission = 'view' | 'edit' | 'comment'

interface SharedUser {
    id: string
    name: string
    email: string
    permission: SharePermission
    isLoading?: boolean
}

interface InheritedUser {
    id: string
    name: string
    email: string
    permission: SharePermission
    sourceFileName: string
}

interface ShareModalProps {
    isOpen: boolean
    onClose: () => void
    filename: string
    fileId: number
}

const permissionLabels = {
    view: 'Viewer',
    edit: 'Editor',
    comment: 'Commenter',
}

const permissionDescriptions = {
    view: 'Can view',
    edit: 'Can edit',
    comment: 'Can comment',
}

export function ShareModal({
    isOpen,
    onClose,
    filename,
    fileId,
}: ShareModalProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([])
    const [inheritedUsers, setInheritedUsers] = useState<InheritedUser[]>([])
    const [filePermissions, setFilePermissions] = useState<any[]>([])
    const [isLoadingPermissions, setIsLoadingPermissions] = useState(false)

    // Get all users from the database
    const { data: allUsers = [], isLoading } = api.user.getAllUsers.useQuery()

    // Get utils for async permission fetching and cache invalidation
    const utils = api.useUtils()

    // Async function to fetch file permissions
    const fetchFilePermissions = async () => {
        if (!isOpen || !fileId || typeof fileId !== 'number' || fileId <= 0) {
            return
        }

        setIsLoadingPermissions(true)
        try {
            // Force fresh fetch from server instead of using cache
            // This ensures we get the latest permission state after mutations
            const permissionsData =
                await utils.permissions.getFilePermissionsWithInherited.fetch({
                    fileId,
                })
            setFilePermissions(permissionsData?.directPermissions || [])

            // Process inherited permissions
            const inheritedPerms: InheritedUser[] = (
                permissionsData?.inheritedPermissions || []
            ).map((perm: any) => ({
                id: perm.user.id,
                name: perm.user.name || perm.user.email || 'Unknown User',
                email: perm.user.email || '',
                permission: perm.permission,
                sourceFileName: perm.sourceFile?.name || 'Unknown',
            }))
            setInheritedUsers(inheritedPerms)
        } catch (error) {
            console.error('Error fetching permissions:', error)
            setFilePermissions([])
            setInheritedUsers([])
        } finally {
            setIsLoadingPermissions(false)
        }
    }

    // Fetch permissions when modal opens or fileId changes
    useEffect(() => {
        if (isOpen && fileId) {
            fetchFilePermissions()
        } else {
            setFilePermissions([])
            setInheritedUsers([])
        }
    }, [isOpen, fileId])

    // tRPC mutations for permission management with ultra-fast cache invalidation
    const setPermissionMutation = api.permissions.setPermission.useMutation({
        onSuccess: async () => {
            console.log(
                `✏️ Permission set for file ${fileId}, starting cache invalidation...`
            )

            // Instant UI feedback with minimal cache invalidation
            await instantPermissionCacheInvalidation(utils, fileId)
            console.log(
                `✅ Instant cache invalidation completed for file ${fileId}`
            )

            // Specific file tree invalidation to ensure it updates immediately
            await invalidateFileTreePermissions(utils, fileId)

            // Force invalidate the specific inherited permissions query
            await utils.permissions.getFilePermissionsWithInherited.invalidate({
                fileId,
            })

            // Background smart cache invalidation (includes server-side async rebuild)
            smartInvalidatePermissionCaches(utils, fileId)

            // Refresh modal data with fresh fetch
            await fetchFilePermissions()
            console.log(`🔄 Modal data refreshed for file ${fileId}`)
        },
        onError: (error) => {
            console.error('Error setting permission:', error)
        },
    })

    const removePermissionMutation =
        api.permissions.removePermission.useMutation({
            onSuccess: async () => {
                console.log(
                    `🗑️ Permission removed for file ${fileId}, starting cache invalidation...`
                )

                // Instant UI feedback with minimal cache invalidation
                await instantPermissionCacheInvalidation(utils, fileId)
                console.log(
                    `✅ Instant cache invalidation completed for file ${fileId}`
                )

                // Specific file tree invalidation to ensure it updates immediately
                await invalidateFileTreePermissions(utils, fileId)

                // Force invalidate the specific inherited permissions query
                await utils.permissions.getFilePermissionsWithInherited.invalidate(
                    { fileId }
                )

                // Background smart cache invalidation (includes server-side async rebuild)
                smartInvalidatePermissionCaches(utils, fileId)

                // Refresh modal data with fresh fetch
                await fetchFilePermissions()
                console.log(`🔄 Modal data refreshed for file ${fileId}`)
            },
            onError: (error) => {
                console.error('Error removing permission:', error)
            },
        })

    // Update sharedUsers when filePermissions change
    useEffect(() => {
        if (!isOpen) return // Don't update if modal is closed

        // Add validation to prevent errors
        if (!filePermissions || !Array.isArray(filePermissions)) {
            setSharedUsers((prevUsers) =>
                prevUsers.length > 0 ? [] : prevUsers
            )
            return
        }

        if (filePermissions.length > 0) {
            const users: SharedUser[] = filePermissions.map((fp: any) => ({
                id: fp.userId,
                name: fp.user?.name || fp.user?.email || 'Unknown User',
                email: fp.user?.email || '',
                permission: fp.permission as SharePermission,
                isLoading: false,
            }))

            // Only update if the data has actually changed
            setSharedUsers((prevUsers) => {
                if (prevUsers.length !== users.length) return users

                const hasChanges = users.some((user, index) => {
                    const prevUser = prevUsers[index]
                    return (
                        !prevUser ||
                        prevUser.id !== user.id ||
                        prevUser.permission !== user.permission ||
                        prevUser.name !== user.name ||
                        prevUser.email !== user.email
                    )
                })

                return hasChanges ? users : prevUsers
            })
        } else {
            setSharedUsers((prevUsers) =>
                prevUsers.length > 0 ? [] : prevUsers
            )
        }
    }, [filePermissions, isOpen])

    // Filter users based on search query
    const filteredUsers = allUsers.filter(
        (user) =>
            (user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.email
                    ?.toLowerCase()
                    .includes(searchQuery.toLowerCase())) &&
            !sharedUsers.some((sharedUser) => sharedUser.id === user.id)
    )

    const handleAddUser = async (user: (typeof allUsers)[0]) => {
        const newSharedUser: SharedUser = {
            id: user.id,
            name: user.name || user.email,
            email: user.email,
            permission: 'view',
            isLoading: true,
        }

        // Optimistically add user to UI
        setSharedUsers((prev) => [...prev, newSharedUser])
        setSearchQuery('')

        try {
            await setPermissionMutation.mutateAsync({
                fileId,
                userId: user.id,
                permission: 'view',
            })

            // Update user loading state
            setSharedUsers((prev) =>
                prev.map((u) =>
                    u.id === user.id ? { ...u, isLoading: false } : u
                )
            )
        } catch (error) {
            // Remove user from UI if mutation failed
            setSharedUsers((prev) => prev.filter((u) => u.id !== user.id))
            console.error('Failed to add user:', error)
        }
    }

    const handlePermissionChange = async (
        userId: string,
        permission: SharePermission
    ) => {
        // Set loading state for this user
        setSharedUsers((prev) =>
            prev.map((user) =>
                user.id === userId ? { ...user, isLoading: true } : user
            )
        )

        try {
            await setPermissionMutation.mutateAsync({
                fileId,
                userId,
                permission,
            })

            // Update permission and clear loading state
            setSharedUsers((prev) =>
                prev.map((user) =>
                    user.id === userId
                        ? { ...user, permission, isLoading: false }
                        : user
                )
            )
        } catch (error) {
            // Clear loading state on error
            setSharedUsers((prev) =>
                prev.map((user) =>
                    user.id === userId ? { ...user, isLoading: false } : user
                )
            )
            console.error('Failed to update permission:', error)
        }
    }

    const handleRemoveUser = async (userId: string) => {
        // Set loading state for this user
        setSharedUsers((prev) =>
            prev.map((user) =>
                user.id === userId ? { ...user, isLoading: true } : user
            )
        )

        try {
            await removePermissionMutation.mutateAsync({
                fileId,
                userId,
            })

            // Remove user from UI
            setSharedUsers((prev) => prev.filter((user) => user.id !== userId))
        } catch (error) {
            // Clear loading state on error
            setSharedUsers((prev) =>
                prev.map((user) =>
                    user.id === userId ? { ...user, isLoading: false } : user
                )
            )
            console.error('Failed to remove user:', error)
        }
    }

    const handleCopyLink = () => {
        // In a real implementation, this would copy the shareable link
        navigator.clipboard.writeText(window.location.href)
        // You could show a toast here
    }

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((word) => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                        Share "{filename}"
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Add people section */}
                    <div className="space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Add people"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        {/* Search results */}
                        {searchQuery && (
                            <div className="max-h-40 overflow-y-auto border rounded-md">
                                {isLoading ? (
                                    <div className="p-3 text-sm text-muted-foreground">
                                        Loading users...
                                    </div>
                                ) : filteredUsers.length > 0 ? (
                                    filteredUsers.map((user) => (
                                        <div
                                            key={user.id}
                                            className="flex items-center justify-between p-3 hover:bg-muted cursor-pointer"
                                            onClick={() => handleAddUser(user)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarFallback className="text-xs">
                                                        {getInitials(
                                                            user.name ||
                                                                user.email
                                                        )}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="text-sm font-medium">
                                                        {user.name ||
                                                            user.email}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {user.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-3 text-sm text-muted-foreground">
                                        No users found
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Shared users list */}
                    {(sharedUsers.length > 0 || isLoadingPermissions) && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium">
                                People with access
                            </h4>

                            {isLoadingPermissions ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <div className="animate-spin h-4 w-4 border-2 border-primary rounded-full border-t-transparent"></div>
                                        <span className="text-sm">
                                            Loading permissions...
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {sharedUsers.map((user) => (
                                        <div
                                            key={user.id}
                                            className="flex items-center justify-between p-2 rounded border"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarFallback className="text-xs">
                                                        {getInitials(user.name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="text-sm font-medium">
                                                        {user.name}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {user.email}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {user.isLoading ? (
                                                    <div className="flex items-center justify-center h-8 w-16">
                                                        <div className="animate-spin h-4 w-4 border-2 border-primary rounded-full border-t-transparent"></div>
                                                    </div>
                                                ) : (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger
                                                            asChild
                                                        >
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="gap-2"
                                                                disabled={
                                                                    user.isLoading
                                                                }
                                                            >
                                                                {
                                                                    permissionLabels[
                                                                        user
                                                                            .permission
                                                                    ]
                                                                }
                                                                <ChevronDown className="h-3 w-3" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem
                                                                onClick={() =>
                                                                    handlePermissionChange(
                                                                        user.id,
                                                                        'view'
                                                                    )
                                                                }
                                                            >
                                                                <div>
                                                                    <div className="font-medium">
                                                                        Viewer
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        Can view
                                                                    </div>
                                                                </div>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() =>
                                                                    handlePermissionChange(
                                                                        user.id,
                                                                        'comment'
                                                                    )
                                                                }
                                                            >
                                                                <div>
                                                                    <div className="font-medium">
                                                                        Commenter
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        Can view
                                                                        and
                                                                        comment
                                                                    </div>
                                                                </div>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() =>
                                                                    handlePermissionChange(
                                                                        user.id,
                                                                        'edit'
                                                                    )
                                                                }
                                                            >
                                                                <div>
                                                                    <div className="font-medium">
                                                                        Editor
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        Can
                                                                        view,
                                                                        comment,
                                                                        and edit
                                                                    </div>
                                                                </div>
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() =>
                                                        handleRemoveUser(
                                                            user.id
                                                        )
                                                    }
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                    disabled={user.isLoading}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Inherited permissions section */}
                    {inheritedUsers.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <h4 className="text-sm font-medium text-muted-foreground">
                                    Inherited permissions
                                </h4>
                                <div className="h-px flex-1 bg-border" />
                            </div>
                            <div className="space-y-2">
                                {inheritedUsers.map((user) => (
                                    <div
                                        key={user.id}
                                        className="flex items-center justify-between p-3 rounded-md border border-dashed border-muted-foreground/20 bg-muted/30"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8">
                                                <AvatarFallback className="text-xs bg-muted/50 text-muted-foreground/70">
                                                    {getInitials(user.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="space-y-0.5">
                                                <div className="text-sm font-medium text-muted-foreground">
                                                    {user.name}
                                                </div>
                                                <div className="text-xs text-muted-foreground/60">
                                                    {user.email}
                                                </div>
                                                <div className="text-xs text-muted-foreground/60 flex items-center gap-1">
                                                    <span className="inline-block w-1 h-1 rounded-full bg-muted-foreground/40" />
                                                    Inherited from "
                                                    {user.sourceFileName}"
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-xs text-muted-foreground/80 px-2 py-1 bg-muted/60 rounded-md border border-muted-foreground/10">
                                                {
                                                    permissionLabels[
                                                        user.permission
                                                    ]
                                                }
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Information about inherited permissions */}
                            <div className="rounded-md border border-blue-200/60 bg-blue-50/50 p-3 dark:border-blue-800/30 dark:bg-blue-950/20">
                                <div className="flex items-start gap-2">
                                    <div className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50">
                                        <div className="h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400" />
                                    </div>
                                    <div className="text-xs text-blue-800 dark:text-blue-200">
                                        <span className="font-medium">
                                            Note:
                                        </span>{' '}
                                        These users have access through
                                        inheritance from parent folders. These
                                        are minimum permissions and can be
                                        overridden by granting higher
                                        permissions directly.
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
