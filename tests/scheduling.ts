import assert from "node:assert/strict";
import { expandDemand, generate, replace, swap, validateSchedule, violation, type ScheduleInput } from "../src/lib/scheduling/engine";
import type { SetupData } from "../src/lib/types";

function fixture(kind: "hospitality" | "service" | "retail", count: number): ScheduleInput {
  const roles = [{ id: "front", workspace_id: "test", name: "Front" }, { id: "support", workspace_id: "test", name: "Support" }];
  const employees = Array.from({ length: count }, (_, i) => ({ id: `e${i}`, workspace_id: "test", display_name: `Employee ${i}`, active: true, target_hours: kind === "retail" ? 24 : 32, preference: "none" as const }));
  const shifts = [{ id: "early", workspace_id: "test", name: "Early", start_time: "08:00:00", end_time: "14:00:00" }, { id: "late", workspace_id: "test", name: "Late", start_time: "15:00:00", end_time: "21:00:00" }];
  const weekdays = kind === "service" ? [1,2,3,4,5] : [0,1,2,3,4,5,6];
  const requirements = weekdays.flatMap((weekday) => roles.flatMap((role) => shifts.map((shift) => ({ id: `${kind}-${weekday}-${role.id}-${shift.id}`, workspace_id: "test", role_id: role.id, shift_template_id: shift.id, weekday, local_date: null, required_count: count === 10 ? 1 : count === 25 ? 2 : 4 }))));
  const windows = employees.flatMap((employee) => Array.from({ length: 7 }, (_, weekday) => ({ id: `${employee.id}-${weekday}`, workspace_id: "test", employee_id: employee.id, weekday, start_time: "07:00:00", end_time: "22:00:00" })));
  const setup: SetupData = { roles, employees, shifts, windows, requirements, employeeRoles: employees.flatMap((e) => roles.map((r) => ({ workspace_id: "test", employee_id: e.id, role_id: r.id }))), exceptions: [], rules: { workspace_id: "test", max_weekly_hours: 48, max_daily_hours: 12, min_rest_hours: 11 } };
  return { weekStart: "2026-11-09", timezone: "Europe/Belgrade", setup, adjacent: [], existing: [] };
}

