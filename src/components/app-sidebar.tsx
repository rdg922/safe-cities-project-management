"use client"

import { useState } from "react"
import { Trash2, Edit2, MoreHorizontal } from "lucide-react"
import Link from "next/link"
import { redirect, usePathname } from "next/navigation"
import {
  Bell,
  FileText,
  Home,
  MessageSquare,
  Plus,
  Users,
  File,
} from "lucide-react"
import { api } from "~/trpc/react"
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
  SidebarSeparator,
} from "~/components/ui/sidebar"
import { Button } from "~/components/ui/button"
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
import { SignOutButton } from "@clerk/nextjs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "~/components/ui/dropdown-menu"

export function AppSidebar() {
  const pathname = usePathname()
  const [isNewPageDialogOpen, setIsNewPageDialogOpen] = useState(false)
  const [newPageName, setNewPageName] = useState("")
  
  // Fetch all pages using tRPC
  const { data: pages = [], isLoading, refetch: refetchPages } = api.pages.getAll.useQuery()
  
  // Handle new page creation
  const createPageMutation = api.pages.create.useMutation({
    onSuccess: async () => {
      setNewPageName("")
      setIsNewPageDialogOpen(false)
      await refetchPages()
    },
  })
  
  // Handle renaming pages (frontend-only filename change)
  const renamePageMutation = api.pages.update.useMutation({
    onSuccess: async () => {
      setIsRenameDialogOpen(false)
      await refetchPages()
    },
  })
  
  // Handle deleting pages
  const deletePageMutation = api.pages.delete.useMutation({
    onSuccess: async () => {
      await refetchPages()
    },
  })
  
  // Rename dialog state
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false)
  const [renamePageId, setRenamePageId] = useState<number | null>(null)
  const [renamePageName, setRenamePageName] = useState("")
  const openRenameDialog = (id: number, filename: string) => {
    setRenamePageId(id)
    setRenamePageName(filename)
    setIsRenameDialogOpen(true)
  }
  const handleRenamePage = () => {
    if (renamePageId) {
      renamePageMutation.mutate({ id: renamePageId, filename: renamePageName })
    }
  }
  const handleDeletePage = (id: number) => {
    if (confirm('Are you sure you want to delete this page?')) {
      deletePageMutation.mutate({ id })
    }
  }
  
  const handleAddPage = () => {
    if (!newPageName.trim()) return
    
    createPageMutation.mutate({ 
      filename: newPageName 
    })
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
          <Dialog open={isNewPageDialogOpen} onOpenChange={setIsNewPageDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="w-full justify-start gap-2">
                <Plus size={16} />
                New Page
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Page</DialogTitle>
                <DialogDescription>Add a new page to the system.</DialogDescription>
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
        {/* Rename Page Dialog */}
        <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename Page</DialogTitle>
              <DialogDescription>Update the name of the page.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="rename-page-name">New Page Name</Label>
                <Input
                  id="rename-page-name"
                  value={renamePageName}
                  onChange={(e) => setRenamePageName(e.target.value)}
                  placeholder="Enter new page name"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleRenamePage}>Rename Page</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
              <SidebarGroupAction onClick={() => setIsNewPageDialogOpen(true)}>
                <Plus size={16} />
                <span className="sr-only">Add Page</span>
              </SidebarGroupAction>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {isLoading ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">Loading pages...</div>
                ) : pages.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No pages found</div>
                ) : (
                  pages.map((page) => (
                    <SidebarMenuItem key={page.id}>
                      <div className="flex items-center justify-between w-full">
                        <SidebarMenuButton asChild isActive={pathname === `/pages/${page.id}`}>
                          <Link href={`/pages/${page.id}`} className="flex items-center gap-2">
                            <File size={18} />
                            <span>{page.filename}</span>
                          </Link>
                        </SidebarMenuButton>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openRenameDialog(page.id, page.filename)}>
                              <Edit2 size={16} className="mr-2" /> Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeletePage(page.id)}>
                              <Trash2 size={16} className="mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </SidebarMenuItem>
                  ))
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-4">
          <div className="flex items-center gap-2">
            <SignOutButton />
          </div>
        </SidebarFooter>
      </Sidebar>
    </>
  )
}
