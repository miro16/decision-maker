---
project: "Decision Maker"
version: 1
status: draft
created: 2026-09-29
context_type: brownfield
product_type: web-app
target_scale:
  users: small
  qps: "# TODO: qps — see Open Questions"
  data_volume: "# TODO: data_volume — see Open Questions"
timeline_budget:
  delivery_weeks: 1
  hard_deadline: 2026-12-06
  after_hours_only: true
---

## Current System Overview

Brak aplikacji Decision Maker. Decyzje są w głowie, notatkach albo arkuszu — opcje, kryteria i wagi nie są w jednym miejscu i nie dają jednego rankingu.

Cel obecnego procesu: porównać opcje ręcznie.

Kto korzysta z tego procesu dziś: dowolna osoba, która porównuje opcje ręcznie. Produkt ma mieć rejestrację i logowanie wielu użytkowników; to nie jest aplikacja wyłącznie dla jednego operatora.

Funkcjonalność dziś: ręczny proces, bez jednego rankingu.

# TODO: key architecture — see Open Questions
# TODO: tech stack — see Open Questions

Co musi przetrwać jako intencja v1: decyzje nie są udostępniane między użytkownikami (udostępnianie świadomie w v2).

## Problem Statement & Motivation

Przy wyborze z kilkoma opcjami i kryteriami o różnej wadze nie widać spójnego rankingu; łatwo zgubić wagi albo porównywać „na czuja”. Status quo to notatki, arkusz albo gotowa macierz do ręcznego liczenia.

Zmiana: nowy produkt zamiast ręcznego procesu. Użytkownik tworzy decyzję, dodaje opcje i kryteria z wagami, ocenia opcje i widzi ranking z wyniku ważonego. Pierwszy etap: jedna decyzja i widoczny ranking. Czas: ok. 2 h tygodniowo do 6 grudnia 2026.

Insight: wagi i oceny muszą dać jeden widoczny ranking, nie tabelkę do ręcznego liczenia. Przy 100× skali użytkowników reguła rankingu (oceny × wagi) zostaje ta sama; zmienia się tylko liczba kont.

## User & Persona

Dowolna osoba z kontem. Rejestracja i logowanie — wielu użytkowników. Każdy ma swoje prywatne decyzje.

V1: bez udostępniania decyzji między użytkownikami. Udostępnianie — v2.

## Success Criteria

### Primary

- Zalogowany użytkownik tworzy jedną decyzję, dodaje opcje i kryteria z wagami, ocenia opcje i widzi ranking z wyniku ważonego.

### Secondary

- Więcej niż jedna decyzja na konto.

### Guardrails

- Decyzje nie wyciekają między kontami.

Blast radius: nie ma istniejącej aplikacji — nic produkcyjnego do zepsucia.

## User Stories

### US-01: Zalogowany użytkownik widzi ranking swojej decyzji

- **Given** konto i jedna decyzja z opcjami, kryteriami z wagami i ocenami
- **When** otwiera tę decyzję
- **Then** widzi ranking z wyniku ważonego; nie widzi decyzji innych kont

# TODO: Acceptance Criteria — see Open Questions

## Scope of Change

- [new] FR-001: Użytkownik może się zarejestrować (email + hasło). Priority: must-have. Change: new
  > Socrates: Counter-argument considered: "Rejestracja email+hasło zniechęci, zanim ktoś zobaczy ranking." Resolution: kept; rejestracja przed rankingiem, świadomy koszt tarcia.
- [new] FR-002: Użytkownik może się zalogować. Priority: must-have. Change: new
  > Socrates: No counter-argument; it stands as written.
- [new] FR-003: Użytkownik może utworzyć decyzję. Priority: must-have. Change: new
  > Socrates: No counter-argument; it stands as written.
- [new] FR-004: Użytkownik może dodać opcje do decyzji. Priority: must-have. Change: new
  > Socrates: No counter-argument; it stands as written.
- [new] FR-005: Użytkownik może dodać kryteria z wagami. Priority: must-have. Change: new
  > Socrates: No counter-argument; it stands as written.
- [new] FR-006: Użytkownik może ocenić opcje. Priority: must-have. Change: new
  > Socrates: No counter-argument; it stands as written.
- [new] FR-007: Użytkownik może zobaczyć ranking z wyniku ważonego. Priority: must-have. Change: new
  > Socrates: No counter-argument; it stands as written.
- [new] FR-008: Użytkownik nie widzi decyzji innych kont. Priority: must-have. Change: new
  > Socrates: No counter-argument; it stands as written.
- [new] FR-009: Użytkownik może mieć więcej niż jedną decyzję. Priority: nice-to-have. Change: new
  > Socrates: No counter-argument; it stands as written.
- [new] FR-010: Admin może blokować lub usuwać konta. Priority: nice-to-have. Change: new
  > Socrates: No counter-argument; it stands as written.

## Constraints & Compatibility

Brak istniejących API, integracji i migracji danych — nie ma aplikacji.

Zachować: decyzje nie są widoczne na innych kontach; udostępnianie nie wchodzi w pierwszy etap.

Brak okien wdrożeń, istniejącego CI ani konsumentów API do zachowania.

- Decyzje jednego konta nie pojawiają się u innego użytkownika.
- Gdy oceny i wagi są uzupełnione, użytkownik widzi ranking bez osobnego, ręcznego przeliczania — ranking jest dostępny od razu po ich podaniu.

## Business Logic Changes

Opcja z wyższym wynikiem ważonym (oceny × wagi kryteriów) stoi wyżej w rankingu.

Wejścia, które podaje użytkownik: opcje, kryteria z wagami, oceny opcji. Wyjście: jeden ranking. Użytkownik widzi go na decyzji, bez ręcznego liczenia.

Dziś nie ma reguły w systemie (proces ręczny). Ta zmiana dodaje nową regułę.

## Access Control Changes

Dziś nie ma aplikacji — nie ma auth. W tej pracy wprowadzamy rejestrację i logowanie.

V1 (pierwszy etap): email + hasło; płaski model — każde konto te same możliwości na własnych decyzjach. Bez panelu admina.

Planowane (po pierwszym etapie): role admin i zwykły użytkownik. Admin zarządza kontami (blokada/usuwanie). Decyzje nadal tylko właściciela — admin nie ogląda cudzych decyzji.

Nieautoryzowany użytkownik: brak dostępu do decyzji (musi się zarejestrować / zalogować).

Udostępnianie decyzji między użytkownikami nie wchodzi w v1.

## Non-Goals

- Udostępnianie decyzji między użytkownikami — v1 ma prywatne decyzje per konto; sharing świadomie później.
- Panel admina (blokada/usuwanie kont) — poza pierwszym etapem; FR-010 jest nice-to-have.
- Więcej niż jedna decyzja na konto — poza must-have pierwszego etapu; FR-009 jest nice-to-have.

## Open Questions

1. **target_scale.qps** — not in shape-notes. TBD by user. Block: no.
2. **target_scale.data_volume** — not in shape-notes. TBD by user. Block: no.
3. **What is the current system's key architecture?** — there is no application; architecture was not named. TBD by user. Block: no.
4. **What is the current system's tech stack?** — there is no application; stack was not named. TBD by user. Block: no.
5. **Timeline: seed says ~2 h per week until 2026-12-06, frontmatter says delivery_weeks: 1.** — TBD by user. Block: no.
6. **US-01 Acceptance Criteria** — Given/When/Then captured; detailed acceptance criteria were not listed. TBD by user. Block: no.
