"use client";

import { Button } from "@/components/ui/button";

import { useState } from "react";
import { getCountries, getCountryCallingCode, type CountryCode } from "libphonenumber-js";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { normalizePhone } from "@/lib/phone";
import { ThemeToggle } from "@/components/theme-toggle";

const regionNames = new Intl.DisplayNames(["sr-Latn", "en"], { type: "region" });
const countries = getCountries().map((code) => ({ code, label: `${regionNames.of(code) ?? code} (+${getCountryCallingCode(code)})` })).sort((a, b) => a.label.localeCompare(b.label, "sr-Latn"));

export function AuthPanel() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [kind, setKind] = useState<"email" | "phone">("email");
  const [country, setCountry] = useState<CountryCode>("RS");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("");
    let identity: string;
    if (kind === "phone") {
      const parsed = normalizePhone(identifier, country);
      if (!parsed) { setMessage("Unesite ispravan broj telefona za izabranu državu."); return; }
      identity = parsed;
    } else {
      identity = identifier.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity)) { setMessage("Unesite ispravnu email adresu."); return; }
    }
    setBusy(true);
    try {
      const credentials = kind === "email" ? { email: identity, password } : { phone: identity, password };
      const result = mode === "signup"
        ? await supabaseBrowser().auth.signUp(credentials)
        : await supabaseBrowser().auth.signInWithPassword(credentials);
      if (result.error) throw result.error;
      if (!result.data.session) setMessage("Nalog je napravljen, ali prijava nije otvorena. Proverite podešavanja potvrde u Supabase Auth projektu.");
    } catch (error) {
      setMessage(mode === "login" ? "Prijava nije uspela. Proverite podatke i pokušajte ponovo." : error instanceof Error ? error.message : "Registracija nije uspela.");
    } finally { setBusy(false); }
  }

  return <main className="auth-wrap"><section className="auth-intro"><span className="eyebrow">SHIFT FLOW / PILOT</span><h1>Raspored počinje dobrim podacima.</h1><p>Unesite tim, dostupnost i potrebne smene. Generišite pouzdan raspored i podelite objavljene smene sa timom.</p><div className="intro-mark">SF<span>✳</span></div></section>
    <section className="auth-card"><div className="auth-brand-row"><div className="brand">✳ ShiftFlow</div><ThemeToggle /></div><h2>{mode === "login" ? "Dobro došli nazad" : "Napravite nalog"}</h2><p className="subtle">{mode === "login" ? "Prijavite se u svoj poslovni prostor." : "Započnite besplatan pilot za svoj tim."}</p>
      <div className="segmented" role="group" aria-label="Način prijave"><Button type="button" aria-pressed={kind === "email"} onClick={() => setKind("email")}>Email</Button><Button type="button" aria-pressed={kind === "phone"} onClick={() => setKind("phone")}>Telefon</Button></div>
      <form onSubmit={submit} className="form-stack">{kind === "phone" && <label>Država<select aria-label="Država" value={country} onChange={(e) => setCountry(e.target.value as CountryCode)}>{countries.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}</select></label>}
        <label>{kind === "email" ? "Email adresa" : "Broj telefona"}<input aria-invalid={!!message} aria-describedby={message ? "auth-error" : undefined} required type={kind === "email" ? "email" : "tel"} autoComplete={kind === "email" ? "email" : "tel"} value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder={kind === "email" ? "ime@firma.com" : "064 123 4567"} /></label>
        <label>Lozinka<input aria-invalid={!!message} aria-describedby={message ? "auth-error" : undefined} required minLength={6} type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {message && <p id="auth-error" className="notice error" role="alert">{message}</p>}
        <Button type="submit" variant="default" disabled={busy}>{busy ? "Sačekajte…" : mode === "login" ? "Prijavi se" : "Napravi nalog"}</Button>
      </form><p className="switch-mode">{mode === "login" ? "Nemate nalog?" : "Već imate nalog?"} <Button type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }}>{mode === "login" ? "Registrujte se" : "Prijavite se"}</Button></p>
    </section></main>;
}
