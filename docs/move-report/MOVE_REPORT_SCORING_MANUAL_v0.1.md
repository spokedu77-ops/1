# MOVE REPORT — MOVE TRACK

# SCORING MANUAL v0.1

### SPOKEDU Structured Field Observation Protocol

**Status: Field Pilot Version**

---

# 0. PURPOSE

MOVE TRACK은 아동의 운동능력을 다른 아동과 비교하거나 장애 정도를 판정하기 위한 평가도구가 아니다.

신체활동 프로그램 안에서 아동이

* 활동에 접근하고
* 실제로 참여하고
* 움직임을 시작하고
* 어떤 지원을 필요로 하며
* 어떤 움직임 경험까지 확장하는지

동일한 기준으로 관찰하기 위한 **현장 기록 프로토콜**이다.

## 핵심 원칙

### Participation before Performance.

운동기술의 정확성만으로 프로그램 참여를 판단하지 않는다.

### Typical Performance before Best Performance.

한 번의 최고 수행보다 해당 회기에서 반복적으로 관찰된 일반적인 참여 모습을 대표값으로 기록한다.

### Observation before Interpretation.

"집중력이 좋아졌다"보다
"추가 안내 없이 화면을 보고 3회 연속 매트로 이동했다"처럼 실제 행동을 기록한다.

### NULL is not Zero.

평가할 기회가 없었던 것과 기회가 있었지만 행동이 관찰되지 않은 것을 반드시 구분한다.

---

# SM-01. RECORDING UNIT

## 1. 의미 있는 참여기회

`Meaningful Participation Opportunity`

다음 조건을 충족하는 순간을 의미한다.

1. 아동이 활동에 접근할 수 있는 위치에 있고
2. 활동 또는 자극이 명확하게 제시되며
3. 아동이 반응하거나 참여할 현실적인 기회가 있고
4. 강사가 해당 행동을 관찰할 수 있는 상황

예:

* SPOMOVE 색상 자극이 제시됨
* 자신의 차례에 공이 제공됨
* 점프 경로 앞에 위치함
* 파트너 활동에서 자신의 순서가 옴

### 참여기회로 계산하지 않는 경우

* 다른 아동 차례를 기다리는 중
* 교구 세팅 중
* 아동이 공간 밖에 있음
* 활동 설명만 듣는 중
* 휴식 중
* 안전 문제로 활동이 중지됨

---

# SM-02. OBSERVATION OPPORTUNITY

## UI 항목

### 오늘 의미 있는 참여기회는 충분했나요?

선택:

* `1회`
* `2회`
* `3회 이상`
* `평가하지 않음`

DB:

`observation_opportunity_band`

---

## 기본 원칙

### 3회 이상

Structured Field 대표값 기록 가능.

### 2회

두 기회가 동일한 수준이면 대표값 기록 가능.

서로 다른 경우 보수적인 값을 기록하고 Observation Note에 편차를 남긴다.

### 1회

명확한 행동이 있었던 경우 기록은 가능하지만 **해당 회기의 대표적인 수행이라고 해석하지 않는다.**

### 0회 / 평가하지 않음

관련 Structured Field는 `NULL`.

---

# SM-03. PARTICIPATION PATHWAY

Field:

`participation_level`

이 값은 운동능력 점수가 아니다.

**해당 회기에서 아동이 활동에 어떻게 관여했는지를 나타내는 범주형 관찰값**이다.

---

## LEVEL 0 — 활동 진입 어려움

### 정의

의미 있는 참여기회가 있었지만 활동 또는 움직임에 진입한 행동이 관찰되지 않음.

### 포함 사례

* 활동 공간에서 지속적으로 벗어남
* 자극이나 교구가 제시되어도 접근하지 않음
* 활동 거부가 지속됨
* 활동과 관련 없는 행동만 지속됨

### 주의

감각 과부하, 정서적 어려움, 피로 등의 이유로 참여하지 못한 경우도 Level 0일 수 있다.

그러나 원인을 임의로 판단하지 않고 Observation Note에 관찰 가능한 상황만 기록한다.

---

