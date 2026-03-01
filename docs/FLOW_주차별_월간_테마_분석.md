# Flow 주차별/월간 테마 — 분석 (실행 없음)

## 1. 현재 상태 요약

### 1.1 Flow 어셋이 쓰이는 곳

| 구분 | 위치 | 동작 |
|------|------|------|
| **Admin Asset Hub** | `app/admin/iiwarmup/assets` | Flow 탭 → `FlowBgmPanel`만 노출. **월/주차 선택 UI 없음.** |
| **Flow BGM** | `useFlowBGM` | 단일 설정 ID `iiwarmup_flow_bgm_settings` (think_asset_packs). `bgmList` + `selectedBgm` **전역 1개.** |
| **Flow 파노라마** | `useFlowPano` | 단일 설정 ID `iiwarmup_flow_pano_settings`. `panoList` + `selectedPano` **전역 1개.** |
| **구독자 Flow 재생** | `FlowPhaseClient` | `useFlowBGM()` / `useFlowPano()`로 **항상 전역 선택값** 사용. URL의 `weekKey`는 **flow 어셋 선택에 미사용.** |
| **스케줄 API** | `GET /api/schedule/[weekKey]` | 챌린지 BGM, Think pack 등만 반환. **flowBgmPath / flowPanoPath 미반환.** |

즉, **Flow는 전역 테마 1종만 존재**하며, 주차/월 개념이 없음.

### 1.2 비교: Think / Play / Challenge

- **Think**: 월별 + 주차별(2/3/4주차). `think_asset_packs`의 `byMonth` → `thinkPackByMonthAndWeek`, 스케줄 API에서 `weekKey`+program_snapshot으로 해당 주 pack 결정.
- **Play**: 주차별(weekKey). `play_assets/{weekKey}/...`, usePlayAssetPack(weekKey).
- **Challenge**: 주차별(weekKey). `challenge_${weekKey}` 프로그램, 스케줄러 슬롯별 배정.
- **Flow**: **주차/월 없음** → 전역 BGM 1개, 전역 파노 1개.

---

## 2. 목표 정리

- Flow도 **주차별(또는 월간)로 테마를 갈아타야 함.**
- “월간으로 하면 **12개 드롭다운만** 만들 수 있나?”  
  → 가능. **1~12월 선택 1개**로 월별 테마 1세트(BGM + 파노)만 두면 12개 조합으로 단순화 가능.
- **테마를 갈아야 하므로**, Flow 어셋 관리(Asset Hub Flow 영역)에 해당 기능을 추가하는 것이 맞음.  
  아래는 **실행 없이 분석만** 정리.

---

## 3. 설계 옵션

### 3.1 옵션 A: 월간(12개) — “12개 드롭다운만”

- **의미**: 1월~12월 중 하나 선택 → 그 **월**에 해당하는 Flow 테마 1세트(BGM + 파노) 사용.
- **UI**: Asset Hub Flow 탭에 **월 선택 드롭다운 1개**(1월 ~ 12월). 선택한 월에 대해 기존처럼 BGM 목록/선택 + 파노 목록/선택.
- **데이터**:  
  - 저장소: 기존과 동일하게 `audio/flow/bgm/`, `flow_backgrounds/pano/` 아래 파일 공유 가능.  
  - **설정(어떤 월에 어떤 BGM/파노 쓰는지)** 만 월별로 나누면 됨.  
  - 예: `think_asset_packs`에  
    - 기존 `iiwarmup_flow_bgm_settings` / `iiwarmup_flow_pano_settings`를 **월별**로 확장하거나,  
    - `iiwarmup_flow_assets_by_month` 같은 **단일 row**에 `assets_json: { byMonth: { 1: { bgmPath, panoPath }, 2: { ... }, ... } }` 형태.
- **구독자 재생 시**:  
  - `weekKey`에서 **월**만 추출 (예: `2025-03-W2` → 3월).  
  - 스케줄 API가 해당 월의 `flowBgmPath`, `flowPanoPath`를 내려주고, flow-phase는 그 경로를 사용하도록 변경.

**장점**: UI가 단순(월 1개 드롭다운). 운영도 “이번 달 테마만 갈아끼우면 됨”으로 이해하기 쉬움.  
**단점**: 같은 달 내 모든 주가 동일 테마(주차별 세분화 없음).

### 3.2 옵션 B: 주차별(weekKey, 48슬롯/년)

- **의미**: Think/Play처럼 `weekKey`(예: 2025-02-W3) 단위로 Flow BGM·파노 세트 배정.
- **UI**: Asset Hub에 스케줄러와 유사하게 연·월·주차 선택 후, 해당 주차용 BGM/파노 설정.
- **데이터**: weekKey별로 BGM 경로·파노 경로 저장 (rotation_schedule에 flow_* 컬럼 추가 또는 별도 테이블/think_asset_packs 확장).
- **구독자 재생 시**: 스케줄 API가 `weekKey`에 맞는 flow BGM/파노를 반환하고, flow-phase는 그 값을 사용.

**장점**: 주차마다 다른 테마 가능.  
**단점**: 48슬롯 관리·UI 복잡도 증가. “12개 드롭다운만” 요구와는 맞지 않음.

### 3.3 옵션 C: 하이브리드 (월 선택 + 월 내 주차 선택)

- 월 드롭다운 1개 + “해당 월의 1~4주차 중 어떤 주차용인지” 선택.  
  월간 12 × 주차 4 = 48가지지만, UI는 “월 1개 + 주차 1개” 두 개 드롭다운으로 정리 가능.  
  데이터 구조는 옵션 B에 가깝되, 키를 `month`+`week`로 두면 됨.

