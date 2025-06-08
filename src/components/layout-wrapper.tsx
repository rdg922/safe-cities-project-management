'use client'

import { usePathname } from 'next/navigation'
import { AppSidebar } from '~/components/app-sidebar'
import { ChatSidebar } from '~/components/chat-sidebar'

interface LayoutWrapperProps {
    children: React.ReactNode
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
    const pathname = usePathname()

    // Routes that should not show the sidebar
    const noSidebarRoutes = ['/onboarding']
    const shouldHideSidebar = noSidebarRoutes.some((route) =>
        pathname.startsWith(route)
    )

    if (shouldHideSidebar) {
        return (
            <div className="min-h-screen w-full">
                <main className="w-full">{children}</main>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen w-full">
            <AppSidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <main className="flex-1 overflow-auto">{children}</main>
            </div>
            <ChatSidebar />
        </div>
    )
}
