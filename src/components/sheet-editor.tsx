"use client"

import React, { useState, useRef } from "react"
import { ReactGrid, type CellChange, type Column } from "@silevis/reactgrid"
import "@silevis/reactgrid/styles.scss"
import { applyChangesToSheet, type SheetData } from "~/lib/sheet-utils"
import { api } from "~/trpc/react"
import { toast } from "~/hooks/use-toast"

interface SheetEditorProps {
  initialData: SheetData
  sheetId: number
  sheetName?: string
}

export function SheetEditor({ initialData, sheetId, sheetName }: SheetEditorProps) {
  const [sheet, setSheet] = useState<SheetData>(initialData)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const updateMutation = api.files.updateSheetContent.useMutation({
    onSuccess: () => {
      toast({ title: "Sheet saved" })
    },
    onError: (error) => {
      toast({ title: "Save failed", description: error.message, variant: "destructive" })
    }
  })

  const onCellsChanged = (changes: CellChange[]) => {
    const newSheet = applyChangesToSheet(sheet, changes)
    setSheet(newSheet)
    // debounce save
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      updateMutation.mutate({ fileId: sheetId, content: JSON.stringify(newSheet) })
    }, 1000)
  }

  // Derive column definitions from the first row's cells
  const columns: Column[] = sheet.rows[0]?.cells.map((_, index) => ({
    columnId: index,
    width: index === 0 ? 60 : 120,
    resizable: true,
  })) || []
  
  return (
    <div className="flex flex-col h-full">
      {sheetName && (
        <div className="mb-4 p-4 border-b border-border">
          <h1 className="text-2xl font-bold text-foreground">{sheetName}</h1>
        </div>
      )}
      <div className="flex-1 min-h-0">
        <div className="rg-container dark:bg-background dark:text-foreground">
          <ReactGrid
          rows={sheet.rows}
          columns={columns}
          minRowHeight={35}
          onCellsChanged={onCellsChanged}
        />
        </div>
      </div>
    </div>
  )
}
