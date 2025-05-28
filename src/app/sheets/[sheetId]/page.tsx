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
  
  // Fetch sheet from the server using the unified files router
  const sheet = await api.files.getById({ id })
  
  if (!sheet) {
    return <div>Sheet not found</div>
  }
  
  console.log(sheet)
  let initialData: SheetData
  try {
    const parsed = JSON.parse(sheet.content?.content || '{}')
    console.log('Parsed sheet data:', parsed)
    // Use parsed data if valid (has rows and cells arrays), otherwise create a new empty sheet
    initialData = parsed?.rows && Array.isArray(parsed.rows) && parsed?.cells && Array.isArray(parsed.cells) ? parsed : createEmptySheet()
  } catch (error) {
    console.error('Error parsing sheet content:', error)
    initialData = createEmptySheet()
  }
  
  return (
    <HydrateClient>
      <SheetEditor initialData={initialData} sheetId={id} sheetName={sheet.name} />
    </HydrateClient>
  )
}
