"use client"

import { api } from "~/trpc/react"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { MessageSquare, Search } from "lucide-react"
import Link from "next/link"

export default function ChatsPage() {
  const { data: recentChats = [] } = api.chat.getRecentChats.useQuery()

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chats</h1>
          <p className="text-muted-foreground mt-1">Collaborate with your team in real-time</p>
        </div>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search chats..." className="pl-10" />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Recent Chats</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {recentChats.map((chat) => (
              <Link
                key={chat.page.id}
                href={`/pages/${chat.page.id}`}
                className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer"
              >
                <div className="flex-shrink-0">
                  <MessageSquare className="h-12 w-12 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium truncate">{chat.page.filename}</h3>
                    <span className="text-xs text-muted-foreground">
                      {new Date(chat.lastMessage.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {chat.lastMessage.content}
                  </p>
                </div>
              </Link>
            ))}

            {recentChats.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <MessageSquare size={24} className="text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-medium">No chats yet</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Start a chat by opening the chat panel on any page.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
