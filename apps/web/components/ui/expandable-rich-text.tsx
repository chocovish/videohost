"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RichTextViewer } from "@/components/ui/rich-text-viewer";
import { cn } from "@/lib/utils";

interface ExpandableRichTextProps {
  content?: string | null;
  /** Lines to show before offering "Read more". Defaults to 5. */
  clampLines?: number;
  className?: string;
  textClassName?: string;
  readMoreLabel?: string;
  showLessLabel?: string;
}

/**
 * Clamped rich text with a "Read more / Show less" toggle.
 * The toggle only renders when the content actually overflows,
 * so short descriptions stay clean.
 */
export function ExpandableRichText({
  content,
  clampLines = 5,
  className,
  textClassName,
  readMoreLabel = "Read more",
  showLessLabel = "Show less",
}: ExpandableRichTextProps) {
  const [expanded, setExpanded] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  // Reset when navigating between videos / playlists.
  useEffect(() => {
    setExpanded(false);
  }, [content]);

  useLayoutEffect(() => {
    if (expanded) return;
    const el = textRef.current;
    if (!el) return;
    const measure = () => {
      setTruncated(el.scrollHeight > el.clientHeight + 4);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [content, clampLines, expanded]);

  if (!content || !content.trim()) return null;

  return (
    <div className={cn("space-y-1", className)}>
      <div
        ref={textRef}
        style={
          expanded
            ? undefined
            : {
                display: "-webkit-box",
                WebkitLineClamp: clampLines,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }
        }
      >
        <RichTextViewer
          content={content}
          className={cn("leading-relaxed [&_a]:underline", textClassName)}
        />
      </div>
      {truncated || expanded ? (
        <Button
          variant="ghost"
          size="sm"
          className="mt-1.5 -ml-2 h-7 px-2 gap-1 text-xs font-bold text-primary hover:text-primary"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? (
            <>
              {showLessLabel}
              <ChevronUp />
            </>
          ) : (
            <>
              {readMoreLabel}
              <ChevronDown />
            </>
          )}
        </Button>
      ) : null}
    </div>
  );
}
