---
change_id: tie-breaker-wheel
title: User can break a first-place tie with a wheel of fortune
status: implementing
created: 2026-11-16
updated: 2026-11-17
archived_at: null
---

## Notes

S-05 from context/foundation/roadmap.md. PRD: FR-012, US-03. When two or more options tie for first place with the same weighted total and are fully scored, the user can spin a wheel of fortune that shows only those options and picks one at random. The wheel does not change scores or the ranking and the result is not stored (assumption, PRD Open Question 11).

Depends on `weighted-ranking`: it needs the rank, tie, and incomplete reporting from `src/lib/weighted-sum.ts`. Start with `/10x-plan tie-breaker-wheel` after that change is implemented.

Decyzje użytkownika (2026-11-17): koło tylko gdy cała grupa pierwszego miejsca (co najmniej dwie opcje) jest w pełni oceniona; "Spin again" dozwolone, każdy wynik oznaczony jako losowanie; wynik nie jest zapisywany; losowanie po stronie przeglądarki.
