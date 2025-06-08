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
import '~/components/tiptap-node/task-item-node/assignable-task-item.scss'

// Custom Extensions
import { Link } from '@/components/tiptap-extension/link-extension'
import { Selection } from '@/components/tiptap-extension/selection-extension'
import { TrailingNode } from '@/components/tiptap-extension/trailing-node-extension'
import { AssignableTaskItem } from '~/components/tiptap-extension/assignable-task-item-extension'
import { ResizableImage } from '~/components/tiptap-extension/resizable-image-extension'

// UI Components
import { Badge } from '~/components/ui/badge'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '~/components/ui/card'

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

interface PageCollaborativeEditorProps {
    documentId: string
    initialContent?: string
    onContentChange?: (content: string) => void
    readOnly?: boolean
    onCollaborationReady?: () => void
}

interface UserInfo {
    id: string
    name: string
    color: string
}

export function PageCollaborativeEditor({
    documentId,
    initialContent,
    onContentChange,
    readOnly = false,
    onCollaborationReady,
}: PageCollaborativeEditorProps) {
    const isMobile = useMobile()

    // Y.js document and provider state
    const [ydoc] = React.useState(() => new Y.Doc())
    // const [provider, setProvider] = React.useState<WebrtcProvider | null>(null)
    // const [connectionStatus, setConnectionStatus] = React.useState<
    //     'connecting' | 'connected' | 'disconnected'
    // >('connecting')
    // const [connectedUsers, setConnectedUsers] = React.useState<UserInfo[]>([])

    // Initialize Y.js and WebRTC provider
    React.useEffect(() => {
        if (!documentId) return

        console.log('Initializing WebRTC provider for document:', documentId)

        // Create WebRTC provider with signaling servers
        const webrtcProvider = new WebrtcProvider(documentId, ydoc, {
            signaling: [
                'wss://signaling.yjs.dev',
                'wss://y-webrtc-ckynwnzncc-uc.a.run.app',
                'wss://y-webrtc-signaling-us.herokuapp.com',
                'wss://y-webrtc-signaling-eu.herokuapp.com',
            ],
            maxConns: 20,
            filterBcConns: true,
        })

        // setProvider(webrtcProvider)
        // setConnectionStatus('connecting')

        // Connection status handlers
        webrtcProvider.on('status', ({ connected }: { connected: boolean }) => {
            console.log('WebRTC Status:', connected)
            // setConnectionStatus(connected ? 'connected' : 'disconnected')

            // Notify parent when collaboration is ready
            if (connected && onCollaborationReady) {
                // Small delay to ensure Y.js document is fully synced
                setTimeout(() => {
                    onCollaborationReady()
                }, 100)
            }
        })

        // Also handle when the provider is synced
        webrtcProvider.on('synced', () => {
            console.log('WebRTC Provider synced')
            if (onCollaborationReady) {
                onCollaborationReady()
            }
        })

        // Track connected users
        // webrtcProvider.awareness.on('change', () => {
        //     const users: UserInfo[] = []
        //     webrtcProvider.awareness.getStates().forEach((state, clientId) => {
        //         if (
        //             clientId !== webrtcProvider.awareness.clientID &&
        //             state.user
        //         ) {
        //             users.push({
        //                 id: clientId.toString(),
        //                 name: state.user.name || `User ${clientId}`,
        //                 color: state.user.color || '#666666',
        //             })
        //         }
        //     })
        // setConnectedUsers(users)
        // })

        // // Set current user info
        // const userColors = [
        //     '#FF6B6B',
        //     '#4ECDC4',
        //     '#45B7D1',
        //     '#96CEB4',
        //     '#FECA57',
        //     '#FF9FF3',
        //     '#54A0FF',
        // ]
        // const randomColor =
        //     userColors[Math.floor(Math.random() * userColors.length)]

        // webrtcProvider.awareness.setLocalStateField('user', {
        //     name: `User ${webrtcProvider.awareness.clientID}`,
        //     color: randomColor,
        // })

        // Cleanup on unmount
        return () => {
            console.log('Destroying WebRTC provider')
            webrtcProvider.destroy()
            // setProvider(null)
            // setConnectionStatus('disconnected')
            // setConnectedUsers([])
        }
    }, [documentId, ydoc, onCollaborationReady])

    // Initialize Tiptap editor with collaboration
    const editor = useEditor({
        immediatelyRender: false,
        editable: !readOnly,
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
        // Don't set initial content here for collaborative mode
        onUpdate: ({ editor }) => {
            if (onContentChange) {
                onContentChange(editor.getHTML())
            }
        },
    })

    // Load initial content after editor and collaboration are ready
    React.useEffect(() => {
        if (!editor || !initialContent) return

        // Check if Y.js document is empty (new document)
        const yDocIsEmpty = ydoc.getXmlFragment('default').length === 0

        if (yDocIsEmpty && initialContent && initialContent.trim() !== '') {
            console.log(
                'Loading initial content into empty Y.js document:',
                initialContent
            )
            // Set the content in the editor, which will sync to Y.js
            editor.commands.setContent(initialContent, false)
        }
    }, [editor, initialContent, ydoc])

    // const getStatusColor = () => {
    //     switch (connectionStatus) {
    //         case 'connected':
    //             return 'bg-green-500'
    //         case 'connecting':
    //             return 'bg-yellow-500'
    //         case 'disconnected':
    //             return 'bg-red-500'
    //     }
    // }

    // const getStatusText = () => {
    //     switch (connectionStatus) {
    //         case 'connected':
    //             return 'Connected'
    //         case 'connecting':
    //             return 'Connecting...'
    //         case 'disconnected':
    //             return 'Disconnected'
    //     }
    // }

    return (
        <div className="w-full h-full flex flex-col">
            {/* Connection Status Bar */}
            {/* <div className="flex items-center justify-between p-3 border-b bg-muted/30">
                <div className="flex items-center space-x-2">
                    <div
                        className={`w-2 h-2 rounded-full ${getStatusColor()}`}
                    ></div>
                    <span className="text-sm font-medium">
                        {getStatusText()}
                    </span>
                    {connectionStatus === 'disconnected' && (
                        <span className="text-xs text-red-600">
                            Changes may not sync
                        </span>
                    )}
                </div>
                {connectedUsers.length > 0 && (
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">
                            {connectedUsers.length} user
                            {connectedUsers.length !== 1 ? 's' : ''} online
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
            </div> */}

            {/* Editor */}
            <EditorContext.Provider value={{ editor }}>
                <div className="flex-1 flex flex-col min-h-0">
                    {/* Toolbar */}
                    {!readOnly && (
                        <Toolbar className="border-b bg-muted/50 flex-shrink-0">
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
                    )}

                    {/* Editor Content */}
                    <div className="flex-1 overflow-auto p-6">
                        <EditorContent
                            editor={editor}
                            className="min-h-full focus-within:outline-none"
                        />
                    </div>
                </div>
            </EditorContext.Provider>
        </div>
    )
}
