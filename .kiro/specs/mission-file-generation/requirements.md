# Requirements Document

## Introduction

Ta funkcjonalność implementuje generowanie plików misji dla aplikacji DroneMesh3D — trzeci krok w workflow planowania lotu, następujący po zdefiniowaniu obszaru i obliczeniu ścieżki lotu. Po obliczeniu i zapisaniu planu lotu (FlightPlanEntity) w bazie danych, system umożliwia eksport tego planu jako gotowego pliku misji w formacie kompatybilnym z zewnętrznymi aplikacjami sterowania dronem (Litchi, Dronelink).

Wygenerowany plik misji zawiera precyzyjne komendy nawigacyjne: przelot do współrzędnych X/Y, ustalenie wysokości Z, ustawienie gimbala kamery, wykonanie zdjęcia. Pliki uwzględniają ograniczenia lekkich dronów (maksymalna prędkość ~15 m/s) i są gotowe do bezpośredniego załadowania do aplikacji misyjnych bez dodatkowej edycji.

System wspiera trzy formaty eksportu: CSV w formacie Litchi (specyficzny układ kolumn), KML (standard geographic markup) oraz DJI WPML (format KMZ zgodny z DJI Pilot 2 i FlightHub 2). Funkcjonalność wykorzystuje istniejące wzorce architektoniczne projektu: MediatR (CQRS), OneOf dla typów zwracanych, Minimal API endpoints i sealed records.

## Glossary

- **Mission_File_Generator**: Komponent systemu DroneMesh3D odpowiedzialny za konwersję FlightPlanEntity na plik misji w żądanym formacie eksportu
- **Export_Format**: Format pliku wyjściowego misji — obsługiwane wartości: LitchiCsv, Kml, DjiWpml
- **Litchi_CSV**: Format pliku CSV zgodny z aplikacją Litchi — specyficzny zestaw kolumn: latitude, longitude, altitude(m), heading(deg), curvesize(m), rotationdir, gimbalmode, gimbalpitchangle, actiontype1, actionparam1, itd.
- **KML**: Keyhole Markup Language — standard OGC oparty na XML do reprezentacji danych geograficznych, importowalny do Dronelink i innych aplikacji misyjnych
- **Flight_Plan_Entity**: Istniejąca encja bazy danych przechowująca obliczony plan lotu z waypointami, powiązana z AreaEntity
- **Waypoint**: Punkt nawigacyjny 3D (szerokość geograficzna, długość geograficzna, wysokość AGL) wraz z parametrami gimbala kamery (pitch, yaw)
- **Placemark**: Element KML reprezentujący pojedynczy punkt geograficzny z rozszerzonymi danymi (ExtendedData)
- **Max_Speed**: Maksymalna prędkość lotu lekkiego drona — 15 m/s, zapisywana jako metadane w pliku misji
- **Action**: Komenda akcji drona w waypoincie — w kontekście tej funkcjonalności: wykonanie zdjęcia (Take Photo)
- **Gimbal_Mode**: Tryb pracy gimbala w formacie Litchi — wartość 0 oznacza kontrolę ręczną kąta pitch
- **DJI_WPML**: DJI Waypoint Markup Language — format pliku misji oparty na KML/XML z rozszerzeniami DJI (namespace `http://www.dji.com/wpmz/1.0.2`), pakowany jako archiwum KMZ (ZIP) zawierające `template.kml` i `waylines.wpml`
- **KMZ**: Archiwum ZIP z rozszerzeniem `.kmz` zawierające pliki WPML (template.kml + waylines.wpml) — natywny format misji DJI Pilot 2 i FlightHub 2
- **Template_KML**: Plik szablonu w archiwum KMZ definiujący parametry misji (tryb lotu do pierwszego waypointa, akcja po zakończeniu, prędkość, informacje o dronie)
- **Waylines_WPML**: Plik wykonawczy w archiwum KMZ definiujący szczegółowe instrukcje lotu i akcje dla każdego waypointa

## Requirements

### Requirement 1: Endpoint API eksportu pliku misji

**User Story:** Jako operator drona chcę pobrać plik misji dla obliczonego planu lotu przez API, aby załadować go do aplikacji sterowania dronem.

