# Requirements Document

## Introduction

Redesign interfejsu zarządzania obszarami w aplikacji DroneMesh3D. Obecny układ rozdziela akcje rysowania/czyszczenia/zapisywania polygonów (toolbar na mapie) od listy obszarów (panel boczny), co jest nieintuicyjne. Nowy design integruje te akcje bezpośrednio w sekcji "Obszary" panelu bocznego, dodaje możliwość usuwania obszarów oraz poprawia widoczność historii planów lotu.

## Glossary

- **Side_Panel**: Panel boczny aplikacji zawierający sekcje z listami i formularzami
- **Area_Section**: Sekcja "Obszary" w panelu bocznym, zawierająca listę obszarów i zintegrowane akcje rysowania
- **Map_Component**: Komponent mapy OpenLayers wyświetlający podkład i rysowane polygony
- **Area_Toolbar**: Zintegrowany pasek narzędzi wewnątrz sekcji obszarów (zastępuje dotychczasowy map-toolbar)
- **Flight_Plan_History**: Sekcja "Historia planów lotu" w panelu bocznym wyświetlająca wygenerowane plany
- **Confirmation_Dialog**: Modalne okno dialogowe potwierdzające operację destrukcyjną (usunięcie)
- **Area_Item**: Pojedynczy element listy obszarów z akcjami kontekstowymi

## Requirements

### Requirement 1: Zintegrowany toolbar rysowania w sekcji obszarów

**User Story:** Jako użytkownik, chcę mieć przycisk "Rysuj" bezpośrednio w sekcji obszarów, aby intuicyjnie wiązać rysowanie polygonu z tworzeniem nowego obszaru.

#### Acceptance Criteria

1. WHEN Area_Section jest rozwinięta, THE Area_Toolbar SHALL wyświetlać przycisk "Nowy obszar" inicjujący tryb rysowania na mapie
2. WHILE tryb rysowania jest aktywny, THE Area_Toolbar SHALL wyświetlać przycisk "Anuluj" pozwalający przerwać rysowanie oraz ukryć przycisk "Nowy obszar"
3. WHEN użytkownik kliknie "Anuluj" w trakcie rysowania, THE Area_Toolbar SHALL usunąć częściowy polygon z mapy, dezaktywować interakcję Draw i przywrócić toolbar do stanu początkowego (widoczny przycisk "Nowy obszar")
4. WHILE tryb rysowania jest aktywny, THE Area_Toolbar SHALL stosować wyróżniającą klasę CSS stanu aktywnego na przycisku "Nowy obszar" (np. wariant kolorystyczny tła przycisku) odróżniającą go od stanu nieaktywnego
5. WHEN użytkownik zakończy rysowanie polygonu, THE Area_Toolbar SHALL ukryć przycisk "Nowy obszar" i wyświetlać przyciski "Zapisz" oraz "Wyczyść" w kontekście narysowanego polygonu
6. IF polygon jest nieprawidłowy (walidacja zwraca co najmniej jeden błąd), THEN THE Area_Toolbar SHALL wyłączyć przycisk "Zapisz" i wyświetlić maksymalnie 5 komunikatów błędów walidacji pod przyciskami akcji
7. WHILE żądanie zapisu obszaru jest w trakcie realizacji, THE Area_Toolbar SHALL wyłączyć przyciski "Zapisz" i "Wyczyść" oraz wyświetlać wskaźnik ładowania na przycisku "Zapisz"

### Requirement 2: Usunięcie komponentu map-toolbar

**User Story:** Jako użytkownik, chcę mieć spójny interfejs bez zduplikowanych kontrolek, aby nie szukać akcji w dwóch różnych miejscach.

#### Acceptance Criteria

1. THE Map_Component SHALL renderować mapę bez nakładki toolbar z przyciskami "Rysuj/Wyczyść/Zapisz" oraz bez komunikatów błędów walidacji w obszarze mapy
2. THE Map_Component SHALL zachować wyświetlanie walidacji wizualnej polygonu na warstwie mapy, stosując wyróżniający styl obramowania i wypełnienia dla polygonu prawidłowego oraz odrębny styl dla polygonu nieprawidłowego
3. WHEN użytkownik aktywuje rysowanie z Area_Toolbar, THE Map_Component SHALL uruchomić interakcję Draw typu Polygon, a po zakończeniu rysowania umożliwić edycję wierzchołków narysowanego polygonu (interakcja Modify)
4. THE Map_Component SHALL zachować wyświetlanie komponentu wyszukiwania lokalizacji (MapSearch) jako jedynej nakładki w obszarze mapy

