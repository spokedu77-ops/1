# SPOMOVE Admin Refactor 89 Catalog Plan

## Purpose

SPOMOVE admin will be refactored around the final 89 active programs. This is not a bulk migration. Each program must be changed one by one, then verified before moving to the next program.

Programs not included in the 89 active catalog are not deleted. They remain visible in admin as hold items, but they are hidden from SPOKEDU MASTER user-facing catalog.

## Fixed Display Order

The catalog order is fixed as:

1. 반응 인지
2. 시지각 반응
3. 사이먼 이펙트
4. 플랭커 이펙트
5. 스트룹 이펙트
6. 순차 기억
7. 다이브
8. 보류

Implementation note:

- SPOKEDU MASTER section order currently lives in `app/spokedu-master/spomove/spomovePresetDisplayModel.ts` as `SPOMOVE_PROGRAM_GROUP_SECTION_ORDER`.
- SPOKEDU MASTER filter tab order currently lives in `app/spokedu-master/spomove/SpomoveHubView.tsx` as `PROGRAM_GROUP_TABS`.
- Admin must show active and hold programs. SPOKEDU MASTER must show active programs only.

## Status Rules

| Status | Admin | SPOKEDU MASTER | Meaning |
| --- | --- | --- | --- |
| active | Show | Show | Included in final 89 catalog |
| hold | Show | Hide | Existing or planned-out item preserved, not in active catalog |
| planned | Show | Hide | Future item, not active yet |

Do not remove code, assets, or records just because a program is not part of this active list.

## Number Rules

Admin number and engine number must be aligned.

Each program pass must verify:

- catalog number
- engine mode
- engine level
- preset id
- display title
- user-facing visibility
- admin visibility

Avoid legacy remap expansion unless a legacy id is required for old saved sessions. If a legacy id remains, document it explicitly as `legacy`.

## Timing Rules

Hardcoded timing should be removed from program behavior over the refactor.

Every active program should have an editable timing model. The timing fields may differ by engine, but the source must be configurable rather than hidden in component constants.

Common timing fields:

- `durationSec`: total play time
- `cueSeconds`: stimulus display interval or cue cadence
- `rounds`: repetition or round count
- `speedSec`: stimulus speed/cadence
- `bonusTimeSec`: bonus time duration, when applicable
- `intervalWorkSec`, `intervalRestSec`, `intervalSets`: interval mode, when applicable

## Visual Reaction Timing Map

시지각 반응 requires a separate timing audit because the meaning of time is different per game.

| Program | Difficulty | Timing Fields To Connect |
| --- | --- | --- |
| 풍선 터뜨리기 | 쉬움 | total play time, balloon spawn interval, balloon visible time |
| 파도 피하기 | 쉬움 | total play time, wave spawn interval, obstacle speed or danger duration |
| 떨어지는 벽돌 | 보통 | total play time, brick fall speed, brick spawn interval |
| 두더지 잡기 | 쉬움, 보통 | total play time, mole visible time, mole spawn interval, bonus time |
| 축구: 골키퍼 | 쉬움, 보통 | total play time, ball launch interval, reaction limit, bonus time |
| 손 따로, 발 따로 | 쉬움, 보통, 어려움 | total play time, stimulus display time, next stimulus interval |
| 흰 공 찾기 | 쉬움, 보통, 어려움 | total play time, shuffle/preview time, answer limit |
| 숫자 연산 기차 | 보류 | define timing only; hide from SPOKEDU MASTER |

Note: 손 따로, 발 따로 is the existing modified quadrant / 4-split variant program. Do not create it as a new engine unless the existing engine cannot support the required behavior.

## Active 89 Catalog

### 1. 반응 인지: 37

Time adjustable.

1. 공간방향 자극, 전체형 중앙 화살표, 화살표
2. 공간방향 자극, 전체형 중앙 화살표, 색상 화살표
3. 4분할 자극, 그리드형, 테마 1
4. 4분할 자극, 그리드형, 테마 2
5. 4분할 자극, 그리드형, 테마 3
6. 4분할 자극, 그리드형, 테마 4
7. 4분할 자극, 그리드형, 테마 5
8. 4분할 자극, 그리드형, 테마 6
9. 4분할 자극, 그리드형, 테마 7
10. 전면단일 자극, 전체형, 테마 1
11. 전면단일 자극, 전체형, 테마 2
12. 전면단일 자극, 전체형, 테마 3
13. 전면단일 자극, 전체형, 테마 4
14. 전면단일 자극, 전체형, 테마 5
15. 전면단일 자극, 전체형, 테마 6
16. 전면단일 자극, 전체형, 테마 7
17. 2분할 자극, 패널형, 테마 1
18. 2분할 자극, 패널형, 테마 2
19. 2분할 자극, 패널형, 테마 3
20. 2분할 자극, 패널형, 테마 4
21. 2분할 자극, 패널형, 테마 5
22. 2분할 자극, 패널형, 테마 6
23. 2분할 자극, 패널형, 테마 7
24. 3분할 자극, 패널형, 테마 1
25. 3분할 자극, 패널형, 테마 2
26. 3분할 자극, 패널형, 테마 3
27. 3분할 자극, 패널형, 테마 4
28. 3분할 자극, 패널형, 테마 5
29. 3분할 자극, 패널형, 테마 6
30. 3분할 자극, 패널형, 테마 7
31. 랜덤분할 자극, 전체/패널형, 테마 1
32. 랜덤분할 자극, 전체/패널형, 테마 2
33. 랜덤분할 자극, 전체/패널형, 테마 3
34. 랜덤분할 자극, 전체/패널형, 테마 4
35. 랜덤분할 자극, 전체/패널형, 테마 5
36. 랜덤분할 자극, 전체/패널형, 테마 6
37. 랜덤분할 자극, 전체/패널형, 테마 7

