# SPOKEDU 로컬 피드백 품질 A/B 실험

## 실행 위치
사용자 PC의 SPOKEDU Git 저장소에서 Cursor가 실행한다. 다운로드/설치는 요구하지 않는다. 운영 API, n8n 활성 워크플로, sessions 테이블의 값은 변경하지 않는다.

`ops/local-automation/feedback-learning/experiment.mjs`는 Node.js 20+ 내장 fetch만 사용한다. Supabase REST를 **읽기 전용**으로 페이지 전체 조회하고 `verified` 개인 정규 수업의 핵심 5개 항목이 채워진 레코드만 후보로 사용한다. 로컬 LM Studio `qwen3.5-9b`에서 기존 프롬프트와 SPOKEDU 보수적 편집 프롬프트를 **같은 30개 홀드아웃 샘플**로 비교한다.

## 로컬 Cursor 실행 절차
1. 저장소 최신 브랜치 `feature/local-feedback-quality-ab-20261107` 확인.
2. 기존 로컬 환경 변수에서 `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` 확인. 인증키를 화면/로그/커밋에 출력하지 않는다. 키가 없으면 실험을 중지하고 현재 가용 인증 방식을 보고하며 임의 새 키를 만들거나 운영 설정을 변경하지 않는다.
3. LM Studio 모델 구동 확인. 다른 모델을 자동 설치하지 않는다.
4. 먼저 비밀키·DB 연결 없이 `node ops/local-automation/feedback-learning/experiment.mjs --self-test`를 실행한다. `SELF_TEST_PASS`가 나와야 한다. 이어서 현재 셸 환경 변수 또는 로컬의 기존 비밀 환경변수 파일을 읽어 아래 실행. 사용자에게 파일 다운로드 요구하지 않는다.

```powershell
$env:LM_STUDIO_BASE_URL = "http://127.0.0.1:1234"
$env:LM_STUDIO_MODEL = "qwen3.5-9b"
$env:SPOKEDU_AB_LIMIT = "30"
node ops/local-automation/feedback-learning/experiment.mjs
```

5. 결과 파일: `ops/local-automation/feedback-learning/results/ab-latest.json`. 원문과 모델 출력은 파일에 저장하지 않는다. `results/` 폴더는 Git에 추가하지 않는다.
6. 30건 평가 지표(유효 JSON, 숫자 보존, 과잉 길이, 어휘 중첩, 무변경 건수)를 비교한다. **이 지표만으로 더 좋은 문장이라고 판단할 수 없다.** 실제 질적 평가는 민감 정보를 숨긴 원문/두 결과를 관리자·교육 전문가가 블라인드 검토한 후 확정한다.
7. 모델이 원본보다 나쁜 경우 기존 시스템 원문 보존 원칙을 유지한다. 이 단계에서 운영 n8n 프롬프트는 절대 교체하지 않는다.

## 개인정보 주의
- 로컬 컴퓨터의 LM Studio만 호출한다. 코드에서 로컬 호스트 이외 LLM 엔드포인트를 거부한다.
- 서버에서 내려받은 피드백과 교정본은 작업 메모리에만 존재한다. 결과 JSON은 요약 지표와 비식별 해시 ID만 포함한다.
- Supabase 토큰, 원문, 학생 이름은 출력/커밋하지 않는다.
- 실험 결과 비교에 필요한 원고와 출력의 전문가 검토는 인증된 제한적 로컬 환경에서만 실시한다. 개인정보 제거와 검토 권한을 별도 확인한다.
- 실험 코드의 실행·검증은 아직 이 브랜치에서 수행하지 않았다.