#### Acceptance Criteria

1. THE Mission_File_Generator SHALL udostępniać endpoint GET pod adresem `/api/flight-plans/{id}/export` akceptujący parametr query string `format` określający żądany Export_Format.
2. WHEN endpoint otrzyma prawidłowe żądanie z istniejącym identyfikatorem planu lotu i obsługiwanym formatem, THE Mission_File_Generator SHALL zwrócić odpowiedź HTTP 200 z wygenerowanym plikiem jako treścią odpowiedzi.
3. WHEN endpoint zwraca plik CSV, THE Mission_File_Generator SHALL ustawić nagłówek Content-Type na `text/csv` oraz nagłówek Content-Disposition na `attachment; filename="mission_{id}.csv"`.
4. WHEN endpoint zwraca plik KML, THE Mission_File_Generator SHALL ustawić nagłówek Content-Type na `application/vnd.google-earth.kml+xml` oraz nagłówek Content-Disposition na `attachment; filename="mission_{id}.kml"`.
5. WHEN endpoint zwraca plik DJI WPML (KMZ), THE Mission_File_Generator SHALL ustawić nagłówek Content-Type na `application/vnd.google-earth.kmz` oraz nagłówek Content-Disposition na `attachment; filename="mission_{id}.kmz"`.
6. THE Mission_File_Generator SHALL przetworzyć żądanie przez MediatR query z OneOf jako typem zwracanym (sukces z danymi pliku, błąd walidacji, błąd ogólny).

### Requirement 2: Walidacja żądania eksportu

**User Story:** Jako programista chcę, aby system walidował żądania eksportu, aby zwracać czytelne błędy przy nieprawidłowych parametrach.

#### Acceptance Criteria

1. IF wskazany Flight_Plan_Entity nie istnieje w bazie danych, THEN THE Mission_File_Generator SHALL zwrócić odpowiedź HTTP 404 z komunikatem o nieznalezieniu planu lotu.
2. IF parametr `format` zawiera nieobsługiwaną wartość, THEN THE Mission_File_Generator SHALL zwrócić odpowiedź HTTP 422 z listą obsługiwanych formatów (LitchiCsv, Kml, DjiWpml).
3. IF parametr `format` nie został podany w query string, THEN THE Mission_File_Generator SHALL zwrócić odpowiedź HTTP 422 z informacją o wymagalności parametru format.
4. IF Flight_Plan_Entity istnieje ale zawiera pustą listę waypointów, THEN THE Mission_File_Generator SHALL zwrócić odpowiedź HTTP 422 z informacją, że plan lotu nie zawiera waypointów do eksportu.

### Requirement 3: Generowanie pliku CSV w formacie Litchi

**User Story:** Jako operator drona używający aplikacji Litchi chcę wyeksportować plan lotu jako plik CSV w formacie Litchi, aby bezpośrednio załadować misję do aplikacji.

#### Acceptance Criteria

1. WHEN Mission_File_Generator generuje plik Litchi_CSV, THE Mission_File_Generator SHALL utworzyć plik CSV z nagłówkiem zawierającym kolumny: `latitude`, `longitude`, `altitude(m)`, `heading(deg)`, `curvesize(m)`, `rotationdir`, `gimbalmode`, `gimbalpitchangle`, `actiontype1`, `actionparam1`.
2. WHEN Mission_File_Generator generuje wiersz CSV dla Waypoint, THE Mission_File_Generator SHALL zapisać wartości: latitude i longitude z precyzją co najmniej 6 miejsc po przecinku, altitude jako wartość AGL w metrach, heading jako wartość GimbalYawDegrees waypointa.
3. WHEN Mission_File_Generator generuje wiersz CSV dla Waypoint, THE Mission_File_Generator SHALL ustawić wartość `curvesize` na 0, `rotationdir` na 0, `gimbalmode` na 0 (kontrola ręczna), `gimbalpitchangle` na wartość GimbalPitchDegrees waypointa.
4. WHEN Mission_File_Generator generuje wiersz CSV dla Waypoint, THE Mission_File_Generator SHALL ustawić akcję `actiontype1` na wartość 1 (Take Photo) i `actionparam1` na 0.
5. THE Mission_File_Generator SHALL zapisać wartość Max_Speed (15 m/s) jako kolumnę `speed(m/s)` w każdym wierszu pliku Litchi_CSV.
6. THE Mission_File_Generator SHALL generować plik CSV z separatorem przecinkowym i kodowaniem UTF-8 bez BOM.

