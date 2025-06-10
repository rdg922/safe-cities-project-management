'use client'

import React, { useState } from 'react'
import { useEditor, EditorContent, EditorContext } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'
import { Collaboration } from '@tiptap/extension-collaboration'
import { TextAlign } from '@tiptap/extension-text-align'
import { Highlight } from '@tiptap/extension-highlight'
import { Underline } from '@tiptap/extension-underline'
import { TaskList } from '@tiptap/extension-task-list'
import { Typography } from '@tiptap/extension-typography'
import { Subscript } from '@tiptap/extension-subscript'
import { Superscript } from '@tiptap/extension-superscript'
import * as Y from 'yjs'
import { WebrtcProvider } from 'y-webrtc'

// Custom Extensions
import { Link } from '@/components/tiptap-extension/link-extension'
import { Selection } from '@/components/tiptap-extension/selection-extension'
import { TrailingNode } from '@/components/tiptap-extension/trailing-node-extension'
import { AssignableTaskItem } from '~/components/tiptap-extension/assignable-task-item-extension'
import { ResizableImage } from '~/components/tiptap-extension/resizable-image-extension'

// UI Components
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
import { Separator } from '~/components/ui/separator'

// Tiptap UI Components
import {
    Toolbar,
    ToolbarGroup,
    ToolbarSeparator,
} from '@/components/tiptap-ui-primitive/toolbar'
import { Spacer } from '@/components/tiptap-ui-primitive/spacer'
import { HeadingDropdownMenu } from '@/components/tiptap-ui/heading-dropdown-menu'
import { ListDropdownMenu } from '@/components/tiptap-ui/list-dropdown-menu'
import { ListButton } from '@/components/tiptap-ui/list-button'
import { MarkButton } from '@/components/tiptap-ui/mark-button'
import { TextAlignButton } from '@/components/tiptap-ui/text-align-button'
import { UndoRedoButton } from '@/components/tiptap-ui/undo-redo-button'
import { ColorHighlightPopover } from '@/components/tiptap-ui/color-highlight-popover'
import { LinkPopover } from '@/components/tiptap-ui/link-popover'
import { ImageUploadNode } from '@/components/tiptap-node/image-upload-node/image-upload-node-extension'
import { ImageUploadButton } from '@/components/tiptap-ui/image-upload-button'

// Utilities
import { handleImageUpload, MAX_FILE_SIZE } from '~/lib/tiptap-utils'
import { useMobile } from '~/hooks/use-mobile'

// Unique ID extension
// @ts-ignore - tiptap-unique-id doesn't have proper types
import UniqueId from 'tiptap-unique-id'

// Styles
import '~/components/tiptap-templates/simple/simple-editor.scss'
import './styles.css'

interface CollaborativeEditorComponentProps {
    documentId: string
    initialContent?: string
    onContentChange?: (content: string) => void
}

interface UserInfo {
    id: string
    name: string
    color: string
}

