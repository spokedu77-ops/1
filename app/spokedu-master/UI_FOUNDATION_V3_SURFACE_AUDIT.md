# UI Foundation v3 surface audit

This inventory is the implementation companion to `MASTER_VISUAL_SYSTEM.md`. Product behavior, routes, persistence, entitlement, and session lifecycle are frozen.

| Route family | Surface family | Primary primitive | State model | v3 status |
| --- | --- | --- | --- | --- |
| `/spokedu-master` | Editorial | Editorial hierarchy, media rails, contextual continuity | Inline | MIGRATED |
| `/programs` | Editorial | Page shell, page header, media gateway | Inline | MIGRATED |
| `/favorites` | Editorial | Page shell, page header, typed content cards | Inline | MIGRATED |
| `/library` | Editorial | Editorial header, search hierarchy, sections, content cards | Inline | MIGRATED |
| `/spomove`, SPOMOVE preview | Digital | Digital taxonomy, media cards, shared preview | Inline / gate | MIGRATED |
| `/manage` | Operational | Page shell, page header, agenda, section, collection row | Inline | MIGRATED |
| `/classes`, `/students` | Operational | Page shell, page header, section, collection row | Inline | MIGRATED |
| `/classes/:id`, `/students/:id` | Operational detail | Operational header, row history, inline guidance/state | Inline | MIGRATED |
| `/activity` | Session workspace | Lifecycle-owned composition with context, activity sequence, capture, and one state primary | Contextual | MIGRATED |
| `/report` | Document | Document surface | Inline | MIGRATED |
| `/class-tools` | Live utility | Existing utility surface | Immediate | COMPATIBILITY |
| `/payment`, `/subscription` | Commercial support | Existing gate/payment surface | Contextual | NOT_MIGRATED |

Session compatibility note: `SPM_JOURNEY_STACK`, `CONTEXT`, `SECTION`, `HEADING`, `META`, and `FIELD` remain as narrow lifecycle presentation roles. Generic `SPM_JOURNEY_SURFACE` and decorative `SPM_JOURNEY_EYEBROW` are no longer dependencies of the Session workspace. Runtime selectors, persistence, and action policy remain unchanged.

## Remaining compatibility boundary

The session workspace still consumes the established `SPM_JOURNEY_*` semantic tokens. They are a lifecycle-specific compatibility layer, not a general page/card architecture. Removing them requires a dedicated no-behavior-change session pass and is intentionally not mixed into the operational list migration.

Home, Library, and the SPOMOVE Hub/Preview are migrated as representative visual surfaces. SPOMOVE runtime/Engine internals are outside that presentation status and remain unchanged.

The deprecated general-purpose `SPM_COLLECTION_CARD`, `SPM_STATE_PANEL`, and `SPM_EMPTY_PANEL` tokens have no runtime consumers and were removed. Deep operational details and live/session utilities remain explicit compatibility backlog.

The Favorites API `legacySchema` branch remains a transition shim until the production typed migration, NOT NULL constraint, typed unique key, and API health are verified. The steady-state cleanup target is zero untyped reads and writes.
