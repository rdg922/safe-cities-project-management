"use client"

import { SidebarMenuAction } from "~/components/ui/sidebar"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Bell,
  ChevronDown,
  FileText,
  Home,
  MessageSquare,
  Plus,
  // Settings,
  Users,
  Folder,
  FolderPlus,
  Edit,
  Trash2,
  MoreHorizontal,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from "~/components/ui/sidebar"
import { Button } from "~/components/ui/button"
// import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/components/ui/collapsible"
import { cn } from "~/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "~/components/ui/dropdown-menu"
import { SignOutButton } from "@clerk/nextjs"

// Enhanced nested page type
interface Page {
  id: string
  name: string
  path: string
  pages?: Page[] // Recursive structure for unlimited nesting
}

// Enhanced program type
interface Program {
  id: string
  name: string
  pages: Page[]
}

// Sample data for programs and pages with nested structure
const programs: Program[] = [
  {
    id: "program-1",
    name: "Community Outreach",
    pages: [
      {
        id: "page-1",
        name: "Overview",
        path: "/pages/page-1",
        pages: [
          { id: "page-1-1", name: "Mission", path: "/pages/page-1-1" },
          { id: "page-1-2", name: "Vision", path: "/pages/page-1-2" },
        ],
      },
      {
        id: "page-2",
        name: "Goals",
        path: "/pages/page-2",
        pages: [
          { id: "page-2-1", name: "Short-term", path: "/pages/page-2-1" },
          { id: "page-2-2", name: "Long-term", path: "/pages/page-2-2" },
        ],
      },
      { id: "page-3", name: "Timeline", path: "/pages/page-3" },
    ],
  },
  {
    id: "program-2",
    name: "Education Initiative",
    pages: [
      { id: "page-4", name: "Curriculum", path: "/pages/page-4" },
      { id: "page-5", name: "Resources", path: "/pages/page-5" },
    ],
  },
  {
    id: "program-3",
    name: "Fundraising",
    pages: [
      { id: "page-6", name: "Donors", path: "/pages/page-6" },
      { id: "page-7", name: "Events", path: "/pages/page-7" },
      { id: "page-8", name: "Budget", path: "/pages/page-8" },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const [programsData, setProgramsData] = useState<Program[]>(programs)
  const [openPrograms, setOpenPrograms] = useState<Record<string, boolean>>(
    Object.fromEntries(programs.map((program) => [program.id, true])),
  )
  const [openPages, setOpenPages] = useState<Record<string, boolean>>({})
  const [isNewProgramDialogOpen, setIsNewProgramDialogOpen] = useState(false)
  const [isEditProgramDialogOpen, setIsEditProgramDialogOpen] = useState(false)
  const [isNewPageDialogOpen, setIsNewPageDialogOpen] = useState(false)
  const [newProgramName, setNewProgramName] = useState("")
  const [editProgramName, setEditProgramName] = useState("")
  const [editProgramId, setEditProgramId] = useState("")
  const [newPageName, setNewPageName] = useState("")
  const [newPageParentId, setNewPageParentId] = useState("")
  const [newPageProgramId, setNewPageProgramId] = useState("")

  const toggleProgram = (programId: string) => {
    setOpenPrograms((prev) => ({
      ...prev,
      [programId]: !prev[programId],
    }))
  }

  const togglePage = (pageId: string) => {
    setOpenPages((prev) => ({
      ...prev,
      [pageId]: !prev[pageId],
    }))
  }

  const handleAddProgram = () => {
    if (!newProgramName.trim()) return

    const newProgram: Program = {
      id: `program-${Date.now()}`,
      name: newProgramName,
      pages: [],
    }

    setProgramsData([...programsData, newProgram])
    setOpenPrograms((prev) => ({
      ...prev,
      [newProgram.id]: true,
    }))
    setNewProgramName("")
    setIsNewProgramDialogOpen(false)
  }

  const handleEditProgram = () => {
    if (!editProgramName.trim() || !editProgramId) return

    const updatedPrograms = programsData.map((program) =>
      program.id === editProgramId ? { ...program, name: editProgramName } : program,
    )

    setProgramsData(updatedPrograms)
    setEditProgramName("")
    setEditProgramId("")
    setIsEditProgramDialogOpen(false)
  }

  const handleDeleteProgram = (programId: string) => {
    const updatedPrograms = programsData.filter((program) => program.id !== programId)
    setProgramsData(updatedPrograms)
  }

  const handleAddPage = () => {
    if (!newPageName.trim() || !newPageProgramId) return

    const newPage: Page = {
      id: `page-${Date.now()}`,
      name: newPageName,
      path: `/pages/page-${Date.now()}`,
    }

    // Function to add page to the correct parent
    const addPageToParent = (pages: Page[], parentId: string | null): Page[] => {
      return pages.map((page) => {
        if (!parentId && page.id === newPageParentId) {
          // Add to this page's children
          return {
            ...page,
            pages: [...(page.pages ?? []), newPage],
          }
        } else if (page.pages) {
          // Check children
          return {
            ...page,
            pages: addPageToParent(page.pages, parentId),
          }
        }
        return page
      })
    }

    const updatedPrograms = programsData.map((program) => {
      if (program.id === newPageProgramId) {
        if (!newPageParentId) {
          // Add to program root
          return {
            ...program,
            pages: [...program.pages, newPage],
          }
        } else {
          // Add to a nested page
          return {
            ...program,
            pages: addPageToParent(program.pages, null),
          }
        }
      }
      return program
    })

    setProgramsData(updatedPrograms)
    setNewPageName("")
    setNewPageParentId("")
    setNewPageProgramId("")
    setIsNewPageDialogOpen(false)
  }

  // Recursive function to render nested pages
  const renderPages = (pages: Page[] = [], programId: string) => {
    return pages.map((page) => (
      <div key={page.id}>
        {page.pages && page.pages.length > 0 ? (
          <Collapsible open={openPages[page.id]} onOpenChange={() => togglePage(page.id)} className="group/collapsible">
            <SidebarMenuSubItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuSubButton asChild isActive={pathname === page.path}>
                  <div className="flex w-full items-center justify-between">
                    <Link href={page.path} className="flex-1 truncate">
                      {page.name}
                    </Link>
                    <ChevronDown
                      size={14}
                      className={cn("transition-transform", openPages[page.id] ? "rotate-180" : "")}
                    />
                  </div>
                </SidebarMenuSubButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="pl-4 border-l border-sidebar-border">{renderPages(page.pages, programId)}</div>
              </CollapsibleContent>
            </SidebarMenuSubItem>
          </Collapsible>
        ) : (
          <SidebarMenuSubItem>
            <SidebarMenuSubButton asChild isActive={pathname === page.path}>
              <Link href={page.path}>{page.name}</Link>
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        )}
      </div>
    ))
  }

  return (
    <>
      <Sidebar>
        <SidebarHeader className="flex flex-col gap-4 p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <FileText size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">NonProfit Workspace</span>
              <span className="text-xs text-muted-foreground">Project Management</span>
            </div>
          </div>
          <Button size="sm" className="w-full justify-start gap-2">
            <Plus size={16} />
            New Page
          </Button>
        </SidebarHeader>
        <SidebarSeparator />
        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard"} tooltip="Dashboard">
                  <Link href="/dashboard">
                    <Home size={18} />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/notifications"} tooltip="Notifications">
                  <Link href="/notifications">
                    <Bell size={18} />
                    <span>Notifications</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/chats"} tooltip="Chats">
                  <Link href="/chats">
                    <MessageSquare size={18} />
                    <span>Chats</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/users"} tooltip="Users">
                  <Link href="/users">
                    <Users size={18} />
                    <span>Users</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
          <SidebarSeparator />
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center justify-between">
              <span>Programs</span>
              <Dialog open={isNewProgramDialogOpen} onOpenChange={setIsNewProgramDialogOpen}>
                <DialogTrigger asChild>
                  <SidebarGroupAction>
                    <FolderPlus size={16} />
                    <span className="sr-only">Add Program</span>
                  </SidebarGroupAction>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Program</DialogTitle>
                    <DialogDescription>Add a new program to organize your pages.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="program-name">Program Name</Label>
                      <Input
                        id="program-name"
                        value={newProgramName}
                        onChange={(e) => setNewProgramName(e.target.value)}
                        placeholder="Enter program name"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsNewProgramDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddProgram}>Create Program</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {programsData.map((program) => (
                  <Collapsible
                    key={program.id}
                    open={openPrograms[program.id]}
                    onOpenChange={() => toggleProgram(program.id)}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton>
                          <Folder size={18} />
                          <span>{program.name}</span>
                          <ChevronDown
                            size={16}
                            className={cn("ml-auto transition-transform", openPrograms[program.id] ? "rotate-180" : "")}
                          />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <SidebarMenuAction showOnHover>
                            <MoreHorizontal size={16} />
                          </SidebarMenuAction>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <Dialog open={isEditProgramDialogOpen} onOpenChange={setIsEditProgramDialogOpen}>
                            <DialogTrigger asChild>
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault()
                                  setEditProgramId(program.id)
                                  setEditProgramName(program.name)
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Edit Program</span>
                              </DropdownMenuItem>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Program</DialogTitle>
                                <DialogDescription>Update the program name.</DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                  <Label htmlFor="edit-program-name">Program Name</Label>
                                  <Input
                                    id="edit-program-name"
                                    value={editProgramName}
                                    onChange={(e) => setEditProgramName(e.target.value)}
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setIsEditProgramDialogOpen(false)}>
                                  Cancel
                                </Button>
                                <Button onClick={handleEditProgram}>Save Changes</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          <Dialog open={isNewPageDialogOpen} onOpenChange={setIsNewPageDialogOpen}>
                            <DialogTrigger asChild>
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault()
                                  setNewPageProgramId(program.id)
                                  setNewPageParentId("")
                                }}
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                <span>Add Page</span>
                              </DropdownMenuItem>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Create New Page</DialogTitle>
                                <DialogDescription>Add a new page to this program.</DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                  <Label htmlFor="page-name">Page Name</Label>
                                  <Input
                                    id="page-name"
                                    value={newPageName}
                                    onChange={(e) => setNewPageName(e.target.value)}
                                    placeholder="Enter page name"
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setIsNewPageDialogOpen(false)}>
                                  Cancel
                                </Button>
                                <Button onClick={handleAddPage}>Create Page</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          <DropdownMenuItem
                            className="text-destructive"
                            onSelect={() => handleDeleteProgram(program.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Delete Program</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <CollapsibleContent>
                        <SidebarMenuSub>{renderPages(program.pages, program.id)}</SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-4">
          <div className="flex items-center gap-2">
            {/* TODO: Add User Info */}
            <SignOutButton />
            {/* <Avatar className="h-8 w-8">
              <AvatarImage src="/placeholder.svg?height=32&width=32" alt="User" />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <div className="flex flex-1 flex-col">
              <span className="text-sm font-medium">John Doe</span>
              <span className="text-xs text-muted-foreground">Admin</span>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Settings size={16} />
              <span className="sr-only">Settings</span>
            </Button> */}
          </div>
        </SidebarFooter>
      </Sidebar>

      {/* Edit Program Dialog */}
      <Dialog open={isEditProgramDialogOpen} onOpenChange={setIsEditProgramDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Program</DialogTitle>
            <DialogDescription>Update the program name.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-program-name">Program Name</Label>
              <Input
                id="edit-program-name"
                value={editProgramName}
                onChange={(e) => setEditProgramName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditProgramDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditProgram}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Page Dialog */}
      <Dialog open={isNewPageDialogOpen} onOpenChange={setIsNewPageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Page</DialogTitle>
            <DialogDescription>Add a new page to this program.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="page-name">Page Name</Label>
              <Input
                id="page-name"
                value={newPageName}
                onChange={(e) => setNewPageName(e.target.value)}
                placeholder="Enter page name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewPageDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddPage}>Create Page</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