### Requirement 3: Usuwanie obszarów

**User Story:** Jako użytkownik, chcę móc usuwać niepotrzebne obszary z listy, aby utrzymać porządek w danych.

#### Acceptance Criteria

1. WHEN użytkownik najedzie kursorem na Area_Item lub sfocusuje go klawiaturą, THE Area_Section SHALL wyświetlić przycisk usuwania przy danym elemencie
2. WHEN użytkownik kliknie przycisk usuwania, THE Area_Section SHALL wyświetlić Confirmation_Dialog z pytaniem o potwierdzenie usunięcia obszaru
3. WHEN użytkownik potwierdzi usunięcie w Confirmation_Dialog, THE Area_Section SHALL wysłać żądanie DELETE do API, wyłączyć interakcję z dialogiem na czas trwania żądania, a po otrzymaniu odpowiedzi sukcesu — zamknąć dialog i usunąć obszar z listy
4. IF żądanie DELETE zakończy się błędem, THEN THE Area_Section SHALL zamknąć Confirmation_Dialog, wyświetlić komunikat o błędzie przy liście obszarów do momentu wykonania kolejnej akcji przez użytkownika, i zachować obszar na liście bez zmian
5. WHEN usunięty obszar był aktualnie wybrany, THE Area_Section SHALL wyczyścić stan zaznaczenia (żaden obszar nie jest wybrany) oraz wyczyścić wyświetlaną historię planów lotu
6. WHEN obszar posiada powiązane plany lotu (liczba planów > 0), THE Confirmation_Dialog SHALL wyświetlić informację o liczbie planów lotu, które zostaną usunięte kaskadowo razem z obszarem

### Requirement 4: Endpoint API do usuwania obszarów

**User Story:** Jako system frontend, chcę mieć endpoint DELETE /api/areas/{id}, aby móc usuwać obszary z bazy danych.

#### Acceptance Criteria

1. WHEN żądanie DELETE jest wysłane z prawidłowym ID obszaru (istniejący GUID w bazie danych), THE API SHALL usunąć obszar wraz z powiązanymi planami lotu i zwrócić status 204 No Content z pustym ciałem odpowiedzi
2. IF żądanie DELETE zawiera ID w nieprawidłowym formacie (nie jest poprawnym GUID), THEN THE API SHALL zwrócić status 400 Bad Request
3. IF żądanie DELETE zawiera ID obszaru który nie istnieje w bazie danych, THEN THE API SHALL zwrócić status 404 Not Found
4. IF obszar posiada powiązane plany lotu, THEN THE API SHALL usunąć je kaskadowo w ramach tej samej operacji usunięcia obszaru

### Requirement 5: Historia planów lotu powiązana z obszarem

**User Story:** Jako użytkownik, chcę widzieć historię planów lotu dla wybranego obszaru, aby porównywać konfiguracje i wyniki.

#### Acceptance Criteria

1. WHEN użytkownik wybierze obszar z listy, THE Flight_Plan_History SHALL załadować i wyświetlić plany lotu powiązane z tym obszarem bez dodatkowej interakcji użytkownika
2. WHILE plany lotu są ładowane z API, THE Flight_Plan_History SHALL wyświetlać wskaźnik ładowania (skeleton placeholder)
3. IF żądanie pobrania planów lotu zakończy się błędem, THEN THE Flight_Plan_History SHALL wyświetlić komunikat o błędzie oraz przycisk ponowienia próby
4. WHEN nie jest wybrany żaden obszar, THE Flight_Plan_History SHALL wyświetlać komunikat "Wybierz obszar, aby zobaczyć historię planów"
5. WHEN wybrany obszar nie posiada żadnych planów lotu, THE Flight_Plan_History SHALL wyświetlać komunikat informujący o braku planów
6. THE Flight_Plan_History SHALL wyświetlać plany posortowane malejąco według daty utworzenia (pole createdAt)
7. THE Flight_Plan_History SHALL wyświetlać dla każdego planu: tryb (Grid/POI), datę utworzenia, dystans w metrach (zaokrąglony do liczby całkowitej), czas lotu w formacie "X min Y s" oraz liczbę zdjęć

### Requirement 6: Usuwanie planów lotu z historii

**User Story:** Jako użytkownik, chcę móc usuwać niepotrzebne plany lotu z historii, aby utrzymać czytelność listy.

#### Acceptance Criteria

