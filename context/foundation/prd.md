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
- Użytkownik dostaje od modelu językowego sugestie kryteriów dla swojej decyzji i dodaje wybrane (FR-011).

### Guardrails

- Decyzje nie wyciekają między kontami.
- Model językowy dostaje wyłącznie dane decyzji zalogowanego właściciela; jego awaria nie psuje reszty aplikacji.

Blast radius: nie ma istniejącej aplikacji — nic produkcyjnego do zepsucia.

## User Stories

### US-01: Zalogowany użytkownik widzi ranking swojej decyzji

- **Given** konto i jedna decyzja z opcjami, kryteriami z wagami i ocenami
- **When** otwiera tę decyzję
- **Then** widzi ranking z wyniku ważonego; nie widzi decyzji innych kont

Uzupełnienie US-01 (2026-11-16, odpowiedzi użytkownika): oceny to liczby całkowite 1–5. Ranking pokazuje się, gdy istnieje choć jedna ocena; opcja z brakującymi ocenami jest oznaczona jako niekompletna, a jej wynik to suma istniejących ocen (brak oceny to nie 0). Opcje z równym wynikiem mają to samo miejsce i oznaczenie remisu.

### US-02: Zalogowany użytkownik dostaje sugestie kryteriów od modelu

- **Given** konto i decyzja „Który samochód kupić?”, w której nie ma jeszcze wszystkich kryteriów
- **When** prosi o sugestie kryteriów
- **Then** widzi listę propozycji (np. cena, przebieg, koszt utrzymania) bez tych, które już ma; może dodać wybraną propozycję, podając wagę 1–5; nic nie dodaje się samo, a gdy model jest niedostępny, reszta decyzji działa bez zmian

### US-03: Zalogowany użytkownik rozstrzyga remis kołem fortuny

- **Given** konto i decyzja, w której co najmniej dwie opcje mają równy, najwyższy wynik ważony i są w pełni ocenione
- **When** kręci kołem fortuny
- **Then** koło pokazuje tylko te opcje i losuje jedną z nich; ranking i wyniki się nie zmieniają, a wynik losowania jest wyraźnie oznaczony jako rozstrzygnięcie remisu

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
- [new] FR-009: Użytkownik może mieć więcej niż jedną decyzję, wpisać własny tytuł (o czym decyduje), zmienić go i usunąć decyzję po potwierdzeniu. Priority: nice-to-have (realizowane od 2026-11-16 jako slice S-06 `multiple-decisions` na prośbę użytkownika). Change: new
  > Socrates: No counter-argument; it stands as written.
- [new] FR-010: Admin może blokować lub usuwać konta. Priority: nice-to-have. Change: new
  > Socrates: No counter-argument; it stands as written.
- [new] FR-011: Użytkownik może poprosić model językowy o sugestie kryteriów dla swojej decyzji (np. przy „Który samochód kupić?”: cena, przebieg, koszt utrzymania) i dodać wybrane do decyzji. Priority: nice-to-have. Change: new
  > Socrates: Counter-argument considered: "Gotowe sugestie ograniczą własne myślenie, a model poda ogólniki." Resolution: kept; sugestie są opcjonalne, nic nie trafia do decyzji bez akcji użytkownika, a wagę zawsze ustawia użytkownik.
- [new] FR-012: Gdy dwie lub więcej opcji ma równy wynik ważony na pierwszym miejscu rankingu, użytkownik może zakręcić kołem fortuny, które losuje jedną z tych opcji. Priority: nice-to-have. Change: new
  > Socrates: Counter-argument considered: "Los zastępuje decyzję, a ranking miał ją uzasadniać." Resolution: kept; koło działa tylko przy realnym remisie, nie zmienia rankingu ani wyników, a losowanie jest wyraźnie oznaczone jako rozstrzygnięcie remisu.

## Constraints & Compatibility

Brak istniejących API, integracji i migracji danych — nie ma aplikacji.

Zachować: decyzje nie są widoczne na innych kontach; udostępnianie nie wchodzi w pierwszy etap.

Brak okien wdrożeń, istniejącego CI ani konsumentów API do zachowania.

