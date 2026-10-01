---
project: "Decision Maker"
context_type: brownfield
created: 2026-09-26
updated: 2026-09-29
timeline_budget:
  delivery_weeks: 1
  hard_deadline: 2026-12-06
  after_hours_only: true
product_type: web-app
target_scale:
  users: small
checkpoint:
  current_phase: 8
  phases_completed: [1, 2, 3, 4, 5, 6, 7]
  gray_areas_resolved:
    - topic: "primary persona"
      decision: "Dowolna osoba z kontem; każdy ma swoje prywatne decyzje"
    - topic: "sharing"
      decision: "V1 prywatne; udostępnianie świadomie w v2"
    - topic: "change category"
      decision: "Nowy produkt / nowy moduł — aplikacja zamiast ręcznego procesu"
    - topic: "insight"
      decision: "Wagi + oceny muszą dać jeden widoczny ranking, nie tabelkę do ręcznego liczenia"
    - topic: "auth"
      decision: "Auth jest nowy; v1 email + hasło; role admin i zwykły użytkownik"
    - topic: "admin vs member"
      decision: "Admin zarządza kontami (blokada/usuwanie); decyzje nadal tylko właściciela"
    - topic: "mvp scope"
      decision: "Pierwszy etap bez panelu admina; admin w v2. Przepływ: rejestracja/logowanie, jedna decyzja, opcje, kryteria z wagami, oceny, ranking."
    - topic: "product type"
      decision: "web-app; no existing product type to preserve"
    - topic: "user scale"
      decision: "small — just me or a handful; at 100x the ranking rule stays the same"
    - topic: "timing"
      decision: "hard_deadline 2026-12-06; after_hours_only true"
  frs_drafted: 10
  quality_check_status: accepted
---

## Seed idea

Decision Maker: użytkownik tworzy decyzję, dodaje opcje i kryteria z wagami, ocenia opcje i widzi ranking z wyniku ważonego. Zakres: jedna osoba, bez udostępniania. Czas: ok. 2 h tygodniowo do 6 grudnia 2026; pierwszy etap to jedna decyzja i widoczny ranking.

## Current System

Brak aplikacji Decision Maker. Decyzje są w głowie, notatkach albo arkuszu — opcje, kryteria i wagi nie są w jednym miejscu i nie dają jednego rankingu.

Kto korzysta z tego procesu dziś: dowolna osoba, która porównuje opcje ręcznie. Produkt ma mieć rejestrację i logowanie wielu użytkowników; to nie jest aplikacja wyłącznie dla jednego operatora.

Co musi przetrwać jako intencja v1: decyzje nie są udostępniane między użytkownikami (udostępnianie świadomie w v2).

## Vision & Problem Statement

Przy wyborze z kilkoma opcjami i kryteriami o różnej wadze nie widać spójnego rankingu; łatwo zgubić wagi albo porównywać „na czuja”. Status quo to notatki, arkusz albo gotowa macierz do ręcznego liczenia.

Zmiana: nowy produkt zamiast ręcznego procesu. Użytkownik tworzy decyzję, dodaje opcje i kryteria z wagami, ocenia opcje i widzi ranking z wyniku ważonego. Pierwszy etap: jedna decyzja i widoczny ranking. Czas: ok. 2 h tygodniowo do 6 grudnia 2026.

Insight: wagi i oceny muszą dać jeden widoczny ranking, nie tabelkę do ręcznego liczenia. Przy 100× skali użytkowników reguła rankingu (oceny × wagi) zostaje ta sama; zmienia się tylko liczba kont.

## User & Persona

Dowolna osoba z kontem. Rejestracja i logowanie — wielu użytkowników. Każdy ma swoje prywatne decyzje.

V1: bez udostępniania decyzji między użytkownikami. Udostępnianie — v2.

## Access Control

Dziś nie ma aplikacji — nie ma auth. W tej pracy wprowadzamy rejestrację i logowanie.

V1 (pierwszy etap): email + hasło; płaski model — każde konto te same możliwości na własnych decyzjach. Bez panelu admina.

Planowane (po pierwszym etapie): role admin i zwykły użytkownik. Admin zarządza kontami (blokada/usuwanie). Decyzje nadal tylko właściciela — admin nie ogląda cudzych decyzji.

