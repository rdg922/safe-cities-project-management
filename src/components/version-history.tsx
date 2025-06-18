'use client'

// Legacy version history component - now imports from the modular system
import React from 'react'
import { VersionHistory as ModularVersionHistory } from './version-history/version-history'
import type { VersionHistoryProps as ModularVersionHistoryProps } from './version-history/types'

// Legacy interface for backward compatibility
interface LegacyVersionHistoryProps {
    fileId: number
    isOpen: boolean
    onClose: () => void
    onRestore?: (content: string) => void
}

// Legacy wrapper component that maps to the new modular system
export function VersionHistory({
    fileId,
    isOpen,
    onClose,
    onRestore,
}: LegacyVersionHistoryProps) {
    return (
        <ModularVersionHistory
            fileId={fileId}
            fileType="page" // Default to page for backward compatibility
            isOpen={isOpen}
            onClose={onClose}
            onRestore={onRestore}
        />
    )
}

// Export types for backward compatibility
export type { LegacyVersionHistoryProps as VersionHistoryProps }
