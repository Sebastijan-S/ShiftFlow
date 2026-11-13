"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export function WorkspaceCreate({ userId, onCreated }: { userId: string; onCreated: () => void }) {
  const [name, setName] = useState(""); const [timezone, setTimezone] = useState("Europe/Belgrade");
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const result = await supabaseBrowser().from("workspaces").insert({ name: name.trim(), timezone, owner_user_id: userId });
    setBusy(false);
    if (result.error) { setError(result.error.message); return; }
    onCreated();
  }
  return <main className="setup-wrap"><div className="auth-brand-row"><div className="brand">✳ ShiftFlow</div><ThemeToggle /></div><section className="panel setup-panel"><span className="eyebrow">PRVI KORAK</span><h1>Kako se zove vaš posao?</h1><p className="subtle">Jedan poslovni prostor za vaš pilot. Podešavanja možete promeniti kasnije.</p><form onSubmit={submit} className="form-stack"><label>Naziv poslovnog prostora<input required minLength={2} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="Na primer: Moj tim" /></label><label>Vremenska zona<select aria-label="Vremenska zona" value={timezone} onChange={(e) => setTimezone(e.target.value)}><option value="Europe/Belgrade">Europe/Belgrade</option><option value="Europe/Zagreb">Europe/Zagreb</option><option value="Europe/Budapest">Europe/Budapest</option><option value="Europe/Berlin">Europe/Berlin</option><option value="Europe/London">Europe/London</option></select></label>{error && <p role="alert" className="notice error">{error}</p>}<Button type="submit" disabled={busy} variant="default">{busy ? "Čuvanje…" : "Napravi prostor"}</Button></form></section></main>;
}
