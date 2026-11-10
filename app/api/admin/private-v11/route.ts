import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { isKnownPlatformAdminEmail } from '@/app/lib/auth/platformAdminIdentity';
import { asSnapshot, toEnrollmentRow, toLogRow } from '@/app/admin/centers/private-v11/codec';
import { isRecord, uuid, validDay, validEnrollment, validLog, validUnit } from '@/app/admin/centers/private-v11/validation';
import { getLastClassDate } from '@/app/admin/centers/private-v11/core';
import type { Enrollment, LessonLog } from '@/app/admin/centers/private-v11/types';
import { isClassOpsSelectableTeacher } from '@/app/admin/classes/lib/classOpsTeacherSelection';
import { fetchTeacherLogCounts } from '@/app/admin/users/fetchTeacherLogCounts';
import { cloneTierFeeMap } from '@/app/lib/teacherTierSchedule';
import { resolveDefaultSessionPrice } from '@/app/admin/classes/lib/bulkSessionDefaults';
import { getPrivateSchedules } from '@/app/admin/centers/private-v11/core';

export const dynamic = 'force-dynamic';
const json = (payload: unknown, status=200) => {
  const res=NextResponse.json(payload,{status});res.headers.set('Cache-Control','private, no-store, max-age=0');return res;
};
const tableMap = { enrollment:'admin_private_enrollments',log:'admin_private_logs',unit:'admin_private_units' } as const;
type Entity = keyof typeof tableMap;
async function authorize() {
  const a=await requireAdmin();
  return !a.ok ? {ok:false as const,response:a.response} : !isKnownPlatformAdminEmail(a.email) ? {ok:false as const,response:json({error:'ADMIN_ONLY'},403)} : {ok:true as const};
}
function handleError(error: {code?:string;message?:string}|null) {
  const message=String(error?.message||'');
  if(/REVISION_CONFLICT|REVISION_REQUIRED/.test(message))return json({error:'다른 곳에서 변경된 자료입니다. 새로고침 후 다시 확인해 주세요.',code:'REVISION_CONFLICT'},409);
  if(/SHARED_GUARDIAN_EDIT_REQUIRES_CONFIRMATION/.test(message))return json({error:'다른 수강생과 연결된 보호자입니다. 공동 정보는 자동 변경하지 않습니다.',code:'SHARED_GUARDIAN'},409);
  if(/INVALID_|GUARDIAN_NOT_/.test(message)||error?.code==='23514'||error?.code==='23503')return json({error:'입력값 또는 연결된 자료를 확인해 주세요.',code:'INVALID_DATA'},400);
  if(error?.code==='42P01'||error?.code==='42883')return json({error:'개인 수업 운영 DB가 아직 적용되지 않았습니다. 운영 마이그레이션 승인 후 사용할 수 있습니다.',code:'SCHEMA_NOT_APPLIED'},503);
  return json({error:'개인 수업 데이터를 처리하지 못했습니다.',code:'SERVER_ERROR'},500);
}

