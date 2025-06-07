'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { api } from '~/trpc/react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from '~/components/ui/button'
import { Download, File as FileIcon } from 'lucide-react'

export default function UploadPage() {
    const { uploadId } = useParams<{ uploadId: string }>()
    const idNum = Number(uploadId)
    const {
        data: file,
        isLoading,
        error,
    } = api.files.getById.useQuery({ id: idNum }, { enabled: !!idNum })
    const [fileUrl, setFileUrl] = useState<string | null>(null)

    useEffect(() => {
        if (file?.path) {
            const supabase = createClientComponentClient()
            const { data } = supabase.storage
                .from('files')
                .getPublicUrl(file.path)
            console.log(data)
            setFileUrl(data?.publicUrl || null)
        }
    }, [file?.path])

    if (isLoading) return <div className="p-8 text-center">Loading...</div>
    if (error)
        return (
            <div className="p-8 text-center text-destructive">
                Error loading file
            </div>
        )
    if (!file)
        return (
            <div className="p-8 text-center text-muted-foreground">
                File not found here
            </div>
        )

    const isImage = file.mimetype && file.mimetype.startsWith('image/')

    return (
        <div className="max-w-2xl mx-auto py-8 px-4">
            <div className="mb-6 text-2xl font-bold flex items-center gap-2">
                <FileIcon className="w-6 h-6" />
                {file.name}
                <div className="mt-4 text-sm text-muted-foreground">
                    File Type: {file.mimetype}
                </div>
            </div>
            <div className="mb-4">
                {isImage && fileUrl ? (
                    <img
                        src={fileUrl}
                        alt={file.name}
                        className="max-w-full max-h-[400px] rounded shadow"
                    />
                ) : (
                    <div className="flex items-center gap-2">
                        <FileIcon className="w-12 h-12 text-muted-foreground" />
                        <span className="text-lg">{file.name}</span>
                    </div>
                )}
            </div>
            {fileUrl && (
                <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={file.name}
                >
                    <Button>
                        <Download className="w-4 h-4 mr-2" />
                        Download
                    </Button>
                </a>
            )}
        </div>
    )
}
