"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Palette } from "lucide-react";
import { THEME_COOKIE_NAME, THEME_NAMES, type ThemeName } from "@/lib/theme";

const THEME_LABELS: Record<ThemeName, string> = {
  light: "Light",
  dark: "Dark",
  "nord:light": "Nord Light",
  "nord:dark": "Nord Dark",
  "dracula:light": "Dracula Light",
  "dracula:dark": "Dracula Dark",
};

// "System" is represented as `null` — no cookie, no data-theme attribute,
// so globals.css's @media(prefers-color-scheme) fallback applies.
export function ThemeSwitcher({
  initialTheme,
}: {
  initialTheme: ThemeName | null;
}) {
  const [theme, setTheme] = useState<ThemeName | null>(initialTheme);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  function applyTheme(next: ThemeName | null) {
    setTheme(next);
    setOpen(false);
    if (next === null) {
      document.cookie = `${THEME_COOKIE_NAME}=; path=/; max-age=0`;
      delete document.documentElement.dataset.theme;
    } else {
      document.cookie = `${THEME_COOKIE_NAME}=${next}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.dataset.theme = next;
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Choose theme"
        aria-expanded={open}
        className="flex items-center justify-center rounded-md p-2 hover:bg-foreground/10"
      >
        <Palette className="h-5 w-5" />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 w-40 overflow-hidden rounded-md border border-border bg-surface py-1 text-sm shadow-lg">
          <button
            type="button"
            onClick={() => applyTheme(null)}
            className="flex w-full items-center justify-between px-3 py-2 hover:bg-foreground/5"
          >
            System
            {theme === null && <Check className="h-4 w-4" />}
          </button>
          {THEME_NAMES.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => applyTheme(name)}
              className="flex w-full items-center justify-between px-3 py-2 hover:bg-foreground/5"
            >
              {THEME_LABELS[name]}
              {theme === name && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