export async function GET(request: Request){
  const a=await authorize(); if(!a.ok)return a.response;
  try {
    const db=getServiceSupabase();
    if (new URL(request.url).searchParams.get('scope') === 'settlement-import') {
      const result = await db.from('admin_private_units')
        .select('id,name,class_type,coach,coach_id,status,neighborhood,schedule_days,schedule_time,schedules,week_pattern')
        .is('deleted_at', null).neq('status', 'ended').order('name').limit(1000);
      if (result.error) return handleError(result.error);
      if (result.data.length === 1000) return json({ error: '조회 범위가 1000건에 도달했습니다. 전체 목록을 안전하게 불러올 수 없습니다.' }, 409);
      const units = asSnapshot({ units: result.data, guardians: [], links: [], enrollments: [], logs: [] }).units;
      const ids = [...new Set(units.flatMap((unit) => [unit.coachId, ...getPrivateSchedules(unit).map((slot) => slot.coachId || unit.coachId)]).filter((id): id is string => Boolean(id)))];
      const [teachers, tiers, counts] = await Promise.all([
        ids.length ? db.from('users').select('id,name,role,email,is_admin,session_count,fee_private,fee_group,fee_center_main,fee_center_assist').in('id', ids) : Promise.resolve({ data: [], error: null }),
        db.from('teacher_tier_fees').select('tier_id,fee_private,fee_group,fee_center_main,fee_center_assist'),
        fetchTeacherLogCounts(db, ids),
      ]);
      if (teachers.error || tiers.error) return handleError(teachers.error ?? tiers.error);
      const map = cloneTierFeeMap();
      for (const tier of tiers.data ?? []) if (tier.tier_id in map) {
        const key = tier.tier_id as keyof typeof map;
        for (const field of ['fee_private', 'fee_group', 'fee_center_main', 'fee_center_assist'] as const) {
          if (tier[field] != null) map[key][field] = tier[field];
        }
      }
      return json({ units: units.map((unit) => {
        const slots = getPrivateSchedules(unit);
        const assigned = slots.length ? slots.map((slot) => slot.coachId || unit.coachId) : [unit.coachId];
        const resolved = assigned.map((id) => {
          const teacher = teachers.data?.find((item) => item.id === id);
          if (!teacher) return null;
          const row = { ...teacher, logCount: counts[teacher.id] ?? 0 };
          return { private: resolveDefaultSessionPrice(row, 'regular_private', map), group: resolveDefaultSessionPrice(row, 'regular_group', map) };
        });
        const fee = (key: 'private' | 'group') => resolved.some((item) => item == null) || new Set(resolved.map((item) => item?.[key])).size !== 1 ? null : resolved[0]![key];
        return { ...unit, privateTeacherFee: fee('private'), groupTeacherFee: fee('group') };
      }) });
    }
    const [u,g,l,e,r,t]=await Promise.all([
      db.from('admin_private_units').select('*').order('created_at',{ascending:true}).limit(1000),
      db.from('admin_private_guardians').select('*').order('created_at',{ascending:true}).limit(1000),
      db.from('admin_private_unit_guardians').select('*').order('position').limit(1000),
      db.from('admin_private_enrollments').select('*').order('enrolled_at',{ascending:false}).limit(1000),
      db.from('admin_private_logs').select('*').order('date',{ascending:false}).limit(1000),
      db.from('users').select('id,name,email,role,is_admin,is_active').eq('is_active',true).in('role',['teacher','admin','master']).order('name').limit(1000),
    ]);
    const error=u.error??g.error??l.error??e.error??r.error??t.error;
    if(error)return handleError(error);
    // Fail closed rather than silently truncating a list at the PostgREST row limit.
    if([u,g,l,e,r,t].some(x=>(x.data??[]).length===1000))return json({error:'조회 범위가 1000건에 도달했습니다. 안전한 페이지네이션 전까지 전체 데이터로 취급하지 않습니다.',code:'PAGINATION_REQUIRED'},409);
    const data=asSnapshot({units:u.data??[],guardians:g.data??[],links:l.data??[],enrollments:e.data??[],logs:r.data??[]});
    const teacherNames=new Map((t.data??[]).map(teacher=>[teacher.id,teacher.name]));
    data.units=data.units.map(unit=>({...unit,coach:unit.coachId?teacherNames.get(unit.coachId)??unit.coach:unit.coach,schedules:unit.schedules?.map(slot=>slot.coachId?{...slot,coach:teacherNames.get(slot.coachId)??slot.coach}:slot),lastClassDate:getLastClassDate(unit.id,data.logs)}));
    return json({data,teachers:(t.data??[]).filter(isClassOpsSelectableTeacher).map(teacher=>({id:teacher.id,name:teacher.name}))});
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
      const teacherIds=[...new Set([unit.coachId,...(unit.schedules??[]).map(slot=>slot.coachId)].filter((value):value is string=>Boolean(value)))];
      if(teacherIds.length){
        const candidates=await db.from('users').select('id,name,email,role,is_admin,is_active').in('id',teacherIds);
        if(candidates.error)return handleError(candidates.error);
        const previous=id?await db.from('admin_private_units').select('coach_id,schedules').eq('id',id).maybeSingle():null;
        if(previous?.error)return handleError(previous.error);
        const previousSchedules:unknown[]=Array.isArray(previous?.data?.schedules)?previous.data.schedules:[];
        const priorIds=new Set([previous?.data?.coach_id,...previousSchedules.filter(isRecord).map(slot=>slot.coachId)]);
        const teachers=new Map((candidates.data??[]).filter(teacher=>isClassOpsSelectableTeacher(teacher)||priorIds.has(teacher.id)).map(teacher=>[teacher.id,teacher]));
        if(teacherIds.some(teacherId=>!teachers.has(teacherId)))return json({error:'선택한 강사를 배정할 수 없습니다. 강사 목록을 새로고침해 주세요.',code:'INVALID_TEACHER'},400);
        if(unit.coachId)unit.coach=teachers.get(unit.coachId)!.name;
        unit.schedules=unit.schedules?.map(slot=>slot.coachId?{...slot,coach:teachers.get(slot.coachId)!.name}:slot);
      }
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
      const result=entity==='enrollment'
        ? await db.from(tableMap.enrollment).insert(toEnrollmentRow(input as Enrollment)).select('id,revision').single()
        : await db.from(tableMap.log).insert(toLogRow(input as LessonLog)).select('id,revision').single();
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