### Requirement 4: Generowanie pliku KML

**User Story:** Jako operator drona używający aplikacji Dronelink chcę wyeksportować plan lotu jako plik KML, aby zaimportować misję do aplikacji obsługującej format KML.

#### Acceptance Criteria

1. WHEN Mission_File_Generator generuje plik KML, THE Mission_File_Generator SHALL utworzyć dokument XML zgodny ze schematem KML 2.2 (namespace `http://www.opengis.net/kml/2.2`).
2. WHEN Mission_File_Generator generuje plik KML, THE Mission_File_Generator SHALL umieścić wszystkie waypoints jako elementy Placemark wewnątrz elementu Document.
3. WHEN Mission_File_Generator generuje element Placemark dla Waypoint, THE Mission_File_Generator SHALL zawrzeć element Point z koordynatami w formacie `longitude,latitude,altitude` (kolejność zgodna ze specyfikacją KML).
4. WHEN Mission_File_Generator generuje element Placemark dla Waypoint, THE Mission_File_Generator SHALL zawrzeć element ExtendedData z wartościami: gimbalPitch, gimbalYaw, action (TakePhoto), speed (Max_Speed).
5. THE Mission_File_Generator SHALL zawrzeć w elemencie Document nazwę misji w formacie `DroneMesh3D Mission - {flightPlanId}`.
6. THE Mission_File_Generator SHALL generować plik KML z kodowaniem UTF-8 i deklaracją XML.

### Requirement 5: Generowanie pliku misji w formacie DJI WPML (KMZ)

**User Story:** Jako operator drona DJI chcę wyeksportować plan lotu jako plik KMZ w formacie DJI WPML, aby bezpośrednio załadować misję do aplikacji DJI Pilot 2 lub FlightHub 2.

#### Acceptance Criteria

1. WHEN Mission_File_Generator generuje plik DJI_WPML, THE Mission_File_Generator SHALL utworzyć archiwum ZIP z rozszerzeniem `.kmz` zawierające dwa pliki: `template.kml` oraz `waylines.wpml`.
2. WHEN Mission_File_Generator generuje plik `template.kml`, THE Mission_File_Generator SHALL utworzyć dokument XML z namespace KML (`http://www.opengis.net/kml/2.2`) i namespace WPML (`http://www.dji.com/wpmz/1.0.2`).
3. WHEN Mission_File_Generator generuje element `wpml:missionConfig` w `template.kml`, THE Mission_File_Generator SHALL zawrzeć: `flyToWaylineMode` jako `safely`, `finishAction` jako `goHome`, `exitOnRCLost` jako `executeLostAction`, `executeRCLostAction` jako `hover`, `takeOffSecurityHeight` jako 20m, oraz `globalTransitionalSpeed` jako wartość Max_Speed (15 m/s).
4. WHEN Mission_File_Generator generuje folder szablonu w `template.kml`, THE Mission_File_Generator SHALL ustawić `templateType` na `waypoint`, `coordinateMode` na `WGS84`, `heightMode` na `relativeToStartPoint`, `autoFlightSpeed` na wartość Max_Speed, oraz `gimbalPitchMode` na `usePointSetting`.
5. WHEN Mission_File_Generator generuje element Placemark w `template.kml` dla Waypoint, THE Mission_File_Generator SHALL zawrzeć: współrzędne w formacie `longitude,latitude`, indeks waypointa (`wpml:index`), wysokość (`wpml:height`) jako wartość AGL, oraz kąt gimbala (`wpml:gimbalPitchAngle`).
6. WHEN Mission_File_Generator generuje plik `waylines.wpml`, THE Mission_File_Generator SHALL zawrzeć definicje akcji dla każdego waypointa z akcją `takePhoto` wyzwalaną przez `reachPoint`.
7. THE Mission_File_Generator SHALL generować pliki wewnątrz archiwum KMZ z kodowaniem UTF-8 i deklaracją XML.