## LEVEL 1 — 관찰 / 지향

### 정의

활동에 직접 움직임으로 참여하지는 않았으나 자극, 교구 또는 다른 사람의 움직임에 명확하게 주의를 향하는 행동이 관찰됨.

### 포함 사례

* SPOMOVE 화면을 바라봄
* 공이 움직이는 방향을 시선으로 따라감
* 다른 아동의 활동을 가까이에서 관찰함
* 새로운 교구를 바라보거나 접근함

### 제외

단순히 활동 공간에 존재하는 것만으로 Level 1을 부여하지 않는다.

---

## LEVEL 2 — 지원을 통한 참여

### 정의

직접적인 행동지시, 시범, 제스처 또는 신체적 지원을 통해 실제 목적성 있는 움직임에 참여함.

### 포함 사례

* "빨간색 밟아" 지시 후 매트 이동
* 강사가 먼저 시범을 보인 뒤 동일 동작 수행
* 손을 잡아 이동을 시작한 뒤 과제 수행
* 신체지원을 받아 공을 던짐

### 핵심

실제 움직임이 발생해야 한다.

관찰만 하는 경우 Level 1이다.

---

## LEVEL 3 — 독립적 움직임 시도

### 정의

직접적인 행동지시 또는 신체적 촉진 없이 목적성 있는 움직임을 시작하는 행동이 관찰됨.

다만 회기 전체에서 지속적이거나 반복적인 독립 참여가 주된 패턴이라고 보기에는 부족함.

### 포함 사례

* 화면 색상이 바뀌자 스스로 해당 방향으로 한 번 이동
* 자신의 차례를 인식한 뒤 공을 집어 던짐
* 교구를 보고 스스로 활동을 시작했으나 이후에는 지속적인 지원 필요

---

## LEVEL 4 — 반복 / 지속적 독립 참여

### 정의

독립적인 목적성 있는 움직임이 여러 참여기회 또는 활동 구간에서 반복적으로 관찰되며 활동 참여가 이어짐.

### 포함 사례

* SPOMOVE 자극마다 반복적으로 스스로 이동
* 별도의 행동지시 없이 자신의 차례마다 활동
* 한 활동이 끝난 뒤에도 다음 기회에 지속적으로 참여

### 주의

운동 수행의 정확성이 높을 필요는 없다.

목표물을 틀렸더라도 **스스로 참여하고 반복한 경우** Level 4가 가능하다.

---

# SM-04. INDEPENDENT INITIATION

Field:

`independent_initiation`

## 정의

> 활동 또는 자연스러운 자극이 제시된 뒤 강사의 직접적인 행동지시나 신체적 촉진 없이 아동이 목적성 있는 움직임을 시작한 행동.

핵심은 **정확한 수행이 아니라 움직임의 시작**이다.

---

## 값

### NULL — 평가하지 않음

관찰기회가 없거나 해당 회기에서 평가하지 않음.

### 0 — 관찰되지 않음

관찰기회가 있었으나 독립적인 움직임 시작이 관찰되지 않음.

### 1 — 1회 관찰

회기 중 명확한 Independent Initiation이 한 차례 관찰됨.

### 2 — 반복 관찰

동일 활동 또는 동일 유형의 참여기회에서 2회 이상 관찰됨.

### 3 — 활동 전반에서 반복

서로 다른 참여기회 또는 활동 구간에서 독립적인 움직임 시작이 반복적으로 관찰됨.

---

## CASE 01

SPOMOVE 화면에 빨간색이 표시됨.

강사가 아무 말도 하지 않음.

아동이 빨간 매트로 이동.

### 판정

`Independent Initiation = YES`

---

## CASE 02

화면에 빨간색이 표시됨.

강사가 "빨간색 밟아"라고 말함.

아동이 이동.

### 판정

`Independent Initiation = NO`

Participation은 Level 2 이상이 될 수 있다.

---

## CASE 03

강사: "OO야, 화면 볼까?"

화면 자극 확인.

추가 안내 없이 아동이 매트로 이동.

### 판정

`Independent Initiation = YES`

"화면 볼까?"는 주의환기 General Cue로 허용한다.

