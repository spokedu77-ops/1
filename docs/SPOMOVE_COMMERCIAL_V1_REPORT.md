# SPOMOVE 상용화 1차 최종 보고서

작성: 2026-07-22  
상태: **방향 확정 · 실행 대기 (Phase 0 QA → 1A Triage)**  
기준 문서: `SPOMOVE_COMMERCIAL_PRODUCT_PLAN.md` v1.1

---

## 1. 한 줄 결론

실행 플랫폼은 있다. 유료 상품은 없다.  
지금부터 파는 것은 **Catalog Family 목록이 아니라, 오늘 실행하고 다음 주에 다시 쓰는 완성 체육수업**이다.  
Audit·테스트는 그 수업을 만들기 위한 **도구**이며, **Golden Family 3 + 공식 세트 3**이 첫 실물이다.

---

## 2. 채택한 North Star

| 항목 | 내용 |
| --- | --- |
| 제품 질문 | 1차 고객이 **계속 결제할 이유**가 코드·화면에 있는가 |
| 제품 약속 | 매트 1장 · 5~15분 · **다음 수업 재사용** |
| Metric | 주간 Premium 중 **동일 Family·다른 설정 재실행** 비율 |
| 고객 | 유아·초등·특수 · TV/프로젝터+매트 · **개인 강사·소규모 센터** |
| 비고객(초기) | 가정 · 대형 학교 시스템 · 프랜차이즈 OS · 선수·센서 정밀 |

---

## 3. 코드 현실 (요약)

**유지할 기반:** Start/Settings 분리 · Session state SSOT · Running=Engine · Movement Profile·Resolver · Recent·URL · Master 결제 기반.

**상품 부재:** Hub=`OFFICIAL_SPOMOVE_LIBRARY` Preset 카드 · Expansion Level×Theme 클론 · Catalog/Class Set/Entitlement by Family 없음.

판정: **플랫폼 O · 구독 상품 X.**

---

## 4. 이번 판정에서 고친 핵심 6+α

1. **고객 좁힘** — “체육 지도자” → 개인 강사·소규모 센터.  
2. **Class Set = 사용 상품** — Family는 콘텐츠, 세트는 교사의 작업 단위. Hub 상단=오늘 쓸 수업.  
3. **Audit가 Slice를 막지 않음** — B → C1/D1 → **2A** / 병렬 C2/D2 → 2B.  
4. **3 → 8~10** — Golden 깊게, Launch는 후보 확장.  
5. **Brief 10필드** — 대상·재사용 경로 추가, Hub/Guide/세트 SSOT.  
6. **2A에 세트 3개** — Hub만으로는 “준비 절감” 검증 불가.  
7. **Lite/Premium 숫자** · **Entitlement** · **이벤트 이름 Phase 2** · **Pilot 가설** · **콘텐츠 약속 보수화**.

---

## 5. 네 계층 · 판매 정의 (비선형)

```
Catalog Family → Theme·Stage·Variant → Preset
Catalog Family ↔ Activity Family (움직임 참조)
Class Set → 여러 Catalog Family 설정 순서 조합
```

Activity Family ≠ Catalog 부모. Class Set ≠ Family 하위.

실패 판매: 80종 · 다양한 테마 · 색상 반응.  
성공 판매: 목적 → 세트(또는 Family 설정) → 5~15분 완성 → 저장·재사용 → 정기 공급.

Premium = **구성·저장·반복 운영 권한** (개수 권한 아님).

---

## 6. Golden · Launch · 보류

**Golden 3:** 사분할 이미지 반응 · Flanker 또는 Stroop · 순차 위치 기억.  
**Launch 후보 ~10:** 사분할·2분할·대표색 연상·Simon·Flanker·Stroop·순차기억·Flow·MQ·DIVE.  
**보류:** Theme 클론 카드 · Guide/Stage 부실 · 속도·라운드만 다른 변형.  
**DIVE·MQ:** Golden 이후.

---

## 7. 수정된 Phase · 게이트

