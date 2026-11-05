# SPOKEDU Public Marketing Design Contract

Status: implementation authorized by the user's canonical Stitch restoration request on 2026-11-06. Git publishing and production deployment are not authorized.

## Reference and scope

The approved visual reference is the original code.html AND screen.png in
docs/operations/public-website-refactor/contract-draft/sources/b0-extracted/stitch-unpacked/stitch_editorial_website_redesign/.
Use home_spomove, private_lesson_spomove, education_programs_spomove, about_spomove and spomove_system_spomove for the five public pages. academic_royal_blueprint/DESIGN.md supplies roles; actual HTML values resolve differences with its explanatory prose. stitch/c0/bodies is an intermediate reference, not visual authority.

This contract records the approved reference and exceptions; it does not establish another design system. Existing public navigation, routing, SEO, acquisition, contact API/storage/consent, LAB entitlements, payment, authentication and admin behavior remain unchanged.

## Approved page compositions

- Home: Hero; alternating 01–03 capabilities; four official operating metrics; three real field cases; one blue consultation CTA.
- Private: Hero/service summary; 01–03 process; three existing lesson cards; one consultation CTA. Retain /private#apply and the existing 2–4-person condition.
- Education: Hero; six real program cards; exactly two alternating process rows; four official operating metrics; one consultation CTA. Steps are “기관 환경과 교육 목표 파악” and “수업 운영 및 결과 공유”. Preserve observation, feedback, next-session adjustment and prior agreement on administrative support in step 02.
- About: Hero/official facts; 01–03 capabilities; three real operators; one consultation/collaboration CTA.
- SPOMOVE: Hero; four alternating feature rows; the existing four-slot information region; one consultation CTA. That region shows examples—사이먼 효과, 플랭커, 스트룹 과제, DIVE—not the total feature count and not outcome metrics.

The former service hub, independent dark SPOMOVE Experience and appended legacy sections are superseded. Tests must not reinstate them. Preserve their important destinations in the appropriate original slots and shared navigation/footer.

## Content ownership

marketing-public-metrics.ts owns the four user-confirmed values AND labels. Public case/category counts do not represent company operating metrics. About may show 2020 plus the approved institutions, instructors and renewal metrics.
public-brand-copy.ts owns common product descriptions and team roles. field-records-catalog.ts owns cases and their existing destinations. Preserve program/conditions, private-service and history data even when their standalone rendering is removed.

SPOMAT is an optional physical four-color mat without electronic sensors or pressure detection. Never add fabricated motion analysis, diagnoses, medical outcomes, certainty of improvement, fictional staff, ratings or service guarantees from the source mockup.

## Typography and styles

Use Plus Jakarta Sans for Latin/numerals and Pretendard for Hangul, with platform fallbacks. Keep actual reference type size, weight, line height, tracking, layout and utility modifiers. Do not clamp 800/900 roles to 700 or force all tracking to one value.
Limit restored typography/composition to the five web-stitch pages. Preserve other public surfaces and the global header/footer.
Generate website-utilities.css using node scripts/build-website-styles.mjs; never edit it by hand.

## Approved exceptions and unresolved images

- Three real operators—최지훈, 김윤기, 김구민—replace the four fictional source profiles. Keep consistent card treatment; do not invent a fourth person.
- Real existing photos and product UI replace the mockup's generated evidence. Keep current photo mappings pending explicit image approval.
- P1/P4/P6 replacements are withheld; the proposed P5 replacement is prohibited. Keep the existing 2–4-person condition.
- The representative's broadcast capture remains unresolved until an approved non-broadcast original exists. Cropping it is not a replacement.
- Private process 03 lacks approved real feedback media. Existing repeated activity photos are unresolved evidence, not a completed image fix.
- SPOMOVE's four examples replace unverified numerical claims inside the same information region. Report any increased height or wrapping.
- Consultation CTAs use /contact?type=private, dispatch or spomove; reuse the existing full form rather than source alert() or a mock phone form. Verify the extra navigation step and preserved acquisition/selection context.
- Keep the full-subject contain rule for the adapted case and shared case spacing after removing spomove-experience.css.

## Acceptance and publishing

Rendered responsive exception for final visual review: the approved 10,000+ figure clips at narrow widths when the source HTML's 64px metric size is applied literally. Existing Stitch type roles therefore render metrics at 36px at 390px, 44px at 768/1024px and 64px at 1440/1920px. Values, labels, two/four-column placement and the desktop hierarchy remain unchanged. This is reported as a source difference, not an exact visual match.

Compare populated local pages with the original at 390/768/1024/1440/1920px. Record source/content differences, actual font loading, crop, clipping, horizontal overflow, keyboard focus, menu operation, contact success/failure and non-target regressions.
Static/source tests are not a rendered visual PASS. Withheld photos, duplicates and missing feedback media must remain explicit QA exceptions. Separate mocked contact-flow validation from real DB persistence.
Keep changes uncommitted. Commit, push, deployment and production-data writes each require separate authorization.
