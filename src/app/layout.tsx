import type React from 'react'
import type { Metadata } from 'next'
import { Montserrat, Playfair_Display, Source_Code_Pro } from 'next/font/google'
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
import { LayoutWrapper } from '~/components/layout-wrapper'

const montserrat = Montserrat({
    subsets: ['latin'],
    variable: '--font-sans',
    display: 'swap',
})

const playfairDisplay = Playfair_Display({
    subsets: ['latin'],
    variable: '--font-serif',
    display: 'swap',
})

const sourceCodePro = Source_Code_Pro({
    subsets: ['latin'],
    variable: '--font-mono',
    display: 'swap',
})

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
            <body
                className={`${montserrat.variable} ${playfairDisplay.variable} ${sourceCodePro.variable} font-sans`}
            >
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
                                        <LayoutWrapper>
                                            {children}
                                        </LayoutWrapper>
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
