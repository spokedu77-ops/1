import {describe,it,expect,vi,beforeEach} from 'vitest';
const state=vi.hoisted(()=>({user:{id:'audit-ordinary',email:'ordinary@example.invalid'} as any,row:null as any,institution:false,error:null as any}));
vi.mock('@/app/lib/supabase/server',()=>({createServerSupabaseClient:async()=>({auth:{getUser:async()=>({data:{user:state.user},error:null})},from:(table:string)=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:table==='users'?state.row:null,error:state.error})})})})})}));
vi.mock('next/headers',()=>({cookies:async()=>({getAll:()=>[]})}));
vi.mock('@/app/lib/server/institutionAccount',()=>({getMasterAccountType:async()=>({accountType:state.institution?'institution':'individual',error:null})}));
import {requireAdmin} from '../app/lib/server/adminAuth';
import {requireTeacherMaterialsAccess} from '../app/lib/server/teacherAuth';
import {GET as checkAdmin} from '../app/api/auth/check-admin/route';
beforeEach(()=>{process.env.NEXT_PUBLIC_SUPABASE_URL='http://127.0.0.1:9';process.env.SUPABASE_SERVICE_ROLE_KEY='audit-only-not-real';state.user={id:'audit-'+Math.random(),email:'ordinary@example.invalid'};state.row=null;state.institution=false;state.error=null});
describe('F12 real authorization with nonproduction read-only identity fixture',()=>{
it('SPOMOVE identity receives real administrator authorization and UI-only spomove scope',async()=>{state.user={id:'audit-spomove',email:'spomove@spokedu.com'};expect(await requireAdmin()).toMatchObject({ok:true});expect(await (await checkAdmin()).json()).toMatchObject({admin:true,scope:'spomove'})});
it('ordinary identity is rejected by real administrator authorization',async()=>{expect(await requireAdmin()).toMatchObject({ok:false,response:expect.objectContaining({status:403})})});
});
describe('F13 real Teacher authorization against fixture rows',()=>{
it('missing users row is allowed for authenticated noninstitution identity',async()=>{expect(await requireTeacherMaterialsAccess()).toMatchObject({ok:true})});
it('active users row is allowed',async()=>{state.row={is_active:true};expect(await requireTeacherMaterialsAccess()).toMatchObject({ok:true})});
it('inactive row is denied',async()=>{state.row={is_active:false};expect(await requireTeacherMaterialsAccess()).toMatchObject({ok:false,response:expect.objectContaining({status:403})})});
it('institution is denied',async()=>{state.institution=true;expect(await requireTeacherMaterialsAccess()).toMatchObject({ok:false,response:expect.objectContaining({status:403})})});
it('unauthenticated request is denied',async()=>{state.user=null;expect(await requireTeacherMaterialsAccess()).toMatchObject({ok:false,response:expect.objectContaining({status:401})})});
it('users lookup failure is denied',async()=>{state.error={message:'audit query failure'};expect(await requireTeacherMaterialsAccess()).toMatchObject({ok:false,response:expect.objectContaining({status:403})})});
});
