'use client'

import * as React from 'react'
import { EditorContent, EditorContext, useEditor } from '@tiptap/react'
import * as Y from 'yjs'
import { WebrtcProvider } from 'y-webrtc'

// --- Tiptap Core Extensions ---
import { StarterKit } from '@tiptap/starter-kit'
import { TaskList } from '@tiptap/extension-task-list'
import { TextAlign } from '@tiptap/extension-text-align'
import { Typography } from '@tiptap/extension-typography'
import { Highlight } from '@tiptap/extension-highlight'
import { Subscript } from '@tiptap/extension-subscript'
import { Superscript } from '@tiptap/extension-superscript'
import { Underline } from '@tiptap/extension-underline'
import { Collaboration } from '@tiptap/extension-collaboration'

// --- Custom Extensions ---
import { Link } from '@/components/tiptap-extension/link-extension'
import { Selection } from '@/components/tiptap-extension/selection-extension'
import { TrailingNode } from '@/components/tiptap-extension/trailing-node-extension'
import { AssignableTaskItem } from '~/components/tiptap-extension/assignable-task-item-extension'
import { ResizableImage } from '~/components/tiptap-extension/resizable-image-extension'

import UniqueId from 'tiptap-unique-id'

// --- UI Primitives ---
import { Button } from '@/components/tiptap-ui-primitive/button'
import { Spacer } from '@/components/tiptap-ui-primitive/spacer'
import {
    Toolbar,
    ToolbarGroup,
    ToolbarSeparator,
} from '@/components/tiptap-ui-primitive/toolbar'

// --- Tiptap Node ---
import { ImageUploadNode } from '@/components/tiptap-node/image-upload-node/image-upload-node-extension'
import '@/components/tiptap-node/code-block-node/code-block-node.scss'
import '@/components/tiptap-node/list-node/list-node.scss'
import '@/components/tiptap-node/image-node/image-node.scss'
import '@/components/tiptap-node/paragraph-node/paragraph-node.scss'
import '~/components/tiptap-node/task-item-node/assignable-task-item.scss'

// --- Tiptap UI ---
import { HeadingDropdownMenu } from '@/components/tiptap-ui/heading-dropdown-menu'
import { ImageUploadButton } from '@/components/tiptap-ui/image-upload-button'
import { ListDropdownMenu } from '@/components/tiptap-ui/list-dropdown-menu'
import { BlockQuoteButton } from '@/components/tiptap-ui/blockquote-button'
import { CodeBlockButton } from '@/components/tiptap-ui/code-block-button'
import {
    ColorHighlightPopover,
    ColorHighlightPopoverContent,
    ColorHighlightPopoverButton,
} from '@/components/tiptap-ui/color-highlight-popover'
import {
    LinkPopover,
    LinkContent,
    LinkButton,
} from '@/components/tiptap-ui/link-popover'
import { MarkButton } from '@/components/tiptap-ui/mark-button'
import { TextAlignButton } from '@/components/tiptap-ui/text-align-button'
import { UndoRedoButton } from '@/components/tiptap-ui/undo-redo-button'

// --- Icons ---
import { ArrowLeftIcon } from '@/components/tiptap-icons/arrow-left-icon'
import { HighlighterIcon } from '@/components/tiptap-icons/highlighter-icon'
import { LinkIcon } from '@/components/tiptap-icons/link-icon'

// --- Hooks ---
import { useMobile } from '~/hooks/use-mobile'
import { useWindowSize } from '~/hooks/use-window-size'
import { useCursorVisibility } from '~/hooks/use-cursor-visibility'

// --- Components ---
import { ThemeToggle } from '~/components/tiptap-templates/simple/theme-toggle'

// --- Lib ---
import { handleImageUpload, MAX_FILE_SIZE } from '~/lib/tiptap-utils'

// --- Styles ---
import '~/components/tiptap-templates/simple/simple-editor.scss'
import './collaborative-editor.scss'

