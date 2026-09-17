import type { ReactNode } from "react";

/**
 * Scoped forced-dark layout for all `/meet/*` routes.
 *
 * Inherits the root layout and only adds a `.dark` scope so every
 * descendant automatically resolves shadcn `dark:` variants and the
 * `.dark` CSS-variable theme (see `app/themes.css`).
 *
 * Pages and components inside MUST NOT hardcode colors
 * (`bg-slate-*`, `text-white`, `border-slate-*`, ...). Use shadcn
 * semantic tokens (`bg-background`, `bg-card`, `text-foreground`,
 * `text-muted-foreground`, `border-border`, `bg-muted`) and plain
 * shadcn `Button` / `Dialog` / `Select` / `DropdownMenu` / `Input`
 * variants — the `.dark` wrapper below makes them render dark.
 */
export default function MeetLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="dark min-h-screen bg-background text-foreground"
      style={{ colorScheme: "dark" }}
    >
      {children}
    </div>
  );
}
