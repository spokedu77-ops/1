import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const TABLES = {
  students: 'spokedu_master_students',
  records: 'spokedu_master_class_records',
  children: 'spokedu_master_class_record_students',
};

const DERIVED_FIELDS = ['level', 'attendance', 'streak', 'risk', 'badges', 'history', 'skills'];

function loadEnvFile(path = '.env.local') {
  const env = {};
  const text = readFileSync(path, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex === -1) continue;
    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function createSupabaseClients(env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  assert(url, 'NEXT_PUBLIC_SUPABASE_URL is missing');
  assert(anonKey, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is missing');
  assert(serviceRoleKey, 'SUPABASE_SERVICE_ROLE_KEY is missing');

  return {
    admin: createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
    anon: createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  };
}

async function countOwnerRows(admin, ownerId) {
  const [students, records, children] = await Promise.all([
    admin
      .from(TABLES.students)
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', ownerId),
    admin
      .from(TABLES.records)
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', ownerId),
    admin
      .from(TABLES.children)
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', ownerId),
  ]);

  for (const [name, result] of Object.entries({ students, records, children })) {
    if (result.error) throw new Error(`${name} count failed: ${result.error.message}`);
  }

  return {
    students: students.count ?? 0,
    records: records.count ?? 0,
    children: children.count ?? 0,
  };
}

async function countMarkerRows(admin, ownerId, marker) {
  const studentLegacyId = `${marker}-student`;
  const recordLegacyId = `${marker}-record`;
  const [students, records, children] = await Promise.all([
    admin
      .from(TABLES.students)
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', ownerId)
      .eq('legacy_id', studentLegacyId),
    admin
      .from(TABLES.records)
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', ownerId)
      .eq('legacy_id', recordLegacyId),
    admin
      .from(TABLES.children)
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', ownerId)
      .eq('student_legacy_id', studentLegacyId),
  ]);

  for (const [name, result] of Object.entries({ students, records, children })) {
    if (result.error) throw new Error(`${name} marker count failed: ${result.error.message}`);
  }

  return {
    students: students.count ?? 0,
    records: records.count ?? 0,
    children: children.count ?? 0,
  };
}

async function cleanupMarker(admin, ownerId, marker) {
  const studentLegacyId = `${marker}-student`;
  const recordLegacyId = `${marker}-record`;

  const { error: childError } = await admin
    .from(TABLES.children)
    .delete()
    .eq('owner_id', ownerId)
    .eq('student_legacy_id', studentLegacyId);
  if (childError) throw new Error(`cleanup child failed: ${childError.message}`);

  const { error: recordError } = await admin
    .from(TABLES.records)
    .delete()
    .eq('owner_id', ownerId)
    .eq('legacy_id', recordLegacyId);
  if (recordError) throw new Error(`cleanup record failed: ${recordError.message}`);

  const { error: studentError } = await admin
    .from(TABLES.students)
    .delete()
    .eq('owner_id', ownerId)
    .eq('legacy_id', studentLegacyId);
  if (studentError) throw new Error(`cleanup student failed: ${studentError.message}`);
}

async function requireTableAccessible(admin, table) {
  const { error } = await admin.from(table).select('id', { count: 'exact', head: true }).limit(1);
  if (error) throw new Error(`${table} is not accessible: ${error.message}`);
}

async function assertAnonCannotSeeMarker(anon, marker) {
  const studentLegacyId = `${marker}-student`;
  const recordLegacyId = `${marker}-record`;
  const [students, records, children] = await Promise.all([
    anon.from(TABLES.students).select('id').eq('legacy_id', studentLegacyId),
    anon.from(TABLES.records).select('id').eq('legacy_id', recordLegacyId),
    anon.from(TABLES.children).select('id').eq('student_legacy_id', studentLegacyId),
  ]);

  for (const [name, result] of Object.entries({ students, records, children })) {
    if (result.error) continue;
    assert((result.data ?? []).length === 0, `anon can read marker ${name}`);
  }

  return {
    students: students.error ? 'blocked' : `${students.data?.length ?? 0} rows`,
    records: records.error ? 'blocked' : `${records.data?.length ?? 0} rows`,
    children: children.error ? 'blocked' : `${children.data?.length ?? 0} rows`,
  };
}

function toRecordDto(row) {
  const students = row.spokedu_master_class_record_students ?? [];
  return {
    id: row.id,
    legacyId: row.legacy_id,
    date: row.class_date,
    lessonTitle: row.lesson_title,
    classId: row.class_id,
    programId: row.program_id,
    programTitle: row.program_title,
    recordType: row.record_type,
    memo: row.memo,
    parentNoteSnapshot: row.parent_note_snapshot,
    present: students.filter((student) => student.attendance === 'present').length,
    absent: students.filter((student) => student.attendance === 'absent').length,
    focusCount: students.filter((student) => student.focused).length,
    skillCount: students.reduce((total, student) => total + (student.skills ?? []).length, 0),
    students,
  };
}

async function main() {
  const env = loadEnvFile();
  const ownerId = env.SPOKEDU_MASTER_SMOKE_OWNER_ID;
  assert(ownerId, 'SPOKEDU_MASTER_SMOKE_OWNER_ID is missing');
  assert(isUuid(ownerId), 'SPOKEDU_MASTER_SMOKE_OWNER_ID is not a UUID');

  const { admin, anon } = createSupabaseClients(env);

  const { data: userResult, error: userError } = await admin.auth.admin.getUserById(ownerId);
  if (userError || !userResult?.user) {
    throw new Error(`Smoke owner does not exist in auth.users: ${userError?.message ?? 'not found'}`);
  }

  await Promise.all(Object.values(TABLES).map((table) => requireTableAccessible(admin, table)));

  const marker = `qa-operational-${Date.now()}`;
  const studentLegacyId = `${marker}-student`;
  const recordLegacyId = `${marker}-record`;
  const startCounts = await countOwnerRows(admin, ownerId);

  const result = {
    ownerId,
    marker,
    startCounts,
    studentId: null,
    duplicateStudentRows: null,
    recordId: null,
    childId: null,
    duplicateRecordRows: null,
    dto: null,
    anon: null,
    cleanupCounts: null,
    endCounts: null,
  };

  try {
    await cleanupMarker(admin, ownerId, marker);

    const { data: insertedStudent, error: studentError } = await admin
      .from(TABLES.students)
      .insert({
        owner_id: ownerId,
        legacy_id: studentLegacyId,
        name: marker,
        group_name: 'QA',
        meta: { source: 'operational-smoke' },
      })
      .select('id,owner_id,legacy_id,name,group_name,meta,created_at,updated_at')
      .single();
    if (studentError) throw new Error(`student insert failed: ${studentError.message}`);

    result.studentId = insertedStudent.id;
    assert(isUuid(insertedStudent.id), 'student id is not UUID');
    assert(insertedStudent.owner_id === ownerId, 'student owner_id mismatch');
    assert(insertedStudent.legacy_id === studentLegacyId, 'student legacy_id mismatch');
    for (const field of DERIVED_FIELDS) {
      assert(!(field in insertedStudent), `student response includes derived field ${field}`);
    }

    const { data: duplicateStudent, error: duplicateStudentError } = await admin
      .from(TABLES.students)
      .select('id')
      .eq('owner_id', ownerId)
      .eq('legacy_id', studentLegacyId)
      .is('deleted_at', null);
    if (duplicateStudentError) {
      throw new Error(`duplicate student check failed: ${duplicateStudentError.message}`);
    }
    result.duplicateStudentRows = duplicateStudent?.length ?? 0;

    const { count: studentDuplicateCount, error: studentDuplicateCountError } = await admin
      .from(TABLES.students)
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', ownerId)
      .eq('legacy_id', studentLegacyId);
    if (studentDuplicateCountError) {
      throw new Error(`student duplicate count failed: ${studentDuplicateCountError.message}`);
    }
    assert(studentDuplicateCount === 1, `student duplicate count is ${studentDuplicateCount}`);

    const { data: insertedRecord, error: recordError } = await admin
      .from(TABLES.records)
      .insert({
        owner_id: ownerId,
        legacy_id: recordLegacyId,
        class_date: todayDate(),
        lesson_title: marker,
        class_id: 'QA',
        program_id: null,
        program_title: marker,
        record_type: 'detailed',
        memo: 'QA smoke',
        parent_note_snapshot: '',
      })
      .select('id,owner_id,legacy_id')
      .single();
    if (recordError) throw new Error(`record insert failed: ${recordError.message}`);

    result.recordId = insertedRecord.id;
    assert(isUuid(insertedRecord.id), 'record id is not UUID');
    assert(insertedRecord.owner_id === ownerId, 'record owner_id mismatch');

    const { data: insertedChild, error: childError } = await admin
      .from(TABLES.children)
      .insert({
        owner_id: ownerId,
        record_id: insertedRecord.id,
        student_id: insertedStudent.id,
        student_legacy_id: studentLegacyId,
        student_name_snapshot: marker,
        attendance: 'present',
        focused: true,
        skills: ['협응력'],
        memo: 'QA',
      })
      .select('id,owner_id,record_id,student_id,student_name_snapshot,attendance,focused,skills,memo')
      .single();
    if (childError) throw new Error(`child insert failed: ${childError.message}`);

    result.childId = insertedChild.id;
    assert(isUuid(insertedChild.id), 'child id is not UUID');
    assert(insertedChild.owner_id === ownerId, 'child owner_id mismatch');
    assert(insertedChild.record_id === insertedRecord.id, 'child record_id mismatch');
    assert(insertedChild.student_id === insertedStudent.id, 'child student_id mismatch');
    assert(insertedChild.student_name_snapshot === marker, 'child snapshot mismatch');
    assert(Array.isArray(insertedChild.skills), 'child skills is not array');
    assert(insertedChild.skills.length === 1 && insertedChild.skills[0] === '협응력', 'child skills mismatch');

    const { data: duplicateRecord, error: duplicateRecordError } = await admin
      .from(TABLES.records)
      .select('id')
      .eq('owner_id', ownerId)
      .eq('legacy_id', recordLegacyId)
      .is('deleted_at', null);
    if (duplicateRecordError) {
      throw new Error(`duplicate record check failed: ${duplicateRecordError.message}`);
    }
    result.duplicateRecordRows = duplicateRecord?.length ?? 0;

    const { count: recordDuplicateCount, error: recordDuplicateCountError } = await admin
      .from(TABLES.records)
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', ownerId)
      .eq('legacy_id', recordLegacyId);
    if (recordDuplicateCountError) {
      throw new Error(`record duplicate count failed: ${recordDuplicateCountError.message}`);
    }
    assert(recordDuplicateCount === 1, `record duplicate count is ${recordDuplicateCount}`);

    const { count: childDuplicateCount, error: childDuplicateCountError } = await admin
      .from(TABLES.children)
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', ownerId)
      .eq('record_id', insertedRecord.id)
      .eq('student_legacy_id', studentLegacyId);
    if (childDuplicateCountError) {
      throw new Error(`child duplicate count failed: ${childDuplicateCountError.message}`);
    }
    assert(childDuplicateCount === 1, `child duplicate count is ${childDuplicateCount}`);

    const { data: markerStudents, error: markerStudentsError } = await admin
      .from(TABLES.students)
      .select('id,legacy_id,name,group_name,meta,created_at,updated_at')
      .eq('owner_id', ownerId)
      .eq('legacy_id', studentLegacyId);
    if (markerStudentsError) throw new Error(`student GET check failed: ${markerStudentsError.message}`);
    assert(markerStudents.length === 1, `marker student count is ${markerStudents.length}`);
    for (const field of DERIVED_FIELDS) {
      assert(!(field in markerStudents[0]), `student DTO includes derived field ${field}`);
    }

    const { data: markerRecords, error: markerRecordsError } = await admin
      .from(TABLES.records)
      .select(
        `
          id,
          owner_id,
          legacy_id,
          class_date,
          lesson_title,
          class_id,
          program_id,
          program_title,
          record_type,
          memo,
          parent_note_snapshot,
          created_at,
          updated_at,
          spokedu_master_class_record_students (
            id,
            owner_id,
            record_id,
            student_id,
            student_legacy_id,
            student_name_snapshot,
            attendance,
            focused,
            skills,
            memo,
            created_at,
            updated_at
          )
        `,
      )
      .eq('owner_id', ownerId)
      .eq('legacy_id', recordLegacyId);
    if (markerRecordsError) throw new Error(`record GET check failed: ${markerRecordsError.message}`);
    assert(markerRecords.length === 1, `marker record count is ${markerRecords.length}`);

    const dto = toRecordDto(markerRecords[0]);
    assert(dto.students.length === 1, `DTO students count is ${dto.students.length}`);
    assert(dto.present === 1, `DTO present is ${dto.present}`);
    assert(dto.absent === 0, `DTO absent is ${dto.absent}`);
    assert(dto.focusCount === 1, `DTO focusCount is ${dto.focusCount}`);
    assert(dto.skillCount === 1, `DTO skillCount is ${dto.skillCount}`);
    assert(dto.students[0].student_name_snapshot === marker, 'DTO child name mismatch');
    assert(dto.students[0].attendance === 'present', 'DTO attendance mismatch');
    assert(dto.students[0].focused === true, 'DTO focused mismatch');
    assert(dto.students[0].memo === 'QA', 'DTO memo mismatch');
    result.dto = {
      students: dto.students.length,
      present: dto.present,
      absent: dto.absent,
      focusCount: dto.focusCount,
      skillCount: dto.skillCount,
    };

    result.anon = await assertAnonCannotSeeMarker(anon, marker);
  } finally {
    await cleanupMarker(admin, ownerId, marker);
    result.cleanupCounts = await countMarkerRows(admin, ownerId, marker);
    result.endCounts = await countOwnerRows(admin, ownerId);
  }

  assert(result.cleanupCounts.students === 0, 'cleanup left marker student rows');
  assert(result.cleanupCounts.records === 0, 'cleanup left marker record rows');
  assert(result.cleanupCounts.children === 0, 'cleanup left marker child rows');
  assert(JSON.stringify(result.startCounts) === JSON.stringify(result.endCounts), 'owner row counts changed after cleanup');

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
