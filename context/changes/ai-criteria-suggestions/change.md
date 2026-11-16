---
change_id: ai-criteria-suggestions
title: User can get model-suggested criteria and add chosen ones
status: planned
created: 2026-11-16
updated: 2026-11-16
archived_at: null
---

## Notes

S-04 from context/foundation/roadmap.md. PRD: FR-011, US-02. A language model suggests criterion names for the owner's decision (for example price and mileage when buying a car). The owner adds a chosen suggestion with their own weight 1–5 through the existing criteria endpoint. The model never sets weights, scores, or the ranking.

The model provider is not chosen (PRD Open Question 7). Planning is complete; Phase 1 implementation waits on that answer. No codebase research file was written. The plan is grounded in a direct read of `src/pages/api/criteria.ts`, `src/pages/dashboard.astro`, `src/components/dashboard/DecisionDashboard.astro`, `astro.config.mjs`, and `scripts/scan-dashboard-literals.mjs`.
