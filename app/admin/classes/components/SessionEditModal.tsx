"use client";

import React, { useState, useRef, useEffect } from 'react';
import { X, Trash2, Undo2, RotateCcw, Star, Plus, Minus, Check, ChevronDown, MinusCircle, Copy, MessageSquare } from 'lucide-react';
import { ModalProps } from '../types';
import { MILEAGE_ACTIONS } from '../constants/mileage';

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
  onAddTeacher,
  onRemoveTeacher,
  onShrinkGroup,
  onCloneGroup
}: ModalProps) {
  const [activeTab, setActiveTab] = useState<'edit' | 'actions'>('edit');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  if (!isOpen || !selectedEvent) return null;

  const isPostponed = selectedEvent.status === 'postponed';
  const canFinish =
    selectedEvent.status === 'opened' ||
    selectedEvent.status === null ||
    (selectedEvent.session_type === 'regular_center');

  const selectedActions = editFields.mileageAction
    ? editFields.mileageAction.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const toggleMileageAction = (label: string) => {
    const isSelected = selectedActions.includes(label);
    const newActions = isSelected
      ? selectedActions.filter(a => a !== label)
      : [...selectedActions, label];

    setEditFields({
      ...editFields,
      mileageAction: newActions.join(',')
    });
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-2 sm:p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-2xl sm:rounded-[32px] shadow-2xl overflow-hidden max-h-[95vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className={`border-t-[8px] sm:border-t-[12px] ${selectedEvent.isAdmin ? 'border-yellow-400' : 'border-blue-600'}`}>
          <div className="p-4 sm:p-6 flex justify-between items-center border-b">
            <h2 className="text-xl sm:text-2xl font-black italic uppercase tracking-tighter text-left">Edit Session</h2>
            <button onClick={onClose} className="text-slate-300 hover:text-black transition-colors"><X size={24}/></button>
          </div>
          
          {/* 탭 네비게이션 */}
          <div className="flex border-b bg-slate-50">
            <button 
              onClick={() => setActiveTab('edit')}
              className={`flex-1 py-3 sm:py-4 text-xs sm:text-sm font-black uppercase tracking-wider transition-all ${
                activeTab === 'edit' 
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              정보 편집
            </button>
            <button 
              onClick={() => setActiveTab('actions')}
              className={`flex-1 py-3 sm:py-4 text-xs sm:text-sm font-black uppercase tracking-wider transition-all ${
                activeTab === 'actions' 
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              고급 작업
            </button>
          </div>
        </div>
        
        <div className="p-4 sm:p-8 space-y-4 sm:space-y-6 flex-1 overflow-y-auto">{activeTab === 'edit' ? (
            /* 정보 편집 탭 */
            <div className="space-y-3 sm:space-y-4">

              {/* 수업 제목 */}
              <div className="space-y-1">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 text-left">수업 제목</h3>
                <input 
                  type="text" 
                  value={editFields.title} 
                  onChange={(e) => setEditFields({...editFields, title: e.target.value})} 
                  className="w-full border-2 border-slate-100 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4 text-sm sm:text-base font-black outline-none focus:border-blue-600 transition-all text-left" 
                  placeholder="수업 제목"
                />
              </div>

              {/* 강사 선택 */}
              <div className="space-y-2 sm:space-y-3">
                <div className="flex justify-between items-center px-1">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">강사 및 단가</h3>
                  <button onClick={onAddTeacher} className="text-blue-600 text-xs font-black flex items-center gap-1 hover:text-blue-700 transition-colors">
                    <Plus size={14}/> 강사 추가
                  </button>
                </div>
                {editFields.teachers.map((t, idx) => (
                  <div key={idx} className="flex gap-2 sm:gap-3 items-center">
                    <select 
                      value={t.id} 
                      onChange={(e) => { 
                        const nt = [...editFields.teachers]; 
                        nt[idx].id = e.target.value; 
                        setEditFields({...editFields, teachers: nt}); 
                      }} 
                      className="flex-1 bg-slate-50 border-none rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold outline-none appearance-none text-left"
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
                      className="w-24 sm:w-32 bg-slate-50 border-none rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-right outline-none" 
                      placeholder="단가"
                    />
                    {editFields.teachers.length > 1 && (
                      <button onClick={() => onRemoveTeacher?.(idx)} className="text-red-400 hover:text-red-600 p-2 transition-colors">
                        <Minus size={16}/>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* 마일리지 */}
              <div className="pt-3 sm:pt-4 border-t border-slate-100 space-y-2 sm:space-y-3" ref={dropdownRef}>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1 text-left">
                  <Star size={14} className="text-amber-400"/> Mileage Actions
                </h3>
                <div className="relative">
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 flex justify-between items-center group hover:border-blue-200 transition-all min-h-[50px]"
                  >
                    <div className="flex flex-wrap gap-1.5 text-left">
                      {selectedActions.length > 0 ? (
                        selectedActions.map(action => (
                          <span key={action} className="bg-blue-600 text-white px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 shadow-sm">
                            {action}
                            <X size={10} onClick={(e) => { e.stopPropagation(); toggleMileageAction(action); }} className="cursor-pointer hover:text-red-200"/>
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 text-sm font-medium">마일리지 항목 선택</span>
                      )}
                    </div>
                    <ChevronDown size={18} className={`text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 shadow-2xl rounded-xl z-[100] overflow-hidden">
                      <div className="max-h-60 overflow-y-auto p-1">
                        {MILEAGE_ACTIONS.map((act) => {
                          const isSelected = selectedActions.includes(act.label);
                          return (
                            <button
                              key={act.label}
                              onClick={() => toggleMileageAction(act.label)}
                              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-bold transition-colors mb-1 last:mb-0 ${
                                isSelected ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-50 text-slate-600'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                  isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'
                                }`}>
                                  {isSelected && <Check size={12} className="text-white" />}
                                </div>
                                <span>{act.label}</span>
                              </div>
                              <span className={`text-xs ${act.val > 0 ? 'text-blue-500' : 'text-red-400'}`}>
                                {act.val > 0 ? '+' : ''}{act.val.toLocaleString()}P
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 일정 */}
              <div className="pt-2 border-t border-slate-100">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1 text-left">일정</h3>
                <div className="flex gap-2 sm:gap-3">
                  <input 
                    type="date" 
                    value={editFields.date} 
                    onChange={(e) => setEditFields({...editFields, date: e.target.value})} 
                    className="flex-1 bg-slate-50 border-none rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold outline-none" 
                  />
                  <input 
                    type="time" 
                    value={editFields.start} 
                    onChange={(e) => setEditFields({...editFields, start: e.target.value})} 
                    className="w-32 sm:w-36 bg-slate-50 border-none rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold outline-none" 
                  />
                </div>
              </div>

              {/* 회차 정보 */}
              {selectedEvent.groupId && (
                <div className="pt-2 border-t border-slate-100">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1 text-left">회차 정보</h3>
                  <div className="flex gap-2 sm:gap-3 items-center">
                    <input 
                      type="number" 
                      value={editFields.roundIndex || 0} 
                      onChange={(e) => setEditFields({...editFields, roundIndex: Number(e.target.value)})} 
                      className="flex-1 bg-slate-50 border-none rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold outline-none text-center" 
                      placeholder="현재 회차"
                      min="1"
                    />
                    <span className="text-slate-400 font-black text-lg">/</span>
                    <input 
                      type="number" 
                      value={editFields.roundTotal || 0} 
                      onChange={(e) => setEditFields({...editFields, roundTotal: Number(e.target.value)})} 
                      className="flex-1 bg-slate-50 border-none rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold outline-none text-center" 
                      placeholder="총 회차"
                      min="1"
                    />
                  </div>
                  <p className="text-[9px] text-slate-400 mt-1 px-1">현재 회차 / 총 회차를 입력하세요</p>
                </div>
              )}

              {/* 메모 (학생 정보) */}
              <div className="pt-2 border-t border-slate-100">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1 text-left flex items-center gap-2">
                  <MessageSquare size={14} className="text-slate-400"/> 학생 정보 / 메모
                </h3>
                <textarea 
                  value={editFields.memo} 
                  onChange={(e) => setEditFields({...editFields, memo: e.target.value})} 
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-xs sm:text-sm font-bold outline-none focus:border-blue-600 transition-all resize-none" 
                  placeholder="학생 정보, 수업 메모 등을 입력하세요..."
                  rows={4}
                />
              </div>

              {/* 저장 버튼 */}
              <div className="pt-4">
                <button onClick={onUpdate} className="w-full bg-blue-600 text-white font-black py-4 sm:py-5 rounded-xl sm:rounded-2xl shadow-lg hover:bg-black transition-all text-sm sm:text-base active:scale-[0.98]">
                  SAVE CHANGES
                </button>
              </div>
            </div>
          ) : (
            /* 고급 작업 탭 */
            <div className="space-y-4">

              {/* 상태 변경 */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 text-left">상태 변경</h3>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {canFinish && selectedEvent.status !== 'finished' && (
                    <button onClick={() => onUpdateStatus('finished')} className="col-span-2 bg-green-600 text-white py-3.5 sm:py-4 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 shadow-md hover:bg-green-700 transition-all active:scale-[0.98]">
                      <Check size={16}/> 수업 완료 처리
                    </button>
                  )}
                  {isPostponed ? (
                    <button onClick={(e) => onUndoPostpone(e)} className="col-span-2 bg-purple-600 text-white py-3.5 sm:py-4 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 shadow-md hover:bg-purple-700 transition-all">
                      <Undo2 size={16}/> 연기 원복 (일정 당기기)
                    </button>
                  ) : (
                    <>
                      <button onClick={(e) => onPostpone(e)} className="bg-purple-50 text-purple-600 border border-purple-100 py-3 sm:py-4 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black flex items-center justify-center gap-1 hover:bg-purple-100 transition-colors">
                        <RotateCcw size={12}/> 1주 연기
                      </button>
                      <button onClick={() => onUpdateStatus(null)} className="bg-slate-900 text-white py-3 sm:py-4 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black flex items-center justify-center gap-1 hover:bg-slate-800 transition-colors">
                        <Undo2 size={12}/> 정상 원복
                      </button>
                    </>
                  )}
                  <button onClick={() => onUpdateStatus('cancelled')} className="bg-red-50 text-red-600 border border-red-100 py-3 sm:py-4 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black hover:bg-red-100 transition-colors">
                    수업 취소
                  </button>
                  <button onClick={() => onUpdateStatus('deleted')} className="bg-slate-100 text-slate-400 py-3 sm:py-4 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black flex items-center justify-center gap-1 hover:bg-red-500 hover:text-white transition-all">
                    <Trash2 size={12}/> 영구 삭제
                  </button>
                </div>
              </div>

              {/* 그룹 관리 */}
              <div className="pt-4 space-y-3">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 text-left">그룹 작업</h3>
                <div className="space-y-2">
                  <button onClick={onShrinkGroup} className="w-full bg-amber-500 text-white py-3.5 sm:py-4 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-md hover:bg-amber-600 transition-all">
                    <MinusCircle size={16}/> 회차 축소 (현재를 마지막으로)
                  </button>
                  <button onClick={onCloneGroup} className="w-full bg-indigo-600 text-white py-3.5 sm:py-4 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-md hover:bg-indigo-700 transition-all">
                    <Copy size={16}/> 수업 복제
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}