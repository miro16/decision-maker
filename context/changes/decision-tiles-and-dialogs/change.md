---
change_id: decision-tiles-and-dialogs
title: Decisions shown as square tiles and editing moved into dialogs
status: implemented
created: 2026-11-17
updated: 2026-11-17
archived_at: null
---

## Notes

UI change on one view: `/dashboard` (`src/pages/dashboard.astro` + `src/components/dashboard/DecisionDashboard.astro`). Token source: `src/styles/global.css` (`.dark` block, role tokens), already audited in `futuristic-dashboard-ui`. Design-system variant: existing system, extended (no second `shadcn init`).

Prośba użytkownika (2026-11-17): decyzje (laptop, wakacje itd.) mają być bardziej kwadratowymi kafelkami; więcej popupów zamiast wszystkiego widocznego naraz na jednej długiej stronie.

Decyzje użytkownika (2026-11-17):

- Kafelki: siatka kwadratowych kafelków (`aspect-square`), tytuł na środku, aktywny z poświatą, kafelek „+” na końcu otwiera okienko dodawania.
- Popupy: nowa decyzja, zmiana nazwy i usuwanie decyzji (potwierdzenie usunięcia też w okienku), opcje (dodaj / zmień / usuń), kryteria (dodaj / zmień / usuń). Tabela z ocenami, ranking i koło losowania zostają na stronie.
- Technika: natywny `<dialog>` w `.astro` z małym skryptem, formularze zostają zwykłym POST-em (bez React/radix).
- Gałąź: od `feat/tie-breaker-wheel` (PR #9 otwarty), PR nowej zmiany oparty na tej gałęzi.
- Proces: pełna automatyka, bez pauz po fazach (jak ostatnio).
