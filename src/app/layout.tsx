import type React from 'react'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider, RedirectToSignIn, SignedOut } from '@clerk/nextjs'
import '~/styles/globals.scss'
import { ThemeProvider } from '~/components/theme-provider'
import { TRPCReactProvider } from '~/trpc/react'
import { AppSidebar } from '~/components/app-sidebar'
import { SidebarProvider } from '~/components/ui/sidebar'
import { ChatSidebarProvider } from '~/components/ui/chat-sidebar-provider'
import { ChatSidebar } from '~/components/chat-sidebar'
import { Toaster } from '~/components/ui/toaster'
import { FileTreeProvider } from '~/providers/file-tree-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'NonProfit Workspace',
    description: 'Project management for non-profit organizations',
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={inter.className}>
                <ClerkProvider>
                    <TRPCReactProvider>
                        <ThemeProvider
                            attribute="class"
                            defaultTheme="light"
                            enableSystem
                            disableTransitionOnChange
                        >
                            <FileTreeProvider>
                                <SidebarProvider>
                                    <ChatSidebarProvider>
                                        <div className="flex min-h-screen w-full">
                                            <AppSidebar />
                                            <div className="flex-1 flex flex-col overflow-hidden">
                                                <main className="flex-1 overflow-auto">
                                                    {children}
                                                </main>
                                            </div>
                                            <ChatSidebar />
                                        </div>
                                        <Toaster />
                                    </ChatSidebarProvider>
                                </SidebarProvider>
                            </FileTreeProvider>
                        </ThemeProvider>
                    </TRPCReactProvider>
                </ClerkProvider>
            </body>
        </html>
    )
}