---

## 4. “12개 드롭다운만”에 대한 답

- **진짜로 “드롭다운 1개만”** 이라면: **월(1~12) 선택 드롭다운 1개**로 월별 테마만 두는 **옵션 A**가 해당합니다.  
  “12개의 드롭다운”이 “12개월을 고를 수 있는 드롭다운 1개”를 의미하면, 그렇게 구현 가능합니다.
- 12개 **세트**(1월용, 2월용, …)를 “각각” 드롭다운으로 두는 방식은 UI가 복잡해지므로, “월 선택 1개 + 해당 월에 대한 BGM/파노 설정”이 적당합니다.

---

## 5. Flow 어셋에 기능을 넣을 위치 (추가 시)

구현 시 수정/추가 포인트만 나열. **실행·코드 변경 없이** “어디를 건드리면 되는지”만 정리.

1. **Asset Hub — Flow 탭**
   - **FlowBgmPanel**  
     - 상단에 **월(1~12) 선택 드롭다운** 추가.  
     - 선택한 월에 대해 기존처럼 BGM 목록/선택, 파노 목록/선택 유지.
   - `app/admin/iiwarmup/assets/page.tsx`  
     - Flow 탭일 때도 “월” 상태를 하나 두고 FlowBgmPanel에 `month` props로 넘길 수 있음 (Think의 `selectedMonth`와 유사).

2. **데이터 계층**
   - **useFlowBGM / useFlowPano**  
     - 현재: `BGM_SETTINGS_ID` / `PANO_SETTINGS_ID` 단일 row.  
     - 변경: **월별**로 읽기/쓰기 (예: `assets_json.byMonth[month].bgmList`, `selectedBgm`, `panoList`, `selectedPano`).  
     - 또는 월별 row id 규칙 (예: `iiwarmup_flow_bgm_2025_01`)을 두고 월만 바꿔가며 조회/저장.
   - **Storage 경로**  
     - 파일 자체는 `audio/flow/bgm/`, `flow_backgrounds/pano/` 재사용 가능.  
     - “어떤 월에 어떤 파일을 쓰는지”만 설정에서 월별로 매핑하면 됨.  
     - 필요 시 `flow_backgrounds/pano/2025_01_xxx.webp` 처럼 월을 경로에 넣는 규칙도 가능 (선택).

3. **구독자 쪽 — 어떤 테마를 쓸지**
   - **GET /api/schedule/[weekKey]**  
     - `weekKey`에서 **month** 추출.  
     - Flow용 설정(위 월별 구조)에서 해당 월의 `flowBgmPath`, `flowPanoPath`를 조회해 응답에 **flowBgmPath, flowPanoPath** 필드로 추가.
   - **flow-phase 페이지**
     - 현재: `FlowPhaseClient`가 `useFlowBGM()`/`useFlowPano()`로 **전역** 선택값만 사용.  
     - 변경 방향:  
       - **A)** URL 쿼리로 `weekKey`(또는 `month`)를 받고, **스케줄 API 한 번 호출**해 해당 주(또는 월)의 flow BGM/파노 URL을 받아서 엔진에 넘김.  
       - **B)** 또는 iframe이 열릴 때 부모가 `postMessage`로 flow BGM/파노 URL을 넘기고, flow-phase는 그걸 사용.  
     - 어느 쪽이든 “전역 훅만 보는” 현재 구조에서 “**주차/월에 따라 결정된 URL**”을 쓰도록 바꾸면 됨.

4. **FlowEngine**
   - 이미 `startGame(bgmPath?, panoPath?)` 형태로 경로를 받고 있으므로, **경로만** 월/주차 기준으로 넘겨주면 됨. 엔진 내부 로직 변경은 최소화 가능.

---

## 6. 정리

- **현재**: Flow는 전역 BGM 1개 + 전역 파노 1개만 사용. 주차/월 없음.
- **목표**: Flow도 주차별(또는 월간) 테마. “12개 드롭다운만” → **월(1~12) 선택 1개**로 월간 테마 구성 가능.
- **추가 위치**: Flow 어셋 쪽 — **FlowBgmPanel + useFlowBGM/useFlowPano**를 월별로 확장하고, 스케줄 API에서 해당 월(또는 weekKey에서 추출한 월)의 flow BGM/파노를 내려주고, flow-phase는 그 값을 사용하도록 하면 됨.

---

## 7. 구현 완료 사항 (적용됨)

- **useFlowBGM(month?) / useFlowPano(month?)**: `assets_json`에 `byMonth: { [1..12]: { selectedBgm } }` 확장. `month` 없으면 기존 전역 `selectedBgm`/`selectedPano` 사용(하위 호환).
- **FlowBgmPanel**: 상단에 월(1~12) 선택 드롭다운 추가. 선택한 월에 대해 BGM·파노 목록/선택 유지.
- **GET /api/schedule/[weekKey]**: `parseWeekKey`로 월 추출 후 해당 월의 `flowBgmPath`, `flowPanoPath`(Storage 경로) 응답에 포함.
- **FlowPhaseClient**: URL에 `weekKey` 있으면 스케줄 API 호출 후 `flowBgmPath`/`flowPanoPath` 사용; 없으면(관리자 직접 열기) 현재 월 기준 `useFlowBGM`/`useFlowPano` 사용.
- **SubscriberScheduleData**: 타입에 `flowBgmPath`, `flowPanoPath` 추가.
