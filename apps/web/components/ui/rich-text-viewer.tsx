"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface RichTextViewerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "content"> {
  content?: string | null
  fallback?: React.ReactNode
  clamp?: number
  /**
   * Themed accent for links / inline code. Falls back to the system
   * primary colour when unset, so dashboard usage is unchanged.
   * Share pages pass their palette accent (`theme.accentHex`) so rich
   * text stays readable on dark custom backgrounds.
   */
  accentColor?: string | null
  /**
   * Themed muted colour for blockquotes. Falls back to the system
   * muted-foreground when unset. Share pages pass `theme.mutedHex`.
   */
  mutedColor?: string | null
}

/**
 * Cleanly renders formatted Rich Text (HTML) or legacy plain text.
 *
 * The root inherits colour: dashboard callers get the system
 * `text-foreground` default, while themed callers (share pages,
 * offerings) override it with an inline `style={{ color }}` — inline
 * style always wins over the class. Inner links / code / quotes follow
 * `--rtv-accent` / `--rtv-muted` when provided, otherwise the system
 * tokens, so they never go unreadable on a custom palette.
 */
export function RichTextViewer({
  content,
  fallback = null,
  clamp,
  className,
  accentColor,
  mutedColor,
  style,
  ...props
}: RichTextViewerProps) {
  if (!content || !content.trim()) {
    return fallback ? <>{fallback}</> : null
  }

  const themedStyle: React.CSSProperties = {
    ...(accentColor ? ({ "--rtv-accent": accentColor } as React.CSSProperties) : null),
    ...(mutedColor ? ({ "--rtv-muted": mutedColor } as React.CSSProperties) : null),
    ...style,
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
        style={themedStyle}
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
        "[&_blockquote]:border-l-2 [&_blockquote]:border-primary/70 [&_blockquote]:pl-3.5 [&_blockquote]:my-2 [&_blockquote]:italic [&_blockquote]:bg-muted/20 [&_blockquote]:py-1 [&_blockquote]:rounded-r [&_blockquote]:[color:var(--rtv-muted,var(--muted-foreground))]",
        "[&_pre]:bg-muted/60 [&_pre]:p-2.5 [&_pre]:rounded-md [&_pre]:font-mono [&_pre]:text-xs [&_pre]:overflow-x-auto [&_pre]:my-2 [&_pre]:border [&_pre]:border-border/60",
        "[&_code]:bg-muted/80 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-xs [&_code]:[color:var(--rtv-accent,var(--primary))]",
        "[&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:opacity-80 [&_a]:[color:var(--rtv-accent,var(--primary))]",
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
      style={themedStyle}
      dangerouslySetInnerHTML={{ __html: content }}
      {...props}
    />
  )
}

export default RichTextViewer
