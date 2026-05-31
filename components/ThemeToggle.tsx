"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

function readTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function applyTheme(next: Theme) {
  const el = document.documentElement;
  el.classList.toggle("dark", next === "dark");
  el.style.colorScheme = next;
}

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    setTheme(readTheme());
    setMounted(true);

    // Follow OS changes only while the user has no explicit saved preference.
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => {
      if (localStorage.getItem("theme")) return;
      const next: Theme = e.matches ? "dark" : "light";
      applyTheme(next);
      setTheme(next);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* ignore storage failures (private mode, etc.) */
    }
    setTheme(next);
  }

  // Render a non-interactive placeholder until mounted so server and client
  // markup match (the real icon depends on the runtime theme class).
  if (!mounted) {
    return (
      <div
        aria-hidden="true"
        className="fixed bottom-4 right-4 z-50 h-10 w-10 rounded-full border border-border bg-surface shadow-lg"
      />
    );
  }

  const isDark = theme === "dark";
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="fixed bottom-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-fg shadow-lg transition hover:border-border-strong hover:bg-surface-2"
    >
      {isDark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </button>
  );
}
