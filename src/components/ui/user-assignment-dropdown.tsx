'use client'

import * as React from 'react'
import { useState } from 'react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Users, X } from 'lucide-react'
import { cn } from '~/lib/utils'

export interface AssignedUser {
    id: string
    name: string | null
    email: string
}

export interface UserAssignmentDropdownProps {
    assignedUsers: AssignedUser[]
    availableUsers: (
        | AssignedUser
        | { id: string; name?: string | null; email: string }
    )[]
    onUserToggle: (userId: string, userName: string, userEmail: string) => void
    onClearAll: () => void
    isLoading?: boolean
    className?: string
    buttonClassName?: string
    disabled?: boolean
    compact?: boolean
}

export function UserAssignmentDropdown({
    assignedUsers,
    availableUsers,
    onUserToggle,
    onClearAll,
    isLoading = false,
    className,
    buttonClassName,
    disabled = false,
    compact = false,
}: UserAssignmentDropdownProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [isOpen, setIsOpen] = useState(false)

    const filteredUsers = availableUsers?.filter(
        (user) =>
            user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (user.name &&
                user.name.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    const handleUserToggle = (
        userId: string,
        userName: string,
        userEmail: string
    ) => {
        onUserToggle(userId, userName, userEmail)
        // Don't close dropdown to allow multi-select
    }

    const handleClearAll = () => {
        onClearAll()
        setIsOpen(false)
    }

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild disabled={disabled}>
                {assignedUsers.length > 0 ? (
                    <div
                        className={cn(
                            'flex items-center gap-1 cursor-pointer',
                            className
                        )}
                    >
                        {assignedUsers.slice(0, 2).map((user) => (
                            <Badge
                                key={user.id}
                                variant="secondary"
                                className={cn(
                                    compact
                                        ? 'h-6 px-2 text-xs'
                                        : 'h-7 px-3 text-sm',
                                    'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
                                )}
                            >
                                {user.name || user.email}
                            </Badge>
                        ))}
                        {assignedUsers.length > 2 && (
                            <Badge
                                variant="secondary"
                                className={cn(
                                    compact
                                        ? 'h-6 px-2 text-xs'
                                        : 'h-7 px-3 text-sm',
                                    'bg-primary/10 text-primary border-primary/20'
                                )}
                            >
                                +{assignedUsers.length - 2}
                            </Badge>
                        )}
                    </div>
                ) : (
                    <Button
                        variant="outline"
                        size={compact ? 'sm' : 'default'}
                        className={cn(
                            compact ? 'h-6 px-2 text-xs' : 'h-8 px-3 text-sm',
                            'border-dashed',
                            'bg-background border-border text-muted-foreground',
                            'hover:bg-accent hover:text-accent-foreground hover:border-solid',
                            buttonClassName
                        )}
                    >
                        <Users
                            className={cn(
                                compact ? 'h-3 w-3' : 'h-4 w-4',
                                'mr-1'
                            )}
                        />
                        Assign
                    </Button>
                )}
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80 p-0" align="end">
                <div className="p-3 border-b bg-muted/50">
                    <div className="mb-3">
                        <Input
                            type="text"
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-8"
                        />
                    </div>

                    {/* Currently assigned users */}
                    {assignedUsers.length > 0 && (
                        <div className="mb-3">
                            <div className="text-xs font-medium text-muted-foreground mb-2">
                                Assigned ({assignedUsers.length})
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {assignedUsers.map((user) => (
                                    <Badge
                                        key={user.id}
                                        variant="secondary"
                                        className="text-xs cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
                                        onClick={() =>
                                            handleUserToggle(
                                                user.id,
                                                user.name || user.email,
                                                user.email
                                            )
                                        }
                                    >
                                        {user.name || user.email}
                                        <X className="h-3 w-3 ml-1" />
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="max-h-40 overflow-y-auto">
                    {isLoading && (
                        <div className="text-sm text-muted-foreground p-3 text-center">
                            Loading users...
                        </div>
                    )}
                    {!isLoading &&
                        filteredUsers &&
                        filteredUsers.length === 0 && (
                            <div className="text-sm text-muted-foreground p-3 text-center">
                                No users found
                            </div>
                        )}
                    {!isLoading &&
                        filteredUsers &&
                        filteredUsers.map((user) => {
                            const isAssigned = assignedUsers.some(
                                (u) => u.id === user.id
                            )
                            return (
                                <button
                                    key={user.id}
                                    className={cn(
                                        'w-full text-left p-3 text-sm rounded-none hover:bg-accent flex items-center justify-between transition-colors',
                                        isAssigned &&
                                            'bg-primary/5 text-primary border-l-2 border-primary'
                                    )}
                                    onClick={() =>
                                        handleUserToggle(
                                            user.id,
                                            user.name || user.email,
                                            user.email
                                        )
                                    }
                                >
                                    <span>{user.name || user.email}</span>
                                    {isAssigned && (
                                        <X className="h-3 w-3 text-primary" />
                                    )}
                                </button>
                            )
                        })}
                </div>

                {assignedUsers.length > 0 && (
                    <div className="p-3 border-t bg-muted/50">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleClearAll}
                            className="w-full text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        >
                            Clear all assignments
                        </Button>
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
