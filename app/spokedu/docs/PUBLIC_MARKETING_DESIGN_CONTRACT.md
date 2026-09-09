# SPOKEDU Public Website — V1 contract

This contract records the user's approved V1 direction and supersedes earlier requirements to freeze Home or use Subscription V17 as the visual authority. Scope: public marketing routes only. MASTER authentication, pricing, entitlements and runtime are outside this refactor.

## Customer journey

The site connects understanding → service choice → actual process → evidence → action. Each landing page must also work for direct entry. Links must match destination content and preserve relevant inquiry intent.

## Brand and navigation

SPOKEDU directly designs and operates youth PE and creates teaching content and tools used in the field. Institutional and private lessons are distinct entry points. Subscription supports instructors; SPOMOVE is content used across both service paths. MASTER is a separate product.

Navigation labels and routes are owned by `app/spokedu/data/site.ts`. No public login or My Classes navigation. Subscription introductions may hand off to the verified existing MASTER destination. Never invent access or pricing claims.

## Visual system

Use bright white/neutral surfaces, existing action blue, readable navy text and actual field photography. Separate copy from the subjects' faces and movements. Reserve dark surfaces and activity colors for meaningful emphasis. Keep common button, radius, spacing and type roles across pages; composition can differ by task.

Tokens remain owned by `.spokedu-marketing` in `app/globals.css`. The current type family is Pretendard; the prior Cafe24 documentation was stale. Use the existing public button family and focus language. Home consumes shared font, color, width and radius tokens and owns its responsive layout scales in its CSS module. Do not change MASTER tokens.

Home order is owned by `homePage.sectionOrder` in `app/spokedu/data/home-page.ts`; DOM order must match. V1 representative scope is a split hero, three clear service choices, and field cases before SPOMOVE and subscription. Reuse verified existing imagery and case links.

## Content

Keep customer decision information; reduce redundant presentation rather than targeting a deletion percentage. Remove production instructions from public copy. Ratings, testimonials, conditions and prices must have verified provenance. Never invent outcomes or product capabilities.

## Acceptance

Inspect desktop and mobile rendering: intended crop, natural Korean wrapping, no clipping, functional focus and menus, correct destination, no blank image or placeholder. Static inspection does not establish a rendered visual pass. Follow repository verification and publishing restrictions.

## Current implementation slice

Home hero, service routing, representative cases, and common navigation/footer are updated locally. Other landing pages remain a later slice. Runtime/build and rendered responsive QA are not yet completed; `AGENTS.md` requires explicit authorization for npm, TypeScript, lint, test and build verification. No commit, push or deployment is part of this change.