import content from '~/components/tiptap-templates/simple/data/content.json'
import { ListButton } from '@/components/tiptap-ui/list-button'

// --- UI Components ---
import { Badge } from '~/components/ui/badge'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '~/components/ui/card'

const MainToolbarContent = ({
    onHighlighterClick,
    onLinkClick,
    isMobile,
}: {
    onHighlighterClick: () => void
    onLinkClick: () => void
    isMobile: boolean
}) => {
    const { editor } = React.useContext(EditorContext)
    return (
        <>
            <Spacer />

            <ToolbarGroup>
                <UndoRedoButton action="undo" />
                <UndoRedoButton action="redo" />
            </ToolbarGroup>

            <ToolbarSeparator />

            <ToolbarGroup>
                <HeadingDropdownMenu levels={[1, 2, 3, 4]} />
                <ListDropdownMenu types={['bulletList', 'orderedList']} />
                <ListButton type="taskList" />
            </ToolbarGroup>

            <ToolbarSeparator />

            <ToolbarGroup>
                <MarkButton type="bold" />
                <MarkButton type="italic" />
                <MarkButton type="strike" />
                <MarkButton type="underline" />
                {!isMobile ? (
                    <ColorHighlightPopover />
                ) : (
                    <ColorHighlightPopoverButton onClick={onHighlighterClick} />
                )}
                {!isMobile ? (
                    <LinkPopover />
                ) : (
                    <LinkButton onClick={onLinkClick} />
                )}
            </ToolbarGroup>

            <ToolbarSeparator />

            <ToolbarGroup>
                <MarkButton type="superscript" />
                <MarkButton type="subscript" />
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
                <ImageUploadButton text="Add" />
            </ToolbarGroup>

            <Spacer />

            {isMobile && <ToolbarSeparator />}
        </>
    )
}

const MobileToolbarContent = ({
    type,
    onBack,
}: {
    type: 'highlighter' | 'link'
    onBack: () => void
}) => (
    <>
        <ToolbarGroup>
            <Button data-style="ghost" onClick={onBack}>
                <ArrowLeftIcon className="tiptap-button-icon" />
                {type === 'highlighter' ? (
                    <HighlighterIcon className="tiptap-button-icon" />
                ) : (
                    <LinkIcon className="tiptap-button-icon" />
                )}
            </Button>
        </ToolbarGroup>

        <ToolbarSeparator />

        {type === 'highlighter' ? (
            <ColorHighlightPopoverContent />
        ) : (
            <LinkContent />
        )}
    </>
)

interface CollaborativeEditorProps {
    documentId: string
    initialContent?: string
    readOnly?: boolean
    onUpdate?: (content: string) => void
}

interface UserInfo {
    name: string
    color: string
    id: string
}