for (const kind of ["hospitality","service","retail"] as const) for (const count of [10,25,50]) {
  const input = fixture(kind,count);
  const result = generate(input,{maxNodes:5000});
  assert.equal(result.status,"complete",`${kind}/${count}: ${result.status} ${result.issues.length} gaps`);
  const hardViolations=validateSchedule(input,result.slots);
  assert.deepEqual(hardViolations,[]);
  assert.deepEqual(generate(input,{maxNodes:5000}).slots,result.slots,"reproducible generation");
  const lateByEmployee=new Map<string,number>();
  for (const slot of result.slots) if (slot.employeeId && slot.shiftId==="late") lateByEmployee.set(slot.employeeId,(lateByEmployee.get(slot.employeeId)??0)+1);
  const lateCounts=input.setup.employees.map((employee)=>lateByEmployee.get(employee.id)??0);
  console.log(`${kind}/${count}: ${result.slots.length} slots, ${(result.coverage*100).toFixed(0)}% coverage, ${hardViolations.length} hard violations, ${result.elapsedMs.toFixed(0)}ms, target deviation ${result.targetDeviation.toFixed(1)}h, late shift range ${Math.min(...lateCounts)}-${Math.max(...lateCounts)}`);
}
const input=fixture("service",10);
const slots=expandDemand(input);
const first=slots[0];
input.setup.exceptions.push({id:"partial",workspace_id:"test",employee_id:"e0",local_date:first.localDate,start_time:"10:00:00",end_time:"11:00:00",reason:null});
assert.match(String(generate(input,{maxNodes:5000}).status),/complete/);
assert.equal(violation(input,first,"e0",[]),"unavailable interval");
assert.equal(replace(input,slots,first.id,"e0").find((slot)=>slot.id===first.id)?.employeeId,"e0","manual replacement can override availability");
const filled=generate(input,{maxNodes:5000}).slots;
const a=filled[0], b=filled.find((s) => s.employeeId !== a.employeeId && s.start === a.start);
assert.ok(b);
const before=structuredClone(filled);
const changed=swap(input,filled,a.id,b.id);
assert.deepEqual(validateSchedule(input,changed,false),[],"manual swap does not apply generation rules");
assert.deepEqual(filled,before,"swap is atomic in memory");
const locked={...filled[0],locked:true};
assert.throws(() => replace(input,[locked,...filled.slice(1)],locked.id,"e1"),/Unlock/);
const invalid=generate({...input,existing:[{...locked,employeeId:"missing"}]});
assert.equal(invalid.status,"invalid");
assert.deepEqual(invalid.slots,[{...locked,employeeId:"missing"}]);
const cancelled=generate(input,{signal:AbortSignal.abort()});
assert.equal(cancelled.status,"cancelled");
const hard=fixture("service",10); const hardSlot=expandDemand(hard)[0];
assert.equal(violation(hard,hardSlot,"missing",[]),"inactive or missing employee");
hard.setup.employees[0].active=false;
assert.equal(violation(hard,hardSlot,"e0",[]),"inactive or missing employee");
assert.equal(replace(hard,[hardSlot],hardSlot.id,"e0")[0].employeeId,"e0","manual replacement overrides scheduling rules");
hard.setup.employees[0].active=true;
hard.setup.employeeRoles=hard.setup.employeeRoles.filter((r)=>r.employee_id!=="e0");
assert.equal(violation(hard,hardSlot,"e0",[]),null,"role labels do not restrict active employees");
assert.equal(violation(hard,hardSlot,"e0",[{...hardSlot,id:"overlap",employeeId:"e0"}]),"overlap");
hard.setup.rules!.max_daily_hours=5;
assert.equal(violation(hard,hardSlot,"e0",[]),"daily hour limit");
hard.setup.rules!.max_daily_hours=12; hard.setup.rules!.max_weekly_hours=5;
assert.equal(violation(hard,hardSlot,"e0",[]),"weekly hour limit");
hard.setup.rules!.max_weekly_hours=48; hard.setup.rules!.min_rest_hours=0;
assert.equal(violation(hard,hardSlot,"e0",[{...hardSlot,id:"touching",start:hardSlot.end,end:hardSlot.end+3600000,employeeId:"e0"}]),null,"half-open endpoint allowed");
// A two-slot exhaustive oracle catches a greedy dead end: the second slot has one candidate.
const oracleInput=fixture("service",10);
oracleInput.setup.requirements=oracleInput.setup.requirements.filter((r)=>r.weekday===1 && r.role_id==="front");
oracleInput.setup.shifts=[{id:"early",workspace_id:"test",name:"Early",start_time:"08:00:00",end_time:"14:00:00"},{id:"late",workspace_id:"test",name:"Late",start_time:"15:00:00",end_time:"21:00:00"}];
oracleInput.setup.employeeRoles=oracleInput.setup.employeeRoles.filter((r)=>["e0","e1"].includes(r.employee_id));
oracleInput.setup.windows=oracleInput.setup.windows.filter((w)=>["e0","e1"].includes(w.employee_id));
oracleInput.setup.exceptions.push({id:"restrict",workspace_id:"test",employee_id:"e1",local_date:"2026-11-09",start_time:"15:00:00",end_time:"21:00:00",reason:null});
const tiny=expandDemand(oracleInput);
const exhaustive=(model:ScheduleInput, demand:typeof tiny, index:number, assigned:typeof tiny):boolean=>index===demand.length || model.setup.employees.some((employee)=>!violation(model,demand[index],employee.id,assigned) && exhaustive(model,demand,index+1,[...assigned,{...demand[index],employeeId:employee.id}]));
assert.equal(exhaustive(oracleInput,tiny,0,[]),true);
assert.equal(generate(oracleInput,{maxNodes:100}).status,"complete");
const impossible=structuredClone(oracleInput);
impossible.setup.windows=impossible.setup.windows.filter((w)=>w.employee_id==="e0");
impossible.setup.employees=impossible.setup.employees.filter((e)=>e.id==="e0");
assert.equal(exhaustive(impossible,expandDemand(impossible),0,[]),false);
const incomplete=generate(impossible,{maxNodes:5000});
assert.equal(incomplete.status,"incomplete");
assert.ok(incomplete.issues.length>0);
assert.equal(generate(impossible,{maxNodes:1}).status,"limit");
console.log(`unresolved fixtures: proven tiny exhaustive infeasible = 1, bounded search limit = 1`);
const cancelledSlot={...tiny[0],employeeId:null,cancelled:true};
const withCancelled=generate({...oracleInput,existing:tiny.map((slot)=>({...slot,employeeId:null,cancelled:true}))},{maxNodes:100});
assert.equal(withCancelled.status,"complete");
assert.equal(withCancelled.slots.find((slot)=>slot.id===cancelledSlot.id)?.cancelled,true);
assert.equal(withCancelled.slots.find((slot)=>slot.id===cancelledSlot.id)?.employeeId,null);
const overnight=fixture("service",10);
overnight.setup.requirements=[{...overnight.setup.requirements[0],id:"night-demand",weekday:1,shift_template_id:"night"}];
overnight.setup.shifts=[{id:"night",workspace_id:"test",name:"Night",start_time:"22:00:00",end_time:"06:00:00"}];
overnight.setup.employeeRoles=overnight.setup.employeeRoles.filter((r)=>r.employee_id==="e0");
overnight.setup.windows=[{id:"monday",workspace_id:"test",employee_id:"e0",weekday:1,start_time:"21:00:00",end_time:"24:00:00"},{id:"tuesday",workspace_id:"test",employee_id:"e0",weekday:2,start_time:"00:00:00",end_time:"07:00:00"}];
const night=expandDemand(overnight)[0];
assert.equal(violation(overnight,night,"e0",[]),null);
overnight.adjacent=[{...night,id:"prior",start:night.start-8*3600000,end:night.start-2*3600000,employeeId:"e0"}];
assert.equal(violation(overnight,night,"e0",[]),"minimum rest");
const spring=fixture("service",10); spring.weekStart="2026-03-23"; spring.setup.requirements=[{...spring.setup.requirements[0],id:"spring",weekday:0,shift_template_id:"dst"}]; spring.setup.shifts=[{id:"dst",workspace_id:"test",name:"DST",start_time:"02:30:00",end_time:"04:00:00"}];
assert.throws(()=>expandDemand(spring),/multiple instants|no such instant|ambiguous/i);
const autumn={...spring,weekStart:"2026-10-19"};
assert.throws(()=>expandDemand(autumn),/multiple instants|no such instant|ambiguous/i);
console.log("PASS: constraints, partial absence, swap, locks, cancel and reproducibility");

