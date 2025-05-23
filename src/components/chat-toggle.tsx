"use client"

import { MessageSquare } from "lucide-react"
import { Button } from "~/components/ui/button"
import { useChatToggle } from "~/hooks/use-chat-toggle"

export interface ChatToggleProps {
  className?: string
}

export function ChatToggle({ className }: ChatToggleProps) {
  const { toggleChat } = useChatToggle()

  return (
    <Button
      variant="outline"
      size="sm"
      className={className}
      onClick={toggleChat}
    >
      <MessageSquare size={16} className="mr-2" />
      Chat
    </Button>
  )
}
