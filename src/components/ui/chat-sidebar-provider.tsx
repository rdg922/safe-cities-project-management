"use client"

import React, { createContext, useContext, useState } from "react"

interface ChatSidebarContextType {
  isChatOpen: boolean
  toggleChat: () => void
  openChat: () => void
  closeChat: () => void
}

const ChatSidebarContext = createContext<ChatSidebarContextType | undefined>(undefined)

export function ChatSidebarProvider({ children }: { children: React.ReactNode }) {
  const [isChatOpen, setIsChatOpen] = useState(false)

  const toggleChat = () => {
    setIsChatOpen((prev) => !prev)
  }

  const openChat = () => {
    setIsChatOpen(true)
  }

  const closeChat = () => {
    setIsChatOpen(false)
  }

  return (
    <ChatSidebarContext.Provider value={{ isChatOpen, toggleChat, openChat, closeChat }}>
      {children}
    </ChatSidebarContext.Provider>
  )
}

export function useChatSidebar() {
  const context = useContext(ChatSidebarContext)
  if (context === undefined) {
    throw new Error("useChatSidebar must be used within a ChatSidebarProvider")
  }
  return context
}
