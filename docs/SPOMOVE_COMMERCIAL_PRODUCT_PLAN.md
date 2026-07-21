# SPOMOVE 상용화 제품 플랜 (North Star) v1.1

상태: **1차 최종 방향 확정 · Phase 0 QA 타임박스 대기 · Golden Slice 미착수**  
수단 문서: `SPOMOVE_PHASE_EXECUTION_PLAN.md`, `SPOMOVE_PHASE0_QA_CHECKLIST.md`  
종합 보고: `SPOMOVE_COMMERCIAL_V1_REPORT.md`

이 문서가 **제품·커밋 우선순위**의 최상위다. 테스트·Audit는 수단이다.

---

## 0. 성공 기준

### 제품 질문 (단 하나)

> 1차 고객이 SPOMOVE를 **계속 결제해야 할 이유가 코드와 화면에 실제로 존재하는가.**

### 내부 제품 약속 (의사결정 기준)

> 수업 시작 직전에도 **한 장의 매트**로 **5~15분** 활동을 구성하고, **다음 수업에 다시 활용**할 수 있다.

모든 기능은 이 약속을 강화해야 한다.

### North Star Metric (측정 가능)

> **주간 활성 Premium 계정 중, 동일 Catalog Family를 서로 다른 설정으로 다시 실행한 계정 비율**

예: 같은 사분할을 월·과일·자유발 / 목·동물·같은쪽발·빠른 Stage로 재실행.

보조: Activation · Retention · Revenue (상세는 보고 §13).

통과가 **아닌** 것: Vitest PASS, Audit CSV 완성, Preset·카드 개수, “80종” 카피.

---

## 1. 1차 고객 (고정)

### 핵심

유아·초등·특수체육 수업을 진행하며, **TV·프로젝터 + 스포매트**를 쓸 수 있는  
**개인 강사 및 소규모 체육센터**.

선택 이유: 기존 네트워크 · 5~15분 보조 반복 수요 · 구매 결정 빠름 · 준비시간 절감 측정 가능 · 매트+Premium 번들 용이.

### 초기 비핵심 (주력 제외)

일반 가정·학부모 · 대형 학교 시스템 · 프랜차이즈 전체 운영 · 선수 정밀 측정 · 센서 기반 평가 기대 고객.

---

## 2. 현재 위치

| 있음 (유지) | 없음 (상품 계층) |
| --- | --- |
| Preset·Engine · Start/Settings/Running 분리 · Session state SSOT · Engine only Running · Movement Profile·Resolver · Recent·URL · Master 결제·접근 기반 | Hub=Preset 카드 · Expansion Theme 클론 양산 · Catalog Family · Class Set · Entitlement by Family · 직접 Brief |

한 줄: **실행 플랫폼은 있고, 계속 결제하게 만드는 수업 상품은 없다.**

---

## 3. 네 계층 (절대 혼동 금지 · 비선형)

| 계층 | 역할 |
| --- | --- |
| **Preset** | Engine 실행 데이터 (숨김) |
| **Activity Family** | 움직임 호환성 (**Catalog의 부모가 아님**) |
| **Catalog Family** | 고유 활동 **콘텐츠** 단위 |
| **Class Set** | 여러 Family 설정을 순서 조합하는 **운영** 계층 (단일 Family 하위 아님) |

```
Catalog Family → Theme · Stage · Variant → Preset 결정
Catalog Family ↔ Activity Family (움직임 규칙 참조)
Class Set → [ Family 설정₁, Family 설정₂, … ] 순서 조합
```

선형 `Preset → Activity → Catalog → Class Set` 로 **구현·모델링하지 않는다.**

```
팔리는 것 = 오늘 바로 실행하고 다음 주에 다시 꺼내는 완성 체육수업
콘텐츠 단위 = Catalog Family
사용 단위 = Class Set (공식 → 이후 내 세트)
```

구독 가치:

```
고유 규칙 × 단계 × 움직임 × 운영 방식 × 저장·재사용 × 정기 공급
```

Theme = 보조.

---

## 4. Hub · 사용자 흐름

### 올바른 흐름 (우선)

```
수업 목적 → 공식 수업세트 → Family·설정 확인 → 실행
```

보조: Family 탐색 → Theme·Stage·Movement → 저장 → 내 세트.

### Hub 구조

