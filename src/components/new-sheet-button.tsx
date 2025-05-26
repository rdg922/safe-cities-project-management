"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { Button } from "~/components/ui/button"
import { api } from "~/trpc/react"
import { toast } from "~/hooks/use-toast"

export function NewSheetButton() {
  const router = useRouter()
  const mutation = api.sheets.create.useMutation({
    onSuccess: (data) => {
      toast({ title: "Sheet created", description: "Redirecting..." })
      router.push(`/sheets/${data.id}`)
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  })

  const handleCreate = () => {
    mutation.mutate({ title: "Untitled Sheet" })
  }

  return (
    <Button onClick={handleCreate} disabled={mutation.isLoading} className="mt-2">
      New Sheet
    </Button>
  )
}
