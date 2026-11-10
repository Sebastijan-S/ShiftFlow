export type Workspace = { id: string; owner_user_id: string; name: string; timezone: string; setup_revision: number };
export type Role = { id: string; workspace_id: string; name: string };
export type Employee = { id: string; workspace_id: string; display_name: string; active: boolean; target_hours: number; preference: "none" | "early" | "late" };
export type EmployeeRole = { workspace_id: string; employee_id: string; role_id: string };
export type ShiftTemplate = { id: string; workspace_id: string; name: string; start_time: string; end_time: string };
export type AvailabilityWindow = { id: string; workspace_id: string; employee_id: string; weekday: number; start_time: string; end_time: string };
export type AvailabilityException = { id: string; workspace_id: string; employee_id: string; local_date: string; start_time: string | null; end_time: string | null; reason: string | null };
export type StaffingRequirement = { id: string; workspace_id: string; role_id: string; shift_template_id: string; weekday: number | null; local_date: string | null; required_count: number };
export type SchedulingRules = { workspace_id: string; max_weekly_hours: number; max_daily_hours: number; min_rest_hours: number };
export type SetupData = { roles: Role[]; employees: Employee[]; employeeRoles: EmployeeRole[]; shifts: ShiftTemplate[]; windows: AvailabilityWindow[]; exceptions: AvailabilityException[]; requirements: StaffingRequirement[]; rules: SchedulingRules | null };

export const weekdays = ["Nedelja", "Ponedeljak", "Utorak", "Sreda", "Četvrtak", "Petak", "Subota"];