// Availability is the only automatic constraint allowed to soften on the second pass.
const fallback=fixture("service",10);
fallback.setup.employees=fallback.setup.employees.slice(0,3);
fallback.setup.requirements=fallback.setup.requirements.filter((r)=>r.weekday===1 && r.role_id==="front");
fallback.setup.windows=fallback.setup.windows.filter((w)=>w.employee_id==="e0");
// Both shifts can be covered, but the rest rule needs two people; at least one deviation.
const softened=generate(fallback,{maxNodes:5000});
assert.equal(softened.status,"complete");
assert.equal(softened.generationMode,"availability_override");
assert.equal(softened.deviations,1);
assert.deepEqual(validateSchedule(fallback,softened.slots,true,true),[]);
const minimumPenalty=(model:ScheduleInput,index=0,assigned:typeof tiny=[]):number=>{
  const demand=expandDemand(model);
  if(index===demand.length) return assigned.reduce((n,s)=>n+(violation(model,s,s.employeeId!,[])==="unavailable interval"?1:0),0);
  return Math.min(Infinity,...model.setup.employees.filter((e)=>!violation(model,demand[index],e.id,assigned,undefined,true)).map((e)=>minimumPenalty(model,index+1,[...assigned,{...demand[index],employeeId:e.id}])));
};
assert.equal(softened.deviations,minimumPenalty(fallback),"fallback matches exhaustive minimum deviation oracle");
const worseComplete=expandDemand(fallback).map((s,i)=>({...s,employeeId:`e${i+1}`}));
assert.deepEqual(validateSchedule(fallback,worseComplete,true,true),[]);
assert.equal(worseComplete.filter((s)=>violation(fallback,s,s.employeeId!,[])==="unavailable interval").length,2,"another valid complete solution has more deviations");
const one=structuredClone(fallback);
one.setup.employees=one.setup.employees.slice(0,1);
one.setup.requirements=one.setup.requirements.slice(0,1);
for(const variant of ["weekly","whole","partial"] as const) {
  const model=structuredClone(one);
  if(variant==="weekly") model.setup.windows=[];
  else model.setup.exceptions=[{id:variant,workspace_id:"test",employee_id:"e0",local_date:"2026-11-09",start_time:variant==="whole"?null:"10:00:00",end_time:variant==="whole"?null:"11:00:00",reason:"PRIVATE"}];
  const original=structuredClone(model.setup);
  const result=generate(model,{maxNodes:100});
  assert.equal(result.status,"complete",variant);
  assert.equal(result.deviations,1,variant);
  assert.equal(result.generationMode,"availability_override");
  assert.deepEqual(model.setup,original,"generation preserves original availability and absences");
  const lock={...result.slots[0],locked:true};
  const lockedResult=generate({...model,existing:[lock]},{maxNodes:100});
  assert.equal(lockedResult.status,"complete");
  assert.equal(lockedResult.generationMode,"availability_override");
  assert.deepEqual(lockedResult.slots,[lock]);
}
const strict=generate(one,{maxNodes:100});
assert.equal(strict.deviations,0);assert.equal(strict.generationMode,"strict");
const tooMany=structuredClone(fallback);tooMany.setup.employees=tooMany.setup.employees.slice(0,1);tooMany.setup.windows=[];
assert.equal(generate(tooMany,{maxNodes:5000}).status,"incomplete","rest remains mandatory even with no availability");
assert.equal(generate(tooMany,{maxNodes:1}).status,"limit");
for(const kind of ["max_daily_hours","max_weekly_hours"] as const) {
  const limited=structuredClone(one);limited.setup.windows=[];limited.setup.rules![kind]=1;
  const result=generate(limited,{maxNodes:100});assert.equal(result.status,"incomplete");assert.match(result.issues[0].reason,/maksimum sati/);
}
const nightOverride=structuredClone(overnight);nightOverride.setup.employees=nightOverride.setup.employees.slice(0,1);nightOverride.setup.windows=[];nightOverride.adjacent=[];
assert.equal(generate(nightOverride,{maxNodes:100}).status,"complete","overnight fallback covers both local dates");
nightOverride.adjacent=[{...night,id:"adjacent",employeeId:"e0",start:night.start-8*3600000,end:night.start-2*3600000}];
assert.equal(generate(nightOverride,{maxNodes:100}).status,"incomplete","adjacent rest still applies");
const overlapOverride=structuredClone(one);overlapOverride.setup.windows=[];
overlapOverride.setup.requirements[0].required_count=2;
assert.equal(generate(overlapOverride,{maxNodes:100}).coverage,.5,"no duplicated simultaneous assignment");
console.log("PASS: strict-first fallback, three absence types, exact tiny deviation oracle, locks, overnight, adjacent rest, hours, overlap and honest limits");
