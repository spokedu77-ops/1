This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 일정 및 센터관리 사용 전 (Supabase)

`/admin/schedules`(일정 및 센터관리)를 사용하려면 Supabase에 아래 마이그레이션을 **순서대로** 적용해야 합니다. 적용하지 않으면 `Could not find the 'center_id' column of 'schedules'` 같은 스키마 오류가 납니다.

- `sql/29_schedules_schema.sql` → `sql/30_schedules_rls.sql` → `sql/34_schedules_time_fields.sql` → `sql/37_schedules_status_and_center.sql` → `sql/38_schedules_session_dates.sql`

자세한 순서와 실행 방법: [sql/README_schedules_일정테이블.md](sql/README_schedules_일정테이블.md)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