### Requirement 6: Mapowanie danych Waypoint na format misji

**User Story:** Jako operator drona chcę, aby plik misji zawierał kompletne dane nawigacyjne, aby dron wykonał lot dokładnie według obliczonego planu.

#### Acceptance Criteria

1. THE Mission_File_Generator SHALL mapować każdy Waypoint z Flight_Plan_Entity na jeden rekord (wiersz CSV, Placemark KML lub Placemark WPML) w pliku wyjściowym, zachowując kolejność waypointów z planu lotu.
2. THE Mission_File_Generator SHALL zachować pełną precyzję współrzędnych geograficznych (latitude, longitude) z oryginalnego Waypoint bez zaokrąglania poniżej 6 miejsc dziesiętnych.
3. THE Mission_File_Generator SHALL przypisać akcję "Take Photo" do każdego waypointa w pliku misji.
4. THE Mission_File_Generator SHALL ustawić prędkość lotu na wartość Max_Speed (15 m/s) dla wszystkich waypointów, respektując ograniczenia lekkich dronów.
5. WHEN Flight_Plan_Entity zawiera N waypointów, THE Mission_File_Generator SHALL wygenerować plik misji zawierający dokładnie N rekordów danych (nie licząc nagłówka CSV ani elementów strukturalnych KML/WPML).

### Requirement 7: Poprawność strukturalna generowanych plików

**User Story:** Jako programista chcę, aby generowane pliki były poprawne strukturalnie, aby aplikacje zewnętrzne mogły je bezproblemowo zaimportować.

#### Acceptance Criteria

1. THE Mission_File_Generator SHALL generować pliki Litchi_CSV, w których każdy wiersz danych zawiera tę samą liczbę kolumn co wiersz nagłówkowy.
2. THE Mission_File_Generator SHALL generować pliki KML, które są poprawnym dokumentem XML — prawidłowo zamknięte tagi, poprawne atrybuty, zgodność z namespace KML 2.2.
3. IF plik Litchi_CSV zostanie wygenerowany, a następnie sparsowany z powrotem (CSV parse), THEN wartości latitude, longitude i altitude odczytane z pliku SHALL być równe wartościom oryginalnych waypointów z dokładnością do 6 miejsc dziesiętnych.
4. IF plik KML zostanie wygenerowany, a następnie sparsowany jako XML, THEN liczba elementów Placemark SHALL być równa liczbie waypointów w oryginalnym Flight_Plan_Entity.
5. THE Mission_File_Generator SHALL generować pliki DJI_WPML (KMZ), które po rozpakowaniu zawierają poprawne dokumenty XML (`template.kml` i `waylines.wpml`) zgodne z namespace KML 2.2 i WPML `http://www.dji.com/wpmz/1.0.2`.
6. IF plik KMZ zostanie wygenerowany, a następnie rozpakowany i sparsowany jako XML, THEN liczba elementów Placemark w `template.kml` SHALL być równa liczbie waypointów w oryginalnym Flight_Plan_Entity.

### Requirement 8: Obsługa błędów

**User Story:** Jako programista chcę, aby system prawidłowo obsługiwał sytuacje wyjątkowe, aby API zwracało spójne odpowiedzi błędów.

#### Acceptance Criteria

1. IF podczas generowania pliku misji wystąpi nieoczekiwany wyjątek, THEN THE Mission_File_Generator SHALL zwrócić odpowiedź HTTP 500 z ogólnym komunikatem błędu bez ujawniania szczegółów wewnętrznych.
2. IF deserializacja WaypointsJson z Flight_Plan_Entity nie powiedzie się, THEN THE Mission_File_Generator SHALL zwrócić odpowiedź HTTP 500 z komunikatem o uszkodzeniu danych planu lotu.
3. WHEN Mission_File_Generator zwraca błąd, THE Mission_File_Generator SHALL logować szczegóły wyjątku na poziomie Error z identyfikatorem korelacji żądania.
