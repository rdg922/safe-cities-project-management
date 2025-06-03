'use client'

import React, { createContext, useContext, useState } from 'react'

interface ChatSidebarContextType {
    isChatOpen: boolean
    toggleChat: () => void
    openChat: () => void
    closeChat: () => void
    fileId?: number
    setFileId: (fileId: number) => void
}

const ChatSidebarContext = createContext<ChatSidebarContextType | undefined>(
    undefined
)

export function ChatSidebarProvider({
    children,
}: {
    children: React.ReactNode
}) {
    const [isChatOpen, setIsChatOpen] = useState(false)
    const [fileId, setFileId] = useState<number | undefined>()

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
        <ChatSidebarContext.Provider
            value={{
                isChatOpen,
                toggleChat,
                openChat,
                closeChat,
                fileId,
                setFileId,
            }}
        >
            {children}
        </ChatSidebarContext.Provider>
    )
}

export function useChatSidebar() {
    const context = useContext(ChatSidebarContext)
    if (context === undefined) {
        throw new Error(
            'useChatSidebar must be used within a ChatSidebarProvider'
        )
    }
    return context
}
