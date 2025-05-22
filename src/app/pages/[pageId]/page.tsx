"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { Button } from "~/components/ui/button"
import { PageEditor } from "~/components/page-editor"
import { PageChat } from "~/components/page-chat"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "~/components/ui/dropdown-menu"
import { Eye, MessageSquare, MoreHorizontal, PenSquare, Share2, Users } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs"
import { SimpleEditor } from "~/components/tiptap-templates/simple/simple-editor"

// Sample page data
const pagesData = {
  "page-1": {
    title: "Community Outreach Overview",
    content:
      "# Community Outreach Overview\n\nThis program focuses on engaging with local communities through various events and initiatives.\n\n## Objectives\n\n- Build stronger relationships with local communities\n- Increase awareness of our nonprofit's mission\n- Identify community needs and develop targeted programs\n\n## Key Strategies\n\n1. Host monthly community events\n2. Establish partnerships with local businesses\n3. Create volunteer opportunities for community members",
    permission: "edit",
  },
  "page-2": {
    title: "Community Outreach Goals",
    content:
      "# Community Outreach Goals\n\n## Short-term Goals (3-6 months)\n\n- Organize at least 2 community events per month\n- Recruit 20 new volunteers\n- Establish partnerships with 5 local businesses\n\n## Medium-term Goals (6-12 months)\n\n- Expand outreach to neighboring communities\n- Develop a community needs assessment survey\n- Launch a community ambassador program\n\n## Long-term Goals (1-3 years)\n\n- Create sustainable community-led initiatives\n- Measure and document community impact\n- Secure dedicated funding for community programs",
    permission: "edit",
  },
  "page-3": {
    title: "Community Outreach Timeline",
    content:
      "# Community Outreach Timeline\n\n## Q1 2023\n\n- [ ] Conduct community needs assessment\n- [ ] Develop outreach strategy\n- [ ] Identify potential community partners\n\n## Q2 2023\n\n- [ ] Launch first community event series\n- [ ] Establish volunteer recruitment process\n- [ ] Create community feedback mechanisms\n\n## Q3 2023\n\n- [ ] Evaluate initial outreach efforts\n- [ ] Adjust strategy based on feedback\n- [ ] Expand to additional communities\n\n## Q4 2023\n\n- [ ] Host year-end community celebration\n- [ ] Document impact and outcomes\n- [ ] Plan for next year's initiatives",
    permission: "edit",
  },
  "page-4": {
    title: "Education Initiative Curriculum",
    content:
      "# Education Initiative Curriculum\n\n## Core Subjects\n\n### Literacy\n- Reading comprehension\n- Writing skills\n- Critical thinking\n\n### Mathematics\n- Basic numeracy\n- Problem-solving\n- Practical applications\n\n### Digital Skills\n- Computer basics\n- Internet safety\n- Online research\n\n## Supplementary Programs\n\n- Mentorship opportunities\n- Career guidance\n- Life skills workshops",
    permission: "view",
  },
  "page-5": {
    title: "Education Initiative Resources",
    content:
      "# Education Initiative Resources\n\n## Teaching Materials\n\n- Textbooks and workbooks\n- Digital learning platforms\n- Educational games and activities\n\n## Technology Resources\n\n- Laptops and tablets\n- Internet connectivity\n- Educational software\n\n## Human Resources\n\n- Volunteer teachers\n- Subject matter experts\n- Program coordinators\n\n## Facilities\n\n- Community centers\n- Partner school classrooms\n- Online learning environments",
    permission: "comment",
  },
  "page-6": {
    title: "Fundraising Donors",
    content:
      "# Fundraising Donors\n\n## Individual Donors\n\n- Monthly recurring donors\n- Major gift contributors\n- One-time donors\n\n## Corporate Partners\n\n- ABC Corporation - $10,000 annual commitment\n- XYZ Company - In-kind donations of equipment\n- Local Business Association - Event sponsorships\n\n## Foundations\n\n- Community Foundation - Program-specific grants\n- National Nonprofit Fund - Operational support\n- Education First Foundation - Scholarship funding",
    permission: "edit",
  },
  "page-7": {
    title: "Fundraising Events",
    content:
      "# Fundraising Events\n\n## Annual Gala\n\n- Date: November 15, 2023\n- Venue: City Convention Center\n- Target: $50,000\n- Committee: Sarah, John, Michael\n\n## Community Fun Run\n\n- Date: April 22, 2023\n- Location: City Park\n- Target: $15,000\n- Committee: Emily, David, Lisa\n\n## Online Auction\n\n- Dates: July 1-15, 2023\n- Platform: GiveSmart\n- Target: $10,000\n- Committee: Robert, Jessica, Andrew",
    permission: "edit",
  },
  "page-8": {
    title: "Fundraising Budget",
    content:
      "# Fundraising Budget\n\n## Revenue Targets\n\n| Source | Q1 | Q2 | Q3 | Q4 | Total |\n|--------|----|----|----|----|-------|\n| Individual Donations | $15,000 | $12,000 | $10,000 | $25,000 | $62,000 |\n| Corporate Sponsorships | $5,000 | $15,000 | $5,000 | $10,000 | $35,000 |\n| Grants | $20,000 | $0 | $30,000 | $0 | $50,000 |\n| Events | $0 | $15,000 | $10,000 | $50,000 | $75,000 |\n| **Total** | **$40,000** | **$42,000** | **$55,000** | **$85,000** | **$222,000** |\n\n## Expenses\n\n| Category | Q1 | Q2 | Q3 | Q4 | Total |\n|----------|----|----|----|----|-------|\n| Event Costs | $0 | $5,000 | $3,000 | $15,000 | $23,000 |\n| Marketing | $2,000 | $3,000 | $2,000 | $4,000 | $11,000 |\n| Software | $1,500 | $1,500 | $1,500 | $1,500 | $6,000 |\n| Staff Time | $7,500 | $7,500 | $7,500 | $7,500 | $30,000 |\n| **Total** | **$11,000** | **$17,000** | **$14,000** | **$28,000** | **$70,000** |",
    permission: "edit",
  },
}

