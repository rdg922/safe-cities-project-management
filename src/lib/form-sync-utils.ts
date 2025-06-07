import type { Cell, TextCell } from '@silevis/reactgrid'

// Type for identifying form data columns
export interface FormDataMetadata {
    isFormData: boolean
    fieldId?: number
    columnType: 'system' | 'formField'
}

// Function to determine if a column should be non-editable (form data columns)
export function isFormDataColumn(
    columnIndex: number,
    formDataColumnCount: number
): boolean {
    // Form data columns are columns 1 to formDataColumnCount (skip column 0 which is row header)
    // Column 0 is always the row header, columns 1+ are form data if within formDataColumnCount
    return columnIndex > 0 && columnIndex <= formDataColumnCount
}

// Helper function to convert column index to alphabetical letter (A, B, C, ..., AA, AB, etc.)
export function getColumnLetter(index: number): string {
    let result = ''
    while (index > 0) {
        index-- // Convert to 0-based
        result = String.fromCharCode(65 + (index % 26)) + result
        index = Math.floor(index / 26)
    }
    return result
}

// Generate column schema for synced sheets
export function generateSyncedSheetSchema(
    formFields: Array<{ id: number; label: string; type: string }>
) {
    // Only form field columns - no system columns
    const formFieldColumns = formFields.map((field, index) => ({
        id: index,
        label: field.label,
        type: 'text',
        columnType: 'formField' as const,
        isFormData: true,
        fieldId: field.id,
    }))

    return {
        columns: formFieldColumns,
        formDataColumnCount: formFieldColumns.length,
    }
}
