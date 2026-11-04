# SPOKEDU Public Website — V2.1 contract

This contract records the user's V2.1 Before restoration directive (2026-11-05). The visual reference is Home at `225a9111149da052db5fe6728f05df950f98b4a9`; V2 approved data, GNB, leadership and subpage consistency remain. Scope: public marketing routes only. MASTER authentication, pricing, entitlements and runtime are outside this refactor. Local implementation and QA are approved; commit, push, production deployment and operating DB writes are not.

## Customer journey

The site connects understanding → service choice → actual process → evidence → action. Each landing page must also work for direct entry. Links must match destination content and preserve relevant inquiry intent.

## Brand and navigation

SPOKEDU directly designs and operates youth PE and creates teaching content and tools used in the field. Institutional and private lessons are distinct entry points. Subscription supports instructors; SPOMOVE is content used across both service paths. MASTER is a separate product.

Navigation labels and routes are owned by `app/spokedu/data/site.ts`. No public login or My Classes navigation. Subscription introductions may hand off to the verified existing MASTER destination. Never invent access or pricing claims.

## Visual system

Use bright white/neutral surfaces, existing action blue, readable navy text and actual field photography. Separate copy from the subjects' faces and movements. Reserve dark surfaces and activity colors for meaningful emphasis. Keep common button, radius, spacing and type roles across pages; composition can differ by task.

Retain the Before token roles and actual shared CSS loaded by the public shell. The current type family is Pretendard. Use the existing public button family and focus language. Do not change global tokens or MASTER tokens to perform Home restoration.

Active Home is `app/spokedu/website/pages/home.tsx` with display content in `website/data/home.ts`. Order: Hero, icon Quick Entry, alternating Why SPOKEDU, SPOMOVE Experience, Proven in the Field, blue Contact CTA. The independent 4MOVE card section is removed from Home; mention the framework in Why and retain details at `/education`. Legacy `home-page.ts` is not the active order authority and remains for existing consumers. Keep the original large background numbers and hashtag pills. Keep four official metrics in the original four-column large blue typography above three existing CaseCards within one section. Render official labels verbatim without expanding instructor figures into a direct-employment claim.

The clean public shell loads `website/styles/website.css` and `home-spomove.css`. Reuse their Before classes and existing shared components; the V2 whole-Home `home.module.css` is removed. Hero retains the Before frame and two original CTAs. Restore icon cards and the large rounded blue closing CTA. Only SPOMOVE Experience introduces a new composition, via narrowly scoped `website/styles/spomove-experience.css`: full-width dark background, existing content rail, actual screen and field images, connected SEE/THINK/MOVE process and existing button grammar. That stylesheet also contains only the minimal gap needed to join original metrics and CaseCards. No generated proof photography or fabricated product screen. Preserve source aspect ratios or inspect focal crop for faces, hands, feet, mats and screens.

Shared facts are owned by `data/marketing-public-metrics.ts`, `public-brand-copy.ts`, `education-system.ts` and `field-records-catalog.ts`, each for its own domain. User confirmation of operating figures is sufficient authorization; do not reopen verification for those four figures. Individual qualifications are not normalized into the common leadership introduction.

## Content

Keep customer decision information; reduce redundant presentation rather than targeting a deletion percentage. Remove production instructions from public copy. Ratings, testimonials, conditions and prices must have verified provenance. Never invent outcomes or product capabilities.

## Acceptance

Inspect desktop and mobile rendering: intended crop, natural Korean wrapping, no clipping, functional focus and menus, correct destination, no blank image or placeholder. Static inspection does not establish a rendered visual pass. Follow repository verification and publishing restrictions.

## Current implementation slice

V2.1 changes only Home presentation/copy and its relevant presentation test, preserving V2 shared data and subpage changes. Verify design using section screenshots, DOM roles, computed styles and bounding boxes at 375/768/1024/1440/1920px. Run only relevant contract tests, not a broad Public/MASTER test filter. Verification results are recorded separately in `docs/operations/public-website-refactor/v21-qa/REPORT.md`; this contract is not a claim of test or rendered QA results.
