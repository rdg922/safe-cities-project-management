"use client"

import { useEffect, useRef } from "react"
import { X } from "lucide-react"
import { Button } from "~/components/ui/button"
import { useChatSidebar } from "~/components/ui/chat-sidebar-provider"
import { PageChat } from "~/components/page-chat"
import { cn } from "~/lib/utils"

interface ChatSidebarProps {
  pageTitle?: string
}

export function ChatSidebar({ pageTitle = "Current Page" }: ChatSidebarProps) {
  const { isChatOpen, closeChat } = useChatSidebar()
  const sidebarRef = useRef<HTMLDivElement>(null)

  // Add keyboard shortcut to close sidebar with Escape key
  useEffect(() => {
    if (!isChatOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        closeChat()
      }
    }

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isChatOpen) {
        closeChat()
      }
    }
    
    document.addEventListener("keydown", handleEscapeKey)
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("keydown", handleEscapeKey)
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isChatOpen, closeChat])

  return (
    <>
      {/* Chat Sidebar */}
      <div
        ref={sidebarRef}
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-full md:w-[400px] bg-background border-l shadow-xl transition-transform duration-300 ease-in-out",
          isChatOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-medium text-lg">Chat</h3>
            <Button variant="ghost" size="icon" onClick={closeChat} className="hover:bg-muted">
              <X className="h-4 w-4" />
              <span className="sr-only">Close chat</span>
            </Button> 
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <PageChat pageTitle={pageTitle} />
          </div>
        </div>
      </div>

      {/* Mobile Backdrop - Only visible on mobile and when chat is open */}
      <div 
        className={cn(
          "fixed inset-0 z-40 bg-background/80 md:hidden transition-opacity duration-300", 
          isChatOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )} 
        onClick={closeChat}
      />
    </>
  )
}