Nieautoryzowany użytkownik: brak dostępu do decyzji (musi się zarejestrować / zalogować).

Udostępnianie decyzji między użytkownikami nie wchodzi w v1.

## Success Criteria

### Primary

- Zalogowany użytkownik tworzy jedną decyzję, dodaje opcje i kryteria z wagami, ocenia opcje i widzi ranking z wyniku ważonego.

### Secondary

- Więcej niż jedna decyzja na konto.

### Guardrails

- Decyzje nie wyciekają między kontami.

Blast radius: nie ma istniejącej aplikacji — nic produkcyjnego do zepsucia.

## Functional Requirements

### Konto

- FR-001: Użytkownik może się zarejestrować (email + hasło). Priority: must-have. Change: new
  > Socrates: Counter-argument considered: "Rejestracja email+hasło zniechęci, zanim ktoś zobaczy ranking." Resolution: kept; rejestracja przed rankingiem, świadomy koszt tarcia.
- FR-002: Użytkownik może się zalogować. Priority: must-have. Change: new
  > Socrates: No counter-argument; it stands as written.

### Decyzja i ranking

- FR-003: Użytkownik może utworzyć decyzję. Priority: must-have. Change: new
  > Socrates: No counter-argument; it stands as written.
- FR-004: Użytkownik może dodać opcje do decyzji. Priority: must-have. Change: new
  > Socrates: No counter-argument; it stands as written.
- FR-005: Użytkownik może dodać kryteria z wagami. Priority: must-have. Change: new
  > Socrates: No counter-argument; it stands as written.
- FR-006: Użytkownik może ocenić opcje. Priority: must-have. Change: new
  > Socrates: No counter-argument; it stands as written.
- FR-007: Użytkownik może zobaczyć ranking z wyniku ważonego. Priority: must-have. Change: new
  > Socrates: No counter-argument; it stands as written.
- FR-008: Użytkownik nie widzi decyzji innych kont. Priority: must-have. Change: new
  > Socrates: No counter-argument; it stands as written.
- FR-009: Użytkownik może mieć więcej niż jedną decyzję. Priority: nice-to-have. Change: new
  > Socrates: No counter-argument; it stands as written.

### Admin (po pierwszym etapie)

- FR-010: Admin może blokować lub usuwać konta. Priority: nice-to-have. Change: new
  > Socrates: No counter-argument; it stands as written.

## User Stories

### US-01: Zalogowany użytkownik widzi ranking swojej decyzji

- **Given** konto i jedna decyzja z opcjami, kryteriami z wagami i ocenami
- **When** otwiera tę decyzję
- **Then** widzi ranking z wyniku ważonego; nie widzi decyzji innych kont

## Business Logic

Opcja z wyższym wynikiem ważonym (oceny × wagi kryteriów) stoi wyżej w rankingu.

Wejścia, które podaje użytkownik: opcje, kryteria z wagami, oceny opcji. Wyjście: jeden ranking. Użytkownik widzi go na decyzji, bez ręcznego liczenia.

Dziś nie ma reguły w systemie (proces ręczny). Ta zmiana dodaje nową regułę.

## Constraints & Preserved Behavior

Brak istniejących API, integracji i migracji danych — nie ma aplikacji.

Zachować: decyzje nie są widoczne na innych kontach; udostępnianie nie wchodzi w pierwszy etap.

Brak okien wdrożeń, istniejącego CI ani konsumentów API do zachowania.

## Non-Functional Requirements

- Decyzje jednego konta nie pojawiają się u innego użytkownika.
- Gdy oceny i wagi są uzupełnione, użytkownik widzi ranking bez osobnego, ręcznego przeliczania — ranking jest dostępny od razu po ich podaniu.

## Non-Goals

- Udostępnianie decyzji między użytkownikami — v1 ma prywatne decyzje per konto; sharing świadomie później.

## Quality cross-check

Access Control: present
Business Logic: present (one-sentence weighted ranking rule)
Project artifacts: present
Timeline-cost ack: present (`delivery_weeks: 1` ≤ 3)
Non-Goals: present
Preserved behavior: present (izolacja kont; brak udostępniania w tym etapie)

No gaps recorded.


