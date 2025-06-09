"use client"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { ProgramCard } from "~/components/program-card"
import { RecentActivityList } from "~/components/recent-activity-list"
import { Plus } from "lucide-react"
import { api } from "~/trpc/react"
import { FILE_TYPES } from "~/server/db/schema"
import { useState, useEffect, useMemo } from "react"
import { NewFileDialog } from "~/components/new-file-dialog"
import { formatDistanceToNow } from "date-fns"


export default function DashboardPage() {
  const [isNewFileDialogOpen, setIsNewFileDialogOpen] = useState(false);
  const { data: users, isLoading: isLoadingUsers } = api.user.getAllUsers.useQuery();
  const { data: programs, isLoading: isLoadingPrograms } = api.files.getByType.useQuery({ 
    type: FILE_TYPES.PROGRAMME 
  });
  const { data: pagesInLast30Days, isLoading: isLoadingPages } = api.files.getPagesCreatedInLast30Days.useQuery();

  const { data: childCounts } = api.files.getChildCountsForParents.useQuery(
    { 
      parentIds: programs?.map(p => p.id) ?? [] 
    },
    { 
      enabled: !isLoadingPrograms && !!programs?.length 
    }
  );

  const { data: programUpdateTimes, isLoading: isLoadingUpdateTimes } = api.files.getProgramUpdateTimes.useQuery(
    { 
      programIds: programs?.map(p => p.id) ?? [] 
    },
    { 
      enabled: !isLoadingPrograms && !!programs?.length 
    }
  );

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back to your workspace</p>
        </div>
        <Button className="gap-2"
        onClick={() => setIsNewFileDialogOpen(true)}>
          <Plus size={16} />
          New Program
        </Button>
      </div>

      <NewFileDialog
        open={isNewFileDialogOpen}
        onOpenChange={setIsNewFileDialogOpen}
        fileType={FILE_TYPES.PROGRAMME}
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Programs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {isLoadingPrograms ? (
                <div className="h-8 w-16 animate-pulse bg-muted rounded" />
              ) : (
                programs?.length
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Active programs in your workspace</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {isLoadingUsers ? (
                <div className="h-8 w-16 animate-pulse bg-muted rounded" />
              ) : (
                users?.length
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total team members</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pages Created</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {isLoadingPages ? (
                <div className="h-8 w-16 animate-pulse bg-muted rounded" />
              ) : (
                pagesInLast30Days
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">In the last 30 days</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-7 mb-8">
        <div className="md:col-span-4">
          <h2 className="text-xl font-semibold mb-4">Programs</h2>
          {isLoadingPrograms ? (
            <div>Loading programs...</div>
          ) : (
            <div className="grid gap-4">
              {programs?.map((program) => (
                <ProgramCard
                  key={program.id}
                  title={program.name}
                  description="No description available"
                  items={childCounts?.[program.id] ?? 0}
                  members={0}
                  lastUpdated={isLoadingUpdateTimes ? 'Loading...' : programUpdateTimes?.[program.id] ? formatDistanceToNow(new Date(programUpdateTimes[program.id]!), { addSuffix: true }) : 'Never'}
                />
              ))}
            </div>
          )}
        </div>
        <div className="md:col-span-3">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <Card>
            <CardContent className="p-0">
              <RecentActivityList />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
