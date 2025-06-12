'use client'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { ProgramCard } from '~/components/program-card'
import { RecentActivityList } from '~/components/recent-activity-list'
import { Plus } from 'lucide-react'
import { api } from '~/trpc/react'
import { FILE_TYPES } from '~/server/db/schema'
import { useState, useEffect, useMemo } from 'react'
import { NewFileDialog } from '~/components/new-file-dialog'
import { formatDistanceToNow } from 'date-fns'
import { SidebarTrigger } from '~/components/ui/sidebar'
import { useMobile } from '~/hooks/use-mobile'

// Add performance measurement utility
const measureQuery = (name: string, startTime: number) => {
    const endTime = performance.now()
    console.log(`Query ${name} took ${(endTime - startTime).toFixed(2)}ms`)
}

export default function DashboardPage() {
    const [isNewFileDialogOpen, setIsNewFileDialogOpen] = useState(false)
    const isMobile = useMobile()

    // Start measuring total page load time
    const startTime = useMemo(() => performance.now(), [])

    // Get current user profile to check permissions
    const { data: userProfile } = api.user.getProfile.useQuery()

    const { data: users, isLoading: isLoadingUsers } =
        api.user.getAllUsers.useQuery(undefined, {
            enabled:
                userProfile &&
                'role' in userProfile &&
                userProfile.role === 'admin',
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

    // Measure total page load time when all data is loaded
    useEffect(() => {
        const allQueriesComplete =
            !isLoadingPrograms &&
            !isLoadingPages &&
            !isLoadingNotifications &&
            programs &&
            childCounts &&
            updateTimes &&
            ((userProfile &&
                'role' in userProfile &&
                userProfile.role !== 'admin') ||
                !isLoadingUsers) // Only wait for users if admin

        if (allQueriesComplete) {
            const endTime = performance.now()
            console.log('=== Dashboard Load Time ===')
            console.log(`Total time: ${(endTime - startTime).toFixed(2)}ms`)
            console.log('========================')
        }
    }, [
        isLoadingUsers,
        isLoadingPrograms,
        isLoadingPages,
        isLoadingNotifications,
        programs,
        childCounts,
        updateTimes,
        startTime,
        userProfile && 'role' in userProfile ? userProfile.role : undefined,
    ])

    return (
        <div className="container mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    {isMobile && <SidebarTrigger />}
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            Dashboard
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Welcome back to your workspace
                        </p>
                    </div>
                </div>
                <Button
                    className="gap-2"
                    onClick={() => setIsNewFileDialogOpen(true)}
                >
                    <Plus size={16} />
                    New Program
                </Button>
            </div>

            <NewFileDialog
                open={isNewFileDialogOpen}
                onOpenChange={setIsNewFileDialogOpen}
                fileType={FILE_TYPES.PROGRAMME}
            />

            {userProfile &&
                'role' in userProfile &&
                userProfile.role === 'admin' && (
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