1. **오늘 바로 쓰는 수업** (공식 세트)  
2. **수업 목적별 찾기** (5분·집중 전환·점프 없음·손·균형·인지·유아·특수기초…)  
3. **활동별 찾기** (7축 / 전문가용 2차: Simon·Flanker 등)  
4. Catalog Family 카드  
5. 최근 사용 · 저장 설정 (첫 사용자 최상단 금지)

카드 금지: Theme 나열 · Engine 용어 · Preset 번호 · 양산 배지 · 긴 안전 전문.

---

## 5. Family Product Brief (10필드 · 데이터 원본)

출시 Family마다 **직접 작성**. 검수 문서가 아니라 Hub·Start·Settings·Guide·세트·Premium 카피의 SSOT.

1. 권장 대상 (유아 / 초등저 / 초등고 / 특수기초 / 특수심화 — 전부 다 된다고 쓰지 말 것)  
2. 핵심 규칙  
3. 수행 방식  
4. 다른 Family와 차별점  
5. Theme  
6. Stage  
7. 허용 Movement  
8. 수업 활용 시간·위치  
9. 지도 방법 (준비·규칙·진행·중단 + 펼침: 멘트·조절·운영·안전·영상)  
10. 반복 활용 시나리오 (최소: 다른 Movement · 다른 Stage · 다른 수업세트)

Guide 첫 화면 = **30초 운영 도구** (준비·규칙·진행·중단). 장문·전원 영상 촬영 금지.

---

## 6. Golden Slice · Launch Catalog

### Golden Family 3 (먼저 깊게)

| # | Family | 검증 |
| --- | --- | --- |
| 1 | 사분할 이미지 반응 | Theme · Movement · 기본 Stage · 쉬운 흐름 |
| 2 | Flanker **또는** Stroop | 고인지 · 움직임 제한 · Stage · 차별 설명 |
| 3 | 순차 위치 기억 | 시간·순서 · 기억 길이 Stage · 단발 외 경험 |

→ 축: 직접 반응 / 주의·억제 / 순서·기억.  
DIVE·MQ는 Golden **이후**.

### Launch 검토 후보 ~10 (확정 아님)

사분할 · 2분할 · 이미지 대표색 연상 · Simon · Flanker · Stroop · 순차 위치 기억 · Flow·추적 · MQ · DIVE.

### 초기 Hub 보류

테마만 다른 3패널 · 3패널/다른색 중복 · 숫자·색만 다른 Flanker · 속도·라운드만 다른 카드 · Guide 없는 Family · Stage 불명 Family.

---

## 7. Phase 2A에 공식 수업세트 3개 필수

저장 UI 없이 **코드 큐레이션**만으로 충분.

| 세트 | 구성 요지 |
| --- | --- |
| 유아 5분 반응 전환 | 사분할 · 기본 Stage · 자유발 · ~4초 |
| 초등 10분 집중 도전 | 사분할 → Flanker/Stroop → 순차 기억 |
| 점프 없는 신체활동 | 밟고 정지 · 자유손 · 느린 속도 |

Phase 3: 세트 확대 · 내 세트 · 복제 · 순서 · 최근 세트 · 기록 연결.

---

## 8. Lite / Premium / 무료 (초기 숫자 · Pilot 후 조정)

| | 무료 QR | Lite | Premium |
| --- | --- | --- | --- |
| Family | 1 | 대표 3 | 출시 전체 |
| Theme / Stage / Movement | 2 / 1 / 2 | 기본·제한 | 허용 전체 |
| 공식 세트 | 1 | 1~2 | 전체 |
| Recent | — | 최근 3 | 전체 재사용 |
| 설정 저장 · 내 세트 · Guide 전체 · 기록 | 없음 | 없음·Guide 제한 | 있음 |
| 핵심 체험 | **같은 화면 × 다른 움직임** 필수 | 맛보기 | **구성·저장·반복 운영** |

Premium 차이 = 프로그램 개수 **X** / 수업 구성·저장·반복 **O**.

---

## 9. Entitlement (구현 전 점검 · Phase 4에서 강제)

금지: Hub만 잠그고 Session URL로 Premium 실행.

필요: Session → 이용권 → Family/Preset entitlement → 허용 실행 / Upgrade.

만료 시 **삭제 금지** (저장·내 세트·Recent·기록). 실행만 잠그고 재구매 CTA.