1. WHEN użytkownik najedzie kursorem na plan lotu lub sfocusuje go klawiaturą, THE Flight_Plan_History SHALL wyświetlić przycisk usuwania przy danym elemencie listy
2. WHEN użytkownik kliknie przycisk usuwania planu, THE Flight_Plan_History SHALL wyświetlić Confirmation_Dialog identyfikujący plan przez jego tryb (Grid/POI) i datę utworzenia
3. WHEN użytkownik potwierdzi usunięcie planu, THE Flight_Plan_History SHALL zablokować przycisk usuwania i wysłać żądanie DELETE do API, a po otrzymaniu odpowiedzi 204 usunąć plan z listy
4. IF żądanie DELETE planu zakończy się błędem, THEN THE Flight_Plan_History SHALL wyświetlić komunikat o błędzie wskazujący na niepowodzenie usunięcia, zachować plan na liście i odblokować przycisk usuwania
5. WHEN usunięty plan był aktualnie wizualizowany na mapie, THE Flight_Plan_History SHALL wyczyścić warstwę trasy lotu z Map_Component

### Requirement 7: Dialog potwierdzenia usunięcia

**User Story:** Jako użytkownik, chcę potwierdzać operacje usuwania, aby nie stracić danych przez przypadkowe kliknięcie.

#### Acceptance Criteria

1. THE Confirmation_Dialog SHALL wyświetlać nazwę usuwanego zasobu (np. nazwę obszaru lub identyfikator planu lotu) oraz pytanie "Czy na pewno chcesz usunąć?"
2. THE Confirmation_Dialog SHALL zawierać przyciski "Usuń" (wizualnie wyróżniony jako akcja destrukcyjna) i "Anuluj", gdzie domyślny focus po otwarciu dialogu SHALL być ustawiony na przycisku "Anuluj"
3. WHILE Confirmation_Dialog jest otwarty, THE Confirmation_Dialog SHALL przechwytywać focus wewnątrz dialogu (focus trap) oraz blokować interakcję z elementami w tle (modal overlay)
4. WHEN użytkownik naciśnie klawisz Escape lub kliknie przycisk "Anuluj", THE Confirmation_Dialog SHALL zamknąć się bez wykonania akcji i przenieść focus z powrotem na element, który wywołał otwarcie dialogu
5. THE Confirmation_Dialog SHALL posiadać atrybut role="alertdialog", atrybut aria-modal="true", aria-labelledby wskazujący na nagłówek dialogu oraz aria-describedby wskazujący na treść opisu operacji
6. WHEN użytkownik kliknie przycisk "Usuń", THE Confirmation_Dialog SHALL zamknąć się i zainicjować operację usunięcia wskazanego zasobu

### Requirement 8: Dostępność (Accessibility) nowych elementów

**User Story:** Jako użytkownik korzystający z technologii asystujących, chcę mieć dostęp do wszystkich nowych funkcji za pomocą klawiatury i czytnika ekranów.

#### Acceptance Criteria

1. THE Area_Toolbar SHALL posiadać etykiety aria-label opisujące akcję na wszystkich przyciskach ("Nowy obszar", "Anuluj", "Zapisz", "Wyczyść")
2. WHEN użytkownik usunie obszar, THE Area_Section SHALL ogłosić usunięcie elementu i aktualną liczbę obszarów za pomocą aria-live="polite" region
3. WHILE tryb rysowania jest aktywny, THE Area_Toolbar SHALL komunikować stan aktywnego rysowania technologiom asystującym poprzez atrybut aria-pressed="true" na przycisku "Nowy obszar"
4. THE Area_Item SHALL renderować przycisk usuwania w DOM i w porządku tabulacji (tabindex="0") niezależnie od stanu hover, stosując ukrycie wyłącznie wizualne (opacity/visibility) gdy element nie jest sfocusowany ani najechany kursorem
5. WHEN lista planów lotu ulegnie zmianie (załadowanie, usunięcie planu), THE Flight_Plan_History SHALL ogłosić zaktualizowaną liczbę planów za pomocą aria-live="polite" region
6. THE Flight_Plan_History SHALL renderować przycisk usuwania planu w porządku tabulacji dla każdego elementu listy, stosując ukrycie wyłącznie wizualne gdy element nie jest sfocusowany ani najechany kursorem
7. WHEN Confirmation_Dialog zostanie otwarty, THE Confirmation_Dialog SHALL przenieść focus na pierwszy interaktywny element dialogu i zwrócić focus do elementu wywołującego po zamknięciu
