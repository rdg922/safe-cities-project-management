'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { api } from '~/trpc/react'
import { SheetEditor } from '~/components/sheet-editor'
import { FileHeader } from '~/components/file-header'
import { createEmptySheet, type SheetData } from '~/lib/sheet-utils'

type PermissionType = 'view' | 'comment' | 'edit'

export default function SheetPage() {
    const params = useParams()
    const sheetId = Number(params.sheetId as string)
    const [localPermission, setLocalPermission] =
        useState<PermissionType>('view')
    const [savingStatus, setSavingStatus] = useState<
        'idle' | 'saving' | 'saved'
    >('idle')

    // Fetch sheet from the server using the unified files router with type validation
    const { data: sheet, isLoading } = api.files.getById.useQuery(
        {
            id: sheetId,
            expectedType: 'sheet',
        },
        {
            enabled: !!sheetId,
            retry: (failureCount, error) => {
                // Don't retry on permission or type validation errors
                if (
                    error?.data?.code === 'FORBIDDEN' ||
                    error?.data?.code === 'BAD_REQUEST'
                ) {
                    return false
                }
                return failureCount < 3
            },
        }
    )

    // Get user's permission for this file using the hierarchical permission system
    const { data: userPermission } = api.permissions.getUserPermission.useQuery(
        { fileId: sheetId },
        { enabled: !!sheetId }
    )

    // Get sync metadata for this sheet if it's synced from a form
    const { data: syncMetadata } = api.forms.getSyncMetadataBySheetId.useQuery(
        { sheetId },
        { enabled: !!sheetId }
    )

    // Update local permission when user permission loads
    useEffect(() => {
        if (userPermission) {
            setLocalPermission(userPermission)
        }
    }, [userPermission])

    if (isLoading) {
        return (
            <div className="container mx-auto p-6">
                <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                    <div className="text-center">
                        <div className="animate-spin h-8 w-8 border-4 border-primary rounded-full border-t-transparent mx-auto mb-4"></div>
                        <p className="text-muted-foreground">
                            Loading sheet content...
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    if (!sheet) {
        return <div className="p-4">Sheet not found</div>
    }

    let initialData: SheetData
    try {
        const parsed = JSON.parse(sheet.content?.content || '{}')
        // Use parsed data if valid (has rows and cells arrays), otherwise create a new empty sheet
        initialData =
            parsed?.rows &&
            Array.isArray(parsed.rows) &&
            parsed?.cells &&
            Array.isArray(parsed.cells)
                ? parsed
                : createEmptySheet()
    } catch (error) {
        console.error('Error parsing sheet content:', error)
        initialData = createEmptySheet()
    }

    const handlePermissionChange = (newPermission: PermissionType) => {
        setLocalPermission(newPermission)
        // Note: Actual permission changes should be handled through the share modal
        // This is just for UI consistency
    }

    // Determine if the editor should be read-only based on permissions
    const isReadOnly = !userPermission || userPermission === 'view'

    return (
        <div className="h-screen flex flex-col">
            <FileHeader
                filename={sheet.name}
                fileId={sheetId}
                permission={localPermission}
                savingStatus={savingStatus}
                onPermissionChange={handlePermissionChange}
            />
            <div className="flex-1">
                <SheetEditor
                    initialData={initialData}
                    sheetId={sheetId}
                    sheetName={sheet.name}
                    readOnly={isReadOnly}
                    syncMetadata={syncMetadata || undefined}
                    onSavingStatusChange={setSavingStatus}
                />
            </div>
        </div>
    )
}
