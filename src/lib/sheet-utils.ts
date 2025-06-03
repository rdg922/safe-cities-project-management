import {
    type Cell,
    type CellChange,
    type Row,
    type DefaultCellTypes,
} from '@silevis/reactgrid'
import { isFormDataColumn } from './form-sync-utils'

// Custom types for our sheet application
export interface SheetData {
    rows: Row[]
    cells: DefaultCellTypes[][]
}

export interface SheetWithId extends SheetData {
    id: number
    title: string
    createdAt: Date
    updatedAt: Date
    createdBy: string | null
    updatedBy: string | null
}

// Helper function to create a new empty sheet
export function createEmptySheet(
    rowCount: number = 50,
    colCount: number = 26
): SheetData {
    // Create header row with column letters
    const headerRow: Row = {
        rowId: 'header',
        height: 35,
        cells: Array.from({ length: colCount + 1 }, (_, i) => {
            if (i === 0) {
                return {
                    type: 'header',
                    text: '',
                }
            }

            // Convert column index to letter (A, B, C, ...)
            const columnLetter = String.fromCharCode(64 + i)

            return {
                type: 'header',
                text: columnLetter,
            }
        }),
    }

    // Create data rows
    const dataRows: Row[] = Array.from({ length: rowCount }, (_, i) => ({
        rowId: `row-${i + 1}`,
        height: 35,
        cells: Array.from({ length: colCount + 1 }, (_, j) => {
            if (j === 0) {
                // First cell in each row is a row header with row number
                return {
                    type: 'header',
                    text: `${i + 1}`,
                }
            }

            // Regular data cell
            return {
                type: 'text',
                text: '',
            }
        }),
    }))

    const rows = [headerRow, ...dataRows]

    // Populate cells array for easier access
    const cells = rows.map((row) => row.cells as DefaultCellTypes[])

    return {
        rows,
        cells,
    }
}

// Helper function to convert sheet changes to updated sheet data
export function applyChangesToSheet(
    sheet: SheetData,
    changes: CellChange[],
    formDataColumnCount?: number
): SheetData {
    const newSheet = { ...sheet }

    changes.forEach((change) => {
        // Skip changes to form data columns if this is a synced sheet
        if (
            formDataColumnCount &&
            isFormDataColumn(change.columnId as number, formDataColumnCount)
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

        // Update the cell at the specified column index
        const newCells = [...(row.cells || [])] as DefaultCellTypes[]
        const currentCell = newCells[change.columnId as number]

        // Update cell based on its type
        if (currentCell) {
            newCells[change.columnId as number] = {
                ...currentCell,
                ...change.newCell,
            } as DefaultCellTypes
        } else {
            newCells[change.columnId as number] =
                change.newCell as DefaultCellTypes
        }

        // Update the row with new cells
        row.cells = newCells

        // Update the row in the newSheet
        newSheet.rows[rowIndex] = row as Row

        // Also update the cells array
        newSheet.cells[rowIndex] = newCells
    })

    return newSheet
}

// Helper function to create sheet data from form submissions (for synced sheets)
export function createSyncedSheetData(
    formSubmissions: Array<{
        id: number
        createdAt: Date
        submitterName?: string | null
        submitterEmail?: string | null
        user?: { name?: string | null; email?: string | null } | null
        responses: Array<{
            fieldId: number
            value: string | null
            field: { id: number; label: string; type: string }
        }>
    }>,
    formFields: Array<{ id: number; label: string; type: string }>
): SheetData {
    // Create header row
    const headers = [
        'Submission ID',
        'Submitted At',
        'Submitter Name',
        'Submitter Email',
        ...formFields.map((field) => field.label),
    ]

    const headerRow: Row = {
        rowId: 'header',
        height: 35,
        cells: headers.map((header) => ({
            type: 'header' as const,
            text: header,
        })),
    }

    // Create data rows from submissions
    const dataRows: Row[] = formSubmissions.map((submission, rowIndex) => {
        const rowCells = [
            {
                type: 'text' as const,
                text: submission.id.toString(),
            },
            {
                type: 'text' as const,
                text: submission.createdAt.toISOString(),
            },
            {
                type: 'text' as const,
                text: submission.user?.name || submission.submitterName || '',
            },
            {
                type: 'text' as const,
                text: submission.user?.email || submission.submitterEmail || '',
            },
        ]

        // Add response values for each form field
        for (const field of formFields) {
            const response = submission.responses.find(
                (r) => r.fieldId === field.id
            )
            let value = ''

            if (response && response.value) {
                try {
                    const parsedValue = JSON.parse(response.value)
                    value = Array.isArray(parsedValue)
                        ? parsedValue.join(', ')
                        : String(parsedValue)
                } catch {
                    value = String(response.value)
                }
            }

            rowCells.push({
                type: 'text' as const,
                text: value,
            })
        }

        return {
            rowId: `submission-${submission.id}`,
            height: 35,
            cells: rowCells,
        }
    })

    const rows = [headerRow, ...dataRows]
    const cells = rows.map((row) => row.cells as DefaultCellTypes[])

    return { rows, cells }
}
