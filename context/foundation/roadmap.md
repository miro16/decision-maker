---
project: Decision Maker
version: 1
status: draft
created: 2026-10-11
updated: 2026-11-16
prd_version: 1
main_goal: speed
top_blocker: capacity
milestone_id: first-weighted-ranking
milestone_seq: 1
milestone_status: open
---

# Roadmap: Decision Maker

> Derived from `context/foundation/prd.md` (v1) + auto-researched codebase baseline.
> Edit-in-place; archive when superseded.
> Slices below are listed in dependency order. The "At a glance" table is the index.

## Milestone

**M-1: First weighted ranking** — Status: open

- **Intent:** Zalogowany użytkownik kończy jedną prywatną decyzję i widzi ranking z wyniku ważonego — to jest cały pierwszy etap z PRD.
- **Source materials:** `context/foundation/prd.md` (v1)
- **Done when:** every F-NN and S-NN below is `done`.
- **Scope anchors:** FR-001–FR-008, US-01, FR-011, US-02, FR-012, US-03. FR-009 i FR-010 zostają poza tym milestone’em (nice-to-have / Non-Goals). FR-011 (sugestie kryteriów od modelu językowego) i FR-012 (koło fortuny przy remisie) dodano 2026-11-16 na prośbę użytkownika; to nice-to-have, więc `S-05` i `S-04` idą po gwieździe przewodniej `S-03` (kolejność: S-03, S-05, S-04) i nie mogą jej opóźniać.

## Vision recap

Przy wyborze z kilkoma opcjami i kryteriami o różnej wadze nie widać spójnego rankingu; łatwo zgubić wagi albo porównywać „na czuja”. Produkt ma zastąpić notatki i arkusz: użytkownik tworzy decyzję, dodaje opcje i kryteria z wagami, ocenia opcje i widzi jeden ranking. Wgląd: wagi i oceny muszą dać widoczny wynik, nie tabelkę do ręcznego liczenia.

## North star

**S-03: użytkownik widzi ranking ważony jednej decyzji** — to najmniejszy przepływ end-to-end, który potwierdza główne kryterium sukcesu (zalogowany użytkownik kończy jedną decyzję i widzi wynik ważony).

> Gwiazda przewodnia (north star) to najmniejszy kompletny przepływ, którego dostarczenie udowadnia hipotezę produktu — stawiamy go tak wcześnie, jak pozwalają zależności, bo reszta ma sens tylko jeśli to działa.

## At a glance

| ID    | Change ID                     | Outcome (user can …)                                      | Prerequisites | PRD refs                         | Status   |
| ----- | ----------------------------- | --------------------------------------------------------- | ------------- | -------------------------------- | -------- |
| S-01  | first-private-decision        | utworzyć jedną prywatną decyzję po zalogowaniu            | istniejące konto i sesja z Baseline | FR-001, FR-002, FR-003, FR-008 | ready    |
| S-02  | options-and-weighted-criteria | dodać opcje i kryteria z wagami do tej decyzji            | S-01          | FR-004, FR-005, FR-008           | in-progress |
| S-03  | weighted-ranking              | ocenić opcje i zobaczyć ranking z wyniku ważonego         | S-02          | US-01, FR-006, FR-007, FR-008    | in-progress |
| S-04  | ai-criteria-suggestions       | poprosić model o sugestie kryteriów i dodać wybrane       | S-02          | US-02, FR-011                    | planning |
| S-05  | tie-breaker-wheel             | rozstrzygnąć remis na pierwszym miejscu kołem fortuny     | S-03          | US-03, FR-012                    | proposed |

## Baseline

What's already in place in the codebase as of `2026-10-11` (auto-researched + user-confirmed).
Foundations below assume these are present and do NOT re-scaffold them.

- **Frontend:** partial — starter, ekrany konta i pusty dashboard; brak ekranów decyzji.
- **Backend / API:** partial — są tylko endpointy konta; brak API decyzji.
- **Data:** absent — jest klient bazy, brak migracji decyzji / opcji / kryteriów / ocen.
- **Auth:** present — rejestracja, logowanie, sesja i ochrona dashboardu, potwierdzone na produkcji.
- **Deploy / infra:** partial — Worker na produkcji i job deploy w CI; auto-deploy po merge nie jest domknięty.
- **Observability:** partial — logi hosta włączone; brak śledzenia błędów ani metryk w aplikacji.
- **Model językowy:** absent — brak dostawcy, klucza i wywołań modelu (dodane 2026-11-16 dla `S-04`).

