# UI Foundation v3 surface audit

This inventory is the implementation companion to `MASTER_VISUAL_SYSTEM.md`. Product behavior, routes, persistence, entitlement, and session lifecycle are frozen.

| Route family | Surface family | Primary primitive | State model | v3 status |
| --- | --- | --- | --- | --- |
| `/spokedu-master` | Editorial | Page shell, section, content card | Inline | Migrated foundation |
| `/programs`, `/library`, `/favorites` | Editorial | Page header, content card | Inline | Media/feed grammar retained |
| `/spomove`, SPOMOVE preview | Digital | Page shell, content card | Inline / gate | Digital identity retained |
| `/manage` | Operational | Agenda, collection row | Inline | Agenda first, classes second |
| `/classes`, `/students` | Operational | Collection row | Inline | Migrated from CRUD card grids |
| `/classes/:id`, `/students/:id` | Operational detail | Section, collection row | Inline | Existing detail composition retained |
| `/activity` | Session workspace | Workspace stack | Contextual | Lifecycle and deep links retained |
| `/report` | Document | Document surface | Inline | Migrated |
| `/class-tools` | Live utility | Utility surface | Immediate | Large-number exception retained |
| `/payment`, `/subscription` | Commercial support | Existing gate/payment surface | Contextual | Journey context retained |

## Remaining compatibility boundary

The session workspace still consumes the established `SPM_JOURNEY_*` semantic tokens. They are a lifecycle-specific compatibility layer, not a general page/card architecture. Removing them requires a dedicated no-behavior-change session pass and is intentionally not mixed into the operational list migration.

The Favorites API `legacySchema` branch remains a transition shim until the production typed migration, NOT NULL constraint, typed unique key, and API health are verified. The steady-state cleanup target is zero untyped reads and writes.
