'use client'

import { useState, useRef, useEffect } from 'react'
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
import { SidebarTrigger, useSidebar } from './ui/sidebar'
import { useMobile } from '~/hooks/use-mobile'
import { downloadFile } from '~/utils/pdfExport.client'
import { api } from '~/trpc/react'
import { toast } from '~/hooks/use-toast'


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
    const { toggleChat } = useChatToggle({ pageTitle: filename, fileId })
    const [isShareModalOpen, setIsShareModalOpen] = useState(false)
    const [isRenaming, setIsRenaming] = useState(false)
    const [renamingValue, setRenamingValue] = useState(filename)
    const [displayTitle, setDisplayTitle] = useState(filename)
    const editableRef = useRef<HTMLDivElement>(null)

    // Update display title when filename prop changes
    useEffect(() => {
        setDisplayTitle(filename)
        setRenamingValue(filename)
    }, [filename])

    const updateFileMutation = api.files.update.useMutation({
        onSuccess: () => {
            setDisplayTitle(renamingValue)
            toast({
                title: 'File renamed',
                description: `File successfully renamed to "${renamingValue}"`,
            })
        },
        onError: (error) => {
            toast({
                title: 'Error renaming file',
                description:
                    error.message || 'Failed to rename file. Please try again.',
                variant: 'destructive',
            })
            // Reset the value on error
            setRenamingValue(filename)
            setDisplayTitle(filename)
        },
    })

    const handleSaveRename = async () => {
        if (renamingValue.trim() === filename || renamingValue.trim() === '') {
            setIsRenaming(false)
            setRenamingValue(filename)
            return
        }

        // Update display immediately for smooth UX
        setDisplayTitle(renamingValue.trim())

        try {
            await updateFileMutation.mutateAsync({
                id: fileId,
                name: renamingValue.trim(),
            })
        } catch (error) {
            // Error is handled in onError callback
        } finally {
            setIsRenaming(false)
        }
    }

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
                    <div>
                        <SidebarTrigger />
                    </div>
                    {isRenaming ? (
                        <div
                            ref={editableRef}
                            contentEditable={!updateFileMutation.isPending}
                            suppressContentEditableWarning={true}
                            onInput={(e) => {
                                const target = e.target as HTMLDivElement
                                setRenamingValue(target.textContent || '')
                            }}
                            onBlur={() => {
                                handleSaveRename()
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault()
                                    handleSaveRename()
                                } else if (e.key === 'Escape') {
                                    e.preventDefault()
                                    setIsRenaming(false)
                                    setRenamingValue(filename)
                                    if (editableRef.current) {
                                        editableRef.current.textContent =
                                            filename
                                    }
                                }
                            }}
                            className="text-xl font-semibold bg-transparent outline-none focus:ring-2 focus:ring-primary rounded px-1 inline-block whitespace-nowrap overflow-hidden"
                            style={{
                                opacity: updateFileMutation.isPending ? 0.5 : 1,
                            }}
                        />
                    ) : (
                        <h1
                            className="text-xl font-semibold cursor-pointer hover:bg-muted rounded px-1 py-1"
                            onClick={() => {
                                if (permission === 'edit') {
                                    setIsRenaming(true)
                                    setRenamingValue(displayTitle)
                                    // Focus and set content after state update
                                    setTimeout(() => {
                                        if (editableRef.current) {
                                            editableRef.current.textContent =
                                                displayTitle
                                            editableRef.current.focus()
                                            // Select all text
                                            const range = document.createRange()
                                            range.selectNodeContents(
                                                editableRef.current
                                            )
                                            const selection =
                                                window.getSelection()
                                            selection?.removeAllRanges()
                                            selection?.addRange(range)
                                        }
                                    }, 0)
                                }
                            }}
                        >
                            {displayTitle}
                        </h1>
                    )}
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
                    {updateFileMutation.isPending && (
                        <span className="text-xs text-muted-foreground flex items-center">
                            <div className="animate-spin h-3 w-3 border-2 border-primary rounded-full border-t-transparent mr-1"></div>
                            Renaming...
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
