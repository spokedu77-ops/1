# 05. n8n·자동화

## 현재 워크플로

파일: `ops/local-automation/workflows/spokedu-feedback-correction.json`  
이름: `SPOKEDU Feedback Correction Pull`  
JSON `active`: **false**  
스케줄 노드 `Every 10 minutes`: **disabled**  
트리거: `Manual test run`  
ID: 노드 UUID는 `a1000001-...` 형태. 사용자가 알고 있던 `dmKZDzet61qQv4XW`는 이 파일에 없다. n8n 서버에 다른 ID로 올라가 있을 수는 있으나 **지금 포트가 닫혀 서버 목록을 읽지 못했다.**

경로:

1. POST `{SPOKEDU_APP_BASE_URL}/api/automation/worker/claim`
2. 잡 없으면 종료
3. 필드 공백이면 LLM 생략 후 fail
4. LM Studio `chat/completions` (`LM_STUDIO_BASE_URL` 기본 `http://host.docker.internal:1234`, 모델 기본 `qwen3.5-9b`)
5. JSON 파싱
6. complete 또는 fail API

앱 쪽 enqueue는 `app/api/admin/automation/feedback-correction/enqueue/route.ts`와 교사 화면 `app/admin/teachers-classes/page.tsx`에 있다. 단계 이름은 Enqueue(앱) → Claim/Pull(n8n) → LLM → Complete/Fail 이다. “승인”은 피드백 문장을 세션에 반영하는 consume API(`consume/route.ts`)로 분리돼 있다. n8n이 세션 원문을 직접 쓰지 않게 한 구조다.

## 지금 작동하는가

- n8n 5678: 리슨 없음 → Pull **실행 불가**.
- 5681: 리슨 없음. 브리지로 쓰는 프로세스를 찾지 못했다.
- LM Studio 1234: 살아 있음. 컨테이너가 없으므로 `host.docker.internal` 경로는 현재 해당 없음.
- 과거 보고서 `docs/operations/local-n8n-feedback-correction-production-release-report.md`는 Stage 5를 PASS로 적고, 검증 모델은 **Gemma**, 운영 배포는 그 문서 시점 미실행이라고 적는다. 그 PASS는 오늘 프로세스 생존의 증거가 아니다.

재시도: fail 시 attempt·pending 재큐는 워크플로와 마이그레이션 문서에 설계돼 있다. 오늘 실행 이력은 n8n이 꺼져 있어 0이다.

## 피드백 데이터

이 감사에서 Supabase를 조회하지 않았다. 따라서 운영 잡 건수는 **UNVERIFIED**.  
1,088 / 29 / 829 / 기준 v1 / A/B는 저장소 문서에서 재발견하지 못했다. 수치를 현재 사실로 쓰지 않는다.

코드가 하는 일: 교사 피드백 다섯 필드(`main_activity`, `strengths`, `improvements`, `next_goals`, `condition_notes`)의 맞춤법·문법 교정 JSON. SPOMOVE 리터럴 유지. 사실 창작 금지.  
이것이 Qwen의 업무 규칙 학습으로 누적되지는 않는다. 잡 결과가 다음 시스템 프롬프트로 합쳐지는 코드가 없다.

품질 게이트 테스트 파일은 `app/lib/automation/feedbackCorrectionQuality.test.ts` 등으로 저장소에 있다. 테스트 실행은 하지 않았다.

## 추가 (2026-11-08)

이번 읽기 검증에서 n8n은 시작하지 않았고 워크플로는 활성화하지 않았다. 포트가 닫힌 사실은 바뀌지 않았다. 개인 비서의 날짜·RAG·수업 읽기는 n8n 없이 동작했다. n8n 복구는 교사 피드백 문장 교정 큐를 다시 돌릴 때의 과제이고, 이번 세 도구 연결보다 우선순위가 낮다.
