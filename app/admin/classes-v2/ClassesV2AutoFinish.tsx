"use client";

import { useEffect } from "react";
import { devLogger } from "@/app/lib/logging/devLogger";

/**
 * classes-v2 레이아웃에서만 마운트: v1 classes/page autoFinishSessions와 동일 주기로
 * POST /api/sessions/auto-finish (finished + session_count_logs).
 */
export default function ClassesV2AutoFinish() {
  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch("/api/sessions/auto-finish", {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          devLogger.error("classes-v2 auto-finish failed", res.status, t);
        }
      } catch (e) {
        devLogger.error("classes-v2 auto-finish error", e);
      }
    };
    void run();
    const id = setInterval(run, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  return null;
}
