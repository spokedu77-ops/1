"use client";

import { useEffect, useState } from "react";
import { Check, Star, X } from "lucide-react";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/app/lib/supabase/browser";
import { MILEAGE_ACTIONS } from "@/app/admin/classes-shared/constants/mileage";
import { extractMileageAction } from "@/app/admin/classes-shared/lib/sessionUtils";
import { applySessionLinkedMileage } from "@/app/admin/classes-shared/lib/applySessionLinkedMileage";

type Props = {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  sessionStartAt: string | null;
  title: string | null;
  memo: string | null | undefined;
  mileage_option: string | null | undefined;
  created_by: string | null;
  onSaved: () => void;
};

export default function SessionMileageModal({
  open,
  onClose,
  sessionId,
  sessionStartAt,
  title,
  memo,
  mileage_option,
  created_by,
  onSaved,
}: Props) {
  const [mileageAction, setMileageAction] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const { mileageAction: m } = extractMileageAction(memo || "", mileage_option ?? undefined);
    setMileageAction(m);
  }, [open, sessionId, memo, mileage_option]);

  if (!open) return null;

  const selectedActions = mileageAction
    ? mileageAction.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const toggleMileageAction = (label: string) => {
    const isSelected = selectedActions.includes(label);
    const newActions = isSelected
      ? selectedActions.filter((a) => a !== label)
      : [...selectedActions, label];
    setMileageAction(newActions.join(","));
  };

  const handleSave = async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      toast.error("클라이언트를 초기화할 수 없습니다.");
      return;
    }

    setSaving(true);
    try {
      const result = await applySessionLinkedMileage(supabase, {
        sessionId,
        sessionStartAt,
        title,
        memo,
        mileage_option,
        created_by,
        nextActionStr: mileageAction,
      });
      if (!result.ok) {
        toast.error(result.error || "마일리지 저장에 실패했습니다.");
        return;
      }
      if (result.warning) toast.error(`경고: ${result.warning}`);
      else toast.success("마일리지가 저장되었습니다.");
      onSaved();
      onClose();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      toast.error("저장 실패: " + msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[10050] flex min-h-full items-center justify-center overflow-y-auto overscroll-y-contain bg-slate-900/50 backdrop-blur-sm px-3 py-6 sm:px-4 sm:py-10"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative my-auto flex w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] max-h-[min(92vh,800px)] min-h-0"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mileage-modal-title"
      >
        <div className="shrink-0 border-b border-slate-100 bg-gradient-to-r from-amber-50/90 to-white px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h2
                id="mileage-modal-title"
                className="flex items-center gap-2 text-xl font-black tracking-tight text-slate-900 sm:text-2xl"
              >
                <Star className="h-6 w-6 shrink-0 text-amber-500 sm:h-7 sm:w-7" strokeWidth={2} />
                마일리지
              </h2>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600 break-words">
                {title?.trim() ? title : "(제목 없음)"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800"
              aria-label="닫기"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-5 pb-2 pt-4 sm:px-6 sm:pt-5">
          <p className="shrink-0 text-xs font-bold uppercase tracking-wider text-slate-400">
            항목 선택
          </p>
          <p className="mt-1 shrink-0 text-sm text-slate-500">
            여러 개 선택 가능합니다. 아래 목록만 스크롤됩니다.
          </p>

          <div className="mt-4 min-h-[min(280px,40vh)] flex-1 overflow-y-auto overscroll-contain rounded-2xl border border-slate-100 bg-slate-50/80 p-2 sm:min-h-[320px] sm:p-3">
            <ul className="space-y-1.5">
              {MILEAGE_ACTIONS.map((act) => {
                const isSelected = selectedActions.includes(act.label);
                return (
                  <li key={act.label}>
                    <button
                      type="button"
                      onClick={() => toggleMileageAction(act.label)}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3.5 text-left text-sm font-bold transition-colors sm:py-4 sm:text-base ${
                        isSelected
                          ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-500/30"
                          : "bg-white text-slate-800 shadow-sm ring-1 ring-slate-200/80 hover:bg-slate-50"
                      }`}
                    >
                      <span className="flex min-w-0 flex-1 items-center gap-3">
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 sm:h-7 sm:w-7 ${
                            isSelected
                              ? "border-white/80 bg-white/20"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isSelected && <Check className="h-4 w-4 text-white sm:h-4 sm:w-4" strokeWidth={3} />}
                        </span>
                        <span className="break-words leading-snug">{act.label}</span>
                      </span>
                      <span
                        className={`shrink-0 text-sm font-black tabular-nums sm:text-base ${
                          isSelected
                            ? "text-white/95"
                            : act.val > 0
                              ? "text-blue-600"
                              : "text-rose-500"
                        }`}
                      >
                        {act.val > 0 ? "+" : ""}
                        {act.val.toLocaleString()}P
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-100 bg-slate-50/90 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 text-sm text-slate-600">
              {selectedActions.length > 0 ? (
                <span className="font-semibold text-slate-800">
                  선택 {selectedActions.length}개
                </span>
              ) : (
                <span className="text-slate-500">선택된 항목 없음</span>
              )}
            </div>
            <div className="ml-auto flex shrink-0 gap-2 sm:gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-100 sm:px-6"
              >
                취소
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSave()}
                className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-slate-800 disabled:opacity-50 sm:px-6"
              >
                {saving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
