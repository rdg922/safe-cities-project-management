'use client'

import { useState } from 'react'
import { CollaborativeEditor } from '~/components/tiptap-templates/collaborative/collaborative-editor'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'

export default function CollaborationTestPage() {
    const [documentId, setDocumentId] = useState('example-document')
    const [content, setContent] = useState('')
    const [currentDocId, setCurrentDocId] = useState('example-document')

    const handleJoinDocument = () => {
        setCurrentDocId(documentId)
    }

    const generateRandomDocId = () => {
        const randomId = Math.random().toString(36).substring(2, 15)
        setDocumentId(randomId)
    }

    return (
        <div className="container mx-auto p-8 max-w-6xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-4">
                    Collaborative Editor Demo
                </h1>
                <p className="text-muted-foreground mb-6">
                    Experience real-time collaborative editing with WebRTC.
                    Share the document ID with others to collaborate in
                    real-time.
                </p>

                {/* Document ID Controls */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="text-lg">
                            Document Settings
                        </CardTitle>
                        <CardDescription>
                            Enter a document ID to join or create a
                            collaborative session
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1">
                                <Input
                                    placeholder="Enter document ID"
                                    value={documentId}
                                    onChange={(e) =>
                                        setDocumentId(e.target.value)
                                    }
                                    className="w-full"
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    onClick={handleJoinDocument}
                                    variant="default"
                                >
                                    Join Document
                                </Button>
                                <Button
                                    onClick={generateRandomDocId}
                                    variant="outline"
                                >
                                    Generate Random ID
                                </Button>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                                Current document:
                            </span>
                            <Badge variant="secondary">{currentDocId}</Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Instructions */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="text-lg">
                            How to Test Collaboration
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-start gap-2">
                            <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-semibold">
                                1
                            </span>
                            <p className="text-sm">
                                Copy the current document ID above
                            </p>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-semibold">
                                2
                            </span>
                            <p className="text-sm">
                                Open this page in another browser tab/window or
                                share the URL with a colleague
                            </p>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-semibold">
                                3
                            </span>
                            <p className="text-sm">
                                Enter the same document ID in both windows and
                                click &quot;Join Document&quot;
                            </p>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-semibold">
                                4
                            </span>
                            <p className="text-sm">
                                Start typing in either window - changes will
                                sync in real-time!
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Collaborative Editor */}
            <div className="border rounded-lg overflow-hidden min-h-[600px]">
                <CollaborativeEditor
                    documentId={currentDocId}
                    initialContent="<h1>Welcome to Collaborative Editing!</h1><p>Start typing here. Open this document in multiple browser windows with the same document ID to see real-time collaboration in action.</p><p>Try:</p><ul><li>Typing simultaneously from different windows</li><li>Using the formatting toolbar</li><li>Adding images and links</li><li>Creating lists and headings</li></ul><p>Your changes will sync instantly across all connected clients!</p>"
                    onUpdate={setContent}
                />
            </div>

            {/* Debug Info */}
            {content && (
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle className="text-lg">
                            Document Content (Debug)
                        </CardTitle>
                        <CardDescription>
                            Current HTML content of the document
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <pre className="text-sm bg-muted p-4 rounded-md overflow-auto max-h-40">
                            {content.slice(0, 500)}
                            {content.length > 500 && '...'}
                        </pre>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
