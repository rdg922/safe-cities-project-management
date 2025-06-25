'use client'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { ProgramCard } from '~/components/program-card'
import { RecentActivityList } from '~/components/recent-activity-list'
import { Bell, Plus, Folders } from 'lucide-react'
import { api } from '~/trpc/react'
import { FILE_TYPES } from '~/server/db/schema'
import { useState, useEffect, useMemo } from 'react'
import { NewFileDialog } from '~/components/new-file-dialog'
import { formatDistanceToNow } from 'date-fns'
import { SidebarTrigger, useSidebar } from '~/components/ui/sidebar'
import { useMobile } from '~/hooks/use-mobile'

export default function DashboardPage() {
    const [isNewFileDialogOpen, setIsNewFileDialogOpen] = useState(false)
    const isMobile = useMobile()
    const { state } = useSidebar()

    // Get current user profile to check permissions
    const { data: userProfile } = api.user.getProfile.useQuery()

    const isAdmin = userProfile?.role! === 'admin'

    const { data: users, isLoading: isLoadingUsers } =
        api.user.getAllUsers.useQuery(undefined, {
            enabled: isAdmin,
        })
    const { data: programData, isLoading: isLoadingPrograms } =
        api.files.getProgramsWithDetails.useQuery({
            type: FILE_TYPES.PROGRAMME,
        })
    const { data: pagesInLast30Days, isLoading: isLoadingPages } =
        api.files.getPagesCreatedInLast30Days.useQuery()

    const { programs, childCounts, updateTimes } = programData ?? {}

    const { data: notificationData, isLoading: isLoadingNotifications } =
        api.notification.getAll.useQuery({ limit: 5 })

    return (
        <div className="container mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    {(state === 'collapsed' || isMobile) && <SidebarTrigger />}
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            Dashboard
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Welcome back to your workspace
                        </p>
                    </div>
                </div>
                {isAdmin && (
                    <Button
                        className="gap-2"
                        onClick={() => setIsNewFileDialogOpen(true)}
                    >
                        <Plus size={16} />
                        New Program
                    </Button>
                )}
            </div>

            <NewFileDialog
                open={isNewFileDialogOpen}
                onOpenChange={setIsNewFileDialogOpen}
                fileType={FILE_TYPES.PROGRAMME}
            />

            {isAdmin && (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">
                                Total Programs
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">
                                {isLoadingPrograms ? (
                                    <div className="h-8 w-16 animate-pulse bg-muted rounded" />
                                ) : (
                                    programs?.length
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Active programs in your workspace
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">
                                Users
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">
                                {isLoadingUsers ? (
                                    <div className="h-8 w-16 animate-pulse bg-muted rounded" />
                                ) : (
                                    users?.length
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Total team members
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">
                                Pages Created
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">
                                {isLoadingPages ? (
                                    <div className="h-8 w-16 animate-pulse bg-muted rounded" />
                                ) : (
                                    pagesInLast30Days
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                In the last 30 days
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-7 mb-8">
                <div className="md:col-span-4">
                    <h2 className="text-xl font-semibold mb-4">Programs</h2>
                    {isLoadingPrograms ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        </div>
                    ) : programs?.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[400px] text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                                <Folders
                                    size={24}
                                    className="text-muted-foreground"
                                />
                            </div>
                            <h3 className="mt-4 text-lg font-medium">
                                No programs yet
                            </h3>
                            <p className="mt-2 text-sm text-muted-foreground max-w-sm">
                                Create your first program to get started with
                                organizing your workspace.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {programs?.map((program) => (
                                <ProgramCard
                                    key={program.id}
                                    title={program.name}
                                    description="No description available"
                                    items={childCounts?.[program.id] ?? 0}
                                    lastUpdated={
                                        updateTimes?.[program.id]
                                            ? formatDistanceToNow(
                                                  new Date(
                                                      updateTimes[program.id]!
                                                  ),
                                                  { addSuffix: true }
                                              )
                                            : 'Never'
                                    }
                                />
                            ))}
                        </div>
                    )}
                </div>
                <div className="md:col-span-3">
                    <h2 className="text-xl font-semibold mb-4">
                        Recent Activity
                    </h2>
                    <Card>
                        <CardContent className="p-0">
                            <RecentActivityList
                                notifications={
                                    notificationData?.notifications ?? []
                                }
                                isLoading={isLoadingNotifications}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
