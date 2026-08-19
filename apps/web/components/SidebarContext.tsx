"use client";

import {
  SidebarProvider,
  useSidebar as useShadcnSidebar,
} from "@/components/ui/sidebar";

export { SidebarProvider };

export function useSidebar() {
  const sidebar = useShadcnSidebar();
  return {
    ...sidebar,
    isCollapsed: sidebar.state === "collapsed",
    isMobileOpen: sidebar.openMobile,
    toggleCollapse: sidebar.toggleSidebar,
    closeMobile: () => sidebar.setOpenMobile(false),
    toggleMobile: () => sidebar.setOpenMobile(!sidebar.openMobile),
  };
}
