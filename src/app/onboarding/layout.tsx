'use client'

import React from 'react'
import { ThemeProvider } from '~/components/theme-provider'
import { Toaster } from '~/components/ui/toaster'

export default function OnboardingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen w-full">
            {children}
            <Toaster />
        </div>
    )
}
