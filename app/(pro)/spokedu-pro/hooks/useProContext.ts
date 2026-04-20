'use client';

/**
 * 스포키듀 구독 컨텍스트 훅.
 * GET /api/spokedu-pro/context → plan, entitlement, center, usage 정보 캐싱.
 */
import { useState, useEffect, useCallback } from 'react';

export type Plan = 'free' | 'basic' | 'pro';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired';
export type CenterRole = 'owner' | 'admin' | 'coach';

export type Entitlement = {
  plan: Plan;
  status: SubscriptionStatus;
  isPro: boolean;
};

export type ProUsage = {
  studentCount: number;
  aiReportThisMonth: number;
  aiReportMonthlyLimit: number | null; // null = 무제한
  classCount: number;
  classLimit: number | null;           // null = 무제한
};

export type ProContext = {
  activeCenterId: string | null;
  centers: Array<{ id: string; name: string; role: CenterRole }>;
  role: CenterRole | null;
  entitlement: Entitlement;
  billing: {
    priceKrw: number;
    promoPriceKrw: number | null;
    promoEndAt: string | null;
    currentPeriodEndAt: string | null;
    /** Stripe Checkout으로 생성된 고객 ID. Billing Portal 진입에 사용. */
    stripeCustomerId: string | null;
  };
  usage: ProUsage;
  dbReady: boolean;
  /** 로드 실패 시 사용자에게 보일 메시지(한국어 원문, tr()에 그대로 전달 가능) */
  contextLoadError?: string | null;
};

const FREE_CONTEXT: ProContext = {
  activeCenterId: null,
  centers: [],
  role: null,
  entitlement: { plan: 'free', status: 'active', isPro: false },
  billing: { priceKrw: 0, promoPriceKrw: null, promoEndAt: null, currentPeriodEndAt: null, stripeCustomerId: null },
  usage: {
    studentCount: 0,
    aiReportThisMonth: 0,
    aiReportMonthlyLimit: 0,
    classCount: 0,
    classLimit: 1,
  },
  dbReady: false,
  contextLoadError: null,
};

function httpLoadErrorMessage(status: number): string {
  if (status === 401) {
    return '로그인 세션이 만료되었거나 권한이 없습니다. 다시 로그인해 주세요.';
  }
  if (status >= 500) {
    return '서버 오류로 구독 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
  }
  return `구독 정보를 불러오지 못했습니다. (${status})`;
}

// 클라이언트 사이드 캐시
let _cache: ProContext | null = null;
let _fetching = false;
let _listeners: Array<() => void> = [];

function notifyListeners() {
  _listeners.forEach((fn) => fn());
}

async function fetchContext(): Promise<ProContext> {
  if (_cache && !_cache.contextLoadError) return _cache;
  if (_fetching) {
    return new Promise((resolve) => {
      const check = () => {
        if (!_fetching) {
          resolve(_cache ?? { ...FREE_CONTEXT, contextLoadError: '구독 정보를 불러오지 못했습니다.' });
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });
  }

  _fetching = true;
  try {
    const res = await fetch('/api/spokedu-pro/context', { credentials: 'include' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      const hint = typeof body.error === 'string' ? body.error : '';
      const base = httpLoadErrorMessage(res.status);
      _cache = {
        ...FREE_CONTEXT,
        contextLoadError: hint ? `${base} (${hint})` : base,
        dbReady: false,
      };
    } else {
      const data = (await res.json()) as ProContext & { error?: string };
      const dbIssue = data.dbReady === false || data.error === 'db_error';
      _cache = {
        ...data,
        contextLoadError: dbIssue
          ? '구독 정보를 확인하는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'
          : null,
      };
    }
  } catch {
    _cache = {
      ...FREE_CONTEXT,
      contextLoadError: '네트워크 오류가 발생했습니다. 연결을 확인한 뒤 다시 시도해 주세요.',
      dbReady: false,
    };
  } finally {
    _fetching = false;
    notifyListeners();
  }
  return _cache!;
}

export function useProContext() {
  const [ctx, setCtx] = useState<ProContext>(_cache ?? FREE_CONTEXT);
  const [loading, setLoading] = useState(!_cache);

  useEffect(() => {
    if (_cache && !_cache.contextLoadError) {
      setCtx(_cache);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchContext().then((c) => {
      setCtx(c);
      setLoading(false);
    });

    const fn = () => {
      if (_cache) setCtx(_cache);
    };
    _listeners.push(fn);
    return () => {
      _listeners = _listeners.filter((l) => l !== fn);
    };
  }, []);

  /** 구독 정보 갱신 */
  const refresh = useCallback(async () => {
    _cache = null;
    setLoading(true);
    const c = await fetchContext();
    setCtx(c);
    setLoading(false);
  }, []);

  return { ctx, loading, refresh };
}