| Phase | 산출 | 진입 조건 |
| --- | --- | --- |
| 0 | QA·Closure·승인 | 타임박스 반나절 |
| 1A | 출시후보·Golden3·축공백 **결정서** | Phase 0 승인 |
| 1B | Golden Brief×10 · 카피 · Guide · 세트3 | 1A |
| 2A | Vertical Slice + 이벤트 최소 | **Golden 3만 승인** (전체 D 불필요) |
| C2/D2 | 전체 Library | 2A와 병렬 |
| 2B | Launch 8~10 | C2/D2 + Slice 검증 |
| 3 | 저장·내세트·기록 → **내부/협력자 Preview만** (유료·외부 Trial=Phase 4+) | |
| 4 | Entitlement·만료·CTA | |
| 5 | Pilot 30일 | |

---

## 8. Entitlement · 가격 경계 (초기)

무료: Family1 · Theme2 · Stage1 · Movement2 · 세트1 · **다른 움직임 체험 필수** · 저장 없음.  
Lite: Family3 · 기본 옵션 · Recent3 · 세트1~2 · 저장·내세트 없음.  
Premium: 출시 전체 · Guide·세트·저장·내세트·Recent·기록.

금지: Hub만 잠그고 Session URL 우회.  
만료: 데이터 보존 + 실행 잠금 + 재구매 CTA.

---

## 9. 냉정 피드백 (반영 후 잔여 리스크)

| 리스크 | 내용 | 대응 |
| --- | --- | --- |
| Brief 공백 | 10필드를 채울 작성 역량이 병목 | Golden 3만 깊게, 나머지는 보류 |
| Flanker vs Stroop | Golden #2 미선택 | 1A에서 **하나**만 고르고 다른 쪽은 Launch |
| Master vs SPOMOVE | Premium 이유 충돌 가능 | Lite SPOMOVE 깊이 **숫자 준수**를 Phase 4 게이트에 명시 |
| 이벤트 | 이름만 정하고 수집 안 하면 Pilot 장님 | 2A에 `family_*` · `official_set_start` 최소 연결 |
| 세트 품질 | 큐레이션이 얕으면 Family Hub와 동일 실패 | 세트=실제 수업 순서, Brief와 동일 깊이 |
| 1A 속도 | “빠른 해체”가 다시 전수 감사로 비대화 | 1A 산출물=결정서 1장+표, C2로 나머지 이관 |

**동의·강화한 점:** Class Set을 Family와 동급 계층으로 올린 것, 2A에 세트 3개, Audit/Slice 분리, 고객 좁힘, Metric 단일화.

---

## 10. 문서 체계 (유지)

| 문서 | 역할 |
| --- | --- |
| `SPOMOVE_COMMERCIAL_PRODUCT_PLAN.md` | North Star v1.1 |
| `SPOMOVE_PHASE_EXECUTION_PLAN.md` | Audit·기술 수단 (순서 개정) |
| `SPOMOVE_PHASE0_QA_CHECKLIST.md` | Phase 0 증거 |
| **이 보고** | 1차 최종 합의 요약 |

---

## 11. 실제 다음 작업 (코드 아님)

1. Phase 0 QA 타임박스 → 승인 문구  
2. Phase 1A: Theme 클론·출시후보 8~10·**Golden 3 확정**·축 공백 결정서  
3. Phase 1B: Golden Brief 10 + 공식 세트 3 원고  
4. Commit B(자동 인벤토리)는 0 승인 후 · **C1/D1만으로 2A**  
5. 2A 구현 → 내부 사용 → 2B → 3 → 4 → Pilot  

**지금 금지:** 전 Preset Human Decision으로 2A 지연 · Hub 전면 개편 · 마케팅 대량 · Center 약속.

---

## 12. 최종 문장

> SPOMOVE 상용화 성공 = 개인 강사·소규모 센터가 **수업세트와 Family 설정**으로 오늘 수업을 끝내고, **같은 Family를 다른 설정으로 다시 쓰며**, Premium을 **준비 시간 때문에** 재결제하는 상태.

Audit CSV 완성과 테스트 개수는 그 상태에 도달했는지의 증거가 아니다.
