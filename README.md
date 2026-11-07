# Koperty — miejsca parkingowe dla osób z niepełnosprawnością w Polsce

Android-приложение: карта Польши со всеми **общедоступными** (не именными) парковочными местами для инвалидов («koperty»).

## Что умеет
- Загружает все места по Польше одним запросом к OpenStreetMap (Overpass API, 3 зеркала), кэширует на устройстве и обновляет раз в 7 дней или по кнопке.
- Синие точки — отдельные места (`amenity=parking_space` + `parking_space=disabled`), зелёные — парковки с местами для инвалидов (`amenity=parking` + `capacity:disabled`).
- Тап по точке — карточка: число мест, доступ, платность, время стоянки, расстояние, кнопки «Маршрут» (Google Maps / любой навигатор) и «OpenStreetMap».
- Кнопка «Ближайшее место» — по геолокации.
- Языки: польский, русский, английский.

## Как отсекаются именные места
Исключаются объекты, у которых:
- `access` / `motor_vehicle` / `motorcar` / `vehicle` / `disabled` = `private`, `no`, `residents`, `employees`, `delivery` и т. п.;
- в `name` / `description` / `note` / `inscription` / `ref` есть «imienna», «nr rej.», «rejestracja», «zastrzeżone», «prywatne», «abonament» и т. п.;
- `ref` похож на номерной знак (`WA 12345`, `KR1AB23`).

Места «для клиентов» (`access=customers`, напр. у магазинов) остаются — ими может пользоваться любой владелец карты парковочной.

## Сборка
APK собирается в GitHub Actions (вкладка **Actions → Android build → artifact `koperty-debug-apk`**).
Локально: Android SDK 35, JDK 17, `./gradlew assembleDebug`.

## Ограничения
- Полнота зависит от OpenStreetMap: официального открытого реестра «kopert» в Польше нет. Отсутствующие места можно добавить в OSM — они появятся в приложении после обновления.
- Тайлы карты — `tile.openstreetmap.org` (политика OSMF допускает лёгкое использование); при массовом распространении нужен свой/коммерческий тайл-сервер.

Данные © участники OpenStreetMap, ODbL.
