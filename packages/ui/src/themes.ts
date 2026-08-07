export interface ThemeOption {
  id: string;
  name: string;
  primaryColor: string;
  description: string;
  selectable: boolean;
}

export const THEMES: Record<string, ThemeOption> = {
  lime: {
    id: "lime",
    name: "Lime & Muted White",
    primaryColor: "hsl(82, 85%, 45%)",
    description: "Signature dynamic lime palette with clean muted white backgrounds",
    selectable: true,
  },
  ocean: {
    id: "ocean",
    name: "Oceanic Cyan",
    primaryColor: "hsl(200, 85%, 45%)",
    description: "Vibrant cyan accent with modern off-white styling",
    selectable: true,
  },
  obsidian: {
    id: "obsidian",
    name: "Obsidian Neon",
    primaryColor: "hsl(142, 76%, 50%)",
    description: "High-contrast dark obsidian interface with neon highlights",
    selectable: true,
  },
};
