import { chromium } from '@playwright/test';

export const base=process.env.SHIFTFLOW_TEST_URL ?? 'http://localhost:3001';
export const week='2026-11-09';
export async function uiFixture() {
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:900},locale:'sr-Latn-RS'});
  const userId='11111111-1111-4111-8111-111111111111', workspaceId='22222222-2222-4222-8222-222222222222';
  const user={id:userId,email:'fixture@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email',providers:['email']},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
  const jwt=(data)=>Buffer.from(JSON.stringify(data)).toString('base64url');
  const token=`${jwt({alg:'HS256',typ:'JWT'})}.${jwt({sub:userId,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600,iat:Math.floor(Date.now()/1000),aud:'authenticated'})}.fixture`;
  const workspace={id:workspaceId,owner_user_id:userId,name:'Fixture Team',timezone:'Europe/Belgrade',setup_revision:10};
  const roles=[{id:'r',workspace_id:workspaceId,name:'Service'},{id:'r2',workspace_id:workspaceId,name:'Podrška'}];
  const employees=['Ari','Bea','Cal',...Array.from({length:297},(_,i)=>`Radnik ${String(i+1).padStart(3,'0')}`)].map((display_name,i)=>({id:`e${i}`,workspace_id:workspaceId,display_name,active:i<3,target_hours:8,preference:'none'}));
  const shifts=[{id:'morning',workspace_id:workspaceId,name:'Jutarnja',start_time:'09:00:00',end_time:'13:00:00'},{id:'evening',workspace_id:workspaceId,name:'Popodnevna',start_time:'15:00:00',end_time:'19:00:00'}];
  const requirements=shifts.map((s,i)=>({id:`need${i}`,workspace_id:workspaceId,role_id:roles[0].id,shift_template_id:s.id,weekday:1,local_date:null,required_count:1}));
  const tables={roles,employees,shift_templates:shifts,staffing_requirements:requirements,employee_roles:[],availability_windows:employees.filter((e)=>e.active).flatMap((e)=>Array.from({length:7},(_,weekday)=>({id:`${e.id}-${weekday}`,workspace_id:workspaceId,employee_id:e.id,weekday,start_time:'08:00:00',end_time:'20:00:00'}))),availability_exceptions:[],scheduling_rules:[{workspace_id:workspaceId,max_weekly_hours:48,max_daily_hours:12,min_rest_hours:11}]};
  const state={revision:1,publishedRevision:null,slots:requirements.map((r,i)=>({id:`${week}:${r.id}:0`,local_date:week,role_id:r.role_id,shift_id:r.shift_template_id,employee_id:employees[i].id,locked:false,cancelled:false})),operations:[],linkCalls:[],link:null,linkMode:'success',saveMode:'success',deleteMode:'success',workspaceless:false,published:null};
  const errors=[];let inserted=0;
  // All Supabase traffic is intercepted at context level, including other tabs.
  // Unknown writes fail closed, so fixture tests cannot modify a hosted project.
  const handleRoute=async(route)=>{
    const request=route.request(),url=new URL(request.url()),path=url.pathname;
    const json=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
    if(path==='/auth/v1/token') return json({access_token:token,refresh_token:'fixture-refresh',expires_in:3600,token_type:'bearer',user});
    if(path==='/auth/v1/user') return json(user);
    if(path==='/auth/v1/logout') return json({});
    if(path==='/rest/v1/workspaces' && request.method()==='GET') return state.workspaceless ? json(null) : json(workspace);
    if(path==='/rest/v1/schedule_weeks') return json(state.revision?[{id:'fixture-week',week_start:week,revision:state.revision,published_revision:state.publishedRevision}]:[]);
    if(path==='/rest/v1/assignments') return json(state.slots.map((s)=>({week_id:'fixture-week',slot_key:s.id,local_date:s.local_date,role_id:s.role_id,shift_template_id:s.shift_id,starts_at:`${s.local_date}T${s.shift_id==='morning'?'08':'14'}:00:00Z`,ends_at:`${s.local_date}T${s.shift_id==='morning'?'12':'18'}:00:00Z`,employee_id:s.employee_id,locked:s.locked,cancelled:s.cancelled})));
    if(path==='/rest/v1/rpc/save_schedule') {
      const body=request.postDataJSON();state.operations.push(body);
      await new Promise((resolve)=>setTimeout(resolve,100));
      if(state.saveMode==='fail') return json({code:'40001',message:'Fixture konflikt revizije'},409);
      state.slots=body.p_slots;state.revision++;return json(state.revision);
    }
    if(path==='/rest/v1/rpc/publish_schedule') { state.publishedRevision=state.revision; state.published=state.slots.filter((s)=>!s.cancelled&&s.employee_id).map((s)=>({date:s.local_date,start:`${s.local_date}T08:00:00Z`,end:`${s.local_date}T12:00:00Z`,employee:employees.find((e)=>e.id===s.employee_id)?.display_name,role:'Service'}));return json(state.revision); }
    if(path==='/rest/v1/rpc/rotate_team_link') {
      const body=request.postDataJSON();state.linkCalls.push(body);
      await new Promise((resolve)=>setTimeout(resolve,150));
      if(state.linkMode==='reject') return json({code:'42501',message:'Forbidden'},403);
      state.link=body.p_token;
      if(state.linkMode==='lost') return route.abort('failed');
      return json(null);
    }
    if(path==='/rest/v1/rpc/revoke_team_link') { state.link=null; return json(null); }
    if(path==='/rest/v1/rpc/read_team_week') return json(request.postDataJSON().p_token===state.link && state.published ? {weekStart:week,timezone:workspace.timezone,assignments:state.published,publishedAt:'2026-11-12T12:00:00Z'} : null);
    const table=path.split('/').at(-1);
    if(path.startsWith('/rest/v1/') && tables[table]) {
      if(request.method()==='GET') return json(tables[table]);
      if(request.method()==='POST') {const body=request.postDataJSON();const array=Array.isArray(body);const added=(array?body:[body]).map((row,i)=>({...row,id:`added-${table}-${++inserted}-${i}`}));tables[table].push(...added);return json(array?added:added[0],201);}
      if(request.method()==='DELETE') {
        if(state.deleteMode==='fail') return json({code:'23503',message:'Fixture brisanje nije uspelo'},409);
        const id=url.searchParams.get('id')?.replace(/^eq\./,'');tables[table]=tables[table].filter((row)=>row.id!==id);return json(null);
      }
    }
    if(request.method()!=='GET') throw new Error(`Unhandled fixture write: ${path}`);
    return json([]);
  };
  await context.route('https://*.supabase.co/**',handleRoute);
  const page=await context.newPage();page.on('pageerror',(error)=>errors.push(error.message));
  await page.clock.setFixedTime(new Date('2026-11-12T12:00:00Z'));
  const login=async()=>{await page.goto(base,{waitUntil:'networkidle'});await page.getByLabel('Email adresa').fill('fixture@example.invalid');await page.getByLabel('Lozinka').fill('fixture-password');await page.getByRole('button',{name:'Prijavi se',exact:true}).click();await page.getByRole('button',{name:'Generiši',exact:true}).waitFor();};
  return {browser,context,page,workspace,tables,state,errors,login,handleRoute,user,token};
}
