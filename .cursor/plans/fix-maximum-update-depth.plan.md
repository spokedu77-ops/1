# Maximum update depth 수정 계획 (이벤트 기반 + debounce)

## 목표

- PlayStudio에서 **selected/timeline useEffect 제거** → onUpdate는 **이벤트 기반**으로만 호출.
- useDraftEditor.updateDraft는 **useCallback 고정** + **no-op 가드**.
- GeneratorPage.handlePlayUpdate는 **useCallback([updateDraft])**.
- localStorage: **load 1회**, **save는 debounce(200~500ms)**.

이렇게 하면 StrictMode에서도 Maximum update depth가 거의 발생하지 않음.

---

## 1. PlayStudio: selected/timeline effect 제거, 이벤트 기반 onUpdate

**파일:** [app/admin/iiwarmup/generator/tabs/PlayStudio.tsx](app/admin/iiwarmup/generator/tabs/PlayStudio.tsx)

- **제거:** 104–111행의 `useEffect` 전체.
  - `useEffect(() => { if (selected.length > 0 && timeline.length > 0) { onUpdate({ timeline, selectedActions: selected }); } }, [selected, timeline, onUpdate]);`
- **유지:** `buildTimeline()` 내부에서만 `onUpdate({ timeline: newTimeline, selectedActions: selected })` 호출 (타임라인 생성 버튼 클릭 시).
- **추가:** “초기화” 버튼 클릭 시 `onUpdate({ timeline: [], selectedActions: [] })` 호출하여 draft.play 초기화.
- 선택만 바꾸고 “타임라인 생성”을 누르지 않으면 onUpdate는 호출하지 않음 (draft.play는 이전 타임라인 유지 또는 부모에서 draft 초기값과 동기화하는 정책에 따름).

---

## 2. useDraftEditor: updateDraft useCallback 고정 + no-op 가드

**파일:** [app/admin/iiwarmup/generator/hooks/useDraftEditor.ts](app/admin/iiwarmup/generator/hooks/useDraftEditor.ts)

- **updateDraft:** 이미 `useCallback(..., [assetPackId])`로 고정되어 있음. 의존성을 `[assetPackId]`만 유지 (또는 필요 시 `[]`로 더 엄격히 고정).
- **no-op 가드:** `updateDraft(partial)` 호출 시, `partial`이 비어 있거나(`Object.keys(partial).length === 0`) **실제로 변경되는 필드가 없으면** `setDraft`를 호출하지 않고 return.
  - 예: `setDraft(prev => { const next = { ...prev, ...partial, asset_pack_id: prev.asset_pack_id || assetPackId }; return JSON.stringify(prev) === JSON.stringify(next) ? prev : next; })` 또는 필드 단위 shallow 비교로 no-op 판단.
- **localStorage save:** 아래 4번에서 debounce 적용.

---

## 3. GeneratorPage: handlePlayUpdate = useCallback([updateDraft])

**파일:** [app/admin/iiwarmup/generator/page.tsx](app/admin/iiwarmup/generator/page.tsx)

- **추가:** Play 전용 콜백 `handlePlayUpdate`를 `useCallback`으로 정의.
  - 시그니처: `(play: { timeline: PlayBlock[]; selectedActions: ActionKey[] }) => void`
  - 내부: `updateDraft({ play });`
  - 의존 배열: `[updateDraft]`
- **JSX:** `PlayStudio`에 `onUpdate={handlePlayUpdate}` 전달 (인라인 함수 제거).
- 필요 시 `PlayBlock`, `ActionKey` 타입 import 추가.

---

## 4. useDraftEditor: localStorage load 1회, save debounce(200~500ms)

**파일:** [app/admin/iiwarmup/generator/hooks/useDraftEditor.ts](app/admin/iiwarmup/generator/hooks/useDraftEditor.ts)

- **Load:** 현재처럼 `useState(initializer)`에서 1회만 읽음. 변경 없음.
- **Save:** `useEffect`에서 `draft` 변경 시 바로 `localStorage.setItem` 호출하지 않고, **debounce(200ms 또는 500ms)** 후에 저장.
  - 구현: `useEffect` 내부에서 `const t = setTimeout(() => { localStorage.setItem(...); }, 300); return () => clearTimeout(t);`, 의존성 `[draft]`.
  - 또는 `useRef`로 debounce 타이머 보관 후, draft 변경 시 타이머 리셋하고 300ms 후 한 번만 저장.
- 이렇게 하면 연속적인 setDraft(예: StrictMode 이중 마운트나 빠른 이벤트)에서도 저장은 한 번만 일어나고, 리렌더 연쇄 완화.

---

## 검증

- Generator 페이지 진입 → Play Studio에서 5개 선택 → “125초 타임라인 생성” 클릭 → draft 반영, 콘솔 에러 없음.
- “초기화” 클릭 시 draft.play가 빈 배열로 반영.
- localStorage에는 debounce 이후 한 번만 저장되는지 확인 (필요 시 로그로 확인).
- React StrictMode에서도 “Maximum update depth exceeded”가 발생하지 않음.
