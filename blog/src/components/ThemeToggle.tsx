"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ThemeMode } from "@/lib/settings-config";

interface Props {
  initialTheme: ThemeMode;
}

export function ThemeToggle({ initialTheme }: Props) {
  const [theme, setTheme] = useState<ThemeMode>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.cookie = `blog-theme=${theme}; path=/; max-age=31536000`;
  }, [theme]);

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant={theme === "paper" ? "primary" : "ghost"}
        onClick={() => setTheme("paper")}
      >
        Paper
      </Button>
      <Button
        size="sm"
        variant={theme === "neo" ? "primary" : "ghost"}
        onClick={() => setTheme("neo")}
      >
        Neo
      </Button>
    </div>
  );
}
