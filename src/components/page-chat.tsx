"use client"

import { useState, useRef, useEffect } from "react"
import { useParams } from "next/navigation"
import { api } from "~/trpc/react"
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Send, Smile } from "lucide-react"

interface PageChatProps {
  pageTitle: string
}

export function PageChat({ pageTitle }: PageChatProps) {
  const params = useParams()
  const pageId = Number(params.pageId)
  const [newMessage, setNewMessage] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Get messages for this page
  const { data: messages = [], refetch: refetchMessages } = api.chat.getPageMessages.useQuery(
    { pageId },
    { enabled: !!pageId }
  )
  
  // Send message mutation
  const { mutate: sendMessage } = api.chat.sendMessage.useMutation({
    onSuccess: () => {
      setNewMessage("")
      void refetchMessages()
    },
  })
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])
  
  const handleSendMessage = () => {
    if (!newMessage.trim()) return
    
    sendMessage({
      pageId,
      content: newMessage.trim(),
    })
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }
  
  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <h3 className="font-medium">Chat for {pageTitle}</h3>
        <p className="text-sm text-muted-foreground">Collaborate with your team members</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4">
        {messages.map((message) => (
          <div key={message.id} className="flex gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{message.user?.email?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <div className="flex justify-between items-start">
                <span className="font-medium">{message.user?.email}</span>
                <span className="flex flex-col text-xs text-muted-foreground text-right min-w-max pt-1.5">
                  <span>{new Date(message.createdAt).toLocaleDateString()}</span>
                  <span>{new Date(message.createdAt).toLocaleTimeString()}</span>
                </span>
              </div>
              <p className="text-sm">{message.content}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="pt-4 border-t sticky bottom-0 bg-background">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button variant="ghost" size="icon" className="h-10 w-10">
            <Smile size={20} />
          </Button>
          <Button onClick={handleSendMessage} size="icon" className="h-10 w-10">
            <Send size={18} />
          </Button>
        </div>
      </div>
    </div>
  )
}
