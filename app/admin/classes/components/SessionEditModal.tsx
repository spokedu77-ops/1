"use client";

import React from 'react';
import { X, Trash2, Undo2, RotateCcw, Star } from 'lucide-react';
// types.ts에서 정의한 규격을 그대로 가져옵니다.
import { SessionEvent, TeacherInput, ModalProps } from '@/app/admin/classes/types';

const MILEAGE_ACTIONS = [
  { label: '보고 누락', val: -1000 },
  { label: '피드백 누락', val: -1000 },
  { label: '연기 요청', val: -5000 },
  { label: '당일 요청', val: -15000 },
  { label: '수업 연기', val: 2500 },
  { label: '당일 연기', val: 5000 },
];

export default function SessionEditModal({
  isOpen, 
  onClose, 
  selectedEvent, 
  editFields, 
  setEditFields, 
  teacherList, 
  onUpdate, 
  onUpdateStatus, 
  onPostpone, 
  onUndoPostpone, 
  onToggleMileage
}: ModalProps) {
  if (!isOpen || !selectedEvent) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className={`p-8 space-y-6 border-t-[12px] ${selectedEvent.isAdmin ? 'border-yellow-400' : 'border-blue-600'}`}>
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black italic uppercase tracking-tighter">Edit Session</h2>
            <button onClick={onClose} className="text-slate-300 hover:text-black">
              <X size={28}/>
            </button>
          </div>
          
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {/* 세션 제목 수정 */}
            <input 
              type="text" 
              value={editFields.title} 
              onChange={(e) => setEditFields({...editFields, title: e.target.value})} 
              className="w-full border-2 border-slate-100 rounded-2xl px-5 py-4 text-base font-black outline-none focus:border-blue-600" 
            />
            
            {/* 강사 및 단가 수정 */}
            <div className="space-y-3">
              {editFields.teachers.map((t, idx) => (
                <div key={idx} className="flex gap-3">
                  <select 
                    value={t.id} 
                    onChange={(e) => { 
                      const nt = [...editFields.teachers]; 
                      nt[idx].id = e.target.value; 
                      setEditFields({...editFields, teachers: nt}); 
                    }} 
                    className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold outline-none"
                  >
                    <option value="">강사 선택</option>
                    {teacherList.map(tl => <option key={tl.id} value={tl.id}>{tl.name}</option>)}
                  </select>
                  <input 
                    type="number" 
                    value={t.price} 
                    onChange={(e) => { 
                      const nt = [...editFields.teachers]; 
                      nt[idx].price = Number(e.target.value); 
                      setEditFields({...editFields, teachers: nt}); 
                    }} 
                    className="w-32 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-right outline-none" 
                  />
                </div>
              ))}
            </div>

            {/* 마일리지 액션 섹션 */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Star size={14} className="text-amber-400"/> Mileage Action
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {MILEAGE_ACTIONS.map((act) => {
                  const isActive = editFields.memo.includes(`[${act.label}]`);
                  return (
                    <button 
                      key={act.label} 
                      // ?. 을 사용하여 타입 안전성을 확보합니다.
                      onClick={() => onToggleMileage?.(act.label, act.val)} 
                      className={`py-3 px-2 rounded-xl text-[10px] font-black border transition-all flex flex-col items-center justify-center gap-1 ${
                        isActive ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-slate-50 border-slate-100 text-slate-600'
                      }`}
                    >
                      <span>{act.label}</span>
                      <span className={isActive ? 'text-blue-100' : 'text-slate-400'}>
                        {act.val > 0 ? '+' : ''}{act.val.toLocaleString()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 날짜 및 시간 수정 */}
            <div className="grid grid-cols-1 gap-3 pt-2">
              <input 
                type="date" 
                value={editFields.date} 
                onChange={(e) => setEditFields({...editFields, date: e.target.value})} 
                className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold outline-none" 
              />
              <div className="grid grid-cols-2 gap-3">
                <input 
                  type="time" 
                  value={editFields.start} 
                  onChange={(e) => setEditFields({...editFields, start: e.target.value})} 
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold outline-none" 
                />
                <input 
                  type="time" 
                  value={editFields.end} 
                  onChange={(e) => setEditFields({...editFields, end: e.target.value})} 
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold outline-none" 
                />
              </div>
            </div>

            {/* 하단 버튼 액션 */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button 
                onClick={onUpdate} 
                className="col-span-2 bg-blue-600 text-white font-black py-5 rounded-2xl shadow-lg hover:bg-black transition-all"
              >
                SAVE CHANGES
              </button>
              <button 
                onClick={() => onUpdateStatus(null)} 
                className="bg-slate-900 text-white py-4 rounded-xl text-xs font-black flex items-center justify-center gap-1"
              >
                <Undo2 size={14}/> 정상 원복
              </button>
              <button 
                onClick={onPostpone} 
                className="bg-purple-50 text-purple-600 border border-purple-100 py-4 rounded-xl text-xs font-black flex items-center justify-center gap-1"
              >
                <RotateCcw size={14}/> 1주 연기
              </button>
              <button 
                onClick={() => onUpdateStatus('cancelled')} 
                className="bg-red-50 text-red-600 border border-red-100 py-4 rounded-xl text-xs font-black"
              >
                수업 취소
              </button>
              <button 
                onClick={() => onUpdateStatus('deleted')} 
                className="bg-slate-100 text-slate-400 py-4 rounded-xl text-xs font-black flex items-center justify-center gap-1 hover:bg-red-500 hover:text-white transition-colors"
              >
                <Trash2 size={14}/> 영구 삭제
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}