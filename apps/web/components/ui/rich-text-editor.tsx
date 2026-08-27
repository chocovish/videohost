"use client"

import * as React from "react"
import {
  Bold,
  Italic,
  Strikethrough,
  Underline,
  List,
  RemoveFormatting,
  ChevronDown,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  Link as LinkIcon,
  Unlink,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export interface RichTextEditorProps {
  value?: string
  defaultValue?: string
  onChange?: (html: string) => void
  onTextChange?: (text: string) => void
  placeholder?: string
  disabled?: boolean
  readOnly?: boolean
  minHeight?: string | number
  maxHeight?: string | number
  className?: string
  contentClassName?: string
  toolbarClassName?: string
  showWordCount?: boolean
  showCharacterCount?: boolean
  showToolbar?: boolean
  autoFocus?: boolean
  id?: string
}

export const RichTextEditor = React.forwardRef<HTMLDivElement, RichTextEditorProps>(
  (
    {
      value,
      defaultValue = "",
      onChange,
      onTextChange,
      placeholder = "Write something awesome...",
      disabled = false,
      readOnly = false,
      minHeight = "140px",
      maxHeight = "480px",
      className,
      contentClassName,
      toolbarClassName,
      showWordCount = false,
      showCharacterCount = false,
      showToolbar = true,
      autoFocus = false,
      id,
    },
    ref
  ) => {
    const editorRef = React.useRef<HTMLDivElement | null>(null)
    const savedSelectionRef = React.useRef<Range | null>(null)
    const [isFocused, setIsFocused] = React.useState(false)
    const [isEmpty, setIsEmpty] = React.useState(true)
    const [wordCount, setWordCount] = React.useState(0)
    const [charCount, setCharCount] = React.useState(0)

    // Active formatting states
    const [activeFormats, setActiveFormats] = React.useState({
      bold: false,
      italic: false,
      underline: false,
      strikeThrough: false,
      unorderedList: false,
      heading: "p",
      isLink: false,
    })

    // Helper to evaluate if editor content is empty
    const checkIsEmpty = (html: string, text: string) => {
      const trimmedText = text.trim()
      const cleanedHtml = html.replace(/<[^>]*>/g, "").trim()
      return trimmedText === "" && (cleanedHtml === "" || html === "<br>" || html === "<p><br></p>")
    }

    // Save selection range before dropdown menus blur the editor
    const saveSelection = () => {
      if (typeof window === "undefined") return
      const sel = window.getSelection()
      if (sel && sel.rangeCount > 0) {
        savedSelectionRef.current = sel.getRangeAt(0).cloneRange()
      }
    }

    // Restore selection range
    const restoreSelection = () => {
      if (typeof window === "undefined") return
      const sel = window.getSelection()
      if (sel && savedSelectionRef.current) {
        sel.removeAllRanges()
        sel.addRange(savedSelectionRef.current)
      }
    }

    // Update active toolbar states based on selection
    const updateActiveStates = React.useCallback(() => {
      if (typeof document === "undefined" || !editorRef.current) return

      try {
        const isBold = document.queryCommandState("bold")
        const isItalic = document.queryCommandState("italic")
        const isUnderline = document.queryCommandState("underline")
        const isStrike = document.queryCommandState("strikeThrough")
        const isUnordered = document.queryCommandState("insertUnorderedList")

        const formatBlock = document.queryCommandValue("formatBlock")?.toLowerCase() || "p"
        let heading = "p"
        if (formatBlock.includes("h1")) heading = "h1"
        else if (formatBlock.includes("h2")) heading = "h2"
        else if (formatBlock.includes("h3")) heading = "h3"

        let isLink = false
        const sel = window.getSelection()
        if (sel && sel.anchorNode) {
          let node: Node | null = sel.anchorNode
          while (node && node !== editorRef.current) {
            if (node.nodeName.toLowerCase() === "a") {
              isLink = true
              break
            }
            node = node.parentNode
          }
        }

        setActiveFormats({
          bold: isBold,
          italic: isItalic,
          underline: isUnderline,
          strikeThrough: isStrike,
          unorderedList: isUnordered,
          heading,
          isLink,
        })
      } catch {
        // queryCommandState might fail if not focused
      }
    }, [])

    // Synchronize content on change
    const handleInput = React.useCallback(() => {
      if (!editorRef.current) return
      const html = editorRef.current.innerHTML
      const text = editorRef.current.innerText || editorRef.current.textContent || ""

      const empty = checkIsEmpty(html, text)
      setIsEmpty(empty)

      const trimmed = text.trim()
      const words = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0
      setWordCount(words)
      setCharCount(text.length)

      onChange?.(empty ? "" : html)
      onTextChange?.(text)
      updateActiveStates()
    }, [onChange, onTextChange, updateActiveStates])

    // Execute standard formatting command
    const execCmd = (command: string, value: string | undefined = undefined) => {
      if (disabled || readOnly) return
      editorRef.current?.focus()
      restoreSelection()
      document.execCommand(command, false, value)
      handleInput()
    }

    // Set text size / heading (with reliable DOM block conversion & toggle)
    const setHeading = (tag: string) => {
      if (disabled || readOnly) return
      editorRef.current?.focus()
      restoreSelection()

      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0) return

      // If clicking the active heading again, toggle it back to paragraph
      const targetTag = activeFormats.heading === tag && tag !== "p" ? "p" : tag

      // Find enclosing block element within editorRef
      let blockNode: HTMLElement | null = null
      let node: Node | null = sel.anchorNode
      while (node && node !== editorRef.current) {
        const name = node.nodeName.toLowerCase()
        if (["h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "pre", "p", "div"].includes(name)) {
          blockNode = node as HTMLElement
          break
        }
        node = node.parentNode
      }

      if (blockNode && blockNode.parentNode && blockNode !== editorRef.current) {
        const newElement = document.createElement(targetTag)
        newElement.innerHTML = blockNode.innerHTML
        blockNode.parentNode.replaceChild(newElement, blockNode)

        // Restore cursor/selection inside the new element
        const newRange = document.createRange()
        newRange.selectNodeContents(newElement)
        newRange.collapse(false)
        sel.removeAllRanges()
        sel.addRange(newRange)
        savedSelectionRef.current = newRange.cloneRange()
      } else {
        if (targetTag === "p") {
          document.execCommand("formatBlock", false, "<p>")
        } else {
          document.execCommand("formatBlock", false, `<${targetTag}>`)
        }
      }

      handleInput()
    }

    // Insert or remove hyperlink
    const handleLink = () => {
      if (disabled || readOnly) return
      editorRef.current?.focus()
      restoreSelection()

      if (activeFormats.isLink) {
        document.execCommand("unlink", false, undefined)
      } else {
        const url = window.prompt("Enter URL (e.g. https://example.com):")
        if (url) {
          const finalUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`
          document.execCommand("createLink", false, finalUrl)
        }
      }
      handleInput()
    }

    // Clear all formatting (inline and block styles)
    const clearAllFormatting = () => {
      if (disabled || readOnly) return
      editorRef.current?.focus()
      restoreSelection()

      document.execCommand("removeFormat", false, undefined)
      document.execCommand("unlink", false, undefined)
      setHeading("p")

      if (activeFormats.unorderedList) {
        document.execCommand("insertUnorderedList", false, undefined)
      }

      handleInput()
    }

    // Initialize content
    React.useEffect(() => {
      if (!editorRef.current) return

      const initialContent = value !== undefined ? value : defaultValue
      if (editorRef.current.innerHTML !== initialContent) {
        editorRef.current.innerHTML = initialContent
        const text = editorRef.current.innerText || editorRef.current.textContent || ""
        const empty = checkIsEmpty(initialContent, text)
        setIsEmpty(empty)
        const trimmed = text.trim()
        setWordCount(trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0)
        setCharCount(text.length)
      }
    }, [value, defaultValue])

    // Auto-focus
    React.useEffect(() => {
      if (autoFocus && editorRef.current) {
        editorRef.current.focus()
      }
    }, [autoFocus])

    // Active heading label for trigger button
    const currentHeadingLabel = React.useMemo(() => {
      switch (activeFormats.heading) {
        case "h1":
          return "Heading 1"
        case "h2":
          return "Heading 2"
        case "h3":
          return "Heading 3"
        default:
          return "Paragraph"
      }
    }, [activeFormats.heading])

    return (
      <TooltipProvider delay={200}>
        <div
          ref={ref}
          data-slot="rich-text-editor"
          className={cn(
            "group/editor relative flex flex-col w-full rounded-xl border border-border bg-card text-card-foreground shadow-xs transition-all",
            isFocused && "border-ring ring-3 ring-ring/20",
            disabled && "opacity-50 cursor-not-allowed pointer-events-none",
            className
          )}
        >
          {/* Single-Line Clean Toolbar without separator lines */}
          {showToolbar && !readOnly && (
            <div
              className={cn(
                "flex items-center gap-1 px-2 py-1.5 border-b border-border/80 bg-muted/20 rounded-t-xl select-none overflow-x-auto whitespace-nowrap scrollbar-none",
                toolbarClassName
              )}
            >
              {/* 1. Text Size / Headings Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onMouseDown={saveSelection}
                    className="h-7 px-2 text-xs font-medium gap-1 text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
                  >
                    <span>{currentHeadingLabel}</span>
                    <ChevronDown className="size-3 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-36">
                  <DropdownMenuItem
                    onClick={() => setHeading("p")}
                    className={cn("gap-2 text-xs cursor-pointer", activeFormats.heading === "p" && "font-semibold text-primary")}
                  >
                    <Pilcrow className="size-3.5" />
                    <span>Paragraph</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setHeading("h1")}
                    className={cn("gap-2 cursor-pointer", activeFormats.heading === "h1" && "font-semibold text-primary")}
                  >
                    <Heading1 className="size-4" />
                    <span className="text-base font-bold">Heading 1</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setHeading("h2")}
                    className={cn("gap-2 cursor-pointer", activeFormats.heading === "h2" && "font-semibold text-primary")}
                  >
                    <Heading2 className="size-3.5" />
                    <span className="text-sm font-semibold">Heading 2</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setHeading("h3")}
                    className={cn("gap-2 cursor-pointer", activeFormats.heading === "h3" && "font-semibold text-primary")}
                  >
                    <Heading3 className="size-3.5" />
                    <span className="text-xs font-medium">Heading 3</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* 2. Bold, Italic, Underline, Strikethrough */}
              <div className="flex items-center gap-0.5 shrink-0">
                <ToolbarButton
                  icon={<Bold className="size-3.5" />}
                  tooltip="Bold (Ctrl+B)"
                  isActive={activeFormats.bold}
                  onClick={() => execCmd("bold")}
                />
                <ToolbarButton
                  icon={<Italic className="size-3.5" />}
                  tooltip="Italic (Ctrl+I)"
                  isActive={activeFormats.italic}
                  onClick={() => execCmd("italic")}
                />
                <ToolbarButton
                  icon={<Underline className="size-3.5" />}
                  tooltip="Underline (Ctrl+U)"
                  isActive={activeFormats.underline}
                  onClick={() => execCmd("underline")}
                />
                <ToolbarButton
                  icon={<Strikethrough className="size-3.5" />}
                  tooltip="Strikethrough"
                  isActive={activeFormats.strikeThrough}
                  onClick={() => execCmd("strikeThrough")}
                />
              </div>

              {/* 3. Bullets */}
              <div className="flex items-center gap-0.5 shrink-0">
                <ToolbarButton
                  icon={<List className="size-3.5" />}
                  tooltip="Bullet List"
                  isActive={activeFormats.unorderedList}
                  onClick={() => execCmd("insertUnorderedList")}
                />
              </div>

              {/* 4. Link */}
              <div className="flex items-center gap-0.5 shrink-0">
                <ToolbarButton
                  icon={activeFormats.isLink ? <Unlink className="size-3.5" /> : <LinkIcon className="size-3.5" />}
                  tooltip={activeFormats.isLink ? "Remove Link" : "Insert Link"}
                  isActive={activeFormats.isLink}
                  onClick={handleLink}
                />
              </div>

              {/* 5. Clear Formatting */}
              <div className="flex items-center gap-0.5 shrink-0">
                <ToolbarButton
                  icon={<RemoveFormatting className="size-3.5" />}
                  tooltip="Clear Formatting"
                  onClick={clearAllFormatting}
                />
              </div>
            </div>
          )}

          {/* Editable Content Area */}
          <div className="relative flex-1">
            {isEmpty && (
              <div
                className="pointer-events-none absolute top-3 left-4 text-sm text-muted-foreground/50 select-none"
                aria-hidden="true"
              >
                {placeholder}
              </div>
            )}

            <div
              id={id}
              ref={editorRef}
              contentEditable={!disabled && !readOnly}
              suppressContentEditableWarning
              onInput={handleInput}
              onFocus={() => {
                setIsFocused(true)
                updateActiveStates()
              }}
              onBlur={() => {
                setIsFocused(false)
                handleInput()
              }}
              onKeyUp={updateActiveStates}
              onMouseUp={updateActiveStates}
              style={{ minHeight, maxHeight }}
              className={cn(
                "w-full overflow-y-auto px-4 py-3 text-sm leading-relaxed outline-none focus:outline-none",
                "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h1]:my-2",
                "[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:my-1.5",
                "[&_h3]:text-base [&_h3]:font-medium [&_h3]:my-1",
                "[&_p]:my-1 [&_p]:leading-relaxed",
                "[&_ul]:list-disc [&_ul]:list-outside [&_ul]:ml-5 [&_ul]:my-1.5 [&_ul]:space-y-0.5",
                "[&_ol]:list-decimal [&_ol]:list-outside [&_ol]:ml-5 [&_ol]:my-1.5 [&_ol]:space-y-0.5",
                "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:opacity-80",
                contentClassName
              )}
            />
          </div>

          {/* Optional Footer stats */}
          {(showWordCount || showCharacterCount) && (
            <div className="flex items-center justify-end gap-3 px-3 py-1.5 border-t border-border/40 text-[11px] text-muted-foreground select-none bg-muted/10 rounded-b-xl">
              {showWordCount && <span>{wordCount} {wordCount === 1 ? "word" : "words"}</span>}
              {showCharacterCount && (
                <span>
                  {charCount} {charCount === 1 ? "character" : "characters"}
                </span>
              )}
            </div>
          )}
        </div>
      </TooltipProvider>
    )
  }
)

RichTextEditor.displayName = "RichTextEditor"

// Internal Toolbar Button Component
interface ToolbarButtonProps {
  icon: React.ReactNode
  tooltip: string
  isActive?: boolean
  onClick: () => void
  disabled?: boolean
}

function ToolbarButton({
  icon,
  tooltip,
  isActive = false,
  onClick,
  disabled = false,
}: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={onClick}
          className={cn(
            "flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed shrink-0",
            isActive && "bg-accent text-accent-foreground font-semibold shadow-2xs"
          )}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={4} className="text-[11px] px-2 py-1">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}

export { RichTextViewer } from "@/components/ui/rich-text-viewer"
export default RichTextEditor
