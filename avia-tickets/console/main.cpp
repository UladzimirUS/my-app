// Консольная версия программы учёта заявок на авиабилеты.
// Использует то же ядро (app/src/main/cpp), что и Android-приложение.
// Запуск: ./avia [файл_данных]      самопроверка: ./avia --selftest
#include <cassert>
#include <cstdio>
#include <iomanip>
#include <iostream>
#include <limits>
#include <sstream>
#include <string>

#include "Database.h"

#ifdef _WIN32
#include <windows.h>
#endif

namespace {

std::string ask(const std::string& prompt) {
    std::cout << prompt << ": ";
    std::string s;
    std::getline(std::cin, s);
    return s;
}

int askInt(const std::string& prompt) {
    for (;;) {
        std::string s = ask(prompt);
        try {
            std::size_t pos = 0;
            int v = std::stoi(s, &pos);
            if (pos == s.size()) return v;
        } catch (...) {
        }
        std::cout << "  Введите целое число.\n";
    }
}

double askDouble(const std::string& prompt) {
    for (;;) {
        std::string s = ask(prompt);
        for (char& c : s) if (c == ',') c = '.';
        try {
            std::size_t pos = 0;
            double v = std::stod(s, &pos);
            if (pos == s.size()) return v;
        } catch (...) {
        }
        std::cout << "  Введите число.\n";
    }
}

void printFlight(const Database& db, const Flight& f) {
    std::cout << "  #" << f.id << " " << f.number << " (" << db.airline(f.airlineId).name << ") " << f.from << " -> "
              << f.to << ", " << f.date << " " << f.time << ", " << toString(f.type) << ", мест " << f.seatsTotal
              << " (своб. " << db.freeSeats(f.id) << "), цена " << f.basePrice << "\n";
}

void printOrder(const Database& db, const Order& o) {
    const Flight& f = db.flight(o.flightId);
    std::cout << "  #" << o.id << " " << db.client(o.clientId).fullName << ", рейс " << f.number << " " << f.from
              << " -> " << f.to << " " << f.date << ", " << toString(o.serviceClass) << ", " << toString(o.status)
              << ", " << std::fixed << std::setprecision(2) << o.price << std::defaultfloat << "\n";
}

void printClient(const Client& c) {
    std::cout << "  #" << c.id << " " << c.fullName << ", паспорт " << c.passport << ", тел. " << c.phone
              << ", " << c.email << "\n";
}

void printAll(const Database& db) {
    std::cout << "\nАвиакомпании:\n";
    for (const Airline& a : db.airlines)
        std::cout << "  #" << a.id << " [" << a.code << "] " << a.name << ", " << a.country << "\n";
    std::cout << "Рейсы:\n";
    for (const Flight& f : db.flights) printFlight(db, f);
    std::cout << "Клиенты:\n";
    for (const Client& c : db.clients) printClient(c);
    std::cout << "Заявки:\n";
    for (const Order& o : db.orders) printOrder(db, o);
}

void menu(Database& db, const std::string& path) {
    for (;;) {
        std::cout << "\n=== Учёт заявок на авиабилеты ===\n"
                     " 1. Показать все данные\n"
                     " 2. Заявки клиента\n"
                     " 3. Поиск рейсов (пункт назначения + дата)\n"
                     " 4. Количество оплаченных билетов на рейс\n"
                     " 5. Рейсы авиакомпании\n"
                     " 6. Выручка по рейсу\n"
                     " 7. Выручка по авиакомпании\n"
                     " 8. Пассажиры рейса\n"
                     " 9. Создать заявку\n"
                     "10. Изменить статус заявки\n"
                     "11. Добавить рейс\n"
                     "12. Удалить рейс\n"
                     "13. Редактировать клиента\n"
                     "14. Добавить клиента\n"
                     "15. Добавить авиакомпанию\n"
                     "16. Сохранить в файл\n"
                     "17. Загрузить из файла\n"
                     " 0. Выход (с сохранением)\n";
        int ch = askInt("Выбор");
        try {
            switch (ch) {
                case 0: db.saveToFile(path); return;
                case 1: printAll(db); break;
                case 2: for (const Order& o : db.ordersByClient(askInt("id клиента"))) printOrder(db, o); break;
                case 3: {
                    std::string to = ask("Пункт назначения");
                    std::string d = ask("Дата (ГГГГ-ММ-ДД)");
                    auto list = db.searchFlights(to, d);
                    if (list.empty()) std::cout << "  Рейсов не найдено\n";
                    for (const Flight& f : list) printFlight(db, f);
                    break;
                }
                case 4: std::cout << "  Продано: " << db.paidTicketsCount(askInt("id рейса")) << "\n"; break;
                case 5: for (const Flight& f : db.flightsByAirline(askInt("id авиакомпании"))) printFlight(db, f); break;
                case 6: std::cout << "  Выручка: " << db.revenueByFlight(askInt("id рейса")) << "\n"; break;
                case 7: std::cout << "  Выручка: " << db.revenueByAirline(askInt("id авиакомпании")) << "\n"; break;
                case 8:
                    for (const Passenger& p : db.passengersOnFlight(askInt("id рейса")))
                        std::cout << "  " << p.client.fullName << ", паспорт " << p.client.passport << ", "
                                  << toString(p.order.serviceClass) << ", " << toString(p.order.status) << "\n";
                    break;
                case 9: {
                    int c = askInt("id клиента"), f = askInt("id рейса");
                    int cls = askInt("Класс (0-эконом, 1-бизнес, 2-первый)");
                    std::cout << "  Создана заявка #" << db.createOrder(c, f, serviceClassFromInt(cls)) << "\n";
                    break;
                }
                case 10: {
                    int id = askInt("id заявки");
                    int st = askInt("Статус (1-забронирована, 2-оплачена, 3-отменена)");
                    db.changeOrderStatus(id, orderStatusFromInt(st));
                    std::cout << "  Готово\n";
                    break;
                }
                case 11: {
                    Flight f;
                    f.number = ask("Номер рейса");
                    f.airlineId = askInt("id авиакомпании");
                    f.from = ask("Откуда");
                    f.to = ask("Куда");
                    f.date = ask("Дата (ГГГГ-ММ-ДД)");
                    f.time = ask("Время (ЧЧ:ММ)");
                    f.type = flightTypeFromInt(askInt("Тип (0-внутренний, 1-международный)"));
                    f.seatsTotal = askInt("Количество мест");
                    f.basePrice = askDouble("Цена эконом-класса");
                    std::cout << "  Добавлен рейс #" << db.addFlight(f) << "\n";
                    break;
                }
                case 12: db.removeFlight(askInt("id рейса")); std::cout << "  Удалён\n"; break;
                case 13: {
                    Client c = db.client(askInt("id клиента"));
                    std::cout << "  (Enter — оставить без изменений)\n";
                    std::string s;
                    if (!(s = ask("ФИО [" + c.fullName + "]")).empty()) c.fullName = s;
                    if (!(s = ask("Паспорт [" + c.passport + "]")).empty()) c.passport = s;
                    if (!(s = ask("Телефон [" + c.phone + "]")).empty()) c.phone = s;
                    if (!(s = ask("E-mail [" + c.email + "]")).empty()) c.email = s;
                    db.editClient(c);
                    std::cout << "  Сохранено\n";
                    break;
                }
                case 14: {
                    Client c;
                    c.fullName = ask("ФИО");
                    c.passport = ask("Паспорт");
                    c.phone = ask("Телефон");
                    c.email = ask("E-mail");
                    std::cout << "  Добавлен клиент #" << db.addClient(c) << "\n";
                    break;
                }
                case 15: {
                    Airline a;
                    a.code = ask("Код");
                    a.name = ask("Название");
                    a.country = ask("Страна");
                    std::cout << "  Добавлена авиакомпания #" << db.addAirline(a) << "\n";
                    break;
                }
                case 16: db.saveToFile(path); std::cout << "  Сохранено в " << path << "\n"; break;
                case 17: db.loadFromFile(path); std::cout << "  Загружено из " << path << "\n"; break;
                default: std::cout << "  Нет такого пункта\n";
            }
        } catch (const std::exception& e) {
            std::cout << "  Ошибка: " << e.what() << "\n";
        }
    }
}

int selfTest() {
    Database db;
    db.seedDemo();
    assert(db.airlines.size() == 3 && db.flights.size() == 6 && db.clients.size() == 4 && db.orders.size() == 8);

    // 3.1
    assert(db.ordersByClient(1).size() == 2);
    // 3.2 — регистр не важен
    assert(db.searchFlights("лондон", "2026-12-01").size() == 1);
    assert(db.searchFlights("Лондон", "2026-12-05").size() == 1);
    // 3.3: на LO281 (id 2) оплачено 2 (бизнес Иванова + эконом Kowalska)
    assert(db.paidTicketsCount(2) == 2);
    // 3.4
    assert(db.flightsByAirline(1).size() == 3);
    // 3.5: 650*2.5 + 650 = 2275
    assert(db.revenueByFlight(2) == 2275.0);
    assert(db.revenueByAirline(1) == 2275.0);
    // 3.6: Booked + Paid, без отменённых: Иванов, Kowalska, Nowak
    assert(db.passengersOnFlight(2).size() == 3);

    // 4.1 — места заканчиваются (LO3923 id 6, 3 места)
    for (int i = 0; i < 3; ++i) db.createOrder(1, 6, ServiceClass::Economy);
    bool thrown = false;
    try { db.createOrder(2, 6, ServiceClass::Economy); } catch (const AppError&) { thrown = true; }
    assert(thrown && db.freeSeats(6) == 0);
    // 4.2 — недопустимый переход
    int oid = db.createOrder(2, 1, ServiceClass::Business);
    db.changeOrderStatus(oid, OrderStatus::Cancelled);
    thrown = false;
    try { db.changeOrderStatus(oid, OrderStatus::Paid); } catch (const AppError&) { thrown = true; }
    assert(thrown);
    // 4.3 — удаление рейса с активными заявками запрещено
    thrown = false;
    try { db.removeFlight(6); } catch (const AppError&) { thrown = true; }
    assert(thrown);
    Flight nf;
    nf.number = "TEST1"; nf.airlineId = 2; nf.from = "A"; nf.to = "B"; nf.date = "2027-02-28"; nf.time = "23:59";
    nf.seatsTotal = 10; nf.basePrice = 99.5;
    int nid = db.addFlight(nf);
    db.removeFlight(nid);
    assert(db.flights.size() == 6);
    // 4.4
    Client c = db.client(2);
    c.phone = "+48 111; 222\\x";  // спецсимволы проверяют экранирование
    db.editClient(c);

    // 5 — сохранение и загрузка через операторы << и >>
    std::stringstream ss;
    ss << db;
    Database copy;
    ss >> copy;
    std::stringstream ss2;
    ss2 << copy;
    assert(ss.str() == ss2.str());
    assert(copy.client(2).phone == "+48 111; 222\\x");
    assert(copy.revenueByFlight(2) == db.revenueByFlight(2));

    // повреждённый файл
    std::stringstream bad("AVIA_DB 1\n[AIRLINES]\n1\n1;LO;LOT;PL\n[FLIGHTS]\n1\n1;X;99;A;B;2026-01-01;10:00;0;5;1\n");
    thrown = false;
    try { Database d; bad >> d; } catch (const AppError&) { thrown = true; }
    assert(thrown);

    std::cout << "Self-test OK\n" << ss.str();
    return 0;
}

}  // namespace

int main(int argc, char** argv) {
#ifdef _WIN32
    SetConsoleOutputCP(CP_UTF8);
    SetConsoleCP(CP_UTF8);
#endif
    std::string arg = argc > 1 ? argv[1] : "avia_data.txt";
    if (arg == "--selftest") return selfTest();

    Database db;
    try {
        db.loadFromFile(arg);
        std::cout << "Данные загружены из " << arg << "\n";
    } catch (const std::exception&) {
        db.seedDemo();
        std::cout << "Файл не найден — загружены демонстрационные данные\n";
    }
    menu(db, arg);
    return 0;
}
