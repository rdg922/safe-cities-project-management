"use client"

import { useParams } from "next/navigation"
import {useState, useRef, useEffect } from "react"

import { Button } from "~/components/ui/button"
import { PageEditor } from "~/components/page-editor" 
import { PageChat } from "~/components/page-chat"
import { toast } from "~/hooks/use-toast"
import { useChatToggle } from "~/hooks/use-chat-toggle"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "~/components/ui/dropdown-menu"
import { Eye, MessageSquare, MoreHorizontal, PenSquare, Share2, Users } from "lucide-react"
import { SimpleEditor } from "~/components/tiptap-templates/simple/simple-editor"
import { api } from "~/trpc/react"

// Sample page data (fallback for development)
const pagesData = {
  "page-1": {
    filename: "Community Outreach Overview",
    content:
      "# Community Outreach Overview\n\nThis program focuses on engaging with local communities through various events and initiatives.\n\n## Objectives\n\n- Build stronger relationships with local communities\n- Increase awareness of our nonprofit's mission\n- Identify community needs and develop targeted programs\n\n## Key Strategies\n\n1. Host monthly community events\n2. Establish partnerships with local businesses\n3. Create volunteer opportunities for community members",
  },
  "page-2": {
    filename: "Community Outreach Goals",
    content:
      "# Community Outreach Goals\n\n## Short-term Goals (3-6 months)\n\n- Organize at least 2 community events per month\n- Recruit 20 new volunteers\n- Establish partnerships with 5 local businesses\n\n## Medium-term Goals (6-12 months)\n\n- Expand outreach to neighboring communities\n- Develop a community needs assessment survey\n- Launch a community ambassador program\n\n## Long-term Goals (1-3 years)\n\n- Create sustainable community-led initiatives\n- Measure and document community impact\n- Secure dedicated funding for community programs",
  },
  "page-3": {
    filename: "Community Outreach Timeline",
    content:
      "# Community Outreach Timeline\n\n## Q1 2023\n\n- [ ] Conduct community needs assessment\n- [ ] Develop outreach strategy\n- [ ] Identify potential community partners\n\n## Q2 2023\n\n- [ ] Launch first community event series\n- [ ] Establish volunteer recruitment process\n- [ ] Create community feedback mechanisms\n\n## Q3 2023\n\n- [ ] Evaluate initial outreach efforts\n- [ ] Adjust strategy based on feedback\n- [ ] Expand to additional communities\n\n## Q4 2023\n\n- [ ] Host year-end community celebration\n- [ ] Document impact and outcomes\n- [ ] Plan for next year's initiatives",
  },
  "page-4": {
    filename: "Education Initiative Curriculum",
    content:
      "# Education Initiative Curriculum\n\n## Core Subjects\n\n### Literacy\n- Reading comprehension\n- Writing skills\n- Critical thinking\n\n### Mathematics\n- Basic numeracy\n- Problem-solving\n- Practical applications\n\n### Digital Skills\n- Computer basics\n- Internet safety\n- Online research\n\n## Supplementary Programs\n\n- Mentorship opportunities\n- Career guidance\n- Life skills workshops",
  },
  "page-5": {
    filename: "Education Initiative Resources",
    content:
      "# Education Initiative Resources\n\n## Teaching Materials\n\n- Textbooks and workbooks\n- Digital learning platforms\n- Educational games and activities\n\n## Technology Resources\n\n- Laptops and tablets\n- Internet connectivity\n- Educational software\n\n## Human Resources\n\n- Volunteer teachers\n- Subject matter experts\n- Program coordinators\n\n## Facilities\n\n- Community centers\n- Partner school classrooms\n- Online learning environments",
  },
  "page-6": {
    filename: "Fundraising Donors",
    content:
      "# Fundraising Donors\n\n## Individual Donors\n\n- Monthly recurring donors\n- Major gift contributors\n- One-time donors\n\n## Corporate Partners\n\n- ABC Corporation - $10,000 annual commitment\n- XYZ Company - In-kind donations of equipment\n- Local Business Association - Event sponsorships\n\n## Foundations\n\n- Community Foundation - Program-specific grants\n- National Nonprofit Fund - Operational support\n- Education First Foundation - Scholarship funding",
  },
  "page-7": {
    filename: "Fundraising Events",
    content:
      "# Fundraising Events\n\n## Annual Gala\n\n- Date: November 15, 2023\n- Venue: City Convention Center\n- Target: $50,000\n- Committee: Sarah, John, Michael\n\n## Community Fun Run\n\n- Date: April 22, 2023\n- Location: City Park\n- Target: $15,000\n- Committee: Emily, David, Lisa\n\n## Online Auction\n\n- Dates: July 1-15, 2023\n- Platform: GiveSmart\n- Target: $10,000\n- Committee: Robert, Jessica, Andrew",
  },
  "page-8": {
    filename: "Fundraising Budget",
    content:
      "# Fundraising Budget\n\n## Revenue Targets\n\n| Source | Q1 | Q2 | Q3 | Q4 | Total |\n|--------|----|----|----|----|-------|\n| Individual Donations | $15,000 | $12,000 | $10,000 | $25,000 | $62,000 |\n| Corporate Sponsorships | $5,000 | $15,000 | $5,000 | $10,000 | $35,000 |\n| Grants | $20,000 | $0 | $30,000 | $0 | $50,000 |\n| Events | $0 | $15,000 | $10,000 | $50,000 | $75,000 |\n| **Total** | **$40,000** | **$42,000** | **$55,000** | **$85,000** | **$222,000** |\n\n## Expenses\n\n| Category | Q1 | Q2 | Q3 | Q4 | Total |\n|----------|----|----|----|----|-------|\n| Event Costs | $0 | $5,000 | $3,000 | $15,000 | $23,000 |\n| Marketing | $2,000 | $3,000 | $2,000 | $4,000 | $11,000 |\n| Software | $1,500 | $1,500 | $1,500 | $1,500 | $6,000 |\n| Staff Time | $7,500 | $7,500 | $7,500 | $7,500 | $30,000 |\n| **Total** | **$11,000** | **$17,000** | **$14,000** | **$28,000** | **$70,000** |",
  },
}

