'use client'

import { usePathname } from 'next/navigation'
import {
    Sidebar,
    SidebarContent,
    SidebarSeparator,
} from '~/components/ui/sidebar'
import { NewFileDialog } from './new-file-dialog'
import { SidebarHeaderComponent } from './sidebar/sidebar-header'
import { NavigationMenu } from './sidebar/navigation-menu'
import { ProgrammeSection } from './sidebar/programme-section'
import { SidebarFooterComponent } from './sidebar/sidebar-footer'
import { useSidebarState, useFileOperations } from './sidebar/use-sidebar-state'

export function AppSidebar() {
    const pathname = usePathname()

    const {
        isNewFileDialogOpen,
        setIsNewFileDialogOpen,
        newFileDialogType,
        setNewFileDialogType,
        newFileParentId,
        setNewFileParentId,
        activeFileId,
        setActiveFileId,
        selectedFileIds,
        setSelectedFileIds,
        userProfile,
        fileTree,
        canCreateProgramme,
    } = useSidebarState()

    const { handleMove, handleRename, handleDelete } = useFileOperations()

    const handleNewFileClick = () => {
        setNewFileDialogType(undefined)
        setIsNewFileDialogOpen(true)
    }

    const fileActions = {
        onMove: (dragId: number, dropId: number) =>
            handleMove(dragId, dropId, fileTree, selectedFileIds),
        onRename: handleRename,
        onDelete: (id: number) =>
            handleDelete(id, selectedFileIds, setSelectedFileIds),
    }

    return (
        <>
            <Sidebar>
                <SidebarHeaderComponent onNewFileClick={handleNewFileClick} />

                <SidebarSeparator />

                <SidebarContent>
                    <NavigationMenu
                        currentPath={pathname}
                        userRole={
                            userProfile && 'role' in userProfile
                                ? userProfile.role || undefined
                                : undefined
                        }
                    />

                    <SidebarSeparator />

                    <ProgrammeSection
                        canCreateProgramme={canCreateProgramme}
                        onFileActions={fileActions}
                        selectedFileIds={selectedFileIds}
                        setSelectedFileIds={setSelectedFileIds}
                        activeFileId={activeFileId}
                        setActiveFileId={setActiveFileId}
                    />
                </SidebarContent>

                <SidebarFooterComponent userProfile={userProfile} />
            </Sidebar>

            {/* Global New File Dialog */}
            <NewFileDialog
                open={isNewFileDialogOpen}
                onOpenChange={(open) => {
                    setIsNewFileDialogOpen(open)
                    if (!open) {
                        setNewFileParentId(null)
                    }
                }}
                fileType={newFileDialogType}
                parentId={newFileParentId}
            />
        </>
    )
}
