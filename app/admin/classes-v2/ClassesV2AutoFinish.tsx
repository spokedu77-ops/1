"use client";

import { useEffect } from "react";
import { devLogger } from "@/app/lib/logging/devLogger";

function isTransientFetchError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (error instanceof TypeError && error.message === "Failed to fetch") return true;
  return false;
}

/**
 * classes-v2 레이아웃에서만 마운트: v1 classes/page autoFinishSessions와 동일 주기로
 * POST /api/sessions/auto-finish (finished + session_count_logs).
 */
export default function ClassesV2AutoFinish() {
  useEffect(() => {
    let cancelled = false;
    let activeController: AbortController | null = null;

    const run = async () => {
      if (cancelled) return;
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
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          devLogger.error("classes-v2 auto-finish failed", res.status, t);
        }
      } catch (e) {
        if (cancelled || controller.signal.aborted || isTransientFetchError(e)) return;
        devLogger.error("classes-v2 auto-finish error", e);
      }
    };

    void run();
    const id = setInterval(run, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      activeController?.abort();
      clearInterval(id);
    };
  }, []);

  return null;
}
