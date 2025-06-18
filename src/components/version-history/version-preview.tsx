import React from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { SimpleEditor } from '~/components/tiptap-templates/simple/simple-editor'
import { SheetPreview } from './sheet-preview'
import type { VersionPreviewProps } from './types'

export function VersionPreview({
    content,
    fileType,
    isOpen,
    onClose,
}: VersionPreviewProps) {
    const renderPreview = () => {
        switch (fileType) {
            case 'page':
            case 'document':
                return (
                    <div className="h-full w-full border rounded-lg bg-background">
                        <SimpleEditor
                            initialContent={content || ''}
                            readOnly={true}
                        />
                    </div>
                )
            case 'sheet':
                return <SheetPreview content={content} />
            case 'form':
                // For forms, we might want to show a JSON preview or render the form
                return (
                    <div className="h-full w-full border rounded-lg bg-background p-4">
                        <pre className="text-sm overflow-auto h-full">
                            {JSON.stringify(
                                JSON.parse(content || '{}'),
                                null,
                                2
                            )}
                        </pre>
                    </div>
                )
            default:
                return (
                    <div className="h-full w-full border rounded-lg bg-background p-4">
                        <pre className="text-sm overflow-auto h-full whitespace-pre-wrap">
                            {content}
                        </pre>
                    </div>
                )
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl h-[85vh] min-h-[600px] sm:h-[90vh] sm:min-h-[700px] md:h-[95vh] md:min-h-[800px] w-[95vw] sm:w-full flex flex-col">
                <DialogHeader className="flex-shrink-0">
                    <DialogTitle>Version Preview</DialogTitle>
                    <DialogDescription>
                        Preview of the selected version content
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 min-h-0 overflow-hidden">
                    {renderPreview()}
                </div>
                <DialogFooter className="flex-shrink-0">
                    <Button variant="outline" onClick={onClose}>
                        Close Preview
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
