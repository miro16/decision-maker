---
change_id: decision-table-view
title: Decision shown as a table of options by criteria with a score column
status: implementing
created: 2026-11-17
updated: 2026-11-17
archived_at: null
---

## Notes

Chcę przebudować wygląd decyzji: tabela, w pierwszej kolumnie dodane opcje, w kolejnych kryteria (np. cena), w ostatniej kolumnie ocena danego wyboru.

Decyzje użytkownika (2026-11-17):

- Komórki z ocenami edytowalne w tabeli: pole 1–5 w każdej komórce, jeden przycisk „Save” na wiersz (formularz bez JS, istniejące API `/api/scores`).
- Ostatnia kolumna: suma ważona, miejsce w rankingu oraz znaczniki „incomplete” i „tie”.
- Wiersze w stałej kolejności dodania opcji (nie skaczą podczas wpisywania); miejsce widać w ostatniej kolumnie.
- Sekcje Scores i Ranking znikają (zastępuje je tabela); dodawanie, zmiana nazwy i usuwanie opcji i kryteriów zostaje w sekcji „Manage” pod tabelą.
- Karta dashboardu szersza (z ok. 672 px do ok. 1024 px), na telefonie tabela przewija się poziomo.
