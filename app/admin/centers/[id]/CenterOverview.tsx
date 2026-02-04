'use client';

import { useState } from 'react';
import type { CenterWithRelations, NextActionItem } from '@/app/lib/centers/types';
import { MapPin, User, Calendar, Clock, Users, FileText, CheckSquare, Square, Plus, X } from 'lucide-react';

const DAY_LABELS: Record<string, string> = {
  mon: '월',
  tue: '화',
  wed: '수',
  thu: '목',
  fri: '금',
  sat: '토',
  sun: '일',
};

interface CenterOverviewProps {
  center: CenterWithRelations;
  onNextActionToggle: (item: NextActionItem) => void;
  onNextActionAdd: (text: string) => void;
  onNextActionRemove: (itemId: string) => void;
}

export function CenterOverview({
  center,
  onNextActionToggle,
  onNextActionAdd,
  onNextActionRemove,
}: CenterOverviewProps) {
  const [newActionText, setNewActionText] = useState('');

  const schedule = center.weekly_schedule ?? [];
  const instructors = center.instructors_default ?? { main: null, sub: null, backup: [] };
  const nextActions = center.next_actions ?? [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Calendar className="h-4 w-4" />
            계약 상태 / 기간
          </h3>
          <p className="text-sm text-gray-600">
            <span
              className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                center.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : center.status === 'paused'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-gray-100 text-gray-800'
              }`}
            >
              {center.status === 'active' ? '활성' : center.status === 'paused' ? '일시중지' : '종료'}
            </span>
            {center.contract_start || center.contract_end ? (
              <span className="ml-2">
                {center.contract_start ?? '?'} ~ {center.contract_end ?? '?'}
              </span>
            ) : (
              <span className="ml-2 text-gray-400">미설정</span>
            )}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <MapPin className="h-4 w-4" />
            주소 / 출입
          </h3>
          <p className="text-sm text-gray-600">{center.address ?? '-'}</p>
          {center.access_note && (
            <p className="mt-1 text-xs text-gray-500">{center.access_note}</p>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <User className="h-4 w-4" />
            담당자
          </h3>
          <p className="text-sm text-gray-600">
            {center.contact_name ?? '-'}
            {center.contact_role && (
              <span className="ml-1 text-gray-500">({center.contact_role})</span>
            )}
          </p>
          {center.contact_phone && (
            <p className="text-sm text-gray-600">{center.contact_phone}</p>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Clock className="h-4 w-4" />
            주간 시간표
          </h3>
          {schedule.length === 0 ? (
            <p className="text-sm text-gray-500">등록된 시간표 없음</p>
          ) : (
            <ul className="space-y-1 text-sm text-gray-600">
              {schedule.map((s, i) => (
                <li key={i}>
                  {DAY_LABELS[s.day] ?? s.day} {s.start}~{s.end} {s.place}
                  {s.note ? ` (${s.note})` : ''}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Users className="h-4 w-4" />
            강사 기본배정
          </h3>
          <p className="text-sm text-gray-600">
            메인: {instructors.main ?? '-'} / 서브: {instructors.sub ?? '-'}
          </p>
          {instructors.backup?.length ? (
            <p className="mt-1 text-xs text-gray-500">
              백업: {instructors.backup.join(', ')}
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <FileText className="h-4 w-4" />
            특이사항
          </h3>
          <p className="whitespace-pre-wrap text-sm text-gray-600">
            {center.highlights ?? '-'}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
          <CheckSquare className="h-4 w-4" />
          Next Actions
        </h3>
        <ul className="space-y-2">
          {nextActions.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
            >
              <button
                type="button"
                onClick={() => onNextActionToggle(item)}
                className="shrink-0 text-gray-500 hover:text-blue-600"
              >
                {item.done ? (
                  <CheckSquare className="h-5 w-5 text-green-600" />
                ) : (
                  <Square className="h-5 w-5" />
                )}
              </button>
              <span
                className={`flex-1 text-sm ${item.done ? 'text-gray-400 line-through' : 'text-gray-700'}`}
              >
                {item.text}
              </span>
              <button
                type="button"
                onClick={() => onNextActionRemove(item.id)}
                className="shrink-0 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            placeholder="새 액션 입력"
            value={newActionText}
            onChange={(e) => setNewActionText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onNextActionAdd(newActionText);
                setNewActionText('');
              }
            }}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => {
              onNextActionAdd(newActionText);
              setNewActionText('');
            }}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            추가
          </button>
        </div>
      </div>
    </div>
  );
}
