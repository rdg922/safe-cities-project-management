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
    // Form data columns are the first N columns (submission info + form fields)
    return columnIndex < formDataColumnCount
}

// Generate column schema for synced sheets
export function generateSyncedSheetSchema(
    formFields: Array<{ id: number; label: string; type: string }>
) {
    const systemColumns = [
        {
            id: 0,
            label: 'Submission ID',
            type: 'text',
            columnType: 'system' as const,
            isFormData: true,
        },
        {
            id: 1,
            label: 'Submitted At',
            type: 'text',
            columnType: 'system' as const,
            isFormData: true,
        },
        {
            id: 2,
            label: 'Submitter Name',
            type: 'text',
            columnType: 'system' as const,
            isFormData: true,
        },
        {
            id: 3,
            label: 'Submitter Email',
            type: 'text',
            columnType: 'system' as const,
            isFormData: true,
        },
    ]

    const formFieldColumns = formFields.map((field, index) => ({
        id: systemColumns.length + index,
        label: field.label,
        type: 'text',
        columnType: 'formField' as const,
        isFormData: true,
        fieldId: field.id,
    }))

    return {
        columns: [...systemColumns, ...formFieldColumns],
        formDataColumnCount: systemColumns.length + formFieldColumns.length,
    }
}