---

## CASE 04

강사: "네 차례야."

공을 아동 앞에 제공.

아동이 스스로 공을 들고 목표물을 향해 던짐.

### 판정

`Independent Initiation = YES`

"네 차례야"는 차례와 기회를 알려주는 Context Cue이며 구체적인 움직임을 지시하지 않는다.

---

## CASE 05

강사: "해봐."

아동이 공을 던짐.

### 판정

`Independent Initiation = NO`

"해봐"는 행동 시작 자체를 직접 요구하는 Action Cue로 분류한다.

---

## CASE 06

아동이 공을 보다가 강사가 손가락으로 공을 가리킴.

아동이 공을 집음.

### 판정

`Independent Initiation = NO`

목표 행동을 유도하는 Gestural Prompt가 제공됨.

---

## CASE 07

강사가 활동 시작 전 "준비"라고 말함.

SPOMOVE 자극이 나타남.

아동이 추가 안내 없이 이동.

### 판정

`Independent Initiation = YES`

단 "준비"가 해당 수업에서 이동을 직접 의미하는 조건화된 신호로 사용되고 있다면 NO로 판정한다.

---

# SM-05. GENERAL CUE DECISION RULE

## 질문 1

### 이 말이나 행동이 아동에게 "무엇을 해야 하는지" 알려주는가?

YES
→ Direct Prompt
→ Independent Initiation 인정하지 않음.

NO
→ 질문 2.

---

## 질문 2

### 단순히 주의, 차례, 상황 또는 기회만 알려주는가?

YES
→ General / Context Cue
→ 이후 스스로 움직인 경우 Independent Initiation 인정 가능.

NO
→ 애매하면 보수적으로 Direct Prompt로 판정.

---

# GENERAL CUE — 허용

### 주의환기

* "OO야"
* "화면 볼까?"
* "여기 봐볼까?"
* "준비됐어?"

### 차례·상황 안내

* "네 차례야."
* "다음이 OO 차례야."
* "준비."

### 환경제시

* 화면 자극
* 공 또는 교구를 활동 위치에 제공
* 활동 공간 개방

---

# DIRECT ACTION PROMPT — Independent 제외

### 움직임 시작 요구

* "시작"
* "가"
* "해봐"
* "움직여"

### 목표행동 구체화

* "빨간색 밟아"
* "저쪽으로 가"
* "점프해"
* "공 잡아"
* "던져"
* "여기 서"
* "오른쪽으로 가"

### Gesture

* 목표 위치를 반복적으로 가리킴
* 이동 방향을 손으로 유도
* 특정 교구를 집으라고 명확히 지목

### Model

* 강사가 목표 동작을 먼저 수행하여 따라 하도록 유도

### Physical

* 손 잡기
* 몸 방향 돌리기
* 팔을 들어 동작 유도

---

# SM-06. SUPPORT CATEGORY

Field:

`support_level`

## 중요

DB에서는 기존 코드 0–4를 사용할 수 있으나
**점수·평균·향상률 계산 금지.**

숫자는 저장용 코드일 뿐이다.

---

## 0 — Independent

추가 지원 없이 참여.

General Cue는 허용 가능.

---

## 1 — Verbal Prompt

구체적인 언어 안내를 통해 참여.

예:

* "빨간색 밟아"
* "공 던져"
* "저쪽으로 가"

---

## 2 — Gesture / Model

제스처 또는 시범을 통해 목표 움직임을 보여준 후 참여.

예:

* 목표 매트를 가리킴
* 점프 동작을 직접 보여줌
* 공 던지는 자세를 시범

---

## 3 — Partial Physical

움직임의 일부에 신체지원 필요.

예:

* 손을 잡고 첫 걸음만 지원
* 팔꿈치 방향을 잡아줌
* 균형을 위해 몸 일부를 지지

---

## 4 — Full Physical

움직임 대부분 또는 전체 과정에 직접적인 신체지원 필요.

---

## 지원유형이 여러 개였을 때

해당 회기의 **대표적으로 필요했던 지원유형**을 기록한다.

지원 방식 간 우열을 의미하지 않는다.

