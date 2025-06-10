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
import './collaborative-editor.scss'

// Import Tiptap Node Styles for proper markdown rendering
import '@/components/tiptap-node/code-block-node/code-block-node.scss'
import '@/components/tiptap-node/list-node/list-node.scss'
import '@/components/tiptap-node/image-node/image-node.scss'
import '@/components/tiptap-node/paragraph-node/paragraph-node.scss'
import '~/components/tiptap-node/task-item-node/assignable-task-item.scss'

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
    const [webrtcProvider, setWebrtcProvider] =
        React.useState<WebrtcProvider | null>(null)
    const [isProviderSynced, setIsProviderSynced] = React.useState(false)
    const [hasLoadedInitialContent, setHasLoadedInitialContent] =
        React.useState(false)

    // Store initial content in a ref to prevent it from causing re-renders
    const initialContentRef = React.useRef<string | undefined>(initialContent)
    const hasSetInitialContent = React.useRef(false)

    // Update initial content ref only when it's different and we haven't set it yet
    React.useEffect(() => {
        if (initialContent && !hasSetInitialContent.current) {
            initialContentRef.current = initialContent
        }
    }, [initialContent])

    // const [connectionStatus, setConnectionStatus] = React.useState<
    //     'connecting' | 'connected' | 'disconnected'
    // >('connecting')
    // const [connectedUsers, setConnectedUsers] = React.useState<UserInfo[]>([])

    // Store the callback in a ref to prevent recreating the provider
    const onCollaborationReadyRef = React.useRef(onCollaborationReady)
    React.useEffect(() => {
        onCollaborationReadyRef.current = onCollaborationReady
    }, [onCollaborationReady])

    // Store onContentChange in a ref to prevent recreating editor
    const onContentChangeRef = React.useRef(onContentChange)
    React.useEffect(() => {
        onContentChangeRef.current = onContentChange
    }, [onContentChange])

    // Initialize Y.js and WebRTC provider
    React.useEffect(() => {
        if (!documentId || webrtcProvider) return

        console.log('Initializing WebRTC provider for document:', documentId)

        // Create WebRTC provider with signaling servers
        const provider = new WebrtcProvider(documentId, ydoc, {
            signaling: [
                'wss://signaling.yjs.dev',
                'wss://y-webrtc-signaling-us.herokuapp.com',
                'wss://demos.yjs.dev',
            ],
            // Add STUN servers for NAT traversal across different networks
            peerOpts: {
                config: {
                    iceServers: [
                        // Google's reliable STUN servers
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' },
                        { urls: 'stun:stun2.l.google.com:19302' },

                        // Cloudflare STUN server as backup
                        { urls: 'stun:stun.cloudflare.com:3478' },
                    ],
                },
            },
            maxConns: 20,
            filterBcConns: true,
        })

        console.log(provider)

        setWebrtcProvider(provider)
        // setConnectionStatus('connecting')

        // Connection status handlers
        provider.on('status', ({ connected }: { connected: boolean }) => {
            console.log('WebRTC Status:', connected)
            // setConnectionStatus(connected ? 'connected' : 'disconnected')

            // Notify parent when collaboration is ready
            if (connected && onCollaborationReadyRef.current) {
                // Small delay to ensure Y.js document is fully synced
                setTimeout(() => {
                    onCollaborationReadyRef.current?.()
                }, 100)
            }
        })

        // Also handle when the provider is synced
        provider.on('synced', () => {
            console.log('WebRTC Provider synced')
            setIsProviderSynced(true)
            if (onCollaborationReadyRef.current) {
                onCollaborationReadyRef.current()
            }
        })

        // Listen for Y.js document updates to prevent duplicate loading
        const updateHandler = () => {
            // If the document gets updated by another client, mark as loaded
            if (ydoc.getXmlFragment('default').length > 0) {
                setHasLoadedInitialContent(true)
            }
        }

        ydoc.on('update', updateHandler)

        // Track connected users
        // provider.awareness.on('change', () => {
        //     const users: UserInfo[] = []
        //     provider.awareness.getStates().forEach((state, clientId) => {
        //         if (
        //             clientId !== provider.awareness.clientID &&
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

        // provider.awareness.setLocalStateField('user', {
        //     name: `User ${provider.awareness.clientID}`,
        //     color: randomColor,
        // })

        // Cleanup on unmount
        return () => {
            console.log('Destroying WebRTC provider')
            ydoc.off('update', updateHandler)
            provider.destroy()
            setWebrtcProvider(null)
            setIsProviderSynced(false)
            setHasLoadedInitialContent(false)
            hasSetInitialContent.current = false
            // setConnectionStatus('disconnected')
            // setConnectedUsers([])
        }
    }, [documentId, ydoc]) // Removed onCollaborationReady from dependencies

    // Initialize Tiptap editor with collaboration
    const editor = useEditor({
        immediatelyRender: false,
        editable: !readOnly,
        editorProps: {
            attributes: {
                class: 'tiptap ProseMirror focus:outline-none',
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
            if (onContentChangeRef.current) {
                onContentChangeRef.current(editor.getHTML())
            }
        },
    })

    // Load initial content after editor and collaboration are ready
    React.useEffect(() => {
        if (
            !editor ||
            !initialContentRef.current ||
            hasLoadedInitialContent ||
            !isProviderSynced ||
            hasSetInitialContent.current
        )
            return

        // Add a small delay to ensure all WebRTC connections are established
        const timer = setTimeout(() => {
            // Check if Y.js document is empty (new document)
            const yDocIsEmpty = ydoc.getXmlFragment('default').length === 0
            const editorIsEmpty =
                editor.getHTML() === '<p></p>' ||
                editor.getHTML().trim() === '' ||
                editor.getHTML() === '<p>undefined</p>'

            // Only load initial content if both Y.js document and editor are empty
            // This prevents duplicate content when multiple browsers connect
            if (
                yDocIsEmpty &&
                editorIsEmpty &&
                initialContentRef.current &&
                initialContentRef.current.trim() !== '' &&
                initialContentRef.current !== 'undefined'
            ) {
                console.log(
                    'Loading initial content into empty Y.js document:',
                    initialContentRef.current.substring(0, 100)
                )
                // Set the content in the editor, which will sync to Y.js
                editor.commands.setContent(initialContentRef.current, false)
                setHasLoadedInitialContent(true)
                hasSetInitialContent.current = true
            } else {
                console.log(
                    'Skipping initial content load - document already has content or content is invalid'
                )
                console.log(
                    'Y.js empty:',
                    yDocIsEmpty,
                    'Editor empty:',
                    editorIsEmpty,
                    'Initial content:',
                    initialContentRef.current?.substring(0, 100)
                )
                setHasLoadedInitialContent(true) // Mark as loaded to prevent future attempts
                hasSetInitialContent.current = true
            }
        }, 300) // 300ms delay to allow WebRTC sync

        return () => clearTimeout(timer)
    }, [editor, ydoc, hasLoadedInitialContent, isProviderSynced])

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
        <div className="collaborative-editor-container w-full h-full flex flex-col">
            {/* Editor */}
            <EditorContext.Provider value={{ editor }}>
                {/* Toolbar */}
                {!readOnly && (
                    <Toolbar className="collaborative-editor-toolbar border-b bg-muted/50 flex-shrink-0">
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
                <div className="collaborative-editor-scroll-container">
                    <div className="collaborative-editor-content">
                        <EditorContent
                            editor={editor}
                            className="focus-within:outline-none"
                            role="presentation"
                        />
                    </div>
                </div>
            </EditorContext.Provider>
        </div>
    )
}