## Foundations

Brak osobnych fundamentów. Konto i hosting są w Baseline. Izolacja kont oraz zapis decyzji wchodzą w `S-01` (pierwszy moment, gdy są potrzebne), zamiast budować całą warstwę danych z wyprzedzeniem.

## Slices

### S-01: Pierwsza prywatna decyzja

- **Outcome:** użytkownik może się zarejestrować, zalogować i utworzyć jedną decyzję widoczną tylko na swoim koncie
- **Change ID:** first-private-decision
- **PRD refs:** FR-001, FR-002, FR-003, FR-008
- **Prerequisites:** istniejące konto i sesja z Baseline
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - Jakie minimalne pola ma decyzja poza nazwą / tytułem? — Owner: user. Block: no.
- **Risk:** bez izolacji przy pierwszym zapisie późniejszy ranking może wyciec między kontami; dlatego zapis decyzji jest przed ocenami.
- **Status:** ready

### S-02: Opcje i kryteria z wagami

- **Outcome:** użytkownik może dodać opcje oraz kryteria z wagami do swojej decyzji
- **Change ID:** options-and-weighted-criteria
- **PRD refs:** FR-004, FR-005, FR-008
- **Prerequisites:** S-01
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - Jaki zakres i skok wagi (np. 1–5 vs 1–10)? — Owner: user. Block: no.
- **Risk:** bez tej struktury `S-03` nie ma czego mnożyć; trzymamy to przed rankingiem, zamiast zgadywać wagi w locie.
- **Status:** in-progress

### S-03: Ranking ważony

- **Outcome:** użytkownik może ocenić opcje i zobaczyć ranking z wyniku ważonego, bez ręcznego liczenia
- **Change ID:** weighted-ranking
- **PRD refs:** US-01, FR-006, FR-007, FR-008
- **Prerequisites:** S-02
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - ~~Czy przy braku kompletu ocen ranking i tak się pokazuje?~~ Rozstrzygnięte 2026-11-16: tak, ranking częściowy z oznaczeniem opcji niekompletnych. Skala ocen: liczby całkowite 1–5. Remis: to samo miejsce z oznaczeniem remisu; rozstrzyga go S-05.
- **Risk:** to jest gwiazda przewodnia; jeśli formula albo kompletność ocen zostaną źle przyjęte, użytkownik zobaczy „ranking”, który nie zgadza się z PRD.
- **Status:** in-progress

### S-04: Sugestie kryteriów od modelu językowego

- **Outcome:** użytkownik może poprosić model o sugestie kryteriów dla swojej decyzji (np. cena, przebieg przy zakupie samochodu) i dodać wybrane, podając wagę
- **Change ID:** ai-criteria-suggestions
- **PRD refs:** US-02, FR-011
- **Prerequisites:** S-02
- **Parallel with:** S-03
- **Blockers:** wybór dostawcy modelu i klucza z limitem wydatków (decyzja człowieka)
- **Unknowns:**
  - Który dostawca i model (i czy działa dobrze po polsku)? — Owner: user. Block: no dla planowania, tak dla implementacji.
  - Limit użycia na konto i twardy limit wydatków u dostawcy? — Owner: user. Block: no.
  - Czy do modelu wysyłać też nazwy opcji, czy tylko tytuł i nazwy kryteriów? — Owner: user. Block: no.
- **Risk:** to nice-to-have z kosztem i danymi poza aplikacją; sekwencja po `S-03` i `S-05` (użytkownik odsunął wybór dostawcy modelu na później), żeby nie opóźnić gwiazdy przewodniej. Gdy zabraknie czasu przed 2026-12-06, przenieś `S-04` do Parked zamiast skracać `S-03`. Awaria modelu nie może psuć reszty decyzji.
- **Status:** planning

### S-05: Koło fortuny przy remisie

