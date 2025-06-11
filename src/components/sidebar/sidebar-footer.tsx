'use client'

import Link from 'next/link'
import { MoreHorizontal, UserCircle, LogOut, Settings } from 'lucide-react'
import { useUser } from '@clerk/nextjs'
import { SignOutButton } from '@clerk/nextjs'
import { Button } from '~/components/ui/button'
import { SidebarFooter } from '~/components/ui/sidebar'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'

interface SidebarFooterComponentProps {
    userProfile?: { email?: string } | null
}

export function SidebarFooterComponent({
    userProfile,
}: SidebarFooterComponentProps) {
    const { user: clerkUser } = useUser()

    return (
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
                                clerkUser?.emailAddresses?.[0]?.emailAddress ||
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
                                <UserCircle size={16} className="mr-2" />
                                Profile
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href="/settings">
                                <Settings size={16} className="mr-2" />
                                Settings
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <SignOutButton>
                                <div className="flex items-center">
                                    <LogOut size={16} className="mr-2" />
                                    Sign Out
                                </div>
                            </SignOutButton>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </SidebarFooter>
    )
}