---

# SM-07. SELF RE-ENGAGEMENT

Field:

`self_reengagement`

## 정의

아동이 명확하게 활동에서 이탈하거나 참여가 종료된 뒤 **직접적인 행동지시 없이 스스로 동일 또는 다음 활동에 다시 접근한 행동**.

---

## NULL

재참여가 발생할 수 있는 상황이 없었음.

예:

전체 회기에서 계속 참여하여 이탈 자체가 없었음.

---

## FALSE

명확한 이탈이 있었고 재참여 기회도 있었으나 스스로 돌아오는 행동은 관찰되지 않음.

---

## TRUE

이탈 또는 종료 이후 직접적인 행동지시 없이 다시 활동에 접근함.

---

## TRUE 사례

아동이 SPOMOVE에서 1분간 벗어나 휴식공간에 있음.

이후 별도의 "와", "해보자" 지시 없이 화면을 보고 다시 매트로 이동.

→ TRUE

---

## FALSE 사례

아동 이탈 후 강사가 "다시 와서 해보자"고 지시.

아동이 돌아옴.

→ FALSE

단 Participation에는 참여로 기록 가능.

---

# SM-08. FUNCTIONAL RESPONSE WINDOW

Fields:

`frw_seconds`

`frw_status`

## 정의

Functional Response Window는 임상적 Reaction Time이 아니다.

> SPOMOVE에서 시각 자극이 제시된 후 아동이 자극을 인식하고 목적성 있는 움직임을 시작할 수 있도록 제공한 프로그램 설정시간.

---

## 설정

* 6초
* 5초
* 4초
* 3초
* 2초
* 1초 Challenge

---

## 해석 금지

`3초 > 5초`

같은 능력 서열을 만들지 않는다.

---

# FRW STATUS

## exploratory

해당 설정을 시도하고 있으나 안정적인 참여조건인지 판단하기 어려움.

예:

* 처음 적용
* 기회가 1~2회뿐
* 수행 편차가 큼
* 지원 수준이 계속 변함

---

## observed_stable

동일 설정이 **최소 3회의 의미 있는 참여기회**에서 사용되었고

대부분의 기회에서

* 즉각적인 시간 연장이 필요하지 않았으며
* 지원 수준을 크게 높이지 않고
* 활동 참여가 유지됨

### 중요

목표 위치에 정확하게 도달했는지는 필수조건이 아니다.

**정확도보다 참여가능성**을 본다.

---

## not_determined

해당 회기의 상황으로 설정 적합성을 판단하기 어려움.

예:

* 감정적 어려움
* 건강 상태
* 환경 변화
* 기기 문제
* 활동 시간이 너무 짧음

---

# 1 SECOND CHALLENGE

1초는 기록할 수 있다.

그러나

* Growth 단계 판정
* FRW 개선률
* 일반 평가기준

에는 사용하지 않는다.

게임·도전 설정으로만 취급한다.

---

# SM-09. 참여기회 3회 미만 FALLBACK

## 참여기회 2회

### 동일한 관찰값

그 값을 기록 가능.

예:

두 번 모두 직접 행동지시 후 참여.

→ Participation 2

### 서로 다른 관찰값

보수적인 대표값을 사용.

예:

1회 독립시도
1회 지원참여

→ Participation 2

Observation:

> 두 번째 참여기회에서 독립 시작 1회 관찰.

---

## 참여기회 1회

행동이 매우 명확하다면 Structured Field 입력 가능.

그러나 Observation Note에

> 금일 관련 참여기회 1회.

를 기록하는 것을 권장.

Impact 분석에서는 반복관찰 데이터와 동일 수준의 근거로 사용하지 않는다.

---

## 참여기회 없음

관련 값 `NULL`.

절대 `0`을 입력하지 않는다.

---

# SM-10. TYPICAL PERFORMANCE RULE

회기 대표값을 선정할 때:

## 3회 이상

가장 많이 관찰된 수준을 선택.

### 예

Support:

* Verbal
* Verbal
* Independent
* Verbal
* Independent

→ `Verbal`

---

## 동률

