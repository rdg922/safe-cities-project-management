'use client'

import { useCallback } from 'react'
import { useChatSidebar } from '~/components/ui/chat-sidebar-provider'

interface UseChatToggleOptions {
    pageTitle?: string
    fileId?: number
}

/**
 * A hook to manage the chat sidebar functionality
 *
 * @param options Configuration options for the chat sidebar
 * @returns Methods to control the chat sidebar
 */
export function useChatToggle(options: UseChatToggleOptions = {}) {
    const {
        isChatOpen,
        toggleChat: originalToggle,
        openChat,
        closeChat,
        setFileId,
    } = useChatSidebar()

    // Create a memoized toggle function that sets the fileId and pageTitle context
    const toggleChat = useCallback(() => {
        if (options.fileId) {
            setFileId(options.fileId)
        }
        originalToggle()
    }, [originalToggle, options.fileId, setFileId])

    // Create a memoized function that opens the chat with fileId and page title
    const openChatWithContext = useCallback(() => {
        if (options.fileId) {
            setFileId(options.fileId)
        }
        openChat()
    }, [openChat, options.fileId, setFileId])

    return {
        isChatOpen,
        toggleChat,
        openChat: openChatWithContext,
        closeChat,
    }
}
