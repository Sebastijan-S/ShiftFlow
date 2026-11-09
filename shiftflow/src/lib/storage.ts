import type { Workspace } from "./scheduler";
export interface HistoryEntry { label: string; time: string; snapshot: Workspace }
export interface StoredState { schema: 1; revision: number; current: Workspace; past: HistoryEntry[]; future: HistoryEntry[] }
export const STORAGE_KEY = "shiftflow:demo:v1";
export function readState(key = STORAGE_KEY): StoredState | null {
  const value = localStorage.getItem(key);
  if (!value) return null;
  const parsed = JSON.parse(value) as StoredState;
  if (parsed.schema !== 1 || !Array.isArray(parsed.current?.employees) || !parsed.current?.schedules || !Array.isArray(parsed.past) || !Array.isArray(parsed.future)) throw new Error("Sačuvani podaci nisu u podržanom formatu.");
  return parsed;
}
export function writeState(state: StoredState, key = STORAGE_KEY) { localStorage.setItem(key, JSON.stringify(state)); }
export function applyChange(state: StoredState, current: Workspace, label: string): StoredState {
  return { schema: 1, revision: state.revision + 1, current, past: [...state.past, { label, time: new Date().toISOString(), snapshot: state.current }].slice(-100), future: [] };
}
export function undoState(state: StoredState): StoredState {
  const last = state.past.at(-1); if (!last) return state;
  return { ...state, revision: state.revision + 1, current: last.snapshot, past: state.past.slice(0, -1), future: [...state.future, { label: last.label, time: new Date().toISOString(), snapshot: state.current }] };
}
export function redoState(state: StoredState): StoredState {
  const next = state.future.at(-1); if (!next) return state;
  return { ...state, revision: state.revision + 1, current: next.snapshot, past: [...state.past, { label: next.label, time: new Date().toISOString(), snapshot: state.current }], future: state.future.slice(0, -1) };
}
