import { buildClassAttendanceView } from '../classes/classManagementModel';
import type { MasterClassDto, MasterSessionDto, MasterStudentDto } from '../types/operational';

export function buildManageAttendanceProjection(classItem: MasterClassDto, sessions: MasterSessionDto[], students: MasterStudentDto[], month: string) {
  return buildClassAttendanceView(classItem, sessions, students, month);
}
