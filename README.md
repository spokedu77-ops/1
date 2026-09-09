# SPOKEDU

Next.js App Router repository.

Agent instructions: [AGENTS.md](./AGENTS.md).

## Database (Supabase)

New environments: apply [`supabase/migrations/`](supabase/migrations/).

Legacy manual SQL (reference only): [`sql/archive/legacy/`](sql/archive/legacy/).
Schedule table notes: [sql/README_schedules_일정테이블.md](sql/README_schedules_일정테이블.md)

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Public home is `/` (`app/(spokedu-public)/page.tsx`). Legacy `/spokedu` redirects to `/`.

## Deploy

Hosted on Vercel. MASTER commercial process: [docs/spokedu-master-commercial-runbook.md](docs/spokedu-master-commercial-runbook.md).

## SPOMOVE Notion Catalog

Public catalog route: `/spomove/catalog`, from `SPOMOVE_NOTION_CATALOG_URL`.
Legacy `/spokedu/programs/spomove/catalog` redirects to `/spomove/catalog`.

1. Notion 페이지에서 공유 → 게시를 실행합니다.
2. “이 페이지 임베드하기”에서 공개 주소를 확인합니다.
3. Vercel Project Settings → Environment Variables로 이동합니다.
4. `SPOMOVE_NOTION_CATALOG_URL`을 등록합니다.
5. Production, Preview, Development에 필요한 범위로 적용합니다.
6. 재배포합니다.

이 값은 비밀값은 아니지만 소스코드에 URL을 직접 하드코딩하지 않습니다.
