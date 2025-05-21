"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "~/app/_components/ui/avatar"
import { Button } from "~/app/_components/ui/button"
import { Card } from "~/app/_components/ui/card"
import { Input } from "~/app/_components/ui/input"
import { Send, Smile, Reply, MoreHorizontal } from "lucide-react"
import { Textarea } from "~/app/_components/ui/textarea"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "~/app/_components/ui/dropdown-menu"

interface PageChatProps {
  pageTitle: string
}

interface ChatUser {
  name: string
  avatar: string
  initials: string
}

interface ChatReply {
  id: string
  user: ChatUser
  content: string
  timestamp: string
}

interface ChatMessage {
  id: string
  user: ChatUser
  content: string
  timestamp: string
  mentions?: string[]
  replies: ChatReply[]
}

export function PageChat({ pageTitle }: PageChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      user: {
        name: "John Doe",
        avatar: "/placeholder.svg?height=32&width=32",
        initials: "JD",
      },
      content: "I've updated the timeline for the community events. Please take a look when you have a chance.",
      timestamp: "2 hours ago",
      replies: [],
    },
    {
      id: "2",
      user: {
        name: "Sarah Johnson",
        avatar: "/placeholder.svg?height=32&width=32",
        initials: "SJ",
      },
      content: "Looks good! @Emily Wilson can you review the volunteer schedule?",
      timestamp: "1 hour ago",
      mentions: ["Emily Wilson"],
      replies: [
        {
          id: "2-1",
          user: {
            name: "Emily Wilson",
            avatar: "/placeholder.svg?height=32&width=32",
            initials: "EW",
          },
          content: "I'll take a look at it this afternoon and get back to you.",
          timestamp: "45 minutes ago",
        },
        {
          id: "2-2",
          user: {
            name: "Sarah Johnson",
            avatar: "/placeholder.svg?height=32&width=32",
            initials: "SJ",
          },
          content: "Thanks Emily! Let me know if you have any questions.",
          timestamp: "30 minutes ago",
        },
      ],
    },
    {
      id: "3",
      user: {
        name: "Michael Brown",
        avatar: "/placeholder.svg?height=32&width=32",
        initials: "MB",
      },
      content: "I've added some new resources to the education initiative. @John Doe can you review them?",
      timestamp: "20 minutes ago",
      mentions: ["John Doe"],
      replies: [],
    },
  ])

  const [newMessage, setNewMessage] = useState("")
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = () => {
    if (!newMessage.trim()) return

    // Extract mentions from the message
    const mentionRegex = /@(\w+\s\w+)/g
    const mentions = []
    let match
    while ((match = mentionRegex.exec(newMessage)) !== null) {
      mentions.push(match[1])
    }

    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      user: {
        name: "You",
        avatar: "/placeholder.svg?height=32&width=32",
        initials: "YO",
      },
      content: newMessage,
      timestamp: "Just now",
      mentions: mentions.length > 0 ? mentions : undefined,
      replies: [],
    }

    setMessages([...messages, newMsg])
    setNewMessage("")
  }

  const handleSendReply = (messageId: string) => {
    if (!replyContent.trim()) return

    const updatedMessages = messages.map((message) => {
      if (message.id === messageId) {
        const newReply: ChatReply = {
          id: `${messageId}-${message.replies.length + 1}`,
          user: {
            name: "You",
            avatar: "/placeholder.svg?height=32&width=32",
            initials: "YO",
          },
          content: replyContent,
          timestamp: "Just now",
        }
        return {
          ...message,
          replies: [...message.replies, newReply],
        }
      }
      return message
    })

    setMessages(updatedMessages)
    setReplyContent("")
    setReplyingTo(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleReplyKeyDown = (e: React.KeyboardEvent, messageId: string) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendReply(messageId)
    }
  }

  // Function to highlight mentions in the message
  const highlightMentions = (content: string) => {
    return content.replace(/@(\w+\s\w+)/g, '<span class="text-primary font-medium">@$1</span>')
  }

  return (
    <Card className="flex flex-col h-[600px]">
      <div className="p-4 border-b">
        <h3 className="font-medium">Chat for {pageTitle}</h3>
        <p className="text-sm text-muted-foreground">Collaborate with your team members</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((message) => (
          <div key={message.id} className="space-y-3">
            <div className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={message.user.avatar || "/placeholder.svg"} alt={message.user.name} />
                <AvatarFallback>{message.user.initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{message.user.name}</span>
                    <span className="text-xs text-muted-foreground">{message.timestamp}</span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <MoreHorizontal size={14} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setReplyingTo(message.id)}>Reply</DropdownMenuItem>
                      <DropdownMenuItem>Copy Link</DropdownMenuItem>
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="text-sm" dangerouslySetInnerHTML={{ __html: highlightMentions(message.content) }} />
                <div className="flex items-center gap-2 mt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground"
                    onClick={() => setReplyingTo(message.id)}
                  >
                    <Reply size={12} className="mr-1" />
                    Reply
                  </Button>
                </div>
              </div>
            </div>

            {/* Replies */}
            {message.replies.length > 0 && (
              <div className="pl-11 space-y-3 border-l-2 border-muted ml-4">
                {message.replies.map((reply) => (
                  <div key={reply.id} className="flex gap-3">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={reply.user.avatar || "/placeholder.svg"} alt={reply.user.name} />
                      <AvatarFallback>{reply.user.initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{reply.user.name}</span>
                        <span className="text-xs text-muted-foreground">{reply.timestamp}</span>
                      </div>
                      <p className="text-sm">{reply.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reply input */}
            {replyingTo === message.id && (
              <div className="pl-11 ml-4">
                <div className="flex gap-2 items-start">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src="/placeholder.svg?height=24&width=24" alt="You" />
                    <AvatarFallback>YO</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <Textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      onKeyDown={(e) => handleReplyKeyDown(e, message.id)}
                      placeholder="Write a reply..."
                      className="min-h-[60px] text-sm"
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={() => handleSendReply(message.id)}>
                        Reply
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (use @ to mention)"
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
    </Card>
  )
}
