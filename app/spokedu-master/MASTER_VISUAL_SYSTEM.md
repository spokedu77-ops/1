# SPOKEDU MASTER Visual Foundation v3

This document is the sole visual authority for MASTER and supersedes Visual Systems v1, v2, and v2.1. Product behavior, information architecture, entitlement, persistence, and session lifecycle remain owned by their existing contracts.

## Product character

MASTER is a sports content service: editorial, media-first, modern, premium, clear, and energetic. It must not resemble an early SaaS dashboard, CRUD admin tool, white-card wall, badge collection, or box-inside-box layout.

## Surface families

- Editorial/content: Home, Programs, Library, Favorites. Media and content choice lead.
- Digital content: SPOMOVE Hub and Preview. Visual stimulus and preview lead.
- Operational: Manage, Classes, Students. Agenda and collection rows lead.
- Session workspace: Activity PREP, TEACH, CAPTURE. The current action and progress lead.
- Document/output: Report, notices, records. Document structure and reading lead.
- Live utility: Class Tools. Large controls, numbers, and projector readability are explicit exceptions.

## Semantic primitives

- `MasterPageShell`: width, responsive gutters, and vertical rhythm only. Variants are editorial, operational, document, and wide.
- `MasterPageHeader`: page title, optional concise description, and at most one primary action. No default eyebrow or divider.
- `MasterSection`: title, optional quiet action, and content. It is not a card.
- `MasterState`: loading, empty, error, and attention. Empty is inline and borderless; error and attention alone may use tone backgrounds.
- `MasterAgenda`: date groups and divided rows, never metric cards.
- `MasterCollectionRow`: operational objects use rows by default.
- `MasterContentCard`: real selectable content only: media, title, one decision meta, optional support meta, bookmark.
- `MasterDocumentSurface`: document title, context, body, and actions without wrapping the whole page in an admin card.

## Typography

- Home hero: 30–32px mobile, 36–40px desktop, 700.
- Page title: 28–30px, 700.
- Section title: 20–22px, 600–700.
- Content title: 16–18px, 600–700.
- Body: 14–15px, 400–500.
- Meta: 12–13px, 400–500.
- Button: 13–15px, 600.
- `font-black`/900 is reserved for live utility numbers, scores, and results.
- Decorative English eyebrows, uppercase microcopy, and tracking used only as decoration are prohibited.

## Geometry and elevation

- Controls and operational surfaces: 10–12px radius.
- Media content: 14–16px radius.
- Gateways: 16–20px radius.
- Modal: 16px.
- Whitespace is the default separator. Borders belong to rows, inputs, interactive surfaces, media cards, and overlays.
- Shadows belong only to modal, menu, popover, and true floating layers.

## States and actions

- Empty states say what is absent and, only when useful, one next action. They are not filler panels.
- `MasterState` covers status, empty, error, and attention messages. Geometry-preserving loading skeletons remain each Surface's responsibility.
- Errors are compact, meaningful, and may include one retry.
- One primary CTA per viewport surface. Do not repeat a header CTA in an empty state.
- Secondary actions support the current task; quiet actions navigate or manage.

## Responsive behavior

- Mobile gutter: 16px; tablet: 24px.
- Desktop width follows the surface family, not a universal dashboard width.
- 390px must not overflow and interactive targets remain at least 44px.
- 1440px whitespace is intentional; do not fill it with empty panels or tiny cards.

## Locked IA

Primary navigation remains Home, Programs, Favorites, Manage, and Class Tools. Home remains discovery-first; Manage remains schedule-first/class-second; Library and SPOMOVE remain discovery/save; Favorites remains retrieval; SPOMOVE Browse is open and Runtime is Premium.

## Library Detail

Purpose: an editorial preparation page where an instructor can understand one activity, prepare it, save or assign it, then discover a next activity.

Canonical order:

1. Identity — title, English subtitle when present, public tags / core meta
2. Understand — lesson video and method
3. Prepare — equipment summary, setup image, overview (description script + briefing)
4. Recall — last-class continuity, only when data exists
5. Discover Next — related videos, max 3, with an explicit reason
6. Action — assign to a session (primary) and copy the lesson plan (secondary)

CTA must not dominate the page before content. Desktop uses a compact action group near the title (max-width about 420–460px). Mobile may use a sticky bottom action bar. Do not repeat the primary CTA in the same viewport, and do not use a page-wide giant button.

Understand and Prepare columns are content-driven: shared heading baseline, intrinsic body height, `items-start`, no panel `h-full`, no `items-stretch` equal-height surfaces, no inner scroll to fake matching columns.

Whitespace is the default separator. Nested cards around media, giant black bars, and `font-black` on titles/body/meta/CTA are prohibited on this page.
