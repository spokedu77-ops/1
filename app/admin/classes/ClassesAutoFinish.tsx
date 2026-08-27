"use client";

import { useEffect } from "react";
import { devLogger } from "@/app/lib/logging/devLogger";

function isTransientFetchError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (error instanceof TypeError && error.message === "Failed to fetch") return true;
  return false;
}

/**
 * ?? ?? ??????? ???: ?????
 * POST /api/sessions/auto-finish (finished + session_count_logs).
 */
export default function ClassesAutoFinish() {
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
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          devLogger.error("classes auto-finish failed", res.status, t);
        }
      } catch (e) {
        if (cancelled || controller.signal.aborted || isTransientFetchError(e)) return;
        devLogger.error("classes auto-finish error", e);
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

  return null;
}
