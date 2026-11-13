"use client";

import { Button } from "@/components/ui/button";

import { useEffect, useState } from "react";
import { Sun, Moon } from "@phosphor-icons/react";

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
    try { localStorage.setItem(themeKey, next ? "dark" : "light"); } catch { /* Theme remains usable when storage is unavailable. */ }
    setDark(next);
  }

  return <Button type="button" className="theme-toggle" aria-label={dark ? "Uključi svetli režim" : "Uključi tamni režim"} aria-pressed={dark} onClick={toggle}>{dark ? <Sun size={20} aria-hidden /> : <Moon size={20} aria-hidden />}{dark ? "Svetli" : "Tamni"}</Button>;
}
