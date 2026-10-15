---
project: Decision Maker
version: 1
status: draft
created: 2026-10-11
updated: 2026-10-11
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
- **Scope anchors:** FR-001–FR-008, US-01. FR-009 i FR-010 zostają poza tym milestone’em (nice-to-have / Non-Goals).

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
| S-03  | weighted-ranking              | ocenić opcje i zobaczyć ranking z wyniku ważonego         | S-02          | US-01, FR-006, FR-007, FR-008    | proposed |

## Baseline

What's already in place in the codebase as of `2026-10-11` (auto-researched + user-confirmed).
Foundations below assume these are present and do NOT re-scaffold them.

- **Frontend:** partial — starter, ekrany konta i pusty dashboard; brak ekranów decyzji.
- **Backend / API:** partial — są tylko endpointy konta; brak API decyzji.
- **Data:** absent — jest klient bazy, brak migracji decyzji / opcji / kryteriów / ocen.
- **Auth:** present — rejestracja, logowanie, sesja i ochrona dashboardu, potwierdzone na produkcji.
- **Deploy / infra:** partial — Worker na produkcji i job deploy w CI; auto-deploy po merge nie jest domknięty.
- **Observability:** partial — logi hosta włączone; brak śledzenia błędów ani metryk w aplikacji.

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
  - Czy przy braku kompletu ocen ranking i tak się pokazuje (puste / częściowe), czy czeka na wszystkie komórki? — Owner: user. Block: no.
- **Risk:** to jest gwiazda przewodnia; jeśli formula albo kompletność ocen zostaną źle przyjęte, użytkownik zobaczy „ranking”, który nie zgadza się z PRD.
- **Status:** proposed

## Backlog Handoff

| Roadmap ID | Change ID                     | Suggested issue title                                      | Ready for `/10x-plan` | Notes                                      |
| ---------- | ----------------------------- | ---------------------------------------------------------- | --------------------- | ------------------------------------------ |
| S-01       | first-private-decision        | User can create one private decision after sign-in         | yes                   | Run `/10x-plan first-private-decision`     |
| S-02       | options-and-weighted-criteria | User can add options and weighted criteria                 | no                    | Needs S-01 done                            |
| S-03       | weighted-ranking              | User can score options and see the weighted ranking        | no                    | Needs S-02 done; gwiazda przewodnia        |

## Open Roadmap Questions

1. **target_scale.qps** — not in shape-notes. TBD by user. Block: no. Owner: user. Block: roadmap-wide.
2. **target_scale.data_volume** — not in shape-notes. TBD by user. Block: no. Owner: user. Block: roadmap-wide.
3. **What is the current system's key architecture?** — there is no application; architecture was not named. TBD by user. Block: no. Owner: user. Block: roadmap-wide.
4. **What is the current system's tech stack?** — there is no application; stack was not named. TBD by user. Block: no. Owner: user. Block: roadmap-wide.
5. **Timeline: seed says ~2 h per week until 2026-12-06, frontmatter says delivery_weeks: 1.** — TBD by user. Block: no. Owner: user. Block: roadmap-wide.
6. **US-01 Acceptance Criteria** — Given/When/Then captured; detailed acceptance criteria were not listed. TBD by user. Block: no. Owner: user. Block: S-03.

## Parked

- **Udostępnianie decyzji między użytkownikami** — Why parked: PRD §Non-Goals; v1 ma prywatne decyzje per konto.
- **Więcej niż jedna decyzja na konto (FR-009)** — Why parked: nice-to-have, poza must-have pierwszego etapu.
- **Panel admina / blokada i usuwanie kont (FR-010)** — Why parked: PRD §Non-Goals i nice-to-have; poza pierwszym etapem.
- **Domknięcie auto-deploy po merge** — Why parked: cel `speed` i Worker już odpowiada; nie blokuje rankingu.
- **Aplikacyjne śledzenie błędów / metryki** — Why parked: cel `speed`; logi hosta wystarczą na ten milestone.

## Milestone History

## Done
