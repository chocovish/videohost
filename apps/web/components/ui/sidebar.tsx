"use client";

import * as React from "react";
import { PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarContextValue {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  toggleCollapse: () => void;
  toggleMobile: () => void;
  closeMobile: () => void;
}

const SidebarContext = React.createContext<SidebarContextValue | undefined>(undefined);

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  const toggleCollapse = React.useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  const toggleMobile = React.useCallback(() => {
    setIsMobileOpen((prev) => !prev);
  }, []);

  const closeMobile = React.useCallback(() => {
    setIsMobileOpen(false);
  }, []);

  return (
    <SidebarContext.Provider
      value={{
        isCollapsed,
        isMobileOpen,
        toggleCollapse,
        toggleMobile,
        closeMobile,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export const Sidebar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const { isCollapsed, isMobileOpen, closeMobile } = useSidebar();

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
            onClick={closeMobile}
          />
          <aside
            className={cn(
              "fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white dark:bg-slate-900 border-r border-[hsl(var(--border))] shadow-2xl z-50 animate-in slide-in-from-left duration-300 overflow-y-auto flex flex-col",
              className
            )}
            {...props}
          >
            {children}
          </aside>
        </div>
      )}

      {/* Desktop Sticky Sidebar */}
      <aside
        ref={ref}
        className={cn(
          "hidden md:flex flex-col border-r border-[hsl(var(--border))] bg-white/70 backdrop-blur-xl h-screen sticky top-0 transition-all duration-300 ease-in-out shrink-0 z-30",
          isCollapsed ? "w-20" : "w-64",
          className
        )}
        {...props}
      >
        {children}
      </aside>
    </>
  );
});
Sidebar.displayName = "Sidebar";

export const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-4 border-b border-[hsl(var(--border))]", className)} {...props} />
));
SidebarHeader.displayName = "SidebarHeader";

export const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex-1 overflow-y-auto p-4 space-y-4", className)} {...props} />
));
SidebarContent.displayName = "SidebarContent";

export const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-4 border-t border-[hsl(var(--border))] space-y-3", className)} {...props} />
));
SidebarFooter.displayName = "SidebarFooter";

export const SidebarMenu = React.forwardRef<
  HTMLUListElement,
  React.HTMLAttributes<HTMLUListElement>
>(({ className, ...props }, ref) => (
  <ul ref={ref} className={cn("space-y-1 list-none p-0 m-0", className)} {...props} />
));
SidebarMenu.displayName = "SidebarMenu";

export const SidebarMenuItem = React.forwardRef<
  HTMLLIElement,
  React.LiHTMLAttributes<HTMLLIElement>
>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("relative", className)} {...props} />
));
SidebarMenuItem.displayName = "SidebarMenuItem";

export const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    isActive?: boolean;
  }
>(({ className, isActive, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer",
      isActive
        ? "bg-[hsl(var(--primary))] text-white shadow-sm font-semibold"
        : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]",
      className
    )}
    {...props}
  />
));
SidebarMenuButton.displayName = "SidebarMenuButton";

export function SidebarTrigger({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { toggleCollapse } = useSidebar();
  return (
    <button
      onClick={toggleCollapse}
      className={cn(
        "p-2 rounded-xl text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-black/5 transition-colors cursor-pointer",
        className
      )}
      {...props}
    >
      <PanelLeft className="w-5 h-5 text-[hsl(var(--primary))]" />
    </button>
  );
}
