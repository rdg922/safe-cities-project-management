"use client"

import { useEffect } from "react"
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
  // We'll get the current route and page info from Next.js params in a real implementation
  // For now using a placeholder

  // Add keyboard shortcut to close sidebar with Escape key
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isChatOpen) {
        closeChat()
      }
    }
    
    document.addEventListener("keydown", handleEscapeKey)
    return () => {
      document.removeEventListener("keydown", handleEscapeKey)
    }
  }, [isChatOpen, closeChat])

  // Prevent scrolling on the main content when chat is open on mobile
  useEffect(() => {
    if (isChatOpen) {
      document.body.classList.add("overflow-hidden", "md:overflow-auto")
    } else {
      document.body.classList.remove("overflow-hidden", "md:overflow-auto")
    }
    
    return () => {
      document.body.classList.remove("overflow-hidden", "md:overflow-auto")
    }
  }, [isChatOpen])

  if (!isChatOpen) {
    return null
  }

  return (
    <div className={cn(
      "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none transition-opacity duration-300",
      isChatOpen ? "opacity-100" : "opacity-0 pointer-events-none"
    )}>
      <div
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-full md:w-[400px] bg-background border-l shadow-xl transition-all duration-300 ease-in-out transform",
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
      {/* Backdrop for mobile - clicking it will close the sidebar */}
      <div 
        className={cn(
          "fixed inset-0 z-40 bg-background/80 md:hidden transition-opacity duration-300", 
          isChatOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )} 
        onClick={closeChat}
      />
    </div>
  )
}
