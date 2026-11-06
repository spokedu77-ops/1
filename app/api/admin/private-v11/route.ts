import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { MASTER_EMAIL } from '@/app/lib/constants/admin';
import { asSnapshot, toEnrollmentRow, toLogRow } from '@/app/admin/centers/private-v11/codec';
import { isRecord, uuid, validDay, validEnrollment, validLog, validUnit } from '@/app/admin/centers/private-v11/validation';
import { getLastClassDate } from '@/app/admin/centers/private-v11/core';
import type { Enrollment, LessonLog } from '@/app/admin/centers/private-v11/types';

export const dynamic = 'force-dynamic';
const json = (payload: unknown, status=200) => {
  const res=NextResponse.json(payload,{status});res.headers.set('Cache-Control','private, no-store, max-age=0');return res;
};
const master = (email:string|null):boolean=>email?.toLowerCase()===MASTER_EMAIL;
const tableMap = { enrollment:'admin_private_enrollments',log:'admin_private_logs',unit:'admin_private_units' } as const;
type Entity = keyof typeof tableMap;
async function authorize() {
  const a=await requireAdmin();
  return !a.ok ? {ok:false as const,response:a.response} : !master(a.email) ? {ok:false as const,response:json({error:'MASTER_ONLY'},403)} : {ok:true as const};
}
function handleError(error: {code?:string;message?:string}|null) {
  const message=String(error?.message||'');
  if(/REVISION_CONFLICT|REVISION_REQUIRED/.test(message))return json({error:'다른 곳에서 변경된 자료입니다. 새로고침 후 다시 확인해 주세요.',code:'REVISION_CONFLICT'},409);
  if(/SHARED_GUARDIAN_EDIT_REQUIRES_CONFIRMATION/.test(message))return json({error:'다른 수강생과 연결된 보호자입니다. 공동 정보는 자동 변경하지 않습니다.',code:'SHARED_GUARDIAN'},409);
  if(/INVALID_|GUARDIAN_NOT_/.test(message)||error?.code==='23514'||error?.code==='23503')return json({error:'입력값 또는 연결된 자료를 확인해 주세요.',code:'INVALID_DATA'},400);
  if(error?.code==='42P01'||error?.code==='42883')return json({error:'개인 수업 운영 DB가 아직 적용되지 않았습니다. 운영 마이그레이션 승인 후 사용할 수 있습니다.',code:'SCHEMA_NOT_APPLIED'},503);
  return json({error:'개인 수업 데이터를 처리하지 못했습니다.',code:'SERVER_ERROR'},500);
}

export async function GET(){
  const a=await authorize(); if(!a.ok)return a.response;
  try {
    const db=getServiceSupabase();
    const [u,g,l,e,r]=await Promise.all([
      db.from('admin_private_units').select('*').order('created_at',{ascending:true}).limit(1000),
      db.from('admin_private_guardians').select('*').order('created_at',{ascending:true}).limit(1000),
      db.from('admin_private_unit_guardians').select('*').order('position').limit(1000),
      db.from('admin_private_enrollments').select('*').order('enrolled_at',{ascending:false}).limit(1000),
      db.from('admin_private_logs').select('*').order('date',{ascending:false}).limit(1000),
    ]);
    const error=u.error??g.error??l.error??e.error??r.error;
    if(error)return handleError(error);
    // Fail closed rather than silently truncating a list at the PostgREST row limit.
    if([u,g,l,e,r].some(x=>(x.data??[]).length===1000))return json({error:'조회 범위가 1000건에 도달했습니다. 안전한 페이지네이션 전까지 전체 데이터로 취급하지 않습니다.',code:'PAGINATION_REQUIRED'},409);
    const data=asSnapshot({units:u.data??[],guardians:g.data??[],links:l.data??[],enrollments:e.data??[],logs:r.data??[]});
    data.units=data.units.map(unit=>({...unit,lastClassDate:getLastClassDate(unit.id,data.logs)}));
    return json({data});
  }catch{return json({error:'개인 수업 DB 조회에 실패했습니다.',code:'SERVER_ERROR'},500);}
}

