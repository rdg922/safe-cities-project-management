import Link from "next/link"
import { NewSheetButton } from "~/components/new-sheet-button"
import { api, HydrateClient } from "~/trpc/server"

export default async function SheetsPage() {
  // Fetch sheets on the server
  const sheets = await api.sheets.getAll()
  return (
    <HydrateClient>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Sheets</h1>
        <NewSheetButton />
        <ul className="mt-4 space-y-2">
          {sheets.map((sheet) => (
            <li key={sheet.id}>
              <Link href={`/sheets/${sheet.id}`} className="text-blue-600 hover:underline">
                {sheet.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </HydrateClient>
  )
}