- **Outcome:** użytkownik może rozstrzygnąć remis na pierwszym miejscu rankingu kołem fortuny, które losuje jedną z remisujących opcji
- **Change ID:** tie-breaker-wheel
- **PRD refs:** US-03, FR-012
- **Prerequisites:** S-03
- **Parallel with:** S-04
- **Blockers:** —
- **Unknowns:**
  - Czy koło ma działać też dla remisu na niższych miejscach i czy wynik losowania ma być zapamiętany? (przyjęte: tylko pierwsze miejsce, bez zapisu) — Owner: user. Block: no.
- **Risk:** losowanie bez oznaczenia mogłoby wyglądać jak wynik rankingu; koło musi być wyraźnie rozstrzygnięciem remisu i nie zmieniać wyników. Kolejność: po `S-03`, przed `S-04`.
- **Status:** proposed

## Backlog Handoff

| Roadmap ID | Change ID                     | Suggested issue title                                      | Ready for `/10x-plan` | Notes                                      |
| ---------- | ----------------------------- | ---------------------------------------------------------- | --------------------- | ------------------------------------------ |
| S-01       | first-private-decision        | User can create one private decision after sign-in         | yes                   | Run `/10x-plan first-private-decision`     |
| S-02       | options-and-weighted-criteria | User can add options and weighted criteria                 | no                    | Needs S-01 done                            |
| S-03       | weighted-ranking              | User can score options and see the weighted ranking        | no                    | Needs S-02 done; gwiazda przewodnia        |
| S-04       | ai-criteria-suggestions       | User can get model-suggested criteria and add chosen ones  | no                    | Needs S-02 done; plan jest gotowy, implementacja czeka na wybór dostawcy modelu; robimy po S-05 |
| S-05       | tie-breaker-wheel             | User can break a first-place tie with a wheel of fortune   | no                    | Needs S-03 done; potem `/10x-plan tie-breaker-wheel` |

## Open Roadmap Questions

1. **target_scale.qps** — not in shape-notes. TBD by user. Block: no. Owner: user. Block: roadmap-wide.
2. **target_scale.data_volume** — not in shape-notes. TBD by user. Block: no. Owner: user. Block: roadmap-wide.
3. **What is the current system's key architecture?** — there is no application; architecture was not named. TBD by user. Block: no. Owner: user. Block: roadmap-wide.
4. **What is the current system's tech stack?** — there is no application; stack was not named. TBD by user. Block: no. Owner: user. Block: roadmap-wide.
5. **Timeline: seed says ~2 h per week until 2026-12-06, frontmatter says delivery_weeks: 1.** — TBD by user. Block: no. Owner: user. Block: roadmap-wide.
6. **US-01 Acceptance Criteria** — Given/When/Then captured; detailed acceptance criteria were not listed. TBD by user. Block: no. Owner: user. Block: S-03.
7. **FR-011: dostawca i model językowy** — nie wybrano (PRD, Open Question 7). Owner: user. Block: implementacja S-04.
8. **FR-011: limit użycia i koszt** — PRD, Open Question 8. Owner: user. Block: S-04 przed produkcją.
9. **FR-011: jakie dane trafiają do modelu** — PRD, Open Question 9. Owner: user. Block: S-04.
10. **FR-011: język sugestii** — PRD, Open Question 10. Owner: user. Block: S-04.
11. **FR-012: zakres koła fortuny** — PRD, Open Question 11. Owner: user. Block: S-05 (nie blokuje planowania).

## Parked

- **Udostępnianie decyzji między użytkownikami** — Why parked: PRD §Non-Goals; v1 ma prywatne decyzje per konto.
- **Więcej niż jedna decyzja na konto (FR-009)** — Why parked: nice-to-have, poza must-have pierwszego etapu.
- **Panel admina / blokada i usuwanie kont (FR-010)** — Why parked: PRD §Non-Goals i nice-to-have; poza pierwszym etapem.
- **Model językowy poza nazwami kryteriów (sugestie opcji, wag, ocen, wskazywanie zwycięzcy, czat)** — Why parked: PRD §Non-Goals; FR-011 obejmuje tylko nazwy kryteriów.
- **Domknięcie auto-deploy po merge** — Why parked: cel `speed` i Worker już odpowiada; nie blokuje rankingu.
- **Aplikacyjne śledzenie błędów / metryki** — Why parked: cel `speed`; logi hosta wystarczą na ten milestone.

## Milestone History

## Done
