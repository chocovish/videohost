"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface RichTextViewerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "content"> {
  content?: string | null
  fallback?: React.ReactNode
  clamp?: number
}

/**
 * Cleanly renders formatted Rich Text (HTML) or legacy plain text.
 */
export function RichTextViewer({
  content,
  fallback = null,
  clamp,
  className,
  ...props
}: RichTextViewerProps) {
  if (!content || !content.trim()) {
    return fallback ? <>{fallback}</> : null
  }

  // Check if string contains HTML tags
  const isHtml = /<[a-z][\s\S]*>/i.test(content)

  if (!isHtml) {
    return (
      <div
        className={cn(
          "whitespace-pre-line leading-relaxed break-words",
          clamp === 1 && "line-clamp-1",
          clamp === 2 && "line-clamp-2",
          clamp === 3 && "line-clamp-3",
          clamp === 4 && "line-clamp-4",
          clamp === 5 && "line-clamp-5",
          clamp === 6 && "line-clamp-6",
          className
        )}
        {...props}
      >
        {content}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "rich-text-viewer leading-relaxed break-words text-foreground",
        // Typography & Prose styling
        "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h1]:my-2",
        "[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:my-1.5",
        "[&_h3]:text-base [&_h3]:font-medium [&_h3]:my-1",
        "[&_p]:my-1 [&_p]:leading-relaxed",
        "[&_ul]:list-disc [&_ul]:list-outside [&_ul]:ml-5 [&_ul]:my-1.5 [&_ul]:space-y-0.5",
        "[&_ol]:list-decimal [&_ol]:list-outside [&_ol]:ml-5 [&_ol]:my-1.5 [&_ol]:space-y-0.5",
        "[&_blockquote]:border-l-2 [&_blockquote]:border-primary/70 [&_blockquote]:pl-3.5 [&_blockquote]:my-2 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_blockquote]:bg-muted/20 [&_blockquote]:py-1 [&_blockquote]:rounded-r",
        "[&_pre]:bg-muted/60 [&_pre]:p-2.5 [&_pre]:rounded-md [&_pre]:font-mono [&_pre]:text-xs [&_pre]:overflow-x-auto [&_pre]:my-2 [&_pre]:border [&_pre]:border-border/60",
        "[&_code]:bg-muted/80 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-xs [&_code]:text-primary",
        "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:opacity-80",
        "[&_strong]:font-bold [&_b]:font-bold",
        "[&_em]:italic [&_i]:italic",
        clamp === 1 && "line-clamp-1",
        clamp === 2 && "line-clamp-2",
        clamp === 3 && "line-clamp-3",
        clamp === 4 && "line-clamp-4",
        clamp === 5 && "line-clamp-5",
        clamp === 6 && "line-clamp-6",
        className
      )}
      dangerouslySetInnerHTML={{ __html: content }}
      {...props}
    />
  )
}

export default RichTextViewer
