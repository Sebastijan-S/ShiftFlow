"use client";

import { Dialog } from "@base-ui/react/dialog";
import { LockKey, WarningCircle, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import type { ScheduleWarning } from "@/lib/scheduling/warnings";

export function ShiftWarnings({ warnings }: { warnings: ScheduleWarning[] }) {
  if (!warnings.length) return null;
  return <details className="shift-warning"><summary><WarningCircle size={20} aria-hidden />Proveriti · {warnings.length}</summary>{warnings.map((warning) => <p key={warning.id}>{warning.message}</p>)}</details>;
}

export function ShiftOptions({ title, locked, children }: { title: string; locked: boolean; children: React.ReactNode }) {
  return <><div className="shift-badges">{locked && <span><LockKey size={20} aria-hidden />Zaključano</span>}</div><Dialog.Root>
    <Dialog.Trigger render={<Button className="slot-options-trigger" />}>Opcije</Dialog.Trigger>
    <Dialog.Portal><Dialog.Backdrop className="dialog-backdrop" /><Dialog.Popup className="dialog-popup">
      <div className="dialog-heading"><Dialog.Title>Opcije smene</Dialog.Title><Dialog.Close render={<Button size="icon" aria-label="Zatvori opcije" />}><X size={20} /></Dialog.Close></div>
      <Dialog.Description className="dialog-description">{title}</Dialog.Description>
      {children}
    </Dialog.Popup></Dialog.Portal>
  </Dialog.Root></>;
}
