import { generateSchedule, monday, type Employee, type Workspace } from "./scheduler";
export function createDemo(): Workspace {
  const people: [string, string, string[], string][] = [
    ["Ana Petrović", "AP", ["Barista"], "mint"], ["Marko Jovanović", "MJ", ["Barista", "Konobar"], "blue"],
    ["Jelena Nikolić", "JN", ["Konobar"], "purple"], ["Luka Stojanović", "LS", ["Konobar"], "peach"],
    ["Milica Đorđević", "MĐ", ["Barista"], "pink"], ["Nikola Ilić", "NI", ["Konobar"], "yellow"],
    ["Sara Pavlović", "SP", ["Konobar"], "blue"], ["Stefan Marković", "SM", ["Barista", "Menadžer"], "purple"],
    ["Teodora Savić", "TS", ["Konobar"], "mint"], ["Vuk Popović", "VP", ["Konobar", "Menadžer"], "peach"]
  ];
  const employees: Employee[] = people.map(([name, initials, positions, color], i) => ({ id: `employee-${i + 1}`, name, initials, positions: positions as Employee["positions"], color, targetHours: 40, active: true, daysOff: i === 0 ? [1] : i === 2 ? [3] : [], preferredShift: i % 3 === 0 ? "morning" : undefined }));
  const w: Workspace = { name: "Kafe Central", employees,
    templates: [{ id: "morning", name: "Prva smena", start: "07:00", end: "15:00", color: "mint" }, { id: "evening", name: "Druga smena", start: "15:00", end: "23:00", color: "blue" }],
    rules: { minRestHours: 12, maxWeeklyHours: 40, restSeverity: "block", hoursSeverity: "block", allowMultiple: false },
    requirements: Array.from({ length: 7 }, (_, day) => ["morning", "evening"].flatMap(templateId => ([{ day, templateId, position: "Barista" as const, count: 1 }, { day, templateId, position: "Konobar" as const, count: 2 }]))).flat(), schedules: {} };
  const week = monday(); w.schedules[week] = generateSchedule(w, week); return w;
}
