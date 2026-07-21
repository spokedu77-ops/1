# SPOMOVE Catalog Family Audit

Commit B 산출물. 사람 판정값(C1/C2)은 이 문서에 넣지 않는다.  
North Star: `SPOMOVE_COMMERCIAL_PRODUCT_PLAN.md`

## 1. 목적

실행 가능한 모든 Preset을 분석해 **고유 Catalog Family**와 Theme·Stage·Variant 후보를 가른다.  
Audit CSV·Signature는 **도구**다. 제품 완료는 Golden Brief·출시 후보·축 공백 확정이다.

## 2. 비범위

Hub / Session / Catalog 운영 타입 / Family 카드 / Theme UI / 직접 카피 노출 / Preset·Expansion 삭제·ID 변경 / Activity Family·Movement Profile·Resolver·Engine / 썸네일·가이드 자산 변경.

## 3. 세 계층 (+ Class Set)

| 계층 | 역할 |
| --- | --- |
| Preset | Engine 실행 데이터 |
| Activity Family | 움직임 호환성 (Catalog 부모 아님) |
| Catalog Family | 고유 활동 콘텐츠 |
| Class Set | 여러 Family 설정 순서 조합 (운영) |

```
Catalog Family → Theme·Stage·Variant → Preset
Catalog Family ↔ Activity Family
Class Set → [Family 설정…]
```

## 4. 분류 계층

- **Family** — 판단 규칙·진행 경험이 본질적으로 다름  
- **Theme** — 규칙 동일, 자산만  
- **Stage** — 같은 규칙, 수행 부담 증가  
- **Variant** — 규칙 본질 유지, 표현만  

## 5. Family 판정 기준

자극 문법 · 판단 정보 · 정답 규칙 · 반응 매핑 · 시간/진행 · 피드백/목표 중 본질 차이 → 별도 Family.  
테마만 / 속도만 / 라운드만 → Family 아님.

## 6. Theme 판정 기준

규칙 동일, 자산만: color / fruit / animal / food / nature / vehicle (코드 ID).

## 7. Stage 판정 기준

같은 규칙 안 길이·방해·노출·라운드·tier·bonus 등 부담 증가.  
level이 규칙 자체를 바꾸면 사람 검수에서 Family 분리 가능.

## 8. Variant 판정 기준

배치·아이콘·보너스 유무 등 표현 차이.

## 9. Signature

버전 접두 `v1|`. 규칙 변경 시 `v2`.  
같은 Signature ≠ 같은 Family.

| 종류 | 역할 |
| --- | --- |
| Runtime | 실행 구성 전체 (mode·level·options·theme·rounds·cue) |
| Mechanic | Theme·cue·rounds 제외, mode별 판단 키 allowlist |
| Theme | `v1|theme=…` |
| Stage | level·rounds·cue·관련 tier 등 |

미지원 Engine mode → WARN + verify 실패.

## 10. Canonical 선정 기준

isReady → 기본 규칙 → Core → 기본 Theme → 자산 안정 → URL → sortOrder → presetId.  
가장 어렵거나 화려한 것 아님.

## 11. Legacy 정책

`preserve-direct` | `map-to-family-option` | `manual-review`  
Phase 1은 정책만. redirect는 Phase 2+.

## 12. 검수 절차

```
Commit B (자동 인벤토리)
→ C1/D1 Golden 3 → Phase 2A
‖ C2/D2 전체 → Phase 2B
```

## 13. Batch A

반응인지 Theme 클론: 사분할 · 전면 · 2분할 · 3패널 · 3패널 다른색.  
Family/Theme 문법 기준 샘플.

## 14. Batch B

Simon / Flanker / Stroop.  
Uniform·Random·숫자/색·Mixed Size·Congruency → 사람 판정 (Signature 자동 채택 금지).

## 15. Batch C

순차 기억 / Flow / DIVE / Game-specific.  
길이·Bonus·시간·목표·Built-in 움직임.

## 16. Phase 1 완료 기준

- **2A:** Golden 3 Brief(10) + 세트 3 + C1/D1  
- **2B:** Launch 8~10 + C2/D2 + 축 공백  
- CSV만 APPROVED ≠ 제품 완료  

## 17. Phase 2 인계 항목

- **2A:** Golden Brief·카피·Guide·세트 3·Canonical 매핑  
- **2B:** full review · Legacy · 숨김 · 축 공백  

생성: `npm run audit:spomove-family`  
검증: `npm run verify:spomove-family-audit`  
원본: `docs/spomove-family-audit.generated.csv` (**직접 편집 금지**)
