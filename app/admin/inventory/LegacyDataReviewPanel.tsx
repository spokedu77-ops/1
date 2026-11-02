'use client';

type LegacyImport = {
  staged_rows: number;
  pending_rows: number;
  imported_rows: number;
  pending_items: { inventory_id: number; name: string; quantity: number; reason: string }[];
  sync?: {
    inventory_rows: number;
    mapped_rows: number;
    pending_rows: number;
    catalog_unmapped_rows: number;
    teacher_inventory_flags: { user_id: string; name: string; count: number; note: string }[];
    persisted: boolean;
  };
};

const REASON_LABEL: Record<string, string> = {
  CATALOG_UNMAPPED: '교구명 미매핑',
  CATALOG_AMBIGUOUS: '교구명 중복',
  OWNER_NOT_FOUND: '소유자 확인 필요',
  TEACHER_INVENTORY_MISMATCH: 'teacher_inventory 불일치',
  ZERO_QUANTITY: '수량 0',
};

export function LegacyDataReviewPanel({ legacyImport }: { legacyImport: LegacyImport | null }) {
  if (!legacyImport?.sync) {
    return <p className="text-sm text-slate-500">기존 보유 자동 정리 요약을 불러오지 못했습니다.</p>;
  }

  const s = legacyImport.sync;
  const exceptions = legacyImport.pending_items.filter((p) => p.reason !== 'ZERO_QUANTITY');

  return (
    <div className="space-y-4 text-sm text-slate-700">
      <p className="text-slate-600">
        inventory {s.inventory_rows}건을 자동 분류했습니다. 확인된 항목만 재고 입력 시 원장 이관 대상이며, 아래
        예외만 수동 확인하면 됩니다.
      </p>
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="전체 inventory" value={s.inventory_rows} />
        <Stat label="자동 연결" value={s.mapped_rows} />
        <Stat label="예외·확인 필요" value={s.pending_rows} highlight />
        <Stat label="교구명 미매핑" value={s.catalog_unmapped_rows} />
      </dl>
      <p className="text-xs text-slate-500">
        「확인 필요」는 교구·강사·수량·teacher_inventory 대조 결과입니다. 미매핑 4건은 그 중 교구명 불일치
        부분집합일 수 있으며, 소유자 불명(OWNER_NOT_FOUND) 등과 중복 없이 예외 목록에만 표시됩니다.
        {s.persisted ? ' 스냅샷 DB 반영됨.' : ' (운영) DB 스냅샷 미저장·메모리 분류만.'}
      </p>
      {s.teacher_inventory_flags.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <h3 className="font-bold mb-2">teacher_inventory 대조 ({s.teacher_inventory_flags.length}건)</h3>
          <ul className="space-y-1 text-xs">
            {s.teacher_inventory_flags.map((f, i) => (
              <li key={i}>
                {f.name} · {f.count}개 — {f.note}
              </li>
            ))}
          </ul>
        </div>
      )}
      {exceptions.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-2 bg-slate-50 font-bold">예외 목록</div>
          <ul className="divide-y max-h-[50vh] overflow-y-auto">
            {exceptions.map((item) => (
              <li key={item.inventory_id} className="px-4 py-2 flex flex-wrap justify-between gap-2">
                <span>
                  #{item.inventory_id} {item.name}
                </span>
                <span className="tabular-nums">{item.quantity}개</span>
                <span className="text-xs text-amber-800 w-full">{REASON_LABEL[item.reason] ?? item.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${highlight ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'}`}>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-lg font-black tabular-nums">{value}</dd>
    </div>
  );
}
