# SPOKEDU PAPS v12 — 두 번째 사진 1장 자동 삽입 검증

**v11의 실환경 PASS**(커버 1 + 본문 3개 + 소제목 Bold)를 이어 받아 검증한다. v10/v11 파일은 덮어쓰지 않으며 새로운 실행기만 추가한다.

## 동작

새 네이버 글쓰기 탭 → PAPS FINAL 검증 → 대표 사진 1 → 첫 본문 3개(소제목 포함) → **두 번째 사진(체력 측정 카드) 1개** → 원문·서식·사진 순서 검증.

- 기존 문단에 `Enter`, `Control+A`, Range, 커서 강제 이동을 사용하지 않는다.
- 첫 번째 Rich HTML 붙여넣기 직후 남아 있는 네이버 커서 위치를 활용해 사진 버튼을 클릭한다.
- **두 번째 사진이 본문 뒤에 들어가지 않으면 즉시 FAIL**. 편집기를 직접 복구하거나 원문을 수정하지 않는다.
- 네이버 사진 서버에 사진 2개가 업로드될 수 있지만, **글 저장·임시저장·발행은 하지 않는다.** 기존 열린 탭도 수정하지 않는다.
- 아동 사진을 공개적으로 발행하기 전 별도 권한 확인이 필요하다.

## 실행

```powershell
$root = 'C:\Users\joker\Documents\GitHub\1'
$zip = "$env:USERPROFILE\Downloads\SPOKEDU_PAPS_PHOTO_SECOND_V12.zip"
if (!(Test-Path $zip)) { throw "다운로드 파일을 찾을 수 없습니다: $zip" }
Expand-Archive -LiteralPath $zip -DestinationPath $root -Force
Set-Location "$root\scripts\naver-blog-p0\rich-paste"
node --test .\photo-second-core.test.mjs
if ($LASTEXITCODE -ne 0) { throw '테스트 실패' }
node .\photo-second-probe.mjs --offline --article-id=9fad3d9e6f847f36
if ($LASTEXITCODE -ne 0) { throw '원고 또는 이미지 해시 검증 실패' }
$env:NAVER_CDP_URL = 'http://127.0.0.1:9222'
node .\photo-second-probe.mjs --probe-second-photo --article-id=9fad3d9e6f847f36
```

## 성공 조건

`PAPS_SECOND_PHOTO_PROBE_PASS` + `secondPhotoVerify.images = 2` + `secondPhotoVerify.paragraphs = 3` + `secondPhotoVerify.order = photo1 → body[0..2] → photo2`.

위 테스트가 통과해야 다음 구간(본문 3~7)을 추가한다. **v11의 성공을 v12의 성공으로 간주하지 않는다.**
