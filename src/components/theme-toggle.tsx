"use client";

import { useEffect, useState } from "react";

const themeKey = "shiftflow-theme";

export function ThemeToggle() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const current = document.documentElement.classList.contains("dark");
    const timer = setTimeout(() => setDark(current), 0);
    return () => clearTimeout(timer);
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    document.documentElement.style.colorScheme = next ? "dark" : "light";
    localStorage.setItem(themeKey, next ? "dark" : "light");
    setDark(next);
  }

  return <button type="button" className="theme-toggle" aria-label={dark ? "Uključi svetli režim" : "Uključi tamni režim"} aria-pressed={dark} onClick={toggle}>{dark ? "☀ Svetli" : "☾ Tamni"}</button>;
}
