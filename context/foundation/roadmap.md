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
| S-05  | tie-breaker-wheel             | rozstrzygnąć remis na pierwszym miejscu kołem fortuny     | S-03          | US-03, FR-012                    | planning |
| S-06  | multiple-decisions            | mieć kilka własnych decyzji, nazwać je i usunąć           | S-03          | FR-009, FR-003                   | in-progress |
| S-07  | futuristic-dashboard-ui       | widzieć dashboard w futurystycznym, ciemnym motywie neonowym | S-06       | (UI, bez nowego FR)              | in-progress |
| S-08  | decision-table-view           | widzieć decyzję jako tabelę opcji i kryteriów z oceną      | S-03, S-07    | FR-006, FR-007                   | in-progress |

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
  - ~~Czy koło ma działać też dla remisu na niższych miejscach i czy wynik losowania ma być zapamiętany?~~ Rozstrzygnięte 2026-11-17: tylko pierwsze miejsce i tylko gdy cała grupa pierwszego miejsca jest w pełni oceniona; bez zapisu wyniku; ponowne losowanie dozwolone.
- **Risk:** losowanie bez oznaczenia mogłoby wyglądać jak wynik rankingu; koło musi być wyraźnie rozstrzygnięciem remisu i nie zmieniać wyników. Kolejność: po `S-03`, przed `S-04`.
- **Status:** planning

### S-06: Wiele decyzji na konto

- **Outcome:** użytkownik sam wpisuje, o czym decyduje, może mieć kilka decyzji, zmienić nazwę decyzji i ją usunąć (z potwierdzeniem)
- **Change ID:** multiple-decisions
- **PRD refs:** FR-009, FR-003
- **Prerequisites:** S-03
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - Jak wybierana jest bieżąca decyzja bez parametru w URL (przyjęte: ostatnio utworzona) oraz czy usunięcie wymaga wpisania nazwy. — Owner: user. Block: no.
- **Risk:** zmiana dotyka migracji (zdjęcie unikalności `user_id` w `decisions`), wszystkich endpointów `/api/*` i dashboardu; zachować RLS per `auth.uid()` i kaskadowe usuwanie. Powód: na produkcji zostaje stara decyzja testowa „pizza”, której nie da się zmienić. Wyjęte z Parked 2026-11-16 na prośbę użytkownika.
- **Status:** in-progress

### S-07: Futurystyczny dashboard

- **Outcome:** użytkownik widzi dashboard w ciemnym motywie neonowym (granat-czerń, akcent cyjan i fiolet, poświata przy focusie i kartach)
- **Change ID:** futuristic-dashboard-ui
- **PRD refs:** — (zmiana wizualna, bez nowego FR)
- **Prerequisites:** S-06 (restyl obejmuje też listę i formularze decyzji)
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - Czy dodać przełącznik motywu (przyjęte: nie, ciemny jako domyślny). — Owner: user. Block: no.
- **Risk:** zmiana wartości tokenów w `global.css` dotyka każdej strony; kontrast sprawdzić w gate’cie (znany problem: `text-destructive` na `bg-destructive/10`). Tryb `/10x-ui`: audyt, plan, bramka screenshotowa, reguła w AGENTS.md.
- **Status:** in-progress

### S-08: Decyzja jako tabela

- **Outcome:** użytkownik widzi decyzję jako tabelę: wiersze to opcje, kolumny to kryteria z wagami, ostatnia kolumna to ocena opcji (suma ważona, miejsce, znaczniki); oceny wpisuje w komórkach
- **Change ID:** decision-table-view
- **PRD refs:** FR-006, FR-007 (prezentacja ocen i rankingu; bez zmiany reguł liczenia)
- **Prerequisites:** S-03, S-07
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - Jak tabela zachowuje się przy 20 opcjach i 20 kryteriach (przyjęte: przewijanie poziome w kontenerze). — Owner: user. Block: no.
- **Risk:** dotyka głównego widoku i jego stanów (`DecisionDashboard.astro`, `/dev/dashboard-states`); smoke asserts na tekstach sekcji Scores/Ranking trzeba przepisać świadomie; dostępność tabeli (nagłówki `scope`, etykiety pól w komórkach); brak zmian w API i bazie. Tryb `/10x-ui`: kontrakt tokenów, macierz stanów, bramka screenshotowa.
- **Status:** in-progress

## Backlog Handoff

| Roadmap ID | Change ID                     | Suggested issue title                                      | Ready for `/10x-plan` | Notes                                      |
| ---------- | ----------------------------- | ---------------------------------------------------------- | --------------------- | ------------------------------------------ |
| S-01       | first-private-decision        | User can create one private decision after sign-in         | yes                   | Run `/10x-plan first-private-decision`     |
| S-02       | options-and-weighted-criteria | User can add options and weighted criteria                 | no                    | Needs S-01 done                            |
| S-03       | weighted-ranking              | User can score options and see the weighted ranking        | no                    | Needs S-02 done; gwiazda przewodnia        |
| S-04       | ai-criteria-suggestions       | User can get model-suggested criteria and add chosen ones  | no                    | Needs S-02 done; plan jest gotowy, implementacja czeka na wybór dostawcy modelu; robimy po S-05 |
| S-05       | tie-breaker-wheel             | User can break a first-place tie with a wheel of fortune   | yes                   | S-03 gotowe; plan i brief w `context/changes/tie-breaker-wheel/` (2026-11-17) |
| S-06       | multiple-decisions            | User can create, rename and delete several decisions       | yes                   | Run `/10x-plan multiple-decisions`; robimy przed S-05 i S-04 (decyzja użytkownika 2026-11-16) |
| S-07       | futuristic-dashboard-ui       | User sees the dashboard in a futuristic neon-dark theme    | no                    | Needs S-06 done; potem `/10x-ui futuristic-dashboard-ui` (research z briefem audytu) |
| S-08       | decision-table-view           | User sees the decision as a table of options by criteria   | yes                   | S-03 i S-07 gotowe; `/10x-research decision-table-view`, potem `/10x-plan` (prośba użytkownika 2026-11-17) |

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
- ~~Więcej niż jedna decyzja na konto (FR-009)~~ — wyjęte z Parked 2026-11-16, patrz slice `S-06 multiple-decisions`.
- **Panel admina / blokada i usuwanie kont (FR-010)** — Why parked: PRD §Non-Goals i nice-to-have; poza pierwszym etapem.
- **Model językowy poza nazwami kryteriów (sugestie opcji, wag, ocen, wskazywanie zwycięzcy, czat)** — Why parked: PRD §Non-Goals; FR-011 obejmuje tylko nazwy kryteriów.
- **Domknięcie auto-deploy po merge** — Why parked: cel `speed` i Worker już odpowiada; nie blokuje rankingu.
- **Aplikacyjne śledzenie błędów / metryki** — Why parked: cel `speed`; logi hosta wystarczą na ten milestone.

## Milestone History

## Done
