'use client'

import { Plus } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { SidebarHeader, SidebarTrigger } from '~/components/ui/sidebar'
import { ThemeToggle } from '../tiptap-templates/simple/theme-toggle'
import { SafeCities } from '../SafeCities'
import { useMobile } from '~/hooks/use-mobile'

interface SidebarHeaderComponentProps {
    onNewFileClick: () => void
}

export function SidebarHeaderComponent({
    onNewFileClick,
}: SidebarHeaderComponentProps) {
    const isMobile = useMobile()

    return (
        <SidebarHeader className="flex flex-col gap-4 p-4">
            <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-800">
                    <SafeCities size={18} />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-semibold">Safe Cities</span>
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
                onClick={onNewFileClick}
            >
                <Plus size={16} />
                New File
            </Button>
        </SidebarHeader>
    )
}
