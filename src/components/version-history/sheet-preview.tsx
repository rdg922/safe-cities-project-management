import React from 'react'
import { ReactGrid, type Column } from '@silevis/reactgrid'
import '@silevis/reactgrid/styles.scss'
import { createEmptySheet, type SheetData } from '~/lib/sheet-utils'

interface SheetPreviewProps {
    content: string
}

export function SheetPreview({ content }: SheetPreviewProps) {
    let sheetData: SheetData

    try {
        const parsed = JSON.parse(content || '{}')
        // Use parsed data if valid (has rows and cells arrays), otherwise create a new empty sheet
        sheetData =
            parsed?.rows &&
            Array.isArray(parsed.rows) &&
            parsed?.cells &&
            Array.isArray(parsed.cells)
                ? parsed
                : createEmptySheet()
    } catch (error) {
        console.error('Error parsing sheet content for preview:', error)
        sheetData = createEmptySheet()
    }

    // Derive column definitions from the first row's cells
    const columns: Column[] =
        sheetData.rows[0]?.cells.map((_, index) => ({
            columnId: index,
            width: index === 0 ? 60 : 120,
            resizable: false, // Disable resizing in preview
        })) || []

    return (
        <div className="h-full w-full border rounded-lg bg-background overflow-auto">
            <div className="p-4">
                <div className="rg-container dark:bg-background dark:text-foreground rounded-lg border">
                    <ReactGrid
                        rows={sheetData.rows}
                        columns={columns}
                        minRowHeight={35}
                        enableRowSelection={false}
                        enableColumnSelection={false}
                    />
                </div>
            </div>
        </div>
    )
}
