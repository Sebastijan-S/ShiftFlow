import test from "node:test";
import assert from "node:assert/strict";
import { createDemo } from "../src/lib/demo";
import { assignmentConflicts, duration, generateSchedule, hoursFor, missingRequirements, validateSchedule, type Assignment } from "../src/lib/scheduler";
import { applyChange, redoState, undoState, type StoredState } from "../src/lib/storage";

test("demo: deterministic generation fills 42 slots with no blocking violations", () => {
  const w = createDemo(); const week = Object.keys(w.schedules)[0];
  const a = generateSchedule(w, week); const b = generateSchedule(w, week);
  assert.deepEqual(a, b);
  assert.equal(a.assignments.length, 42);
  assert.equal(missingRequirements(a.assignments, w.requirements).length, 0);
  assert.equal(validateSchedule(a, w).length, 0);
  for (const e of w.employees) assert.ok(hoursFor(a.assignments, e.id, w.templates) <= 40);
});
test("locked assignments are preserved on regeneration", () => {
  const w = createDemo(); const week = Object.keys(w.schedules)[0];
  const locked = w.schedules[week].assignments[0]; locked.locked = true; locked.note = "Ručno dogovoreno";
  const next = generateSchedule(w, week);
  assert.deepEqual(next.assignments.find(a => a.id === locked.id), locked);
});
test("overnight shifts calculate duration and prevent overlapping next morning", () => {
  const w = createDemo(); w.templates.push({ id: "night", name: "Noćna", start: "22:00", end: "06:00", color: "blue" });
  assert.equal(duration(w.templates[2]), 8);
  const night: Assignment = { id: "night1", employeeId: "employee-2", day: 0, templateId: "night", position: "Barista", locked: false, note: "" };
  const morning: Assignment = { ...night, id: "morning1", day: 1, templateId: "morning" };
  const issues = assignmentConflicts(morning, [night], w);
  assert.ok(issues.some(c => c.message.includes("1 h odmora") && c.severity === "block"));
  w.templates[2].end = "08:00";
  assert.ok(assignmentConflicts(morning, [night], w).some(c => c.message.includes("preklapaju")));
});
test("availability, position eligibility, daily limit and severity are enforced", () => {
  const w = createDemo();
  const a: Assignment = { id: "a", employeeId: "employee-1", day: 1, templateId: "morning", position: "Konobar", locked: false, note: "" };
  const conflicts = assignmentConflicts(a, [], w);
  assert.ok(conflicts.some(c => c.message.includes("nije dostupan")));
  assert.ok(conflicts.some(c => c.message.includes("nema poziciju")));
  a.day = 0; a.position = "Barista";
  const evening = { ...a, id: "b", templateId: "evening" };
  assert.ok(assignmentConflicts(evening, [a], w).some(c => c.message.includes("jedna smena")));
  w.rules.allowMultiple = true; w.rules.restSeverity = "warning";
  assert.ok(assignmentConflicts(evening, [a], w).some(c => c.severity === "warning"));
});
test("unfillable demand stays visible and generator never violates a ban", () => {
  const w = createDemo(); w.employees = w.employees.slice(0, 1);
  const next = generateSchedule(w, "2026-11-02", false);
  assert.ok(missingRequirements(next.assignments, w.requirements).length > 0);
  assert.equal(validateSchedule(next, w).filter(c => c.severity === "block").length, 0);
});
test("rest is checked across week boundaries", () => {
  const w = createDemo(); const previous = generateSchedule(w, "2026-10-26", false);
  previous.assignments = [{ id: "sunday", employeeId: "employee-2", day: 6, templateId: "evening", position: "Barista", locked: false, note: "" }];
  w.schedules[previous.week] = previous;
  const next = generateSchedule(w, "2026-11-02", false);
  assert.ok(!next.assignments.some(a => a.day === 0 && a.employeeId === "employee-2" && a.templateId === "morning"));
});
test("undo/redo survives serialization and branching clears future history", () => {
  const w = createDemo(); const initial: StoredState = { schema: 1, revision: 0, current: w, past: [], future: [] };
  const next = applyChange(initial, { ...w, name: "Novi naziv" }, "Naziv");
  const restored = JSON.parse(JSON.stringify(next)) as StoredState;
  const undone = undoState(restored); assert.equal(undone.current.name, w.name);
  const redone = redoState(undone); assert.equal(redone.current.name, "Novi naziv");
  const branched = applyChange(undone, { ...w, name: "Drugi naziv" }, "Naziv 2");
  assert.equal(branched.future.length, 0);
  assert.ok(branched.revision > undone.revision);
});
