'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
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
import { Plus, Activity, Shield, Info, Undo, Redo } from 'lucide-react'

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

    // Undo/Redo state
    const [cellChangesHistory, setCellChangesHistory] = useState<
        CellChange[][]
    >([])
    const [historyIndex, setHistoryIndex] = useState(-1)

    // Debounced saving
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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

    // Debounced save function
    const debouncedSave = useCallback(
        (sheetData: SheetData) => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current)
            }

            saveTimeoutRef.current = setTimeout(() => {
                updateMutation.mutate({
                    fileId: sheetId,
                    content: JSON.stringify(sheetData),
                })
            }, 1000) // Debounce for 1 second
        },
        [sheetId, updateMutation]
    )

    // Helper function to apply changes to sheet data
    const applyNewValue = useCallback(
        (
            changes: CellChange[],
            prevSheet: SheetData,
            usePrevValue: boolean = false
        ): SheetData => {
            const newSheet = { ...prevSheet }

            changes.forEach((change) => {
                // Skip changes to form data columns if this is a synced sheet
                if (
                    syncMetadata?.formDataColumnCount &&
                    isFormDataColumn(
                        change.columnId as number,
                        syncMetadata.formDataColumnCount
                    )
                ) {
                    return
                }

                // Find row by rowId
                const rowIndex = newSheet.rows.findIndex(
                    (row) => row.rowId === change.rowId
                )
                if (rowIndex === -1) return

                // Create a copy of the row
                const row = { ...newSheet.rows[rowIndex]! }
                const newCells = [...(row.cells || [])] as DefaultCellTypes[]

                // Use either the new cell value or previous cell value
                const cellToApply = usePrevValue
                    ? change.previousCell
                    : change.newCell
                newCells[change.columnId as number] =
                    cellToApply as DefaultCellTypes

                // Update the row with new cells
                row.cells = newCells
                newSheet.rows[rowIndex] = row
                newSheet.cells[rowIndex] = newCells
            })

            return newSheet
        },
        [syncMetadata?.formDataColumnCount]
    )

    // Function to apply changes and update history
    const applyChangesToHistory = useCallback(
        (changes: CellChange[], prevSheet: SheetData): SheetData => {
            const updated = applyNewValue(changes, prevSheet)

            // Add to history (remove any future history if we're not at the end)
            const newHistory = [
                ...cellChangesHistory.slice(0, historyIndex + 1),
                changes,
            ]
            setCellChangesHistory(newHistory)
            setHistoryIndex(newHistory.length - 1)

            return updated
        },
        [cellChangesHistory, historyIndex, applyNewValue]
    )

    // Undo function
    const undoChanges = useCallback(() => {
        if (historyIndex >= 0 && cellChangesHistory[historyIndex]) {
            const changes = cellChangesHistory[historyIndex]!
            const newSheet = applyNewValue(changes, sheet, true) // Use previous values
            setSheet(newSheet)
            setHistoryIndex(historyIndex - 1)
            debouncedSave(newSheet)

            toast({
                title: '↩️ Undo',
                description: 'Changes have been undone.',
            })
        }
    }, [historyIndex, cellChangesHistory, sheet, applyNewValue, debouncedSave])

    // Redo function
    const redoChanges = useCallback(() => {
        if (
            historyIndex + 1 < cellChangesHistory.length &&
            cellChangesHistory[historyIndex + 1]
        ) {
            const changes = cellChangesHistory[historyIndex + 1]!
            const newSheet = applyNewValue(changes, sheet, false) // Use new values
            setSheet(newSheet)
            setHistoryIndex(historyIndex + 1)
            debouncedSave(newSheet)

            toast({
                title: '↪️ Redo',
                description: 'Changes have been redone.',
            })
        }
    }, [historyIndex, cellChangesHistory, sheet, applyNewValue, debouncedSave])

    // Check if Mac OS for keyboard shortcuts
    const isMacOs = useCallback(() => {
        return (
            typeof navigator !== 'undefined' &&
            navigator.platform.toUpperCase().indexOf('MAC') >= 0
        )
    }, [])

    // Keyboard event handler for undo/redo
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (readOnly) return

            const isCtrlOrCmd =
                (!isMacOs() && e.ctrlKey) || (isMacOs() && e.metaKey)

            if (isCtrlOrCmd) {
                switch (e.key.toLowerCase()) {
                    case 'z':
                        if (e.shiftKey) {
                            // Ctrl+Shift+Z or Cmd+Shift+Z for redo
                            e.preventDefault()
                            redoChanges()
                        } else {
                            // Ctrl+Z or Cmd+Z for undo
                            e.preventDefault()
                            undoChanges()
                        }
                        break
                    case 'y':
                        // Ctrl+Y for redo (Windows style)
                        if (!isMacOs()) {
                            e.preventDefault()
                            redoChanges()
                        }
                        break
                }
            }
        },
        [readOnly, isMacOs, undoChanges, redoChanges]
    )

    // Add keyboard event listener
    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown)
        return () => {
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [handleKeyDown])

    // Cleanup timeouts on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current)
            }
        }
    }, [])

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

        // Save the updated sheet with debouncing
        debouncedSave(newSheet)

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

        // Save the updated sheet with debouncing
        debouncedSave(newSheet)

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

        // Use the history system to apply changes
        const newSheet = applyChangesToHistory(allowedChanges, sheet)
        setSheet(newSheet)

        // Debounced save
        debouncedSave(newSheet)
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
                            onClick={undoChanges}
                            disabled={historyIndex < 0}
                            className="flex items-center gap-2"
                            title={`Undo (${isMacOs() ? 'Cmd' : 'Ctrl'}+Z)`}
                        >
                            <Undo className="h-4 w-4" />
                            Undo
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={redoChanges}
                            disabled={
                                historyIndex + 1 >= cellChangesHistory.length
                            }
                            className="flex items-center gap-2"
                            title={`Redo (${isMacOs() ? 'Cmd+Shift' : 'Ctrl+Shift'}+Z)`}
                        >
                            <Redo className="h-4 w-4" />
                            Redo
                        </Button>
                        <div className="h-4 border-l border-gray-300" />
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
