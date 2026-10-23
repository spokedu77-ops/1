# SPOKEDU 청담 완성 원고 — 편집 보완

- 기존 `cheongdam-editorial`의 실제 성공 입력기 로직은 유지했습니다.
- 사진 3장과 첫 두 세그먼트 경계는 불변입니다. 세 번째 세그먼트에 마무리·기관 안내·CTA·해시태그를 추가했습니다.
- 최종 글은 실제 2026-03-05 수업일지에 근거해 ChatGPT가 **보완 작성**했습니다. **로컬 Gemma 원고를 이용한 것은 아닙니다.**
- 로컬 생성 원고 정본: `C:\Users\joker\SPOKEDU-LLM\04_학습결과\SPOKEDU_AUTOPILOT\articles\*\ARTICLE_FOR_NAVER.md`.
- 글을 자동 구성할 때는 (1) 검수 가능한 로컬 ARTICLE_FOR_NAVER.md 원문을 먼저 읽고 (2) REVIEW_CHECKLIST와 해당 수업일지를 대조하고 (3) 필요한 사진을 선택한 뒤 (4) 동일 입력기를 재사용하는 파이프라인이어야 합니다.
- 로컬 원고가 있는지 확인하지 못하면 **보완 글을 로컬 생성 결과라고 표시해서는 안 됩니다.**
- `--preview-full`은 새 글쓰기 탭에 입력하며 임시저장·발행하지 않습니다.
- 카카오 상담 주소는 사용자의 Google Drive 블로그 하단부 레퍼런스에 있던 링크를 사용합니다. 실제 클릭·정상 상담 가능 여부와 사진 공개 동의는 별도로 확인해야 합니다.
- `article/ARTICLE_FOR_NAVER.preserved-preview.md`에 이전 14문단 원고를 백업해 두었습니다.