---

## 10. 콘텐츠 공급 (초기 3개월)

월: 공식 세트 1~2 · Guide 보강 · Theme Pack 0~1 · 사례.  
분기: 검증 Family ≤1 또는 Stage 의미 확장.

신규 Family: Brief → 내부 수업 → 현장 → Guide 수정 → 재사용 확인 → 출시.  
Theme만 교체 = 신규 Family 발표 금지.

---

## 11. 이벤트 (이름 Phase 2부터 고정)

`family_view|start|complete` · `guide_open` · `settings_change` · `official_set_start` · `saved_config_reuse` · `upgrade_view` · `checkout_start`  
필드: userId · catalogFamilyId · presetId · themeId · stageId · baseMovement · cueSeconds · source · occurredAt  
기존 Preset 이벤트 유지 + Family id 추가.

---

## 12. Pilot 가설 (30일 · 내부 의사결정용)

- 대부분 48h 내 1회 실행  
- 절반+ 7일 내 재실행  
- 절반± 3+ Family 또는 공식 세트  
- 의미 있는 비율: 동일 Family 다른 설정 재사용  
- 재구매 의사 · 이유 = “준비 쉬움” (개수 아님)

인터뷰: 다음 수업 재사용 · 움직임/속도로 다른 수업 느낌 · 준비시간 ↓ · 수준 조절 쉬움.

대상: 내부·파트타임 · 세미나 · 협력 센터 · 특수기관 · 매트 구매자.

---

## 13. 제품 Phase (수정본)

| Phase | 내용 | 게이트 |
| --- | --- | --- |
| **0** | QA 반나절 · Closure · 승인. 전략 금지 | 승인 문구 |
| **1A** | Commercial Triage: 클론·출시후보 8~10·Golden 3·보류·축 공백 | **결정서** (CSV 아님) |
| **1B** | Golden 3 × Brief 10 · 카피 · Guide · 세트 3 · Lite/Premium 위치 | Brief Pass |
| **2A** | Golden Vertical Slice: Catalog·Resolver·카드·Theme/Stage·Start/Settings·Guide·세트 3·이벤트 | 내부 검수 |
| **1B-full / C2·D2** | 전체 Library 매핑 (2A와 **병렬**, 2A 차단 금지) | |
| **2B** | Launch 8~10 + 전체 Audit 승인 | C2/D2 |
| **3** | 저장·내 세트·Recent·Result·기록·온보딩 → **내부/협력자 Preview만** (유료·외부 Trial 금지) | |
| **4** | Entitlement·Trial·만료·게이트·CTA·결제 이벤트·Legacy·Flag | |
| **5** | 유료 Pilot 30일 | NSM + 인터뷰 |

### Audit 커밋 순서 (North Star 우선)

```
Phase 0 승인
→ Commit B (전체 자동 인벤토리)
→ C1 / D1 (출시 후보 + Golden 3)
→ Phase 2A Golden Slice
    병렬: C2 / D2 (나머지 Library)
→ Phase 2B Launch Catalog
```

**전체 Human Decisions 완료 ≠ Phase 2A 진입 조건.**  
Phase 2A 진입 = **출시 후보 중 Golden 3만 승인**.

---

## 14. 즉시 순서

```
Phase 0 종료
→ 출시 후보 8~10 선별
→ Golden 3 Brief + 공식 세트 3
→ Golden Vertical Slice
→ 내부 사용
→ Launch Catalog 확장
→ 저장·재사용
→ Premium 게이트
→ 유료 Pilot
```

**지금 하지 않음:** 테스트 추가를 성과로 · 전 Preset 판정으로 Hub 지연 · 마케팅 대량 · Center 대시보드 약속 · Target Adapter 선개발.

---

## 15. 문서 체계

| 문서 | 역할 |
| --- | --- |
| **이 문서** | North Star · 고객 · 계층 · Phase · 경계 |
| `SPOMOVE_PHASE_EXECUTION_PLAN.md` | Audit·기술 수단 (2A 선진입 반영) |
| `SPOMOVE_PHASE0_QA_CHECKLIST.md` | Phase 0 증거 |
| `SPOMOVE_COMMERCIAL_V1_REPORT.md` | 1차 최종 보고 |

충돌 시 **이 문서 우선**.
