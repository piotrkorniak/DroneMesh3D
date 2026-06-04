# Requirements Document

## Introduction

Ta funkcjonalność implementuje pierwszy krok przepływu pracy DroneMesh3D: umożliwienie użytkownikowi zdefiniowania obszaru skanowania na interaktywnej mapie poprzez narysowanie poligonu. System udostępnia frontend Angular z osadzoną mapą OpenLayers do rysowania poligonów, waliduje geometrię według ścisłych reguł (liczba wierzchołków, zamknięcie, samoprzecięcia, limity powierzchni) i przesyła zwalidowany GeoJSON do backendowego API .NET 10, które zapisuje definicję obszaru w bazie danych PostgreSQL z rozszerzeniem PostGIS.

## Glossary

- **Map_Component**: Komponent Angular osadzający interaktywną mapę OpenLayers z narzędziami do rysowania wektorowego
- **Polygon_Validator**: Serwis frontendowy odpowiedzialny za walidację geometrii narysowanego poligonu przed wysłaniem
- **Area_API**: Endpoint backendowego API .NET 10, który odbiera definicje obszarów w formacie GeoJSON
- **Area_Store**: Warstwa persystencji bazy danych PostgreSQL (PostGIS) dla definicji obszarów
- **GeoJSON**: Standardowy format kodowania geograficznych struktur danych przy użyciu JSON
- **Polygon**: Zamknięty kształt geometryczny zdefiniowany przez minimum 3 wierzchołki reprezentujące współrzędne geograficzne (długość, szerokość geograficzna)
- **Self_Intersection**: Stan, w którym krawędzie poligonu przecinają się wzajemnie, tworząc nieprawidłową geometrię
- **Area_Limit_Max**: Maksymalna dozwolona powierzchnia poligonu, ustawiona na 5 hektarów
- **Area_Limit_Min**: Minimalna dozwolona powierzchnia poligonu, ustawiona na 100 metrów kwadratowych

## Requirements

### Requirement 1: Wyświetlanie interaktywnej mapy

**User Story:** Jako użytkownik chcę widzieć interaktywną mapę w aplikacji, aby móc zlokalizować moją nieruchomość i zidentyfikować budynek do skanowania.

#### Acceptance Criteria

1. THE Map_Component SHALL wyrenderować pełnoekranową interaktywną mapę OpenLayers z podkładem satelitarnym/lotniczym przy załadowaniu aplikacji.
2. THE Map_Component SHALL obsługiwać interakcje przesuwania i powiększania do nawigacji po mapie.
3. THE Map_Component SHALL wyświetlać mapę w układzie współrzędnych EPSG:4326 (WGS 84) do obsługi współrzędnych geograficznych.

### Requirement 2: Narzędzie rysowania poligonu

**User Story:** Jako użytkownik chcę narysować poligon na mapie, aby precyzyjnie oznaczyć obszar wokół mojego budynku do skanowania dronem.

#### Acceptance Criteria

1. THE Map_Component SHALL udostępniać narzędzie rysowania poligonu dostępne przez przycisk na pasku narzędzi.
2. WHEN użytkownik aktywuje narzędzie rysowania poligonu, THE Map_Component SHALL umożliwić użytkownikowi umieszczanie wierzchołków na mapie poprzez klikanie.
3. WHEN użytkownik umieści wierzchołek, THE Map_Component SHALL wyświetlić wierzchołek jako widoczny znacznik na mapie.
4. WHILE użytkownik rysuje, THE Map_Component SHALL wyświetlać krawędzie łączące umieszczone wierzchołki w czasie rzeczywistym.
5. WHEN użytkownik kliknie dwukrotnie lub kliknie pierwszy wierzchołek, THE Map_Component SHALL zamknąć poligon i zakończyć rysowanie.
6. THE Map_Component SHALL umożliwić użytkownikowi wyczyszczenie bieżącego poligonu i rozpoczęcie nowego rysunku.

### Requirement 3: Walidacja geometrii poligonu

**User Story:** Jako użytkownik chcę, aby system zwalidował mój narysowany poligon, abym przesyłał tylko prawidłowe geometrie do obliczania ścieżki lotu.

#### Acceptance Criteria

1. WHEN użytkownik zakończy rysowanie poligonu, THE Polygon_Validator SHALL zweryfikować, że poligon zawiera co najmniej 3 wierzchołki.
2. WHEN użytkownik zakończy rysowanie poligonu, THE Polygon_Validator SHALL zweryfikować, że poligon jest zamkniętym kształtem, w którym pierwsza i ostatnia współrzędna są identyczne.
3. WHEN użytkownik zakończy rysowanie poligonu, THE Polygon_Validator SHALL zweryfikować, że krawędzie poligonu nie przecinają się wzajemnie.
4. WHEN użytkownik zakończy rysowanie poligonu, THE Polygon_Validator SHALL obliczyć powierzchnię poligonu i zweryfikować, że nie przekracza Area_Limit_Max wynoszącego 5 hektarów.
5. WHEN użytkownik zakończy rysowanie poligonu, THE Polygon_Validator SHALL obliczyć powierzchnię poligonu i zweryfikować, że spełnia Area_Limit_Min wynoszący 100 metrów kwadratowych.
6. IF poligon nie przejdzie którejkolwiek reguły walidacji, THEN THE Polygon_Validator SHALL wyświetlić konkretny komunikat błędu skierowany do użytkownika, identyfikujący naruszoną regułę.
7. IF poligon nie przejdzie walidacji, THEN THE Map_Component SHALL podświetlić nieprawidłowy poligon na czerwono w celu zapewnienia wizualnego sprzężenia zwrotnego.

