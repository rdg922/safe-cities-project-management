'use client'

import { useState, useEffect } from 'react'
import { X, Search, Trash2, ChevronDown } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '~/components/ui/avatar'
import { api } from '~/trpc/react'

type SharePermission = 'view' | 'edit' | 'comment'

interface SharedUser {
    id: string
    name: string
    email: string
    permission: SharePermission
}

interface ShareModalProps {
    isOpen: boolean
    onClose: () => void
    filename: string
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

export function ShareModal({ isOpen, onClose, filename }: ShareModalProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([])

    // Get all users from the database
    const { data: allUsers = [], isLoading } = api.user.getAllUsers.useQuery()

    // Filter users based on search query
    const filteredUsers = allUsers.filter(
        (user) =>
            (user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.email
                    ?.toLowerCase()
                    .includes(searchQuery.toLowerCase())) &&
            !sharedUsers.some((sharedUser) => sharedUser.id === user.id)
    )

    const handleAddUser = (user: (typeof allUsers)[0]) => {
        const newSharedUser: SharedUser = {
            id: user.id,
            name: user.name || user.email,
            email: user.email,
            permission: 'view',
        }
        setSharedUsers((prev) => [...prev, newSharedUser])
        setSearchQuery('')
    }

    const handlePermissionChange = (
        userId: string,
        permission: SharePermission
    ) => {
        setSharedUsers((prev) =>
            prev.map((user) =>
                user.id === userId ? { ...user, permission } : user
            )
        )
    }

    const handleRemoveUser = (userId: string) => {
        setSharedUsers((prev) => prev.filter((user) => user.id !== userId))
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
                    {sharedUsers.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium">
                                People with access
                            </h4>
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
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="gap-2"
                                                    >
                                                        {
                                                            permissionLabels[
                                                                user.permission
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
                                                                Can view and
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
                                                                Can view,
                                                                comment, and
                                                                edit
                                                            </div>
                                                        </div>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() =>
                                                    handleRemoveUser(user.id)
                                                }
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button>Done</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