export default function PageView() {
  const params = useParams()
  const pageId = Number(params.pageId as string)
  
  // Fetch page data using tRPC
  const { data: page, isLoading, error } = api.files.getById.useQuery(
    { id: pageId },
  )

  const [activeTab, setActiveTab] = useState<string>("editor")
  type PermissionType = "view" | "comment" | "edit";
  // Make permission a frontend-only state, with "edit" as default
  const [permission, setPermission] = useState<PermissionType>("edit")
  const [content, setContent] = useState<string>(page?.content?.content || '')
  // Import and use the chat toggle
  const { toggleChat } = useChatToggle()
  
  // Add state to track saving status
  const [savingStatus, setSavingStatus] = useState<"idle" | "saving" | "saved">("idle");
  
  // Add mutation hook for updating the page
  const updatePageMutation = api.files.updatePageContent.useMutation({
    onSuccess: () => {
      setSavingStatus("saved");
      // Reset status after a delay
      setTimeout(() => setSavingStatus("idle"), 3000);
    },
    onError: (error) => {
      setSavingStatus("idle");
      toast({
        title: "Failed to update page",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Handle permission change - frontend only
  const handlePermissionChange = (newPermission: PermissionType) => {
    setPermission(newPermission);
    // No backend update needed as permission is now frontend-only
  };
  
  // Debounced content update using useRef to store timer
  const contentUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Handle content change
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setSavingStatus("saving");
    
    // Clear previous timer if exists
    if (contentUpdateTimerRef.current) {
      clearTimeout(contentUpdateTimerRef.current);
    }
    
    // Set new timer
    contentUpdateTimerRef.current = setTimeout(() => {
      updatePageMutation.mutate({
        fileId: pageId,
        content: newContent,
      });
    }, 2000); // 2 seconds debounce
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (contentUpdateTimerRef.current) {
        clearTimeout(contentUpdateTimerRef.current);
      }
    };
  }, []);

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
      {isLoading ? (
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary rounded-full border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading page content...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{page?.name}</h1>
              {savingStatus === "saving" && (
                <span className="text-xs text-muted-foreground flex items-center">
                  <div className="animate-spin h-3 w-3 border-2 border-primary rounded-full border-t-transparent mr-1"></div>
                  Saving...
                </span>
              )}
              {savingStatus === "saved" && (
                <span className="text-xs text-green-500 flex items-center">
                  <svg className="h-3 w-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Saved
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    {permissionIcons[permission]}
                    {permissionLabels[permission]}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handlePermissionChange("view")} className="gap-2">
                    <Eye size={16} /> Can View
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handlePermissionChange("comment")} className="gap-2">
                    <MessageSquare size={16} /> Can Comment
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handlePermissionChange("edit")} className="gap-2">
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
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2" 
                onClick={toggleChat}
              >
                <MessageSquare size={16} />
                Chat
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal size={16} />
              </Button>
            </div>
          </div>

          <div className="w-full h-[calc(100vh-200px)]">
            <SimpleEditor 
              initialContent={page?.content?.content || ''} 
              readOnly={permission === "view"} 
              onUpdate={(newContent) => handleContentChange(newContent)}
            />
          </div>
        </>
      )}
    </div>
  )
}