### Requirement 4: Konwersja do GeoJSON i wysyłka

**User Story:** Jako użytkownik chcę, aby mój prawidłowy poligon został przesłany do backendu, aby system mógł przetworzyć moją definicję obszaru do planowania lotu.

#### Acceptance Criteria

1. WHEN poligon przejdzie wszystkie reguły walidacji, THE Map_Component SHALL aktywować przycisk wysyłania dla użytkownika.
2. WHEN użytkownik kliknie przycisk wysyłania, THE Map_Component SHALL przekonwertować współrzędne poligonu na obiekt geometrii GeoJSON Polygon.
3. THE Map_Component SHALL zawrzeć wszystkie współrzędne wierzchołków jako pary długości i szerokości geograficznej w wynikowym GeoJSON.
4. WHEN użytkownik kliknie przycisk wysyłania, THE Map_Component SHALL wysłać żądanie HTTP POST zawierające ładunek GeoJSON do Area_API.
5. WHILE żądanie wysyłki jest w trakcie realizacji, THE Map_Component SHALL wyświetlić wskaźnik ładowania i dezaktywować przycisk wysyłania.
6. IF żądanie wysyłki nie powiedzie się z powodu błędu sieciowego, THEN THE Map_Component SHALL wyświetlić komunikat o błędzie użytkownikowi i ponownie aktywować przycisk wysyłania.

### Requirement 5: Odbiór i walidacja GeoJSON na backendzie

**User Story:** Jako programista chcę, aby backend walidował przychodzące definicje obszarów, tak aby tylko prawidłowe geometrie były zapisywane.

#### Acceptance Criteria

1. THE Area_API SHALL udostępniać endpoint POST pod adresem `/api/areas` akceptujący ciało żądania JSON z geometrią GeoJSON Polygon.
2. WHEN Area_API odbierze żądanie, THE Area_API SHALL zwalidować, że ciało żądania zawiera prawidłową geometrię GeoJSON Polygon.
3. IF ciało żądania zawiera nieprawidłowy GeoJSON, THEN THE Area_API SHALL zwrócić odpowiedź HTTP 400 z opisowym komunikatem błędu.
4. WHEN Area_API odbierze prawidłowy GeoJSON Polygon, THE Area_API SHALL wykonać walidację po stronie serwera sprawdzającą liczbę wierzchołków, samoprzecięcia i limity powierzchni zgodnie z regułami frontendowymi.
5. IF walidacja po stronie serwera nie powiedzie się, THEN THE Area_API SHALL zwrócić odpowiedź HTTP 422 ze szczegółami naruszeń walidacji.
6. WHEN Area_API odbierze prawidłowy i zweryfikowany poligon, THE Area_API SHALL zwrócić odpowiedź HTTP 201 z utworzonym zasobem obszaru zawierającym unikalny identyfikator.

### Requirement 6: Zapis obszaru do bazy danych

**User Story:** Jako programista chcę, aby definicje obszarów były przechowywane w bazie danych, aby były dostępne do późniejszego obliczania ścieżki lotu.

#### Acceptance Criteria

1. WHEN Area_API pomyślnie zwaliduje definicję obszaru, THE Area_Store SHALL zapisać geometrię poligonu w bazie danych PostgreSQL.
2. THE Area_Store SHALL przechowywać poligon jako typ danych przestrzennych PostGIS kompatybilny z zapytaniami geograficznymi.
3. THE Area_Store SHALL przechowywać unikalny identyfikator, znacznik czasu utworzenia oraz geometrię poligonu dla każdej definicji obszaru.
4. IF operacja zapisu do bazy danych nie powiedzie się, THEN THE Area_API SHALL zwrócić odpowiedź HTTP 500 z ogólnym komunikatem błędu bez ujawniania szczegółów wewnętrznych.

### Requirement 7: Edycja poligonu

**User Story:** Jako użytkownik chcę edytować narysowany poligon przed wysłaniem, abym mógł doprecyzować obszar bez konieczności rysowania od nowa.

#### Acceptance Criteria

1. WHEN poligon jest narysowany i jeszcze nie wysłany, THE Map_Component SHALL umożliwić użytkownikowi zaznaczenie i przeciągnięcie poszczególnych wierzchołków w celu dostosowania kształtu poligonu.
2. WHEN użytkownik zmodyfikuje pozycję wierzchołka, THE Polygon_Validator SHALL ponownie zwalidować zaktualizowaną geometrię poligonu.
3. IF edytowany poligon nie przejdzie walidacji, THEN THE Polygon_Validator SHALL wyświetlić odpowiedni komunikat błędu dla naruszonej reguły.