- Decyzje jednego konta nie pojawiają się u innego użytkownika.
- Gdy oceny i wagi są uzupełnione, użytkownik widzi ranking bez osobnego, ręcznego przeliczania — ranking jest dostępny od razu po ich podaniu.
- Sugestie kryteriów (FR-011) wymagają zewnętrznego dostawcy modelu językowego. Do dostawcy trafiają tylko dane decyzji zalogowanego właściciela (tytuł i nazwy jego kryteriów), nigdy dane innych kont. Klucz dostawcy jest sekretem serwera, nie wartością publiczną.
- Awaria, brak konfiguracji albo limit modelu nie mogą blokować tworzenia decyzji, opcji, kryteriów ani rankingu. Sugestie są dodatkiem.

## Business Logic Changes

Opcja z wyższym wynikiem ważonym (oceny × wagi kryteriów) stoi wyżej w rankingu.

Oceny są liczbami całkowitymi 1–5. Przy brakujących ocenach ranking i tak się pokazuje: wynik opcji to suma (waga × ocena) po istniejących ocenach, a opcja jest oznaczona jako niekompletna. Opcje z równym wynikiem mają to samo miejsce i oznaczenie remisu. Remis na pierwszym miejscu między opcjami w pełni ocenionymi można rozstrzygnąć losowaniem (FR-012); losowanie nie zmienia wyników ani rankingu.

Model językowy podpowiada wyłącznie nazwy kryteriów. Nie ustawia wag, nie ocenia opcji i nie wpływa na ranking. Podpowiedź staje się kryterium dopiero wtedy, gdy użytkownik ją doda z własną wagą 1–5; wtedy obowiązują te same reguły co dla kryterium dodanego ręcznie (nazwa 1–200 znaków, brak duplikatów bez względu na wielkość liter, najwyżej 20 kryteriów).

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
- Więcej niż jedna decyzja na konto — poza must-have pierwszego etapu; FR-009 jest nice-to-have, ale od 2026-11-16 objęte slice'em S-06 (`multiple-decisions`).
- Model językowy poza sugerowaniem nazw kryteriów (FR-011): bez sugerowania opcji, wag i ocen, bez wskazywania zwycięzcy, bez czatu. Ranking liczy się wyłącznie z ocen i wag użytkownika.
- Zapisywanie historii sugestii i uczenie modelu na decyzjach użytkowników — sugestie nie są przechowywane, a dane decyzji nie służą do trenowania.

## Open Questions

1. **target_scale.qps** — not in shape-notes. TBD by user. Block: no.
2. **target_scale.data_volume** — not in shape-notes. TBD by user. Block: no.
3. **What is the current system's key architecture?** — there is no application; architecture was not named. TBD by user. Block: no.
4. **What is the current system's tech stack?** — there is no application; stack was not named. TBD by user. Block: no.
5. **Timeline: seed says ~2 h per week until 2026-12-06, frontmatter says delivery_weeks: 1.** — TBD by user. Block: no.
6. **US-01 Acceptance Criteria** — Given/When/Then captured; skala ocen, ranking częściowy i remis uzupełnione 2026-11-16 (patrz uzupełnienie US-01); pozostałe szczegółowe kryteria nie zostały spisane. TBD by user. Block: no.
7. **FR-011: który dostawca i model językowy?** — nie wybrano. Do rozstrzygnięcia: zewnętrzne API z kluczem (sekret Workera) czy model uruchamiany przez platformę Cloudflare (bez klucza, ale z bindingiem), koszt, polityka przechowywania danych przez dostawcę i działanie po polsku. TBD by user. Block: implementacja S-04 (nie blokuje planowania).
8. **FR-011: limit użycia i koszt.** — kto i ile razy może prosić o sugestie (limit na konto / na godzinę), oraz twardy limit wydatków u dostawcy. TBD by user. Block: no.
9. **FR-011: jakie dane trafiają do modelu?** — przyjęte: tytuł decyzji i nazwy istniejących kryteriów. Czy dodać nazwy opcji (lepsze sugestie, więcej danych poza aplikacją)? TBD by user. Block: no.
10. **FR-011: język sugestii.** — przyjęte: język tytułu decyzji. Do potwierdzenia przy wybranym modelu. TBD by user. Block: no.
11. **FR-012: zakres koła fortuny.** — przyjęte: koło tylko przy remisie na pierwszym miejscu, tylko między opcjami w pełni ocenionymi, losowanie po stronie przeglądarki, wynik nie jest zapisywany. Rozstrzygnięte 2026-11-17: koło tylko dla remisu na pierwszym miejscu i tylko gdy cała grupa pierwszego miejsca (co najmniej dwie opcje) jest w pełni oceniona; ponowne losowanie dozwolone; wynik nie jest zapamiętywany. Block: no.
