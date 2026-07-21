# SPOMOVE Phase 0 수동 QA 체크리스트

이 문서는 Phase 0 **종료 증거**다.  
`test:spomove-phase0` PASS만으로는 종료·Phase 1 진입이 불가하다.  
13개 전부 Pass + 하단 승인 문구가 있어야 Commit B 이후 C1로 진행한다.

실패 1건이라도 있으면 → **Phase 0 Closure**로만 수정. Audit Seed와 섞지 않는다.

---

## 메타 (필수)

| 항목 | 기록 |
| --- | --- |
| 실행일 | 2026-07-22 |
| 담당자 | agent + 사용자(실기기 #11) |
| 커밋 SHA | aa4f846e9b28f32734c85fecbe2ebb19b33cadb3 (시작 시점 HEAD; Closure 미커밋 변경 포함 가능) |
| 배포 URL | local |
| 환경 | local |
| 브라우저 | (수동 기입) |
| 기기·화면 크기 | (수동 기입 · #11은 실기기) |
| `test:spomove-phase0` 결과 | **7 files / 48 tests PASS** (2026-07-22) |
| 발견 이슈 링크 | |
| 최종 판정 | **코드·계약 검증 Pass · #11 실기기 사용자 확인 필요** → 승인 칸은 사용자 서명 |

### 자동·코드 계약 점검 (에이전트)

| # | 시나리오 | 코드/계약 근거 | 에이전트 |
| --- | --- | --- | --- |
| 1–2 | Start/Settings | `StartBriefing` / `SettingsBriefing` · `beginConfiguredSession` | OK |
| 3 | sameSide/opposite | `compactMovementInstruction` + tests | OK |
| 4–6 | Fixed / bodyCue / DIVE | Settings 분기·요약 유지 (계약 테스트) | OK |
| 7–8 | Recent / Result | `entry=start` · `reopenStartConfirmation` | OK |
| 9 | done Space | Space는 idle+Setup만 | OK |
| 10 | Legacy autostart | `entryParam == null && autostart=1` | OK |
| 11 | 모바일 가이드 | Hub「가이드 보기」문자열·액션 존재 | **실기기 터치 = 사용자** |
| 12 | Hub 헤더 | 「사전 설정된 공식 조건」 없음 | OK |
| 13 | Projector | FS/Audio 차단 UI 유지 (계약) | OK |

---

## 시나리오 (수동 UI · 사용자)

| # | 시나리오 | Pass 조건 | 결과 | 증빙 |
| --- | --- | --- | --- | --- |
| 1 | Selectable · 시작 | Start 요약 → 명시 시작 → Running은 Engine only | ☐ | URL·화면 캡처 |
| 2 | Selectable · 설정 | Compact 움직임·속도·난이도 → 명시 시작 | ☐ | 화면 캡처 |
| 3 | sameSide / opposite | Compact 안내 문구가 실제로 다름 | ☐ | **두** 화면 캡처 |
| 4 | Fixed MQ1 | 움직임 선택 없음 · fixed 요약 유지 | ☐ | 화면 캡처 |
| 5 | bodyCue MQ2~4 | 화면 손·발 안내 분기 유지 | ☐ | 화면 캡처 |
| 6 | DIVE | diveBuiltIn · 움직임 행 없음 | ☐ | 화면 캡처 |
| 7 | Recent | `같은 설정으로 시작` → `entry=start` | ☐ | URL 캡처 |
| 8 | Result 재실행 | `같은 설정으로 시작` → Start 확인 | ☐ | URL·화면 캡처 |
| 9 | done Space | 완료에서 Space 재실행 안 됨 | ☐ | 동작 메모 |
| 10 | Legacy URL | `?autostart=1` vs `?entry=start&autostart=1` | ☐ | URL 두 개 |
| 11 | 모바일 가이드 | 「가이드 보기」 항상 · Sheet · **실기기** | ☐ | 터치 캡처 |
| 12 | Hub 헤더 | 「사전 설정된 공식 조건…」 없음 | ☐ | 화면 캡처 |
| 13 | Projector | Fullscreen/Audio 차단 복구 UI | ☐ | 화면 캡처 |

---

## Phase 0 종료 승인

**조건:** 위 13개 수동 Pass(또는 사용자 승인으로 코드 검증 수용) + 메타 기입.

```
Phase 0 종료 승인
Public 즉시 실행, 과밀 Settings, 양산형 description 노출이 차단됐으며
Phase 1 Catalog Family 감사로 진입한다.

승인일:
승인자:
커밋 SHA:
```

참고: Commit B(자동 인벤토리)는 Hub/Session을 바꾸지 않으며, 제품 게이트상 **사용자 승인 문구**와 병행 가능. C1(Golden 결정) 전에 승인 문구를 채운다.
