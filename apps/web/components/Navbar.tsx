"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen, Video, Users } from "lucide-react";
import { useSidebar } from "@/components/SidebarContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface NavbarProps {
  userEmail: string;
  userName?: string;
  userImage?: string;
  role: string;
  organizationName: string;
}

export default function Navbar({ userEmail, userName, userImage, role, organizationName }: NavbarProps) {
  const { toggleMobile, toggleCollapse, isCollapsed } = useSidebar();
  const { data: session } = useSession();

  const activeImage = userImage || session?.user?.image || undefined;
  const userInitial = userName ? userName.charAt(0).toUpperCase() : userEmail.charAt(0).toUpperCase();

  return (
    <header className="h-16 shrink-0 border-b border-border bg-background/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 w-full">
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Mobile Hamburger Button */}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={toggleMobile}
          className="md:hidden shrink-0 h-9 w-9 -ml-1"
          title="Open Menu"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5 text-primary" />
        </Button>

        {/* Desktop Collapse Toggle */}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={toggleCollapse}
          className="hidden md:flex shrink-0 h-9 w-9 -ml-1 text-muted-foreground hover:text-foreground"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          aria-label="Toggle Sidebar"
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-5 h-5 text-primary" />
          ) : (
            <PanelLeftClose className="w-5 h-5" />
          )}
        </Button>

        <div className="flex items-center gap-2 min-w-0 truncate">
          <h1 className="font-bold text-base sm:text-lg text-foreground truncate max-w-[140px] sm:max-w-xs">
            {organizationName}
          </h1>
          <Badge variant="secondary" className="shrink-0 font-bold">
            {role}
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3.5 shrink-0">
        <Link
          href="/dashboard/meetings"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border hover:border-foreground bg-card hover:bg-muted text-foreground transition-all text-xs font-bold"
          title="Open Video Meetings"
        >
          <Users className="w-3.5 h-3.5 text-primary" />
          Meetings
        </Link>

        <Link
          href="/record"
          target="_blank"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all text-xs font-bold"
          title="Open Public Recorder Page in new tab"
        >
          <Video className="w-3.5 h-3.5" />
          Public Studio
        </Link>

        <Link
          href="/dashboard/profile"
          className="flex items-center gap-2 sm:gap-2.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted transition-all text-sm"
          title="Profile Settings"
        >
          <Avatar className="h-7 w-7 rounded-xl border">
            {activeImage && <AvatarImage src={activeImage} alt={userName || userEmail} />}
            <AvatarFallback className="rounded-xl text-[11px]">{userInitial}</AvatarFallback>
          </Avatar>
          <div className="text-left hidden sm:block max-w-[120px] md:max-w-[160px] truncate">
            <p className="text-xs font-bold text-foreground truncate">{userName || "User"}</p>
            <p className="text-[11px] font-medium text-muted-foreground truncate">{userEmail}</p>
          </div>
        </Link>

        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => signOut({ callbackUrl: "/auth/login" })}
          className="h-9 w-9 text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/10 rounded-xl"
          title="Sign Out"
          aria-label="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
