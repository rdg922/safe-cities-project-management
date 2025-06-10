import { FileText, Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"

interface ProgramCardProps {
  title: string
  description: string
  items: number
  lastUpdated: string
}

export function ProgramCard({ title, items, members, lastUpdated }: ProgramCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <FileText size={16} className="text-muted-foreground" />
              <span>{items} items</span>
            </div>
          </div>
          <div className="text-muted-foreground">
            {lastUpdated === 'Loading...' ? 'Loading...' : `Updated ${lastUpdated}`}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