const guardianParam=(x:unknown) => {
  if(!isRecord(x)) return null;
  const mode=x.mode;
  if(!['keep','clear','new','existing','edit'].includes(String(mode)))return null;
  if(mode==='new'&&!(typeof x.phone==='string'&&typeof x.relation==='string'))return null;
  if(mode==='existing'&&!uuid(x.guardianId))return null;
  if(mode==='edit'&&(!uuid(x.guardianId)||typeof x.revision!=='number'||typeof x.phone!=='string'||typeof x.relation!=='string'))return null;
  return x;
};
export async function POST(request:Request){
  const a=await authorize();if(!a.ok)return a.response;
  let body:Record<string,unknown>;
  try{const raw:unknown=await request.json();if(!isRecord(raw))return json({error:'INVALID_BODY'},400);body=raw;}catch{return json({error:'INVALID_BODY'},400);}
  const action=body.action;
  const db=getServiceSupabase();
  try {
    if(action==='saveUnit'){
      const unit=body.unit;
      const guardian=guardianParam(body.guardian);
      if(!validUnit(unit)||!guardian||!isRecord(unit))return json({error:'INVALID_UNIT'},400);
      const add=body.addEnrollments??[];const cancel=body.cancelEnrollments??[];
      if(!Array.isArray(add)||!Array.isArray(cancel)||add.some(x=>!isRecord(x)||!Number.isInteger(x.sessions)||Number(x.sessions)<1||!Number.isInteger(x.amount)||Number(x.amount)<0||!validDay(x.enrolledAt)||![x.paidAt,x.nextDueDate,x.expiresAt].every(v=>v==null||v===''||validDay(v)))||cancel.some(x=>!isRecord(x)||!uuid(x.id)||!Number.isInteger(x.revision)||Number(x.revision)<1))return json({error:'INVALID_ENROLLMENT'},400);
      const id=unit.id;
      if(id&&(!uuid(id)||!Number.isInteger(unit.revision)||Number(unit.revision)<1))return json({error:'INVALID_REVISION'},400);
      const gd=guardian.mode==='new'||guardian.mode==='edit' ? {relation:guardian.relation,phone:guardian.phone,revision:guardian.revision??null} : {};
      const {data,error}=await db.rpc('admin_private_save_unit',{p_id:id||null,p_data:unit,p_expected_revision:id?unit.revision:null,p_guardian_mode:guardian.mode,p_guardian_id:guardian.guardianId||null,p_guardian_data:gd,p_add_enrollments:add,p_cancel_enrollments:cancel});
      if(error)return handleError(error);
      return json({ok:true,result:data});
    }
    if(action==='saveEnrollment'||action==='saveLog'){
      const enrollment=action==='saveEnrollment';const input=body.value;
      if(!(enrollment?validEnrollment(input):validLog(input)))return json({error:'INVALID_DATA'},400);
      const entity:Entity=enrollment?'enrollment':'log';
      const row=enrollment?toEnrollmentRow(input as Enrollment):toLogRow(input as LessonLog);
      const item=input as Enrollment|LessonLog;
      if(item.id){
        if(!uuid(item.id)||!Number.isInteger(item.revision)||item.revision<1)return json({error:'INVALID_REVISION'},400);
        const result=await db.from(tableMap[entity]).update({...row,revision:item.revision+1,updated_at:new Date().toISOString()}).eq('id',item.id).eq('revision',item.revision).select('id,revision').maybeSingle();
        if(result.error)return handleError(result.error);
        if(!result.data)return json({error:'자료가 변경되었습니다.',code:'REVISION_CONFLICT'},409);
        return json({ok:true,result:result.data});
      }
      const result=await db.from(tableMap[entity]).insert(row).select('id,revision').single();
      if(result.error)return handleError(result.error);
      return json({ok:true,result:result.data});
    }
    if(action==='softDelete'||action==='restore'||action==='markSent'){
      const entity=body.entity;
      if(!['unit','log'].includes(String(entity))||!uuid(body.id)||!Number.isInteger(body.revision)||Number(body.revision)<1)return json({error:'INVALID_REQUEST'},400);
      if(action==='markSent'&&entity!=='log')return json({error:'INVALID_REQUEST'},400);
      const table=tableMap[entity as 'unit'|'log'];
      const field=action==='markSent'?'sent_at':'deleted_at';
      const value=action==='restore'?null:new Date().toISOString();
      const result=await db.from(table).update({[field]:value,revision:Number(body.revision)+1,updated_at:new Date().toISOString()}).eq('id',body.id).eq('revision',body.revision).select('id,revision').maybeSingle();
      if(result.error)return handleError(result.error);
      if(!result.data)return json({error:'자료가 변경되었습니다.',code:'REVISION_CONFLICT'},409);
      return json({ok:true,result:result.data});
    }
    // Permanent delete and bulk import are intentionally gated until their data-retention policy is approved.
    if(action==='purge'||action==='restoreBackup')return json({error:'영구 삭제·전체 복원은 별도 정책 승인 전 실행할 수 없습니다.',code:'POLICY_APPROVAL_REQUIRED'},423);
    return json({error:'지원하지 않는 작업입니다.'},400);
  }catch{return json({error:'저장 작업이 완료되지 않았습니다.',code:'SERVER_ERROR'},500);}
}
