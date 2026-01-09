"use client";

import React, { useState, useRef, useEffect } from 'react';
import { X, Trash2, Undo2, RotateCcw, Star, Plus, Minus, Check, ChevronDown } from 'lucide-react';
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
  onAddTeacher,
  onRemoveTeacher
}: ModalProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  if (!isOpen || !selectedEvent) return null;

  const isPostponed = selectedEvent.status === 'postponed';
  
  // [추가] 수업 완료 처리가 가능한 상태인지 판별
  // opened이거나 null이거나, 센터 수업(regular_center)인 경우 포함
  const canFinish = 
    selectedEvent.status === 'opened' || 
    selectedEvent.status === null || 
    ('session_type' in selectedEvent && selectedEvent.session_type === 'regular_center');

  const selectedActions = editFields.mileageAction 
    ? editFields.mileageAction.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const toggleMileageAction = (label: string) => {
    const isSelected = selectedActions.includes(label);
    let newActions: string[];
    
    if (isSelected) {
      newActions = selectedActions.filter(a => a !== label);
    } else {
      newActions = [...selectedActions, label];
    }
    
    setEditFields({
      ...editFields,
      mileageAction: newActions.join(',')
    });
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-2 sm:p-4" 
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-white rounded-2xl sm:rounded-[32px] shadow-2xl overflow-hidden max-h-[95vh] flex flex-col" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`p-4 sm:p-8 space-y-4 sm:space-y-6 border-t-[8px] sm:border-t-[12px] flex-1 overflow-y-auto ${selectedEvent.isAdmin ? 'border-yellow-400' : 'border-blue-600'}`}>
          
          <div className="flex justify-between items-center sticky top-0 bg-white pb-2 border-b sm:border-none z-10">
            <h2 className="text-xl sm:text-2xl font-black italic uppercase tracking-tighter text-left">Edit Session</h2>
            <button onClick={onClose} className="text-slate-300 hover:text-black transition-colors">
              <X size={24} className="sm:w-7 sm:h-7"/>
            </button>
          </div>
          
          <div className="space-y-3 sm:space-y-4">
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
            
            <div className="space-y-2 sm:space-y-3">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">강사 및 단가</h3>
                <button 
                  onClick={onAddTeacher}
                  className="text-blue-600 text-xs font-black flex items-center gap-1 hover:text-blue-700 transition-colors"
                >
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
                    <button 
                      onClick={() => onRemoveTeacher?.(idx)}
                      className="text-red-400 hover:text-red-600 p-2 transition-colors"
                    >
                      <Minus size={16}/>
                    </button>
                  )}
                </div>
              ))}
            </div>

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

            <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-4">
              {/* SAVE CHANGES 버튼은 항상 노출 (마일리지 수정 반영용) */}
              <button 
                onClick={onUpdate} 
                className="col-span-2 bg-blue-600 text-white font-black py-4 sm:py-5 rounded-xl sm:rounded-2xl shadow-lg hover:bg-black transition-all text-sm sm:text-base active:scale-[0.98]"
              >
                SAVE CHANGES
              </button>
              
              {/* [수정] 센터 수업 포함, 아직 완료되지 않은 모든 수업에 대해 버튼 노출 */}
              {canFinish && selectedEvent.status !== 'finished' && selectedEvent.status !== 'verified' && (
                <button 
                  onClick={() => onUpdateStatus('finished')} 
                  className="col-span-2 bg-green-600 text-white py-3.5 sm:py-4 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 shadow-md hover:bg-green-700 transition-all active:scale-[0.98]"
                >
                  <Check size={16}/> 수업 완료 처리
                </button>
              )}
              
              {isPostponed ? (
                <button 
                  onClick={onUndoPostpone} 
                  className="col-span-2 bg-purple-600 text-white py-3.5 sm:py-4 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 shadow-md hover:bg-purple-700 transition-all"
                >
                  <Undo2 size={16}/> 연기 원복 (일정 당기기)
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => onUpdateStatus(null)} 
                    className="bg-slate-900 text-white py-3 sm:py-4 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black flex items-center justify-center gap-1 hover:bg-slate-800 transition-colors"
                  >
                    <Undo2 size={12} className="sm:w-3.5 sm:h-3.5"/> 정상 원복
                  </button>
                  <button 
                    onClick={onPostpone} 
                    className="bg-purple-50 text-purple-600 border border-purple-100 py-3 sm:py-4 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black flex items-center justify-center gap-1 hover:bg-purple-100 transition-colors"
                  >
                    <RotateCcw size={12} className="sm:w-3.5 sm:h-3.5"/> 1주 연기
                  </button>
                </>
              )}
              
              <button 
                onClick={() => onUpdateStatus('cancelled')} 
                className="bg-red-50 text-red-600 border border-red-100 py-3 sm:py-4 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black hover:bg-red-100 transition-colors"
              >
                수업 취소
              </button>
              <button 
                onClick={() => onUpdateStatus('deleted')} 
                className="bg-slate-100 text-slate-400 py-3 sm:py-4 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black flex items-center justify-center gap-1 hover:bg-red-500 hover:text-white transition-all"
              >
                <Trash2 size={12} className="sm:w-3.5 sm:h-3.5"/> 영구 삭제
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}