더 보수적인 값 선택.

Participation은 **낮은 참여 수준**

Support는 **더 많은 지원이 필요했던 범주**

를 대표값으로 선택.

### 이유

성과 과장을 방지하기 위해서다.

---

# SM-11. MEANINGFUL CHANGE RULE

Structured Field에 대표값을 입력하더라도 **의미 있는 최고 수행이나 새로운 행동을 버리지 않는다.**

Observation Note에 기록한다.

### 예

대표 Support:

`Partial Physical`

Observation:

> 회기 후반 마지막 2회에서 신체지원 없이 공 굴리기 수행.

이 기록은 향후 Case Study와 변화경로 해석에 활용한다.

---

# SM-12. MOVEMENT EXPERIENCE DOMAIN

Movement Domain은 **아동이 실제 움직임에 참여한 경우만 체크한다.**

---

## 1. 기본이동

* 걷기
* 달리기
* 점프
* 호핑
* 사이드스텝
* 지그재그
* 방향전환

---

## 2. 신체조절

* 균형
* 자세조절
* 공간이동
* 정지
* 체중이동

---

## 3. 시지각 반응

* 색상
* 위치
* 방향
* 선택
* 연속반응
* 기억
* 억제

---

## 4. 조작운동

* 던지기
* 받기
* 굴리기
* 차기
* 치기
* 드리블
* 목표물

---

## 5. 스포츠·도전

* 농구
* 티볼
* 피클볼
* 컬링
* 골프
* 양궁
* 기타 뉴스포츠

---

## 6. 함께 움직이기

* 차례
* 파트너
* 협동
* 팀 과제
* 공동목표

---

# Domain Count에 포함

아동이 실제 목적성 있는 움직임을 수행.

지원이 있어도 포함한다.

---

# Domain Count에서 제외

* 구경만 함
* 교구를 단순히 만짐
* 다른 아동 활동을 관찰
* 활동 설명만 들음
* 공간에만 존재

이러한 행동은 Observation Note에 기록할 수 있다.

---

# SM-13. EDGE CASES

## CASE A — 활동 거부

아동이 20분간 활동에 들어오지 않았지만 마지막에 공을 한 번 굴림.

참여기회가 여러 차례 있었고 대표 패턴이 비참여라면:

Participation = `0`

Movement Domain `조작운동` = 체크 가능

Observation:

> 회기 종료 전 공 굴리기에 1회 참여.

**하나의 데이터가 다른 데이터를 취소하지 않는다.**

---

## CASE B — 신체지원 중 아동이 스스로 이어서 수행

강사가 첫 걸음을 손잡아 지원.

이후 아동이 스스로 다음 두 매트까지 이동.

Support 대표값은 전체 회기 패턴에 따라 판정.

Independent Initiation은 **첫 시작이 신체지원으로 발생했으므로 그 시도는 Independent가 아니다.**

그러나 이후 새 자극에서 스스로 다시 시작했다면 별도의 Independent Initiation으로 기록 가능.

---

## CASE C — 움직임은 부정확하지만 자발적

빨간 매트가 제시됐지만 아동이 노란 매트로 스스로 이동.

### Participation

독립 움직임이므로 Level 3 또는 4 가능.

### Independent Initiation

YES.

### Task Accuracy

MOVE TRACK Core에서는 평가하지 않음.

---

## CASE D — 정확하지만 강사가 계속 지시

매번 정확한 위치로 이동하지만 강사가 매 자극마다 "빨간색", "노란색"을 말해줌.

Participation = 지원 참여 가능.

Independent Initiation = 0.

**정확한 수행과 독립적 참여를 혼동하지 않는다.**

---

## CASE E — 화면만 지속적으로 관찰

SPOMOVE 화면을 오래 바라보지만 매트 이동 없음.

Participation = 1.

Visual Response Domain = Count하지 않음.

Observation:

> 화면 자극을 지속적으로 추적하여 관찰함.

---

## CASE F — 감정적 어려움으로 평가 불가능

평소 참여하던 아동이 당일 정서적 어려움으로 대부분 휴식.

평가할 충분한 기회 없음.

