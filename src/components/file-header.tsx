'use client'

import { useState } from 'react'
import { Button } from '~/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import {
    Eye,
    MessageSquare,
    MoreHorizontal,
    PenSquare,
    Share2,
    Users,
    Download,
} from 'lucide-react'
import { useChatToggle } from '~/hooks/use-chat-toggle'
import { ShareModal } from '~/components/share-modal'
import { downloadFile } from '~/utils/pdfExport.client'

type Permission = 'view' | 'comment' | 'edit'

interface FileHeaderProps {
    filename: string
    fileId: number
    permission: Permission
    savingStatus?: 'saving' | 'saved' | 'idle'
    content: string
}

const permissionIcons = {
    view: <Eye size={16} />,
    comment: <MessageSquare size={16} />,
    edit: <PenSquare size={16} />,
}

const permissionLabels = {
    view: 'Can View',
    comment: 'Can Comment',
    edit: 'Can Edit',
}

export function FileHeader({
    filename,
    fileId,
    permission,
    savingStatus = 'idle',
    content,
}: FileHeaderProps) {
    const { toggleChat } = useChatToggle({ pageTitle: filename })
    const [isShareModalOpen, setIsShareModalOpen] = useState(false)

    const handleDownload = async () => {
        try {
            // Get the actual content of the file
            await downloadFile(content, `${filename}.pdf`)
        } catch (error) {
            console.error('Error downloading file:', error)
            // You might want to show a toast notification here
        }
    }
        


    return (
        <>
            <div className="flex items-center justify-between p-4 border-b bg-background">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-semibold">{filename}</h1>
                    {savingStatus === 'saving' && (
                        <span className="text-xs text-muted-foreground flex items-center">
                            <div className="animate-spin h-3 w-3 border-2 border-primary rounded-full border-t-transparent mr-1"></div>
                            Saving...
                        </span>
                    )}
                    {savingStatus === 'saved' && (
                        <span className="text-xs text-green-500 flex items-center">
                            <svg
                                className="h-3 w-3 mr-1"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5 13l4 4L19 7"
                                ></path>
                            </svg>
                            Saved
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => setIsShareModalOpen(true)}
                    >
                        <Share2 size={16} />
                        Share
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2">
                        <Users size={16} />
                        Members
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={toggleChat}
                    >
                        <MessageSquare size={16} />
                        Chat
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2"
                        onClick={handleDownload}
                    >
                        <Download size={16} />
                    Download
                    </Button>
                </div>
            </div>

            <ShareModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                filename={filename}
                fileId={fileId}
            />
        </>
    )
}
