# Opis Projektu: DroneMesh3D

## 1. Streszczenie (Executive Summary)
**DroneMesh3D** to system programistyczny służący do automatyzacji procesu pozyskiwania i przetwarzania danych przestrzennych z drona (DJI Mini 5 Pro) w celu generowania trójwymiarowych modeli budynków. Projekt eliminuje potrzebę ręcznego sterowania dronem podczas robienia zdjęć oraz automatyzuje skomplikowany proces obróbki fotogrametrycznej, sprowadzając całe zadanie do kilku kliknięć na mapie.

## 2. Definicja Problemu
Ręczne wykonywanie zdjęć obiektu (np. domu) z drona w celu stworzenia modelu 3D jest nieefektywne. Wymaga idealnego zachowania odległości, stałego kąta pochylenia kamery oraz odpowiedniego nakładania się kadrów (tzw. overlap). Błędy ludzkie na tym etapie skutkują lukami w końcowym modelu 3D (tzw. dziurami w siatce) i zmuszają do powtarzania lotu. Ponadto, samodzielne zarządzanie zewnętrznymi programami do renderowania modeli 3D bywa żmudne i wymaga ciągłego nadzoru.

## 3. Proponowane Rozwiązanie
Rozwiązaniem jest aplikacja webowa pełniąca funkcję inteligentnego asystenta fotogrametrii. Użytkownik wskazuje na mapie obszar, który chce zeskanować, a system:
1. Przelicza ten obszar na precyzyjną, matematyczną ścieżkę lotu (układ punktów GPS, kątów i wysokości).
2. Generuje gotowy plik z instrukcjami lotu, który dron może wykonać całkowicie autonomicznie.
3. Przejmuje surowe zdjęcia po zakończonym locie i automatycznie koordynuje pracę silników renderujących (np. WebODM), aż do uzyskania gotowego pliku 3D.

## 4. Przebieg Procesu (User Flow)
1. **Zaznaczenie Obszaru:** Użytkownik otwiera aplikację w przeglądarce i rysuje wielokąt (poligon) wokół swojego domu na interaktywnej mapie.
2. **Konfiguracja Parametrów:** Użytkownik wybiera żądaną jakość modelu (co wpływa na gęstość siatki lotu) oraz bezpieczną wysokość początkową.
3. **Eksport Misji:** System generuje plik misji (Waypoint), który użytkownik wgrywa do kontrolera drona.
4. **Lot Autonomiczny:** Dron startuje, automatycznie oblatuje dom z każdej strony robiąc precyzyjnie wymierzone zdjęcia, po czym wraca na miejsce startu.
5. **Upload i Orkiestracja:** Użytkownik zgrywa kartę SD do komputera. Aplikacja (nasłuchując w tle) wykrywa nowe pliki i wysyła je do silnika fotogrametrycznego.
6. **Wynik Końcowy:** Po zakończeniu renderowania, aplikacja wysyła powiadomienie, a użytkownik może oglądać i obracać gotowy model 3D swojego domu bezpośrednio w oknie przeglądarki.

## 5. Kluczowe Moduły Systemu
* **Moduł Nawigacyjny (Flight Path Calculator):** Serce matematyczne projektu napisane w C#. Przelicza współrzędne geograficzne na trasy lotu typu "Orbit" (okręgi wokół punktu) lub "Grid" (siatka nad dachem), wyliczając dokładne interwały wyzwalania migawki.
* **Moduł Orkiestracji (Job Manager):** System kolejkowania zadań. Monitoruje foldery ze zdjęciami, uruchamia skrypty silników fotogrametrycznych i zapisuje logi oraz postęp w bazie danych.
* **Moduł Prezentacyjny (3D Viewer):** Interfejs użytkownika do przeglądania wygenerowanych modeli z wykorzystaniem bibliotek webowych do renderingu 3D.

## 6. Możliwości Rozwoju i Skalowalność
Początkowo system jest zoptymalizowany pod kątem budynków mieszkalnych. Dzięki elastycznej architekturze, algorytmy planowania lotu mogą zostać w przyszłości dostosowane do innych scenariuszy, takich jak inspekcje dachów, pomiary objętości hałd ziemi na placach budowy czy mikroskanowanie mniejszych obiektów na zewnątrz.
