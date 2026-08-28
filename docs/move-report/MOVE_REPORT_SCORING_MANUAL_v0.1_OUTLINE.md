# MOVE REPORT — Scoring Manual v0.1 Outline

**Status:** Superseded by full manual — see [MOVE_REPORT_SCORING_MANUAL_v0.1.md](./MOVE_REPORT_SCORING_MANUAL_v0.1.md)
**Version:** Field Pilot Version

---

## SSOT

모든 UI label·도움말·품질 경고·판정 예시는 아래 문서를 따릅니다.

**[MOVE_REPORT_SCORING_MANUAL_v0.1.md](./MOVE_REPORT_SCORING_MANUAL_v0.1.md)**

---

## Section Index (Quick Reference)

| Section | Topic | DB Field(s) |
|---------|-------|-------------|
| SM-01 | Meaningful Participation Opportunity | (concept) |
| SM-02 | Observation Opportunity Band | `observation_opportunity_band` |
| SM-03 | Participation Pathway | `participation_level` |
| SM-04 | Independent Initiation + Cases | `independent_initiation` |
| SM-05 | General Cue Decision Rule | (protocol) |
| SM-06 | Support Category | `support_level` |
| SM-07 | Self Re-engagement | `self_reengagement` |
| SM-08 | FRW + Status | `frw_seconds`, `frw_status` |
| SM-09 | <3 Opportunity Fallback | + `observation_opportunity_band` |
| SM-10 | Typical Performance Rule | structured fields |
| SM-11 | Meaningful Change Rule | `observation_note` |
| SM-12 | Movement Domains | `mr_movement_experiences` |
| SM-13 | Edge Cases A–H | — |
| SM-14 | Observation Note quality | `observation_note` |
| SM-15 | Data Interpretation (forbidden phrases) | Impact copy |
| SM-16 | Quick Scoring Card | UI reference |
| SM-17 | Field Pilot Rule | v0.1 validation |
| SM-18 | Final Principle | — |

---

## Pilot → v0.2

SM-17: 20–30 dual-rated session records → agreement review → v0.2 definition updates if needed.

---

## Implementation Reference

Label SSOT (Phase 1):

```
app/move-report/track/constants/observationLabels.ts  (to be created)
```

Must map 1:1 to Manual SM-03, SM-04, SM-06, SM-07, SM-08, SM-02 UI strings.
