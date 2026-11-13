"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { supabaseBrowser } from "@/lib/supabase/browser";

const tokenKey = (id: string) => `shiftflow-team-${id}`;
const candidateKey = (id: string) => `${tokenKey(id)}-pending`;
const makeToken = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2,"0")).join("");

export function TeamLinkPanel({ workspaceId }: { workspaceId: string }) {
  const [link,setLink] = useState("");
  const [busy,setBusy] = useState(false);
  const [uncertain,setUncertain] = useState(false);
  const [message,setMessage] = useState("");
  const [error,setError] = useState("");
  const [retry,setRetry] = useState(false);
  const [operation,setOperation] = useState<"create" | "revoke">("create");
  const candidate = useRef<string | null>(null), inFlight = useRef(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        setLink(localStorage.getItem(tokenKey(workspaceId)) ?? "");
        candidate.current = localStorage.getItem(candidateKey(workspaceId));
        if (candidate.current) { setRetry(true); setUncertain(true); setError("Status linka nije potvrđen. Pokušajte ponovo."); }
      } catch { setError("Pregledač ne dozvoljava pamćenje linka. Novi link će biti prikazan u ovom prozoru."); }
    },0);
    return () => clearTimeout(timer);
  },[workspaceId]);

  async function create() {
    if (inFlight.current) return;
    inFlight.current=true; setOperation("create"); setBusy(true); setError(""); setMessage("");
    candidate.current ??= makeToken();
    setRetry(true);
    // Keep the same candidate through technical retries, including reload after a lost response.
    try { localStorage.setItem(candidateKey(workspaceId),candidate.current); } catch { /* In-memory retry remains available. */ }
    try {
      const result = await supabaseBrowser().rpc("rotate_team_link",{ p_workspace:workspaceId,p_token:candidate.current });
      if (result.error) {
        // PostgREST errors with SQLSTATE are confirmed rejections; transport/5xx results are unknown.
        if (/^[0-9A-Z]{5}$/.test(result.error.code) && !uncertain) {
          setError(`Link nije napravljen. ${result.error.message}`);
        } else { setUncertain(true); setError("Status linka nije potvrđen. Pokušajte ponovo."); }
        return;
      }
      setLink(candidate.current); setUncertain(false);
      setMessage("Novi link je spreman. Prethodni više ne važi.");
      try { localStorage.setItem(tokenKey(workspaceId),candidate.current); localStorage.removeItem(candidateKey(workspaceId)); } catch { setError("Link je napravljen, ali nije zapamćen u pregledaču. Sačuvajte prikazani URL."); }
      candidate.current=null; setRetry(false);
    } catch { setUncertain(true); setError("Status linka nije potvrđen. Pokušajte ponovo."); }
    finally { inFlight.current=false; setBusy(false); }
  }
  async function revoke() {
    if (inFlight.current) return;
    inFlight.current=true; setOperation("revoke"); setBusy(true); setError(""); setMessage("");
    try {
      const { error } = await supabaseBrowser().rpc("revoke_team_link",{p_workspace:workspaceId});
      if (error) { setUncertain(true); setError("Opoziv nije potvrđen. Pokušajte ponovo."); return; }
      setLink(""); candidate.current=null; setRetry(false); setUncertain(false); setMessage("Link za tim je opozvan.");
      try { localStorage.removeItem(tokenKey(workspaceId)); localStorage.removeItem(candidateKey(workspaceId)); } catch { /* Server revocation is confirmed. */ }
    } catch { setUncertain(true); setError("Opoziv nije potvrđen. Pokušajte ponovo."); }
    finally { inFlight.current=false; setBusy(false); }
  }
  const url = link && typeof window !== "undefined" ? `${window.location.origin}/team/${link}` : "";
  async function copy() {
    try { await navigator.clipboard.writeText(url); setError(""); setMessage("Link je kopiran."); }
    catch { setMessage(""); setError("Kopiranje nije uspelo. Označite URL u polju i kopirajte ga ručno."); }
  }
  return <details className="panel share-panel"><summary>Link za tim</summary><div className="share-content">
    <p>Članovi tima vide samo objavljene nedelje. Pravljenje novog linka poništava prethodni.</p>
    <div className="share-actions"><Button variant="default" disabled={busy} busy={busy && operation==="create"} busyLabel="Pravljenje…" onClick={() => void create()}>Napravi link za tim</Button>
      {(link || uncertain) && <Button disabled={busy} busy={busy && operation==="revoke"} busyLabel="Opozivanje…" onClick={() => void revoke()}>Opozovi link</Button>}</div>
    {url && !uncertain && <><input aria-label="Link za tim" readOnly value={url} onFocus={(event) => event.target.select()} /><Button disabled={busy} onClick={() => void copy()}>Kopiraj</Button></>}
    {uncertain && <p>Prethodni URL možda više ne važi. {retry ? "Ponovni pokušaj potvrđuje isti novi link." : "Ponovite opoziv da potvrdite status."}</p>}
    {message && <p className="notice success" role="status"><CheckCircle size={20} aria-hidden />{message}</p>}
    {error && <div className="notice warning" role="status"><WarningCircle size={20} aria-hidden />{error}{retry && <Button disabled={busy} onClick={() => void create()}>Pokušaj ponovo</Button>}</div>}
  </div></details>;
}
