export interface ThemeOption {
  id: string;
  name: string;
  primaryColor: string;
  description: string;
  selectable: boolean;
  accent?: string;
  badge?: string;
}

export const THEMES: Record<string, ThemeOption> = {
  pop: {
    id: "pop",
    name: "Toon Pop Purple",
    primaryColor: "hsl(285, 88%, 60%)",
    description: "Award-winning cartoon theme with punchy electric purple and comic drop shadows",
    selectable: true,
    accent: "hsl(95, 90%, 55%)",
    badge: "Featured",
  },
  arcade: {
    id: "arcade",
    name: "Electric Arcade",
    primaryColor: "hsl(45, 100%, 52%)",
    description: "High-energy comic arcade theme with sunny gold and neon coral punch",
    selectable: true,
    accent: "hsl(285, 88%, 60%)",
    badge: "Playful",
  },
  bubblegum: {
    id: "bubblegum",
    name: "Bubblegum Mint",
    primaryColor: "hsl(330, 95%, 65%)",
    description: "Sweet candy bubblegum pink with refreshing cartoon mint accents",
    selectable: true,
    accent: "hsl(150, 90%, 55%)",
    badge: "Trendy",
  },
  lime: {
    id: "lime",
    name: "Electric Comic Lime",
    primaryColor: "hsl(88, 90%, 48%)",
    description: "Vibrant superhero lime with tactile comic depth and ink outlines",
    selectable: true,
    accent: "hsl(285, 88%, 60%)",
  },
  ocean: {
    id: "ocean",
    name: "Splashy Toon Cyan",
    primaryColor: "hsl(198, 92%, 50%)",
    description: "Bouncy water-balloon cyan with high-contrast comic paper styling",
    selectable: true,
    accent: "hsl(45, 100%, 52%)",
  },
  obsidian: {
    id: "obsidian",
    name: "Comic Midnight Neon",
    primaryColor: "hsl(285, 95%, 70%)",
    description: "Midnight comic book noir with radiant neon pop accents",
    selectable: true,
    accent: "hsl(150, 95%, 55%)",
  },
  minimal: {
    id: "minimal",
    name: "Clean Minimalist",
    primaryColor: "hsl(220, 90%, 56%)",
    description: "Subtle and modern flat styling with soft shadows and 1px borders",
    selectable: true,
  },
};
