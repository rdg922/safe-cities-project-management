'use client'

import React, { useState, useRef } from 'react'
import { ReactGrid, type CellChange, type Column } from '@silevis/reactgrid'
import '@silevis/reactgrid/styles.scss'
import { applyChangesToSheet, type SheetData } from '~/lib/sheet-utils'
import { isFormDataColumn } from '~/lib/form-sync-utils'
import { api } from '~/trpc/react'
import { toast } from '~/hooks/use-toast'

interface SheetEditorProps {
    initialData: SheetData
    sheetId: number
    sheetName?: string
    readOnly?: boolean
    syncMetadata?: {
        formId: number
        isLiveSync: boolean
        formDataColumnCount: number
        lastSyncAt: string
    }
}

export function SheetEditor({
    initialData,
    sheetId,
    sheetName,
    readOnly = false,
    syncMetadata,
}: SheetEditorProps) {
    const [sheet, setSheet] = useState<SheetData>(initialData)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)
    
    const isLiveSyncSheet = syncMetadata?.isLiveSync
    const formDataColumnCount = syncMetadata?.formDataColumnCount || 0
    const updateMutation = api.files.updateSheetContent.useMutation({
        onSuccess: () => {
            toast({ title: 'Sheet saved' })
        },
        onError: (error) => {
            toast({
                title: 'Save failed',
                description: error.message,
                variant: 'destructive',
            })
        },
    })

    const onCellsChanged = (changes: CellChange[]) => {
        if (readOnly) return // Don't allow changes in read-only mode

        // Filter out changes to form data columns if this is a live sync sheet
        const allowedChanges = isLiveSyncSheet 
            ? changes.filter(change => !isFormDataColumn(change.columnId as number, formDataColumnCount))
            : changes

        if (allowedChanges.length === 0) {
            toast({
                title: 'Cannot edit form data',
                description: 'Form data columns are protected and cannot be edited.',
                variant: 'destructive',
            })
            return
        }

        if (allowedChanges.length < changes.length) {
            toast({
                title: 'Some edits blocked',
                description: 'Form data columns are protected. Only additional columns can be edited.',
                variant: 'destructive',
            })
        }

        const newSheet = applyChangesToSheet(sheet, allowedChanges, formDataColumnCount)
        setSheet(newSheet)
        
        // debounce save
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => {
            updateMutation.mutate({
                fileId: sheetId,
                content: JSON.stringify(newSheet),
            })
        }, 1000)
    }

    // Derive column definitions from the first row's cells
    const columns: Column[] =
        sheet.rows[0]?.cells.map((_, index) => {
            const isFormDataCol = isLiveSyncSheet && isFormDataColumn(index, formDataColumnCount)
            return {
                columnId: index,
                width: index === 0 ? 60 : 120,
                resizable: true,
                // Add visual distinction for form data columns
                ...(isFormDataCol && {
                    className: 'rg-column-form-data',
                }),
            }
        }) || []

    return (
        <div className="flex flex-col h-full">
            {isLiveSyncSheet && (
                <style jsx>{`
                    .rg-column-form-data .rg-cell {
                        background-color: #f8f9fa !important;
                        border-right: 2px solid #e9ecef !important;
                    }
                    .rg-column-form-data .rg-cell:hover {
                        background-color: #f1f3f4 !important;
                    }
                    .rg-column-form-data .rg-cell.rg-cell-header {
                        background-color: #e9ecef !important;
                        font-weight: 600;
                    }
                `}</style>
            )}
            {isLiveSyncSheet && (
                <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                    🔄 Live Sync Active - Form data columns (first {formDataColumnCount}) are protected
                </div>
            )}
            <div className="flex-1 min-h-0">
                <div className="rg-container dark:bg-background dark:text-foreground">
                    <ReactGrid
                        rows={sheet.rows}
                        columns={columns}
                        minRowHeight={35}
                        onCellsChanged={readOnly ? undefined : onCellsChanged}
                        enableRowSelection={!readOnly}
                        enableColumnSelection={!readOnly}
                    />
                </div>
            </div>
        </div>
    )
}
