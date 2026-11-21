'use client';

import { educationPrograms } from '../data/education';
import type { DispatchInquiryFields } from '../../contact/inquiry-types';

type Props = { values: DispatchInquiryFields; onChange: (patch: Partial<DispatchInquiryFields>) => void };

export function EducationInquiryFields({ values, onChange }: Props) {
  const selected = values.educationPrograms ?? [];
  const toggle = (id: string, checked: boolean) => onChange({ educationPrograms: checked ? [...selected, id] : selected.filter(item => item !== id), ...(id === 'other' && !checked ? { otherProgram: '' } : {}) });
  return <div className="web-education-institution-fields">
    <fieldset><legend>희망 프로그램 <span aria-hidden="true">*</span></legend><p>여러 프로그램을 선택할 수 있습니다.</p><div className="web-education-program-choices">{[...educationPrograms.map(program => ({ id: program.id, name: program.name })), { id: 'other', name: '기타' }].map(program => <label key={program.id}><input type="checkbox" checked={selected.includes(program.id)} onChange={event => toggle(program.id, event.target.checked)} /><span>{program.name}</span></label>)}</div>
    {selected.includes('other') && <label className="web-education-other-program">기타 희망 프로그램<input required value={values.otherProgram ?? ''} onChange={event => onChange({ otherProgram: event.target.value })} placeholder="희망하는 활동이나 프로그램을 알려주세요" /></label>}</fieldset>
    <details className="web-education-optional-fields"><summary>세부 운영 조건 입력 <span>선택</span></summary><div>
      <label>대상 연령<input value={values.targetAge} onChange={event => onChange({ targetAge: event.target.value })} placeholder="예: 초등 1~3학년" /></label>
      <label>예상 인원<input value={values.expectedParticipants} onChange={event => onChange({ expectedParticipants: event.target.value })} placeholder="예: 20명" /></label>
      <label>희망 시작일<input type="date" value={values.startDate ?? ''} max={values.endDate || undefined} onChange={event => onChange({ startDate: event.target.value })} /></label>
      <label>희망 종료일<input type="date" value={values.endDate ?? ''} min={values.startDate || undefined} onChange={event => onChange({ endDate: event.target.value })} /></label>
      <label>희망 운영 형태<select value={values.preferredOperation} onChange={event => onChange({ preferredOperation: event.target.value })}><option value="">상담 후 결정</option><option>정규수업</option><option>원데이</option><option>방학캠프</option><option>기관 행사</option></select></label>
      <label>특수 아동 참여 여부<select value={values.specialNeeds ?? ''} onChange={event => onChange({ specialNeeds: event.target.value })}><option value="">상담 시 협의</option><option>참여 예정</option><option>해당 없음</option><option>미정</option></select></label>
    </div></details>
  </div>;
}
