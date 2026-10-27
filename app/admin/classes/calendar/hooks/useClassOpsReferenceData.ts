"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cloneTierFeeMap, HARD_CODED_TIER_FEES, type TierFeeMap } from "@/app/lib/teacherTierSchedule";
import { fetchTeacherTierFeeMap } from "@/app/lib/teacherTierFeesStore";

export type ClassOpsTeacher = {
  id: string;
  name: string;
  is_active: boolean;
  session_count: number | null;
  log_count: number;
  fee_private: number | null;
  fee_group: number | null;
  fee_center_main: number | null;
  fee_center_assist: number | null;
};

type ReferenceResponse = { teachers?: ClassOpsTeacher[]; error?: string };

export function useClassOpsReferenceData(supabase: SupabaseClient | null) {
  const [teachers, setTeachers] = useState<ClassOpsTeacher[]>([]);
  const [tierFeeMap, setTierFeeMap] = useState<TierFeeMap>(() => cloneTierFeeMap(HARD_CODED_TIER_FEES));
  const [feeSource, setFeeSource] = useState<"db" | "fallback">("fallback");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const reload = useCallback(async () => {
    setState("loading");
    try {
      const [teacherResponse, tierResult] = await Promise.all([
        fetch("/api/admin/class-ops/reference", { credentials: "include", cache: "no-store" }),
        fetchTeacherTierFeeMap(supabase),
      ]);
      const teacherPayload = (await teacherResponse.json().catch(() => ({}))) as ReferenceResponse;
      if (!teacherResponse.ok) throw new Error(teacherPayload.error || "class_ops_reference_failed");
      setTeachers(teacherPayload.teachers ?? []);
      setTierFeeMap(tierResult.map);
      setFeeSource(tierResult.source);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [supabase]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { teachers, tierFeeMap, feeSource, state, reload };
}
