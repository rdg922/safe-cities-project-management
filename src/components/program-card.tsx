import { FileText, Users } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Button } from "~/components/ui/button"

interface ProgramCardProps {
  title: string
  description: string
  pages: number
  members: number
  lastUpdated: string
}

export function ProgramCard({ title, description, pages, members, lastUpdated }: ProgramCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <Button variant="ghost" size="sm">
            Open
          </Button>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <FileText size={16} className="text-muted-foreground" />
              <span>{pages} pages</span>
            </div>
            <div className="flex items-center gap-1">
              <Users size={16} className="text-muted-foreground" />
              <span>{members} members</span>
            </div>
          </div>
          <div className="text-muted-foreground">Updated {lastUpdated}</div>
        </div>
      </CardContent>
    </Card>
  )
}
