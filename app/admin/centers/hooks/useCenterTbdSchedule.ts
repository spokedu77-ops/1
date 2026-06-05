'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CenterTbdClass } from '../lib/localTbdStorage';
import {
  clearLocalTbdClasses,
  loadLocalTbdClasses,
} from '../lib/localTbdStorage';
import {
  deleteCenterTbdClass,
  fetchCenterTbdClasses,
  fetchCenterTbdTeachers,
  importCenterTbdClasses,
  upsertCenterTbdClass,
  type CenterTbdTeacherOption,
} from '../lib/centerTbdApi';

export function useCenterTbdSchedule() {
  const [classes, setClasses] = useState<CenterTbdClass[]>([]);
  const [teachers, setTeachers] = useState<CenterTbdTeacherOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localOnlyCount, setLocalOnlyCount] = useState(0);
  const [showImportBanner, setShowImportBanner] = useState(false);

  const refreshLocalBanner = useCallback((serverCount: number) => {
    const local = loadLocalTbdClasses();
    const count = local.length;
    setLocalOnlyCount(count);
    setShowImportBanner(serverCount === 0 && count > 0);
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [serverClasses, teacherPool] = await Promise.all([
        fetchCenterTbdClasses(),
        fetchCenterTbdTeachers(),
      ]);
      setClasses(serverClasses);
      setTeachers(teacherPool);
      refreshLocalBanner(serverClasses.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : '불러오기 실패');
    } finally {
      setLoading(false);
    }
  }, [refreshLocalBanner]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const saveClass = useCallback(async (cls: CenterTbdClass) => {
    setSaving(true);
    setError(null);
    try {
      const saved = await upsertCenterTbdClass(cls);
      setClasses((prev) => {
        const idx = prev.findIndex((c) => c.id === saved.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = saved;
          return next;
        }
        return [...prev, saved];
      });
      return saved;
    } catch (err) {
      const message = err instanceof Error ? err.message : '저장 실패';
      setError(message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  const removeClass = useCallback(async (classId: string) => {
    setSaving(true);
    setError(null);
    try {
      await deleteCenterTbdClass(classId);
      setClasses((prev) => prev.filter((c) => c.id !== classId));
    } catch (err) {
      const message = err instanceof Error ? err.message : '삭제 실패';
      setError(message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  const importFromLocal = useCallback(async () => {
    const local = loadLocalTbdClasses();
    if (local.length === 0) {
      setShowImportBanner(false);
      return;
    }
    if (!confirm(`브라우저에 저장된 ${local.length}개 수업을 서버에 올릴까요?`)) {
      return;
    }

    setImporting(true);
    setError(null);
    try {
      const imported = await importCenterTbdClasses(local);
      setClasses(imported);
      clearLocalTbdClasses();
      setLocalOnlyCount(0);
      setShowImportBanner(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : '가져오기 실패';
      setError(message);
      throw err;
    } finally {
      setImporting(false);
    }
  }, []);

  return {
    classes,
    teachers,
    loading,
    saving,
    importing,
    error,
    localOnlyCount,
    showImportBanner,
    reload,
    saveClass,
    removeClass,
    importFromLocal,
  };
}
