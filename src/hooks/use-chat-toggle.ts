"use client"

import { useCallback } from "react"
import { useChatSidebar } from "~/components/ui/chat-sidebar-provider"

interface UseChatToggleOptions {
  pageTitle?: string
}

/**
 * A hook to manage the chat sidebar functionality
 * 
 * @param options Configuration options for the chat sidebar
 * @returns Methods to control the chat sidebar
 */
export function useChatToggle(options: UseChatToggleOptions = {}) {
  const { isChatOpen, toggleChat: originalToggle, openChat, closeChat } = useChatSidebar()
  
  // Create a memoized toggle function that passes the page title context
  const toggleChat = useCallback(() => {
    originalToggle()
    // In a full implementation, we would store the page title in a global context
    // or pass it to the ChatSidebar component
  }, [originalToggle])
  
  // Create a memoized function that opens the chat with a specific page title
  const openChatWithContext = useCallback(() => {
    openChat()
    // In a full implementation, we would store the page title in a global context
  }, [openChat])
  
  return {
    isChatOpen,
    toggleChat,
    openChat: openChatWithContext,
    closeChat,
  }
}