function CollaborativeEditorComponent({
    documentId,
    initialContent,
    onContentChange,
}: CollaborativeEditorComponentProps) {
    const isMobile = useMobile()

    // Y.js document and provider state
    const [ydoc] = React.useState(() => new Y.Doc())
    const [provider, setProvider] = React.useState<WebrtcProvider | null>(null)
    const [connectionStatus, setConnectionStatus] = React.useState<
        'connecting' | 'connected' | 'disconnected'
    >('connecting')
    const [connectedUsers, setConnectedUsers] = React.useState<UserInfo[]>([])

    // Initialize Y.js and WebRTC provider
    React.useEffect(() => {
        if (!documentId) return

        console.log('Initializing WebRTC provider for document:', documentId)

        // Create WebRTC provider with signaling servers
        const webrtcProvider = new WebrtcProvider(documentId, ydoc, {
            signaling: [
                // 'ws://signaling.yjs.dev',
                // 'ws://y-webrtc-ckynwnzncc-uc.a.run.app',
                'ws://y-webrtc-signaling-eu.herokuapp.com',
            ],
            maxConns: 20,
            filterBcConns: true,
        })

        setProvider(webrtcProvider)
        setConnectionStatus('connecting')

        // Connection status handlers
        webrtcProvider.on('status', ({ connected }: { connected: boolean }) => {
            console.log('WebRTC Status:', connected)
            setConnectionStatus(connected ? 'connected' : 'disconnected')
        })

        // Track connected users
        webrtcProvider.awareness.on('change', () => {
            const users: UserInfo[] = []
            webrtcProvider.awareness.getStates().forEach((state, clientId) => {
                if (
                    clientId !== webrtcProvider.awareness.clientID &&
                    state.user
                ) {
                    users.push({
                        id: clientId.toString(),
                        name: state.user.name || `User ${clientId}`,
                        color: state.user.color || '#666666',
                    })
                }
            })
            setConnectedUsers(users)
        })

        // Set current user info
        const userColors = [
            '#FF6B6B',
            '#4ECDC4',
            '#45B7D1',
            '#96CEB4',
            '#FECA57',
            '#FF9FF3',
            '#54A0FF',
        ]
        const randomColor =
            userColors[Math.floor(Math.random() * userColors.length)]

        webrtcProvider.awareness.setLocalStateField('user', {
            name: `User ${webrtcProvider.awareness.clientID}`,
            color: randomColor,
        })

        // Cleanup on unmount
        return () => {
            console.log('Destroying WebRTC provider')
            webrtcProvider.destroy()
            setProvider(null)
            setConnectionStatus('disconnected')
            setConnectedUsers([])
        }
    }, [documentId, ydoc])

    // Initialize Tiptap editor with collaboration
    const editor = useEditor({
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: 'tiptap prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
                'aria-label':
                    'Collaborative editor - start typing to create content',
            },
        },
        extensions: [
            StarterKit.configure({
                // The Collaboration extension comes with its own history handling
                history: false,
            }),
            // Register the document with Tiptap
            Collaboration.configure({
                document: ydoc,
            }),
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Underline,
            TaskList,
            AssignableTaskItem,
            Highlight.configure({ multicolor: true }),
            ResizableImage,
            Typography,
            Superscript,
            Subscript,
            UniqueId.configure({
                attributeName: 'id',
                types: [
                    'paragraph',
                    'heading',
                    'orderedList',
                    'bulletList',
                    'listItem',
                ],
                createId: () => window.crypto.randomUUID(),
            }),
            Selection,
            ImageUploadNode.configure({
                accept: 'image/*',
                maxSize: MAX_FILE_SIZE,
                limit: 3,
                upload: handleImageUpload,
                onError: (error) => console.error('Upload failed:', error),
            }),
            TrailingNode,
            Link.configure({ openOnClick: false }),
        ],
        content:
            initialContent ||
            '<p>Start collaborating! Share this document ID with others to edit together in real-time.</p>',
        onUpdate: ({ editor }) => {
            if (onContentChange) {
                onContentChange(editor.getHTML())
            }
        },
    })

    const getStatusColor = () => {
        switch (connectionStatus) {
            case 'connected':
                return 'bg-green-500'
            case 'connecting':
                return 'bg-yellow-500'
            case 'disconnected':
                return 'bg-red-500'
        }
    }

    const getStatusText = () => {
        switch (connectionStatus) {
            case 'connected':
                return 'Connected'
            case 'connecting':
                return 'Connecting...'
            case 'disconnected':
                return 'Disconnected'
        }
    }

    return (
        <div className="w-full max-w-4xl mx-auto">
            {/* Connection Status */}
            <Card className="mb-4">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <div
                                className={`w-2 h-2 rounded-full ${getStatusColor()}`}
                            ></div>
                            <CardTitle className="text-sm font-medium">
                                {getStatusText()}
                            </CardTitle>
                            <Badge variant="outline" className="text-xs">
                                Doc: {documentId}
                            </Badge>
                        </div>
                        {connectedUsers.length > 0 && (
                            <div className="flex items-center space-x-2">
                                <span className="text-sm text-muted-foreground">
                                    {connectedUsers.length} user
                                    {connectedUsers.length !== 1
                                        ? 's'
                                        : ''}{' '}
                                    online
                                </span>
                                <div className="flex -space-x-2">
                                    {connectedUsers.slice(0, 3).map((user) => (
                                        <div
                                            key={user.id}
                                            className="w-6 h-6 rounded-full border-2 border-background flex items-center justify-center text-xs font-semibold text-white"
                                            style={{
                                                backgroundColor: user.color,
                                            }}
                                            title={user.name}
                                        >
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>
                                    ))}
                                    {connectedUsers.length > 3 && (
                                        <div className="w-6 h-6 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-semibold">
                                            +{connectedUsers.length - 3}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </CardHeader>
                {connectionStatus === 'disconnected' && (
                    <CardContent className="pt-0">
                        <CardDescription className="text-red-600">
                            Connection lost. Changes may not be synchronized
                            with other users.
                        </CardDescription>
                    </CardContent>
                )}
            </Card>

            {/* Editor */}
            <EditorContext.Provider value={{ editor }}>
                <div className="border rounded-lg overflow-hidden min-h-[600px] bg-background">
                    {/* Toolbar */}
                    <Toolbar className="border-b bg-muted/50">
                        <Spacer />

                        <ToolbarGroup>
                            <UndoRedoButton action="undo" />
                            <UndoRedoButton action="redo" />
                        </ToolbarGroup>

                        <ToolbarSeparator />

                        <ToolbarGroup>
                            <HeadingDropdownMenu levels={[1, 2, 3, 4]} />
                            <ListDropdownMenu
                                types={['bulletList', 'orderedList']}
                            />
                            <ListButton type="taskList" />
                        </ToolbarGroup>

                        <ToolbarSeparator />

                        <ToolbarGroup>
                            <MarkButton type="bold" />
                            <MarkButton type="italic" />
                            <MarkButton type="strike" />
                            <MarkButton type="underline" />
                            <ColorHighlightPopover />
                            <LinkPopover />
                        </ToolbarGroup>

                        <ToolbarSeparator />

                        <ToolbarGroup>
                            <TextAlignButton align="left" />
                            <TextAlignButton align="center" />
                            <TextAlignButton align="right" />
                            <TextAlignButton align="justify" />
                        </ToolbarGroup>

                        <ToolbarSeparator />

                        <ToolbarGroup>
                            <ImageUploadButton />
                        </ToolbarGroup>

                        <Spacer />
                    </Toolbar>

                    {/* Editor Content */}
                    <div className="p-6">
                        <EditorContent
                            editor={editor}
                            className="min-h-[500px] focus-within:outline-none"
                        />
                    </div>
                </div>
            </EditorContext.Provider>
        </div>
    )
}

export default function CollaborativeEditorPage() {
    const [documentId, setDocumentId] = useState('demo-document')
    const [currentDocId, setCurrentDocId] = useState('demo-document')
    const [content, setContent] = useState('')

    const handleJoinDocument = () => {
        setCurrentDocId(documentId)
    }

    const generateRandomDocId = () => {
        const randomId = `doc-${Math.random().toString(36).substring(2, 15)}`
        setDocumentId(randomId)
    }

    const copyDocumentId = async () => {
        try {
            await navigator.clipboard.writeText(currentDocId)
            // You could add a toast notification here
            console.log('Document ID copied to clipboard')
        } catch (err) {
            console.error('Failed to copy document ID:', err)
        }
    }

    return (
        <div className="container mx-auto p-8 max-w-6xl">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold mb-4">
                    WebRTC Collaborative Editor
                </h1>
                <p className="text-muted-foreground text-lg mb-6">
                    Real-time collaborative editing powered by WebRTC and Yjs.
                    Share the document ID with others to collaborate instantly.
                </p>
            </div>

            {/* Document Controls */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Document Settings</CardTitle>
                    <CardDescription>
                        Enter a document ID to join an existing session or
                        create a new one
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <Input
                                placeholder="Enter document ID (e.g., my-document)"
                                value={documentId}
                                onChange={(e) => setDocumentId(e.target.value)}
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

                    <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                                Current document:
                            </span>
                            <Badge variant="secondary" className="font-mono">
                                {currentDocId}
                            </Badge>
                        </div>
                        <Button
                            onClick={copyDocumentId}
                            variant="ghost"
                            size="sm"
                        >
                            Copy ID
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Instructions */}
            <Card className="mb-8">
                <CardHeader>
                    <CardTitle>How to Collaborate</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="flex items-start gap-3">
                            <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold">
                                1
                            </div>
                            <div>
                                <h4 className="font-semibold">
                                    Share Document ID
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    Copy the current document ID and share it
                                    with collaborators
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold">
                                2
                            </div>
                            <div>
                                <h4 className="font-semibold">
                                    Join Same Document
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    Have others enter the same document ID and
                                    click "Join Document"
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold">
                                3
                            </div>
                            <div>
                                <h4 className="font-semibold">Start Editing</h4>
                                <p className="text-sm text-muted-foreground">
                                    Begin typing and see changes sync in
                                    real-time across all connected users
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold">
                                4
                            </div>
                            <div>
                                <h4 className="font-semibold">
                                    Use Rich Features
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    Format text, add images, create lists, and
                                    more using the toolbar
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Collaborative Editor */}
            <CollaborativeEditorComponent
                documentId={currentDocId}
                onContentChange={setContent}
            />

            {/* Debug Info */}
            {content && (
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>Content Preview</CardTitle>
                        <CardDescription>
                            Current document content (for debugging)
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <pre className="text-sm bg-muted p-4 rounded-md overflow-auto max-h-40 whitespace-pre-wrap">
                            {content.slice(0, 1000)}
                            {content.length > 1000 && '\n... (truncated)'}
                        </pre>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