export function CollaborativeEditor({
    documentId,
    initialContent,
    readOnly = false,
    onUpdate,
}: CollaborativeEditorProps) {
    const isMobile = useMobile()
    const windowSize = useWindowSize()
    const [mobileView, setMobileView] = React.useState<
        'main' | 'highlighter' | 'link'
    >('main')
    const toolbarRef = React.useRef<HTMLDivElement>(null)

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

        const webrtcProvider = new WebrtcProvider(documentId, ydoc, {
            signaling: [
                'wss://signaling.yjs.dev',
                'wss://y-webrtc-ckynwnzncc-uc.a.run.app',
                'wss://y-webrtc-signaling-us.herokuapp.com',
                'wss://y-webrtc-signaling-eu.herokuapp.com',
            ],
            // Additional WebRTC configuration for better connectivity
            maxConns: 20,
            filterBcConns: true,
        })

        setProvider(webrtcProvider)

        // Connection status handlers
        webrtcProvider.on('status', ({ status }: { status: string }) => {
            console.log('WebRTC Status:', status)
            setConnectionStatus(
                status === 'connected' ? 'connected' : 'disconnected'
            )
        })

        // Debug signaling server connections
        webrtcProvider.on('peers', (event: any) => {
            console.log('WebRTC Peers:', event)
        })

        webrtcProvider.on('synced', (event: any) => {
            console.log('WebRTC Synced:', event)
        })

        // User awareness (connected users)
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
                        color: state.user.color || '#000000',
                    })
                }
            })
            setConnectedUsers(users)
        })

        // Set current user info
        webrtcProvider.awareness.setLocalStateField('user', {
            name: `User ${webrtcProvider.awareness.clientID}`,
            color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
        })

        // Cleanup
        return () => {
            webrtcProvider.destroy()
        }
    }, [documentId, ydoc])

    const editor = useEditor({
        immediatelyRender: false,
        editable: !readOnly,
        editorProps: {
            attributes: {
                autocomplete: 'off',
                autocorrect: 'off',
                autocapitalize: 'off',
                'aria-label':
                    'Collaborative editing area, start typing to enter text.',
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
        content: initialContent || content,
    })

    const bodyRect = useCursorVisibility({
        editor,
        overlayHeight: toolbarRef.current?.getBoundingClientRect().height ?? 0,
    })

    // Add effect to handle content updates
    React.useEffect(() => {
        if (!editor || !onUpdate) return

        const handleUpdate = () => {
            const htmlContent = editor.getHTML()
            onUpdate(htmlContent)
        }

        editor.on('update', handleUpdate)

        return () => {
            editor.off('update', handleUpdate)
        }
    }, [editor, onUpdate])

    // Handle initialContent changes from parent
    React.useEffect(() => {
        if (editor && initialContent && editor.getHTML() !== initialContent) {
            editor.commands.setContent(initialContent)
        }
    }, [editor, initialContent])

    React.useEffect(() => {
        if (!isMobile && mobileView !== 'main') {
            setMobileView('main')
        }
    }, [isMobile, mobileView])

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
        <EditorContext.Provider value={{ editor }}>
            <div className="collaborative-editor-container">
                {/* Collaboration Status Bar */}
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
                                    Document: {documentId}
                                </Badge>
                            </div>
                            {connectedUsers.length > 0 && (
                                <div className="flex items-center space-x-2">
                                    <span className="text-sm text-muted-foreground">
                                        {connectedUsers.length} user
                                        {connectedUsers.length > 1 ? 's' : ''}{' '}
                                        online
                                    </span>
                                    <div className="flex -space-x-2">
                                        {connectedUsers
                                            .slice(0, 3)
                                            .map((user) => (
                                                <div
                                                    key={user.id}
                                                    className="w-6 h-6 rounded-full border-2 border-background flex items-center justify-center text-xs font-semibold text-white"
                                                    style={{
                                                        backgroundColor:
                                                            user.color,
                                                    }}
                                                    title={user.name}
                                                >
                                                    {user.name
                                                        .charAt(0)
                                                        .toUpperCase()}
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

                <Toolbar
                    ref={toolbarRef}
                    style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 10,
                        ...(isMobile
                            ? {
                                  bottom: `calc(100% - ${windowSize.height - bodyRect.y}px)`,
                              }
                            : {}),
                    }}
                >
                    {mobileView === 'main' ? (
                        <MainToolbarContent
                            onHighlighterClick={() =>
                                setMobileView('highlighter')
                            }
                            onLinkClick={() => setMobileView('link')}
                            isMobile={isMobile}
                        />
                    ) : (
                        <MobileToolbarContent
                            type={
                                mobileView === 'highlighter'
                                    ? 'highlighter'
                                    : 'link'
                            }
                            onBack={() => setMobileView('main')}
                        />
                    )}
                </Toolbar>

                <div className="content-wrapper">
                    <EditorContent
                        editor={editor}
                        role="presentation"
                        className="collaborative-editor-content"
                    />
                </div>
            </div>
        </EditorContext.Provider>
    )
}
