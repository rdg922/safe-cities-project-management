import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import {ClerkProvider, RedirectToSignIn, SignedOut} from "@clerk/nextjs"
import "~/styles/globals.css"
import { ThemeProvider } from "~/components/theme-provider"
import { TRPCReactProvider } from "~/trpc/react"
import { AppSidebar } from "~/components/app-sidebar"
import { SidebarProvider } from "~/components/ui/sidebar"
import { Toaster } from "~/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "NonProfit Workspace",
  description: "Project management for non-profit organizations",
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
          <SignedOut>
            <RedirectToSignIn />
          </SignedOut>
          <TRPCReactProvider>
            <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
              <SidebarProvider>
                <div className="flex min-h-screen w-full">
                  <AppSidebar />
                  <main className="flex-1 overflow-auto">{children}</main>
                </div>
                <Toaster />
              </SidebarProvider>
            </ThemeProvider>
          </TRPCReactProvider>
        </ClerkProvider>
      </body>
    </html>
  )
}
