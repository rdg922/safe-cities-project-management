'use client'

import React, { useState, useRef } from 'react'
import {
    ReactGrid,
    type CellChange,
    type Column,
    type DefaultCellTypes,
} from '@silevis/reactgrid'
import '@silevis/reactgrid/styles.scss'
import { applyChangesToSheet, type SheetData } from '~/lib/sheet-utils'
import { isFormDataColumn } from '~/lib/form-sync-utils'
import { api } from '~/trpc/react'
import { toast } from '~/hooks/use-toast'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent } from '~/components/ui/card'
import { Plus, Activity, Shield, Info } from 'lucide-react'

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
            toast({
                title: '✅ Sheet saved',
                description: 'Your changes have been saved successfully.',
            })
        },
        onError: (error) => {
            toast({
                title: '❌ Save failed',
                description: error.message,
                variant: 'destructive',
            })
        },
    })

    // Function to add a new column to the sheet
    const addColumn = () => {
        const newSheet = { ...sheet }
        const currentColCount = newSheet.rows[0]?.cells.length || 0

        // Convert column index to letter (A, B, C, ..., AA, AB, etc.)
        const getColumnLetter = (index: number): string => {
            let result = ''
            while (index > 0) {
                index-- // Convert to 0-based
                result = String.fromCharCode(65 + (index % 26)) + result
                index = Math.floor(index / 26)
            }
            return result
        }

        const columnLetter = getColumnLetter(currentColCount) // currentColCount already accounts for row header

        // Add header cell to header row
        if (newSheet.rows[0]) {
            newSheet.rows[0].cells.push({
                type: 'header',
                text: columnLetter,
            } as DefaultCellTypes)
        }

        // Add empty cells to all data rows
        for (let i = 1; i < newSheet.rows.length; i++) {
            newSheet.rows[i]?.cells.push({
                type: 'text',
                text: '',
            } as DefaultCellTypes)
        }

        // Update cells array
        newSheet.cells = newSheet.rows.map((row) => row.cells)

        setSheet(newSheet)

        // Save the updated sheet
        updateMutation.mutate({
            fileId: sheetId,
            content: JSON.stringify(newSheet),
        })

        toast({
            title: '📊 Column added',
            description: `New column ${columnLetter} has been added to the sheet.`,
        })
    }

    // Function to add a new row to the sheet
    const addRow = () => {
        const newSheet = { ...sheet }
        const newRowIndex = newSheet.rows.length
        const colCount = newSheet.rows[0]?.cells.length || 0

        // Create new row
        const newRow = {
            rowId: `row-${newRowIndex}`,
            height: 35,
            cells: Array.from({ length: colCount }, (_, j) => {
                if (j === 0) {
                    // First cell is row header with row number
                    return {
                        type: 'header',
                        text: `${newRowIndex}`,
                    } as DefaultCellTypes
                }

                // Regular data cell
                return {
                    type: 'text',
                    text: '',
                } as DefaultCellTypes
            }),
        }

        newSheet.rows.push(newRow)

        // Update cells array
        newSheet.cells = newSheet.rows.map((row) => row.cells)

        setSheet(newSheet)

        // Save the updated sheet
        updateMutation.mutate({
            fileId: sheetId,
            content: JSON.stringify(newSheet),
        })

        toast({
            title: '📝 Row added',
            description: `New row ${newRowIndex} has been added to the sheet.`,
        })
    }

    const onCellsChanged = (changes: CellChange[]) => {
        if (readOnly) return // Don't allow changes in read-only mode

        // Filter out changes to form data columns if this is a live sync sheet
        const allowedChanges = isLiveSyncSheet
            ? changes.filter(
                  (change) =>
                      !isFormDataColumn(
                          change.columnId as number,
                          formDataColumnCount
                      )
              )
            : changes

        if (allowedChanges.length === 0) {
            toast({
                title: '🛡️ Cannot edit form data',
                description:
                    'Form data columns are protected and cannot be edited. Try adding a new column for your notes.',
                variant: 'destructive',
            })
            return
        }

        if (allowedChanges.length < changes.length) {
            toast({
                title: '⚠️ Some edits blocked',
                description:
                    'Form data columns are protected. Only additional columns can be edited.',
                variant: 'default',
            })
        }

        const newSheet = applyChangesToSheet(
            sheet,
            allowedChanges,
            formDataColumnCount
        )
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
            const isFormDataCol =
                isLiveSyncSheet && isFormDataColumn(index, formDataColumnCount)
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
                        background-color: hsl(var(--muted)) !important;
                        border-right: 2px solid hsl(var(--border)) !important;
                    }
                    .rg-column-form-data .rg-cell:hover {
                        background-color: hsl(var(--muted) / 0.8) !important;
                    }
                    .rg-column-form-data .rg-cell.rg-cell-header {
                        background-color: hsl(var(--muted)) !important;
                        font-weight: 600;
                        color: hsl(var(--muted-foreground)) !important;
                    }
                `}</style>
            )}

            {/* Header with controls */}
            <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-semibold">
                        {sheetName || 'Sheet'}
                    </h2>
                    {isLiveSyncSheet && (
                        <Badge
                            variant="secondary"
                            className="flex items-center gap-1"
                        >
                            <Activity className="h-3 w-3" />
                            Live Sync
                        </Badge>
                    )}
                </div>

                {!readOnly && (
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={addColumn}
                            disabled={updateMutation.isPending}
                            className="flex items-center gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            Add Column
                        </Button>
                    </div>
                )}
            </div>

            {/* Live sync notification */}
            {isLiveSyncSheet && (
                <Card className="mx-4 mt-4 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                    <CardContent className="flex items-start gap-3 p-4">
                        <div className="flex-shrink-0 mt-0.5">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                                <Info className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                    Live Sync Active
                                </h4>
                                <Badge
                                    variant="outline"
                                    className="text-xs border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300"
                                >
                                    <Shield className="h-3 w-3 mr-1" />
                                    Protected
                                </Badge>
                            </div>
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                                The first {formDataColumnCount} columns contain
                                form submission data and are protected from
                                editing. You can add and edit additional columns
                                for your notes and analysis.
                            </p>
                            <div className="mt-2 text-xs text-blue-700 dark:text-blue-300">
                                Last synced:{' '}
                                {syncMetadata?.lastSyncAt
                                    ? new Date(
                                          syncMetadata.lastSyncAt
                                      ).toLocaleString()
                                    : 'Unknown'}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="flex-1 min-h-0 p-4">
                <div className="rg-container dark:bg-background dark:text-foreground rounded-lg border">
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
