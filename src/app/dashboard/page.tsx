import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { ProgramCard } from "~/components/program-card"
import { RecentActivityList } from "~/components/recent-activity-list"
import { Plus } from "lucide-react"

export default function DashboardPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back to your nonprofit workspace</p>
        </div>
        <Button className="gap-2">
          <Plus size={16} />
          New Program
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Programs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">3</div>
            <p className="text-xs text-muted-foreground mt-1">+1 from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">12</div>
            <p className="text-xs text-muted-foreground mt-1">+3 from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pages Created</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">24</div>
            <p className="text-xs text-muted-foreground mt-1">+8 from last month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-7 mb-8">
        <div className="md:col-span-4">
          <h2 className="text-xl font-semibold mb-4">Programs</h2>
          <div className="grid gap-4">
            <ProgramCard
              title="Community Outreach"
              description="Engaging with local communities through events and initiatives"
              pages={3}
              members={5}
              lastUpdated="2 hours ago"
            />
            <ProgramCard
              title="Education Initiative"
              description="Providing educational resources and support to underserved communities"
              pages={2}
              members={4}
              lastUpdated="1 day ago"
            />
            <ProgramCard
              title="Fundraising"
              description="Coordinating fundraising events and donor relationships"
              pages={3}
              members={3}
              lastUpdated="3 days ago"
            />
          </div>
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
