'use client'
import { useState } from 'react'
import { SimpleEditor } from '~/components/tiptap-templates/simple/simple-editor'

export default function EditorUploadTestPage() {
  const [content, setContent] = useState('')

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1>Image Upload Test</h1>
      <SimpleEditor
        initialContent={content}
        readOnly={false}
        onUpdate={setContent}
      />
      <p className="mt-4">Content: {content.slice(0, 200)}...</p>
    </div>
  )
}