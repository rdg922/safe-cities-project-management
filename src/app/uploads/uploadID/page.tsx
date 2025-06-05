'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { api } from '~/trpc/react' // adjust import if you use another data layer
import { FileHeader } from '~/components/file-header'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from '~/components/ui/button'
import { Download, File as FileIcon, Image } from 'lucide-react'

type Permission = 'view' | 'comment' | 'edit'

export default function UploadView() {
    const params = useParams()
    const uploadId = Number(params.uploadId as string)

    // Fetch upload file data (adjust this hook to your API)
    const {
        data: upload,
        isLoading,
        error,
    } = api.files.getById.useQuery({ id: uploadId }, { enabled: !!uploadId })

    // Get user's permission for this file
    const { data: userPermission } = api.permissions.getUserPermission.useQuery(
        { fileId: uploadId },
        { enabled: !!uploadId }
    )

    const [fileUrl, setFileUrl] = useState<string | null>(null)

    // Generate download/public URL when upload data loads
    useEffect(() => {
        const getUrl = async () => {
            if (upload?.path) {
                const supabase = createClientComponentClient()
                const { data } = supabase.storage.from('files').getPublicUrl(upload.path)
                setFileUrl(data.publicUrl)
            }
        }
        getUrl()
    }, [upload?.path])

    if (isLoading) {
        return (
            <div className="container mx-auto p-6 flex items-center justify-center h-[calc(100vh-200px)]">
                <div className="text-center">
                    <div className="animate-spin h-8 w-8 border-4 border-primary rounded-full border-t-transparent mx-auto mb-4"></div>
                    <p className="text-muted-foreground">
                        Loading upload...
                    </p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="container mx-auto p-6 flex items-center justify-center h-[calc(100vh-200px)]">
                <div className="text-center">
                    <p className="text-destructive mb-2">
                        Error loading upload
                    </p>
                    <p className="text-muted-foreground">{error.message}</p>
                </div>
            </div>
        )
    }

    if (!upload) {
        return (
            <div className="container mx-auto p-6 flex items-center justify-center h-[calc(100vh-200px)]">
                <div className="text-center">
                    <p className="text-muted-foreground">Upload not found</p>
                </div>
            </div>
        )
    }

    const isImage = upload.mimetype && upload.mimetype.startsWith('image/')

    return (
        <div className="h-screen flex flex-col">
            <FileHeader
                filename={upload.name || 'Untitled Upload'}
                fileId={uploadId}
                permission={userPermission as Permission}
            />

            <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-4">
                <div className="mb-4 flex flex-col items-center">
                    {isImage && fileUrl && (
                        <img
                            src={fileUrl}
                            alt={upload.name}
                            className="max-w-xs max-h-[400px] rounded shadow"
                        />
                    )}
                    {!isImage && (
                        <div className="flex items-center gap-2">
                            <FileIcon className="w-12 h-12 text-muted-foreground" />
                            <span className="text-lg">{upload.name}</span>
                        </div>
                    )}
                </div>

                {/* Download/Open button */}
                {fileUrl && (
                    <a href={fileUrl} target="_blank" rel="noopener noreferrer" download={upload.name}>
                        <Button>
                            <Download className="w-4 h-4 mr-2" />
                            Download
                        </Button>
                    </a>
                )}

                {/* Show mimetype and size if you have it */}
                <div className="mt-4 text-sm text-muted-foreground">
                    {upload.mimetype}
                </div>
            </div>
        </div>
    )
}