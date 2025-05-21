"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "~/app/_components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/app/_components/ui/tabs"
import { Textarea } from "~/app/_components/ui/textarea"
import {
  Bold,
  CheckSquare,
  Code,
  Heading1,
  Heading2,
  Heading3,
  ImageIcon,
  Italic,
  Link,
  List,
  ListOrdered,
  Table,
  Upload,
} from "lucide-react"
import { Separator } from "~/app/_components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/app/_components/ui/tooltip"
import { toast } from "~/hooks/use-toast"

interface PageEditorProps {
  initialContent: string
  readOnly?: boolean
}

export function PageEditor({ initialContent, readOnly = false }: PageEditorProps) {
  const [content, setContent] = useState(initialContent)
  const [editorView, setEditorView] = useState<"edit" | "preview">("edit")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
  }

  const insertMarkdown = (markdownSyntax: string) => {
    if (readOnly) return
    setContent((prev) => prev + markdownSyntax)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    const isImage = file.type.startsWith("image/")

    // In a real app, you would upload the file to a server and get a URL
    // For this demo, we'll use a placeholder
    const fileUrl = `/placeholder.svg?height=200&width=400&text=${encodeURIComponent(file.name)}`

    if (isImage) {
      insertMarkdown(`\n![${file.name}](${fileUrl})\n`)
      toast({
        title: "Image uploaded",
        description: `${file.name} has been added to the page.`,
      })
    } else {
      insertMarkdown(`\n[${file.name}](${fileUrl})\n`)
      toast({
        title: "File attached",
        description: `${file.name} has been attached to the page.`,
      })
    }

    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const renderMarkdown = (markdown: string) => {
    // This is a very simple markdown renderer for demonstration
    // In a real app, you would use a proper markdown library
    const html = markdown
      .replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold mt-6 mb-4">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 class="text-2xl font-bold mt-5 mb-3">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="text-xl font-bold mt-4 mb-2">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\[(.*?)\]$$(.*?)$$/g, '<a href="$2" class="text-blue-500 hover:underline">$1</a>')
      .replace(/^- (.*$)/gm, '<li class="ml-6 list-disc">$1</li>')
      .replace(/^[0-9]+\. (.*$)/gm, '<li class="ml-6 list-decimal">$1</li>')
      .replace(
        /^- \[ \] (.*$)/gm,
        '<div class="flex items-start gap-2 ml-6 my-1"><input type="checkbox" class="mt-1" /><span>$1</span></div>',
      )
      .replace(
        /^- \[x\] (.*$)/gm,
        '<div class="flex items-start gap-2 ml-6 my-1"><input type="checkbox" checked class="mt-1" /><span>$1</span></div>',
      )
      .replace(/```(.*?)```/gs, '<pre class="bg-muted p-4 rounded-md my-4 overflow-x-auto"><code>$1</code></pre>')
      .replace(/\n\n/g, "<br /><br />")

    // Handle tables
    const tableRegex = /\|(.+)\|\n\|(?:[-:]+\|)+\n((?:\|.+\|\n)+)/g
    const tableHtml = html.replace(tableRegex, (match) => {
      const lines = match.split("\n").filter((line) => line.trim() !== "")
      const headers = lines[0]
        .split("|")
        .filter((cell) => cell.trim() !== "")
        .map((cell) => cell.trim())
      const rows = lines.slice(2).map((line) =>
        line
          .split("|")
          .filter((cell) => cell.trim() !== "")
          .map((cell) => cell.trim()),
      )

      let tableHtml = '<div class="overflow-x-auto my-4"><table class="w-full border-collapse">'

      // Headers
      tableHtml += "<thead><tr>"
      headers.forEach((header) => {
        tableHtml += `<th class="border px-4 py-2 bg-muted">${header}</th>`
      })
      tableHtml += "</tr></thead>"

      // Rows
      tableHtml += "<tbody>"
      rows.forEach((row) => {
        tableHtml += "<tr>"
        row.forEach((cell) => {
          tableHtml += `<td class="border px-4 py-2">${cell}</td>`
        })
        tableHtml += "</tr>"
      })
      tableHtml += "</tbody></table></div>"

      return tableHtml
    })

    // Handle images
    const imageHtml = tableHtml.replace(
      /!\[(.*?)\]$$(.*?)$$/g,
      '<div class="my-4"><img src="$2" alt="$1" class="max-w-full rounded-md" /></div>',
    )

    return { __html: imageHtml }
  }

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (readOnly) return

    // Implement common keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case "b":
          e.preventDefault()
          insertMarkdown("**Bold text**")
          break
        case "i":
          e.preventDefault()
          insertMarkdown("*Italic text*")
          break
        case "h":
          e.preventDefault()
          insertMarkdown("\n# Heading 1\n")
          break
        case "k":
          e.preventDefault()
          insertMarkdown("[Link text](https://example.com)")
          break
      }
    }
  }

  return (
    <div className="border rounded-md">
      {!readOnly && (
        <div className="border-b p-2">
          <div className="flex flex-wrap items-center gap-1">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => insertMarkdown("# Heading 1\n")}
                  >
                    <Heading1 size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Heading 1</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => insertMarkdown("## Heading 2\n")}
                  >
                    <Heading2 size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Heading 2</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => insertMarkdown("### Heading 3\n")}
                  >
                    <Heading3 size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Heading 3</TooltipContent>
              </Tooltip>

              <Separator orientation="vertical" className="h-6" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => insertMarkdown("**Bold text**")}
                  >
                    <Bold size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Bold</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => insertMarkdown("*Italic text*")}
                  >
                    <Italic size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Italic</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => insertMarkdown("[Link text](https://example.com)")}
                  >
                    <Link size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Link</TooltipContent>
              </Tooltip>

              <Separator orientation="vertical" className="h-6" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => insertMarkdown("\n- List item\n- List item\n- List item\n")}
                  >
                    <List size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Bullet List</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => insertMarkdown("\n1. List item\n2. List item\n3. List item\n")}
                  >
                    <ListOrdered size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Numbered List</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => insertMarkdown("\n- [ ] Task item\n- [ ] Task item\n- [x] Completed task\n")}
                  >
                    <CheckSquare size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Task List</TooltipContent>
              </Tooltip>

              <Separator orientation="vertical" className="h-6" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => insertMarkdown("\n```\ncode block\n```\n")}
                  >
                    <Code size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Code Block</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() =>
                      insertMarkdown(
                        "\n| Header 1 | Header 2 | Header 3 |\n| --- | --- | --- |\n| Cell 1 | Cell 2 | Cell 3 |\n| Cell 4 | Cell 5 | Cell 6 |\n",
                      )
                    }
                  >
                    <Table size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Table</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <label htmlFor="file-upload">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 cursor-pointer"
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImageIcon size={16} />
                      <input
                        id="file-upload"
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                      />
                    </Button>
                  </label>
                </TooltipTrigger>
                <TooltipContent>Upload File</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-auto gap-1"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={14} />
                    Upload
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Upload File or Image</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      )}

      <Tabs value={editorView} onValueChange={(v) => setEditorView(v as "edit" | "preview")} className="w-full">
        <div className="flex items-center justify-between border-b px-4">
          <TabsList className="my-2">
            <TabsTrigger value="edit" disabled={readOnly}>
              Edit
            </TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          {!readOnly && <Button size="sm">Save</Button>}
        </div>

        <TabsContent value="edit" className="mt-0 p-0">
          <Textarea
            value={content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            className="min-h-[500px] rounded-none border-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
            placeholder="Start writing..."
            readOnly={readOnly}
          />
        </TabsContent>

        <TabsContent value="preview" className="mt-0 p-6">
          <div className="prose max-w-none" dangerouslySetInnerHTML={renderMarkdown(content)} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
