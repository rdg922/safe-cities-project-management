import { type Cell, type CellChange, type Row } from "@silevis/reactgrid";

// Custom types for our sheet application
export interface SheetData {
  rows: Row[];
  cells: Cell[][];
}

export interface SheetWithId extends SheetData {
  id: number;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
}

// Helper function to create a new empty sheet
export function createEmptySheet(rowCount: number = 50, colCount: number = 26): SheetData {
  // Create header row with column letters
  const headerRow: Row = {
    rowId: 'header',
    height: 35,
    cells: Array.from({ length: colCount + 1 }, (_, i) => {
      if (i === 0) {
        return {
          type: 'header',
          text: '',
        };
      }
      
      // Convert column index to letter (A, B, C, ...)
      const columnLetter = String.fromCharCode(64 + i);
      
      return {
        type: 'header',
        text: columnLetter,
      };
    }),
  };
  
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
        };
      }
      
      // Regular data cell
      return {
        type: 'text',
        text: '',
      };
    }),
  }));
  
  const rows = [headerRow, ...dataRows];
  
  // Populate cells array for easier access
  const cells = rows.map(row => row.cells as Cell[]);
  
  return {
    rows,
    cells,
  };
}

// Helper function to convert sheet changes to updated sheet data
export function applyChangesToSheet(sheet: SheetData, changes: CellChange[]): SheetData {
  const newSheet = { ...sheet };
  
  changes.forEach((change) => {
    // Find row by rowId
    const rowIndex = newSheet.rows.findIndex(row => row.rowId === change.rowId);
    if (rowIndex === -1) return;
    
    // Create a copy of the row
    const row = { ...newSheet.rows[rowIndex] };
    
    // Update the cell at the specified column index
    const newCells = [...row.cells];
    newCells[change.columnId as number] = {
      ...newCells[change.columnId as number],
      text: change.newCell.text,
    };
    
    // Update the row with new cells
    row.cells = newCells;
    
    // Update the row in the newSheet
    newSheet.rows[rowIndex] = row;
    
    // Also update the cells array
    newSheet.cells[rowIndex] = newCells;
  });
  
  return newSheet;
}