Theme names must be finalized before editing all themed entries. Until then, use stable theme ids and temporary labels.

### 2. 시지각 반응: 13

Time adjustable. See the timing map above.

38. 풍선 터뜨리기, 쉬움
39. 파도 피하기, 쉬움
40. 떨어지는 벽돌, 보통
41. 두더지 잡기, 쉬움, bonus time
42. 두더지 잡기, 보통, bonus time
43. 축구: 골키퍼, 쉬움, bonus time
44. 축구: 골키퍼, 보통, bonus time
45. 손 따로, 발 따로, 쉬움
46. 손 따로, 발 따로, 보통
47. 손 따로, 발 따로, 어려움
48. 흰 공 찾기, 쉬움
49. 흰 공 찾기, 보통
50. 흰 공 찾기, 어려움

Hold:

- 숫자 연산 기차, 쉬움
- 숫자 연산 기차, 보통
- 숫자 연산 기차, 어려움

### 3. 사이먼 이펙트: 10

Time adjustable.

51. 화살표, 보통
52. 화살표, 어려움
53. 도형, 보통
54. 도형, 어려움
55. 풍선, 보통
56. 풍선, 어려움
57. 랜덤 테마, 보통
58. 랜덤 테마, 어려움
59. 카모플라쥬, 보통
60. 카모플라쥬, 어려움

### 4. 플랭커 이펙트: 17

61. 화살표, 보통, 좌우
62. 화살표, 어려움, 상하좌우
63. 랜덤 자극, 보통, 색상+, 테마 1
64. 랜덤 자극, 보통, 색상+, 테마 2
65. 랜덤 자극, 보통, 색상+, 테마 3
66. 랜덤 자극, 보통, 색상+, 테마 4
67. 랜덤 자극, 보통, 색상+, 테마 5
68. 랜덤 자극, 보통, 색상+, 테마 6
69. 랜덤 자극, 보통, 색상+, 테마 7
70. 극단, 보통, 색상+, 테마 1
71. 극단, 보통, 색상+, 테마 2
72. 극단, 보통, 색상+, 테마 3
73. 극단, 보통, 색상+, 테마 4
74. 극단, 보통, 색상+, 테마 5
75. 극단, 보통, 색상+, 테마 6
76. 극단, 보통, 색상+, 테마 7
77. 극단, 어려움, 화살표

### 5. 스트룹 이펙트: 4

78. 색상화살표, 보통, 기본
79. 색상화살표, 어려움, 배경간섭 추가
80. 단어, 보통, 기본
81. 단어, 어려움, 배경간섭 추가

### 6. 순차 기억: 6

82. 순서 기억, 쉬움, 3개
83. 순서 기억, 보통, 5개
84. 순서 기억, 쉬움 -> 보통 -> 어려움, 3~7개
85. 순서 기억, 어려움, 커스텀
86. 랜덤 기억, 어려움, 퀴즈
87. 랜덤 기억, 어려움, 전체 공개

Hold:

- 직접 지정 10색

### 7. 다이브: 2

88. 액션 무브, 우주
89. 모션 게이트, 우주

Rename rules:

- Existing 기본모드 becomes 액션 무브.
- Existing 컬러게이트 becomes 모션 게이트.
- Future sports and fitness-element themes are planned only.

## One-Program Work Checklist

For each program, complete these before touching the next one:

1. Confirm current preset id.
2. Confirm current admin entry.
3. Confirm current engine mode and level.
4. Assign final catalog number.
5. Assign final title, group, subtype, difficulty, and theme.
6. Align admin number and engine number.
7. Replace hardcoded timing with configurable timing.
8. Confirm admin shows the program.
9. Confirm SPOKEDU MASTER hides hold/planned programs.
10. Run focused QA.

## First Implementation Target

Start with:

1. 반응 인지 - 공간방향 자극 - 화살표
2. 반응 인지 - 공간방향 자극 - 색상 화살표

These are the safest reference programs because they map to the simplest existing engine path: `basic` level 1 with optional color arrow mode.

Current source mapping:

| Final No. | Current Preset ID | Engine | Current Timing Source | Final Name |
| --- | --- | --- | --- | --- |
| 1 | `reaction-cognition-space-direction-01` | `basic` level `1` | `cueSeconds` x `rounds` | 반응 인지 - 공간방향 자극 - 화살표 - 전체형 중앙 화살표 |
| 2 | `reaction-cognition-space-direction-color-01b` | `basic` level `1`, `spatialArrowColorMode: color`, `spatialArrowColorMapping: compass` | `cueSeconds` x `rounds` | 반응 인지 - 공간방향 자극 - 색상 화살표 - 전체형 중앙 화살표 |

Timing behavior for these two:

- Editable field: stimulus interval, currently `cueSeconds`.
- Repetition field: `rounds`.
- Session duration is derived as `cueSeconds * rounds`.
- SPOKEDU MASTER already passes `cueSeconds` through the session URL and briefing UI.

Implementation caution:

- `officialSpomovePresets.ts` currently reassigns catalog order through `assignSequentialSortOrders(...)`.
- This means final numbering must be validated against the final array order, not only each preset object's inline `sortOrder`.
