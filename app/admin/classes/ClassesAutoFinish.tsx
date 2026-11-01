"use client";

import { useEffect, useState } from "react";
import { devLogger } from "@/app/lib/logging/devLogger";
import { toast } from "sonner";

function isTransientFetchError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  return false;
}

/**
 * ?? ?? ??????? ???: ?????
 * POST /api/sessions/auto-finish (status → finished; session_count_logs is DB trigger).
 */
export default function ClassesAutoFinish() {
  const [notice, setNotice] = useState<{ message: string; details: { id: string; title: string; reason?: string }[] } | null>(null);
  useEffect(() => {
    let cancelled = false;
    let activeController: AbortController | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const run = async () => {
      if (cancelled || document.hidden) return;
      activeController?.abort();
      const controller = new AbortController();
      activeController = controller;
      try {
        const res = await fetch("/api/sessions/auto-finish", {
          method: "POST",
          credentials: "include",
          signal: controller.signal,
        });
        if (cancelled || controller.signal.aborted) return;
        const body = await res.json();
        if (body.count > 0) window.dispatchEvent(new Event('classes-auto-finish-completed'));
        if (!res.ok || body.ok !== true) {
          const failures = Array.isArray(body?.failures) ? body.failures : [];
          const message = failures.length ? `자동 완료 확인 필요 ${failures.length}건 · 정상 처리 ${Number(body.count) || 0}건` : '수업 자동 완료 결과를 확인하지 못했습니다. 다시 조회해 주세요.';
          setNotice({ message, details: failures });
          devLogger.warn("classes auto-finish requires review", { status: res.status, failures });
          toast.warning(message, { id: 'classes-auto-finish-error' });
        } else if (body.hasMore) {
          toast.warning('자동 완료 대상이 남아 있습니다. 정산 전 확인 필요 내역을 확인해 주세요.', { id: 'classes-auto-finish-error' });
        } else {
          setNotice(null);
          toast.dismiss('classes-auto-finish-error');
        }
      } catch (e) {
        if (cancelled || controller.signal.aborted || isTransientFetchError(e)) return;
        devLogger.warn("classes auto-finish request unavailable", e);
        setNotice({ message: '수업 자동 완료 결과를 확인하지 못했습니다. 다시 조회해 주세요.', details: [] });
        toast.warning('수업 자동 완료 결과를 확인하지 못했습니다. 정산 전 수업 상태를 확인해 주세요.', { id: 'classes-auto-finish-error' });
      }
    };

    const onVisibility = () => {
      if (!document.hidden) void run();
    };

    void run();
    intervalId = setInterval(() => void run(), 5 * 60 * 1000);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      activeController?.abort();
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  if (!notice) return null;
  return <section role="alert" aria-label="수업 자동 완료 확인 필요" className="m-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
    <p className="font-bold">{notice.message}</p>
    <p className="mt-1">아래 수업은 완료·정산에 반영되지 않았습니다. 다른 정상 수업의 처리는 계속됩니다.</p>
    {notice.details.length > 0 && <ul className="mt-2 space-y-1">{notice.details.map(item => <li key={item.id}><strong>{item.title || item.id}</strong> · {item.reason || '수업의 강사 배정 및 수업료를 확인해 주세요.'}</li>)}</ul>}
  </section>;
}
