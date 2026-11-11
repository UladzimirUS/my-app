# Программа учёта заявок на авиабилеты (курсовой проект)

Ядро написано на **C++17** (`app/src/main/cpp`). Его используют обе версии программы:
- **Android-приложение** (Kotlin-интерфейс, ядро подключено через JNI): `app/`;
- **консольная версия**: `console/main.cpp`.

## Структура ядра
| Файл | Назначение |
|---|---|
| `GenericList.h` | шаблонный двусвязный список `GenericList<T>`: итераторы, `add`, `findIf`, `filter`, `countIf`, `removeIf`; операторы `<<` и `>>` |
| `Models.h/.cpp` | `Airline`, `Flight`, `Client`, `Order`; перечисления `FlightType`, `ServiceClass`, `OrderStatus`; операторы `<<` и `>>` для каждого класса |
| `Database.h/.cpp` | обобщённые списки, запросы, операции, сохранение и загрузка |
| `CommandApi.h/.cpp` | текстовый интерфейс команд для Android |
| `jni_bridge.cpp` | функция JNI `NativeCore.call` |

## Соответствие ТЗ
1. **Хранение сведений.** Четыре списка `GenericList<Flight/Client/Order/Airline>`. У рейса есть тип (внутренний или международный), у заявки — класс обслуживания (эконом, бизнес, первый) и статус (новая, забронирована, оплачена, отменена). Рейс связан с авиакомпанией через `airlineId`. Свободные места: `freeSeats()` = число мест минус неотменённые заявки.
2. **Обобщённые списки:** `GenericList<T>`.
3. **Запросы:** `ordersByClient`, `searchFlights` (пункт назначения без учёта регистра + дата), `paidTicketsCount`, `flightsByAirline`, `revenueByFlight` / `revenueByAirline`, `passengersOnFlight` (заявки со статусом «забронирована» или «оплачена»).
4. **Операции:**
   - `createOrder` — создаёт заявку, если на рейсе есть места. Цена = базовая × коэффициент класса: 1 / 2,5 / 4.
   - `changeOrderStatus` — разрешены переходы: новая → забронирована / оплачена / отменена; забронирована → оплачена / отменена; оплачена → отменена.
   - `addFlight` / `removeFlight` — рейс с действующими заявками удалить нельзя.
   - `editClient`.
5. **Файлы.** `operator<<` / `operator>>` для каждого класса, для списка и для `Database`. Связи между объектами хранятся через id и проверяются при загрузке (`validateLinks`). В приложении: меню «Выгрузить в файл» и «Загрузить из файла». Кроме того, данные автоматически сохраняются после каждого изменения.

Формат файла:
```
AVIA_DB 1
[AIRLINES]
3
1;LO;LOT Polish Airlines;Польша
...
[FLIGHTS] ... [CLIENTS] ... [ORDERS] ...
[END]
```

## Сборка
- **APK**: GitHub Actions → workflow **AviaOrders APK** → артефакт `AviaOrders-apk`. Локально: Android SDK 35 + NDK, `./gradlew assembleDebug`.
- **Консоль**: `cmake -S console -B build && cmake --build build && ./build/avia` (самопроверка: `./build/avia --selftest`).
  Можно и без CMake: `g++ -std=c++17 -Iapp/src/main/cpp console/main.cpp app/src/main/cpp/{Models,Database,CommandApi}.cpp -o avia`.
