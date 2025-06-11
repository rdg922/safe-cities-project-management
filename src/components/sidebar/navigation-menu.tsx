'use client'

import Link from 'next/link'
import { Bell, Home, MessageSquare, Users } from 'lucide-react'
import {
    SidebarGroup,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '~/components/ui/sidebar'

interface NavigationMenuProps {
    currentPath: string
}

const navigationItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/notifications', label: 'Notifications', icon: Bell },
    { href: '/chats', label: 'Chats', icon: MessageSquare },
    { href: '/users', label: 'Users', icon: Users },
]

export function NavigationMenu({ currentPath }: NavigationMenuProps) {
    return (
        <SidebarGroup>
            <SidebarMenu>
                {navigationItems.map((item) => {
                    const Icon = item.icon
                    return (
                        <SidebarMenuItem key={item.href}>
                            <SidebarMenuButton
                                asChild
                                isActive={currentPath === item.href}
                                tooltip={item.label}
                            >
                                <Link href={item.href}>
                                    <Icon size={18} />
                                    <span>{item.label}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    )
                })}
            </SidebarMenu>
        </SidebarGroup>
    )
}