export default function PageView() {
  const params = useParams()
  const pageId = params.pageId as string
  const page = pagesData?.[pageId as keyof typeof pagesData] ?? {
    title: "Page Not Found",
    content: "# Page Not Found\n\nThe requested page could not be found.",
    permission: "view",
  }

  const [activeTab, setActiveTab] = useState<string>("editor")
  type PermissionType = "view" | "comment" | "edit";
  const [permission, setPermission] = useState<PermissionType>(page.permission as PermissionType)

  const permissionLabels: Record<PermissionType, string> = {
    view: "Can View",
    comment: "Can Comment",
    edit: "Can Edit",
  }

  const permissionIcons: Record<PermissionType, React.ReactNode> = {
    view: <Eye size={16} />,
    comment: <MessageSquare size={16} />,
    edit: <PenSquare size={16} />,
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{page.title}</h1>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                {permissionIcons[permission]}
                {permissionLabels[permission]}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setPermission("view" as PermissionType)} className="gap-2">
                <Eye size={16} /> Can View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPermission("comment" as PermissionType)} className="gap-2">
                <MessageSquare size={16} /> Can Comment
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPermission("edit" as PermissionType)} className="gap-2">
                <PenSquare size={16} /> Can Edit
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" className="gap-2">
            <Share2 size={16} />
            Share
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Users size={16} />
            Members
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal size={16} />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
        </TabsList>
        <TabsContent value="editor" className="mt-0">
          {/* <PageEditor initialContent={page.content} readOnly={permission === "view"} /> */}
          <SimpleEditor />
        </TabsContent>
        <TabsContent value="chat" className="mt-0">
          <PageChat pageTitle={page.title} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
