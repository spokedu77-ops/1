# MOVE 리포트「저장」로직 정리 (자문용)

## 목표

- 사용자가 결과 화면에서 **요약 카드 PNG**를 기기에 남기게 하는 것.
- 웹(PWA 아님, 일반 Safari/Chrome)에서는 **OS 사진 앱에 직접 쓰는 API가 없음**. 가능한 경로는 제한적임.

## 데이터·UI 소스

- 캡처 대상 DOM: [`../components/ShareResultCard.tsx`](../components/ShareResultCard.tsx)를 화면 밖(`opacity:0`, `fixed`)에 렌더링하고 ref로 잡음 — [`../components/ShareAndCollect.tsx`](../components/ShareAndCollect.tsx) 하단 `cardRef`.
- PNG 생성: [`../lib/shareCard.ts`](../lib/shareCard.ts)의 `makeShareCardBlob` → **html2canvas**로 `canvas` → `toBlob('image/png')` (실패 시 `toDataURL` 폴백).

## 현재「앨범에 저장」버튼 동작 (고정안)

구현 위치: [`../components/ShareAndCollect.tsx`](../components/ShareAndCollect.tsx) 내 `saveToAlbum`.

### 흐름 요약

1. 전화번호·동의 완료(`ready`) 및 캡처 대상 DOM 존재 확인.
2. `makeShareCardBlob(cardRef)`로 PNG Blob 생성.
3. `navigator.share`가 있으면:
   - **1차**: `ShareData`에 **파일만** (`files: [File]`) — iOS에서 성공률이 상대적으로 높음.
   - 성공 시: 토스트로 공유 시트에서 **이미지 저장** 안내.
   - 사용자 취소(`AbortError`): 토스트 없이 종료.
   - **2차**: `files` + `title`만 추가해 재시도.
4. 공유 불가/실패 시: `downloadPng` — `<a download>` + `blob:` URL. iOS Safari에서는 동작이 기기·버전별로 다를 수 있음.

## 선행 조건

- `ready === true`: 이미 서버에 전화번호를 저장했거나(`sent`), 세션에 `savedPhone`이 있어야 저장/공유 버튼이 열림.

## 링크 공유와의 구분 (혼동 방지)

- **결과 링크 공유** 버튼: **`navigator.share` 없음** — `copyTextToClipboard(shareUrl)`만 사용.
- 링크 URL 생성: [`../lib/shareLink.ts`](../lib/shareLink.ts) — v5 짧은 쿼리 등.

## OG 미리보기(카카오 등)

- 메타/OG 이미지: [`../../api/move-report/share-image/route.ts`](../../api/move-report/share-image/route.ts) — 공유 URL의 `d`로 파싱 후 `ImageResponse` 생성.
- 채팅 앱 미리보기는 **서버가 크롤링**하므로, 클라이언트 저장 로직과는 별개 트랙.

## 웹에서 “100% 앨범 자동 저장”을 약속하기 어려운 이유

- 브라우저는 보안상 **갤러리 직접 쓰기**를 막고, **공유 시트 / 다운로드**만 허용하는 경우가 많음 — 특히 **iOS Safari**.

## 자문에 던질 수 있는 질문 예시

1. 제품 요구: “사진 앱에 반드시 자동 저장”인가, “사용자가 한 번 더 탭해도 됨”인가?
2. iOS만 타겟인가, Android/데스크톱도 동일 UX를 원하는가?
3. PWA 설치/네이티브 앱 없이 **순수 웹**으로 갈 것인가?

---

## 부록: `saveToAlbum` 실제 코드 (리뷰용 스냅샷)

아래는 문서 작성 시점의 구현입니다. 최신은 항상 소스 파일을 기준으로 하세요.

```110:162:app/move-report/components/ShareAndCollect.tsx
  const saveToAlbum = async () => {
    if (!ready) {
      flash('전화번호 저장 후 이용할 수 있어요.');
      return;
    }
    if (!cardRef.current) {
      flash('요약 카드 준비 중이에요. 잠시 후 다시 시도해 주세요.');
      return;
    }
    setBusy('download');
    try {
      const blob = await makeShareCardBlob(cardRef.current);
      const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { canShare?: (d?: ShareData) => boolean }) : null;
      if (nav && typeof nav.share === 'function') {
        const file = new File([blob], fileName, { type: 'image/png' });
        // iOS 안정성: files-only가 가장 성공률이 높음
        const primary: ShareData = { files: [file] };
        const secondary: ShareData = { files: [file], title: shareTitle };
        const tryShare = async (data: ShareData): Promise<'shared' | 'cancelled' | 'failed'> => {
          const canShare = typeof nav.canShare === 'function' ? nav.canShare(data) : true;
          if (!canShare) return 'failed';
          try {
            await nav.share(data);
            return 'shared';
          } catch (e) {
            if (e instanceof Error && e.name === 'AbortError') return 'cancelled';
            return 'failed';
          }
        };

        const r1 = await tryShare(primary);
        if (r1 === 'shared') {
          flash('공유 시트에서 "이미지 저장"을 눌러주세요.');
          return;
        }
        if (r1 === 'cancelled') return;

        const r2 = await tryShare(secondary);
        if (r2 === 'shared') {
          flash('공유 시트에서 "이미지 저장"을 눌러주세요.');
          return;
        }
        if (r2 === 'cancelled') return;
      }
      downloadPng(blob, fileName);
      flash('기기 제한으로 파일 다운로드로 저장했어요.');
    } catch (e) {
      const message = e instanceof Error ? e.message : '이미지 생성 중 오류가 발생했어요. 다시 시도해 주세요.';
      flash(message);
    } finally {
      setBusy(null);
    }
  };
```
