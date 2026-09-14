import type { MasterSessionStatus } from '../types/operational';

export type SessionActionPolicy = {
  editSchedule: boolean;
  editAttendance: boolean;
  markAllPresent: boolean;
  editMemo: boolean;
  addActivities: boolean;
  removeActivities: boolean;
  reorderActivities: boolean;
  toggleActivityCompletion: boolean;
  useClassTools: boolean;
  openReport: boolean;
  createNextSession: boolean;
  complete: boolean;
  cancel: boolean;
  restore: boolean;
  deletePermanently: boolean;
};

const POLICIES: Record<MasterSessionStatus, SessionActionPolicy> = {
  scheduled: {
    editSchedule: true,
    editAttendance: true,
    markAllPresent: true,
    editMemo: true,
    addActivities: true,
    removeActivities: true,
    reorderActivities: true,
    toggleActivityCompletion: true,
    useClassTools: true,
    openReport: false,
    createNextSession: false,
    complete: true,
    cancel: true,
    restore: false,
    deletePermanently: false,
  },
  completed: {
    editSchedule: false,
    editAttendance: true,
    markAllPresent: true,
    editMemo: true,
    addActivities: false,
    removeActivities: false,
    reorderActivities: false,
    toggleActivityCompletion: true,
    useClassTools: false,
    openReport: true,
    createNextSession: true,
    complete: false,
    cancel: false,
    restore: false,
    deletePermanently: false,
  },
  cancelled: {
    editSchedule: false,
    editAttendance: false,
    markAllPresent: false,
    editMemo: false,
    addActivities: false,
    removeActivities: false,
    reorderActivities: false,
    toggleActivityCompletion: false,
    useClassTools: false,
    openReport: false,
    createNextSession: false,
    complete: false,
    cancel: false,
    restore: true,
    deletePermanently: true,
  },
};

export function getSessionActionPolicy(status: MasterSessionStatus) {
  return POLICIES[status];
}
