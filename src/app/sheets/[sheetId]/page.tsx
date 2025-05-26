"use server"
import React from "react"
import { api, HydrateClient } from "~/trpc/server"
import { SheetEditor } from "~/components/sheet-editor"
import { createEmptySheet, type SheetData } from "~/lib/sheet-utils"

interface SheetPageProps {
  params: {
    sheetId: string
  }
}

export default async function SheetPage({ params }: SheetPageProps) {
  const id = Number(params.sheetId)
  // Fetch sheet from the server
  const sheet = await api.sheets.getById({ id })
  console.log(sheet)
  let initialData: SheetData
  try {
    const parsed = JSON.parse(sheet.content)
    // Use parsed data if valid, otherwise create a new empty sheet
    initialData = parsed?.rows && parsed?.cells ? parsed : createEmptySheet()
  } catch {
    initialData = createEmptySheet()
  }
  return (
    <HydrateClient>
      <SheetEditor initialData={initialData} sheetId={id} />
    </HydrateClient>
  )
}