Participation 등 Structured Field:

`NULL`

Observation:

> 금일 활동 참여기회가 충분하지 않아 구조화 관찰 미실시.

---

## CASE G — 쉬운 활동에서만 독립적

기본이동에서는 독립적 참여.

조작활동에서는 Full Physical Support.

회기 전체 대표값을 억지로 평균내지 않는다.

주 활동 기준 Typical Performance를 기록하고 Observation에서 활동별 차이를 남긴다.

향후 v1.1에서는 활동 Domain별 Support를 확장할 수 있다.

---

## CASE H — 계속 참여해서 Re-engagement 기회 없음

Self Re-engagement:

`NULL`

FALSE가 아니다.

---

# SM-14. OBSERVATION NOTE

## 원칙

### 좋은 기록

> 화면 자극 이후 별도 이동 지시 없이 초록 매트로 2회 이동함.

> 새로운 피클볼 패들에 접근한 뒤 강사 시범 후 공 치기에 참여함.

> 초반에는 손잡기 지원이 필요했으나 마지막 2회는 언어 안내로 이동함.

---

### 피해야 할 기록

> 집중력이 좋아짐.

> 오늘 잘했음.

> 인지가 향상됨.

> 사회성이 좋아짐.

> 반응속도가 향상됨.

### 이유

관찰과 해석을 구분하기 위해서다.

---

# SM-15. DATA INTERPRETATION RULE

MOVE TRACK 데이터로 자동 생성하지 않는다.

* 총점
* 평균능력점수
* 장애정도
* 또래 순위
* 반응속도 등급
* `% 능력향상`
* 치료효과
* 인지기능 향상 주장

---

## 사용할 수 있는 표현

* 독립적인 움직임 시작이 반복적으로 관찰됨
* 활동 참여에 필요한 지원 방식이 변화함
* 이전보다 다양한 움직임 영역에 참여함
* 프로그램 후반에 새로운 스포츠 활동 참여가 관찰됨
* 특정 SPOMOVE 설정에서 안정적인 참여가 관찰됨

---

# SM-16. QUICK SCORING CARD

## PARTICIPATION

**0** 진입 어려움
**1** 관찰
**2** 지원 참여
**3** 독립 시도
**4** 반복·지속 독립 참여

---

## SUPPORT

**I** Independent
**V** Verbal
**G/M** Gesture / Model
**PP** Partial Physical
**FP** Full Physical

숫자 점수로 해석하지 않는다.

---

## INDEPENDENT INITIATION

**NULL** 기회 없음
**0** 없음
**1** 1회
**2** 반복
**3** 활동 전반 반복

---

## RE-ENGAGEMENT

**NULL** 기회 없음
**FALSE** 이탈 후 자발적 복귀 없음
**TRUE** 직접 행동지시 없이 복귀

---

## FRW

`6 / 5 / 4 / 3 / 2 / 1 Challenge`

Status:

`Exploratory / Observed Stable / Not Determined`

---

# SM-17. FIELD PILOT RULE

v0.1은 검증된 표준화 검사가 아니다.

따라서 외부 홍보에서

> "신뢰도와 타당도가 검증된 MOVE REPORT"

라고 표현하지 않는다.

---

## Pilot 단계

### 1차

강사 2~3명 교육.

### 2차

동일 수업을 두 평가자가 독립적으로 기록.

### 목표 표본

최소 20~30개의 이중평가 Session Record 확보.

### 확인

* Participation agreement
* Independent Initiation agreement
* Support category agreement
* Movement Domain agreement

### 수정

일치도가 낮은 항목은 정의 또는 선택지를 수정한다.

---

# SM-18. FINAL PRINCIPLE

MOVE TRACK은

### 아이가 무엇을 못했는지를 기록하는 시스템이 아니다.

아이가

**어디까지 활동에 들어왔고
어떤 방식으로 움직였으며
어떤 지원과 조건에서 참여했고
어떤 새로운 움직임 경험이 열렸는지**

남기는 시스템이다.

# MOVE REPORT

### Observe consistently.

### Interpret carefully.

### Expand the experience.
