import assert from "node:assert/strict";
import { addDate, localInstant, replace, swap, validateSchedule, type ScheduleInput, type Slot } from "../src/lib/scheduling/engine";
import { scheduleWarnings } from "../src/lib/scheduling/warnings";

const setup: ScheduleInput["setup"] = {
  employees: ["Cal","Bea"].map((display_name)=>({id:display_name,workspace_id:"w",display_name,active:true,target_hours:40,preference:"none"})),
  windows: ["Cal","Bea"].flatMap((employee_id)=>Array.from({length:7},(_,weekday)=>({id:`${employee_id}-${weekday}`,workspace_id:"w",employee_id,weekday,start_time:"00:00:00",end_time:"24:00:00"}))),
  roles:[], shifts:[], requirements:[], employeeRoles:[], exceptions:[], rules:{workspace_id:"w",min_rest_hours:0,max_daily_hours:24,max_weekly_hours:168},
};
const input: ScheduleInput={weekStart:"2026-11-09",timezone:"Europe/Belgrade",setup,adjacent:[],existing:[]};
const slot=(id:string, day:string, from:string, to:string, next=false):Slot=>({id,localDate:day,start:localInstant(day,from,input.timezone),end:localInstant(next ? addDate(day,1) : day,to,input.timezone),employeeId:"Cal",roleId:"r",shiftId:"s",locked:false});
const a=slot("a","2026-11-09","09:00","12:00"), b=slot("b","2026-11-09","15:00","18:00");
assert.deepEqual(scheduleWarnings(input,[a]),[]);
assert.deepEqual(scheduleWarnings(input,[a,b]).map((w)=>w.kind),["multiple_shifts"]);
assert.equal(validateSchedule(input,[a,b]).length,0,"advisory multiple shift rule does not harden generator");
assert.equal(scheduleWarnings(input,[a,{...b,cancelled:true}]).length,0);
assert.equal(scheduleWarnings(input,[a,{...b,employeeId:null}]).length,0);
const absence={id:"absence",workspace_id:"w",employee_id:"Cal",local_date:"2026-11-09",start_time:null,end_time:null,reason:"PRIVATE medical detail"};
const withAbsence={...input,setup:{...setup,exceptions:[absence]}};
const absent=scheduleWarnings(withAbsence,[a,b]);
assert.equal(absent.filter((w)=>w.kind==="absence").length,1,"absence deduplicates across cards");
assert.equal(absent.find((w)=>w.kind==="absence")?.slotIds.length,2);
assert.equal(JSON.stringify(absent).includes("PRIVATE"),false);
assert.equal(absent.some((w)=>w.kind==="weekly_unavailable"),false,"absence and recurring availability are independent");
const partial={...absence,start_time:"11:00",end_time:"13:00"};
assert.equal(scheduleWarnings({...input,setup:{...setup,exceptions:[partial]}},[a,b]).filter((w)=>w.kind==="absence").length,1);
assert.equal(scheduleWarnings({...input,setup:{...setup,exceptions:[{...partial,start_time:"12:00",end_time:"15:00"}]}},[a,b]).some((w)=>w.kind==="absence"),false,"half-open absence boundaries");
const restricted={...input,setup:{...setup,windows:[],exceptions:[absence],employees:setup.employees.map((e)=>({...e,active:false})),rules:{...setup.rules!,min_rest_hours:11,max_daily_hours:4,max_weekly_hours:4}}};
const kinds=new Set(scheduleWarnings(restricted,[a,b,slot("c","2026-11-09","11:00","16:00")]).map((w)=>w.kind));
for(const kind of ["inactive","absence","weekly_unavailable","multiple_shifts","overlap","rest","daily_hours","weekly_hours"]) assert.ok(kinds.has(kind as never),kind);
const night=slot("night","2026-11-09","22:00","02:00",true), midnight=slot("midnight","2026-11-09","20:00","00:00",true), tuesday=slot("tue","2026-11-10","01:00","03:00");
assert.equal(scheduleWarnings(input,[night]).length,0,"one overnight shift is not a duplicate");
assert.ok(scheduleWarnings(input,[night,tuesday]).some((w)=>w.kind==="multiple_shifts"));
assert.equal(scheduleWarnings(input,[midnight,tuesday]).length,0,"midnight end does not count in next day");
const adjacent=slot("previous","2026-11-08","23:00","10:00",true);
assert.ok(scheduleWarnings({...input,adjacent:[adjacent]},[a]).some((w)=>w.kind==="overlap"));
assert.ok(scheduleWarnings({...restricted,adjacent:[{...adjacent,cancelled:true}]},[a]).every((w)=>!w.slotIds.includes(adjacent.id)),"cancelled adjacent assignment ignored");
const before=[a,{...b,employeeId:"Bea"}];
const replaced=replace(input,before,"b","Cal");
assert.deepEqual(replaced.map(({start,end,localDate})=>({start,end,localDate})),before.map(({start,end,localDate})=>({start,end,localDate})));
assert.ok(scheduleWarnings(input,replaced).some((w)=>w.kind==="multiple_shifts"));
assert.equal(scheduleWarnings(input,before).length,0,"undo recomputes clean schedule");
const swapped=swap(withAbsence,before,"a","b");
assert.equal(scheduleWarnings(withAbsence,swapped).find((w)=>w.kind==="absence")?.slotIds[0],"b","swap recomputes both sides");
for(const [week,day,hours] of [["2026-03-23","2026-03-29",3],["2026-10-19","2026-10-25",5]] as const) {
  const dst=slot(`dst-${day}`,day,"00:00","04:00");
  assert.equal((dst.end-dst.start)/3600000,hours);
  assert.equal(scheduleWarnings({...input,weekStart:week},[dst]).length,0);
  const limit={...input,weekStart:week,setup:{...setup,rules:{...setup.rules!,max_daily_hours:hours-1}}};
  assert.ok(scheduleWarnings(limit,[dst]).some((w)=>w.kind==="daily_hours"),"actual DST duration used");
}
const invalid={...input,setup:{...setup,windows:[{...setup.windows[0],employee_id:"Cal",weekday:0,start_time:"02:30",end_time:"03:30"}]},weekStart:"2026-03-23"};
assert.ok(scheduleWarnings(invalid,[slot("dst-invalid","2026-03-29","00:00","04:00")]).some((w)=>w.kind==="invalid_time"));
console.log("PASS: advisory warnings, all causes, privacy, half-open absence, midnight/overnight, adjacent/cancelled, swap/undo, DST actual hours");
